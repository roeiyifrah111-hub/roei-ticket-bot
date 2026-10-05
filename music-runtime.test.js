const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { createMusicRuntime, formatDuration, progressBar } = require("./music-runtime");

const tick = () => new Promise(resolve => setImmediate(resolve));
function track(title, source = "youtube") {
  return { encoded: title, info: { title, author: "artist", uri: `https://${source}.com/${title}`, duration: 65000, sourceName: source, isStream: false }, requester: { id: "requester" } };
}

function setup(search = async () => ({ tracks: [] })) {
  const calls = [];
  const client = new EventEmitter();
  client.user = { id: "music", username: "Roei" };
  const channel = { id: "voice", isVoiceBased: () => true, isTextBased: () => true, send: async message => calls.push({ notification: message }) };
  const guild = { id: "guild", channels: { fetch: async () => channel }, members: { me: { voice: { channelId: "voice" } } }, shard: { send: packet => calls.push(packet) } };
  client.guilds = { cache: new Map([["guild", guild]]), fetch: async () => guild };
  class Manager extends EventEmitter {
    constructor(options) {
      super(); this.options = options; this.nodeManager = new EventEmitter();
      this.nodeManager.nodes = new Map([["node", { connected: true, sessionId: "session", search: async (query, requester) => { calls.push(query); return search(query, requester); } }]]);
    }
    async init() {}
    sendRawData(packet) { calls.push(packet); }
    getPlayer() { return this.player; }
    createPlayer(options) {
      calls.push(options);
      const player = {
        playing: false, paused: false, position: 10000,
        queue: { current: null, tracks: [], async add(t, index) { if (index === undefined) this.tracks.push(t); else this.tracks.splice(index, 0, t); }, async remove(tracks) { this.tracks = this.tracks.filter(t => !tracks.includes(t)); } },
        async connect() { calls.push("connect"); },
        async play(options = {}) {
          calls.push({ play: options });
          this.queue.current = options.clientTrack || this.queue.current || this.queue.tracks.shift();
          this.playing = true;
        }
      };
      this.player = player; return player;
    }
  }
  const runtime = createMusicRuntime({ client, guildId: "guild", channelId: "voice", host: "private", password: "test", Manager });
  return { runtime, calls, client, guild };
}

test("YouTube links are resolved directly and retain the original track", async () => {
  const original = track("original");
  const { runtime, calls } = setup(async () => ({ tracks: [original] }));
  await runtime.init({ id: "music", username: "Roei" });
  const result = await runtime.resolve("https://youtu.be/abc", { id: "user" });
  assert.equal(result.track, original);
  assert.equal(result.convertedFromYouTube, false);
  assert.deepEqual(calls[0], { query: "https://youtu.be/abc" });
});

test("song search tries YouTube Music, YouTube, then SoundCloud", async () => {
  const { runtime, calls } = setup(async ({ source }) => ({ tracks: source === "scsearch" ? [track("fallback", "soundcloud")] : [] }));
  await runtime.init({ id: "music", username: "Roei" });
  const result = await runtime.resolve("song name", {});
  assert.equal(result.track.info.sourceName, "soundcloud");
  assert.deepEqual(calls.map(call => call.source), ["ytmsearch", "ytsearch", "scsearch"]);
});

test("existing saved SoundCloud songs keep working", async () => {
  const original = track("saved", "soundcloud");
  const { runtime, calls } = setup(async () => ({ tracks: [original] }));
  await runtime.init({ id: "music", username: "Roei" });
  assert.equal((await runtime.resolve(original.info.uri, {})).track, original);
  assert.equal(calls.length, 1);
});

test("search errors on a YouTube source still permit SoundCloud fallback", async () => {
  const { runtime } = setup(async ({ source }) => {
    if (source !== "scsearch") return { exception: { message: "YouTube blocked" }, tracks: [] };
    return { tracks: [track("fallback", "soundcloud")] };
  });
  await runtime.init({ id: "music", username: "Roei" });
  assert.equal((await runtime.resolve("song", {})).track.info.sourceName, "soundcloud");
});

test("concurrent play requests start once and keep their queue order", async () => {
  const { runtime, calls } = setup();
  await runtime.init({ id: "music", username: "Roei" });
  const first = track("first"), second = track("second");
  await Promise.all([runtime.play(first), runtime.play(second)]);
  const player = runtime.manager.player;
  assert.equal(player.queue.current, first);
  assert.deepEqual(player.queue.tracks, [second]);
  assert.equal(calls.filter(call => call.play).length, 1);
  assert.equal(runtime.manager.options.playerOptions.onEmptyQueue.destroyAfterMs, undefined);
});

test("stream failure fallback preserves the next queued track", async () => {
  const fallback = track("fallback", "soundcloud");
  const { runtime } = setup(async () => ({ tracks: [fallback] }));
  await runtime.init({ id: "music", username: "Roei" });
  const { queue: player } = await runtime.ensureConnection();
  const next = track("next"); player.queue.current = next;
  runtime.manager.emit("trackEnd", player, track("failed"), { reason: "loadFailed" });
  await tick();
  assert.equal(player.queue.current, fallback);
  assert.deepEqual(player.queue.tracks, [next]);
});

test("last-track playback failure also gets a fallback", async () => {
  const fallback = track("fallback", "soundcloud");
  const { runtime } = setup(async () => ({ tracks: [fallback] }));
  await runtime.init({ id: "music", username: "Roei" });
  const { queue: player } = await runtime.ensureConnection();
  runtime.manager.emit("queueEnd", player, track("failed"), { reason: "loadFailed" });
  await tick(); assert.equal(player.queue.current, fallback);
});

test("failed production YouTube title falls back to a short song search", async () => {
  const replacement = track("איך שהיא רוקדת", "soundcloud");
  const { runtime, calls } = setup(async ({ query }) => ({ tracks: query === "איך שהיא רוקדת" ? [replacement] : [] }));
  await runtime.init({ id: "music", username: "Roei" });
  const { queue: player } = await runtime.ensureConnection();
  runtime.manager.emit("queueEnd", player, track("עדן חסון & אופק אדנק & אגם בוחבוט - איך שהיא רוקדת (Prod. By Nuri)"), { reason: "loadFailed" });
  await tick();
  assert.equal(player.queue.current, replacement);
  assert.deepEqual(calls.filter(c => c.source).map(c => c.query), ["עדן חסון & אופק אדנק & אגם בוחבוט - איך שהיא רוקדת", "איך שהיא רוקדת"]);
});

test("empty fallback results notify the channel and continue the queue", async () => {
  const { runtime, calls } = setup();
  await runtime.init({ id: "music", username: "Roei" });
  const { queue: player } = await runtime.ensureConnection();
  const next = track("next"); player.queue.current = next;
  runtime.manager.emit("trackEnd", player, track("artist - song (official)"), { reason: "loadFailed" });
  await tick();
  assert.equal(player.queue.current, next);
  assert.equal(calls.filter(c => c.notification).length, 1);
  assert.deepEqual(calls.find(c => c.notification).notification.allowedMentions, { parse: [] });
  assert.equal(calls.filter(c => c.play).length, 1);
});

test("stop or skip cancels an in-flight fallback", async () => {
  let finish;
  const { runtime, calls } = setup(() => new Promise(resolve => { finish = resolve; }));
  await runtime.init({ id: "music", username: "Roei" });
  const { queue: player } = await runtime.ensureConnection();
  runtime.manager.emit("queueEnd", player, track("failed"), { reason: "loadFailed" });
  await tick(); runtime.cancelPending(player);
  finish({ tracks: [track("fallback", "soundcloud")] });
  await tick();
  assert.equal(calls.filter(call => call.play).length, 0);
});

test("normal end advances to the next song; replaced does not", async () => {
  const { runtime, calls } = setup();
  await runtime.init({ id: "music", username: "Roei" });
  const { queue: player } = await runtime.ensureConnection();
  player.queue.current = track("next");
  runtime.manager.emit("trackEnd", player, track("old"), { reason: "replaced" });
  await tick(); assert.equal(calls.filter(call => call.play).length, 0);
  runtime.manager.emit("trackEnd", player, track("old"), { reason: "finished" });
  await tick(); assert.equal(calls.filter(call => call.play).length, 1);
});

test("voice packets are forwarded by the music client", () => {
  const { runtime, client, calls } = setup();
  const packet = { t: "VOICE_SERVER_UPDATE", d: { guild_id: "guild" } };
  client.emit("raw", packet);
  assert.equal(calls[0], packet);
  runtime.manager.options.sendToShard("guild", { op: 4 });
  assert.deepEqual(calls[1], { op: 4 });
});

test("duration and progress support long songs and live streams", () => {
  assert.equal(formatDuration(3661000), "1:01:01");
  assert.equal(formatDuration(0, true), "LIVE");
  const player = { position: 10000, queue: { current: track("song") } };
  assert.match(progressBar(player), /^0:10 .* 1:05$/);
  player.queue.current.info.isStream = true;
  assert.equal(progressBar(player), "");
});

test("real lavalink-client queue advances, falls back, stops and keeps the player", async () => {
  const { LavalinkManager } = require("lavalink-client");
  const updates = [];
  const fixture = setup();
  class OfflineManager extends LavalinkManager {
    constructor(options) {
      super(options);
      for (const node of this.nodeManager.nodes.values()) {
        node.connect = async () => { node.socket = { readyState: 1 }; node.sessionId = "offline"; };
        node.updatePlayer = async update => { updates.push(update); return {}; };
        node.search = async () => ({ tracks: [this.utils.buildTrack({ encoded: "fallback", info: { ...track("fallback", "soundcloud").info, length: 65000 } }, {})] });
      }
    }
  }
  const runtime = createMusicRuntime({ client: fixture.client, guildId: "guild", channelId: "voice", host: "private", password: "test", Manager: OfflineManager });
  await runtime.init({ id: "music", username: "Roei" });
  const makeTrack = title => runtime.manager.utils.buildTrack({ encoded: title, info: { ...track(title).info, length: 65000 } }, {});
  const first = makeTrack("first"), next = makeTrack("next");
  await runtime.play(first); await runtime.play(next);
  const player = runtime.manager.getPlayer("guild");
  const node = player.node;
  assert.equal(player.queue.current.encoded, "first");
  assert.deepEqual(player.queue.tracks.map(t => t.encoded), ["next"]);
  await node.trackEnd(player, first, { type: "TrackEndEvent", reason: "loadFailed" });
  await tick();
  assert.equal(player.queue.current.encoded, "fallback");
  assert.deepEqual(player.queue.tracks.map(t => t.encoded), ["next"]);
  const fallback = player.queue.current;
  await node.trackEnd(player, fallback, { type: "TrackEndEvent", reason: "finished" });
  await tick();
  assert.equal(player.queue.current.encoded, "next");
  assert.equal(updates.at(-1).playerOptions.track.encoded, "next");
  runtime.cancelPending(player);
  await player.stopPlaying(true, false);
  await node.trackEnd(player, next, { type: "TrackEndEvent", reason: "stopped" });
  await tick();
  assert.equal(player.queue.current, null);
  assert.equal(runtime.manager.getPlayer("guild"), player);
  assert.equal(updates.at(-1).playerOptions.track.encoded, null);
});
