const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { createRequire } = require("node:module");

// Load command handlers without signing in either bot or altering global process listeners.
const source = fs.readFileSync(`${__dirname}/index.js`, "utf8");
const context = new Function("require", "process", "console", source + "\nreturn { musicClient, musicRuntime, musicCommands, MUSIC_VOICE_CHANNEL_ID, OWNER_USER_ID, ROLE_HELPER, ROLE_STAFF, CONTROL_ROLE }; ")(
  createRequire(`${__dirname}/index.js`),
  { env: { GUILD_ID: "guild" }, on() {} },
  { log() {}, error() {} }
);
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
  assert.deepEqual(commands.map(command => command.name), ["voteskip", "play", "playlist", "pause", "resume", "skip", "stop", "queue", "nowplaying", "volume", "shuffle", "loop", "remove"]);
  assert.deepEqual(commands[1].options.map(option => option.name), ["song", "playlist"]);
  assert.deepEqual(commands[2].options.map(option => option.name), ["create", "add", "list", "show", "remove", "delete"]);
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
