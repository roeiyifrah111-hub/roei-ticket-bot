const { LavalinkManager } = require("lavalink-client");

function formatDuration(ms, live = false) {
  if (live) return "LIVE";
  if (!Number.isFinite(ms) || ms < 0) return "לא ידוע";
  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60) % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`
    : `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function trackSource(track) {
  const source = track?.info?.sourceName;
  return ({ youtube: "YouTube", soundcloud: "SoundCloud", spotify: "Spotify", applemusic: "Apple Music", deezer: "Deezer", tidal: "Tidal" })[source] || source || "לא ידוע";
}

function progressBar(player) {
  const track = player.queue.current;
  if (!track || track.info.isStream) return "";
  const length = track.info.duration;
  const position = Math.max(0, Math.min(player.position || 0, length));
  const filled = length > 0 ? Math.min(15, Math.floor(position / length * 15)) : 0;
  return `${formatDuration(position)} ${"━".repeat(filled)}🔘${"━".repeat(15 - filled)} ${formatDuration(length)}`;
}

function isYouTubeUrl(input) {
  try {
    const host = new URL(input).hostname.toLowerCase().replace(/^www\./, "");
    return ["youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"].includes(host);
  } catch { return false; }
}

function fallbackQueries(title) {
  const clean = String(title || "").replace(/\([^)]*\)|\[[^\]]*\]/g, " ").replace(/\s+/g, " ").trim();
  const song = clean.split(/\s+[-–—]\s+/).at(-1).trim();
  return [...new Set([clean, song].filter(Boolean))];
}

function createMusicRuntime({ client, guildId, channelId, host, port = 2333, password, Manager = LavalinkManager }) {
  const manager = new Manager({
    nodes: host && password ? [{ id: "roei-music", host, port, authorization: password, secure: false, retryAmount: 100, retryDelay: 5000, requestSignalTimeoutMS: 15000 }] : [],
    sendToShard: (id, payload) => client.guilds.cache.get(id)?.shard.send(payload),
    autoSkip: false,
    client: { id: client.user?.id, username: "Roei Music Bot" },
    playerOptions: {
      defaultSearchPlatform: "ytmsearch",
      volumeDecrementer: 1,
      onDisconnect: { autoReconnect: true, destroyPlayer: false, autoReconnectOnlyWithTracks: false },
      onEmptyQueue: { destroyAfterMs: undefined }
    }
  });
  let connectionTask = null;
  let reconnectTimer = null;
  let initialized = false;
  let readyTask = null;
  const playbackTasks = new WeakMap();
  const revisions = new WeakMap();

  client.on("raw", packet => {
    Promise.resolve(manager.sendRawData(packet)).catch(error => console.error("Music voice update:", error.message));
  });

  async function ready() {
    if (!host || !password || !Number.isInteger(port) || port < 1 || port > 65535) throw new Error("LAVALINK_CONFIG_MISSING");
    if (!initialized) throw new Error("LAVALINK_NOT_READY");
    if (Array.from(manager.nodeManager.nodes.values()).some(node => node.connected && node.sessionId)) return;
    if (!readyTask) {
      readyTask = (async () => {
        const deadline = Date.now() + 15000;
        while (Date.now() < deadline) {
          if (Array.from(manager.nodeManager.nodes.values()).some(node => node.connected && node.sessionId)) return;
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        throw new Error("LAVALINK_NOT_READY");
      })().finally(() => { readyTask = null; });
    }
    return readyTask;
  }

  async function init(user) {
    if (!host || !password) throw new Error("LAVALINK_CONFIG_MISSING");
    await manager.init({ id: user.id, username: user.username });
    initialized = true;
    await ready();
  }

  function scheduleReconnect() {
    if (!initialized || reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      ensureConnection().catch(error => console.error("Music reconnect:", error.message));
    }, 2500);
    reconnectTimer.unref?.();
  }

  manager.nodeManager.on("error", (node, error) => console.error(`Lavalink ${node.id}:`, error.message));
  manager.nodeManager.on("connect", node => {
    console.log(`Lavalink connected: ${node.id}`);
    scheduleReconnect();
  });
  manager.on("playerDestroy", scheduleReconnect);
  client.on("voiceStateUpdate", (oldState, newState) => {
    if (newState.member?.id === client.user?.id && newState.channelId !== channelId) scheduleReconnect();
  });

  async function ensureConnection() {
    if (connectionTask) return connectionTask;
    connectionTask = (async () => {
      await ready();
      const guild = await client.guilds.fetch(guildId);
      const voiceChannel = await guild.channels.fetch(channelId);
      if (!voiceChannel?.isVoiceBased() || !voiceChannel.isTextBased()) throw new Error("MUSIC_VOICE_CHANNEL_NOT_FOUND");
      const player = manager.getPlayer(guildId) || manager.createPlayer({ guildId, voiceChannelId: channelId, textChannelId: channelId, selfDeaf: true, selfMute: false, volume: 50 });
      if (guild.members.me?.voice.channelId !== channelId) await player.connect();
      return { guild, voiceChannel, queue: player };
    })().finally(() => { connectionTask = null; });
    return connectionTask;
  }

  function withPlaybackLock(player, action) {
    const previous = playbackTasks.get(player) || Promise.resolve();
    const task = previous.catch(() => {}).then(action);
    playbackTasks.set(player, task);
    return task.finally(() => { if (playbackTasks.get(player) === task) playbackTasks.delete(player); });
  }

  function cancelPending(player) {
    revisions.set(player, (revisions.get(player) || 0) + 1);
  }

  async function search(query, requester, source) {
    await ready();
    const node = Array.from(manager.nodeManager.nodes.values()).find(node => node.connected && node.sessionId);
    const result = await node.search({ query, ...(source ? { source } : {}) }, requester);
    if (result.exception) throw new Error(result.exception.message || "MUSIC_SEARCH_FAILED");
    return result.tracks[0] || null;
  }

  async function youtubeTitle(url) {
    try {
      const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, { signal: AbortSignal.timeout(8000) });
      if (response.ok) return (await response.json()).title || null;
    } catch {}
    return null;
  }

  async function soundcloudFallback(title, requester, cancelled = () => false) {
    for (const query of fallbackQueries(title)) {
      if (cancelled()) return null;
      try {
        const track = await search(query, requester, "scsearch");
        if (track) return track;
      } catch (error) { console.error("Music fallback search:", error.message); }
    }
    return null;
  }

  async function notifyFailure(track) {
    try {
      const guild = await client.guilds.fetch(guildId);
      const channel = await guild.channels.fetch(channelId);
      await channel.send({ content: `❌ לא הצלחתי לנגן את השיר «${track?.info?.title || "לא ידוע"}». מקור השמע נכשל ולא נמצא גיבוי מתאים. נסה קישור ישיר ל־SoundCloud או שם שיר קצר.`, allowedMentions: { parse: [] } });
    } catch (error) { console.error("Music failure notification:", error.message); }
  }

  async function resolve(input, requester) {
    const query = String(input || "").trim();
    if (!query) throw new Error("EMPTY_QUERY");
    let url = null;
    try { url = new URL(query); } catch {}
    if (url) {
      if (!["https:", "http:"].includes(url.protocol)) throw new Error("MUSIC_UNSUPPORTED_LINK");
      try {
        const track = await search(query, requester);
        if (track) return { track, originalQuery: query, youtubeTitle: null, convertedFromYouTube: false };
      } catch (error) {
        if (!isYouTubeUrl(query)) throw error;
      }
      if (isYouTubeUrl(query)) {
        const title = await youtubeTitle(query);
        const track = title ? await soundcloudFallback(title, requester) : null;
        if (track) return { track, originalQuery: query, youtubeTitle: title, convertedFromYouTube: true };
      }
      throw new Error("MUSIC_TRACK_NOT_FOUND");
    }
    for (const source of ["ytmsearch", "ytsearch", "scsearch"]) {
      try {
        const track = await search(query, requester, source);
        if (track) return { track, originalQuery: query, youtubeTitle: null, convertedFromYouTube: false };
      } catch (error) {
        if (error.message === "LAVALINK_NOT_READY" || error.message === "LAVALINK_CONFIG_MISSING") throw error;
        console.error(`Music search ${source}:`, error.message);
      }
    }
    throw new Error("MUSIC_TRACK_NOT_FOUND");
  }

  async function play(track) {
    const { queue: player } = await ensureConnection();
    return withPlaybackLock(player, async () => {
      const waiting = player.queue.tracks;
      const sameSong = other => (track.info.identifier && other.info.sourceName === track.info.sourceName && other.info.identifier === track.info.identifier) || (track.info.uri && other.info.uri === track.info.uri) || other.encoded === track.encoded;
      if ([player.queue.current, ...waiting].filter(Boolean).some(sameSong)) throw new Error("MUSIC_DUPLICATE_TRACK");
      const requesterId = track.requester?.id || track.requester;
      if (requesterId && waiting.filter(t => (t.requester?.id || t.requester) === requesterId).length >= 5) throw new Error("MUSIC_QUEUE_LIMIT");
      await player.queue.add(track);
      if (!player.playing && !player.paused && !player.queue.current) await player.play();
      return { track, queue: player };
    });
  }

  // The library advances its queue before emitting trackEnd/queueEnd.
  // Keep the next track when a failed YouTube stream is replaced by SoundCloud.
  async function continuePlayback(player, failedTrack, payload) {
    if (payload.reason === "replaced") return;
    const revision = revisions.get(player) || 0;
    return withPlaybackLock(player, async () => {
      if ((revisions.get(player) || 0) !== revision) return;
      if (payload.reason === "loadFailed" && failedTrack?.info?.sourceName === "youtube") {
        let fallback = null;
        try {
          fallback = await soundcloudFallback(failedTrack.info.title, failedTrack.requester, () => (revisions.get(player) || 0) !== revision);
        } catch (error) { console.error("Music fallback:", error.message); }
        if ((revisions.get(player) || 0) !== revision) return;
        if (fallback) {
          // Queue-repeat may have requeued the failed YouTube track.
          // The replacement will itself be repeated instead of retrying a blocked stream.
          const sameTrack = candidate => candidate?.encoded === failedTrack.encoded;
          const repeated = player.queue.tracks.filter(sameTrack);
          if (repeated.length) await player.queue.remove(repeated);
          if (player.queue.current && !sameTrack(player.queue.current)) await player.queue.add(player.queue.current, 0);
          console.log(`Music SoundCloud fallback: ${fallback.info.title}`);
          await player.play({ clientTrack: fallback });
          return;
        }
      }
      if (payload.reason === "loadFailed") {
        console.error(`Music playback failed without fallback: ${failedTrack?.info?.title || "unknown"}`);
        await notifyFailure(failedTrack);
      }
      if ((revisions.get(player) || 0) === revision && player.queue.current) await player.play({ noReplace: false });
    });
  }

  for (const event of ["trackEnd", "queueEnd"]) {
    manager.on(event, (player, track, payload) => {
      continuePlayback(player, track, payload).catch(error => console.error("Music queue advance:", error.message));
    });
  }
  manager.on("trackError", (player, track, payload) => console.error(`Music track error (${track?.info?.title || "unknown"}):`, payload.exception?.message || payload.message || "Playback failed"));
  manager.on("trackStuck", player => {
    setImmediate(() => {
      if (player.queue.current) player.play({ noReplace: false }).catch(error => console.error("Music stuck:", error.message));
    });
  });

  return { manager, init, ready, ensureConnection, resolve, play, cancelPending, withPlaybackLock };
}

module.exports = { createMusicRuntime, formatDuration, trackSource, progressBar, isYouTubeUrl, fallbackQueries };
