const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { Collection } = require('discord.js');
const { createMusicControls, CONTROL_ROLE, canControl } = require('./music-controls');
const { createSpamDetector } = require('./anti-spam');

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
