const {
  Client, GatewayIntentBits, PermissionFlagsBits, ChannelType,
  ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
  UserSelectMenuBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder,
  TextInputStyle, ButtonBuilder, ButtonStyle, SlashCommandBuilder, REST, Routes
} = require("discord.js");
const crypto = require("crypto");
const { Player, QueueRepeatMode } = require("discord-player");
const { YouTubeDlpExtractor } = require("discord-player-youtubedlp");
const ffmpegPath = require("ffmpeg-static");

if (ffmpegPath) process.env.FFMPEG_PATH = ffmpegPath;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates
  ]
});

const musicClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates
  ]
});

const TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const MUSIC_BOT_TOKEN = process.env.MUSIC_BOT_TOKEN;
const MUSIC_CLIENT_ID = process.env.MUSIC_CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const CATEGORY_ID = process.env.CATEGORY_ID;
const YOUTUBE_CHANNEL_ID_FROM_ENV = process.env.YOUTUBE_CHANNEL_ID || null;

const OWNER_USER_ID = "1243097719262941224";

const PANEL_CHANNEL_ID = "1541390151757078599";
const STAFF_APPLICATION_CHANNEL_ID = "1541391169936687195";
const STAFF_LOG_CHANNEL_ID = "1555688820916363354";
const WELCOME_CHANNEL_ID = "1541376515961262100";
const RULES_CHANNEL_ID = "1541369624644554772";

const SUGGESTIONS_PANEL_CHANNEL_ID = "1555834756481024062";
const VIDEO_IDEAS_CHANNEL_ID = "1555835422624587826";
const EDIT_IDEAS_CHANNEL_ID = "1555836109496516748";
const SERVER_SUGGESTIONS_CHANNEL_ID = "1555835110010527855";

const YOUTUBE_NOTIFY_CHANNEL_ID = "1555879776936402965";
const YOUTUBE_HANDLE_URL = "https://www.youtube.com/@RoeiKing1";
const YOUTUBE_CHECK_INTERVAL_MS = 2 * 60 * 1000;

const SOCIALS_CHANNEL_ID = "1555843770518609941";
const SOCIAL_YOUTUBE_URL = "https://www.youtube.com/@RoeiKing1";
const SOCIAL_KICK_URL = "https://kick.com/roeiking1";
const SOCIAL_WHATSAPP_URL = "https://whatsapp.com/channel/0029Vb7TecZK0IBbMbjFcr1T";
const DISCORD_USERNAME = "roro_king1234";

const PARTNER_PANEL_CHANNEL_ID = "1542045433323589714";
const PARTNER_ADS_CHANNEL_ID = "1541376165506187264";
const PARTNER_ROLE_ID = "1555952744341180466";
const OUR_SERVER_INVITE = "https://discord.gg/kP7f9rB33";
const PARTNER_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

// ===================== TEMP VOICE =====================
const TEMP_VOICE_PANEL_CHANNEL_ID = "1556011499234009191";
const TEMP_VOICE_CREATE_CHANNEL_ID = "1556011651013025812";
const TEMP_VOICE_CATEGORY_ID = "1556011045460508763";

// ===================== ARCADE =====================
const ARCADE_PANEL_CHANNEL_ID = "1556154437742104618";
const ARCADE_GAMES_CHANNEL_ID = "1556154531417554964";

// ===================== MUSIC BOT =====================
const MUSIC_VOICE_CHANNEL_ID = "1555567802121715832";

const ROLE_HELPER = "1556250971150094346";
const ROLE_STAFF = "1555587941575696444";
const ROLE_PROMO_1 = "1555588224636821526";
const ROLE_TEAM = "1555588615520653332";
const ROLE_ADMIN = "1555908830209118268";
const ROLE_HEAD_ADMIN = "1555908924643737621";
const ROLE_TOP = "1555588725398839376";
const EXTRA_HANDLER_ROLE = "1541371707011629077";

const STAFF_ACCESS_ROLE_IDS = [
  ROLE_STAFF, EXTRA_HANDLER_ROLE, ROLE_PROMO_1, ROLE_TEAM,
  ROLE_ADMIN, ROLE_HEAD_ADMIN, ROLE_TOP
];

const LADDER_ROLE_IDS = [
  ROLE_HELPER, ROLE_STAFF, ROLE_PROMO_1, ROLE_TEAM, ROLE_ADMIN, ROLE_HEAD_ADMIN, ROLE_TOP
];

const NICKNAME_PREFIX_BY_ROLE = {
  [ROLE_HELPER]: "He",
  [ROLE_STAFF]: "ST",
  [ROLE_PROMO_1]: "BST",
  [ROLE_TEAM]: "TM",
  [ROLE_ADMIN]: "AD",
  [ROLE_HEAD_ADMIN]: "HA",
  [ROLE_TOP]: "CO"
};

const PREFIX_RANKS = { HE: 0, ST: 1, BST: 2, TM: 3, AD: 4, HA: 5, CO: 6 };
const STAFF_PREFIX_REGEX = /^\s*(HE|ST|BST|TM|AD|HA|CO)\s*(?:\||｜|│|:|-|–|—)\s*/i;

// כל קידומת בסגנון "משהו | שם" נחשבת קידומת.
// לצוות/Partner מותרת רק הקידומת שהבוט נותן לפי הרול שלהם.
const ANY_PREFIX_REGEX = /^\s*([^|｜│]+?)\s*(?:\||｜|│)\s*/;

const FAKE_PROMOTION_TIMEOUT_MS = 15 * 60 * 1000;

const REJECT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

const rejectionCooldowns = new Map();
const pendingApplications = new Set();
const processingApplications = new Set();

const activeGiveaways = new Map();

const suggestionStates = new Map();
const processingSuggestions = new Set();

const partnerStates = new Map();
const partnerPendingByUser = new Map();
const partnerCooldowns = new Map();
const processingPartners = new Set();

const youtubeSeen = new Map();

const tempVoiceOwners = new Map();
const tempVoiceCreating = new Set();

const arcadeTttGames = new Map();
const arcadeRpsGames = new Map();
const arcadeImpostorGames = new Map();
const arcadeBombaGames = new Map();

const musicPlaylists = new Map();

let youtubeInitialized = false;
let resolvedYouTubeChannelId = YOUTUBE_CHANNEL_ID_FROM_ENV;
let youtubePollRunning = false;
let botDataChannelId = null;

const BOT_DATA_CHANNEL_NAME = "bot-data";
const BOT_DATA_CHANNEL_TOPIC = "roei-bot-private-data-v2";

const ticketTypes = {
  report: {
    channelName: "דיווח"
  },

  technical: {
    channelName: "תמיכה"
  },

  general: {
    channelName: "כללי"
  }
};

// ===================== BASIC HELPERS =====================

async function getMainGuild() {
  if (!GUILD_ID) return null;

  return client.guilds
    .fetch(GUILD_ID)
    .catch(() => null);
}

async function fetchFreshMember(guild, userId) {
  return guild.members.fetch({
    user: userId,
    force: true
  });
}

function hasStaffAccess(member) {
  if (!member) return false;

  if (member.id === OWNER_USER_ID) {
    return true;
  }

  return STAFF_ACCESS_ROLE_IDS.some(
    id => member.roles.cache.has(id)
  );
}

function hasClearAccess(member) {
  if (!member) return false;

  if (member.id === OWNER_USER_ID) {
    return true;
  }

  return [
    ROLE_TEAM,
    ROLE_ADMIN,
    ROLE_HEAD_ADMIN,
    ROLE_TOP
  ].some(
    id => member.roles.cache.has(id)
  );
}

function hasMusicBasicAccess(member) {
  if (!member) return false;

  if (member.id === OWNER_USER_ID) {
    return true;
  }

  return [
    ROLE_HELPER,
    ROLE_STAFF,
    ROLE_PROMO_1,
    ROLE_TEAM,
    ROLE_ADMIN,
    ROLE_HEAD_ADMIN,
    ROLE_TOP
  ].some(
    id => member.roles.cache.has(id)
  );
}

function hasMusicDJAccess(member) {
  if (!member) return false;

  if (member.id === OWNER_USER_ID) {
    return true;
  }

  return [
    ROLE_STAFF,
    ROLE_PROMO_1,
    ROLE_TEAM,
    ROLE_ADMIN,
    ROLE_HEAD_ADMIN,
    ROLE_TOP
  ].some(
    id => member.roles.cache.has(id)
  );
}

function getHighestLadderRoleId(member) {
  if (!member) return null;

  for (
    let i = LADDER_ROLE_IDS.length - 1;
    i >= 0;
    i--
  ) {
    if (
      member.roles.cache.has(
        LADDER_ROLE_IDS[i]
      )
    ) {
      return LADDER_ROLE_IDS[i];
    }
  }

  return null;
}

function getPromotionTargets(roleId) {
  if (roleId === ROLE_HELPER) {
    return [ROLE_STAFF];
  }

  if (roleId === ROLE_STAFF) {
    return [
      ROLE_PROMO_1,
      ROLE_TEAM
    ];
  }

  if (roleId === ROLE_PROMO_1) {
    return [ROLE_TEAM];
  }

  if (roleId === ROLE_TEAM) {
    return [ROLE_ADMIN];
  }

  if (roleId === ROLE_ADMIN) {
    return [ROLE_HEAD_ADMIN];
  }

  if (roleId === ROLE_HEAD_ADMIN) {
    return [ROLE_TOP];
  }

  return [];
}

function getPromotionLabels(roleId) {
  if (roleId === ROLE_HELPER) {
    return {
      [ROLE_STAFF]: "Stuff"
    };
  }

  if (roleId === ROLE_STAFF) {
    return {
      [ROLE_PROMO_1]: "Big Stuff",
      [ROLE_TEAM]: "Team"
    };
  }

  if (roleId === ROLE_PROMO_1) {
    return {
      [ROLE_TEAM]: "Team"
    };
  }

  if (roleId === ROLE_TEAM) {
    return {
      [ROLE_ADMIN]: "Admin"
    };
  }

  if (roleId === ROLE_ADMIN) {
    return {
      [ROLE_HEAD_ADMIN]: "Head Admin"
    };
  }

  if (roleId === ROLE_HEAD_ADMIN) {
    return {
      [ROLE_TOP]: "Co-owner"
    };
  }

  return {};
}

async function getRoleName(guild, roleId) {
  if (!roleId) {
    return "ללא";
  }

  const role =
    guild.roles.cache.get(roleId) ||
    await guild.roles
      .fetch(roleId)
      .catch(() => null);

  return role?.name || roleId;
}

function getStaffMentions() {
  return STAFF_ACCESS_ROLE_IDS
    .map(
      id => `<@&${id}>`
    )
    .join(" ");
}

function safeText(value, max = 1000) {
  const text =
    String(value ?? "")
      .trim();

  if (!text) {
    return "לא נכתב";
  }

  if (text.length <= max) {
    return text;
  }

  return (
    text.slice(
      0,
      max - 3
    ) +
    "..."
  );
}

function encodeSmall(value) {
  return Buffer.from(
    String(value ?? ""),
    "utf8"
  ).toString(
    "base64url"
  );
}

function decodeSmall(value) {
  try {
    return Buffer.from(
      value,
      "base64url"
    ).toString(
      "utf8"
    );
  } catch {
    return "";
  }
}

function normalizePlaylistName(name) {
  return String(
    name || ""
  )
    .trim()
    .toLocaleLowerCase("he");
}

function getUserPlaylistMap(
  userId,
  create = false
) {
  if (
    !musicPlaylists.has(userId) &&
    create
  ) {
    musicPlaylists.set(
      userId,
      new Map()
    );
  }

  return (
    musicPlaylists.get(userId) ||
    null
  );
}

function getUserPlaylist(
  userId,
  name
) {
  const map =
    getUserPlaylistMap(
      userId,
      false
    );

  if (!map) {
    return null;
  }

  return (
    map.get(
      normalizePlaylistName(name)
    ) ||
    null
  );
}

function createUserPlaylistLocal(
  userId,
  name
) {
  const clean =
    String(name || "")
      .trim()
      .slice(
        0,
        60
      );

  if (!clean) {
    return null;
  }

  const key =
    normalizePlaylistName(
      clean
    );

  const map =
    getUserPlaylistMap(
      userId,
      true
    );

  if (!map.has(key)) {
    map.set(
      key,
      {
        name: clean,
        songs: []
      }
    );
  }

  return map.get(key);
}

// ===================== PERSISTENCE =====================

async function ensureBotDataChannel(guild) {
  await guild.channels.fetch();

  let channel =
    guild.channels.cache.find(
      ch =>
        ch.type === ChannelType.GuildText &&
        ch.topic === BOT_DATA_CHANNEL_TOPIC
    );

  if (!channel) {
    channel =
      guild.channels.cache.find(
        ch =>
          ch.type === ChannelType.GuildText &&
          ch.name === BOT_DATA_CHANNEL_NAME
      );
  }

  if (!channel) {
    channel =
      await guild.channels.create({
        name: BOT_DATA_CHANNEL_NAME,
        type: ChannelType.GuildText,
        topic: BOT_DATA_CHANNEL_TOPIC,

        permissionOverwrites: [
          {
            id: guild.id,
            deny: [
              PermissionFlagsBits.ViewChannel
            ]
          },

          {
            id: client.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.ManageMessages
            ]
          },

          {
            id: OWNER_USER_ID,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.ReadMessageHistory
            ]
          }
        ],

        reason: "Private persistent storage for bot state"
      });

    await channel.send({
      content:
        "🤖 **חדר נתונים של הבוט**\n" +
        "החדר הזה שומר הצעות, Partner ו-YouTube אחרי Restart/Deploy.\n" +
        "**לא למחוק הודעות מכאן.**"
    });
  }

  botDataChannelId = channel.id;

  return channel;
}

async function getBotDataChannel() {
  if (botDataChannelId) {
    const cached =
      client.channels.cache.get(
        botDataChannelId
      );

    if (
      cached?.isTextBased()
    ) {
      return cached;
    }
  }

  const guild =
    await getMainGuild();

  if (!guild) {
    return null;
  }

  return ensureBotDataChannel(
    guild
  ).catch(
    () => null
  );
}

async function logBotData(line) {
  const channel =
    await getBotDataChannel();

  if (!channel) {
    return false;
  }

  try {
    await channel.send({
      content: line,

      allowedMentions: {
        parse: []
      }
    });

    return true;

  } catch (error) {
    console.error(
      "❌ שמירת נתונים נכשלה:",
      error.message
    );

    return false;
  }
}

async function savePartnerField(
  requestId,
  field,
  value
) {
  const encoded =
    encodeSmall(value);

  const maxChunk = 1500;

  const total =
    Math.max(
      1,
      Math.ceil(
        encoded.length /
        maxChunk
      )
    );

  for (
    let i = 0;
    i < total;
    i++
  ) {
    await logBotData(
      `PARTNER_FIELD|${requestId}|${field}|${i + 1}|${total}|${encoded.slice(
        i * maxChunk,
        (i + 1) * maxChunk
      )}`
    );
  }
}

async function savePartnerOwnerMessage(state) {
  await logBotData(
    `PARTNER_OWNERMSG|${state.requestId}|${state.ownerDmChannelId || "-"}|${state.ownerDmMessageId || "-"}`
  );
}

async function loadPersistentBotData() {
  const channel =
    await getBotDataChannel();

  if (!channel) {
    return;
  }

  const all = [];

  let before;
  let scanned = 0;

  while (
    scanned < 30000
  ) {
    const batch =
      await channel.messages.fetch({
        limit: 100,

        ...(before
          ? {
              before
            }
          : {})
      });

    if (
      !batch.size
    ) {
      break;
    }

    all.push(
      ...batch.values()
    );

    scanned +=
      batch.size;

    before =
      batch.last()?.id;

    if (
      !before ||
      batch.size < 100
    ) {
      break;
    }
  }

  all.sort(
    (a, b) =>
      a.createdTimestamp -
      b.createdTimestamp
  );

  const partnerFieldParts =
    new Map();

  for (
    const message of all
  ) {
    const line =
      message.content ||
      "";

    if (
      line === "YT_INIT"
    ) {
      youtubeInitialized = true;
      continue;
    }

    if (
      line.startsWith(
        "YT_SEEN|"
      )
    ) {
      const [
        ,
        videoId,
        type,
        messageId,
        channelId
      ] =
        line.split("|");

      if (!videoId) {
        continue;
      }

      youtubeSeen.set(
        videoId,
        {
          videoId,

          type:
            type ||
            "ignored",

          messageId:
            messageId &&
            messageId !== "-"
              ? messageId
              : null,

          channelId:
            channelId &&
            channelId !== "-"
              ? channelId
              : null,

          ended:
            type !== "live"
        }
      );

      continue;
    }

    if (
      line.startsWith(
        "YT_ENDED|"
      )
    ) {
      const [
        ,
        videoId
      ] =
        line.split("|");

      const state =
        youtubeSeen.get(
          videoId
        );

      if (state) {
        state.ended = true;
      }

      continue;
    }

    if (
      line.startsWith(
        "SUGG_CREATE|"
      )
    ) {
      const [
        ,
        messageId,
        creatorId,
        type,
        channelId
      ] =
        line.split("|");

      if (
        !messageId ||
        !creatorId ||
        !type ||
        !channelId
      ) {
        continue;
      }

      suggestionStates.set(
        messageId,
        {
          messageId,
          creatorId,
          type,
          channelId,

          votes:
            new Map(),

          thresholdNotified:
            false,

          forwardedBy:
            null,

          status:
            "open",

          statusBy:
            null
        }
      );

      continue;
    }

    if (
      line.startsWith(
        "SUGG_VOTE|"
      )
    ) {
      const [
        ,
        messageId,
        userId,
        choice
      ] =
        line.split("|");

      const state =
        suggestionStates.get(
          messageId
        );

      if (!state) {
        continue;
      }

      if (
        choice === "none"
      ) {
        state.votes.delete(
          userId
        );

      } else if (
        choice === "up" ||
        choice === "down"
      ) {
        state.votes.set(
          userId,
          choice
        );
      }

      continue;
    }

    if (
      line.startsWith(
        "SUGG_THRESHOLD|"
      )
    ) {
      const [
        ,
        messageId
      ] =
        line.split("|");

      const state =
        suggestionStates.get(
          messageId
        );

      if (state) {
        state.thresholdNotified =
          true;
      }

      continue;
    }

    if (
      line.startsWith(
        "SUGG_FORWARD|"
      )
    ) {
      const [
        ,
        messageId,
        staffId
      ] =
        line.split("|");

      const state =
        suggestionStates.get(
          messageId
        );

      if (state) {
        state.forwardedBy =
          staffId ||
          null;
      }

      continue;
    }

    if (
      line.startsWith(
        "SUGG_STATUS|"
      )
    ) {
      const [
        ,
        messageId,
        status,
        staffId
      ] =
        line.split("|");

      const state =
        suggestionStates.get(
          messageId
        );

      if (state) {
        state.status =
          status ||
          "open";

        state.statusBy =
          staffId ||
          null;
      }

      continue;
    }

    if (
      line.startsWith(
        "PARTNER_CREATE|"
      )
    ) {
      const [
        ,
        requestId,
        applicantId,
        createdAtRaw
      ] =
        line.split("|");

      if (
        !requestId ||
        !applicantId
      ) {
        continue;
      }

      partnerStates.set(
        requestId,
        {
          requestId,
          applicantId,

          createdAt:
            Number(
              createdAtRaw
            ) ||
            Date.now(),

          inviteUrl: "",
          promoText: "",
          notes: "",
          status: "pending",
          handledAt: null,
          ownerDmChannelId: null,
          ownerDmMessageId: null
        }
      );

      partnerPendingByUser.set(
        applicantId,
        requestId
      );

      continue;
    }

    if (
      line.startsWith(
        "PARTNER_FIELD|"
      )
    ) {
      const [
        ,
        requestId,
        field,
        partRaw,
        totalRaw,
        data
      ] =
        line.split("|");

      if (
        !requestId ||
        !field
      ) {
        continue;
      }

      const key =
        `${requestId}:${field}`;

      const partNumber =
        Number(
          partRaw
        );

      const totalParts =
        Number(
          totalRaw
        );

      if (
        partNumber === 1 ||
        !partnerFieldParts.has(
          key
        )
      ) {
        partnerFieldParts.set(
          key,
          {
            total:
              totalParts,

            parts:
              new Map()
          }
        );

      } else {
        partnerFieldParts
          .get(key)
          .total =
            totalParts;
      }

      partnerFieldParts
        .get(key)
        .parts
        .set(
          partNumber,
          data ||
          ""
        );

      continue;
    }

    if (
      line.startsWith(
        "PARTNER_OWNERMSG|"
      )
    ) {
      const [
        ,
        requestId,
        channelId,
        messageId
      ] =
        line.split("|");

      const state =
        partnerStates.get(
          requestId
        );

      if (state) {
        state.ownerDmChannelId =
          channelId !== "-"
            ? channelId
            : null;

        state.ownerDmMessageId =
          messageId !== "-"
            ? messageId
            : null;
      }

      continue;
    }

    if (
      line.startsWith(
        "PARTNER_STATUS|"
      )
    ) {
      const [
        ,
        requestId,
        status,
        handledAtRaw
      ] =
        line.split("|");

      const state =
        partnerStates.get(
          requestId
        );

      if (!state) {
        continue;
      }

      state.status =
        status ||
        state.status;

      state.handledAt =
        Number(
          handledAtRaw
        ) ||
        null;

      if (
        status === "approved" ||
        status === "rejected"
      ) {
        partnerPendingByUser.delete(
          state.applicantId
        );

        if (
          state.handledAt
        ) {
          partnerCooldowns.set(
            state.applicantId,
            state.handledAt +
              PARTNER_COOLDOWN_MS
          );
        }

      } else {
        partnerPendingByUser.set(
          state.applicantId,
          requestId
        );
      }

      continue;
    }

    if (
      line.startsWith(
        "TEMP_CREATE|"
      )
    ) {
      const [
        ,
        channelId,
        ownerId
      ] =
        line.split("|");

      if (
        channelId &&
        ownerId
      ) {
        tempVoiceOwners.set(
          channelId,
          ownerId
        );
      }

      continue;
    }

    if (
      line.startsWith(
        "TEMP_OWNER|"
      )
    ) {
      const [
        ,
        channelId,
        ownerId
      ] =
        line.split("|");

      if (
        channelId &&
        ownerId
      ) {
        tempVoiceOwners.set(
          channelId,
          ownerId
        );
      }

      continue;
    }

    if (
      line.startsWith(
        "TEMP_DELETE|"
      )
    ) {
      const [
        ,
        channelId
      ] =
        line.split("|");

      if (channelId) {
        tempVoiceOwners.delete(
          channelId
        );
      }

      continue;
    }

    if (
      line.startsWith(
        "MUSIC_PL_CREATE|"
      )
    ) {
      const [
        ,
        userId,
        encodedName
      ] =
        line.split("|");

      if (
        userId &&
        encodedName
      ) {
        createUserPlaylistLocal(
          userId,
          decodeSmall(
            encodedName
          )
        );
      }

      continue;
    }

    if (
      line.startsWith(
        "MUSIC_PL_ADD|"
      )
    ) {
      const [
        ,
        userId,
        encodedName,
        encodedSong
      ] =
        line.split("|");

      if (
        userId &&
        encodedName &&
        encodedSong
      ) {
        const playlist =
          createUserPlaylistLocal(
            userId,
            decodeSmall(
              encodedName
            )
          );

        if (playlist) {
          playlist.songs.push(
            decodeSmall(
              encodedSong
            )
          );
        }
      }

      continue;
    }

    if (
      line.startsWith(
        "MUSIC_PL_REMOVE|"
      )
    ) {
      const [
        ,
        userId,
        encodedName,
        indexRaw
      ] =
        line.split("|");

      const playlist =
        getUserPlaylist(
          userId,
          decodeSmall(
            encodedName
          )
        );

      const index =
        Number(
          indexRaw
        );

      if (
        playlist &&
        Number.isInteger(
          index
        ) &&
        index >= 0 &&
        index <
          playlist.songs.length
      ) {
        playlist.songs.splice(
          index,
          1
        );
      }

      continue;
    }

    if (
      line.startsWith(
        "MUSIC_PL_DELETE|"
      )
    ) {
      const [
        ,
        userId,
        encodedName
      ] =
        line.split("|");

      const map =
        getUserPlaylistMap(
          userId,
          false
        );

      if (map) {
        map.delete(
          normalizePlaylistName(
            decodeSmall(
              encodedName
            )
          )
        );
      }

      continue;
    }

    if (
      line.startsWith(
        "PARTNER_COOLDOWN|"
      )
    ) {
      const [
        ,
        userId,
        expiryRaw
      ] =
        line.split("|");

      const expiry =
        Number(
          expiryRaw
        ) ||
        0;

      if (
        expiry >
        Date.now()
      ) {
        partnerCooldowns.set(
          userId,
          expiry
        );
      }
    }
  }

  for (
    const [
      key,
      data
    ] of
    partnerFieldParts.entries()
  ) {
    const [
      requestId,
      field
    ] =
      key.split(":");

    const state =
      partnerStates.get(
        requestId
      );

    if (!state) {
      continue;
    }

    let merged = "";

    for (
      let i = 1;
      i <= data.total;
      i++
    ) {
      merged +=
        data.parts.get(i) ||
        "";
    }

    state[field] =
      decodeSmall(
        merged
      );
  }

  for (
    const [
      requestId,
      state
    ] of
    partnerStates.entries()
  ) {
    if (
      state.status === "pending" ||
      state.status === "waiting_publication"
    ) {
      partnerPendingByUser.set(
        state.applicantId,
        requestId
      );
    }

    if (
      (
        state.status === "approved" ||
        state.status === "rejected"
      ) &&
      state.handledAt
    ) {
      const expiry =
        state.handledAt +
        PARTNER_COOLDOWN_MS;

      if (
        expiry >
        Date.now()
      ) {
        partnerCooldowns.set(
          state.applicantId,
          expiry
        );
      }
    }
  }

  console.log(
    `✅ נטענו ${suggestionStates.size} הצעות, ${partnerStates.size} בקשות Partner, ${youtubeSeen.size} פריטי YouTube ו-${tempVoiceOwners.size} חדרים אישיים`
  );
}

// ===================== NICKNAMES =====================

function getStaffNicknamePrefix(member) {
  const roleId =
    getHighestLadderRoleId(
      member
    );

  return roleId
    ? NICKNAME_PREFIX_BY_ROLE[
        roleId
      ]
    : null;
}

function getAttemptedStaffPrefix(name) {
  const match =
    String(
      name ||
      ""
    )
      .trim()
      .match(
        STAFF_PREFIX_REGEX
      );

  return match
    ? match[1].toUpperCase()
    : null;
}

function hasAnyPrefix(name) {
  return ANY_PREFIX_REGEX.test(
    String(
      name ||
      ""
    ).trim()
  );
}

function stripAnyPrefix(name) {
  let value =
    String(
      name ||
      ""
    ).trim();

  while (
    hasAnyPrefix(
      value
    )
  ) {
    value =
      value
        .replace(
          ANY_PREFIX_REGEX,
          ""
        )
        .trim();
  }

  return value;
}

function getBaseName(member) {
  let base =
    stripAnyPrefix(
      member.nickname ||
      member.user.globalName ||
      member.user.username
    );

  if (
    !base ||
    base === "אין שם"
  ) {
    base =
      stripAnyPrefix(
        member.user.globalName ||
        member.user.username
      );
  }

  return (
    base ||
    member.user.username ||
    "אין שם"
  ).trim();
}

function getDesiredPrefix(member) {
  const staff =
    getStaffNicknamePrefix(
      member
    );

  if (staff) {
    return staff;
  }

  if (
    member.roles.cache.has(
      PARTNER_ROLE_ID
    )
  ) {
    return "PR";
  }

  return null;
}

async function applyPreferredNickname(member) {
  if (!member) {
    return;
  }

  const prefix =
    getDesiredPrefix(
      member
    );

  if (!prefix) {
    const current =
      member.nickname ||
      member.user.globalName ||
      member.user.username;

    if (
      hasAnyPrefix(
        current
      )
    ) {
      await handleUnauthorizedPrefix(
        member,
        current
      );
    }

    return;
  }

  if (
    !member.manageable
  ) {
    return;
  }

  const prefixText =
    `${prefix} | `;

  const base =
    getBaseName(
      member
    )
      .slice(
        0,
        Math.max(
          1,
          32 -
          prefixText.length
        )
      );

  const wanted =
    prefixText +
    base;

  if (
    member.nickname !==
    wanted
  ) {
    await member
      .setNickname(
        wanted,
        "עדכון ניקניים אוטומטי לפי תפקיד"
      )
      .catch(
        () => {}
      );
  }
}

async function notifyOwnerFakeName(
  member,
  attemptedName
) {
  const owner =
    await client.users
      .fetch(
        OWNER_USER_ID
      )
      .catch(
        () => null
      );

  if (!owner) {
    return;
  }

  const embed =
    new EmbedBuilder()
      .setTitle(
        "⚠️ נמצאה קידומת לא מורשית"
      )
      .setDescription(
        `${member.user} השתמש/ה בקידומת לפני השם בלי רול שמאפשר אותה.\n\n` +
        `📝 **השם שהיה:** \`${attemptedName}\`\n` +
        "🔄 **הניקניים שונה ל:** `אין שם`"
      )
      .setFooter({
        text:
          `User ID: ${member.id}`
      })
      .setTimestamp();

  const row =
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            `nickname_edit:${member.guild.id}:${member.id}`
          )
          .setLabel(
            "שנה ניקניים"
          )
          .setEmoji(
            "✏️"
          )
          .setStyle(
            ButtonStyle.Primary
          )
      );

  await owner.send({
    embeds: [
      embed
    ],

    components: [
      row
    ]
  }).catch(
    () => {}
  );
}

async function handleUnauthorizedPrefix(
  member,
  attemptedName
) {
  if (
    getDesiredPrefix(
      member
    ) ||
    !hasAnyPrefix(
      attemptedName
    )
  ) {
    return;
  }

  if (
    member.manageable
  ) {
    await member
      .setNickname(
        "אין שם",
        "שימוש בקידומת לא מורשית"
      )
      .catch(
        () => {}
      );
  }

  await notifyOwnerFakeName(
    member,
    attemptedName
  );
}

async function handleFakePromotion(
  member,
  attemptedName
) {
  const realPrefix =
    getStaffNicknamePrefix(
      member
    );

  const attemptedPrefix =
    getAttemptedStaffPrefix(
      attemptedName
    );

  if (
    !realPrefix ||
    !attemptedPrefix
  ) {
    return false;
  }

  if (
    PREFIX_RANKS[
      attemptedPrefix
    ] <=
    PREFIX_RANKS[
      realPrefix
    ]
  ) {
    return false;
  }

  let timeoutSuccess =
    false;

  if (
    member.moderatable
  ) {
    try {
      await member.timeout(
        FAKE_PROMOTION_TIMEOUT_MS,
        `ניסיון להשתמש בתג ${attemptedPrefix} ללא הדרגה המתאימה`
      );

      timeoutSuccess =
        true;

    } catch {}
  }

  await applyPreferredNickname(
    member
  );

  const owner =
    await client.users
      .fetch(
        OWNER_USER_ID
      )
      .catch(
        () => null
      );

  if (owner) {
    const roleName =
      await getRoleName(
        member.guild,
        getHighestLadderRoleId(
          member
        )
      );

    await owner.send({
      embeds: [
        new EmbedBuilder()
          .setTitle(
            "🚨 ניסיון לזייף דרגת צוות"
          )
          .setDescription(
            `${member.user} ניסה/תה לשים תג של דרגה גבוהה יותר.\n\n` +
            `🎖️ **הדרגה האמיתית:** ${roleName} (\`${realPrefix}\`)\n` +
            `⚠️ **התג שניסה/תה:** \`${attemptedPrefix}\`\n` +
            `📝 **השם שניסה/תה:** \`${attemptedName}\`\n\n` +
            (
              timeoutSuccess
                ? "⏱️ ניתן Timeout ל-15 דקות והשם תוקן."
                : "⚠️ השם תוקן, אבל לא הצלחתי לתת Timeout."
            )
          )
          .setTimestamp()
      ]
    }).catch(
      () => {}
    );
  }

  return true;
}

async function sendStaffChangeDM(
  member,
  oldRoleId,
  newRoleId
) {
  const oldName =
    oldRoleId
      ? await getRoleName(
          member.guild,
          oldRoleId
        )
      : null;

  const newName =
    newRoleId
      ? await getRoleName(
          member.guild,
          newRoleId
        )
      : null;

  let title;
  let description;

  let color =
    0x5865F2;

  if (
    !oldRoleId &&
    newRoleId
  ) {
    title =
      "✅ צורפת לצוות!";

    description =
      `🎖️ הדרגה שלך היא **${newName}**.`;

    color =
      0x57F287;

  } else if (
    oldRoleId &&
    !newRoleId
  ) {
    title =
      "❌ הוסרת מהצוות";

    description =
      `הוסרת מצוות השרת.\nהדרגה הקודמת שלך הייתה **${oldName}**.`;

    color =
      0xED4245;

  } else if (
    oldRoleId &&
    newRoleId
  ) {
    const oldIndex =
      LADDER_ROLE_IDS.indexOf(
        oldRoleId
      );

    const newIndex =
      LADDER_ROLE_IDS.indexOf(
        newRoleId
      );

    if (
      newIndex >
      oldIndex
    ) {
      title =
        "🎉 קיבלת קידום!";

      description =
        `⬆️ הדרגה שלך השתנתה מ-**${oldName}** ל-**${newName}**.`;

      color =
        0x57F287;

    } else if (
      newIndex <
      oldIndex
    ) {
      title =
        "⬇️ הדרגה שלך ירדה";

      description =
        `הדרגה שלך השתנתה מ-**${oldName}** ל-**${newName}**.`;

      color =
        0xFEE75C;

    } else {
      return;
    }

  } else {
    return;
  }

  await member.user.send({
    embeds: [
      new EmbedBuilder()
        .setColor(
          color
        )
        .setTitle(
          title
        )
        .setDescription(
          description
        )
        .setTimestamp()
    ]
  }).catch(
    () => {}
  );
}

// ===================== WELCOME =====================

async function sendWelcomeMessage(member) {
  const channel =
    await client.channels
      .fetch(
        WELCOME_CHANNEL_ID
      )
      .catch(
        () => null
      );

  if (
    !channel?.isTextBased()
  ) {
    return;
  }

  const embed =
    new EmbedBuilder()
      .setTitle(
        "👋 ברוך/ה הבא/ה לשרת!"
      )
      .setDescription(
        `היי ${member} — כיף שהצטרפת! 🎉\n\n` +
        `📜 קודם כל כדאי לעבור על החוקים ב-<#${RULES_CHANNEL_ID}>\n` +
        `🎫 צריך עזרה? מערכת הטיקטים נמצאת ב-<#${PANEL_CHANNEL_ID}>\n` +
        "💡 יש רעיון? יש לנו גם מערכת הצעות.\n\n" +
        `👥 **את/ה חבר/ה מספר ${member.guild.memberCount} בשרת!**`
      )
      .setThumbnail(
        member.user.displayAvatarURL({
          extension:
            "png",

          size:
            256
        })
      )
      .setTimestamp();

  const icon =
    member.guild.iconURL({
      size:
        256
    });

  if (icon) {
    embed.setAuthor({
      name:
        member.guild.name,

      iconURL:
        icon
    });
  }

  await channel.send({
    content:
      `🎉 ${member} ברוך/ה הבא/ה!`,

    embeds: [
      embed
    ],

    allowedMentions: {
      users: [
        member.id
      ]
    }
  }).catch(
    () => {}
  );
}

// ===================== STAFF APPLICATIONS =====================

function applicationKey(
  type,
  userId
) {
  return `${type}:${userId}`;
}

function buildApplicationFooter(
  userId,
  type,
  status,
  rejectedAt = null
) {
  let text =
    `applicant:${userId}|type:${type}|status:${status}`;

  if (
    rejectedAt
  ) {
    text +=
      `|rejectedAt:${rejectedAt}`;
  }

  return text;
}

function parseApplicationFooter(text) {
  if (
    !text ||
    !text.includes(
      "applicant:"
    )
  ) {
    return null;
  }

  const data = {};

  for (
    const part of
    text.split("|")
  ) {
    const index =
      part.indexOf(":");

    if (
      index !== -1
    ) {
      data[
        part.slice(
          0,
          index
        )
      ] =
        part.slice(
          index + 1
        );
    }
  }

  if (
    !data.applicant ||
    !data.type ||
    !data.status
  ) {
    return null;
  }

  return data;
}

function getCooldownExpiry(userId) {
  const expiry =
    rejectionCooldowns.get(
      userId
    );

  if (!expiry) {
    return null;
  }

  if (
    Date.now() >=
    expiry
  ) {
    rejectionCooldowns.delete(
      userId
    );

    return null;
  }

  return expiry;
}

async function loadApplicationState() {
  const channel =
    await client.channels
      .fetch(
        STAFF_APPLICATION_CHANNEL_ID
      )
      .catch(
        () => null
      );

  if (
    !channel?.isTextBased()
  ) {
    return;
  }

  let before;
  let scanned = 0;

  while (
    scanned < 2000
  ) {
    const batch =
      await channel.messages.fetch({
        limit:
          100,

        ...(before
          ? {
              before
            }
          : {})
      });

    if (
      !batch.size
    ) {
      break;
    }

    for (
      const message of
      batch.values()
    ) {
      const data =
        parseApplicationFooter(
          message.embeds[0]
            ?.footer
            ?.text
        );

      if (!data) {
        continue;
      }

      if (
        data.status === "pending" ||
        data.status === "awaiting_role"
      ) {
        pendingApplications.add(
          applicationKey(
            data.type,
            data.applicant
          )
        );
      }

      if (
        data.type === "initial" &&
        data.status === "rejected" &&
        data.rejectedAt
      ) {
        const expiry =
          Number(
            data.rejectedAt
          ) +
          REJECT_COOLDOWN_MS;

        if (
          expiry >
          Date.now()
        ) {
          rejectionCooldowns.set(
            data.applicant,
            Math.max(
              expiry,
              rejectionCooldowns.get(
                data.applicant
              ) ||
              0
            )
          );
        }
      }
    }

    scanned +=
      batch.size;

    before =
      batch.last()?.id;

    if (
      !before ||
      batch.size < 100
    ) {
      break;
    }
  }
}

function createStaffApplicationModal(type) {
  const modal =
    new ModalBuilder()
      .setCustomId(
        `staff_application_modal:${type}`
      )
      .setTitle(
        type === "promotion"
          ? "בחינת קידום בצוות 🛡️"
          : "בחינה לצוות 🛡️"
      );

  const fields = [
    [
      "age",
      "בן כמה את/ה?",
      "אני בן/בת...",
      TextInputStyle.Short,
      true,
      50
    ],

    [
      "situation",
      "אם שני אנשים רבים ומקללים, מה תעשה?",
      "אני הייתי...",
      TextInputStyle.Paragraph,
      true,
      1000
    ],

    [
      "name",
      "איך קוראים לך?",
      "קוראים לי...",
      TextInputStyle.Short,
      true,
      100
    ],

    [
      "experience",
      "יש לך ניסיון בניהול?",
      "כן, יש לי... / לא, אין לי...",
      TextInputStyle.Paragraph,
      true,
      1000
    ],

    [
      "notes",
      "הערות",
      "משהו נוסף שתרצו לספר לנו...",
      TextInputStyle.Paragraph,
      false,
      1000
    ]
  ];

  for (
    const [
      id,
      label,
      placeholder,
      style,
      required,
      maxLength
    ] of
    fields
  ) {
    modal.addComponents(
      new ActionRowBuilder()
        .addComponents(
          new TextInputBuilder()
            .setCustomId(
              id
            )
            .setLabel(
              label
            )
            .setPlaceholder(
              placeholder
            )
            .setStyle(
              style
            )
            .setRequired(
              required
            )
            .setMaxLength(
              maxLength
            )
        )
    );
  }

  return modal;
}

function setStatusField(
  embed,
  value
) {
  const fields =
    (
      embed.data.fields ||
      []
    )
      .filter(
        field =>
          field.name !==
          "📋 סטטוס"
      );

  embed.setFields(
    ...fields,

    {
      name:
        "📋 סטטוס",

      value
    }
  );

  return embed;
}

function createHandledRow(displayName) {
  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(
          "application_handled"
        )
        .setLabel(
          `טופל על ידי ${displayName}`.slice(
            0,
            80
          )
        )
        .setEmoji(
          "📋"
        )
        .setStyle(
          ButtonStyle.Secondary
        )
        .setDisabled(
          true
        )
    );
}

async function sendApplicantDM(
  userId,
  type,
  status
) {
  const user =
    await client.users
      .fetch(
        userId
      )
      .catch(
        () => null
      );

  if (!user) {
    return false;
  }

  const embed =
    status === "pending"
      ? new EmbedBuilder()
          .setTitle(
            type === "promotion"
              ? "⬆️ בקשת הקידום שלך בבדיקה"
              : "🛡️ הבקשה שלך בבדיקה"
          )
          .setDescription(
            "**הבקשה התקבלה בהצלחה ✅**\n\n" +
            "⏳ **סטטוס: בבדיקה**\n\n" +
            "כשתתקבל החלטה, תקבל/י כאן הודעה פרטית."
          )

      : new EmbedBuilder()
          .setTitle(
            type === "promotion"
              ? "❌ בקשת הקידום לא אושרה"
              : "❌ עדכון לגבי הבקשה שלך"
          )
          .setDescription(
            type === "promotion"
              ? "בקשת הקידום נבדקה, אך הפעם לא אושרה."
              : "הבקשה נבדקה, אך הפעם לא אושרה.\n\n⏳ ניתן להגיש בקשה חדשה בעוד **7 ימים**."
          );

  try {
    await user.send({
      embeds: [
        embed
      ]
    });

    return true;

  } catch {
    return false;
  }
}

// ===================== STAFF LOG / MANAGE =====================

async function sendStaffLog({
  guild,
  targetMember,
  actorUser,
  title,
  fromRoleId = null,
  toRoleId = null
}) {
  const channel =
    await client.channels
      .fetch(
        STAFF_LOG_CHANNEL_ID
      )
      .catch(
        () => null
      );

  if (
    !channel?.isTextBased()
  ) {
    return;
  }

  const fromName =
    fromRoleId
      ? await getRoleName(
          guild,
          fromRoleId
        )
      : "ללא";

  const toName =
    toRoleId
      ? await getRoleName(
          guild,
          toRoleId
        )
      : "ללא";

  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle(
          title
        )
        .addFields(
          {
            name:
              "👤 משתמש",

            value:
              `${targetMember.user}\n\`${targetMember.id}\``
          },

          {
            name:
              "📌 דרגה קודמת",

            value:
              fromRoleId
                ? `${fromName}\n<@&${fromRoleId}>`
                : "ללא"
          },

          {
            name:
              "🎖️ דרגה חדשה",

            value:
              toRoleId
                ? `${toName}\n<@&${toRoleId}>`
                : "ללא"
          },

          {
            name:
              "🛡️ בוצע על ידי",

            value:
              `${actorUser}\n\`${actorUser.id}\``
          }
        )
        .setTimestamp()
    ]
  }).catch(
    () => {}
  );
}

async function buildManagementEmbed(
  guild,
  member
) {
  member =
    await fetchFreshMember(
      guild,
      member.id
    );

  const roleId =
    getHighestLadderRoleId(
      member
    );

  const rankName =
    roleId
      ? await getRoleName(
          guild,
          roleId
        )
      : "לא בצוות";

  return new EmbedBuilder()
    .setTitle(
      "🛡️ ניהול צוות"
    )
    .setDescription(
      `👤 **משתמש:** ${member.user}\n` +
      `🎖️ **דרגה נוכחית:** ${rankName}\n\n` +
      (
        roleId
          ? "בחר פעולה לניהול המשתמש:"
          : "המשתמש לא נמצא כרגע בסולם הצוות. אפשר להוסיף אותו ידנית:"
      )
    );
}

function createManagementButtons(member) {
  const roleId =
    getHighestLadderRoleId(
      member
    );

  if (!roleId) {
    return [
      new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(
              `manage_add:${member.id}`
            )
            .setLabel(
              "הוסף לצוות"
            )
            .setEmoji(
              "➕"
            )
            .setStyle(
              ButtonStyle.Success
            )
        )
    ];
  }

  return [
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            `manage_promote:${member.id}`
          )
          .setLabel(
            "קידום"
          )
          .setEmoji(
            "⬆️"
          )
          .setStyle(
            ButtonStyle.Success
          )
          .setDisabled(
            roleId === ROLE_TOP
          ),

        new ButtonBuilder()
          .setCustomId(
            `manage_demote:${member.id}`
          )
          .setLabel(
            "הורדת דרגה"
          )
          .setEmoji(
            "⬇️"
          )
          .setStyle(
            ButtonStyle.Primary
          ),

        new ButtonBuilder()
          .setCustomId(
            `manage_remove:${member.id}`
          )
          .setLabel(
            "הורדה מהצוות"
          )
          .setEmoji(
            "❌"
          )
          .setStyle(
            ButtonStyle.Danger
          )
      )
  ];
}

async function refreshManagementPanel(
  interaction,
  userId,
  message = ""
) {
  const member =
    await fetchFreshMember(
      interaction.guild,
      userId
    )
      .catch(
        () => null
      );

  if (!member) {
    return interaction.editReply({
      content:
        "❌ המשתמש לא נמצא בשרת.",

      embeds: [],

      components: []
    });
  }

  return interaction.editReply({
    content:
      message,

    embeds: [
      await buildManagementEmbed(
        interaction.guild,
        member
      )
    ],

    components:
      createManagementButtons(
        member
      )
  });
}

async function createRoleChoiceRow(
  guild,
  userId,
  roleIds,
  prefix,
  labels = {}
) {
  const row =
    new ActionRowBuilder();

  for (
    const roleId of
    roleIds
  ) {
    const name =
      labels[roleId] ||
      await getRoleName(
        guild,
        roleId
      );

    row.addComponents(
      new ButtonBuilder()
        .setCustomId(
          `${prefix}:${userId}:${roleId}`
        )
        .setLabel(
          name.slice(
            0,
            80
          )
        )
        .setStyle(
          ButtonStyle.Success
        )
    );
  }

  return row;
}

// ===================== TICKETS =====================

function createTicketMenu() {
  return new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(
          "ticket_type"
        )
        .setPlaceholder(
          "בחרו את סוג הפנייה שלכם"
        )
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(
              "דיווח על משתמש"
            )
            .setDescription(
              "דיווח על משתמש שעבר על חוקי השרת"
            )
            .setEmoji(
              "🚨"
            )
            .setValue(
              "report"
            ),

          new StringSelectMenuOptionBuilder()
            .setLabel(
              "תמיכה טכנית"
            )
            .setDescription(
              "קבלת עזרה בבעיה או תקלה"
            )
            .setEmoji(
              "🛠️"
            )
            .setValue(
              "technical"
            ),

          new StringSelectMenuOptionBuilder()
            .setLabel(
              "כללי"
            )
            .setDescription(
              "פנייה כללית לצוות"
            )
            .setEmoji(
              "💬"
            )
            .setValue(
              "general"
            ),

          new StringSelectMenuOptionBuilder()
            .setLabel(
              "בחינה / קידום לצוות"
            )
            .setDescription(
              "לחדשים: בחינה | לצוות: קידום"
            )
            .setEmoji(
              "🛡️"
            )
            .setValue(
              "staff"
            )
        )
    );
}

function createTicketPanelEmbed() {
  return new EmbedBuilder()
    .setTitle(
      "מערכת טיקטים🎫"
    )
    .setDescription(
      "**שלום לכולם! ✨**\n\n" +
      "**בחרו סוג פנייה**\n\n" +
      "1️⃣ 🚨 **דיווח על משתמש**\n" +
      "2️⃣ 🛠️ **תמיכה טכנית**\n" +
      "3️⃣ 💬 **כללי**\n" +
      "4️⃣ 🛡️ **בחינה / קידום לצוות**\n\n" +
      "**⚠️ פניות שלא קשורות יסגרו ישר, פתחו טיקט רק אם באמת צריך**"
    );
}

function createCloseTicketRow() {
  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(
          "close_ticket"
        )
        .setLabel(
          "סגור טיקט"
        )
        .setEmoji(
          "🔒"
        )
        .setStyle(
          ButtonStyle.Danger
        )
    );
}

function createTicketEmbed(
  type,
  user
) {
  if (
    type === "report"
  ) {
    return new EmbedBuilder()
      .setTitle(
        "🚨 דיווח על משתמש"
      )
      .setDescription(
        `שלום ${user} 👋\n\n` +
        "👤 **על מי הדיווח?** — שם משתמש או ID\n" +
        "📝 **מה קרה?** — תיאור ברור\n" +
        "📸 **הוכחות** — תמונות / סרטונים אם יש\n" +
        "🕒 **מתי זה קרה?** — זמן משוער"
      );
  }

  if (
    type === "technical"
  ) {
    return new EmbedBuilder()
      .setTitle(
        "🛠️ תמיכה טכנית"
      )
      .setDescription(
        `שלום ${user} 👋\n\n` +
        "🔧 **מה הבעיה?**\n" +
        "📱 **איפה היא מתרחשת?**\n" +
        "📸 **צילום מסך / סרטון**, אם יש\n" +
        "✅ **מה כבר ניסיתם לעשות?**"
      );
  }

  return new EmbedBuilder()
    .setTitle(
      "💬 פנייה כללית"
    )
    .setDescription(
      `שלום ${user} 👋\n\n` +
      "כתבו כאן במה אתם צריכים עזרה והוסיפו כמה שיותר פרטים."
    );
}

function createTicketPermissions(
  guild,
  userId
) {
  const permissions = [
    {
      id:
        guild.id,

      deny: [
        PermissionFlagsBits.ViewChannel
      ]
    },

    {
      id:
        userId,

      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks
      ]
    },

    {
      id:
        client.user.id,

      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageMessages
      ]
    }
  ];

  for (
    const roleId of
    STAFF_ACCESS_ROLE_IDS
  ) {
    permissions.push({
      id:
        roleId,

      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ManageMessages
      ]
    });
  }

  return permissions;
}

async function setupTicketPanel() {
  const channel =
    await client.channels
      .fetch(
        PANEL_CHANNEL_ID
      )
      .catch(
        () => null
      );

  if (
    !channel?.isTextBased()
  ) {
    return;
  }

  const messages =
    await channel.messages.fetch({
      limit:
        100
    });

  const old =
    messages.find(
      message =>
        message.author.id === client.user.id &&
        message.components.some(
          row =>
            row.components.some(
              component =>
                component.customId === "ticket_type"
            )
        )
    );

  const payload = {
    embeds: [
      createTicketPanelEmbed()
    ],

    components: [
      createTicketMenu()
    ]
  };

  if (old) {
    await old.edit(
      payload
    );
  } else {
    await channel.send(
      payload
    );
  }
}

// ===================== GIVEAWAYS =====================

function parseGiveawayDuration(input) {
  const match =
    String(
      input ||
      ""
    )
      .trim()
      .toLowerCase()
      .match(
        /^(\d+)\s*(s|m|h|d)$/
      );

  if (!match) {
    return null;
  }

  const amount =
    Number(
      match[1]
    );

  const multiplier = {
    s:
      1000,

    m:
      60 *
      1000,

    h:
      60 *
      60 *
      1000,

    d:
      24 *
      60 *
      60 *
      1000
  }[
    match[2]
  ];

  const ms =
    amount *
    multiplier;

  if (
    !Number.isSafeInteger(
      amount
    ) ||
    amount <= 0 ||
    ms < 10 * 1000 ||
    ms > 30 * 24 * 60 * 60 * 1000
  ) {
    return null;
  }

  return ms;
}

function createGiveawayButtons(
  ended = false
) {
  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(
          "giveaway_join"
        )
        .setLabel(
          "השתתף בהגרלה"
        )
        .setEmoji(
          "🎉"
        )
        .setStyle(
          ButtonStyle.Success
        )
        .setDisabled(
          ended
        ),

      new ButtonBuilder()
        .setCustomId(
          "giveaway_end"
        )
        .setLabel(
          "סגור הגרלה"
        )
        .setEmoji(
          "🔒"
        )
        .setStyle(
          ButtonStyle.Danger
        )
        .setDisabled(
          ended
        )
    );
}

function createGiveawayEmbed(
  giveaway,
  ended = false,
  winners = []
) {
  const timestamp =
    Math.floor(
      giveaway.endsAt /
      1000
    );

  const embed =
    new EmbedBuilder()
      .setColor(
        ended
          ? 0x747F8D
          : 0x5865F2
      )
      .setTitle(
        ended
          ? "🎊 ההגרלה הסתיימה!"
          : "🎉 הגרלה חדשה!"
      )
      .setDescription(
        ended
          ? "**תודה לכל מי שהשתתף!**"
          : "**רוצים להשתתף? לחצו על 🎉 למטה!**\nלחיצה נוספת תוציא אתכם מההגרלה."
      )
      .addFields(
        {
          name:
            "🎁 הפרס",

          value:
            giveaway.prize
        },

        {
          name:
            "👤 נפתחה על ידי",

          value:
            `<@${giveaway.hostId}>`,

          inline:
            true
        },

        {
          name:
            "👥 משתתפים",

          value:
            String(
              giveaway.participants.size
            ),

          inline:
            true
        },

        {
          name:
            "🏆 מספר זוכים",

          value:
            String(
              giveaway.winnerCount
            ),

          inline:
            true
        },

        {
          name:
            ended
              ? "⏰ הסתיימה"
              : "⏰ מסתיימת",

          value:
            ended
              ? `<t:${Math.floor(Date.now() / 1000)}:R>`
              : `<t:${timestamp}:R>\n<t:${timestamp}:F>`
        }
      )
      .setFooter({
        text:
          ended
            ? "ההגרלה נסגרה • בהצלחה בפעם הבאה!"
            : "🎲 הזוכה נבחר באקראי לחלוטין"
      })
      .setTimestamp();

  if (
    giveaway.guildIcon
  ) {
    embed.setThumbnail(
      giveaway.guildIcon
    );
  }

  if (
    ended
  ) {
    embed.addFields({
      name:
        winners.length === 1
          ? "🥇 הזוכה"
          : "🥇 הזוכים",

      value:
        winners.length
          ? winners
              .map(
                id =>
                  `<@${id}>`
              )
              .join("\n")
          : "לא היו משתתפים בהגרלה."
    });
  }

  return embed;
}

function pickGiveawayWinners(
  participants,
  count
) {
  const users = [
    ...participants
  ];

  for (
    let i =
      users.length - 1;
    i > 0;
    i--
  ) {
    const j =
      crypto.randomInt(
        i + 1
      );

    [
      users[i],
      users[j]
    ] = [
      users[j],
      users[i]
    ];
  }

  return users.slice(
    0,
    Math.min(
      count,
      users.length
    )
  );
}

async function endGiveaway(
  giveaway,
  endedBy = null
) {
  if (
    !giveaway ||
    giveaway.ended
  ) {
    return;
  }

  giveaway.ended =
    true;

  if (
    giveaway.timer
  ) {
    clearTimeout(
      giveaway.timer
    );
  }

  const winners =
    pickGiveawayWinners(
      giveaway.participants,
      giveaway.winnerCount
    );

  const channel =
    await client.channels
      .fetch(
        giveaway.channelId
      )
      .catch(
        () => null
      );

  if (
    !channel?.isTextBased()
  ) {
    return;
  }

  const message =
    await channel.messages
      .fetch(
        giveaway.messageId
      )
      .catch(
        () => null
      );

  if (message) {
    await message.edit({
      embeds: [
        createGiveawayEmbed(
          giveaway,
          true,
          winners
        )
      ],

      components: [
        createGiveawayButtons(
          true
        )
      ]
    }).catch(
      () => {}
    );
  }

  await channel.send({
    content:
      winners.length
        ? (
            "🎉 **ההגרלה הסתיימה!**\n" +
            `${
              winners.length === 1
                ? "🏆 הזוכה"
                : "🏆 הזוכים"
            }: ${
              winners
                .map(
                  id =>
                    `<@${id}>`
                )
                .join(", ")
            }\n` +
            `🎁 **הפרס:** ${giveaway.prize}` +
            (
              endedBy
                ? `\n🔒 **נסגרה על ידי:** ${endedBy}`
                : ""
            )
          )
        : (
            "🎉 **ההגרלה הסתיימה!**\n" +
            "😕 לא היו משתתפים.\n" +
            `🎁 **הפרס:** ${giveaway.prize}`
          ),

    allowedMentions: {
      users:
        winners
    }
  }).catch(
    () => {}
  );
}

function scheduleGiveaway(giveaway) {
  const run = () => {
    if (
      giveaway.ended
    ) {
      return;
    }

    const remaining =
      giveaway.endsAt -
      Date.now();

    if (
      remaining <= 0
    ) {
      endGiveaway(
        giveaway
      ).catch(
        console.error
      );

      return;
    }

    giveaway.timer =
      setTimeout(
        run,
        Math.min(
          remaining,
          2147000000
        )
      );
  };

  run();
}

// ===================== SUGGESTIONS =====================

const suggestionTypes = {
  video: {
    label:
      "רעיונות לסרטונים",

    emoji:
      "🎬",

    channelId:
      VIDEO_IDEAS_CHANNEL_ID,

    title:
      "🎬 רעיון חדש לסרטון"
  },

  edit: {
    label:
      "רעיונות לאדיטים",

    emoji:
      "🎞️",

    channelId:
      EDIT_IDEAS_CHANNEL_ID,

    title:
      "🎞️ רעיון חדש לאדיט"
  },

  server: {
    label:
      "הצעות לשרת",

    emoji:
      "💡",

    channelId:
      SERVER_SUGGESTIONS_CHANNEL_ID,

    title:
      "💡 הצעה חדשה לשרת"
  }
};

function createSuggestionsPanelEmbed() {
  return new EmbedBuilder()
    .setColor(
      0x5865F2
    )
    .setTitle(
      "💡 מרכז הרעיונות וההצעות"
    )
    .setDescription(
      "יש לכם רעיון טוב? שלחו אותו כאן 👇\n\n" +
      "🎬 **רעיונות לסרטונים**\n" +
      "🎞️ **רעיונות לאדיטים**\n" +
      "💡 **הצעות לשרת**\n\n" +
      "אחרי השליחה, חברי השרת יוכלו להצביע **👍 בעד** או **👎 נגד**."
    )
    .setFooter({
      text:
        "בחרו קטגוריה מהתפריט למטה"
    });
}

function createSuggestionsPanelMenu() {
  return new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(
          "suggestion_type"
        )
        .setPlaceholder(
          "איזה סוג רעיון תרצו לשלוח?"
        )
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(
              "רעיונות לסרטונים"
            )
            .setDescription(
              "הציעו רעיון לסרטון חדש"
            )
            .setEmoji(
              "🎬"
            )
            .setValue(
              "video"
            ),

          new StringSelectMenuOptionBuilder()
            .setLabel(
              "רעיונות לאדיטים"
            )
            .setDescription(
              "הציעו רעיון לאדיט חדש"
            )
            .setEmoji(
              "🎞️"
            )
            .setValue(
              "edit"
            ),

          new StringSelectMenuOptionBuilder()
            .setLabel(
              "הצעות לשרת"
            )
            .setDescription(
              "משהו שכדאי להוסיף או לשנות בשרת"
            )
            .setEmoji(
              "💡"
            )
            .setValue(
              "server"
            )
        )
    );
}

function createSuggestionModal(type) {
  const config =
    suggestionTypes[
      type
    ];

  return new ModalBuilder()
    .setCustomId(
      `suggestion_modal:${type}`
    )
    .setTitle(
      config?.label ||
      "שליחת רעיון"
    )
    .addComponents(
      new ActionRowBuilder()
        .addComponents(
          new TextInputBuilder()
            .setCustomId(
              "idea"
            )
            .setLabel(
              "מה הרעיון שלך?"
            )
            .setPlaceholder(
              "תכתוב/י כאן את הרעיון..."
            )
            .setStyle(
              TextInputStyle.Paragraph
            )
            .setRequired(
              true
            )
            .setMinLength(
              2
            )
            .setMaxLength(
              1500
            )
        )
    );
}

function countSuggestionVotes(state) {
  let up = 0;
  let down = 0;

  for (
    const vote of
    state.votes.values()
  ) {
    if (
      vote === "up"
    ) {
      up++;
    }

    if (
      vote === "down"
    ) {
      down++;
    }
  }

  return {
    up,
    down
  };
}

function suggestionStatusText(state) {
  if (
    state.status ===
    "approved"
  ) {
    return (
      "✅ **אושר ונמצא בטיפול**" +
      (
        state.statusBy
          ? `\nאושר על ידי <@${state.statusBy}>`
          : ""
      )
    );
  }

  if (
    state.status ===
    "closed"
  ) {
    return (
      "🔒 **ההצעה נסגרה**" +
      (
        state.statusBy
          ? `\nנסגרה על ידי <@${state.statusBy}>`
          : ""
      )
    );
  }

  if (
    state.forwardedBy
  ) {
    return (
      `📨 **הועבר לבעלים על ידי <@${state.forwardedBy}>**\n` +
      "ההצעה עדיין פתוחה להצבעה."
    );
  }

  return "🗳️ **פתוח להצבעה**";
}

function createSuggestionEmbed(
  type,
  creatorId,
  idea,
  state
) {
  const config =
    suggestionTypes[
      type
    ] ||
    suggestionTypes.server;

  const {
    up,
    down
  } =
    countSuggestionVotes(
      state
    );

  return new EmbedBuilder()
    .setColor(
      state.status ===
        "approved"
        ? 0x57F287
        : state.status ===
          "closed"
          ? 0x747F8D
          : 0xFEE75C
    )
    .setTitle(
      config.title
    )
    .setDescription(
      `📝 **הרעיון:**\n${idea}`
    )
    .addFields(
      {
        name:
          "👤 נשלח על ידי",

        value:
          `<@${creatorId}>`
      },

      {
        name:
          "👍 בעד",

        value:
          String(
            up
          ),

        inline:
          true
      },

      {
        name:
          "👎 נגד",

        value:
          String(
            down
          ),

        inline:
          true
      },

      {
        name:
          "📋 סטטוס",

        value:
          suggestionStatusText(
            state
          )
      }
    )
    .setFooter({
      text:
        `suggestion:${type}:${creatorId}`
    })
    .setTimestamp();
}

function createSuggestionButtons(state) {
  const {
    up,
    down
  } =
    countSuggestionVotes(
      state
    );

  const locked =
    state.status !==
    "open";

  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(
          "suggestion_vote_up"
        )
        .setLabel(
          `בעד • ${up}`
        )
        .setEmoji(
          "👍"
        )
        .setStyle(
          ButtonStyle.Success
        )
        .setDisabled(
          locked
        ),

      new ButtonBuilder()
        .setCustomId(
          "suggestion_vote_down"
        )
        .setLabel(
          `נגד • ${down}`
        )
        .setEmoji(
          "👎"
        )
        .setStyle(
          ButtonStyle.Danger
        )
        .setDisabled(
          locked
        ),

      new ButtonBuilder()
        .setCustomId(
          "suggestion_staff_options"
        )
        .setLabel(
          "אפשרויות צוות"
        )
        .setEmoji(
          "🛡️"
        )
        .setStyle(
          ButtonStyle.Secondary
        )
        .setDisabled(
          locked
        )
    );
}

function createSuggestionStaffRow(
  messageId,
  isOwner
) {
  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(
          `suggestion_forward:${messageId}`
        )
        .setLabel(
          "שלח לבעלים עכשיו"
        )
        .setEmoji(
          "📨"
        )
        .setStyle(
          ButtonStyle.Primary
        ),

      new ButtonBuilder()
        .setCustomId(
          `suggestion_close:${messageId}`
        )
        .setLabel(
          "סגור הצעה"
        )
        .setEmoji(
          "🔒"
        )
        .setStyle(
          ButtonStyle.Danger
        ),

      new ButtonBuilder()
        .setCustomId(
          `suggestion_approve:${messageId}`
        )
        .setLabel(
          "אשר - בטיפול"
        )
        .setEmoji(
          "✅"
        )
        .setStyle(
          ButtonStyle.Success
        )
        .setDisabled(
          !isOwner
        )
    );
}

function getSuggestionIdea(message) {
  return (
    message.embeds[0]
      ?.description ||
    ""
  )
    .replace(
      /^📝 \*\*הרעיון:\*\*\n?/,
      ""
    )
    .trim();
}

function hydrateSuggestion(message) {
  const existing =
    suggestionStates.get(
      message.id
    );

  if (existing) {
    return existing;
  }

  const footer =
    message.embeds[0]
      ?.footer
      ?.text ||
    "";

  const match =
    footer.match(
      /^suggestion:([^:]+):(\d+)$/
    );

  if (!match) {
    return null;
  }

  const state = {
    messageId:
      message.id,

    creatorId:
      match[2],

    type:
      match[1],

    channelId:
      message.channel.id,

    votes:
      new Map(),

    thresholdNotified:
      false,

    forwardedBy:
      null,

    status:
      "open",

    statusBy:
      null
  };

  suggestionStates.set(
    message.id,
    state
  );

  return state;
}

async function updateSuggestionMessage(
  message,
  state
) {
  await message.edit({
    embeds: [
      createSuggestionEmbed(
        state.type,
        state.creatorId,
        getSuggestionIdea(
          message
        ),
        state
      )
    ],

    components: [
      createSuggestionButtons(
        state
      )
    ]
  });
}

async function sendSuggestionThresholdDM(
  message,
  state
) {
  const owner =
    await client.users
      .fetch(
        OWNER_USER_ID
      )
      .catch(
        () => null
      );

  if (!owner) {
    return;
  }

  const {
    up,
    down
  } =
    countSuggestionVotes(
      state
    );

  const config =
    suggestionTypes[
      state.type
    ] ||
    suggestionTypes.server;

  await owner.send({
    embeds: [
      new EmbedBuilder()
        .setColor(
          0x57F287
        )
        .setTitle(
          "🔥 הצעה הגיעה ל-5 בעד!"
        )
        .setDescription(
          `${config.emoji} **${config.label}**\n\n` +
          `📝 **הרעיון:**\n${getSuggestionIdea(message)}`
        )
        .addFields(
          {
            name:
              "👤 נשלח על ידי",

            value:
              `<@${state.creatorId}>`
          },

          {
            name:
              "👍 בעד",

            value:
              String(
                up
              ),

            inline:
              true
          },

          {
            name:
              "👎 נגד",

            value:
              String(
                down
              ),

            inline:
              true
          }
        )
        .setTimestamp()
    ],

    components: [
      new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setLabel(
              "פתח את ההצעה"
            )
            .setEmoji(
              "🔗"
            )
            .setStyle(
              ButtonStyle.Link
            )
            .setURL(
              message.url
            )
        )
    ]
  }).catch(
    () => {}
  );
}

async function sendSuggestionForwardDM(
  message,
  state,
  staffUser
) {
  const owner =
    await client.users
      .fetch(
        OWNER_USER_ID
      )
      .catch(
        () => null
      );

  if (!owner) {
    return false;
  }

  const {
    up,
    down
  } =
    countSuggestionVotes(
      state
    );

  const config =
    suggestionTypes[
      state.type
    ] ||
    suggestionTypes.server;

  return owner.send({
    embeds: [
      new EmbedBuilder()
        .setColor(
          0x5865F2
        )
        .setTitle(
          "📨 הצעה הועברה אליך על ידי צוות"
        )
        .setDescription(
          `${config.emoji} **${config.label}**\n\n` +
          `📝 **הרעיון:**\n${getSuggestionIdea(message)}`
        )
        .addFields(
          {
            name:
              "👤 יוצר ההצעה",

            value:
              `<@${state.creatorId}>`
          },

          {
            name:
              "🛡️ הועבר על ידי",

            value:
              `${staffUser}`
          },

          {
            name:
              "👍 בעד",

            value:
              String(
                up
              ),

            inline:
              true
          },

          {
            name:
              "👎 נגד",

            value:
              String(
                down
              ),

            inline:
              true
          }
        )
        .setTimestamp()
    ],

    components: [
      new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setLabel(
              "פתח את ההצעה"
            )
            .setEmoji(
              "🔗"
            )
            .setStyle(
              ButtonStyle.Link
            )
            .setURL(
              message.url
            )
        )
    ]
  })
    .then(
      () => true
    )
    .catch(
      () => false
    );
}

async function sendSuggestionCreatorDM(
  state,
  approved,
  staffUser = null
) {
  const user =
    await client.users
      .fetch(
        state.creatorId
      )
      .catch(
        () => null
      );

  if (!user) {
    return;
  }

  const embed =
    approved
      ? new EmbedBuilder()
          .setColor(
            0x57F287
          )
          .setTitle(
            "✅ ההצעה שלך אושרה!"
          )
          .setDescription(
            "ההצעה שלך **אושרה ונמצאת בטיפול**. 🎉\n" +
            "תודה על הרעיון!"
          )

      : new EmbedBuilder()
          .setColor(
            0x747F8D
          )
          .setTitle(
            "🔒 ההצעה שלך נסגרה"
          )
          .setDescription(
            "ההצעה נסגרה על ידי צוות השרת." +
            (
              staffUser
                ? `\n🛡️ טופל על ידי ${staffUser}`
                : ""
            )
          );

  await user.send({
    embeds: [
      embed
    ]
  }).catch(
    () => {}
  );
}

async function setupSuggestionsPanel() {
  const channel =
    await client.channels
      .fetch(
        SUGGESTIONS_PANEL_CHANNEL_ID
      )
      .catch(
        () => null
      );

  if (
    !channel?.isTextBased()
  ) {
    return;
  }

  const messages =
    await channel.messages.fetch({
      limit:
        100
    });

  const old =
    messages.find(
      message =>
        message.author.id === client.user.id &&
        message.components.some(
          row =>
            row.components.some(
              component =>
                component.customId === "suggestion_type"
            )
        )
    );

  const payload = {
    embeds: [
      createSuggestionsPanelEmbed()
    ],

    components: [
      createSuggestionsPanelMenu()
    ]
  };

  if (old) {
    await old.edit(
      payload
    );
  } else {
    await channel.send(
      payload
    );
  }
}
// ===================== SOCIALS =====================

function createSocialsEmbed() {
  return new EmbedBuilder()
    .setColor(0x00BFFF)
    .setTitle("🌐 הרשתות החברתיות של Roei")
    .setDescription(
      "**כל המקומות שבהם אפשר למצוא אותי במקום אחד!**\n\n" +
      "🎬 **YouTube** — סרטונים, Shorts ולייבים\n" +
      "🟢 **Kick** — שידורים ותוכן בלייב\n" +
      "💚 **WhatsApp** — עדכונים ישירות בערוץ\n\n" +
      `💬 **Discord:** \`${DISCORD_USERNAME}\`\n\n` +
      "👇 לחצו על הכפתור של הרשת שאתם רוצים לפתוח."
    )
    .setFooter({
      text: "socials-panel-v1"
    });
}

function createSocialsButtons() {
  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setLabel("YouTube")
        .setEmoji("▶️")
        .setStyle(ButtonStyle.Link)
        .setURL(SOCIAL_YOUTUBE_URL),

      new ButtonBuilder()
        .setLabel("Kick")
        .setEmoji("🟢")
        .setStyle(ButtonStyle.Link)
        .setURL(SOCIAL_KICK_URL),

      new ButtonBuilder()
        .setLabel("WhatsApp")
        .setEmoji("💚")
        .setStyle(ButtonStyle.Link)
        .setURL(SOCIAL_WHATSAPP_URL)
    );
}

async function setupSocialsPanel() {
  const channel =
    await client.channels
      .fetch(
        SOCIALS_CHANNEL_ID
      )
      .catch(
        () => null
      );

  if (
    !channel?.isTextBased()
  ) {
    return;
  }

  const messages =
    await channel.messages.fetch({
      limit: 100
    });

  const old =
    messages.find(
      message =>
        message.author.id === client.user.id &&
        message.embeds[0]?.footer?.text === "socials-panel-v1"
    );

  const payload = {
    embeds: [
      createSocialsEmbed()
    ],

    components: [
      createSocialsButtons()
    ]
  };

  if (old) {
    await old.edit(
      payload
    );
  } else {
    await channel.send(
      payload
    );
  }
}

// ===================== PARTNER =====================

function createPartnerPanelEmbed() {
  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle("🤝 מערכת Partner / שיתוף פעולה")
    .setDescription(
      "**רוצים לעשות Partner עם השרת שלנו?**\n\n" +
      "Partner אומר שאנחנו מפרסמים את השרת שלכם — ואתם מפרסמים את השרת שלנו.\n\n" +
      `🔗 **הקישור לשרת שלנו:** ${OUR_SERVER_INVITE}\n\n` +
      "לחצו על הכפתור למטה, מלאו את הפרטים והבקשה תישלח לבדיקה.\n" +
      "⏳ אחרי שבקשה מטופלת, ניתן להגיש בקשה חדשה אחרי **7 ימים**."
    )
    .setFooter({
      text: "partner-panel-v1"
    });
}

function createPartnerPanelRow() {
  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(
          "partner_apply"
        )
        .setLabel(
          "הגש בקשת Partner"
        )
        .setEmoji(
          "🤝"
        )
        .setStyle(
          ButtonStyle.Success
        )
    );
}

async function setupPartnerPanel() {
  const channel =
    await client.channels
      .fetch(
        PARTNER_PANEL_CHANNEL_ID
      )
      .catch(
        () => null
      );

  if (
    !channel?.isTextBased()
  ) {
    return;
  }

  const messages =
    await channel.messages.fetch({
      limit: 100
    });

  const old =
    messages.find(
      message =>
        message.author.id === client.user.id &&
        message.embeds[0]?.footer?.text === "partner-panel-v1"
    );

  const payload = {
    embeds: [
      createPartnerPanelEmbed()
    ],

    components: [
      createPartnerPanelRow()
    ]
  };

  if (old) {
    await old.edit(
      payload
    );
  } else {
    await channel.send(
      payload
    );
  }
}

function createPartnerModal() {
  return new ModalBuilder()
    .setCustomId(
      "partner_modal"
    )
    .setTitle(
      "בקשת Partner 🤝"
    )
    .addComponents(
      new ActionRowBuilder()
        .addComponents(
          new TextInputBuilder()
            .setCustomId(
              "invite"
            )
            .setLabel(
              "מה הקישור לשרת שלך?"
            )
            .setPlaceholder(
              "https://discord.gg/..."
            )
            .setStyle(
              TextInputStyle.Short
            )
            .setRequired(
              true
            )
            .setMaxLength(
              300
            )
        ),

      new ActionRowBuilder()
        .addComponents(
          new TextInputBuilder()
            .setCustomId(
              "promo_text"
            )
            .setLabel(
              "איזה כיתוב נפרסם על השרת שלך?"
            )
            .setPlaceholder(
              "כתוב כאן את הכיתוב לפרסום..."
            )
            .setStyle(
              TextInputStyle.Paragraph
            )
            .setRequired(
              true
            )
            .setMaxLength(
              1200
            )
        ),

      new ActionRowBuilder()
        .addComponents(
          new TextInputBuilder()
            .setCustomId(
              "notes"
            )
            .setLabel(
              "הערות"
            )
            .setPlaceholder(
              "לא חובה"
            )
            .setStyle(
              TextInputStyle.Paragraph
            )
            .setRequired(
              false
            )
            .setMaxLength(
              800
            )
        )
    );
}

function partnerStatusText(state) {
  if (
    state.status ===
    "approved"
  ) {
    return "✅ **אושר ופורסם**";
  }

  if (
    state.status ===
    "rejected"
  ) {
    return "❌ **נדחה**";
  }

  if (
    state.status ===
    "waiting_publication"
  ) {
    return "⏳ **ממתין שהוא יפרסם את השרת שלנו**";
  }

  return "🕒 **ממתין לבדיקה**";
}

function createPartnerOwnerEmbed(state) {
  return new EmbedBuilder()
    .setColor(
      state.status === "approved"
        ? 0x57F287
        : state.status === "rejected"
          ? 0xED4245
          : state.status === "waiting_publication"
            ? 0xFEE75C
            : 0x5865F2
    )
    .setTitle(
      "🤝 בקשת Partner חדשה"
    )
    .setDescription(
      `👤 **נשלח על ידי:** <@${state.applicantId}>\n\n` +
      `📋 **סטטוס:** ${partnerStatusText(state)}`
    )
    .addFields(
      {
        name:
          "🔗 קישור לשרת",

        value:
          safeText(
            state.inviteUrl
          )
      },

      {
        name:
          "📣 הכיתוב לפרסום",

        value:
          safeText(
            state.promoText
          )
      },

      {
        name:
          "📝 הערות",

        value:
          safeText(
            state.notes
          )
      }
    )
    .setFooter({
      text:
        `Partner Request ID: ${state.requestId}`
    })
    .setTimestamp(
      state.createdAt ||
      Date.now()
    );
}

function createPartnerOwnerButtons(state) {
  const handled =
    state.status === "approved" ||
    state.status === "rejected";

  return [
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setLabel(
            "פתח שרת"
          )
          .setEmoji(
            "🔗"
          )
          .setStyle(
            ButtonStyle.Link
          )
          .setURL(
            state.inviteUrl
          ),

        new ButtonBuilder()
          .setCustomId(
            `partner_approve:${state.requestId}`
          )
          .setLabel(
            "אישור"
          )
          .setEmoji(
            "✅"
          )
          .setStyle(
            ButtonStyle.Success
          )
          .setDisabled(
            handled
          ),

        new ButtonBuilder()
          .setCustomId(
            `partner_reject:${state.requestId}`
          )
          .setLabel(
            "דחייה"
          )
          .setEmoji(
            "❌"
          )
          .setStyle(
            ButtonStyle.Danger
          )
          .setDisabled(
            handled
          ),

        new ButtonBuilder()
          .setCustomId(
            `partner_edit:${state.requestId}`
          )
          .setLabel(
            "שנה כיתוב"
          )
          .setEmoji(
            "✏️"
          )
          .setStyle(
            ButtonStyle.Primary
          )
          .setDisabled(
            handled
          )
      )
  ];
}

function createPartnerApprovalConfirmRow(requestId) {
  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(
          `partner_confirm_yes:${requestId}`
        )
        .setLabel(
          "כן, הוא כבר פרסם"
        )
        .setEmoji(
          "✅"
        )
        .setStyle(
          ButtonStyle.Success
        ),

      new ButtonBuilder()
        .setCustomId(
          `partner_confirm_no:${requestId}`
        )
        .setLabel(
          "עדיין לא"
        )
        .setEmoji(
          "⏳"
        )
        .setStyle(
          ButtonStyle.Secondary
        )
    );
}

function createPartnerRejectModal(requestId) {
  return new ModalBuilder()
    .setCustomId(
      `partner_reject_modal:${requestId}`
    )
    .setTitle(
      "דחיית בקשת Partner"
    )
    .addComponents(
      new ActionRowBuilder()
        .addComponents(
          new TextInputBuilder()
            .setCustomId(
              "reason"
            )
            .setLabel(
              "סיבת דחייה"
            )
            .setPlaceholder(
              "לא חובה — אפשר להשאיר ריק"
            )
            .setStyle(
              TextInputStyle.Paragraph
            )
            .setRequired(
              false
            )
            .setMaxLength(
              1000
            )
        )
    );
}

function createPartnerEditModal(state) {
  const input =
    new TextInputBuilder()
      .setCustomId(
        "promo_text"
      )
      .setLabel(
        "הכיתוב הסופי לפרסום"
      )
      .setStyle(
        TextInputStyle.Paragraph
      )
      .setRequired(
        true
      )
      .setMaxLength(
        1200
      );

  if (
    state.promoText
  ) {
    input.setValue(
      state.promoText.slice(
        0,
        1200
      )
    );
  }

  return new ModalBuilder()
    .setCustomId(
      `partner_edit_modal:${state.requestId}`
    )
    .setTitle(
      "שינוי כיתוב Partner"
    )
    .addComponents(
      new ActionRowBuilder()
        .addComponents(
          input
        )
    );
}

function getPartnerCooldownExpiry(userId) {
  const expiry =
    partnerCooldowns.get(
      userId
    );

  if (!expiry) {
    return null;
  }

  if (
    Date.now() >=
    expiry
  ) {
    partnerCooldowns.delete(
      userId
    );

    return null;
  }

  return expiry;
}

async function savePartnerFields(state) {
  await savePartnerField(
    state.requestId,
    "inviteUrl",
    state.inviteUrl
  );

  await savePartnerField(
    state.requestId,
    "promoText",
    state.promoText
  );

  await savePartnerField(
    state.requestId,
    "notes",
    state.notes
  );
}

async function sendPartnerRequestToOwner(state) {
  const owner =
    await client.users
      .fetch(
        OWNER_USER_ID
      )
      .catch(
        () => null
      );

  if (!owner) {
    return null;
  }

  const dm =
    await owner
      .createDM()
      .catch(
        () => null
      );

  if (!dm) {
    return null;
  }

  const message =
    await dm.send({
      embeds: [
        createPartnerOwnerEmbed(
          state
        )
      ],

      components:
        createPartnerOwnerButtons(
          state
        )
    })
      .catch(
        () => null
      );

  if (!message) {
    return null;
  }

  state.ownerDmChannelId =
    dm.id;

  state.ownerDmMessageId =
    message.id;

  await savePartnerOwnerMessage(
    state
  );

  return message;
}

async function updatePartnerOwnerMessage(state) {
  if (
    !state.ownerDmChannelId ||
    !state.ownerDmMessageId
  ) {
    return;
  }

  const channel =
    await client.channels
      .fetch(
        state.ownerDmChannelId
      )
      .catch(
        () => null
      );

  if (
    !channel?.isTextBased()
  ) {
    return;
  }

  const message =
    await channel.messages
      .fetch(
        state.ownerDmMessageId
      )
      .catch(
        () => null
      );

  if (!message) {
    return;
  }

  await message.edit({
    embeds: [
      createPartnerOwnerEmbed(
        state
      )
    ],

    components:
      createPartnerOwnerButtons(
        state
      )
  }).catch(
    () => {}
  );
}

async function rejectPartnerRequest(
  state,
  reason
) {
  const handledAt =
    Date.now();

  const expiry =
    handledAt +
    PARTNER_COOLDOWN_MS;

  state.status =
    "rejected";

  state.handledAt =
    handledAt;

  partnerPendingByUser.delete(
    state.applicantId
  );

  partnerCooldowns.set(
    state.applicantId,
    expiry
  );

  await logBotData(
    `PARTNER_STATUS|${state.requestId}|rejected|${handledAt}`
  );

  await logBotData(
    `PARTNER_COOLDOWN|${state.applicantId}|${expiry}`
  );

  await updatePartnerOwnerMessage(
    state
  );

  const user =
    await client.users
      .fetch(
        state.applicantId
      )
      .catch(
        () => null
      );

  if (user) {
    await user.send({
      embeds: [
        new EmbedBuilder()
          .setColor(
            0xED4245
          )
          .setTitle(
            "❌ בקשת ה-Partner שלך נדחתה"
          )
          .setDescription(
            reason
              ? (
                  "הבקשה שלך לא אושרה.\n\n" +
                  `📝 **סיבה:**\n${safeText(reason, 1500)}`
                )
              : "הבקשה שלך נבדקה ולא אושרה."
          )
          .setFooter({
            text:
              "ניתן להגיש בקשה חדשה בעוד 7 ימים"
          })
          .setTimestamp()
      ]
    }).catch(
      () => {}
    );
  }
}

async function finalizePartnerApproval(state) {
  const guild =
    await getMainGuild();

  if (!guild) {
    throw new Error(
      "Guild not found"
    );
  }

  const member =
    await fetchFreshMember(
      guild,
      state.applicantId
    )
      .catch(
        () => null
      );

  if (!member) {
    throw new Error(
      "Applicant is not in the server"
    );
  }

  if (
    !member.roles.cache.has(
      PARTNER_ROLE_ID
    )
  ) {
    await member.roles.add(
      PARTNER_ROLE_ID,
      "Partner request approved"
    );
  }

  const fresh =
    await fetchFreshMember(
      guild,
      state.applicantId
    )
      .catch(
        () => member
      );

  await applyPreferredNickname(
    fresh
  );

  const channel =
    await client.channels
      .fetch(
        PARTNER_ADS_CHANNEL_ID
      )
      .catch(
        () => null
      );

  if (
    !channel?.isTextBased()
  ) {
    throw new Error(
      "Partner ads channel not found"
    );
  }

  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(
          0x57F287
        )
        .setTitle(
          "🤝 Partner חדש!"
        )
        .setDescription(
          "אנחנו שמחים להציג Partner חדש של השרת! 🎉\n\n" +
          `👤 **Partner:** <@${state.applicantId}>\n\n` +
          `📣 **על השרת:**\n${state.promoText}\n\n` +
          "👇 מוזמנים להיכנס, להכיר ולפרגן!"
        )
        .setTimestamp()
    ],

    components: [
      new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setLabel(
              "הצטרפו לשרת"
            )
            .setEmoji(
              "🔗"
            )
            .setStyle(
              ButtonStyle.Link
            )
            .setURL(
              state.inviteUrl
            )
        )
    ],

    allowedMentions: {
      users: [
        state.applicantId
      ]
    }
  });

  const handledAt =
    Date.now();

  const expiry =
    handledAt +
    PARTNER_COOLDOWN_MS;

  state.status =
    "approved";

  state.handledAt =
    handledAt;

  partnerPendingByUser.delete(
    state.applicantId
  );

  partnerCooldowns.set(
    state.applicantId,
    expiry
  );

  await logBotData(
    `PARTNER_STATUS|${state.requestId}|approved|${handledAt}`
  );

  await logBotData(
    `PARTNER_COOLDOWN|${state.applicantId}|${expiry}`
  );

  await updatePartnerOwnerMessage(
    state
  );

  await fresh.user.send({
    embeds: [
      new EmbedBuilder()
        .setColor(
          0x57F287
        )
        .setTitle(
          "✅ בקשת ה-Partner שלך אושרה!"
        )
        .setDescription(
          "הבקשה אושרה והפרסום שלך עלה בשרת. 🎉\n" +
          "קיבלת גם את רול ה-Partner.\n\n" +
          "תודה על שיתוף הפעולה! 🤝"
        )
        .setTimestamp()
    ]
  }).catch(
    () => {}
  );
}

// ===================== TEMP VOICE =====================

function createTempVoicePanelEmbed() {
  return new EmbedBuilder()
    .setColor(
      0x5865F2
    )
    .setTitle(
      "🎙️・ניהול חדר קולי אישי"
    )
    .setDescription(
      `כדי לפתוח חדר אישי, היכנסו ל-<#${TEMP_VOICE_CREATE_CHANNEL_ID}>.\n` +
      "הבוט ייצור לכם חדר קולי משלכם ויעביר אתכם אליו אוטומטית.\n\n" +
      "**שליטה בחדר:**\n" +
      "🔒 נעילה • 🔓 פתיחה • 🙈 הסתרה • 👁️ הצגה\n" +
      "👥 הגבלת משתמשים • ✏️ שינוי שם\n" +
      "💌 הזמנה • ✅ אישור משתמש • ⛔ חסימת משתמש\n" +
      "👢 הוצאה מהחדר • 👑 העברת בעלות • 🗑️ מחיקת החדר\n\n" +
      "⚠️ הכפתורים עובדים רק על **החדר האישי שלך**."
    )
    .setFooter({
      text:
        "temp-voice-panel-v1"
    });
}

function createTempVoicePanelRows() {
  return [
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            "temp_lock"
          )
          .setLabel(
            "נעילה"
          )
          .setEmoji(
            "🔒"
          )
          .setStyle(
            ButtonStyle.Secondary
          ),

        new ButtonBuilder()
          .setCustomId(
            "temp_unlock"
          )
          .setLabel(
            "פתיחה"
          )
          .setEmoji(
            "🔓"
          )
          .setStyle(
            ButtonStyle.Secondary
          ),

        new ButtonBuilder()
          .setCustomId(
            "temp_hide"
          )
          .setLabel(
            "הסתרה"
          )
          .setEmoji(
            "🙈"
          )
          .setStyle(
            ButtonStyle.Secondary
          ),

        new ButtonBuilder()
          .setCustomId(
            "temp_show"
          )
          .setLabel(
            "הצגה"
          )
          .setEmoji(
            "👁️"
          )
          .setStyle(
            ButtonStyle.Secondary
          ),

        new ButtonBuilder()
          .setCustomId(
            "temp_limit"
          )
          .setLabel(
            "הגבלה"
          )
          .setEmoji(
            "👥"
          )
          .setStyle(
            ButtonStyle.Primary
          )
      ),

    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            "temp_rename"
          )
          .setLabel(
            "שינוי שם"
          )
          .setEmoji(
            "✏️"
          )
          .setStyle(
            ButtonStyle.Primary
          ),

        new ButtonBuilder()
          .setCustomId(
            "temp_invite"
          )
          .setLabel(
            "הזמנה"
          )
          .setEmoji(
            "💌"
          )
          .setStyle(
            ButtonStyle.Success
          ),

        new ButtonBuilder()
          .setCustomId(
            "temp_permit"
          )
          .setLabel(
            "אישור"
          )
          .setEmoji(
            "✅"
          )
          .setStyle(
            ButtonStyle.Success
          ),

        new ButtonBuilder()
          .setCustomId(
            "temp_reject"
          )
          .setLabel(
            "חסימה"
          )
          .setEmoji(
            "⛔"
          )
          .setStyle(
            ButtonStyle.Danger
          ),

        new ButtonBuilder()
          .setCustomId(
            "temp_kick"
          )
          .setLabel(
            "הוצאה"
          )
          .setEmoji(
            "👢"
          )
          .setStyle(
            ButtonStyle.Danger
          )
      ),

    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            "temp_transfer"
          )
          .setLabel(
            "העברת בעלות"
          )
          .setEmoji(
            "👑"
          )
          .setStyle(
            ButtonStyle.Primary
          ),

        new ButtonBuilder()
          .setCustomId(
            "temp_delete"
          )
          .setLabel(
            "מחיקת החדר"
          )
          .setEmoji(
            "🗑️"
          )
          .setStyle(
            ButtonStyle.Danger
          )
      )
  ];
}

async function setupTempVoicePanel() {
  const channel =
    await client.channels
      .fetch(
        TEMP_VOICE_PANEL_CHANNEL_ID
      )
      .catch(
        () => null
      );

  if (
    !channel?.isTextBased()
  ) {
    console.log(
      "⚠️ חדר הפאנל של החדרים האישיים לא נמצא."
    );

    return;
  }

  const messages =
    await channel.messages
      .fetch({
        limit: 100
      })
      .catch(
        () => null
      );

  if (!messages) {
    return;
  }

  const old =
    messages.find(
      message =>
        message.author.id === client.user.id &&
        message.embeds[0]?.footer?.text === "temp-voice-panel-v1"
    );

  const payload = {
    embeds: [
      createTempVoicePanelEmbed()
    ],

    components:
      createTempVoicePanelRows()
  };

  if (old) {
    await old.edit(
      payload
    ).catch(
      () => {}
    );
  } else {
    await channel.send(
      payload
    ).catch(
      () => {}
    );
  }
}

function buildTempRoomName(member) {
  const raw =
    stripAnyPrefix(
      member.displayName ||
      member.user.globalName ||
      member.user.username ||
      "User"
    );

  const clean =
    (
      raw ||
      member.user.username ||
      "User"
    )
      .replace(
        /[\r\n]/g,
        " "
      )
      .trim();

  return (
    `TW | ${clean}'s Channel`
  ).slice(
    0,
    100
  );
}

function getTempRoomOwnerId(channelId) {
  return (
    tempVoiceOwners.get(
      channelId
    ) ||
    null
  );
}

async function getTempRoomOwnedBy(
  guild,
  ownerId
) {
  for (
    const [
      channelId,
      mappedOwnerId
    ] of
    tempVoiceOwners.entries()
  ) {
    if (
      mappedOwnerId !== ownerId
    ) {
      continue;
    }

    const channel =
      guild.channels.cache.get(
        channelId
      ) ||
      await guild.channels
        .fetch(
          channelId
        )
        .catch(
          () => null
        );

    if (
      channel?.type === ChannelType.GuildVoice &&
      channel.parentId === TEMP_VOICE_CATEGORY_ID
    ) {
      return channel;
    }

    tempVoiceOwners.delete(
      channelId
    );
  }

  return null;
}

async function getControlledTempRoom(
  interaction,
  explicitChannelId = null
) {
  if (
    !interaction.guild
  ) {
    return null;
  }

  const member =
    await fetchFreshMember(
      interaction.guild,
      interaction.user.id
    )
      .catch(
        () => null
      );

  if (!member) {
    return null;
  }

  const channelId =
    explicitChannelId ||
    member.voice.channelId;

  if (!channelId) {
    return null;
  }

  const ownerId =
    getTempRoomOwnerId(
      channelId
    );

  if (
    ownerId !== interaction.user.id
  ) {
    return null;
  }

  const channel =
    interaction.guild
      .channels
      .cache
      .get(
        channelId
      ) ||
    await interaction.guild
      .channels
      .fetch(
        channelId
      )
      .catch(
        () => null
      );

  if (
    !channel ||
    channel.type !== ChannelType.GuildVoice ||
    channel.parentId !== TEMP_VOICE_CATEGORY_ID
  ) {
    return null;
  }

  if (
    member.voice.channelId !== channel.id
  ) {
    return null;
  }

  return channel;
}

async function createTempVoiceRoom(member) {
  if (
    !member ||
    member.user.bot
  ) {
    return null;
  }

  if (
    tempVoiceCreating.has(
      member.id
    )
  ) {
    return null;
  }

  tempVoiceCreating.add(
    member.id
  );

  try {
    const guild =
      member.guild;

    const existing =
      await getTempRoomOwnedBy(
        guild,
        member.id
      );

    if (existing) {
      await member.voice
        .setChannel(
          existing,
          "חזרה לחדר הקולי האישי"
        )
        .catch(
          () => {}
        );

      return existing;
    }

    const category =
      await guild.channels
        .fetch(
          TEMP_VOICE_CATEGORY_ID
        )
        .catch(
          () => null
        );

    if (
      !category ||
      category.type !== ChannelType.GuildCategory
    ) {
      throw new Error(
        "Temp voice category not found"
      );
    }

    const permissionOverwrites = [
      {
        id:
          guild.id,

        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.Speak,
          PermissionFlagsBits.Stream,
          PermissionFlagsBits.UseVAD
        ]
      },

      {
        id:
          member.id,

        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.Speak,
          PermissionFlagsBits.Stream,
          PermissionFlagsBits.UseVAD
        ]
      }
    ];

    for (
      const roleId of
      STAFF_ACCESS_ROLE_IDS
    ) {
      permissionOverwrites.push({
        id:
          roleId,

        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.Speak,
          PermissionFlagsBits.MoveMembers
        ]
      });
    }

    const room =
      await guild.channels.create({
        name:
          buildTempRoomName(
            member
          ),

        type:
          ChannelType.GuildVoice,

        parent:
          TEMP_VOICE_CATEGORY_ID,

        permissionOverwrites,

        reason:
          `חדר קולי אישי של ${member.user.tag}`
      });

    tempVoiceOwners.set(
      room.id,
      member.id
    );

    await logBotData(
      `TEMP_CREATE|${room.id}|${member.id}`
    );

    try {
      await member.voice.setChannel(
        room,
        "יצירת חדר קולי אישי"
      );

    } catch (error) {
      tempVoiceOwners.delete(
        room.id
      );

      await logBotData(
        `TEMP_DELETE|${room.id}`
      );

      await room
        .delete(
          "לא ניתן היה להעביר את בעל החדר"
        )
        .catch(
          () => {}
        );

      throw error;
    }

    return room;

  } finally {
    tempVoiceCreating.delete(
      member.id
    );
  }
}

async function deleteTempVoiceRoom(
  channel,
  reason = "החדר האישי התרוקן"
) {
  if (!channel) {
    return;
  }

  const channelId =
    channel.id;

  tempVoiceOwners.delete(
    channelId
  );

  await logBotData(
    `TEMP_DELETE|${channelId}`
  );

  await channel
    .delete(
      reason
    )
    .catch(
      () => {}
    );
}

async function restoreTempVoiceRooms(guild) {
  for (
    const [
      channelId
    ] of
    [
      ...tempVoiceOwners.entries()
    ]
  ) {
    const channel =
      guild.channels.cache.get(
        channelId
      ) ||
      await guild.channels
        .fetch(
          channelId
        )
        .catch(
          () => null
        );

    if (
      !channel ||
      channel.type !== ChannelType.GuildVoice ||
      channel.parentId !== TEMP_VOICE_CATEGORY_ID
    ) {
      tempVoiceOwners.delete(
        channelId
      );

      await logBotData(
        `TEMP_DELETE|${channelId}`
      );

      continue;
    }

    if (
      channel.members.size === 0
    ) {
      await deleteTempVoiceRoom(
        channel,
        "ניקוי חדר אישי ריק אחרי הפעלה מחדש"
      );
    }
  }
}

function tempUserSelectRow(
  action,
  channelId,
  placeholder
) {
  return new ActionRowBuilder()
    .addComponents(
      new UserSelectMenuBuilder()
        .setCustomId(
          `temp_${action}_select:${channelId}`
        )
        .setPlaceholder(
          placeholder
        )
        .setMinValues(
          1
        )
        .setMaxValues(
          1
        )
    );
}

function createTempRenameModal(channel) {
  return new ModalBuilder()
    .setCustomId(
      `temp_rename_modal:${channel.id}`
    )
    .setTitle(
      "שינוי שם החדר"
    )
    .addComponents(
      new ActionRowBuilder()
        .addComponents(
          new TextInputBuilder()
            .setCustomId(
              "room_name"
            )
            .setLabel(
              "השם החדש של החדר"
            )
            .setStyle(
              TextInputStyle.Short
            )
            .setRequired(
              true
            )
            .setMinLength(
              1
            )
            .setMaxLength(
              100
            )
            .setValue(
              channel.name.slice(
                0,
                100
              )
            )
        )
    );
}

function createTempLimitModal(channel) {
  return new ModalBuilder()
    .setCustomId(
      `temp_limit_modal:${channel.id}`
    )
    .setTitle(
      "הגבלת משתמשים"
    )
    .addComponents(
      new ActionRowBuilder()
        .addComponents(
          new TextInputBuilder()
            .setCustomId(
              "room_limit"
            )
            .setLabel(
              "כמה משתמשים? 0 = ללא הגבלה"
            )
            .setPlaceholder(
              "לדוגמה: 5"
            )
            .setStyle(
              TextInputStyle.Short
            )
            .setRequired(
              true
            )
            .setMaxLength(
              2
            )
            .setValue(
              String(
                channel.userLimit ||
                0
              )
            )
        )
    );
}

async function handleTempVoiceButton(interaction) {
  const room =
    await getControlledTempRoom(
      interaction
    );

  if (!room) {
    return interaction.reply({
      content:
        "❌ כדי להשתמש בפאנל, צריך להיות בתוך **החדר האישי שלך**.\n" +
        `היכנס קודם ל-<#${TEMP_VOICE_CREATE_CHANNEL_ID}>.`,

      ephemeral:
        true
    });
  }

  if (
    interaction.customId === "temp_lock"
  ) {
    await room.permissionOverwrites.edit(
      interaction.guild.id,
      {
        Connect:
          false
      }
    );

    return interaction.reply({
      content:
        "🔒 החדר ננעל. רק משתמשים שאישרת יוכלו להיכנס.",

      ephemeral:
        true
    });
  }

  if (
    interaction.customId === "temp_unlock"
  ) {
    await room.permissionOverwrites.edit(
      interaction.guild.id,
      {
        Connect:
          true
      }
    );

    return interaction.reply({
      content:
        "🔓 החדר פתוח עכשיו לכולם.",

      ephemeral:
        true
    });
  }

  if (
    interaction.customId === "temp_hide"
  ) {
    await room.permissionOverwrites.edit(
      interaction.guild.id,
      {
        ViewChannel:
          false
      }
    );

    return interaction.reply({
      content:
        "🙈 החדר הוסתר ממשתמשים רגילים.",

      ephemeral:
        true
    });
  }

  if (
    interaction.customId === "temp_show"
  ) {
    await room.permissionOverwrites.edit(
      interaction.guild.id,
      {
        ViewChannel:
          true
      }
    );

    return interaction.reply({
      content:
        "👁️ החדר מוצג שוב לכולם.",

      ephemeral:
        true
    });
  }

  if (
    interaction.customId === "temp_rename"
  ) {
    return interaction.showModal(
      createTempRenameModal(
        room
      )
    );
  }

  if (
    interaction.customId === "temp_limit"
  ) {
    return interaction.showModal(
      createTempLimitModal(
        room
      )
    );
  }

  if (
    interaction.customId === "temp_invite"
  ) {
    return interaction.reply({
      content:
        "💌 בחר את מי להזמין לחדר:",

      components: [
        tempUserSelectRow(
          "invite",
          room.id,
          "בחר משתמש להזמנה"
        )
      ],

      ephemeral:
        true
    });
  }

  if (
    interaction.customId === "temp_permit"
  ) {
    return interaction.reply({
      content:
        "✅ בחר למי לתת גישה לחדר:",

      components: [
        tempUserSelectRow(
          "permit",
          room.id,
          "בחר משתמש לאישור"
        )
      ],

      ephemeral:
        true
    });
  }

  if (
    interaction.customId === "temp_reject"
  ) {
    return interaction.reply({
      content:
        "⛔ בחר את מי לחסום מהחדר:",

      components: [
        tempUserSelectRow(
          "reject",
          room.id,
          "בחר משתמש לחסימה"
        )
      ],

      ephemeral:
        true
    });
  }

  if (
    interaction.customId === "temp_kick"
  ) {
    return interaction.reply({
      content:
        "👢 בחר את מי להוציא מהחדר:",

      components: [
        tempUserSelectRow(
          "kick",
          room.id,
          "בחר משתמש להוצאה"
        )
      ],

      ephemeral:
        true
    });
  }

  if (
    interaction.customId === "temp_transfer"
  ) {
    return interaction.reply({
      content:
        "👑 בחר למי להעביר את הבעלות על החדר:",

      components: [
        tempUserSelectRow(
          "transfer",
          room.id,
          "בחר בעלים חדש"
        )
      ],

      ephemeral:
        true
    });
  }

  if (
    interaction.customId === "temp_delete"
  ) {
    await interaction.reply({
      content:
        "🗑️ החדר האישי נמחק.",

      ephemeral:
        true
    });

    await deleteTempVoiceRoom(
      room,
      `נמחק על ידי ${interaction.user.tag}`
    );

    return;
  }
}

async function handleTempVoiceUserSelect(interaction) {
  const [
    prefix,
    channelId
  ] =
    interaction.customId
      .split(":");

  const action =
    prefix
      .replace(
        "temp_",
        ""
      )
      .replace(
        "_select",
        ""
      );

  const room =
    await getControlledTempRoom(
      interaction,
      channelId
    );

  if (!room) {
    return interaction.update({
      content:
        "❌ החדר כבר לא קיים, או שאינך הבעלים שלו.",

      components: []
    });
  }

  const targetId =
    interaction.values[0];

  if (
    targetId === interaction.user.id
  ) {
    return interaction.update({
      content:
        "❌ אי אפשר לבחור את עצמך בפעולה הזאת.",

      components: []
    });
  }

  const target =
    await fetchFreshMember(
      interaction.guild,
      targetId
    )
      .catch(
        () => null
      );

  if (
    !target ||
    target.user.bot
  ) {
    return interaction.update({
      content:
        "❌ המשתמש לא נמצא או שהוא בוט.",

      components: []
    });
  }

  if (
    action === "invite"
  ) {
    await room.permissionOverwrites.edit(
      target.id,
      {
        ViewChannel:
          true,

        Connect:
          true,

        Speak:
          true
      }
    );

    const inviteUrl =
      `https://discord.com/channels/${interaction.guild.id}/${room.id}`;

    await target.user.send({
      embeds: [
        new EmbedBuilder()
          .setColor(
            0x57F287
          )
          .setTitle(
            "💌 הוזמנת לחדר קולי אישי"
          )
          .setDescription(
            `${interaction.user} הזמין/ה אותך לחדר הקולי **${room.name}** בשרת **${interaction.guild.name}**.`
          )
      ],

      components: [
        new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setLabel(
                "היכנס לחדר"
              )
              .setEmoji(
                "🔊"
              )
              .setStyle(
                ButtonStyle.Link
              )
              .setURL(
                inviteUrl
              )
          )
      ]
    }).catch(
      () => {}
    );

    return interaction.update({
      content:
        `✅ ${target} קיבל/ה גישה והזמנה לחדר.`,

      components: []
    });
  }

  if (
    action === "permit"
  ) {
    await room.permissionOverwrites.edit(
      target.id,
      {
        ViewChannel:
          true,

        Connect:
          true,

        Speak:
          true
      }
    );

    return interaction.update({
      content:
        `✅ ${target} יכול/ה עכשיו להיכנס לחדר.`,

      components: []
    });
  }

  if (
    action === "reject"
  ) {
    await room.permissionOverwrites.edit(
      target.id,
      {
        Connect:
          false,

        ViewChannel:
          null,

        Speak:
          null
      }
    );

    if (
      target.voice.channelId === room.id
    ) {
      await target.voice
        .disconnect(
          "נחסם מהחדר האישי"
        )
        .catch(
          () => {}
        );
    }

    return interaction.update({
      content:
        `⛔ ${target} נחסם/ה מכניסה לחדר.`,

      components: []
    });
  }

  if (
    action === "kick"
  ) {
    if (
      target.voice.channelId !== room.id
    ) {
      return interaction.update({
        content:
          "❌ המשתמש הזה לא נמצא כרגע בחדר שלך.",

        components: []
      });
    }

    await target.voice
      .disconnect(
        "הוצאה מחדר קולי אישי"
      )
      .catch(
        () => {}
      );

    return interaction.update({
      content:
        `👢 ${target} הוצא/ה מהחדר.`,

      components: []
    });
  }

  if (
    action === "transfer"
  ) {
    if (
      target.voice.channelId !== room.id
    ) {
      return interaction.update({
        content:
          "❌ אפשר להעביר בעלות רק למישהו שנמצא איתך בתוך החדר.",

        components: []
      });
    }

    const oldOwnerId =
      interaction.user.id;

    tempVoiceOwners.set(
      room.id,
      target.id
    );

    await logBotData(
      `TEMP_OWNER|${room.id}|${target.id}`
    );

    await room.permissionOverwrites.edit(
      target.id,
      {
        ViewChannel:
          true,

        Connect:
          true,

        Speak:
          true,

        Stream:
          true,

        UseVAD:
          true
      }
    );

    await room.permissionOverwrites
      .delete(
        oldOwnerId
      )
      .catch(
        () => {}
      );

    await room
      .setName(
        buildTempRoomName(
          target
        ),
        "העברת בעלות על חדר אישי"
      )
      .catch(
        () => {}
      );

    return interaction.update({
      content:
        `👑 הבעלות על החדר הועברה ל-${target}.`,

      components: []
    });
  }

  return interaction.update({
    content:
      "❌ הפעולה לא נמצאה.",

    components: []
  });
}

// ===================== ARCADE =====================

const ARCADE_GAMES = {
  ttt: {
    name:
      "איקס עיגול",

    emoji:
      "❌",

    description:
      "משחק 1 נגד 1. מזמינים יריב ומנסים ליצור שלישייה."
  },

  bomba: {
    name:
      "בומבה",

    emoji:
      "💣",

    description:
      "משחק קבוצתי מהיר עם נושא אקראי."
  },

  impostor: {
    name:
      "נחש את המתחזה",

    emoji:
      "🕵️",

    description:
      "כולם מקבלים מילה בפרטי חוץ מהמתחזה."
  },

  rps: {
    name:
      "אבן נייר ומספריים",

    emoji:
      "✊",

    description:
      "משחק מהיר 1 נגד 1."
  }
};

function createArcadePanelEmbed() {
  return new EmbedBuilder()
    .setColor(
      0x9B59B6
    )
    .setTitle(
      "🕹️・Roei Arcade"
    )
    .setDescription(
      "ברוכים הבאים לארקייד! 🎮\n" +
      `המשחקים עצמם ייפתחו ב-<#${ARCADE_GAMES_CHANNEL_ID}>.\n\n` +

      "❌⭕ **איקס עיגול**\n" +
      "משחק לשני שחקנים. מזמינים יריב ומתחילים לשחק על הלוח.\n\n" +

      "💣 **בומבה**\n" +
      "מצטרפים למשחק קבוצתי, מקבלים נושא וצריך לענות מהר.\n\n" +

      "🕵️ **נחש את המתחזה**\n" +
      "כולם מקבלים את אותה מילה בפרטי — חוץ משחקן אחד שהוא המתחזה.\n\n" +

      "✊✋✌️ **אבן נייר ומספריים**\n" +
      "משחק מהיר לשני שחקנים.\n\n" +

      "👇 **בחרו משחק מהתפריט למטה.**"
    )
    .setFooter({
      text:
        "arcade-panel-v1"
    });
}

function createArcadeMenu() {
  return new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(
          "arcade_game_select"
        )
        .setPlaceholder(
          "בחרו משחק..."
        )
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(
              "איקס עיגול"
            )
            .setDescription(
              "משחק 1 נגד 1"
            )
            .setEmoji(
              "❌"
            )
            .setValue(
              "ttt"
            ),

          new StringSelectMenuOptionBuilder()
            .setLabel(
              "בומבה"
            )
            .setDescription(
              "משחק קבוצתי"
            )
            .setEmoji(
              "💣"
            )
            .setValue(
              "bomba"
            ),

          new StringSelectMenuOptionBuilder()
            .setLabel(
              "נחש את המתחזה"
            )
            .setDescription(
              "מי לא קיבל את המילה?"
            )
            .setEmoji(
              "🕵️"
            )
            .setValue(
              "impostor"
            ),

          new StringSelectMenuOptionBuilder()
            .setLabel(
              "אבן נייר ומספריים"
            )
            .setDescription(
              "משחק 1 נגד 1"
            )
            .setEmoji(
              "✊"
            )
            .setValue(
              "rps"
            )
        )
    );
}

async function setupArcadePanel() {
  const channel =
    await client.channels
      .fetch(
        ARCADE_PANEL_CHANNEL_ID
      )
      .catch(
        () => null
      );

  if (
    !channel?.isTextBased()
  ) {
    console.log(
      "⚠️ חדר פאנל ה-Arcade לא נמצא."
    );

    return;
  }

  const messages =
    await channel.messages
      .fetch({
        limit: 100
      })
      .catch(
        () => null
      );

  if (!messages) {
    return;
  }

  const old =
    messages.find(
      message =>
        message.author.id === client.user.id &&
        message.embeds[0]?.footer?.text === "arcade-panel-v1"
    );

  const payload = {
    embeds: [
      createArcadePanelEmbed()
    ],

    components: [
      createArcadeMenu()
    ]
  };

  if (old) {
    await old.edit(
      payload
    ).catch(
      () => {}
    );
  } else {
    await channel.send(
      payload
    ).catch(
      () => {}
    );
  }
}

function randomItem(array) {
  return array[
    crypto.randomInt(
      array.length
    )
  ];
}

// ===================== TIC TAC TOE =====================

function createTttChallengeRow(gameId) {
  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(
          `ttt_accept:${gameId}`
        )
        .setLabel(
          "קבל משחק"
        )
        .setEmoji(
          "✅"
        )
        .setStyle(
          ButtonStyle.Success
        ),

      new ButtonBuilder()
        .setCustomId(
          `ttt_cancel:${gameId}`
        )
        .setLabel(
          "ביטול"
        )
        .setEmoji(
          "❌"
        )
        .setStyle(
          ButtonStyle.Danger
        )
    );
}

function getTttWinner(board) {
  const wins = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
  ];

  for (
    const [
      a,
      b,
      c
    ] of wins
  ) {
    if (
      board[a] &&
      board[a] === board[b] &&
      board[a] === board[c]
    ) {
      return board[a];
    }
  }

  return null;
}

function createTttBoardRows(game) {
  const rows = [];

  for (
    let rowIndex = 0;
    rowIndex < 3;
    rowIndex++
  ) {
    const row =
      new ActionRowBuilder();

    for (
      let columnIndex = 0;
      columnIndex < 3;
      columnIndex++
    ) {
      const index =
        rowIndex * 3 +
        columnIndex;

      const value =
        game.board[index];

      row.addComponents(
        new ButtonBuilder()
          .setCustomId(
            `ttt_cell:${game.id}:${index}`
          )
          .setLabel(
            value ||
            "➖"
          )
          .setStyle(
            value === "❌"
              ? ButtonStyle.Danger
              : value === "⭕"
                ? ButtonStyle.Primary
                : ButtonStyle.Secondary
          )
          .setDisabled(
            Boolean(value) ||
            game.finished
          )
      );
    }

    rows.push(
      row
    );
  }

  return rows;
}

function createTttEmbed(game) {
  let status;

  if (
    game.winner
  ) {
    const winnerId =
      game.winner === "❌"
        ? game.playerX
        : game.playerO;

    status =
      `🏆 **המנצח:** <@${winnerId}> ${game.winner}`;

  } else if (
    game.draw
  ) {
    status =
      "🤝 **תיקו!**";

  } else {
    status =
      `🎯 **התור של:** <@${game.turn}>`;
  }

  return new EmbedBuilder()
    .setColor(
      0x5865F2
    )
    .setTitle(
      "❌⭕ איקס עיגול"
    )
    .setDescription(
      `❌ <@${game.playerX}>\n` +
      `⭕ <@${game.playerO}>\n\n` +
      status
    )
    .setFooter({
      text:
        `ttt:${game.id}`
    });
}

// ===================== RPS =====================

function createRpsChallengeRow(gameId) {
  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(
          `rps_accept:${gameId}`
        )
        .setLabel(
          "קבל משחק"
        )
        .setEmoji(
          "✅"
        )
        .setStyle(
          ButtonStyle.Success
        ),

      new ButtonBuilder()
        .setCustomId(
          `rps_cancel:${gameId}`
        )
        .setLabel(
          "ביטול"
        )
        .setEmoji(
          "❌"
        )
        .setStyle(
          ButtonStyle.Danger
        )
    );
}

function createRpsChoiceRow(gameId) {
  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(
          `rps_choice:${gameId}:rock`
        )
        .setLabel(
          "אבן"
        )
        .setEmoji(
          "🪨"
        )
        .setStyle(
          ButtonStyle.Secondary
        ),

      new ButtonBuilder()
        .setCustomId(
          `rps_choice:${gameId}:paper`
        )
        .setLabel(
          "נייר"
        )
        .setEmoji(
          "📄"
        )
        .setStyle(
          ButtonStyle.Primary
        ),

      new ButtonBuilder()
        .setCustomId(
          `rps_choice:${gameId}:scissors`
        )
        .setLabel(
          "מספריים"
        )
        .setEmoji(
          "✂️"
        )
        .setStyle(
          ButtonStyle.Danger
        )
    );
}

function rpsEmoji(choice) {
  if (
    choice === "rock"
  ) {
    return "🪨";
  }

  if (
    choice === "paper"
  ) {
    return "📄";
  }

  return "✂️";
}

function getRpsWinner(
  first,
  second
) {
  if (
    first === second
  ) {
    return "draw";
  }

  if (
    (
      first === "rock" &&
      second === "scissors"
    ) ||
    (
      first === "paper" &&
      second === "rock"
    ) ||
    (
      first === "scissors" &&
      second === "paper"
    )
  ) {
    return "first";
  }

  return "second";
}

// ===================== IMPOSTOR =====================

const IMPOSTOR_WORDS = [
  "פיצה",
  "פורטנייט",
  "כדורגל",
  "ים",
  "בית ספר",
  "גלידה",
  "מטוס",
  "מחשב",
  "יוטיוב",
  "כלב",
  "חתול",
  "המבורגר",
  "קניון",
  "בריכה",
  "מיינקראפט",
  "רובלוקס",
  "סושי",
  "טלפון",
  "אייפון",
  "פארק"
];

function createImpostorLobbyRows(gameId) {
  return [
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            `impostor_join:${gameId}`
          )
          .setLabel(
            "הצטרף"
          )
          .setEmoji(
            "➕"
          )
          .setStyle(
            ButtonStyle.Success
          ),

        new ButtonBuilder()
          .setCustomId(
            `impostor_leave:${gameId}`
          )
          .setLabel(
            "צא"
          )
          .setEmoji(
            "➖"
          )
          .setStyle(
            ButtonStyle.Secondary
          ),

        new ButtonBuilder()
          .setCustomId(
            `impostor_start:${gameId}`
          )
          .setLabel(
            "התחל"
          )
          .setEmoji(
            "▶️"
          )
          .setStyle(
            ButtonStyle.Primary
          ),

        new ButtonBuilder()
          .setCustomId(
            `impostor_cancel:${gameId}`
          )
          .setLabel(
            "ביטול"
          )
          .setEmoji(
            "🗑️"
          )
          .setStyle(
            ButtonStyle.Danger
          )
      )
  ];
}

function createImpostorLobbyEmbed(game) {
  const players =
    [...game.players]
      .map(
        id =>
          `<@${id}>`
      )
      .join(
        "\n"
      ) ||
    "אין שחקנים";

  return new EmbedBuilder()
    .setColor(
      0x9B59B6
    )
    .setTitle(
      "🕵️ נחש את המתחזה"
    )
    .setDescription(
      `👑 **מארח:** <@${game.hostId}>\n\n` +
      `👥 **שחקנים (${game.players.size}):**\n${players}\n\n` +
      "צריך לפחות **3 שחקנים**.\n" +
      "כשהמארח לוחץ **התחל**, כולם יקבלו הודעה פרטית.\n" +
      "כולם יקבלו אותה מילה — חוץ מהמתחזה."
    )
    .setFooter({
      text:
        `impostor:${game.id}`
    });
}

// ===================== BOMBA =====================

const BOMBA_TOPICS = [
  "מדינות",
  "ערים בישראל",
  "מאכלים",
  "חיות",
  "משחקי מחשב",
  "יוטיוברים",
  "כדורגלנים",
  "מותגים",
  "סרטים",
  "סדרות",
  "דברים שיש בבית",
  "דברים שלוקחים לבית ספר",
  "דברים שיש במטבח",
  "מקצועות",
  "צבעים"
];

function createBombaLobbyRows(gameId) {
  return [
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            `bomba_join:${gameId}`
          )
          .setLabel(
            "הצטרף"
          )
          .setEmoji(
            "➕"
          )
          .setStyle(
            ButtonStyle.Success
          ),

        new ButtonBuilder()
          .setCustomId(
            `bomba_leave:${gameId}`
          )
          .setLabel(
            "צא"
          )
          .setEmoji(
            "➖"
          )
          .setStyle(
            ButtonStyle.Secondary
          ),

        new ButtonBuilder()
          .setCustomId(
            `bomba_start:${gameId}`
          )
          .setLabel(
            "התחל"
          )
          .setEmoji(
            "💣"
          )
          .setStyle(
            ButtonStyle.Primary
          ),

        new ButtonBuilder()
          .setCustomId(
            `bomba_cancel:${gameId}`
          )
          .setLabel(
            "ביטול"
          )
          .setEmoji(
            "🗑️"
          )
          .setStyle(
            ButtonStyle.Danger
          )
      )
  ];
}

function createBombaLobbyEmbed(game) {
  const players =
    [...game.players]
      .map(
        id =>
          `<@${id}>`
      )
      .join(
        "\n"
      ) ||
    "אין שחקנים";

  return new EmbedBuilder()
    .setColor(
      0xED4245
    )
    .setTitle(
      "💣 בומבה"
    )
    .setDescription(
      `👑 **מארח:** <@${game.hostId}>\n\n` +
      `👥 **שחקנים (${game.players.size}):**\n${players}\n\n` +
      "צריך לפחות **2 שחקנים**.\n" +
      "אחרי שמתחילים, הבוט נותן **נושא אקראי**.\n" +
      "עונים מהר בצ'אט לפי הנושא."
    )
    .setFooter({
      text:
        `bomba:${game.id}`
    });
}

// ===================== YOUTUBE =====================

function decodeXml(text) {
  return String(
    text ||
    ""
  )
    .replace(
      /&amp;/g,
      "&"
    )
    .replace(
      /&quot;/g,
      '"'
    )
    .replace(
      /&#39;/g,
      "'"
    )
    .replace(
      /&lt;/g,
      "<"
    )
    .replace(
      /&gt;/g,
      ">"
    );
}

function parseYouTubeFeed(xml) {
  const entries = [];

  const regex =
    /<entry>([\s\S]*?)<\/entry>/g;

  let match;

  while (
    (
      match =
        regex.exec(
          xml
        )
    ) !== null
  ) {
    const block =
      match[1];

    const videoId =
      block.match(
        /<yt:videoId>([^<]+)<\/yt:videoId>/
      )?.[1];

    const title =
      block.match(
        /<title>([\s\S]*?)<\/title>/
      )?.[1];

    const published =
      block.match(
        /<published>([^<]+)<\/published>/
      )?.[1];

    if (
      videoId
    ) {
      entries.push({
        videoId,

        title:
          decodeXml(
            title ||
            "סרטון חדש"
          ),

        published:
          published ||
          null
      });
    }
  }

  return entries;
}

function extractJsonObjectAfter(
  html,
  marker
) {
  const markerIndex =
    html.indexOf(
      marker
    );

  if (
    markerIndex === -1
  ) {
    return null;
  }

  const start =
    html.indexOf(
      "{",
      markerIndex +
      marker.length
    );

  if (
    start === -1
  ) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (
    let i = start;
    i < html.length;
    i++
  ) {
    const char =
      html[i];

    if (
      inString
    ) {
      if (
        escaped
      ) {
        escaped = false;

      } else if (
        char === "\\"
      ) {
        escaped = true;

      } else if (
        char === '"'
      ) {
        inString = false;
      }

      continue;
    }

    if (
      char === '"'
    ) {
      inString = true;
      continue;
    }

    if (
      char === "{"
    ) {
      depth++;
    }

    if (
      char === "}"
    ) {
      depth--;
    }

    if (
      depth === 0
    ) {
      try {
        return JSON.parse(
          html.slice(
            start,
            i + 1
          )
        );

      } catch {
        return null;
      }
    }
  }

  return null;
}

async function resolveYouTubeChannelId() {
  if (
    resolvedYouTubeChannelId
  ) {
    return resolvedYouTubeChannelId;
  }

  const response =
    await fetch(
      YOUTUBE_HANDLE_URL,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0"
        }
      }
    );

  if (
    !response.ok
  ) {
    throw new Error(
      `YouTube handle fetch failed: ${response.status}`
    );
  }

  const html =
    await response.text();

  const patterns = [
    /"externalId":"(UC[^"]+)"/,
    /<meta itemprop="channelId" content="(UC[^"]+)"/,
    /\/channel\/(UC[a-zA-Z0-9_-]+)/,
    /"channelId":"(UC[^"]+)"/
  ];

  for (
    const pattern of
    patterns
  ) {
    const found =
      html.match(
        pattern
      )?.[1];

    if (
      found
    ) {
      resolvedYouTubeChannelId =
        found;

      console.log(
        `✅ YouTube Channel ID: ${found}`
      );

      return found;
    }
  }

  throw new Error(
    "Could not resolve YouTube channel ID"
  );
}

async function getYouTubeFeedEntries() {
  const channelId =
    await resolveYouTubeChannelId();

  const response =
    await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0"
        }
      }
    );

  if (
    !response.ok
  ) {
    throw new Error(
      `YouTube RSS failed: ${response.status}`
    );
  }

  return parseYouTubeFeed(
    await response.text()
  );
}

async function getYouTubeVideoMeta(videoId) {
  const fallback = {
    title:
      null,

    isLiveNow:
      false,

    isLiveContent:
      false,

    endTimestamp:
      null,

    startTimestamp:
      null,

    isShortsEligible:
      false,

    thumbnail:
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
  };

  try {
    const response =
      await fetch(
        `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&hl=en`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0"
          }
        }
      );

    if (
      !response.ok
    ) {
      return fallback;
    }

    const html =
      await response.text();

    let player =
      null;

    for (
      const marker of
      [
        "var ytInitialPlayerResponse = ",
        "ytInitialPlayerResponse = ",
        '"ytInitialPlayerResponse":'
      ]
    ) {
      player =
        extractJsonObjectAfter(
          html,
          marker
        );

      if (
        player
      ) {
        break;
      }
    }

    const details =
      player?.videoDetails ||
      {};

    const micro =
      player?.microformat
        ?.playerMicroformatRenderer ||
      {};

    const live =
      micro.liveBroadcastDetails ||
      {};

    const rawTitle =
      details.title ||
      micro.title?.simpleText ||
      html.match(
        /<meta property="og:title" content="([^"]+)"/i
      )?.[1] ||
      null;

    const startTimestamp =
      live.startTimestamp ||
      html.match(
        /"startTimestamp":"([^"]+)"/
      )?.[1] ||
      null;

    const endTimestamp =
      live.endTimestamp ||
      html.match(
        /"endTimestamp":"([^"]+)"/
      )?.[1] ||
      null;

    const isLiveNow =
      live.isLiveNow === true ||
      /"isLiveNow":true/.test(
        html
      );

    const isLiveContent =
      details.isLiveContent === true ||
      /"isLiveContent":true/.test(
        html
      ) ||
      isLiveNow;

    const canonical =
      html.match(
        /<link rel="canonical" href="([^"]+)"/i
      )?.[1] ||
      "";

    const isShortsEligible =
      details.isShortsEligible === true ||
      micro.isShortsEligible === true ||
      /"isShortsEligible":true/.test(
        html
      ) ||
      /youtube\.com\/shorts\//i.test(
        canonical
      );

    const thumbnails =
      details.thumbnail
        ?.thumbnails ||
      micro.thumbnail
        ?.thumbnails ||
      [];

    const thumbnail =
      thumbnails.length
        ? thumbnails[
            thumbnails.length -
            1
          ].url
        : fallback.thumbnail;

    return {
      title:
        rawTitle
          ? decodeXml(
              rawTitle
            )
          : null,

      isLiveNow,
      isLiveContent,
      endTimestamp,
      startTimestamp,
      isShortsEligible,
      thumbnail
    };

  } catch (
    error
  ) {
    console.log(
      `⚠️ YouTube metadata fallback ${videoId}:`,
      error.message
    );

    return fallback;
  }
}

function youtubeWatchUrl(videoId) {
  return (
    "https://www.youtube.com/watch?v=" +
    videoId
  );
}

function youtubeShortUrl(videoId) {
  return (
    "https://www.youtube.com/shorts/" +
    videoId
  );
}

async function sendYouTubeAnnouncement(
  entry,
  meta,
  type
) {
  const channel =
    await client.channels
      .fetch(
        YOUTUBE_NOTIFY_CHANNEL_ID
      )
      .catch(
        () => null
      );

  if (
    !channel?.isTextBased()
  ) {
    return null;
  }

  const title =
    meta?.title ||
    entry.title;

  const thumbnail =
    meta?.thumbnail ||
    `https://i.ytimg.com/vi/${entry.videoId}/hqdefault.jpg`;

  let content =
    null;

  let embed;
  let button;

  if (
    type === "live"
  ) {
    content =
      "@everyone 🔴 **אנחנו בלייב עכשיו!**";

    embed =
      new EmbedBuilder()
        .setColor(
          0xED4245
        )
        .setTitle(
          "🔴 אנחנו בלייב עכשיו!"
        )
        .setDescription(
          `📺 **${title}**\n\n` +
          "🎙️ **הלייב התחיל — בואו עכשיו!**\n" +
          "👥 כולם מוזמנים להצטרף\n" +
          "🔥 אל תפספסו!"
        )
        .setImage(
          thumbnail
        )
        .setTimestamp();

    button =
      new ButtonBuilder()
        .setLabel(
          "היכנסו ללייב"
        )
        .setEmoji(
          "🔴"
        )
        .setStyle(
          ButtonStyle.Link
        )
        .setURL(
          youtubeWatchUrl(
            entry.videoId
          )
        );

  } else if (
    type === "short"
  ) {
    embed =
      new EmbedBuilder()
        .setColor(
          0x9B59B6
        )
        .setTitle(
          "📱 SHORT חדש עלה! 🔥"
        )
        .setDescription(
          `**${title}**\n\n` +
          "⚡ קצר, מהיר ושווה צפייה\n" +
          "❤️ תנו לייק אם אהבתם!"
        )
        .setImage(
          thumbnail
        )
        .setTimestamp();

    button =
      new ButtonBuilder()
        .setLabel(
          "צפו ב-Short"
        )
        .setEmoji(
          "▶️"
        )
        .setStyle(
          ButtonStyle.Link
        )
        .setURL(
          youtubeShortUrl(
            entry.videoId
          )
        );

  } else {
    embed =
      new EmbedBuilder()
        .setColor(
          0x3498DB
        )
        .setTitle(
          "🎬 סרטון חדש עלה לערוץ!"
        )
        .setDescription(
          `📺 **${title}**\n\n` +
          "🔥 שווה צפייה — אל תשכחו לייק וסאב!"
        )
        .setImage(
          thumbnail
        )
        .setTimestamp();

    button =
      new ButtonBuilder()
        .setLabel(
          "צפו בסרטון"
        )
        .setEmoji(
          "▶️"
        )
        .setStyle(
          ButtonStyle.Link
        )
        .setURL(
          youtubeWatchUrl(
            entry.videoId
          )
        );
  }

  return channel.send({
    content,

    embeds: [
      embed
    ],

    components: [
      new ActionRowBuilder()
        .addComponents(
          button
        )
    ],

    allowedMentions:
      type === "live"
        ? {
            parse: [
              "everyone"
            ]
          }
        : {
            parse: []
          }
  }).catch(
    () => null
  );
}

async function markYouTubeLiveEnded(
  videoId,
  state,
  meta
) {
  if (
    !state ||
    state.ended
  ) {
    return;
  }

  if (
    !state.messageId ||
    !state.channelId
  ) {
    state.ended =
      true;

    await logBotData(
      `YT_ENDED|${videoId}`
    );

    return;
  }

  const channel =
    await client.channels
      .fetch(
        state.channelId
      )
      .catch(
        () => null
      );

  if (
    !channel?.isTextBased()
  ) {
    return;
  }

  const message =
    await channel.messages
      .fetch(
        state.messageId
      )
      .catch(
        () => null
      );

  if (!message) {
    return;
  }

  const embed =
    message.embeds[0]
      ? EmbedBuilder.from(
          message.embeds[0]
        )
      : new EmbedBuilder();

  embed
    .setColor(
      0x747F8D
    )
    .setTitle(
      "⚫ 「 הלייב נגמר 」"
    )
    .setDescription(
      `📺 **${meta?.title || "הלייב"}**\n\n` +
      "השידור הסתיים, אבל הקישור נשאר כדי שאפשר יהיה לצפות בשידור החוזר. 👇"
    )
    .setTimestamp();

  await message.edit({
    content:
      null,

    embeds: [
      embed
    ],

    components: [
      new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setLabel(
              "צפו בשידור החוזר"
            )
            .setEmoji(
              "▶️"
            )
            .setStyle(
              ButtonStyle.Link
            )
            .setURL(
              youtubeWatchUrl(
                videoId
              )
            )
        )
    ],

    allowedMentions: {
      parse: []
    }
  }).catch(
    () => {}
  );

  state.ended =
    true;

  await logBotData(
    `YT_ENDED|${videoId}`
  );
}

async function pollYouTube() {
  if (
    youtubePollRunning
  ) {
    return;
  }

  youtubePollRunning =
    true;

  try {
    const entries =
      await getYouTubeFeedEntries();

    if (
      !entries.length
    ) {
      return;
    }

    if (
      !youtubeInitialized
    ) {
      for (
        const entry of
        entries
      ) {
        const meta =
          await getYouTubeVideoMeta(
            entry.videoId
          );

        if (
          meta?.isLiveNow
        ) {
          const sent =
            await sendYouTubeAnnouncement(
              entry,
              meta,
              "live"
            );

          youtubeSeen.set(
            entry.videoId,
            {
              videoId:
                entry.videoId,

              type:
                "live",

              messageId:
                sent?.id ||
                null,

              channelId:
                sent?.channel?.id ||
                YOUTUBE_NOTIFY_CHANNEL_ID,

              ended:
                false
            }
          );

          await logBotData(
            `YT_SEEN|${entry.videoId}|live|${sent?.id || "-"}|${sent?.channel?.id || YOUTUBE_NOTIFY_CHANNEL_ID}`
          );

          continue;
        }

        if (
          meta?.isLiveContent &&
          !meta.endTimestamp
        ) {
          continue;
        }

        youtubeSeen.set(
          entry.videoId,
          {
            videoId:
              entry.videoId,

            type:
              "ignored",

            messageId:
              null,

            channelId:
              null,

            ended:
              true
          }
        );

        await logBotData(
          `YT_SEEN|${entry.videoId}|ignored|-|-`
        );
      }

      youtubeInitialized =
        true;

      await logBotData(
        "YT_INIT"
      );

      return;
    }

    const unseen =
      entries
        .filter(
          entry =>
            !youtubeSeen.has(
              entry.videoId
            )
        )
        .reverse();

    for (
      const entry of
      unseen
    ) {
      const meta =
        await getYouTubeVideoMeta(
          entry.videoId
        );

      if (
        meta.isLiveContent &&
        !meta.isLiveNow &&
        !meta.endTimestamp
      ) {
        continue;
      }

      if (
        meta.isLiveContent &&
        !meta.isLiveNow &&
        meta.endTimestamp
      ) {
        youtubeSeen.set(
          entry.videoId,
          {
            videoId:
              entry.videoId,

            type:
              "ignored",

            messageId:
              null,

            channelId:
              null,

            ended:
              true
          }
        );

        await logBotData(
          `YT_SEEN|${entry.videoId}|ignored|-|-`
        );

        continue;
      }

      const type =
        meta.isLiveNow
          ? "live"
          : meta.isShortsEligible
            ? "short"
            : "video";

      const sent =
        await sendYouTubeAnnouncement(
          entry,
          meta,
          type
        );

      if (!sent) {
        continue;
      }

      youtubeSeen.set(
        entry.videoId,
        {
          videoId:
            entry.videoId,

          type,

          messageId:
            sent.id,

          channelId:
            sent.channel.id,

          ended:
            type !== "live"
        }
      );

      await logBotData(
        `YT_SEEN|${entry.videoId}|${type}|${sent.id}|${sent.channel.id}`
      );
    }

    for (
      const [
        videoId,
        state
      ] of
      youtubeSeen.entries()
    ) {
      if (
        state.type !== "live" ||
        state.ended
      ) {
        continue;
      }

      const meta =
        await getYouTubeVideoMeta(
          videoId
        );

      if (
        !meta.isLiveNow &&
        meta.endTimestamp
      ) {
        await markYouTubeLiveEnded(
          videoId,
          state,
          meta
        );
      }
    }

  } catch (
    error
  ) {
    console.error(
      "❌ בדיקת YouTube נכשלה:",
      error.message
    );

  } finally {
    youtubePollRunning =
      false;
  }
}

// ===================== CLEAR =====================

async function deleteChannelMessages(
  channel,
  requestedAmount,
  protectedMessageIds = new Set()
) {
  let deleted = 0;

  let remaining =
    requestedAmount === 0
      ? Infinity
      : requestedAmount;

  let before =
    null;

  while (
    remaining > 0
  ) {
    const fetchLimit =
      remaining === Infinity
        ? 100
        : Math.min(
            100,
            remaining
          );

    const fetched =
      await channel.messages.fetch({
        limit:
          fetchLimit,

        ...(before
          ? {
              before
            }
          : {})
      });

    if (
      fetched.size === 0
    ) {
      break;
    }

    const now =
      Date.now();

    const fourteenDays =
      14 *
      24 *
      60 *
      60 *
      1000;

    const candidates =
      fetched.filter(
        message =>
          !protectedMessageIds.has(
            message.id
          )
      );

    const recent =
      candidates.filter(
        message =>
          now -
            message.createdTimestamp <
            fourteenDays -
              60_000
      );

    const old =
      candidates.filter(
        message =>
          !recent.has(
            message.id
          )
      );

    if (
      recent.size > 0
    ) {
      const removed =
        await channel
          .bulkDelete(
            recent,
            true
          )
          .catch(
            () => null
          );

      if (
        removed
      ) {
        deleted +=
          removed.size;

        if (
          remaining !== Infinity
        ) {
          remaining -=
            removed.size;
        }
      }
    }

    for (
      const message of
      old.values()
    ) {
      if (
        remaining <= 0
      ) {
        break;
      }

      try {
        await message.delete();

        deleted++;

        if (
          remaining !== Infinity
        ) {
          remaining--;
        }

        await new Promise(
          resolve =>
            setTimeout(
              resolve,
              400
            )
        );

      } catch {}
    }

    before =
      fetched.last()?.id;

    if (
      !before ||
      fetched.size <
        fetchLimit
    ) {
      break;
    }
  }

  return deleted;
}
// ===================== MAIN BOT COMMANDS =====================

const staffManageCommand =
  new SlashCommandBuilder()
    .setName("staffmanage")
    .setDescription("פתיחת פאנל ניהול הצוות");

const giveawayCommand =
  new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("פתיחת הגרלה חדשה")
    .addStringOption(
      option =>
        option
          .setName("prize")
          .setDescription("מה הפרס בהגרלה?")
          .setRequired(true)
          .setMaxLength(200)
    )
    .addStringOption(
      option =>
        option
          .setName("duration")
          .setDescription("זמן: למשל 30s, 10m, 2h, 1d")
          .setRequired(true)
          .setMaxLength(20)
    )
    .addIntegerOption(
      option =>
        option
          .setName("winners")
          .setDescription("כמה זוכים? ברירת מחדל: 1")
          .setRequired(false)
          .setMinValue(1)
          .setMaxValue(10)
    );

const clearCommand =
  new SlashCommandBuilder()
    .setName("clear")
    .setDescription("מחיקת הודעות מהחדר")
    .addIntegerOption(
      option =>
        option
          .setName("amount")
          .setDescription("כמה הודעות למחוק? 0 = כל ההודעות בחדר")
          .setRequired(true)
          .setMinValue(0)
    );

// ===================== MAIN READY =====================

client.once(
  "ready",
  async () => {
    console.log(
      `✅ הבוט הראשי מחובר בתור ${client.user.tag}`
    );

    try {
      const rest =
        new REST({
          version: "10"
        }).setToken(
          TOKEN
        );

      await rest.put(
        Routes.applicationGuildCommands(
          CLIENT_ID,
          GUILD_ID
        ),
        {
          body: [
            staffManageCommand.toJSON(),
            giveawayCommand.toJSON(),
            clearCommand.toJSON()
          ]
        }
      );

      console.log(
        "✅ פקודות הבוט הראשי נרשמו"
      );

    } catch (error) {
      console.error(
        "❌ שגיאה ברישום פקודות הבוט הראשי:",
        error
      );
    }

    try {
      const guild =
        await client.guilds.fetch(
          GUILD_ID
        );

      await ensureBotDataChannel(
        guild
      );

      await loadPersistentBotData();

    } catch (error) {
      console.error(
        "❌ שגיאה בחדר הנתונים:",
        error
      );
    }

    await loadApplicationState()
      .catch(
        error =>
          console.error(
            "❌ טעינת בקשות צוות:",
            error
          )
      );

    try {
      const guild =
        await client.guilds.fetch(
          GUILD_ID
        );

      const members =
        await guild.members.fetch();

      for (
        const member of
        members.values()
      ) {
        if (
          member.user.bot
        ) {
          continue;
        }

        const currentName =
          member.nickname ||
          member.user.globalName ||
          member.user.username;

        if (
          getDesiredPrefix(
            member
          )
        ) {
          await applyPreferredNickname(
            member
          );

        } else if (
          hasAnyPrefix(
            currentName
          )
        ) {
          await handleUnauthorizedPrefix(
            member,
            currentName
          );
        }
      }

    } catch (error) {
      console.error(
        "❌ סנכרון ניקניים נכשל:",
        error.message
      );
    }

    await setupTicketPanel()
      .catch(
        console.error
      );

    await setupSuggestionsPanel()
      .catch(
        console.error
      );

    await setupSocialsPanel()
      .catch(
        console.error
      );

    await setupPartnerPanel()
      .catch(
        console.error
      );

    await setupTempVoicePanel()
      .catch(
        console.error
      );

    await setupArcadePanel()
      .catch(
        console.error
      );

    try {
      const guild =
        await client.guilds.fetch(
          GUILD_ID
        );

      await restoreTempVoiceRooms(
        guild
      );

    } catch (error) {
      console.error(
        "❌ שחזור חדרים אישיים נכשל:",
        error
      );
    }

    await pollYouTube();

    setInterval(
      () =>
        pollYouTube()
          .catch(
            () => {}
          ),
      YOUTUBE_CHECK_INTERVAL_MS
    );
  }
);

// ===================== VOICE EVENTS =====================

client.on(
  "voiceStateUpdate",
  async (
    oldState,
    newState
  ) => {
    try {
      if (
        newState.member
          ?.user
          .bot
      ) {
        return;
      }

      if (
        newState.channelId ===
          TEMP_VOICE_CREATE_CHANNEL_ID &&
        oldState.channelId !==
          TEMP_VOICE_CREATE_CHANNEL_ID
      ) {
        await createTempVoiceRoom(
          newState.member
        );
      }

      if (
        oldState.channelId &&
        oldState.channelId !==
          newState.channelId &&
        tempVoiceOwners.has(
          oldState.channelId
        )
      ) {
        const oldChannel =
          oldState.guild
            .channels
            .cache
            .get(
              oldState.channelId
            );

        if (
          oldChannel?.type ===
            ChannelType.GuildVoice &&
          oldChannel.members.size ===
            0
        ) {
          await deleteTempVoiceRoom(
            oldChannel,
            "החדר האישי התרוקן"
          );
        }
      }

    } catch (error) {
      console.error(
        "❌ voiceStateUpdate:",
        error
      );
    }
  }
);

client.on(
  "channelDelete",
  async channel => {
    if (
      !tempVoiceOwners.has(
        channel.id
      )
    ) {
      return;
    }

    tempVoiceOwners.delete(
      channel.id
    );

    await logBotData(
      `TEMP_DELETE|${channel.id}`
    ).catch(
      () => {}
    );
  }
);

// ===================== MEMBER EVENTS =====================

client.on(
  "guildMemberAdd",
  async member => {
    if (
      member.user.bot
    ) {
      return;
    }

    await sendWelcomeMessage(
      member
    );

    const name =
      member.nickname ||
      member.user.globalName ||
      member.user.username;

    if (
      getDesiredPrefix(
        member
      )
    ) {
      await applyPreferredNickname(
        member
      );

    } else if (
      hasAnyPrefix(
        name
      )
    ) {
      await handleUnauthorizedPrefix(
        member,
        name
      );
    }
  }
);

client.on(
  "guildMemberUpdate",
  async (
    oldMember,
    newMember
  ) => {
    if (
      newMember.user.bot
    ) {
      return;
    }

    try {
      const oldStaff =
        getHighestLadderRoleId(
          oldMember
        );

      const newStaff =
        getHighestLadderRoleId(
          newMember
        );

      const oldPartner =
        oldMember.roles.cache.has(
          PARTNER_ROLE_ID
        );

      const newPartner =
        newMember.roles.cache.has(
          PARTNER_ROLE_ID
        );

      const staffChanged =
        oldStaff !==
        newStaff;

      const partnerChanged =
        oldPartner !==
        newPartner;

      const nicknameChanged =
        oldMember.nickname !==
        newMember.nickname;

      if (
        staffChanged ||
        partnerChanged
      ) {
        await applyPreferredNickname(
          newMember
        );

        if (
          staffChanged
        ) {
          await sendStaffChangeDM(
            newMember,
            oldStaff,
            newStaff
          );
        }

        return;
      }

      if (
        !nicknameChanged
      ) {
        return;
      }

      const currentName =
        newMember.nickname ||
        newMember.user.globalName ||
        newMember.user.username;

      if (
        newStaff
      ) {
        const punished =
          await handleFakePromotion(
            newMember,
            currentName
          );

        if (
          !punished
        ) {
          await applyPreferredNickname(
            newMember
          );
        }

        return;
      }

      if (
        newPartner
      ) {
        await applyPreferredNickname(
          newMember
        );

        return;
      }

      if (
        hasAnyPrefix(
          currentName
        )
      ) {
        await handleUnauthorizedPrefix(
          newMember,
          currentName
        );
      }

    } catch (error) {
      console.error(
        "❌ guildMemberUpdate:",
        error
      );
    }
  }
);

// ===================== INTERACTIONS =====================

client.on(
  "interactionCreate",
  async interaction => {
    try {

      // ===================== /CLEAR =====================

      if (
        interaction.isChatInputCommand() &&
        interaction.commandName === "clear"
      ) {
        const member =
          await fetchFreshMember(
            interaction.guild,
            interaction.user.id
          )
            .catch(
              () => null
            );

        if (
          !member ||
          !hasClearAccess(
            member
          )
        ) {
          return interaction.reply({
            content:
              "❌ רק **Team ומעלה** יכולים להשתמש בפקודה הזאת.",

            ephemeral:
              true
          });
        }

        if (
          !interaction.channel?.isTextBased()
        ) {
          return interaction.reply({
            content:
              "❌ אי אפשר למחוק הודעות בחדר הזה.",

            ephemeral:
              true
          });
        }

        const amount =
          interaction.options
            .getInteger(
              "amount",
              true
            );

        await interaction.deferReply();

        const replyMessage =
          await interaction
            .fetchReply()
            .catch(
              () => null
            );

        const protectedIds =
          new Set();

        if (
          replyMessage?.id
        ) {
          protectedIds.add(
            replyMessage.id
          );
        }

        try {
          const deleted =
            await deleteChannelMessages(
              interaction.channel,
              amount,
              protectedIds
            );

          await interaction.editReply({
            content:
              null,

            embeds: [
              new EmbedBuilder()
                .setColor(
                  0x800020
                )
                .setTitle(
                  "🧹 ניקוי הודעות"
                )
                .setDescription(
                  amount === 0
                    ? `✅ נמחקו **${deleted} הודעות** מהחדר.`
                    : `✅ נמחקו **${deleted} מתוך ${amount} הודעות**.`
                )
                .setFooter({
                  text:
                    "ההודעה הזאת תימחק בעוד 10 שניות"
                })
                .setTimestamp()
            ]
          });

          setTimeout(
            () => {
              interaction
                .deleteReply()
                .catch(
                  () => {}
                );
            },
            10_000
          );

        } catch (error) {
          console.error(
            "❌ /clear:",
            error
          );

          await interaction.editReply({
            content:
              null,

            embeds: [
              new EmbedBuilder()
                .setColor(
                  0x800020
                )
                .setTitle(
                  "❌ מחיקת ההודעות נכשלה"
                )
                .setDescription(
                  "בדוק שלבוט יש הרשאת **Manage Messages** בחדר."
                )
            ]
          });

          setTimeout(
            () => {
              interaction
                .deleteReply()
                .catch(
                  () => {}
                );
            },
            10_000
          );
        }

        return;
      }

      // ===================== TEMP VOICE BUTTONS =====================

      if (
        interaction.isButton() &&
        [
          "temp_lock",
          "temp_unlock",
          "temp_hide",
          "temp_show",
          "temp_limit",
          "temp_rename",
          "temp_invite",
          "temp_permit",
          "temp_reject",
          "temp_kick",
          "temp_transfer",
          "temp_delete"
        ].includes(
          interaction.customId
        )
      ) {
        return handleTempVoiceButton(
          interaction
        );
      }

      if (
        interaction.isUserSelectMenu() &&
        interaction.customId.startsWith(
          "temp_"
        ) &&
        interaction.customId.includes(
          "_select:"
        )
      ) {
        return handleTempVoiceUserSelect(
          interaction
        );
      }

      if (
        interaction.isModalSubmit() &&
        interaction.customId.startsWith(
          "temp_rename_modal:"
        )
      ) {
        const channelId =
          interaction.customId
            .split(":")[1];

        const room =
          await getControlledTempRoom(
            interaction,
            channelId
          );

        if (!room) {
          return interaction.reply({
            content:
              "❌ החדר כבר לא קיים, או שאינך הבעלים שלו.",

            ephemeral:
              true
          });
        }

        const name =
          interaction.fields
            .getTextInputValue(
              "room_name"
            )
            .replace(
              /[\r\n]/g,
              " "
            )
            .trim()
            .slice(
              0,
              100
            );

        if (!name) {
          return interaction.reply({
            content:
              "❌ צריך לכתוב שם לחדר.",

            ephemeral:
              true
          });
        }

        await room.setName(
          name,
          `שינוי שם על ידי ${interaction.user.tag}`
        );

        return interaction.reply({
          content:
            `✏️ שם החדר שונה ל-**${name}**.`,

          ephemeral:
            true
        });
      }

      if (
        interaction.isModalSubmit() &&
        interaction.customId.startsWith(
          "temp_limit_modal:"
        )
      ) {
        const channelId =
          interaction.customId
            .split(":")[1];

        const room =
          await getControlledTempRoom(
            interaction,
            channelId
          );

        if (!room) {
          return interaction.reply({
            content:
              "❌ החדר כבר לא קיים, או שאינך הבעלים שלו.",

            ephemeral:
              true
          });
        }

        const raw =
          interaction.fields
            .getTextInputValue(
              "room_limit"
            )
            .trim();

        const limit =
          Number(
            raw
          );

        if (
          !/^\d{1,2}$/.test(
            raw
          ) ||
          !Number.isInteger(
            limit
          ) ||
          limit < 0 ||
          limit > 99
        ) {
          return interaction.reply({
            content:
              "❌ צריך לכתוב מספר בין **0 ל-99**. 0 = בלי הגבלה.",

            ephemeral:
              true
          });
        }

        await room.setUserLimit(
          limit,
          `שינוי הגבלה על ידי ${interaction.user.tag}`
        );

        return interaction.reply({
          content:
            limit === 0
              ? "👥 הוסרה הגבלת המשתמשים מהחדר."
              : `👥 החדר הוגבל ל-**${limit}** משתמשים.`,

          ephemeral:
            true
        });
      }

      // ===================== OWNER NICKNAME EDIT =====================

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "nickname_edit:"
        )
      ) {
        if (
          interaction.user.id !==
          OWNER_USER_ID
        ) {
          return interaction.reply({
            content:
              "❌ אין לך הרשאה.",

            ephemeral:
              true
          });
        }

        const [
          ,
          guildId,
          memberId
        ] =
          interaction.customId
            .split(":");

        return interaction.showModal(
          new ModalBuilder()
            .setCustomId(
              `nickname_modal:${guildId}:${memberId}`
            )
            .setTitle(
              "שינוי ניקניים"
            )
            .addComponents(
              new ActionRowBuilder()
                .addComponents(
                  new TextInputBuilder()
                    .setCustomId(
                      "new_nickname"
                    )
                    .setLabel(
                      "איזה ניקניים לשים?"
                    )
                    .setPlaceholder(
                      "לדוגמה: Roei"
                    )
                    .setStyle(
                      TextInputStyle.Short
                    )
                    .setMaxLength(
                      32
                    )
                    .setRequired(
                      true
                    )
                )
            )
        );
      }

      if (
        interaction.isModalSubmit() &&
        interaction.customId.startsWith(
          "nickname_modal:"
        )
      ) {
        if (
          interaction.user.id !==
          OWNER_USER_ID
        ) {
          return interaction.reply({
            content:
              "❌ אין לך הרשאה.",

            ephemeral:
              true
          });
        }

        const [
          ,
          guildId,
          memberId
        ] =
          interaction.customId
            .split(":");

        const nickname =
          interaction.fields
            .getTextInputValue(
              "new_nickname"
            )
            .trim()
            .slice(
              0,
              32
            );

        const guild =
          await client.guilds
            .fetch(
              guildId
            )
            .catch(
              () => null
            );

        const member =
          guild
            ? await fetchFreshMember(
                guild,
                memberId
              )
                .catch(
                  () => null
                )
            : null;

        if (
          !member?.manageable
        ) {
          return interaction.reply({
            content:
              "❌ לא הצלחתי לשנות את הניקניים.",

            ephemeral:
              true
          });
        }

        await member
          .setNickname(
            nickname,
            "שינוי ידני על ידי הבעלים"
          )
          .catch(
            () => {}
          );

        return interaction.reply({
          content:
            `✅ הניקניים שונה ל-\`${nickname}\`.`,

          ephemeral:
            true
        });
      }

      // ===================== GIVEAWAY =====================

      if (
        interaction.isChatInputCommand() &&
        interaction.commandName ===
          "giveaway"
      ) {
        const member =
          await fetchFreshMember(
            interaction.guild,
            interaction.user.id
          )
            .catch(
              () => null
            );

        if (
          !member ||
          !hasStaffAccess(
            member
          )
        ) {
          return interaction.reply({
            content:
              "❌ אין לך גישה לפתוח הגרלה.",

            ephemeral:
              true
          });
        }

        const prize =
          interaction.options
            .getString(
              "prize",
              true
            )
            .trim();

        const durationMs =
          parseGiveawayDuration(
            interaction.options
              .getString(
                "duration",
                true
              )
          );

        const winnerCount =
          interaction.options
            .getInteger(
              "winners"
            ) ||
          1;

        if (
          !durationMs
        ) {
          return interaction.reply({
            content:
              "❌ זמן לא תקין.\n" +
              "דוגמאות: `30s`, `10m`, `2h`, `1d`.\n" +
              "מינימום 10 שניות, מקסימום 30 יום.",

            ephemeral:
              true
          });
        }

        await interaction.deferReply({
          ephemeral:
            true
        });

        const giveaway = {
          messageId:
            null,

          channelId:
            interaction.channel.id,

          guildId:
            interaction.guild.id,

          hostId:
            interaction.user.id,

          prize,

          winnerCount,

          endsAt:
            Date.now() +
            durationMs,

          participants:
            new Set(),

          guildIcon:
            interaction.guild.iconURL({
              size:
                256
            }),

          ended:
            false,

          timer:
            null
        };

        try {
          const message =
            await interaction.channel.send({
              embeds: [
                createGiveawayEmbed(
                  giveaway
                )
              ],

              components: [
                createGiveawayButtons()
              ]
            });

          giveaway.messageId =
            message.id;

          activeGiveaways.set(
            message.id,
            giveaway
          );

          scheduleGiveaway(
            giveaway
          );

          return interaction.editReply(
            `✅ ההגרלה נפתחה: ${message.url}`
          );

        } catch (
          error
        ) {
          console.error(
            "❌ Giveaway create:",
            error
          );

          return interaction.editReply(
            "❌ הייתה בעיה בפתיחת ההגרלה."
          );
        }
      }

      if (
        interaction.isButton() &&
        interaction.customId ===
          "giveaway_join"
      ) {
        const giveaway =
          activeGiveaways.get(
            interaction.message.id
          );

        if (!giveaway) {
          return interaction.reply({
            content:
              "❌ ההגרלה הזאת כבר לא פעילה.",

            ephemeral:
              true
          });
        }

        if (
          giveaway.ended ||
          Date.now() >=
            giveaway.endsAt
        ) {
          await endGiveaway(
            giveaway
          );

          return interaction.reply({
            content:
              "❌ ההגרלה כבר הסתיימה.",

            ephemeral:
              true
          });
        }

        await interaction.deferReply({
          ephemeral:
            true
        });

        let joined;

        if (
          giveaway.participants.has(
            interaction.user.id
          )
        ) {
          giveaway.participants.delete(
            interaction.user.id
          );

          joined =
            false;

        } else {
          giveaway.participants.add(
            interaction.user.id
          );

          joined =
            true;
        }

        await interaction.message.edit({
          embeds: [
            createGiveawayEmbed(
              giveaway
            )
          ],

          components: [
            createGiveawayButtons()
          ]
        }).catch(
          () => {}
        );

        return interaction.editReply(
          joined
            ? "✅ נכנסת להגרלה! בהצלחה 🎉"
            : "↩️ יצאת מההגרלה."
        );
      }

      if (
        interaction.isButton() &&
        interaction.customId ===
          "giveaway_end"
      ) {
        const member =
          await fetchFreshMember(
            interaction.guild,
            interaction.user.id
          )
            .catch(
              () => null
            );

        if (
          !member ||
          !hasStaffAccess(
            member
          )
        ) {
          return interaction.reply({
            content:
              "❌ אין לך גישה לסגור הגרלה.",

            ephemeral:
              true
          });
        }

        const giveaway =
          activeGiveaways.get(
            interaction.message.id
          );

        if (
          !giveaway ||
          giveaway.ended
        ) {
          return interaction.reply({
            content:
              "ℹ️ ההגרלה כבר לא פעילה.",

            ephemeral:
              true
          });
        }

        await interaction.deferReply({
          ephemeral:
            true
        });

        await endGiveaway(
          giveaway,
          interaction.user
        );

        return interaction.editReply(
          "✅ ההגרלה נסגרה והזוכה נבחר."
        );
      }

      // ===================== STAFF MANAGE =====================

      if (
        interaction.isChatInputCommand() &&
        interaction.commandName ===
          "staffmanage"
      ) {
        if (
          interaction.user.id !==
          OWNER_USER_ID
        ) {
          return interaction.reply({
            content:
              "❌ אין לך גישה לפאנל הזה.",

            ephemeral:
              true
          });
        }

        return interaction.reply({
          content:
            "🛡️ **ניהול צוות**\nבחר משתמש:",

          components: [
            new ActionRowBuilder()
              .addComponents(
                new UserSelectMenuBuilder()
                  .setCustomId(
                    "manage_select_user"
                  )
                  .setPlaceholder(
                    "בחר משתמש לניהול"
                  )
                  .setMinValues(
                    1
                  )
                  .setMaxValues(
                    1
                  )
              )
          ],

          ephemeral:
            true
        });
      }

      if (
        interaction.isUserSelectMenu() &&
        interaction.customId ===
          "manage_select_user"
      ) {
        if (
          interaction.user.id !==
          OWNER_USER_ID
        ) {
          return interaction.reply({
            content:
              "❌ אין לך גישה לפאנל הזה.",

            ephemeral:
              true
          });
        }

        const member =
          await fetchFreshMember(
            interaction.guild,
            interaction.values[0]
          )
            .catch(
              () => null
            );

        if (!member) {
          return interaction.update({
            content:
              "❌ לא מצאתי את המשתמש.",

            embeds: [],

            components: []
          });
        }

        return interaction.update({
          content:
            "",

          embeds: [
            await buildManagementEmbed(
              interaction.guild,
              member
            )
          ],

          components:
            createManagementButtons(
              member
            )
        });
      }

      // ===================== MANAGE ADD =====================

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "manage_add:"
        )
      ) {
        if (
          interaction.user.id !==
          OWNER_USER_ID
        ) {
          return interaction.reply({
            content:
              "❌ אין לך גישה.",

            ephemeral:
              true
          });
        }

        const targetId =
          interaction.customId
            .split(":")[1];

        const member =
          await fetchFreshMember(
            interaction.guild,
            targetId
          )
            .catch(
              () => null
            );

        if (!member) {
          return interaction.update({
            content:
              "❌ המשתמש לא נמצא.",

            embeds: [],

            components: []
          });
        }

        if (
          getHighestLadderRoleId(
            member
          )
        ) {
          await interaction.deferUpdate();

          return refreshManagementPanel(
            interaction,
            targetId,
            "ℹ️ המשתמש כבר בצוות."
          );
        }

        return interaction.update({
          content:
            "➕ **באיזו דרגה להוסיף?**",

          embeds: [
            await buildManagementEmbed(
              interaction.guild,
              member
            )
          ],

          components: [
            await createRoleChoiceRow(
              interaction.guild,
              targetId,
              [
                ROLE_HELPER,
                ROLE_STAFF,
                ROLE_TEAM
              ],
              "manage_add_to",
              {
                [ROLE_HELPER]:
                  "Helper",

                [ROLE_STAFF]:
                  "Stuff",

                [ROLE_TEAM]:
                  "Team"
              }
            )
          ]
        });
      }

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "manage_add_to:"
        )
      ) {
        if (
          interaction.user.id !==
          OWNER_USER_ID
        ) {
          return interaction.reply({
            content:
              "❌ אין לך גישה.",

            ephemeral:
              true
          });
        }

        const [
          ,
          targetId,
          targetRoleId
        ] =
          interaction.customId
            .split(":");

        await interaction.deferUpdate();

        const member =
          await fetchFreshMember(
            interaction.guild,
            targetId
          )
            .catch(
              () => null
            );

        if (!member) {
          return interaction.editReply({
            content:
              "❌ המשתמש לא נמצא.",

            embeds: [],

            components: []
          });
        }

        if (
          getHighestLadderRoleId(
            member
          )
        ) {
          return refreshManagementPanel(
            interaction,
            targetId,
            "ℹ️ המשתמש כבר בצוות."
          );
        }

        if (
          ![
            ROLE_HELPER,
            ROLE_STAFF,
            ROLE_TEAM
          ].includes(
            targetRoleId
          )
        ) {
          return refreshManagementPanel(
            interaction,
            targetId,
            "❌ דרגה לא תקינה."
          );
        }

        await member.roles.add(
          targetRoleId
        );

        const fresh =
          await fetchFreshMember(
            interaction.guild,
            targetId
          );

        await applyPreferredNickname(
          fresh
        );

        await sendStaffLog({
          guild:
            interaction.guild,

          targetMember:
            fresh,

          actorUser:
            interaction.user,

          title:
            "➕ הוספה ידנית לצוות",

          fromRoleId:
            null,

          toRoleId:
            targetRoleId
        });

        return refreshManagementPanel(
          interaction,
          targetId,
          `✅ נוסף לצוות בתור **${await getRoleName(
            interaction.guild,
            targetRoleId
          )}**.`
        );
      }

      // ===================== MANAGE PROMOTE =====================

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "manage_promote:"
        )
      ) {
        if (
          interaction.user.id !==
          OWNER_USER_ID
        ) {
          return interaction.reply({
            content:
              "❌ אין לך גישה.",

            ephemeral:
              true
          });
        }

        const targetId =
          interaction.customId
            .split(":")[1];

        const member =
          await fetchFreshMember(
            interaction.guild,
            targetId
          )
            .catch(
              () => null
            );

        if (!member) {
          return interaction.update({
            content:
              "❌ המשתמש לא נמצא.",

            embeds: [],

            components: []
          });
        }

        const roleId =
          getHighestLadderRoleId(
            member
          );

        const targets =
          getPromotionTargets(
            roleId
          );

        if (
          !targets.length
        ) {
          await interaction.deferUpdate();

          return refreshManagementPanel(
            interaction,
            targetId,
            "🏆 אין קידום נוסף."
          );
        }

        return interaction.update({
          content:
            "⬆️ **לאיזו דרגה לקדם?**",

          embeds: [
            await buildManagementEmbed(
              interaction.guild,
              member
            )
          ],

          components: [
            await createRoleChoiceRow(
              interaction.guild,
              targetId,
              targets,
              "manage_promote_to",
              getPromotionLabels(
                roleId
              )
            )
          ]
        });
      }

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "manage_promote_to:"
        )
      ) {
        if (
          interaction.user.id !==
          OWNER_USER_ID
        ) {
          return interaction.reply({
            content:
              "❌ אין לך גישה.",

            ephemeral:
              true
          });
        }

        const [
          ,
          targetId,
          targetRoleId
        ] =
          interaction.customId
            .split(":");

        await interaction.deferUpdate();

        const member =
          await fetchFreshMember(
            interaction.guild,
            targetId
          )
            .catch(
              () => null
            );

        if (!member) {
          return interaction.editReply({
            content:
              "❌ המשתמש לא נמצא.",

            embeds: [],

            components: []
          });
        }

        const beforeRoleId =
          getHighestLadderRoleId(
            member
          );

        if (
          !getPromotionTargets(
            beforeRoleId
          ).includes(
            targetRoleId
          )
        ) {
          return refreshManagementPanel(
            interaction,
            targetId,
            "❌ הקידום כבר לא מתאים."
          );
        }

        await member.roles.add(
          targetRoleId
        );

        const fresh =
          await fetchFreshMember(
            interaction.guild,
            targetId
          );

        await applyPreferredNickname(
          fresh
        );

        await sendStaffLog({
          guild:
            interaction.guild,

          targetMember:
            fresh,

          actorUser:
            interaction.user,

          title:
            "⬆️ קידום צוות ידני",

          fromRoleId:
            beforeRoleId,

          toRoleId:
            targetRoleId
        });

        return refreshManagementPanel(
          interaction,
          targetId,
          `✅ קודם/ה ל-**${await getRoleName(
            interaction.guild,
            targetRoleId
          )}**.`
        );
      }

      // ===================== MANAGE DEMOTE =====================

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "manage_demote:"
        )
      ) {
        if (
          interaction.user.id !==
          OWNER_USER_ID
        ) {
          return interaction.reply({
            content:
              "❌ אין לך גישה.",

            ephemeral:
              true
          });
        }

        const targetId =
          interaction.customId
            .split(":")[1];

        await interaction.deferUpdate();

        const member =
          await fetchFreshMember(
            interaction.guild,
            targetId
          )
            .catch(
              () => null
            );

        if (!member) {
          return interaction.editReply({
            content:
              "❌ המשתמש לא נמצא.",

            embeds: [],

            components: []
          });
        }

        const currentRoleId =
          getHighestLadderRoleId(
            member
          );

        if (!currentRoleId) {
          return refreshManagementPanel(
            interaction,
            targetId,
            "❌ המשתמש לא בצוות."
          );
        }

        const currentIndex =
          LADDER_ROLE_IDS.indexOf(
            currentRoleId
          );

        if (
          currentIndex <= 0
        ) {
          return refreshManagementPanel(
            interaction,
            targetId,
            "ℹ️ Helper היא הדרגה הנמוכה ביותר. כדי להוציא מהצוות השתמש ב-**הורדה מהצוות**."
          );
        }

        const previousRoleId =
          LADDER_ROLE_IDS[
            currentIndex - 1
          ];

        await member.roles.add(
          previousRoleId
        );

        await member.roles.remove(
          currentRoleId
        );

        const fresh =
          await fetchFreshMember(
            interaction.guild,
            targetId
          );

        await applyPreferredNickname(
          fresh
        );

        await sendStaffLog({
          guild:
            interaction.guild,

          targetMember:
            fresh,

          actorUser:
            interaction.user,

          title:
            "⬇️ הורדת דרגה",

          fromRoleId:
            currentRoleId,

          toRoleId:
            previousRoleId
        });

        return refreshManagementPanel(
          interaction,
          targetId,
          `✅ הורד/ה ל-**${await getRoleName(
            interaction.guild,
            previousRoleId
          )}**.`
        );
      }

      // ===================== MANAGE REMOVE =====================

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "manage_remove:"
        )
      ) {
        if (
          interaction.user.id !==
          OWNER_USER_ID
        ) {
          return interaction.reply({
            content:
              "❌ אין לך גישה.",

            ephemeral:
              true
          });
        }

        const targetId =
          interaction.customId
            .split(":")[1];

        await interaction.deferUpdate();

        const member =
          await fetchFreshMember(
            interaction.guild,
            targetId
          )
            .catch(
              () => null
            );

        if (!member) {
          return interaction.editReply({
            content:
              "❌ המשתמש לא נמצא.",

            embeds: [],

            components: []
          });
        }

        const beforeRoleId =
          getHighestLadderRoleId(
            member
          );

        const rolesToRemove =
          LADDER_ROLE_IDS.filter(
            roleId =>
              member.roles.cache.has(
                roleId
              )
          );

        if (
          !rolesToRemove.length
        ) {
          return refreshManagementPanel(
            interaction,
            targetId,
            "ℹ️ למשתמש אין רולי צוות."
          );
        }

        await member.roles.remove(
          rolesToRemove
        );

        const fresh =
          await fetchFreshMember(
            interaction.guild,
            targetId
          );

        await applyPreferredNickname(
          fresh
        );

        await sendStaffLog({
          guild:
            interaction.guild,

          targetMember:
            fresh,

          actorUser:
            interaction.user,

          title:
            "❌ הורדה מהצוות",

          fromRoleId:
            beforeRoleId,

          toRoleId:
            null
        });

        return refreshManagementPanel(
          interaction,
          targetId,
          "✅ המשתמש הוסר מהצוות."
        );
      }

      // ===================== PARTNER APPLY =====================

      if (
        interaction.isButton() &&
        interaction.customId ===
          "partner_apply"
      ) {
        if (
          partnerPendingByUser.has(
            interaction.user.id
          )
        ) {
          return interaction.reply({
            content:
              "⏳ כבר יש לך בקשת Partner שממתינה לטיפול.",

            ephemeral:
              true
          });
        }

        const expiry =
          getPartnerCooldownExpiry(
            interaction.user.id
          );

        if (
          expiry
        ) {
          return interaction.reply({
            content:
              `⏳ אפשר להגיש בקשה חדשה <t:${Math.floor(expiry / 1000)}:R>.`,

            ephemeral:
              true
          });
        }

        return interaction.showModal(
          createPartnerModal()
        );
      }

      if (
        interaction.isModalSubmit() &&
        interaction.customId ===
          "partner_modal"
      ) {
        if (
          partnerPendingByUser.has(
            interaction.user.id
          )
        ) {
          return interaction.reply({
            content:
              "⏳ כבר יש לך בקשת Partner שממתינה לטיפול.",

            ephemeral:
              true
          });
        }

        const inviteUrl =
          interaction.fields
            .getTextInputValue(
              "invite"
            )
            .trim();

        const promoText =
          interaction.fields
            .getTextInputValue(
              "promo_text"
            )
            .trim();

        const notes =
          interaction.fields
            .getTextInputValue(
              "notes"
            )
            .trim();

        if (
          !/^https?:\/\/(?:www\.)?(?:discord\.gg|discord\.com\/invite)\//i
            .test(
              inviteUrl
            )
        ) {
          return interaction.reply({
            content:
              "❌ צריך קישור הזמנה תקין של Discord.",

            ephemeral:
              true
          });
        }

        await interaction.deferReply({
          ephemeral:
            true
        });

        const requestId =
          `${interaction.user.id}-${Date.now()}`;

        const state = {
          requestId,

          applicantId:
            interaction.user.id,

          createdAt:
            Date.now(),

          inviteUrl,

          promoText,

          notes,

          status:
            "pending",

          handledAt:
            null,

          ownerDmChannelId:
            null,

          ownerDmMessageId:
            null
        };

        partnerStates.set(
          requestId,
          state
        );

        partnerPendingByUser.set(
          interaction.user.id,
          requestId
        );

        await logBotData(
          `PARTNER_CREATE|${requestId}|${interaction.user.id}|${state.createdAt}`
        );

        await savePartnerFields(
          state
        );

        const sent =
          await sendPartnerRequestToOwner(
            state
          );

        if (!sent) {
          partnerStates.delete(
            requestId
          );

          partnerPendingByUser.delete(
            interaction.user.id
          );

          return interaction.editReply(
            "❌ לא הצלחתי לשלוח את הבקשה לבעלים."
          );
        }

        return interaction.editReply(
          "✅ בקשת ה-Partner נשלחה לבדיקה!"
        );
      }

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "partner_approve:"
        )
      ) {
        if (
          interaction.user.id !==
          OWNER_USER_ID
        ) {
          return interaction.reply({
            content:
              "❌ רק הבעלים יכול לטפל בבקשה הזאת."
          });
        }

        const requestId =
          interaction.customId
            .split(":")[1];

        const state =
          partnerStates.get(
            requestId
          );

        if (!state) {
          return interaction.reply({
            content:
              "❌ לא מצאתי את הבקשה."
          });
        }

        return interaction.reply({
          content:
            "✅ **האם הוא כבר פרסם את השרת שלך?**",

          components: [
            createPartnerApprovalConfirmRow(
              requestId
            )
          ]
        });
      }

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "partner_confirm_no:"
        )
      ) {
        if (
          interaction.user.id !==
          OWNER_USER_ID
        ) {
          return interaction.reply({
            content:
              "❌ אין לך גישה."
          });
        }

        const requestId =
          interaction.customId
            .split(":")[1];

        const state =
          partnerStates.get(
            requestId
          );

        if (!state) {
          return interaction.reply({
            content:
              "❌ לא מצאתי את הבקשה."
          });
        }

        state.status =
          "waiting_publication";

        await logBotData(
          `PARTNER_STATUS|${requestId}|waiting_publication|0`
        );

        await updatePartnerOwnerMessage(
          state
        );

        return interaction.update({
          content:
            "⏳ הבקשה נשארה ממתינה. אחרי שהוא מפרסם, לחץ שוב על אישור.",

          components: []
        });
      }

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "partner_confirm_yes:"
        )
      ) {
        if (
          interaction.user.id !==
          OWNER_USER_ID
        ) {
          return interaction.reply({
            content:
              "❌ אין לך גישה."
          });
        }

        const requestId =
          interaction.customId
            .split(":")[1];

        const state =
          partnerStates.get(
            requestId
          );

        if (!state) {
          return interaction.reply({
            content:
              "❌ לא מצאתי את הבקשה."
          });
        }

        if (
          processingPartners.has(
            requestId
          )
        ) {
          return interaction.reply({
            content:
              "⏳ הבקשה כבר בטיפול."
          });
        }

        processingPartners.add(
          requestId
        );

        await interaction.deferUpdate();

        try {
          await finalizePartnerApproval(
            state
          );

          return interaction.editReply({
            content:
              "✅ ה-Partner אושר ופורסם.",

            components: []
          });

        } finally {
          processingPartners.delete(
            requestId
          );
        }
      }

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "partner_reject:"
        )
      ) {
        if (
          interaction.user.id !==
          OWNER_USER_ID
        ) {
          return interaction.reply({
            content:
              "❌ רק הבעלים יכול לדחות."
          });
        }

        const requestId =
          interaction.customId
            .split(":")[1];

        return interaction.showModal(
          createPartnerRejectModal(
            requestId
          )
        );
      }

      if (
        interaction.isModalSubmit() &&
        interaction.customId.startsWith(
          "partner_reject_modal:"
        )
      ) {
        if (
          interaction.user.id !==
          OWNER_USER_ID
        ) {
          return interaction.reply({
            content:
              "❌ אין לך גישה."
          });
        }

        const requestId =
          interaction.customId
            .split(":")[1];

        const state =
          partnerStates.get(
            requestId
          );

        if (!state) {
          return interaction.reply({
            content:
              "❌ הבקשה לא נמצאה."
          });
        }

        const reason =
          interaction.fields
            .getTextInputValue(
              "reason"
            )
            .trim();

        await interaction.deferReply();

        await rejectPartnerRequest(
          state,
          reason
        );

        return interaction.editReply(
          "❌ הבקשה נדחתה."
        );
      }

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "partner_edit:"
        )
      ) {
        if (
          interaction.user.id !==
          OWNER_USER_ID
        ) {
          return interaction.reply({
            content:
              "❌ אין לך גישה."
          });
        }

        const requestId =
          interaction.customId
            .split(":")[1];

        const state =
          partnerStates.get(
            requestId
          );

        if (!state) {
          return interaction.reply({
            content:
              "❌ הבקשה לא נמצאה."
          });
        }

        return interaction.showModal(
          createPartnerEditModal(
            state
          )
        );
      }

      if (
        interaction.isModalSubmit() &&
        interaction.customId.startsWith(
          "partner_edit_modal:"
        )
      ) {
        if (
          interaction.user.id !==
          OWNER_USER_ID
        ) {
          return interaction.reply({
            content:
              "❌ אין לך גישה."
          });
        }

        const requestId =
          interaction.customId
            .split(":")[1];

        const state =
          partnerStates.get(
            requestId
          );

        if (!state) {
          return interaction.reply({
            content:
              "❌ הבקשה לא נמצאה."
          });
        }

        state.promoText =
          interaction.fields
            .getTextInputValue(
              "promo_text"
            )
            .trim();

        await savePartnerField(
          requestId,
          "promoText",
          state.promoText
        );

        await updatePartnerOwnerMessage(
          state
        );

        return interaction.reply({
          content:
            "✅ הכיתוב עודכן."
        });
      }

      // ===================== SUGGESTIONS =====================

      if (
        interaction.isStringSelectMenu() &&
        interaction.customId ===
          "suggestion_type"
      ) {
        const type =
          interaction.values[0];

        await interaction.showModal(
          createSuggestionModal(
            type
          )
        );

        await interaction.message
          .edit({
            embeds: [
              createSuggestionsPanelEmbed()
            ],

            components: [
              createSuggestionsPanelMenu()
            ]
          })
          .catch(
            () => {}
          );

        return;
      }

      if (
        interaction.isModalSubmit() &&
        interaction.customId.startsWith(
          "suggestion_modal:"
        )
      ) {
        const type =
          interaction.customId
            .split(":")[1];

        const config =
          suggestionTypes[
            type
          ];

        if (!config) {
          return interaction.reply({
            content:
              "❌ סוג ההצעה לא נמצא.",

            ephemeral:
              true
          });
        }

        const idea =
          interaction.fields
            .getTextInputValue(
              "idea"
            )
            .trim();

        await interaction.deferReply({
          ephemeral:
            true
        });

        const destination =
          await client.channels
            .fetch(
              config.channelId
            )
            .catch(
              () => null
            );

        if (
          !destination?.isTextBased()
        ) {
          return interaction.editReply(
            "❌ חדר ההצעות לא נמצא."
          );
        }

        const state = {
          messageId:
            null,

          creatorId:
            interaction.user.id,

          type,

          channelId:
            config.channelId,

          votes:
            new Map(),

          thresholdNotified:
            false,

          forwardedBy:
            null,

          status:
            "open",

          statusBy:
            null
        };

        const message =
          await destination.send({
            embeds: [
              createSuggestionEmbed(
                type,
                interaction.user.id,
                idea,
                state
              )
            ],

            components: [
              createSuggestionButtons(
                state
              )
            ]
          });

        state.messageId =
          message.id;

        suggestionStates.set(
          message.id,
          state
        );

        await logBotData(
          `SUGG_CREATE|${message.id}|${interaction.user.id}|${type}|${config.channelId}`
        );

        return interaction.editReply(
          `✅ הרעיון נשלח! ${message.url}`
        );
      }

      if (
        interaction.isButton() &&
        (
          interaction.customId === "suggestion_vote_up" ||
          interaction.customId === "suggestion_vote_down"
        )
      ) {
        const state =
          hydrateSuggestion(
            interaction.message
          );

        if (
          !state ||
          state.status !== "open"
        ) {
          return interaction.reply({
            content:
              "❌ ההצעה לא פתוחה להצבעה.",

            ephemeral:
              true
          });
        }

        if (
          interaction.user.id ===
          state.creatorId
        ) {
          return interaction.reply({
            content:
              "❌ אי אפשר להצביע להצעה של עצמך.",

            ephemeral:
              true
          });
        }

        const choice =
          interaction.customId === "suggestion_vote_up"
            ? "up"
            : "down";

        const previous =
          state.votes.get(
            interaction.user.id
          );

        if (
          previous === choice
        ) {
          state.votes.delete(
            interaction.user.id
          );

          await logBotData(
            `SUGG_VOTE|${interaction.message.id}|${interaction.user.id}|none`
          );

        } else {
          state.votes.set(
            interaction.user.id,
            choice
          );

          await logBotData(
            `SUGG_VOTE|${interaction.message.id}|${interaction.user.id}|${choice}`
          );
        }

        await interaction.deferReply({
          ephemeral:
            true
        });

        await updateSuggestionMessage(
          interaction.message,
          state
        );

        const {
          up
        } =
          countSuggestionVotes(
            state
          );

        if (
          up >= 5 &&
          !state.thresholdNotified
        ) {
          state.thresholdNotified =
            true;

          await logBotData(
            `SUGG_THRESHOLD|${interaction.message.id}`
          );

          await sendSuggestionThresholdDM(
            interaction.message,
            state
          );
        }

        return interaction.editReply(
          previous === choice
            ? "↩️ ההצבעה בוטלה."
            : choice === "up"
              ? "👍 הצבעת בעד."
              : "👎 הצבעת נגד."
        );
      }

      if (
        interaction.isButton() &&
        interaction.customId ===
          "suggestion_staff_options"
      ) {
        const member =
          await fetchFreshMember(
            interaction.guild,
            interaction.user.id
          );

        if (
          !hasStaffAccess(
            member
          )
        ) {
          return interaction.reply({
            content:
              "❌ אין לך גישה.",

            ephemeral:
              true
          });
        }

        return interaction.reply({
          content:
            "🛡️ בחר פעולה:",

          components: [
            createSuggestionStaffRow(
              interaction.message.id,
              interaction.user.id ===
                OWNER_USER_ID
            )
          ],

          ephemeral:
            true
        });
      }

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "suggestion_forward:"
        )
      ) {
        const messageId =
          interaction.customId
            .split(":")[1];

        const state =
          suggestionStates.get(
            messageId
          );

        if (!state) {
          return interaction.reply({
            content:
              "❌ ההצעה לא נמצאה.",

            ephemeral:
              true
          });
        }

        const channel =
          await client.channels.fetch(
            state.channelId
          );

        const message =
          await channel.messages.fetch(
            messageId
          );

        const sent =
          await sendSuggestionForwardDM(
            message,
            state,
            interaction.user
          );

        if (!sent) {
          return interaction.reply({
            content:
              "❌ לא הצלחתי לשלוח לבעלים.",

            ephemeral:
              true
          });
        }

        state.forwardedBy =
          interaction.user.id;

        await logBotData(
          `SUGG_FORWARD|${messageId}|${interaction.user.id}`
        );

        await updateSuggestionMessage(
          message,
          state
        );

        return interaction.reply({
          content:
            "✅ נשלח לבעלים.",

          ephemeral:
            true
        });
      }

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "suggestion_close:"
        )
      ) {
        const messageId =
          interaction.customId
            .split(":")[1];

        const state =
          suggestionStates.get(
            messageId
          );

        if (!state) {
          return interaction.reply({
            content:
              "❌ ההצעה לא נמצאה.",

            ephemeral:
              true
          });
        }

        state.status =
          "closed";

        state.statusBy =
          interaction.user.id;

        await logBotData(
          `SUGG_STATUS|${messageId}|closed|${interaction.user.id}`
        );

        const channel =
          await client.channels.fetch(
            state.channelId
          );

        const message =
          await channel.messages.fetch(
            messageId
          );

        await updateSuggestionMessage(
          message,
          state
        );

        await sendSuggestionCreatorDM(
          state,
          false,
          interaction.user
        );

        return interaction.reply({
          content:
            "🔒 ההצעה נסגרה.",

          ephemeral:
            true
        });
      }

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "suggestion_approve:"
        )
      ) {
        if (
          interaction.user.id !==
          OWNER_USER_ID
        ) {
          return interaction.reply({
            content:
              "❌ רק הבעלים יכול לאשר.",

            ephemeral:
              true
          });
        }

        const messageId =
          interaction.customId
            .split(":")[1];

        const state =
          suggestionStates.get(
            messageId
          );

        if (!state) {
          return interaction.reply({
            content:
              "❌ ההצעה לא נמצאה.",

            ephemeral:
              true
          });
        }

        state.status =
          "approved";

        state.statusBy =
          interaction.user.id;

        await logBotData(
          `SUGG_STATUS|${messageId}|approved|${interaction.user.id}`
        );

        const channel =
          await client.channels.fetch(
            state.channelId
          );

        const message =
          await channel.messages.fetch(
            messageId
          );

        await updateSuggestionMessage(
          message,
          state
        );

        await sendSuggestionCreatorDM(
          state,
          true
        );

        return interaction.reply({
          content:
            "✅ ההצעה אושרה.",

          ephemeral:
            true
        });
      }

      // ===================== TICKET MENU =====================

      if (
        interaction.isStringSelectMenu() &&
        interaction.customId ===
          "ticket_type"
      ) {
        const type =
          interaction.values[0];

        if (
          type === "staff"
        ) {
          const member =
            await fetchFreshMember(
              interaction.guild,
              interaction.user.id
            );

          const roleId =
            getHighestLadderRoleId(
              member
            );

          if (
            roleId === ROLE_TOP
          ) {
            return interaction.reply({
              content:
                "🏆 כבר הגעת לדרגה הגבוהה ביותר.",

              ephemeral:
                true
            });
          }

          const appType =
            roleId
              ? "promotion"
              : "initial";

          if (
            pendingApplications.has(
              applicationKey(
                appType,
                interaction.user.id
              )
            )
          ) {
            return interaction.reply({
              content:
                "⏳ כבר יש לך בקשה שממתינה לטיפול.",

              ephemeral:
                true
            });
          }

          if (
            appType === "initial"
          ) {
            const expiry =
              getCooldownExpiry(
                interaction.user.id
              );

            if (
              expiry
            ) {
              return interaction.reply({
                content:
                  `⏳ ניתן להגיש שוב <t:${Math.floor(expiry / 1000)}:R>.`,

                ephemeral:
                  true
              });
            }
          }

          await interaction.showModal(
            createStaffApplicationModal(
              appType
            )
          );

          await interaction.message
            .edit({
              components: [
                createTicketMenu()
              ]
            })
            .catch(
              () => {}
            );

          return;
        }

        await interaction.deferReply({
          ephemeral:
            true
        });

        await interaction.guild
          .channels
          .fetch();

        const existing =
          interaction.guild
            .channels
            .cache
            .find(
              channel =>
                channel.topic
                  ?.includes(
                    `ticket-owner:${interaction.user.id}`
                  )
            );

        if (
          existing
        ) {
          return interaction.editReply(
            `❌ כבר יש לך טיקט פתוח: ${existing}`
          );
        }

        const ticketType =
          ticketTypes[
            type
          ];

        if (!ticketType) {
          return interaction.editReply(
            "❌ סוג הטיקט לא נמצא."
          );
        }

        let validCategoryId =
          null;

        if (
          CATEGORY_ID
        ) {
          const category =
            await interaction.guild
              .channels
              .fetch(
                CATEGORY_ID
              )
              .catch(
                () => null
              );

          if (
            category?.type ===
              ChannelType.GuildCategory
          ) {
            validCategoryId =
              category.id;
          }
        }

        const channelData = {
          name:
            `${ticketType.channelName}-${interaction.user.id.slice(-5)}`,

          type:
            ChannelType.GuildText,

          topic:
            `ticket-owner:${interaction.user.id}|type:${type}`,

          permissionOverwrites:
            createTicketPermissions(
              interaction.guild,
              interaction.user.id
            )
        };

        if (
          validCategoryId
        ) {
          channelData.parent =
            validCategoryId;
        }

        const channel =
          await interaction.guild
            .channels
            .create(
              channelData
            );

        await channel.send({
          content:
            `${interaction.user} ${getStaffMentions()}`,

          embeds: [
            createTicketEmbed(
              type,
              interaction.user
            )
          ],

          components: [
            createCloseTicketRow()
          ],

          allowedMentions: {
            users: [
              interaction.user.id
            ],

            roles:
              STAFF_ACCESS_ROLE_IDS
          }
        });

        return interaction.editReply(
          `✅ הטיקט נפתח: ${channel}`
        );
      }

      if (
        interaction.isButton() &&
        interaction.customId ===
          "close_ticket"
      ) {
        const member =
          await fetchFreshMember(
            interaction.guild,
            interaction.user.id
          );

        if (
          !hasStaffAccess(
            member
          )
        ) {
          return interaction.reply({
            content:
              "❌ רק צוות מורשה יכול לסגור טיקט.",

            ephemeral:
              true
          });
        }

        await interaction.reply(
          "🔒 הטיקט יימחק בעוד 3 שניות..."
        );

        setTimeout(
          () => {
            interaction.channel
              .delete()
              .catch(
                () => {}
              );
          },
          3000
        );

        return;
      }

      // ===================== STAFF APPLICATION SUBMIT =====================

      if (
        interaction.isModalSubmit() &&
        interaction.customId.startsWith(
          "staff_application_modal:"
        )
      ) {
        await interaction.deferReply({
          ephemeral:
            true
        });

        const type =
          interaction.customId
            .split(":")[1];

        const member =
          await fetchFreshMember(
            interaction.guild,
            interaction.user.id
          );

        const currentRoleId =
          getHighestLadderRoleId(
            member
          );

        const key =
          applicationKey(
            type,
            interaction.user.id
          );

        if (
          pendingApplications.has(
            key
          )
        ) {
          return interaction.editReply(
            "⏳ כבר קיימת בקשה שלך."
          );
        }

        const channel =
          await client.channels.fetch(
            STAFF_APPLICATION_CHANNEL_ID
          );

        const currentName =
          currentRoleId
            ? await getRoleName(
                interaction.guild,
                currentRoleId
              )
            : null;

        const embed =
          new EmbedBuilder()
            .setTitle(
              type === "promotion"
                ? "⬆️ בקשת קידום חדשה בצוות"
                : "🛡️ בקשה חדשה להצטרפות לצוות"
            )
            .setDescription(
              `${interaction.user} שלח/ה בקשה חדשה.`
            )
            .addFields(
              {
                name:
                  "👤 משתמש",

                value:
                  `${interaction.user}\n\`${interaction.user.id}\``
              },

              ...(
                type === "promotion"
                  ? [
                      {
                        name:
                          "🎖️ דרגה נוכחית",

                        value:
                          `${currentName}\n<@&${currentRoleId}>`
                      }
                    ]
                  : []
              ),

              {
                name:
                  "🎂 גיל",

                value:
                  interaction.fields
                    .getTextInputValue(
                      "age"
                    )
              },

              {
                name:
                  "⚠️ סיטואציה",

                value:
                  interaction.fields
                    .getTextInputValue(
                      "situation"
                    )
              },

              {
                name:
                  "📛 שם",

                value:
                  interaction.fields
                    .getTextInputValue(
                      "name"
                    )
              },

              {
                name:
                  "🛡️ ניסיון",

                value:
                  interaction.fields
                    .getTextInputValue(
                      "experience"
                    )
              },

              {
                name:
                  "📝 הערות",

                value:
                  interaction.fields
                    .getTextInputValue(
                      "notes"
                    ) ||
                  "לא נכתבו הערות"
              },

              {
                name:
                  "📋 סטטוס",

                value:
                  "⏳ **בבדיקה**"
              }
            )
            .setFooter({
              text:
                buildApplicationFooter(
                  interaction.user.id,
                  type,
                  "pending"
                )
            })
            .setTimestamp();

        await channel.send({
          content:
            getStaffMentions(),

          embeds: [
            embed
          ],

          components: [
            new ActionRowBuilder()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId(
                    `app_approve:${type}:${interaction.user.id}`
                  )
                  .setLabel(
                    "לאשר"
                  )
                  .setEmoji(
                    "✅"
                  )
                  .setStyle(
                    ButtonStyle.Success
                  ),

                new ButtonBuilder()
                  .setCustomId(
                    `app_reject:${type}:${interaction.user.id}`
                  )
                  .setLabel(
                    "לא לאשר"
                  )
                  .setEmoji(
                    "❌"
                  )
                  .setStyle(
                    ButtonStyle.Danger
                  )
              )
          ]
        });

        pendingApplications.add(
          key
        );

        await sendApplicantDM(
          interaction.user.id,
          type,
          "pending"
        );

        return interaction.editReply(
          "✅ הבקשה נשלחה."
        );
      }

      // ===================== STAFF APP APPROVE =====================

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "app_approve:"
        )
      ) {
        const [
          ,
          type,
          applicantId
        ] =
          interaction.customId
            .split(":");

        if (
          interaction.user.id ===
          applicantId
        ) {
          return interaction.reply({
            content:
              "❌ אי אפשר לטפל בבקשה של עצמך.",

            ephemeral:
              true
          });
        }

        const reviewer =
          await fetchFreshMember(
            interaction.guild,
            interaction.user.id
          );

        if (
          !hasStaffAccess(
            reviewer
          )
        ) {
          return interaction.reply({
            content:
              "❌ אין לך הרשאה.",

            ephemeral:
              true
          });
        }

        const applicant =
          await fetchFreshMember(
            interaction.guild,
            applicantId
          );

        const currentRoleId =
          getHighestLadderRoleId(
            applicant
          );

        let targets;
        let labels = {};

        if (
          type === "initial"
        ) {
          targets = [
            ROLE_HELPER
          ];

          labels = {
            [ROLE_HELPER]:
              "Helper"
          };

        } else {
          targets =
            getPromotionTargets(
              currentRoleId
            );

          labels =
            getPromotionLabels(
              currentRoleId
            );
        }

        if (
          !targets.length
        ) {
          return interaction.reply({
            content:
              "🏆 אין דרגה גבוהה יותר.",

            ephemeral:
              true
          });
        }

        const embed =
          EmbedBuilder.from(
            interaction.message
              .embeds[0]
          );

        setStatusField(
          embed,
          "✅ **אושר עקרונית — בחרו דרגה**"
        );

        embed.setFooter({
          text:
            buildApplicationFooter(
              applicantId,
              type,
              "awaiting_role"
            )
        });

        return interaction.update({
          embeds: [
            embed
          ],

          components: [
            await createRoleChoiceRow(
              interaction.guild,
              applicantId,
              targets,
              `app_assign:${type}`,
              labels
            )
          ]
        });
      }

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "app_reject:"
        )
      ) {
        const [
          ,
          type,
          applicantId
        ] =
          interaction.customId
            .split(":");

        const reviewer =
          await fetchFreshMember(
            interaction.guild,
            interaction.user.id
          );

        if (
          !hasStaffAccess(
            reviewer
          )
        ) {
          return interaction.reply({
            content:
              "❌ אין הרשאה.",

            ephemeral:
              true
          });
        }

        const rejectedAt =
          Date.now();

        if (
          type === "initial"
        ) {
          rejectionCooldowns.set(
            applicantId,
            rejectedAt +
              REJECT_COOLDOWN_MS
          );
        }

        pendingApplications.delete(
          applicationKey(
            type,
            applicantId
          )
        );

        await sendApplicantDM(
          applicantId,
          type,
          "rejected"
        );

        const embed =
          EmbedBuilder.from(
            interaction.message
              .embeds[0]
          );

        setStatusField(
          embed,
          `❌ **לא אושר**\nטופל על ידי ${interaction.user}`
        );

        embed.setFooter({
          text:
            buildApplicationFooter(
              applicantId,
              type,
              "rejected",
              rejectedAt
            )
        });

        return interaction.update({
          embeds: [
            embed
          ],

          components: [
            createHandledRow(
              reviewer.displayName
            )
          ]
        });
      }

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "app_assign:"
        )
      ) {
        const [
          ,
          type,
          applicantId,
          targetRoleId
        ] =
          interaction.customId
            .split(":");

        const reviewer =
          await fetchFreshMember(
            interaction.guild,
            interaction.user.id
          );

        if (
          !hasStaffAccess(
            reviewer
          )
        ) {
          return interaction.reply({
            content:
              "❌ אין הרשאה.",

            ephemeral:
              true
          });
        }

        await interaction.deferUpdate();

        const applicant =
          await fetchFreshMember(
            interaction.guild,
            applicantId
          );

        const beforeRoleId =
          getHighestLadderRoleId(
            applicant
          );

        if (
          type === "initial" &&
          targetRoleId !==
            ROLE_HELPER
        ) {
          return interaction.followUp({
            content:
              "❌ בקבלה ראשונה הדרגה היא Helper.",

            ephemeral:
              true
          });
        }

        await applicant.roles.add(
          targetRoleId
        );

        const fresh =
          await fetchFreshMember(
            interaction.guild,
            applicantId
          );

        await applyPreferredNickname(
          fresh
        );

        pendingApplications.delete(
          applicationKey(
            type,
            applicantId
          )
        );

        await sendStaffLog({
          guild:
            interaction.guild,

          targetMember:
            fresh,

          actorUser:
            interaction.user,

          title:
            type === "initial"
              ? "✅ צירוף חדש לצוות"
              : "⬆️ קידום צוות",

          fromRoleId:
            beforeRoleId,

          toRoleId:
            targetRoleId
        });

        const roleName =
          await getRoleName(
            interaction.guild,
            targetRoleId
          );

        const embed =
          EmbedBuilder.from(
            interaction.message
              .embeds[0]
          );

        setStatusField(
          embed,
          `✅ **אושר**\n🎖️ דרגה: **${roleName}**\nטופל על ידי ${interaction.user}`
        );

        embed.setFooter({
          text:
            buildApplicationFooter(
              applicantId,
              type,
              "approved"
            )
        });

        return interaction.editReply({
          embeds: [
            embed
          ],

          components: [
            createHandledRow(
              reviewer.displayName
            )
          ]
        });
      }

      // ===================== ARCADE SELECT =====================

      if (
        interaction.isStringSelectMenu() &&
        interaction.customId ===
          "arcade_game_select"
      ) {
        const gameType =
          interaction.values[0];

        const destination =
          await client.channels
            .fetch(
              ARCADE_GAMES_CHANNEL_ID
            )
            .catch(
              () => null
            );

        if (
          !destination?.isTextBased()
        ) {
          return interaction.reply({
            content:
              "❌ חדר המשחקים לא נמצא.",

            ephemeral:
              true
          });
        }

        if (
          gameType === "ttt" ||
          gameType === "rps"
        ) {
          return interaction.reply({
            content:
              "🎮 בחר את היריב:",

            components: [
              new ActionRowBuilder()
                .addComponents(
                  new UserSelectMenuBuilder()
                    .setCustomId(
                      `arcade_target_select:${gameType}`
                    )
                    .setPlaceholder(
                      "בחר שחקן..."
                    )
                    .setMinValues(
                      1
                    )
                    .setMaxValues(
                      1
                    )
                )
            ],

            ephemeral:
              true
          });
        }

        const gameId =
          crypto.randomBytes(
            5
          ).toString(
            "hex"
          );

        if (
          gameType === "impostor"
        ) {
          const game = {
            id:
              gameId,

            hostId:
              interaction.user.id,

            players:
              new Set([
                interaction.user.id
              ]),

            started:
              false,

            impostorId:
              null,

            word:
              null,

            messageId:
              null
          };

          const message =
            await destination.send({
              content:
                `🕵️ משחק חדש נפתח על ידי ${interaction.user}!`,

              embeds: [
                createImpostorLobbyEmbed(
                  game
                )
              ],

              components:
                createImpostorLobbyRows(
                  gameId
                )
            });

          game.messageId =
            message.id;

          arcadeImpostorGames.set(
            gameId,
            game
          );

          return interaction.reply({
            content:
              `✅ המשחק נפתח: ${message.url}`,

            ephemeral:
              true
          });
        }

        if (
          gameType === "bomba"
        ) {
          const game = {
            id:
              gameId,

            hostId:
              interaction.user.id,

            players:
              new Set([
                interaction.user.id
              ]),

            started:
              false,

            messageId:
              null,

            timer:
              null
          };

          const message =
            await destination.send({
              content:
                `💣 משחק בומבה נפתח על ידי ${interaction.user}!`,

              embeds: [
                createBombaLobbyEmbed(
                  game
                )
              ],

              components:
                createBombaLobbyRows(
                  gameId
                )
            });

          game.messageId =
            message.id;

          arcadeBombaGames.set(
            gameId,
            game
          );

          return interaction.reply({
            content:
              `✅ המשחק נפתח: ${message.url}`,

            ephemeral:
              true
          });
        }
      }

      // ===================== ARCADE TARGET =====================

      if (
        interaction.isUserSelectMenu() &&
        interaction.customId.startsWith(
          "arcade_target_select:"
        )
      ) {
        const gameType =
          interaction.customId
            .split(":")[1];

        const targetId =
          interaction.values[0];

        if (
          targetId ===
          interaction.user.id
        ) {
          return interaction.update({
            content:
              "❌ אי אפשר לבחור את עצמך.",

            components: []
          });
        }

        const target =
          await fetchFreshMember(
            interaction.guild,
            targetId
          );

        if (
          target.user.bot
        ) {
          return interaction.update({
            content:
              "❌ אי אפשר להזמין בוט.",

            components: []
          });
        }

        const destination =
          await client.channels.fetch(
            ARCADE_GAMES_CHANNEL_ID
          );

        const gameId =
          crypto.randomBytes(
            5
          ).toString(
            "hex"
          );

        if (
          gameType === "ttt"
        ) {
          const game = {
            id:
              gameId,

            challengerId:
              interaction.user.id,

            targetId,

            playerX:
              interaction.user.id,

            playerO:
              targetId,

            board:
              Array(
                9
              ).fill(
                null
              ),

            turn:
              interaction.user.id,

            accepted:
              false,

            finished:
              false,

            winner:
              null,

            draw:
              false
          };

          arcadeTttGames.set(
            gameId,
            game
          );

          const message =
            await destination.send({
              content:
                `${target}, ${interaction.user} הזמין אותך לאיקס עיגול!`,

              components: [
                createTttChallengeRow(
                  gameId
                )
              ]
            });

          return interaction.update({
            content:
              `✅ ההזמנה נשלחה: ${message.url}`,

            components: []
          });
        }

        if (
          gameType === "rps"
        ) {
          const game = {
            id:
              gameId,

            challengerId:
              interaction.user.id,

            targetId,

            players: [
              interaction.user.id,
              targetId
            ],

            accepted:
              false,

            choices:
              new Map(),

            finished:
              false
          };

          arcadeRpsGames.set(
            gameId,
            game
          );

          const message =
            await destination.send({
              content:
                `${target}, ${interaction.user} הזמין אותך לאבן נייר ומספריים!`,

              components: [
                createRpsChallengeRow(
                  gameId
                )
              ]
            });

          return interaction.update({
            content:
              `✅ ההזמנה נשלחה: ${message.url}`,

            components: []
          });
        }
      }

      // ===================== TTT =====================

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "ttt_accept:"
        )
      ) {
        const gameId =
          interaction.customId
            .split(":")[1];

        const game =
          arcadeTttGames.get(
            gameId
          );

        if (
          !game
        ) {
          return interaction.reply({
            content:
              "❌ המשחק לא קיים.",

            ephemeral:
              true
          });
        }

        if (
          interaction.user.id !==
          game.targetId
        ) {
          return interaction.reply({
            content:
              "❌ רק מי שהוזמן יכול לאשר.",

            ephemeral:
              true
          });
        }

        game.accepted =
          true;

        game.turn =
          crypto.randomInt(
            2
          ) === 0
            ? game.playerX
            : game.playerO;

        return interaction.update({
          content:
            `🎮 <@${game.playerX}> נגד <@${game.playerO}>`,

          embeds: [
            createTttEmbed(
              game
            )
          ],

          components:
            createTttBoardRows(
              game
            )
        });
      }

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "ttt_cancel:"
        )
      ) {
        const gameId =
          interaction.customId
            .split(":")[1];

        arcadeTttGames.delete(
          gameId
        );

        return interaction.update({
          content:
            "❌ המשחק בוטל.",

          embeds: [],

          components: []
        });
      }

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "ttt_cell:"
        )
      ) {
        const [
          ,
          gameId,
          indexRaw
        ] =
          interaction.customId
            .split(":");

        const game =
          arcadeTttGames.get(
            gameId
          );

        if (
          !game ||
          game.finished
        ) {
          return interaction.reply({
            content:
              "❌ המשחק הסתיים.",

            ephemeral:
              true
          });
        }

        if (
          interaction.user.id !==
          game.turn
        ) {
          return interaction.reply({
            content:
              "⏳ זה לא התור שלך.",

            ephemeral:
              true
          });
        }

        const index =
          Number(
            indexRaw
          );

        if (
          game.board[
            index
          ]
        ) {
          return interaction.reply({
            content:
              "❌ המשבצת תפוסה.",

            ephemeral:
              true
          });
        }

        game.board[
          index
        ] =
          interaction.user.id ===
            game.playerX
            ? "❌"
            : "⭕";

        const winner =
          getTttWinner(
            game.board
          );

        if (
          winner
        ) {
          game.finished =
            true;

          game.winner =
            winner;

        } else if (
          game.board.every(
            Boolean
          )
        ) {
          game.finished =
            true;

          game.draw =
            true;

        } else {
          game.turn =
            interaction.user.id ===
              game.playerX
              ? game.playerO
              : game.playerX;
        }

        return interaction.update({
          embeds: [
            createTttEmbed(
              game
            )
          ],

          components:
            createTttBoardRows(
              game
            )
        });
      }

      // ===================== RPS =====================

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "rps_accept:"
        )
      ) {
        const gameId =
          interaction.customId
            .split(":")[1];

        const game =
          arcadeRpsGames.get(
            gameId
          );

        if (
          interaction.user.id !==
          game?.targetId
        ) {
          return interaction.reply({
            content:
              "❌ רק מי שהוזמן יכול לאשר.",

            ephemeral:
              true
          });
        }

        game.accepted =
          true;

        return interaction.update({
          content:
            `✊✋✌️ <@${game.challengerId}> נגד <@${game.targetId}>`,

          embeds: [
            new EmbedBuilder()
              .setTitle(
                "✊✋✌️ אבן נייר ומספריים"
              )
              .setDescription(
                "כל אחד בוחר בסתר."
              )
          ],

          components: [
            createRpsChoiceRow(
              gameId
            )
          ]
        });
      }

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "rps_cancel:"
        )
      ) {
        const gameId =
          interaction.customId
            .split(":")[1];

        arcadeRpsGames.delete(
          gameId
        );

        return interaction.update({
          content:
            "❌ המשחק בוטל.",

          embeds: [],

          components: []
        });
      }

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "rps_choice:"
        )
      ) {
        const [
          ,
          gameId,
          choice
        ] =
          interaction.customId
            .split(":");

        const game =
          arcadeRpsGames.get(
            gameId
          );

        if (
          !game ||
          !game.players.includes(
            interaction.user.id
          )
        ) {
          return interaction.reply({
            content:
              "❌ אתה לא במשחק הזה.",

            ephemeral:
              true
          });
        }

        game.choices.set(
          interaction.user.id,
          choice
        );

        await interaction.reply({
          content:
            `✅ בחרת ${rpsEmoji(choice)}.`,

          ephemeral:
            true
        });

        if (
          game.choices.size < 2
        ) {
          return;
        }

        const firstId =
          game.players[0];

        const secondId =
          game.players[1];

        const first =
          game.choices.get(
            firstId
          );

        const second =
          game.choices.get(
            secondId
          );

        const result =
          getRpsWinner(
            first,
            second
          );

        let text;

        if (
          result === "draw"
        ) {
          text =
            "🤝 **תיקו!**";

        } else {
          const winnerId =
            result === "first"
              ? firstId
              : secondId;

          text =
            `🏆 המנצח: <@${winnerId}>`;
        }

        game.finished =
          true;

        await interaction.message.edit({
          embeds: [
            new EmbedBuilder()
              .setTitle(
                "✊✋✌️ תוצאה"
              )
              .setDescription(
                `<@${firstId}> ${rpsEmoji(first)}\n` +
                `<@${secondId}> ${rpsEmoji(second)}\n\n` +
                text
              )
          ],

          components: []
        });

        return;
      }

      // ===================== IMPOSTOR =====================

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "impostor_join:"
        )
      ) {
        const gameId =
          interaction.customId
            .split(":")[1];

        const game =
          arcadeImpostorGames.get(
            gameId
          );

        if (
          !game ||
          game.started
        ) {
          return interaction.reply({
            content:
              "❌ המשחק כבר התחיל.",

            ephemeral:
              true
          });
        }

        game.players.add(
          interaction.user.id
        );

        return interaction.update({
          embeds: [
            createImpostorLobbyEmbed(
              game
            )
          ],

          components:
            createImpostorLobbyRows(
              gameId
            )
        });
      }

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "impostor_leave:"
        )
      ) {
        const gameId =
          interaction.customId
            .split(":")[1];

        const game =
          arcadeImpostorGames.get(
            gameId
          );

        if (
          interaction.user.id ===
          game?.hostId
        ) {
          return interaction.reply({
            content:
              "❌ המארח לא יכול לצאת.",

            ephemeral:
              true
          });
        }

        game?.players.delete(
          interaction.user.id
        );

        return interaction.update({
          embeds: [
            createImpostorLobbyEmbed(
              game
            )
          ],

          components:
            createImpostorLobbyRows(
              gameId
            )
        });
      }

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "impostor_cancel:"
        )
      ) {
        const gameId =
          interaction.customId
            .split(":")[1];

        const game =
          arcadeImpostorGames.get(
            gameId
          );

        if (
          interaction.user.id !==
          game?.hostId
        ) {
          return interaction.reply({
            content:
              "❌ רק המארח יכול לבטל.",

            ephemeral:
              true
          });
        }

        arcadeImpostorGames.delete(
          gameId
        );

        return interaction.update({
          content:
            "🗑️ המשחק בוטל.",

          embeds: [],

          components: []
        });
      }

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "impostor_start:"
        )
      ) {
        const gameId =
          interaction.customId
            .split(":")[1];

        const game =
          arcadeImpostorGames.get(
            gameId
          );

        if (
          interaction.user.id !==
          game?.hostId
        ) {
          return interaction.reply({
            content:
              "❌ רק המארח יכול להתחיל.",

            ephemeral:
              true
          });
        }

        if (
          game.players.size < 3
        ) {
          return interaction.reply({
            content:
              "❌ צריך לפחות 3 שחקנים.",

            ephemeral:
              true
          });
        }

        game.started =
          true;

        const players =
          [...game.players];

        game.impostorId =
          randomItem(
            players
          );

        game.word =
          randomItem(
            IMPOSTOR_WORDS
          );

        let failed =
          0;

        for (
          const playerId of
          players
        ) {
          const user =
            await client.users
              .fetch(
                playerId
              )
              .catch(
                () => null
              );

          if (!user) {
            failed++;
            continue;
          }

          try {
            if (
              playerId ===
              game.impostorId
            ) {
              await user.send({
                embeds: [
                  new EmbedBuilder()
                    .setColor(
                      0xED4245
                    )
                    .setTitle(
                      "🕵️ אתה המתחזה!"
                    )
                    .setDescription(
                      "לא קיבלת מילה. נסה להעמיד פנים שאתה יודע אותה 🤫"
                    )
                ]
              });

            } else {
              await user.send({
                embeds: [
                  new EmbedBuilder()
                    .setColor(
                      0x57F287
                    )
                    .setTitle(
                      "🔐 המילה שלך"
                    )
                    .setDescription(
                      `# ${game.word}\n\nאל תגלה את המילה ישירות.`
                    )
                ]
              });
            }

          } catch {
            failed++;
          }
        }

        return interaction.update({
          content:
            "🕵️ המשחק התחיל!",

          embeds: [
            new EmbedBuilder()
              .setTitle(
                "🕵️ נחש את המתחזה"
              )
              .setDescription(
                "📩 בדקו DM והתחילו לתת רמזים." +
                (
                  failed
                    ? `\n⚠️ ${failed} לא הצליחו לקבל DM.`
                    : ""
                )
              )
          ],

          components: [
            new ActionRowBuilder()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId(
                    `impostor_reveal:${gameId}`
                  )
                  .setLabel(
                    "חשוף את המתחזה"
                  )
                  .setEmoji(
                    "👀"
                  )
                  .setStyle(
                    ButtonStyle.Danger
                  )
              )
          ]
        });
      }

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "impostor_reveal:"
        )
      ) {
        const gameId =
          interaction.customId
            .split(":")[1];

        const game =
          arcadeImpostorGames.get(
            gameId
          );

        if (
          interaction.user.id !==
          game?.hostId
        ) {
          return interaction.reply({
            content:
              "❌ רק המארח יכול לחשוף.",

            ephemeral:
              true
          });
        }

        arcadeImpostorGames.delete(
          gameId
        );

        return interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(
                0xED4245
              )
              .setTitle(
                "🕵️ המתחזה היה..."
              )
              .setDescription(
                `# <@${game.impostorId}>\n\n` +
                `המילה הייתה: **${game.word}**`
              )
          ],

          components: []
        });
      }

      // ===================== BOMBA =====================

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "bomba_join:"
        )
      ) {
        const gameId =
          interaction.customId
            .split(":")[1];

        const game =
          arcadeBombaGames.get(
            gameId
          );

        if (
          !game ||
          game.started
        ) {
          return interaction.reply({
            content:
              "❌ המשחק כבר התחיל.",

            ephemeral:
              true
          });
        }

        game.players.add(
          interaction.user.id
        );

        return interaction.update({
          embeds: [
            createBombaLobbyEmbed(
              game
            )
          ],

          components:
            createBombaLobbyRows(
              gameId
            )
        });
      }

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "bomba_leave:"
        )
      ) {
        const gameId =
          interaction.customId
            .split(":")[1];

        const game =
          arcadeBombaGames.get(
            gameId
          );

        if (
          interaction.user.id ===
          game?.hostId
        ) {
          return interaction.reply({
            content:
              "❌ המארח לא יכול לצאת.",

            ephemeral:
              true
          });
        }

        game?.players.delete(
          interaction.user.id
        );

        return interaction.update({
          embeds: [
            createBombaLobbyEmbed(
              game
            )
          ],

          components:
            createBombaLobbyRows(
              gameId
            )
        });
      }

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "bomba_cancel:"
        )
      ) {
        const gameId =
          interaction.customId
            .split(":")[1];

        const game =
          arcadeBombaGames.get(
            gameId
          );

        if (
          interaction.user.id !==
          game?.hostId
        ) {
          return interaction.reply({
            content:
              "❌ רק המארח יכול לבטל.",

            ephemeral:
              true
          });
        }

        if (
          game.timer
        ) {
          clearTimeout(
            game.timer
          );
        }

        arcadeBombaGames.delete(
          gameId
        );

        return interaction.update({
          content:
            "🗑️ המשחק בוטל.",

          embeds: [],

          components: []
        });
      }

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "bomba_start:"
        )
      ) {
        const gameId =
          interaction.customId
            .split(":")[1];

        const game =
          arcadeBombaGames.get(
            gameId
          );

        if (
          interaction.user.id !==
          game?.hostId
        ) {
          return interaction.reply({
            content:
              "❌ רק המארח יכול להתחיל.",

            ephemeral:
              true
          });
        }

        if (
          game.players.size < 2
        ) {
          return interaction.reply({
            content:
              "❌ צריך לפחות 2 שחקנים.",

            ephemeral:
              true
          });
        }

        game.started =
          true;

        const topic =
          randomItem(
            BOMBA_TOPICS
          );

        const players =
          [...game.players];

        const unlucky =
          randomItem(
            players
          );

        const explosionDelay =
          crypto.randomInt(
            15_000,
            31_000
          );

        await interaction.update({
          content:
            "💣 **הבומבה התחילה!**",

          embeds: [
            new EmbedBuilder()
              .setColor(
                0xED4245
              )
              .setTitle(
                "💣 בומבה!"
              )
              .setDescription(
                `📚 **הנושא:** # ${topic}\n\n` +
                "תענו מהר תשובות שמתאימות לנושא!\n" +
                "⏱️ אף אחד לא יודע מתי הבומבה תתפוצץ..."
              )
          ],

          components: []
        });

        game.timer =
          setTimeout(
            async () => {
              if (
                !arcadeBombaGames.has(
                  gameId
                )
              ) {
                return;
              }

              await interaction.message
                .edit({
                  content:
                    "💥💥💥 **בווווום!** 💥💥💥",

                  embeds: [
                    new EmbedBuilder()
                      .setColor(
                        0x000000
                      )
                      .setTitle(
                        "💥 הבומבה התפוצצה!"
                      )
                      .setDescription(
                        `💣 היא התפוצצה על <@${unlucky}>!\n\n` +
                        `📚 הנושא היה **${topic}**`
                      )
                  ],

                  components: []
                })
                .catch(
                  () => {}
                );

              arcadeBombaGames.delete(
                gameId
              );
            },
            explosionDelay
          );

        return;
      }

    } catch (error) {
      console.error(
        "❌ interactionCreate main bot:",
        error
      );

      try {
        if (
          interaction.deferred ||
          interaction.replied
        ) {
          await interaction.followUp({
            content:
              "❌ קרתה שגיאה בזמן ביצוע הפעולה.",

            ephemeral:
              true
          });

        } else {
          await interaction.reply({
            content:
              "❌ קרתה שגיאה בזמן ביצוע הפעולה.",

            ephemeral:
              true
          });
        }

      } catch {}
    }
  }
);
// ========================================================
//                    ROEI MUSIC BOT
// ========================================================

const musicPlayer =
  new Player(
    musicClient
  );

let musicExtractorReady =
  false;

// ===================== MUSIC COMMANDS =====================

const musicPlayCommand =
  new SlashCommandBuilder()
    .setName("play")
    .setDescription("השמעת מוזיקה")
    .addSubcommand(
      sub =>
        sub
          .setName("song")
          .setDescription("הפעל שיר")
          .addStringOption(
            option =>
              option
                .setName("query")
                .setDescription("שם השיר או קישור YouTube")
                .setRequired(true)
                .setMaxLength(500)
          )
    )
    .addSubcommand(
      sub =>
        sub
          .setName("playlist")
          .setDescription("הפעל פלייליסט אישי שלך")
          .addStringOption(
            option =>
              option
                .setName("name")
                .setDescription("שם הפלייליסט")
                .setRequired(true)
                .setMaxLength(60)
          )
    );

const musicPlaylistCommand =
  new SlashCommandBuilder()
    .setName("playlist")
    .setDescription("ניהול הפלייליסטים האישיים שלך")

    .addSubcommand(
      sub =>
        sub
          .setName("create")
          .setDescription("צור פלייליסט חדש")
          .addStringOption(
            option =>
              option
                .setName("name")
                .setDescription("שם הפלייליסט")
                .setRequired(true)
                .setMaxLength(60)
          )
    )

    .addSubcommand(
      sub =>
        sub
          .setName("add")
          .setDescription("הוסף שיר לפלייליסט")
          .addStringOption(
            option =>
              option
                .setName("name")
                .setDescription("שם הפלייליסט")
                .setRequired(true)
                .setMaxLength(60)
          )
          .addStringOption(
            option =>
              option
                .setName("song")
                .setDescription("שם השיר או קישור")
                .setRequired(true)
                .setMaxLength(500)
          )
    )

    .addSubcommand(
      sub =>
        sub
          .setName("list")
          .setDescription("הצג את הפלייליסטים שלך")
    )

    .addSubcommand(
      sub =>
        sub
          .setName("show")
          .setDescription("הצג את השירים בפלייליסט")
          .addStringOption(
            option =>
              option
                .setName("name")
                .setDescription("שם הפלייליסט")
                .setRequired(true)
                .setMaxLength(60)
          )
    )

    .addSubcommand(
      sub =>
        sub
          .setName("remove")
          .setDescription("הסר שיר מפלייליסט")
          .addStringOption(
            option =>
              option
                .setName("name")
                .setDescription("שם הפלייליסט")
                .setRequired(true)
                .setMaxLength(60)
          )
          .addIntegerOption(
            option =>
              option
                .setName("position")
                .setDescription("מספר השיר בפלייליסט")
                .setRequired(true)
                .setMinValue(1)
          )
    )

    .addSubcommand(
      sub =>
        sub
          .setName("delete")
          .setDescription("מחק פלייליסט")
          .addStringOption(
            option =>
              option
                .setName("name")
                .setDescription("שם הפלייליסט")
                .setRequired(true)
                .setMaxLength(60)
          )
    );

const musicPauseCommand =
  new SlashCommandBuilder()
    .setName("pause")
    .setDescription("עצור זמנית את המוזיקה");

const musicResumeCommand =
  new SlashCommandBuilder()
    .setName("resume")
    .setDescription("המשך את המוזיקה");

const musicSkipCommand =
  new SlashCommandBuilder()
    .setName("skip")
    .setDescription("דלג לשיר הבא");

const musicStopCommand =
  new SlashCommandBuilder()
    .setName("stop")
    .setDescription("עצור את המוזיקה ונקה את התור");

const musicQueueCommand =
  new SlashCommandBuilder()
    .setName("queue")
    .setDescription("הצג את תור המוזיקה");

const musicNowPlayingCommand =
  new SlashCommandBuilder()
    .setName("nowplaying")
    .setDescription("הצג מה מתנגן עכשיו");

const musicVolumeCommand =
  new SlashCommandBuilder()
    .setName("volume")
    .setDescription("שנה את עוצמת המוזיקה")
    .addIntegerOption(
      option =>
        option
          .setName("amount")
          .setDescription("עוצמה בין 1 ל-100")
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(100)
    );

const musicShuffleCommand =
  new SlashCommandBuilder()
    .setName("shuffle")
    .setDescription("ערבב את השירים שבתור");

const musicLoopCommand =
  new SlashCommandBuilder()
    .setName("loop")
    .setDescription("בחר מצב חזרה")
    .addStringOption(
      option =>
        option
          .setName("mode")
          .setDescription("מצב החזרה")
          .setRequired(true)
          .addChoices(
            {
              name: "כבוי",
              value: "off"
            },
            {
              name: "חזרה על השיר",
              value: "track"
            },
            {
              name: "חזרה על כל התור",
              value: "queue"
            }
          )
    );

const musicRemoveCommand =
  new SlashCommandBuilder()
    .setName("remove")
    .setDescription("הסר שיר מתור המוזיקה")
    .addIntegerOption(
      option =>
        option
          .setName("position")
          .setDescription("המיקום של השיר בתור")
          .setRequired(true)
          .setMinValue(1)
    );

const musicCommands = [
  musicPlayCommand,
  musicPlaylistCommand,
  musicPauseCommand,
  musicResumeCommand,
  musicSkipCommand,
  musicStopCommand,
  musicQueueCommand,
  musicNowPlayingCommand,
  musicVolumeCommand,
  musicShuffleCommand,
  musicLoopCommand,
  musicRemoveCommand
];

// ===================== MUSIC HELPERS =====================

async function fetchMusicMember(
  guild,
  userId
) {
  return guild.members
    .fetch({
      user: userId,
      force: true
    })
    .catch(
      () => null
    );
}

function getMusicQueue(
  guildId = GUILD_ID
) {
  return (
    musicPlayer.nodes.get(
      guildId
    ) ||
    null
  );
}

async function ensureMusicExtractor() {
  if (
    musicExtractorReady
  ) {
    return;
  }

  await musicPlayer.extractors.register(
    YouTubeDlpExtractor,
    {}
  );

  musicExtractorReady =
    true;

  console.log(
    "✅ Music YouTube extractor נטען"
  );
}

async function getMusicVoiceChannel() {
  const guild =
    await musicClient.guilds
      .fetch(
        GUILD_ID
      )
      .catch(
        () => null
      );

  if (!guild) {
    throw new Error(
      "Music guild not found"
    );
  }

  const voiceChannel =
    await guild.channels
      .fetch(
        MUSIC_VOICE_CHANNEL_ID
      )
      .catch(
        () => null
      );

  if (
    !voiceChannel ||
    voiceChannel.type !==
      ChannelType.GuildVoice
  ) {
    throw new Error(
      "Music voice channel not found"
    );
  }

  return {
    guild,
    voiceChannel
  };
}

async function ensureMusicConnection() {
  await ensureMusicExtractor();

  const {
    guild,
    voiceChannel
  } =
    await getMusicVoiceChannel();

  let queue =
    getMusicQueue(
      guild.id
    );

  if (
    !queue ||
    queue.deleted
  ) {
    queue =
      musicPlayer.nodes.create(
        guild,
        {
          metadata:
            voiceChannel,

          leaveOnEmpty:
            false,

          leaveOnEnd:
            false,

          leaveOnStop:
            false,

          pauseOnEmpty:
            false,

          selfDeaf:
            true,

          volume:
            50,

          bufferingTimeout:
            20000
        }
      );
  }

  queue.setMetadata(
    voiceChannel
  );

  if (
    !queue.connection ||
    queue.channel?.id !==
      voiceChannel.id
  ) {
    await queue.connect(
      voiceChannel,
      {
        deaf: true
      }
    );
  }

  return {
    guild,
    voiceChannel,
    queue
  };
}

async function playMusicQuery(
  query,
  requestedBy
) {
  await ensureMusicExtractor();

  const {
    voiceChannel
  } =
    await ensureMusicConnection();

  return musicPlayer.play(
    voiceChannel,
    query,
    {
      requestedBy,

      nodeOptions: {
        metadata:
          voiceChannel,

        leaveOnEmpty:
          false,

        leaveOnEnd:
          false,

        leaveOnStop:
          false,

        pauseOnEmpty:
          false,

        selfDeaf:
          true,

        volume:
          50,

        bufferingTimeout:
          20000
      }
    }
  );
}

async function getMusicTextChannel() {
  const channel =
    await musicClient.channels
      .fetch(
        MUSIC_VOICE_CHANNEL_ID
      )
      .catch(
        () => null
      );

  if (
    !channel ||
    !channel.isSendable()
  ) {
    return null;
  }

  return channel;
}

function musicWrongChannelReply(
  interaction
) {
  return interaction.reply({
    content:
      `❌ פקודות המוזיקה עובדות רק בצ'אט של <#${MUSIC_VOICE_CHANNEL_ID}>.`,

    ephemeral:
      true
  });
}

function musicNoPermissionReply(
  interaction,
  minimum
) {
  return interaction.reply({
    content:
      `❌ הפקודה הזאת זמינה רק ל-**${minimum} ומעלה**.`,

    ephemeral:
      true
  });
}

function getTrackTitle(track) {
  return (
    track?.cleanTitle ||
    track?.title ||
    "שיר לא ידוע"
  );
}

function getTrackUrl(track) {
  return (
    track?.url ||
    null
  );
}

function formatTrackLine(
  track,
  number = null
) {
  const title =
    safeText(
      getTrackTitle(
        track
      ),
      80
    );

  const url =
    getTrackUrl(
      track
    );

  const prefix =
    number
      ? `**${number}.** `
      : "";

  if (url) {
    return (
      `${prefix}[${title}](${url})`
    );
  }

  return (
    `${prefix}${title}`
  );
}

// ===================== MUSIC EVENTS =====================

musicPlayer.events.on(
  "playerStart",
  async (
    queue,
    track
  ) => {
    try {
      const channel =
        await getMusicTextChannel();

      if (!channel) {
        return;
      }

      const embed =
        new EmbedBuilder()
          .setColor(
            0x5865F2
          )
          .setTitle(
            "🎵 מתנגן עכשיו"
          )
          .setDescription(
            formatTrackLine(
              track
            )
          )
          .addFields(
            {
              name:
                "⏱️ אורך",

              value:
                track.duration ||
                "לא ידוע",

              inline:
                true
            },

            {
              name:
                "👤 ביקש",

              value:
                track.requestedBy
                  ? `${track.requestedBy}`
                  : "לא ידוע",

              inline:
                true
            }
          )
          .setTimestamp();

      if (
        track.thumbnail
      ) {
        embed.setThumbnail(
          track.thumbnail
        );
      }

      await channel.send({
        embeds: [
          embed
        ]
      }).catch(
        () => {}
      );

    } catch (
      error
    ) {
      console.error(
        "❌ playerStart:",
        error
      );
    }
  }
);

musicPlayer.events.on(
  "playerError",
  (
    queue,
    error,
    track
  ) => {
    console.error(
      `❌ Music player error (${track?.title || "unknown"}):`,
      error
    );
  }
);

musicPlayer.events.on(
  "error",
  (
    queue,
    error
  ) => {
    console.error(
      "❌ Music queue error:",
      error
    );
  }
);

musicPlayer.events.on(
  "disconnect",
  () => {
    setTimeout(
      () => {
        ensureMusicConnection()
          .catch(
            error =>
              console.error(
                "❌ Music reconnect:",
                error.message
              )
          );
      },
      3000
    );
  }
);

// ===================== MUSIC READY =====================

musicClient.once(
  "ready",
  async () => {
    console.log(
      `🎵 Roei Music Bot מחובר בתור ${musicClient.user.tag}`
    );

    try {
      await ensureMusicExtractor();

    } catch (
      error
    ) {
      console.error(
        "❌ טעינת Music Extractor:",
        error
      );
    }

    try {
      const rest =
        new REST({
          version:
            "10"
        })
          .setToken(
            MUSIC_BOT_TOKEN
          );

      await rest.put(
        Routes.applicationGuildCommands(
          MUSIC_CLIENT_ID,
          GUILD_ID
        ),
        {
          body:
            musicCommands.map(
              command =>
                command.toJSON()
            )
        }
      );

      console.log(
        "✅ פקודות Roei Music נרשמו"
      );

    } catch (
      error
    ) {
      console.error(
        "❌ רישום פקודות Music:",
        error
      );
    }

    try {
      await ensureMusicConnection();

      console.log(
        "✅ Roei Music מחובר לחדר המוזיקה 24/7"
      );

    } catch (
      error
    ) {
      console.error(
        "❌ כניסה לחדר המוזיקה:",
        error
      );
    }
  }
);

// אם מנתקים את בוט המוזיקה מהחדר,
// הוא מנסה לחזור אוטומטית.

musicClient.on(
  "voiceStateUpdate",
  (
    oldState,
    newState
  ) => {
    if (
      newState.member?.id !==
      musicClient.user?.id
    ) {
      return;
    }

    if (
      newState.channelId ===
      MUSIC_VOICE_CHANNEL_ID
    ) {
      return;
    }

    setTimeout(
      () => {
        ensureMusicConnection()
          .catch(
            () => {}
          );
      },
      2500
    );
  }
);

// ===================== MUSIC INTERACTIONS =====================

musicClient.on(
  "interactionCreate",
  async interaction => {
    if (
      !interaction.isChatInputCommand()
    ) {
      return;
    }

    try {
      if (
        interaction.guildId !==
          GUILD_ID ||
        interaction.channelId !==
          MUSIC_VOICE_CHANNEL_ID
      ) {
        return musicWrongChannelReply(
          interaction
        );
      }

      const guild =
        interaction.guild;

      if (!guild) {
        return interaction.reply({
          content:
            "❌ לא הצלחתי למצוא את השרת.",

          ephemeral:
            true
        });
      }

      const member =
        await fetchMusicMember(
          guild,
          interaction.user.id
        );

      if (!member) {
        return interaction.reply({
          content:
            "❌ לא הצלחתי למצוא אותך בשרת.",

          ephemeral:
            true
        });
      }

      // ==================================================
      // PLAYLIST
      // כל אחד יכול ליצור ולנהל פלייליסטים אישיים.
      // ==================================================

      if (
        interaction.commandName ===
        "playlist"
      ) {
        const sub =
          interaction.options
            .getSubcommand();

        // ---------- CREATE ----------

        if (
          sub === "create"
        ) {
          const name =
            interaction.options
              .getString(
                "name",
                true
              )
              .trim();

          const map =
            getUserPlaylistMap(
              interaction.user.id,
              true
            );

          const key =
            normalizePlaylistName(
              name
            );

          if (
            map.has(
              key
            )
          ) {
            return interaction.reply({
              content:
                `❌ כבר יש לך פלייליסט בשם **${name}**.`,

              ephemeral:
                true
            });
          }

          const playlist =
            createUserPlaylistLocal(
              interaction.user.id,
              name
            );

          if (!playlist) {
            return interaction.reply({
              content:
                "❌ שם הפלייליסט לא תקין.",

              ephemeral:
                true
            });
          }

          await logBotData(
            `MUSIC_PL_CREATE|${interaction.user.id}|${encodeSmall(playlist.name)}`
          );

          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(
                  0x57F287
                )
                .setTitle(
                  "✅ הפלייליסט נוצר"
                )
                .setDescription(
                  `🎵 **${playlist.name}**\n\n` +
                  "כדי להוסיף שיר השתמש ב-`/playlist add`."
                )
            ],

            ephemeral:
              true
          });
        }

        // ---------- ADD ----------

        if (
          sub === "add"
        ) {
          const name =
            interaction.options
              .getString(
                "name",
                true
              );

          const song =
            interaction.options
              .getString(
                "song",
                true
              )
              .trim();

          const playlist =
            getUserPlaylist(
              interaction.user.id,
              name
            );

          if (!playlist) {
            return interaction.reply({
              content:
                `❌ לא מצאתי פלייליסט בשם **${name}**.`,

              ephemeral:
                true
            });
          }

          if (
            playlist.songs.length >=
            100
          ) {
            return interaction.reply({
              content:
                "❌ אפשר לשמור עד 100 שירים בכל פלייליסט.",

              ephemeral:
                true
            });
          }

          await interaction.deferReply({
            ephemeral:
              true
          });

          try {
            await ensureMusicExtractor();

            const search =
              await musicPlayer.search(
                song,
                {
                  requestedBy:
                    interaction.user
                }
              );

            const track =
              search.tracks[0];

            if (!track) {
              return interaction.editReply(
                "❌ לא מצאתי את השיר."
              );
            }

            const storedSong =
              track.url ||
              song;

            playlist.songs.push(
              storedSong
            );

            await logBotData(
              `MUSIC_PL_ADD|${interaction.user.id}|${encodeSmall(playlist.name)}|${encodeSmall(storedSong)}`
            );

            return interaction.editReply(
              `✅ **${getTrackTitle(track)}** נוסף ל-**${playlist.name}**.\n` +
              `🎵 יש עכשיו **${playlist.songs.length} שירים** בפלייליסט.`
            );

          } catch (
            error
          ) {
            console.error(
              "❌ playlist add:",
              error
            );

            return interaction.editReply(
              "❌ לא הצלחתי למצוא את השיר הזה."
            );
          }
        }

        // ---------- LIST ----------

        if (
          sub === "list"
        ) {
          const map =
            getUserPlaylistMap(
              interaction.user.id,
              false
            );

          if (
            !map ||
            map.size === 0
          ) {
            return interaction.reply({
              content:
                "🎵 עדיין אין לך פלייליסטים.\nצור אחד עם `/playlist create`.",

              ephemeral:
                true
            });
          }

          const lines =
            [...map.values()]
              .map(
                (
                  playlist,
                  index
                ) =>
                  `**${index + 1}. ${playlist.name}** — ${playlist.songs.length} שירים`
              )
              .join(
                "\n"
              );

          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(
                  0x5865F2
                )
                .setTitle(
                  "🎵 הפלייליסטים שלך"
                )
                .setDescription(
                  lines
                )
            ],

            ephemeral:
              true
          });
        }

        // ---------- SHOW ----------

        if (
          sub === "show"
        ) {
          const name =
            interaction.options
              .getString(
                "name",
                true
              );

          const playlist =
            getUserPlaylist(
              interaction.user.id,
              name
            );

          if (!playlist) {
            return interaction.reply({
              content:
                `❌ לא מצאתי פלייליסט בשם **${name}**.`,

              ephemeral:
                true
            });
          }

          if (
            playlist.songs.length === 0
          ) {
            return interaction.reply({
              content:
                `🎵 הפלייליסט **${playlist.name}** ריק.`,

              ephemeral:
                true
            });
          }

          const shown =
            playlist.songs
              .slice(
                0,
                25
              )
              .map(
                (
                  song,
                  index
                ) =>
                  `**${index + 1}.** ${safeText(song, 100)}`
              )
              .join(
                "\n"
              );

          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(
                  0x5865F2
                )
                .setTitle(
                  `🎵 ${playlist.name}`
                )
                .setDescription(
                  shown +
                  (
                    playlist.songs.length > 25
                      ? `\n\n...ועוד **${playlist.songs.length - 25}** שירים`
                      : ""
                  )
                )
                .setFooter({
                  text:
                    `${playlist.songs.length} שירים`
                })
            ],

            ephemeral:
              true
          });
        }

        // ---------- REMOVE ----------

        if (
          sub === "remove"
        ) {
          const name =
            interaction.options
              .getString(
                "name",
                true
              );

          const position =
            interaction.options
              .getInteger(
                "position",
                true
              );

          const playlist =
            getUserPlaylist(
              interaction.user.id,
              name
            );

          if (!playlist) {
            return interaction.reply({
              content:
                `❌ לא מצאתי פלייליסט בשם **${name}**.`,

              ephemeral:
                true
            });
          }

          const index =
            position - 1;

          if (
            index < 0 ||
            index >=
              playlist.songs.length
          ) {
            return interaction.reply({
              content:
                `❌ בפלייליסט יש **${playlist.songs.length} שירים**.`,

              ephemeral:
                true
            });
          }

          const removed =
            playlist.songs.splice(
              index,
              1
            )[0];

          await logBotData(
            `MUSIC_PL_REMOVE|${interaction.user.id}|${encodeSmall(playlist.name)}|${index}`
          );

          return interaction.reply({
            content:
              `🗑️ שיר מספר **${position}** הוסר מ-**${playlist.name}**.\n` +
              `\`${safeText(removed, 150)}\``,

            ephemeral:
              true
          });
        }

        // ---------- DELETE ----------

        if (
          sub === "delete"
        ) {
          const name =
            interaction.options
              .getString(
                "name",
                true
              );

          const map =
            getUserPlaylistMap(
              interaction.user.id,
              false
            );

          const playlist =
            getUserPlaylist(
              interaction.user.id,
              name
            );

          if (
            !map ||
            !playlist
          ) {
            return interaction.reply({
              content:
                `❌ לא מצאתי פלייליסט בשם **${name}**.`,

              ephemeral:
                true
            });
          }

          map.delete(
            normalizePlaylistName(
              playlist.name
            )
          );

          await logBotData(
            `MUSIC_PL_DELETE|${interaction.user.id}|${encodeSmall(playlist.name)}`
          );

          return interaction.reply({
            content:
              `🗑️ הפלייליסט **${playlist.name}** נמחק.`,

            ephemeral:
              true
          });
        }

        return;
      }

      // ==================================================
      // PLAY — Stuff ומעלה
      // ==================================================

      if (
        interaction.commandName ===
        "play"
      ) {
        if (
          !hasMusicDJAccess(
            member
          )
        ) {
          return musicNoPermissionReply(
            interaction,
            "Stuff"
          );
        }

        const sub =
          interaction.options
            .getSubcommand();

        // ---------- PLAY SONG ----------

        if (
          sub === "song"
        ) {
          const query =
            interaction.options
              .getString(
                "query",
                true
              )
              .trim();

          await interaction.deferReply();

          try {
            const result =
              await playMusicQuery(
                query,
                interaction.user
              );

            const track =
              result?.track;

            if (!track) {
              return interaction.editReply(
                "❌ לא מצאתי את השיר."
              );
            }

            return interaction.editReply({
              embeds: [
                new EmbedBuilder()
                  .setColor(
                    0x57F287
                  )
                  .setTitle(
                    "✅ השיר נוסף"
                  )
                  .setDescription(
                    formatTrackLine(
                      track
                    )
                  )
                  .setFooter({
                    text:
                      `נוסף על ידי ${interaction.user.username}`
                  })
              ]
            });

          } catch (
            error
          ) {
            console.error(
              "❌ /play song:",
              error
            );

            return interaction.editReply(
              "❌ לא הצלחתי להפעיל את השיר. נסה שם אחר או קישור אחר."
            );
          }
        }

        // ---------- PLAY PLAYLIST ----------

        if (
          sub === "playlist"
        ) {
          const name =
            interaction.options
              .getString(
                "name",
                true
              );

          const playlist =
            getUserPlaylist(
              interaction.user.id,
              name
            );

          if (!playlist) {
            return interaction.reply({
              content:
                `❌ לא מצאתי פלייליסט בשם **${name}**.`,

              ephemeral:
                true
            });
          }

          if (
            playlist.songs.length === 0
          ) {
            return interaction.reply({
              content:
                `❌ הפלייליסט **${playlist.name}** ריק.`,

              ephemeral:
                true
            });
          }

          await interaction.deferReply();

          let added = 0;
          let failed = 0;

          for (
            const song of
            playlist.songs
          ) {
            try {
              await playMusicQuery(
                song,
                interaction.user
              );

              added++;

            } catch {
              failed++;
            }
          }

          if (
            added === 0
          ) {
            return interaction.editReply(
              "❌ לא הצלחתי להפעיל אף שיר מהפלייליסט."
            );
          }

          return interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor(
                  0x57F287
                )
                .setTitle(
                  "🎵 הפלייליסט נוסף לתור"
                )
                .setDescription(
                  `**${playlist.name}**\n\n` +
                  `✅ נוספו: **${added} שירים**` +
                  (
                    failed
                      ? `\n❌ לא הצליחו: **${failed}**`
                      : ""
                  )
                )
            ]
          });
        }

        return;
      }

      // ==================================================
      // HELPER ומעלה
      // ==================================================

      if (
        [
          "pause",
          "resume",
          "skip",
          "stop",
          "queue",
          "nowplaying"
        ].includes(
          interaction.commandName
        )
      ) {
        if (
          !hasMusicBasicAccess(
            member
          )
        ) {
          return musicNoPermissionReply(
            interaction,
            "Helper"
          );
        }

        const queue =
          getMusicQueue(
            guild.id
          );

        // ---------- PAUSE ----------

        if (
          interaction.commandName ===
          "pause"
        ) {
          if (
            !queue?.currentTrack
          ) {
            return interaction.reply({
              content:
                "❌ אין שיר שמתנגן כרגע.",

              ephemeral:
                true
            });
          }

          if (
            queue.node.isPaused()
          ) {
            return interaction.reply({
              content:
                "⏸️ המוזיקה כבר בהשהיה.",

              ephemeral:
                true
            });
          }

          queue.node.setPaused(
            true
          );

          return interaction.reply(
            "⏸️ המוזיקה נעצרה זמנית."
          );
        }

        // ---------- RESUME ----------

        if (
          interaction.commandName ===
          "resume"
        ) {
          if (
            !queue?.currentTrack
          ) {
            return interaction.reply({
              content:
                "❌ אין שיר שמתנגן כרגע.",

              ephemeral:
                true
            });
          }

          if (
            !queue.node.isPaused()
          ) {
            return interaction.reply({
              content:
                "▶️ המוזיקה כבר מתנגנת.",

              ephemeral:
                true
            });
          }

          queue.node.setPaused(
            false
          );

          return interaction.reply(
            "▶️ המוזיקה ממשיכה."
          );
        }

        // ---------- SKIP ----------

        if (
          interaction.commandName ===
          "skip"
        ) {
          if (
            !queue?.currentTrack
          ) {
            return interaction.reply({
              content:
                "❌ אין שיר לדלג עליו.",

              ephemeral:
                true
            });
          }

          const skipped =
            getTrackTitle(
              queue.currentTrack
            );

          queue.node.skip();

          return interaction.reply(
            `⏭️ דילגתי על **${skipped}**.`
          );
        }

        // ---------- STOP ----------

        if (
          interaction.commandName ===
          "stop"
        ) {
          if (
            !queue
          ) {
            return interaction.reply({
              content:
                "❌ אין כרגע מוזיקה פעילה.",

              ephemeral:
                true
            });
          }

          queue.clear();

          if (
            queue.currentTrack
          ) {
            queue.node.stop(
              true
            );
          }

          await ensureMusicConnection()
            .catch(
              () => {}
            );

          return interaction.reply(
            "⏹️ המוזיקה נעצרה והתור נוקה.\n🎧 הבוט נשאר בחדר הקולי."
          );
        }

        // ---------- QUEUE ----------

        if (
          interaction.commandName ===
          "queue"
        ) {
          if (
            !queue?.currentTrack
          ) {
            return interaction.reply({
              content:
                "🎵 התור כרגע ריק.",

              ephemeral:
                true
            });
          }

          const tracks =
            queue.tracks
              .toArray();

          const nextTracks =
            tracks
              .slice(
                0,
                10
              )
              .map(
                (
                  track,
                  index
                ) =>
                  formatTrackLine(
                    track,
                    index + 1
                  )
              )
              .join(
                "\n"
              );

          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(
                  0x5865F2
                )
                .setTitle(
                  "🎶 תור המוזיקה"
                )
                .setDescription(
                  `**🎵 מתנגן עכשיו:**\n${formatTrackLine(queue.currentTrack)}\n\n` +
                  (
                    nextTracks
                      ? `**⏭️ הבאים בתור:**\n${nextTracks}`
                      : "**⏭️ אין עוד שירים בתור.**"
                  )
                )
                .setFooter({
                  text:
                    tracks.length > 10
                      ? `מוצגים 10 מתוך ${tracks.length} שירים`
                      : `${tracks.length} שירים ממתינים`
                })
            ]
          });
        }

        // ---------- NOWPLAYING ----------

        if (
          interaction.commandName ===
          "nowplaying"
        ) {
          if (
            !queue?.currentTrack
          ) {
            return interaction.reply({
              content:
                "❌ לא מתנגן כלום כרגע.",

              ephemeral:
                true
            });
          }

          const track =
            queue.currentTrack;

          const progress =
            queue.node
              .createProgressBar() ||
            "▬▬▬▬▬▬▬▬▬▬";

          const embed =
            new EmbedBuilder()
              .setColor(
                0x5865F2
              )
              .setTitle(
                "🎵 מתנגן עכשיו"
              )
              .setDescription(
                `${formatTrackLine(track)}\n\n${progress}`
              )
              .addFields(
                {
                  name:
                    "⏱️ אורך",

                  value:
                    track.duration ||
                    "לא ידוע",

                  inline:
                    true
                },

                {
                  name:
                    "🔊 עוצמה",

                  value:
                    `${queue.node.volume}%`,

                  inline:
                    true
                }
              );

          if (
            track.thumbnail
          ) {
            embed.setThumbnail(
              track.thumbnail
            );
          }

          return interaction.reply({
            embeds: [
              embed
            ]
          });
        }
      }

      // ==================================================
      // Stuff ומעלה
      // ==================================================

      if (
        [
          "volume",
          "shuffle",
          "loop",
          "remove"
        ].includes(
          interaction.commandName
        )
      ) {
        if (
          !hasMusicDJAccess(
            member
          )
        ) {
          return musicNoPermissionReply(
            interaction,
            "Stuff"
          );
        }

        const queue =
          getMusicQueue(
            guild.id
          );

        if (
          !queue
        ) {
          return interaction.reply({
            content:
              "❌ אין כרגע תור מוזיקה פעיל.",

            ephemeral:
              true
          });
        }

        // ---------- VOLUME ----------

        if (
          interaction.commandName ===
          "volume"
        ) {
          const amount =
            interaction.options
              .getInteger(
                "amount",
                true
              );

          queue.node.setVolume(
            amount
          );

          return interaction.reply(
            `🔊 העוצמה שונתה ל-**${amount}%**.`
          );
        }

        // ---------- SHUFFLE ----------

        if (
          interaction.commandName ===
          "shuffle"
        ) {
          if (
            queue.tracks.size < 2
          ) {
            return interaction.reply({
              content:
                "❌ צריך לפחות 2 שירים שממתינים בתור.",

              ephemeral:
                true
            });
          }

          queue.tracks.shuffle();

          return interaction.reply(
            `🔀 ערבבתי **${queue.tracks.size} שירים** בתור.`
          );
        }

        // ---------- LOOP ----------

        if (
          interaction.commandName ===
          "loop"
        ) {
          const mode =
            interaction.options
              .getString(
                "mode",
                true
              );

          const modes = {
            off:
              QueueRepeatMode.OFF,

            track:
              QueueRepeatMode.TRACK,

            queue:
              QueueRepeatMode.QUEUE
          };

          const labels = {
            off:
              "כבוי ❌",

            track:
              "חזרה על השיר 🔂",

            queue:
              "חזרה על כל התור 🔁"
          };

          queue.setRepeatMode(
            modes[mode]
          );

          return interaction.reply(
            `🔁 מצב החזרה: **${labels[mode]}**`
          );
        }

        // ---------- REMOVE ----------

        if (
          interaction.commandName ===
          "remove"
        ) {
          const position =
            interaction.options
              .getInteger(
                "position",
                true
              );

          const tracks =
            queue.tracks
              .toArray();

          const index =
            position - 1;

          if (
            index < 0 ||
            index >=
              tracks.length
          ) {
            return interaction.reply({
              content:
                `❌ יש כרגע רק **${tracks.length} שירים** שממתינים בתור.`,

              ephemeral:
                true
            });
          }

          const track =
            tracks[index];

          queue.removeTrack(
            index
          );

          return interaction.reply(
            `🗑️ **${getTrackTitle(track)}** הוסר מהתור.`
          );
        }
      }

    } catch (
      error
    ) {
      console.error(
        "❌ Music interaction:",
        error
      );

      try {
        if (
          interaction.deferred ||
          interaction.replied
        ) {
          await interaction.followUp({
            content:
              "❌ קרתה שגיאה בפעולת המוזיקה.",

            ephemeral:
              true
          });

        } else {
          await interaction.reply({
            content:
              "❌ קרתה שגיאה בפעולת המוזיקה.",

            ephemeral:
              true
          });
        }

      } catch {}
    }
  }
);

// ===================== ERROR HANDLERS =====================

process.on(
  "unhandledRejection",
  error => {
    console.error(
      "❌ unhandledRejection:",
      error
    );
  }
);

process.on(
  "uncaughtException",
  error => {
    console.error(
      "❌ uncaughtException:",
      error
    );
  }
);

// ===================== LOGIN BOTH BOTS =====================

if (
  !TOKEN ||
  !CLIENT_ID ||
  !GUILD_ID
) {
  console.error(
    "❌ חסר BOT_TOKEN / CLIENT_ID / GUILD_ID לבוט הראשי"
  );

} else {
  client.login(
    TOKEN
  );
}

if (
  !MUSIC_BOT_TOKEN ||
  !MUSIC_CLIENT_ID ||
  !GUILD_ID
) {
  console.error(
    "❌ חסר MUSIC_BOT_TOKEN / MUSIC_CLIENT_ID / GUILD_ID לבוט המוזיקה"
  );

} else {
  musicClient.login(
    MUSIC_BOT_TOKEN
  );
}
