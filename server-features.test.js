const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { Collection } = require('discord.js');
const { createMusicControls, CONTROL_ROLE, canControl } = require('./music-controls');
const { createSpamDetector } = require('./anti-spam');
const { createSongVotes } = require('./song-votes');

function controlsFixture() {
  const manager = new EventEmitter();
  const player = { guildId: 'guild', queue: { current: {}, tracks: [] }, skips: 0, async skip() { this.skips++; }, async pause() { this.paused = true; } };
  manager.getPlayer = () => player;
  const controls = createMusicControls({ runtime: { manager, cancelPending() {} }, guildId: 'guild', channelId: 'voice' });
  const rows = controls.start(player);
  const ids = rows.flatMap(row => row.toJSON().components).map(button => button.custom_id);
  const listeners = new Collection(['a', 'b', 'c'].map(id => [id, { user: { bot: false } }]));
  function request(user, action = 'vote', role = false, voice = 'voice', customId) {
    const member = { id: user, roles: { cache: new Map(role ? [[CONTROL_ROLE, {}]] : []) }, voice: { channelId: voice, channel: { members: listeners } } };
    return { guildId: 'guild', channelId: 'voice', user: { id: user }, customId: customId || ids.find(id => id.endsWith(`:${action}`)), guild: { members: { fetch: async () => member } }, isButton: () => true, isChatInputCommand: () => false, responses: [], async reply(v) { this.responses.push(v); }, async deferReply() { this.deferred = true; }, async editReply(v) { this.responses.push(v); } };
  }
  return { controls, player, request, listeners, manager };
}

test('only the exact control role grants controls', () => {
  assert.equal(canControl({ id: 'owner', roles: { cache: new Map() } }), false);
  assert.equal(canControl({ roles: { cache: new Map([[CONTROL_ROLE, {}]]) } }), true);
});
test('buttons reject missing role, wrong voice room and stale track', async () => {
  const f = controlsFixture();
  for (const request of [f.request('a', 'pause'), f.request('a', 'pause', true, 'elsewhere')]) {
    await f.controls.handle(request); assert.equal(f.player.paused, undefined); assert.match(request.responses[0].content, /❌/);
  }
  const stale = f.request('a', 'pause', true); f.controls.start(f.player);
  await f.controls.handle(stale); assert.equal(f.player.paused, undefined);
  const active = f.request('a', 'pause', true, 'voice', f.controls.start(f.player)[0].toJSON().components[0].custom_id);
  await f.controls.handle(active); assert.equal(f.player.paused, true);
});
test('votes are unique, require majority, and cannot skip twice', async () => {
  const f = controlsFixture();
  await f.controls.handle(f.request('a')); await f.controls.handle(f.request('a'));
  assert.equal(f.player.skips, 0);
  await Promise.all([f.controls.handle(f.request('b')), f.controls.handle(f.request('c'))]);
  assert.equal(f.player.skips, 1);
});
test('departed listeners lose votes and each new track resets votes', async () => {
  const f = controlsFixture();
  await f.controls.handle(f.request('a')); f.listeners.delete('a');
  await f.controls.handle(f.request('b')); assert.equal(f.player.skips, 0);
  f.controls.start(f.player);
  const command = f.request('c'); command.isButton = () => false; command.isChatInputCommand = () => true; command.commandName = 'voteskip';
  await f.controls.handle(command); assert.equal(f.player.skips, 0);
});
test('spam detector tolerates normal traffic, isolates users, and expires history', () => {
  let time = 0; const detector = createSpamDetector({ now: () => time });
  const message = (id, user = 'a') => ({ id, guildId: 'g', author: { id: user }, mentions: { users: { size: 0 }, roles: { size: 0 } } });
  for (let i = 0; i < 5; i++) assert.equal(detector.inspect(message(String(i))), null);
  assert.equal(detector.inspect(message('other', 'b')), null);
  const hit = detector.inspect(message('sixth')); assert.equal(hit.messages.length, 6);
  assert.equal(detector.inspect(message('cooldown')), null);
  time = 61000; detector.prune(); assert.equal(detector.inspect(message('new')), null);
});
test('mention flooding is caught without access to message text', () => {
  const detector = createSpamDetector();
  assert.ok(detector.inspect({ id: '1', guildId: 'g', author: { id: 'u' }, mentions: { users: { size: 6 } } }));
});

function songFixture() {
  let time = 0, added = 0;
  const listeners = new Collection(['a', 'b', 'c'].map(id => [id, { user: { bot: false } }]));
  const runtime = { async resolve() { return { track: { info: { title: 'song' }, requester: { id: 'a' } } }; }, async play() { added++; } };
  const votes = createSongVotes({ runtime, guildId: 'guild', channelId: 'voice', now: () => time });
  function request(user, customId, voice = 'voice') {
    return { user: { id: user }, guildId: 'guild', channelId: 'voice', guild: { members: { fetch: async () => ({ id: user, voice: { channelId: voice, channel: { members: listeners } } }) } }, commandName: 'votesong', customId, options: { getString: () => 'song' }, isButton: () => Boolean(customId), isChatInputCommand: () => !customId, responses: [], async reply(value) { this.responses.push(value); }, async deferReply() { this.deferred = true; }, async editReply(value) { this.responses.push(value); } };
  }
  return { votes, request, listeners, runtime, added: () => added, expire: () => { time = 130000; } };
}
test('any listener can propose a song; a unique majority adds it exactly once', async () => {
  const f = songFixture(); const proposal = f.request('a'); await f.votes.handle(proposal);
  const id = proposal.responses[0].components[0].toJSON().components[0].custom_id;
  await f.votes.handle(f.request('a', id)); await f.votes.handle(f.request('a', id)); assert.equal(f.added(), 0);
  await Promise.all([f.votes.handle(f.request('b', id)), f.votes.handle(f.request('c', id))]); assert.equal(f.added(), 1);
  await f.votes.handle(f.request('c', id)); assert.equal(f.added(), 1);
  assert.equal(proposal.responses.at(-1).components.length, 0);
});
test('song proposals reject outsiders, expire, and limit simultaneous proposals', async () => {
  const f = songFixture(); const outsider = f.request('a', null, 'elsewhere'); await f.votes.handle(outsider);
  assert.match(outsider.responses[0].content, /❌/);
  const proposal = f.request('a'); await f.votes.handle(proposal);
  const duplicate = f.request('a'); await f.votes.handle(duplicate); assert.match(duplicate.responses[0].content, /⏳/);
  f.expire(); const id = proposal.responses[0].components[0].toJSON().components[0].custom_id;
  const expired = f.request('b', id); await f.votes.handle(expired); assert.equal(f.added(), 0); assert.match(expired.responses[0].content, /⌛/);
});
test('negative majority rejects a song; queue errors are shown publicly', async () => {
  for (const fail of [false, true]) {
    const f = songFixture(); if (fail) f.runtime.play = async () => { throw new Error('MUSIC_QUEUE_LIMIT'); };
    const proposal = f.request('a'); await f.votes.handle(proposal);
    const id = proposal.responses[0].components[0].toJSON().components[fail ? 0 : 1].custom_id;
    await f.votes.handle(f.request('a', id)); await f.votes.handle(f.request('b', id));
    assert.equal(f.added(), 0); assert.equal(proposal.responses.at(-1).components.length, 0);
    assert.match(proposal.responses.at(-1).embeds[0].toJSON().fields[0].value, fail ? /5 שירים/ : /נדחתה/);
  }
});
