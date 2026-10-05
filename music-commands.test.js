const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { createRequire } = require("node:module");

// Load command handlers without signing in either bot or altering global process listeners.
const source = fs.readFileSync(`${__dirname}/index.js`, "utf8");
const context = new Function("require", "process", "console", source + "\nreturn { musicClient, musicRuntime, musicCommands, MUSIC_VOICE_CHANNEL_ID, OWNER_USER_ID, ROLE_HELPER, ROLE_STAFF, CONTROL_ROLE, musicPlaylists, loadPersistentBotData, setLoaded(value) { musicPlaylistsLoaded = value; }, setStorage(channel) { botDataChannelId = 'storage'; client.channels.cache.set('storage', channel); } }; ")(
  createRequire(`${__dirname}/index.js`),
  { env: { GUILD_ID: "guild" }, on() {} },
  { log() {}, error() {} }
);
context.setLoaded(true);
const handler = context.musicClient.listeners("interactionCreate")[0];

function interaction(commandName, roles = [], channelId = context.MUSIC_VOICE_CHANNEL_ID) {
  const responses = [];
  const member = { id: "user", roles: { cache: new Map(roles.map(id => [id, {}])) } };
  return {
    commandName, channelId, guildId: "guild", user: { id: "user", username: "User" },
    guild: { id: "guild", members: { fetch: async () => member } },
    isChatInputCommand: () => true,
    options: { getInteger: () => 50, getString: () => "off" },
    responses,
    async reply(value) { responses.push({ type: "reply", value }); this.replied = true; },
    async deferReply() { responses.push({ type: "defer" }); this.deferred = true; },
    async editReply(value) { responses.push({ type: "edit", value }); },
    async followUp(value) { responses.push({ type: "followUp", value }); }
  };
}

test("all existing music slash commands and subcommands serialize", () => {
  const commands = context.musicCommands.map(command => command.toJSON());
  assert.deepEqual(commands.map(command => command.name), ["votesong", "voteskip", "play", "playlist", "pause", "resume", "skip", "stop", "queue", "nowplaying", "volume", "shuffle", "loop", "remove"]);
  assert.deepEqual(commands[2].options.map(option => option.name), ["song", "playlist"]);
  assert.deepEqual(commands[3].options.map(option => option.name), ["create", "add", "list", "show", "remove", "delete"]);
});

test("music commands remain limited to the configured room", async () => {
  const request = interaction("pause", [context.ROLE_HELPER], "other-room");
  await handler(request);
  assert.match(request.responses[0].value.content, /פקודות המוזיקה עובדות רק/);
});

test("Only the configured control role can pause or change volume", async () => {
  const player = { queue: { current: { info: { title: "song" } } }, paused: false, async pause() { this.paused = true; } };
  context.musicRuntime.manager.getPlayer = () => player;
  const pause = interaction("pause", [context.CONTROL_ROLE]);
  await handler(pause);
  assert.equal(player.paused, true);
  assert.deepEqual(pause.responses.map(response => response.type), ["defer", "edit"]);
  const volume = interaction("volume", [context.ROLE_HELPER]);
  await handler(volume);
  assert.match(volume.responses[0].value.content, /1555588615520653332/);
});

test("Control role volume command awaits Lavalink and acknowledges success", async () => {
  let volume = 0;
  context.musicRuntime.manager.getPlayer = () => ({ async setVolume(value) { volume = value; } });
  const request = interaction("volume", [context.CONTROL_ROLE]);
  await handler(request);
  assert.equal(volume, 50);
  assert.deepEqual(request.responses.map(response => response.type), ["defer", "edit"]);
});

test("skip on the last track passes the non-throwing Lavalink option", async () => {
  let args;
  context.musicRuntime.manager.getPlayer = () => ({ queue: { current: { info: { title: "last" } } }, async skip(...values) { args = values; } });
  const request = interaction("skip", [context.CONTROL_ROLE]);
  await handler(request);
  assert.deepEqual(args, [0, false]);
  assert.equal(request.responses.at(-1).type, "edit");
});

test("stop clears playback without disconnecting the player", async () => {
  let args;
  context.musicRuntime.manager.getPlayer = () => ({ async stopPlaying(...values) { args = values; } });
  const request = interaction("stop", [context.CONTROL_ROLE]);
  await handler(request);
  assert.deepEqual(args, [true, false]);
  assert.match(request.responses.at(-1).value, /הבוט נשאר בחדר/);
});

test("playlist starts in queue loop by default and accepts loop false", async () => {
  context.musicPlaylists.set("user", new Map([["mix", { name: "mix", songs: ["song"] }]]));
  context.musicRuntime.resolve = async () => ({ track: { info: { title: "song" } } });
  context.musicRuntime.play = async () => ({});
  const modes = [];
  context.musicRuntime.manager.getPlayer = () => ({ async setRepeatMode(mode) { modes.push(mode); } });
  for (const loop of [null, false]) {
    const request = interaction("play", [context.CONTROL_ROLE]);
    request.options = { getSubcommand: () => "playlist", getString: () => "mix", getBoolean: () => loop };
    await handler(request);
    assert.equal(request.responses.at(-1).type, "edit");
  }
  assert.deepEqual(modes, ["queue", "off"]);
  const playlist = context.musicCommands.map(c => c.toJSON()).find(c => c.name === "play").options.find(c => c.name === "playlist");
  assert.equal(playlist.options.find(o => o.name === "loop").type, 5);
});

test("playlists wait for restore and survive a simulated restart", async () => {
  const { Collection } = require('discord.js');
  const ledger = [];
  context.setStorage({ isTextBased: () => true, async send({ content }) { ledger.push({ id: String(ledger.length + 1), content, createdTimestamp: ledger.length }); }, messages: { async fetch() { return new Collection(ledger.map(m => [m.id, m])); } } });
  const request = sub => { const r = interaction('playlist'); r.options = { getSubcommand: () => sub, getString: name => name === 'name' ? 'saved' : 'song' }; return r; };
  context.setLoaded(false);
  const waiting = request('create'); await handler(waiting); assert.match(waiting.responses[0].value.content, /נטענים/); assert.equal(ledger.length, 0);
  context.setLoaded(true);
  await handler(request('create'));
  context.musicRuntime.resolve = async () => ({ track: { info: { title: 'song', uri: 'https://soundcloud.com/artist/song' } } });
  await handler(request('add'));
  assert.equal(ledger.length, 2);
  context.musicPlaylists.clear();
  await context.loadPersistentBotData();
  assert.deepEqual(context.musicPlaylists.get('user').get('saved').songs, ['https://soundcloud.com/artist/song']);
});

test("failed permanent writes never report success or change saved playlists", async () => {
  context.setStorage({ isTextBased: () => true, async send() { throw new Error('write unavailable'); } });
  const request = (sub, name) => { const r = interaction('playlist'); r.options = { getSubcommand: () => sub, getString: key => key === 'name' ? name : 'song', getInteger: () => 1 }; return r; };
  const create = request('create', 'failed'); await handler(create);
  assert.equal(context.musicPlaylists.get('user').has('failed'), false);
  assert.match(create.responses.at(-1).value, /השמירה הקבועה נכשלה/);
  const playlist = context.musicPlaylists.get('user').get('saved');
  for (const sub of ['add', 'remove', 'delete']) {
    const r = request(sub, 'saved'); await handler(r);
    assert.match(r.responses.at(-1).value, /השמירה/);
    assert.equal(playlist.songs.length, 1);
    assert.equal(context.musicPlaylists.get('user').get('saved'), playlist);
  }
});
