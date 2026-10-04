const {
  Client,
  GatewayIntentBits,
  PermissionFlagsBits,
  ChannelType,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  UserSelectMenuBuilder,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  REST,
  Routes,
  Events
} = require("discord.js");

const crypto = require("crypto");

const {
  Player,
  QueueRepeatMode
} = require("discord-player");

const {
  SoundCloudExtractor
} = require("@discord-player/extractor");

const ffmpegPath =
  require("ffmpeg-static");

if (ffmpegPath) {
  process.env.FFMPEG_PATH =
    ffmpegPath;
}

// ========================================================
// CLIENTS
// ========================================================

const client =
  new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildVoiceStates
    ]
  });

const musicClient =
  new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildVoiceStates
    ]
  });

// ========================================================
// ENV
// ========================================================

const TOKEN =
  process.env.BOT_TOKEN;

const CLIENT_ID =
  process.env.CLIENT_ID;

const MUSIC_BOT_TOKEN =
  process.env.MUSIC_BOT_TOKEN;

const MUSIC_CLIENT_ID =
  process.env.MUSIC_CLIENT_ID;

const GUILD_ID =
  process.env.GUILD_ID;

const CATEGORY_ID =
  process.env.CATEGORY_ID;

const YOUTUBE_CHANNEL_ID_FROM_ENV =
  process.env.YOUTUBE_CHANNEL_ID ||
  null;

// ========================================================
// IDS
// ========================================================

const OWNER_USER_ID =
  "1243097719262941224";

const PANEL_CHANNEL_ID =
  "1541390151757078599";

const STAFF_APPLICATION_CHANNEL_ID =
  "1541391169936687195";

const STAFF_LOG_CHANNEL_ID =
  "1555688820916363354";

const WELCOME_CHANNEL_ID =
  "1541376515961262100";

const RULES_CHANNEL_ID =
  "1541369624644554772";

// ===================== SUGGESTIONS =====================

const SUGGESTIONS_PANEL_CHANNEL_ID =
  "1555834756481024062";

const VIDEO_IDEAS_CHANNEL_ID =
  "1555835422624587826";

const EDIT_IDEAS_CHANNEL_ID =
  "1555836109496516748";

const SERVER_SUGGESTIONS_CHANNEL_ID =
  "1555835110010527855";

// ===================== YOUTUBE =====================

const YOUTUBE_NOTIFY_CHANNEL_ID =
  "1555879776936402965";

const YOUTUBE_HANDLE_URL =
  "https://www.youtube.com/@RoeiKing1";

const YOUTUBE_CHECK_INTERVAL_MS =
  2 * 60 * 1000;

// ===================== SOCIALS =====================

const SOCIALS_CHANNEL_ID =
  "1555843770518609941";

const SOCIAL_YOUTUBE_URL =
  "https://www.youtube.com/@RoeiKing1";

const SOCIAL_KICK_URL =
  "https://kick.com/roeiking1";

const SOCIAL_WHATSAPP_URL =
  "https://whatsapp.com/channel/0029Vb7TecZK0IBbMbjFcr1T";

const DISCORD_USERNAME =
  "roro_king1234";

// ===================== PARTNER =====================

const PARTNER_PANEL_CHANNEL_ID =
  "1542045433323589714";

const PARTNER_ADS_CHANNEL_ID =
  "1541376165506187264";

const PARTNER_ROLE_ID =
  "1555952744341180466";

const OUR_SERVER_INVITE =
  "https://discord.gg/kP7f9rB33";

const PARTNER_COOLDOWN_MS =
  7 * 24 * 60 * 60 * 1000;

// ===================== TEMP VOICE =====================

const TEMP_VOICE_PANEL_CHANNEL_ID =
  "1556011499234009191";

const TEMP_VOICE_CREATE_CHANNEL_ID =
  "1556011651013025812";

const TEMP_VOICE_CATEGORY_ID =
  "1556011045460508763";

// ===================== ARCADE =====================

const ARCADE_PANEL_CHANNEL_ID =
  "1556154437742104618";

const ARCADE_GAMES_CHANNEL_ID =
  "1556154531417554964";

// ===================== MUSIC =====================

const MUSIC_VOICE_CHANNEL_ID =
  "1555567802121715832";

// ========================================================
// STAFF ROLES
// ========================================================

const ROLE_HELPER =
  "1556250971150094346";

const ROLE_STAFF =
  "1555587941575696444";

const ROLE_PROMO_1 =
  "1555588224636821526";

const ROLE_TEAM =
  "1555588615520653332";

const ROLE_ADMIN =
  "1555908830209118268";

const ROLE_HEAD_ADMIN =
  "1555908924643737621";

const ROLE_TOP =
  "1555588725398839376";

const EXTRA_HANDLER_ROLE =
  "1541371707011629077";

const STAFF_ACCESS_ROLE_IDS = [
  ROLE_STAFF,
  EXTRA_HANDLER_ROLE,
  ROLE_PROMO_1,
  ROLE_TEAM,
  ROLE_ADMIN,
  ROLE_HEAD_ADMIN,
  ROLE_TOP
];

const LADDER_ROLE_IDS = [
  ROLE_HELPER,
  ROLE_STAFF,
  ROLE_PROMO_1,
  ROLE_TEAM,
  ROLE_ADMIN,
  ROLE_HEAD_ADMIN,
  ROLE_TOP
];

// ========================================================
// NICKNAME PREFIXES
// ========================================================

const NICKNAME_PREFIX_BY_ROLE = {
  [ROLE_HELPER]: "He",
  [ROLE_STAFF]: "ST",
  [ROLE_PROMO_1]: "BST",
  [ROLE_TEAM]: "TM",
  [ROLE_ADMIN]: "AD",
  [ROLE_HEAD_ADMIN]: "HA",
  [ROLE_TOP]: "CO"
};

const PREFIX_RANKS = {
  HE: 0,
  ST: 1,
  BST: 2,
  TM: 3,
  AD: 4,
  HA: 5,
  CO: 6
};

const STAFF_PREFIX_REGEX =
  /^\s*(HE|ST|BST|TM|AD|HA|CO)\s*(?:\||｜|│|:|-|–|—)\s*/i;

const ANY_PREFIX_REGEX =
  /^\s*([^|｜│]+?)\s*(?:\||｜|│)\s*/;

const FAKE_PROMOTION_TIMEOUT_MS =
  15 * 60 * 1000;

// ========================================================
// APPLICATIONS
// ========================================================

const REJECT_COOLDOWN_MS =
  7 * 24 * 60 * 60 * 1000;

const rejectionCooldowns =
  new Map();

const pendingApplications =
  new Set();

const processingApplications =
  new Set();

// ========================================================
// GIVEAWAYS
// ========================================================

const activeGiveaways =
  new Map();

// ========================================================
// SUGGESTIONS
// ========================================================

const suggestionStates =
  new Map();

const processingSuggestions =
  new Set();

// ========================================================
// PARTNER
// ========================================================

const partnerStates =
  new Map();

const partnerPendingByUser =
  new Map();

const partnerCooldowns =
  new Map();

const processingPartners =
  new Set();

// ========================================================
// YOUTUBE
// ========================================================

const youtubeSeen =
  new Map();

let youtubeInitialized =
  false;

let resolvedYouTubeChannelId =
  YOUTUBE_CHANNEL_ID_FROM_ENV;

let youtubePollRunning =
  false;

// ========================================================
// TEMP VOICE
// ========================================================

const tempVoiceOwners =
  new Map();

const tempVoiceCreating =
  new Set();

// ========================================================
// ARCADE
// ========================================================

const arcadeTttGames =
  new Map();

const arcadeRpsGames =
  new Map();

const arcadeImpostorGames =
  new Map();

const arcadeBombaGames =
  new Map();

// ========================================================
// MUSIC PLAYLISTS
// ========================================================

const musicPlaylists =
  new Map();

// ========================================================
// BOT DATA
// ========================================================

let botDataChannelId =
  null;

const BOT_DATA_CHANNEL_NAME =
  "bot-data";

const BOT_DATA_CHANNEL_TOPIC =
  "roei-bot-private-data-v2";

// ========================================================
// TICKETS
// ========================================================

const ticketTypes = {
  report: {
    channelName:
      "דיווח"
  },

  technical: {
    channelName:
      "תמיכה"
  },

  general: {
    channelName:
      "כללי"
  }
};

// ========================================================
// BASIC HELPERS
// ========================================================

async function getMainGuild() {
  if (!GUILD_ID) {
    return null;
  }

  return client.guilds
    .fetch(GUILD_ID)
    .catch(
      () => null
    );
}

async function fetchFreshMember(
  guild,
  userId
) {
  return guild.members.fetch({
    user:
      userId,

    force:
      true
  });
}

function hasStaffAccess(member) {
  if (!member) {
    return false;
  }

  if (
    member.id ===
    OWNER_USER_ID
  ) {
    return true;
  }

  return STAFF_ACCESS_ROLE_IDS.some(
    id =>
      member.roles.cache.has(
        id
      )
  );
}

function hasClearAccess(member) {
  if (!member) {
    return false;
  }

  if (
    member.id ===
    OWNER_USER_ID
  ) {
    return true;
  }

  return [
    ROLE_TEAM,
    ROLE_ADMIN,
    ROLE_HEAD_ADMIN,
    ROLE_TOP
  ].some(
    id =>
      member.roles.cache.has(
        id
      )
  );
}

function hasMusicBasicAccess(member) {
  if (!member) {
    return false;
  }

  if (
    member.id ===
    OWNER_USER_ID
  ) {
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
    id =>
      member.roles.cache.has(
        id
      )
  );
}

function hasMusicDJAccess(member) {
  if (!member) {
    return false;
  }

  if (
    member.id ===
    OWNER_USER_ID
  ) {
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
    id =>
      member.roles.cache.has(
        id
      )
  );
}

function getHighestLadderRoleId(
  member
) {
  if (!member) {
    return null;
  }

  for (
    let i =
      LADDER_ROLE_IDS.length - 1;
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

function getPromotionTargets(
  roleId
) {
  if (
    roleId ===
    ROLE_HELPER
  ) {
    return [
      ROLE_STAFF
    ];
  }

  if (
    roleId ===
    ROLE_STAFF
  ) {
    return [
      ROLE_PROMO_1,
      ROLE_TEAM
    ];
  }

  if (
    roleId ===
    ROLE_PROMO_1
  ) {
    return [
      ROLE_TEAM
    ];
  }

  if (
    roleId ===
    ROLE_TEAM
  ) {
    return [
      ROLE_ADMIN
    ];
  }

  if (
    roleId ===
    ROLE_ADMIN
  ) {
    return [
      ROLE_HEAD_ADMIN
    ];
  }

  if (
    roleId ===
    ROLE_HEAD_ADMIN
  ) {
    return [
      ROLE_TOP
    ];
  }

  return [];
}

function getPromotionLabels(
  roleId
) {
  if (
    roleId ===
    ROLE_HELPER
  ) {
    return {
      [ROLE_STAFF]:
        "Stuff"
    };
  }

  if (
    roleId ===
    ROLE_STAFF
  ) {
    return {
      [ROLE_PROMO_1]:
        "Big Stuff",

      [ROLE_TEAM]:
        "Team"
    };
  }

  if (
    roleId ===
    ROLE_PROMO_1
  ) {
    return {
      [ROLE_TEAM]:
        "Team"
    };
  }

  if (
    roleId ===
    ROLE_TEAM
  ) {
    return {
      [ROLE_ADMIN]:
        "Admin"
    };
  }

  if (
    roleId ===
    ROLE_ADMIN
  ) {
    return {
      [ROLE_HEAD_ADMIN]:
        "Head Admin"
    };
  }

  if (
    roleId ===
    ROLE_HEAD_ADMIN
  ) {
    return {
      [ROLE_TOP]:
        "Co-owner"
    };
  }

  return {};
}

async function getRoleName(
  guild,
  roleId
) {
  if (!roleId) {
    return "ללא";
  }

  const role =
    guild.roles.cache.get(
      roleId
    ) ||
    await guild.roles
      .fetch(roleId)
      .catch(
        () => null
      );

  return (
    role?.name ||
    roleId
  );
}

function getStaffMentions() {
  return STAFF_ACCESS_ROLE_IDS
    .map(
      id =>
        `<@&${id}>`
    )
    .join(" ");
}

function safeText(
  value,
  max = 1000
) {
  const text =
    String(
      value ?? ""
    ).trim();

  if (!text) {
    return "לא נכתב";
  }

  if (
    text.length <= max
  ) {
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
    String(
      value ?? ""
    ),
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

function normalizePlaylistName(
  name
) {
  return String(
    name || ""
  )
    .trim()
    .toLocaleLowerCase(
      "he"
    );
}

function getUserPlaylistMap(
  userId,
  create = false
) {
  if (
    !musicPlaylists.has(
      userId
    ) &&
    create
  ) {
    musicPlaylists.set(
      userId,
      new Map()
    );
  }

  return (
    musicPlaylists.get(
      userId
    ) ||
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
      normalizePlaylistName(
        name
      )
    ) ||
    null
  );
}

function createUserPlaylistLocal(
  userId,
  name
) {
  const clean =
    String(
      name || ""
    )
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

  if (
    !map.has(
      key
    )
  ) {
    map.set(
      key,
      {
        name:
          clean,

        songs:
          []
      }
    );
  }

  return map.get(
    key
  );
}

// ========================================================
// BOT DATA
// ========================================================

async function ensureBotDataChannel(
  guild
) {
  await guild.channels.fetch();

  let channel =
    guild.channels.cache.find(
      ch =>
        ch.type ===
          ChannelType.GuildText &&
        ch.topic ===
          BOT_DATA_CHANNEL_TOPIC
    );

  if (!channel) {
    channel =
      guild.channels.cache.find(
        ch =>
          ch.type ===
            ChannelType.GuildText &&
          ch.name ===
            BOT_DATA_CHANNEL_NAME
      );
  }

  if (!channel) {
    channel =
      await guild.channels.create({
        name:
          BOT_DATA_CHANNEL_NAME,

        type:
          ChannelType.GuildText,

        topic:
          BOT_DATA_CHANNEL_TOPIC,

        permissionOverwrites: [
          {
            id:
              guild.id,

            deny: [
              PermissionFlagsBits.ViewChannel
            ]
          },

          {
            id:
              client.user.id,

            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.ManageMessages
            ]
          },

          {
            id:
              OWNER_USER_ID,

            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.ReadMessageHistory
            ]
          }
        ],

        reason:
          "Private persistent storage for bot state"
      });

    await channel.send({
      content:
        "🤖 **חדר נתונים של הבוט**\n" +
        "החדר הזה שומר נתונים של הבוט אחרי Restart/Deploy.\n" +
        "**לא למחוק הודעות מכאן.**"
    });
  }

  botDataChannelId =
    channel.id;

  return channel;
}

async function getBotDataChannel() {
  if (
    botDataChannelId
  ) {
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

async function logBotData(
  line
) {
  const channel =
    await getBotDataChannel();

  if (!channel) {
    return false;
  }

  try {
    await channel.send({
      content:
        line,

      allowedMentions: {
        parse:
          []
      }
    });

    return true;

  } catch (
    error
  ) {
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
    encodeSmall(
      value
    );

  const maxChunk =
    1500;

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

async function savePartnerOwnerMessage(
  state
) {
  await logBotData(
    `PARTNER_OWNERMSG|${state.requestId}|${state.ownerDmChannelId || "-"}|${state.ownerDmMessageId || "-"}`
  );
}

// ========================================================
// LOAD PERSISTENT DATA
// ========================================================

async function loadPersistentBotData() {
  const channel =
    await getBotDataChannel();

  if (!channel) {
    return;
  }

  const all =
    [];

  let before;
  let scanned =
    0;

  while (
    scanned < 30000
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

    if (!batch.size) {
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
    (
      a,
      b
    ) =>
      a.createdTimestamp -
      b.createdTimestamp
  );

  const partnerFieldParts =
    new Map();

  for (
    const message of all
  ) {
    const line =
      message.content || "";

    // ===================== YOUTUBE =====================

    if (
      line ===
      "YT_INIT"
    ) {
      youtubeInitialized =
        true;

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
        state.ended =
          true;
      }

      continue;
    }

    // ===================== SUGGESTIONS =====================

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
        choice ===
        "none"
      ) {
        state.votes.delete(
          userId
        );

      } else if (
        choice ===
          "up" ||
        choice ===
          "down"
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

    // ===================== PARTNER =====================

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

          inviteUrl:
            "",

          promoText:
            "",

          notes:
            "",

          status:
            "pending",

          handledAt:
            null,

          ownerDmChannelId:
            null,

          ownerDmMessageId:
            null
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
          data || ""
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
        status ===
          "approved" ||
        status ===
          "rejected"
      ) {
        partnerPendingByUser.delete(
          state.applicantId
        );

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

      continue;
    }

    // ===================== TEMP VOICE =====================

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

    // ===================== MUSIC PLAYLISTS =====================

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
    }
  }

  for (
    const [
      key,
      data
    ] of partnerFieldParts.entries()
  ) {
    const separatorIndex =
      key.indexOf(":");

    const requestId =
      key.slice(
        0,
        separatorIndex
      );

    const field =
      key.slice(
        separatorIndex + 1
      );

    const state =
      partnerStates.get(
        requestId
      );

    if (!state) {
      continue;
    }

    let merged =
      "";

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
    ] of partnerStates.entries()
  ) {
    if (
      state.status ===
        "pending" ||
      state.status ===
        "waiting_publication"
    ) {
      partnerPendingByUser.set(
        state.applicantId,
        requestId
      );
    }

    if (
      (
        state.status ===
          "approved" ||
        state.status ===
          "rejected"
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

// ========================================================
// NICKNAMES
// ========================================================

function getStaffNicknamePrefix(
  member
) {
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

function getAttemptedStaffPrefix(
  name
) {
  const match =
    String(
      name || ""
    )
      .trim()
      .match(
        STAFF_PREFIX_REGEX
      );

  return match
    ? match[1].toUpperCase()
    : null;
}

function hasAnyPrefix(
  name
) {
  return ANY_PREFIX_REGEX.test(
    String(
      name || ""
    ).trim()
  );
}

function stripAnyPrefix(
  name
) {
  let value =
    String(
      name || ""
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

function getBaseName(
  member
) {
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

function getDesiredPrefix(
  member
) {
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

async function applyPreferredNickname(
  member
) {
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
    ).slice(
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

  await owner.send({
    embeds: [
      new EmbedBuilder()
        .setColor(
          0xED4245
        )
        .setTitle(
          "⚠️ נמצאה קידומת לא מורשית"
        )
        .setDescription(
          `${member.user} השתמש/ה בקידומת לפני השם בלי רול שמאפשר אותה.\n\n` +
          `📝 **השם שהיה:** \`${safeText(attemptedName, 100)}\`\n` +
          "🔄 **הניקניים שונה ל:** `אין שם`"
        )
        .setFooter({
          text:
            `User ID: ${member.id}`
        })
        .setTimestamp()
    ],

    components: [
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
        )
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
          .setColor(
            0xED4245
          )
          .setTitle(
            "🚨 ניסיון לזייף דרגת צוות"
          )
          .setDescription(
            `${member.user} ניסה/תה לשים תג של דרגה גבוהה יותר.\n\n` +
            `🎖️ **הדרגה האמיתית:** ${roleName} (\`${realPrefix}\`)\n` +
            `⚠️ **התג שניסה/תה:** \`${attemptedPrefix}\`\n` +
            `📝 **השם שניסה/תה:** \`${safeText(attemptedName, 100)}\`\n\n` +
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

// ========================================================
// WELCOME
// ========================================================

async function sendWelcomeMessage(
  member
) {
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
      .setColor(
        0x5865F2
      )
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

// ========================================================
// STAFF APPLICATION HELPERS
// ========================================================

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

  if (rejectedAt) {
    text +=
      `|rejectedAt:${rejectedAt}`;
  }

  return text;
}

function parseApplicationFooter(
  text
) {
  if (
    !text ||
    !text.includes(
      "applicant:"
    )
  ) {
    return null;
  }

  const data =
    {};

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

function getCooldownExpiry(
  userId
) {
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
  let scanned =
    0;

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

    if (!batch.size) {
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
        data.status ===
          "pending" ||
        data.status ===
          "awaiting_role"
      ) {
        pendingApplications.add(
          applicationKey(
            data.type,
            data.applicant
          )
        );
      }

      if (
        data.type ===
          "initial" &&
        data.status ===
          "rejected" &&
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
              ) || 0
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

function createStaffApplicationModal(
  type
) {
  const modal =
    new ModalBuilder()
      .setCustomId(
        `staff_application_modal:${type}`
      )
      .setTitle(
        type ===
          "promotion"
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
    ] of fields
  ) {
    modal.addComponents(
      new ActionRowBuilder()
        .addComponents(
          new TextInputBuilder()
            .setCustomId(id)
            .setLabel(label)
            .setPlaceholder(
              placeholder
            )
            .setStyle(style)
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
    ).filter(
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

function createHandledRow(
  displayName
) {
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
      .fetch(userId)
      .catch(
        () => null
      );

  if (!user) {
    return false;
  }

  const embed =
    status === "pending"
      ? new EmbedBuilder()
          .setColor(
            0x5865F2
          )
          .setTitle(
            type ===
              "promotion"
              ? "⬆️ בקשת הקידום שלך בבדיקה"
              : "🛡️ הבקשה שלך בבדיקה"
          )
          .setDescription(
            "**הבקשה התקבלה בהצלחה ✅**\n\n" +
            "⏳ **סטטוס: בבדיקה**\n\n" +
            "כשתתקבל החלטה, תקבל/י כאן הודעה פרטית."
          )

      : new EmbedBuilder()
          .setColor(
            0xED4245
          )
          .setTitle(
            type ===
              "promotion"
              ? "❌ בקשת הקידום לא אושרה"
              : "❌ עדכון לגבי הבקשה שלך"
          )
          .setDescription(
            type ===
              "promotion"
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

// ========================================================
// STAFF LOG / MANAGE
// ========================================================

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
        .setColor(
          0x5865F2
        )
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
    .setColor(
      0x5865F2
    )
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

function createManagementButtons(
  member
) {
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
            roleId ===
            ROLE_TOP
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
    ).catch(
      () => null
    );

  if (!member) {
    return interaction.editReply({
      content:
        "❌ המשתמש לא נמצא בשרת.",

      embeds:
        [],

      components:
        []
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
    const roleId of roleIds
  ) {
    const name =
      labels[
        roleId
      ] ||
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

// ========================================================
// TICKETS
// ========================================================

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
    .setColor(
      0x5865F2
    )
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
      .setColor(
        0xED4245
      )
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
      .setColor(
        0x3498DB
      )
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
    .setColor(
      0x5865F2
    )
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
        message.author.id ===
          client.user.id &&
        message.components.some(
          row =>
            row.components.some(
              component =>
                component.customId ===
                "ticket_type"
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
// ========================================================
// GIVEAWAYS
// ========================================================

function parseGiveawayDuration(input) {
  const match =
    String(
      input || ""
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
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
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
    ms >
      30 *
      24 *
      60 *
      60 *
      1000
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
            ? "ההגרלה נסגרה"
            : "🎲 הזוכה נבחר באקראי"
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
              .join(
                "\n"
              )
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

  if (
    message
  ) {
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
                .join(
                  ", "
                )
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

  activeGiveaways.delete(
    giveaway.messageId
  );
}

function scheduleGiveaway(
  giveaway
) {
  const run =
    () => {
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

// ========================================================
// SUGGESTIONS
// ========================================================

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

function createSuggestionModal(
  type
) {
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

function countSuggestionVotes(
  state
) {
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

function suggestionStatusText(
  state
) {
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

function createSuggestionButtons(
  state
) {
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

function getSuggestionIdea(
  message
) {
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

function hydrateSuggestion(
  message
) {
  const existing =
    suggestionStates.get(
      message.id
    );

  if (
    existing
  ) {
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

  if (
    !match
  ) {
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

  if (
    !owner
  ) {
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

  if (
    !owner
  ) {
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

  if (
    !user
  ) {
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
        message.author.id ===
          client.user.id &&
        message.components.some(
          row =>
            row.components.some(
              component =>
                component.customId ===
                "suggestion_type"
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

  if (
    old
  ) {
    await old.edit(
      payload
    );

  } else {
    await channel.send(
      payload
    );
  }
}

// ========================================================
// SOCIALS
// ========================================================

function createSocialsEmbed() {
  return new EmbedBuilder()
    .setColor(
      0x00BFFF
    )
    .setTitle(
      "🌐 הרשתות החברתיות של Roei"
    )
    .setDescription(
      "**כל המקומות שבהם אפשר למצוא אותי במקום אחד!**\n\n" +
      "🎬 **YouTube** — סרטונים, Shorts ולייבים\n" +
      "🟢 **Kick** — שידורים ותוכן בלייב\n" +
      "💚 **WhatsApp** — עדכונים ישירות בערוץ\n\n" +
      `💬 **Discord:** \`${DISCORD_USERNAME}\`\n\n` +
      "👇 לחצו על הכפתור של הרשת שאתם רוצים לפתוח."
    )
    .setFooter({
      text:
        "socials-panel-v1"
    });
}

function createSocialsButtons() {
  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setLabel(
          "YouTube"
        )
        .setEmoji(
          "▶️"
        )
        .setStyle(
          ButtonStyle.Link
        )
        .setURL(
          SOCIAL_YOUTUBE_URL
        ),

      new ButtonBuilder()
        .setLabel(
          "Kick"
        )
        .setEmoji(
          "🟢"
        )
        .setStyle(
          ButtonStyle.Link
        )
        .setURL(
          SOCIAL_KICK_URL
        ),

      new ButtonBuilder()
        .setLabel(
          "WhatsApp"
        )
        .setEmoji(
          "💚"
        )
        .setStyle(
          ButtonStyle.Link
        )
        .setURL(
          SOCIAL_WHATSAPP_URL
        )
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
      limit:
        100
    });

  const old =
    messages.find(
      message =>
        message.author.id ===
          client.user.id &&
        message.embeds[0]
          ?.footer
          ?.text ===
          "socials-panel-v1"
    );

  const payload = {
    embeds: [
      createSocialsEmbed()
    ],

    components: [
      createSocialsButtons()
    ]
  };

  if (
    old
  ) {
    await old.edit(
      payload
    );

  } else {
    await channel.send(
      payload
    );
  }
}

// ========================================================
// PARTNER
// ========================================================

function createPartnerPanelEmbed() {
  return new EmbedBuilder()
    .setColor(
      0x5865F2
    )
    .setTitle(
      "🤝 מערכת Partner / שיתוף פעולה"
    )
    .setDescription(
      "**רוצים לעשות Partner עם השרת שלנו?**\n\n" +
      "Partner אומר שאנחנו מפרסמים את השרת שלכם — ואתם מפרסמים את השרת שלנו.\n\n" +
      `🔗 **הקישור לשרת שלנו:** ${OUR_SERVER_INVITE}\n\n` +
      "לחצו על הכפתור למטה, מלאו את הפרטים והבקשה תישלח לבדיקה.\n" +
      "⏳ אחרי שבקשה מטופלת, ניתן להגיש בקשה חדשה אחרי **7 ימים**."
    )
    .setFooter({
      text:
        "partner-panel-v1"
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
      limit:
        100
    });

  const old =
    messages.find(
      message =>
        message.author.id ===
          client.user.id &&
        message.embeds[0]
          ?.footer
          ?.text ===
          "partner-panel-v1"
    );

  const payload = {
    embeds: [
      createPartnerPanelEmbed()
    ],

    components: [
      createPartnerPanelRow()
    ]
  };

  if (
    old
  ) {
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

function partnerStatusText(
  state
) {
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

function createPartnerOwnerEmbed(
  state
) {
  return new EmbedBuilder()
    .setColor(
      state.status ===
        "approved"
        ? 0x57F287
        : state.status ===
          "rejected"
          ? 0xED4245
          : state.status ===
            "waiting_publication"
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

function createPartnerOwnerButtons(
  state
) {
  const handled =
    state.status ===
      "approved" ||
    state.status ===
      "rejected";

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

function createPartnerApprovalConfirmRow(
  requestId
) {
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

function createPartnerRejectModal(
  requestId
) {
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

function createPartnerEditModal(
  state
) {
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

function getPartnerCooldownExpiry(
  userId
) {
  const expiry =
    partnerCooldowns.get(
      userId
    );

  if (
    !expiry
  ) {
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

async function savePartnerFields(
  state
) {
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

async function sendPartnerRequestToOwner(
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

  if (
    !owner
  ) {
    return null;
  }

  const dm =
    await owner
      .createDM()
      .catch(
        () => null
      );

  if (
    !dm
  ) {
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

  if (
    !message
  ) {
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

async function updatePartnerOwnerMessage(
  state
) {
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

  if (
    !message
  ) {
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

  if (
    user
  ) {
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

async function finalizePartnerApproval(
  state
) {
  const guild =
    await getMainGuild();

  if (
    !guild
  ) {
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

  if (
    !member
  ) {
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
// ========================================================
// TEMP VOICE
// ========================================================

function createTempVoicePanelEmbed() {
  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle("🎙️・ניהול חדר קולי אישי")
    .setDescription(
      `כדי לפתוח חדר אישי, היכנסו ל-<#${TEMP_VOICE_CREATE_CHANNEL_ID}>.\n` +
      "הבוט ייצור לכם חדר קולי ויעביר אתכם אליו אוטומטית.\n\n" +
      "🔒 נעילה • 🔓 פתיחה\n" +
      "🙈 הסתרה • 👁️ הצגה\n" +
      "👥 הגבלת משתמשים • ✏️ שינוי שם\n" +
      "💌 הזמנה • ✅ אישור משתמש\n" +
      "⛔ חסימת משתמש • 👢 הוצאה\n" +
      "👑 העברת בעלות • 🗑️ מחיקת החדר"
    )
    .setFooter({
      text: "temp-voice-panel-v1"
    });
}

function createTempVoicePanelRows() {
  return [
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId("temp_lock")
          .setLabel("נעילה")
          .setEmoji("🔒")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId("temp_unlock")
          .setLabel("פתיחה")
          .setEmoji("🔓")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId("temp_hide")
          .setLabel("הסתרה")
          .setEmoji("🙈")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId("temp_show")
          .setLabel("הצגה")
          .setEmoji("👁️")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId("temp_limit")
          .setLabel("הגבלה")
          .setEmoji("👥")
          .setStyle(ButtonStyle.Primary)
      ),

    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId("temp_rename")
          .setLabel("שינוי שם")
          .setEmoji("✏️")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId("temp_invite")
          .setLabel("הזמנה")
          .setEmoji("💌")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId("temp_permit")
          .setLabel("אישור")
          .setEmoji("✅")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId("temp_reject")
          .setLabel("חסימה")
          .setEmoji("⛔")
          .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
          .setCustomId("temp_kick")
          .setLabel("הוצאה")
          .setEmoji("👢")
          .setStyle(ButtonStyle.Danger)
      ),

    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId("temp_transfer")
          .setLabel("העברת בעלות")
          .setEmoji("👑")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId("temp_delete")
          .setLabel("מחיקת החדר")
          .setEmoji("🗑️")
          .setStyle(ButtonStyle.Danger)
      )
  ];
}

async function setupTempVoicePanel() {
  const channel =
    await client.channels
      .fetch(
        TEMP_VOICE_PANEL_CHANNEL_ID
      )
      .catch(() => null);

  if (
    !channel?.isTextBased()
  ) {
    return;
  }

  const messages =
    await channel.messages
      .fetch({
        limit: 100
      })
      .catch(() => null);

  if (!messages) {
    return;
  }

  const old =
    messages.find(
      message =>
        message.author.id ===
          client.user.id &&
        message.embeds[0]
          ?.footer
          ?.text ===
          "temp-voice-panel-v1"
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
    ).catch(() => {});
  } else {
    await channel.send(
      payload
    ).catch(() => {});
  }
}

function buildTempRoomName(
  member
) {
  const raw =
    stripAnyPrefix(
      member.displayName ||
      member.user.globalName ||
      member.user.username ||
      "User"
    );

  return (
    `TW | ${raw || member.user.username}'s Channel`
  ).slice(
    0,
    100
  );
}

async function getTempRoomOwnedBy(
  guild,
  ownerId
) {
  for (
    const [
      channelId,
      mappedOwner
    ] of tempVoiceOwners.entries()
  ) {
    if (
      mappedOwner !==
      ownerId
    ) {
      continue;
    }

    const room =
      guild.channels.cache.get(
        channelId
      ) ||
      await guild.channels
        .fetch(
          channelId
        )
        .catch(() => null);

    if (
      room?.type ===
        ChannelType.GuildVoice &&
      room.parentId ===
        TEMP_VOICE_CATEGORY_ID
    ) {
      return room;
    }

    tempVoiceOwners.delete(
      channelId
    );
  }

  return null;
}

async function createTempVoiceRoom(
  member
) {
  if (
    !member ||
    member.user.bot ||
    tempVoiceCreating.has(
      member.id
    )
  ) {
    return;
  }

  tempVoiceCreating.add(
    member.id
  );

  try {
    const existing =
      await getTempRoomOwnedBy(
        member.guild,
        member.id
      );

    if (existing) {
      await member.voice
        .setChannel(
          existing
        )
        .catch(() => {});

      return;
    }

    const permissions = [
      {
        id:
          member.guild.id,

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
      permissions.push({
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
      await member.guild
        .channels
        .create({
          name:
            buildTempRoomName(
              member
            ),

          type:
            ChannelType.GuildVoice,

          parent:
            TEMP_VOICE_CATEGORY_ID,

          permissionOverwrites:
            permissions,

          reason:
            `חדר אישי של ${member.user.tag}`
        });

    tempVoiceOwners.set(
      room.id,
      member.id
    );

    await logBotData(
      `TEMP_CREATE|${room.id}|${member.id}`
    );

    try {
      await member.voice
        .setChannel(
          room
        );
    } catch (
      error
    ) {
      tempVoiceOwners.delete(
        room.id
      );

      await logBotData(
        `TEMP_DELETE|${room.id}`
      );

      await room.delete()
        .catch(() => {});

      throw error;
    }

  } finally {
    tempVoiceCreating.delete(
      member.id
    );
  }
}

async function deleteTempVoiceRoom(
  room,
  reason =
    "החדר האישי התרוקן"
) {
  if (!room) {
    return;
  }

  tempVoiceOwners.delete(
    room.id
  );

  await logBotData(
    `TEMP_DELETE|${room.id}`
  );

  await room.delete(
    reason
  ).catch(() => {});
}

async function restoreTempVoiceRooms(
  guild
) {
  for (
    const [
      channelId
    ] of [
      ...tempVoiceOwners.entries()
    ]
  ) {
    const room =
      guild.channels.cache.get(
        channelId
      ) ||
      await guild.channels
        .fetch(
          channelId
        )
        .catch(() => null);

    if (
      !room ||
      room.type !==
        ChannelType.GuildVoice ||
      room.parentId !==
        TEMP_VOICE_CATEGORY_ID
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
      room.members.size ===
      0
    ) {
      await deleteTempVoiceRoom(
        room,
        "ניקוי חדר ריק אחרי הפעלה מחדש"
      );
    }
  }
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
    ).catch(
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

  if (
    tempVoiceOwners.get(
      channelId
    ) !==
    interaction.user.id
  ) {
    return null;
  }

  if (
    member.voice.channelId !==
    channelId
  ) {
    return null;
  }

  const room =
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
      .catch(() => null);

  if (
    room?.type !==
    ChannelType.GuildVoice
  ) {
    return null;
  }

  return room;
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
        .setMinValues(1)
        .setMaxValues(1)
    );
}

function createTempRenameModal(
  room
) {
  return new ModalBuilder()
    .setCustomId(
      `temp_rename_modal:${room.id}`
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
              "השם החדש"
            )
            .setStyle(
              TextInputStyle.Short
            )
            .setRequired(
              true
            )
            .setMaxLength(
              100
            )
            .setValue(
              room.name.slice(
                0,
                100
              )
            )
        )
    );
}

function createTempLimitModal(
  room
) {
  return new ModalBuilder()
    .setCustomId(
      `temp_limit_modal:${room.id}`
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
              "0 = ללא הגבלה"
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
                room.userLimit ||
                0
              )
            )
        )
    );
}

async function handleTempVoiceButton(
  interaction
) {
  const room =
    await getControlledTempRoom(
      interaction
    );

  if (!room) {
    return interaction.reply({
      content:
        "❌ צריך להיות בתוך החדר האישי שלך כדי להשתמש בפאנל.",

      ephemeral:
        true
    });
  }

  if (
    interaction.customId ===
    "temp_lock"
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
        "🔒 החדר ננעל.",

      ephemeral:
        true
    });
  }

  if (
    interaction.customId ===
    "temp_unlock"
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
        "🔓 החדר נפתח.",

      ephemeral:
        true
    });
  }

  if (
    interaction.customId ===
    "temp_hide"
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
        "🙈 החדר הוסתר.",

      ephemeral:
        true
    });
  }

  if (
    interaction.customId ===
    "temp_show"
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
        "👁️ החדר מוצג שוב.",

      ephemeral:
        true
    });
  }

  if (
    interaction.customId ===
    "temp_rename"
  ) {
    return interaction.showModal(
      createTempRenameModal(
        room
      )
    );
  }

  if (
    interaction.customId ===
    "temp_limit"
  ) {
    return interaction.showModal(
      createTempLimitModal(
        room
      )
    );
  }

  if (
    interaction.customId ===
    "temp_invite"
  ) {
    return interaction.reply({
      content:
        "💌 בחר משתמש להזמנה:",

      components: [
        tempUserSelectRow(
          "invite",
          room.id,
          "בחר משתמש"
        )
      ],

      ephemeral:
        true
    });
  }

  if (
    interaction.customId ===
    "temp_permit"
  ) {
    return interaction.reply({
      content:
        "✅ בחר משתמש לאישור:",

      components: [
        tempUserSelectRow(
          "permit",
          room.id,
          "בחר משתמש"
        )
      ],

      ephemeral:
        true
    });
  }

  if (
    interaction.customId ===
    "temp_reject"
  ) {
    return interaction.reply({
      content:
        "⛔ בחר משתמש לחסימה:",

      components: [
        tempUserSelectRow(
          "reject",
          room.id,
          "בחר משתמש"
        )
      ],

      ephemeral:
        true
    });
  }

  if (
    interaction.customId ===
    "temp_kick"
  ) {
    return interaction.reply({
      content:
        "👢 בחר משתמש להוצאה:",

      components: [
        tempUserSelectRow(
          "kick",
          room.id,
          "בחר משתמש"
        )
      ],

      ephemeral:
        true
    });
  }

  if (
    interaction.customId ===
    "temp_transfer"
  ) {
    return interaction.reply({
      content:
        "👑 בחר בעלים חדש:",

      components: [
        tempUserSelectRow(
          "transfer",
          room.id,
          "בחר משתמש"
        )
      ],

      ephemeral:
        true
    });
  }

  if (
    interaction.customId ===
    "temp_delete"
  ) {
    await interaction.reply({
      content:
        "🗑️ החדר נמחק.",

      ephemeral:
        true
    });

    await deleteTempVoiceRoom(
      room,
      `נמחק על ידי ${interaction.user.tag}`
    );
  }
}

async function handleTempVoiceUserSelect(
  interaction
) {
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
        "❌ החדר לא קיים או שאינך הבעלים שלו.",

      components:
        []
    });
  }

  const targetId =
    interaction.values[0];

  if (
    targetId ===
    interaction.user.id
  ) {
    return interaction.update({
      content:
        "❌ אי אפשר לבחור את עצמך.",

      components:
        []
    });
  }

  const target =
    await fetchFreshMember(
      interaction.guild,
      targetId
    ).catch(
      () => null
    );

  if (
    !target ||
    target.user.bot
  ) {
    return interaction.update({
      content:
        "❌ המשתמש לא נמצא.",

      components:
        []
    });
  }

  if (
    action ===
    "invite"
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

    await target.user.send({
      embeds: [
        new EmbedBuilder()
          .setColor(
            0x57F287
          )
          .setTitle(
            "💌 הוזמנת לחדר קולי"
          )
          .setDescription(
            `${interaction.user} הזמין אותך לחדר **${room.name}**.`
          )
      ]
    }).catch(() => {});

    return interaction.update({
      content:
        `✅ ${target} קיבל הזמנה וגישה.`,

      components:
        []
    });
  }

  if (
    action ===
    "permit"
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
        `✅ ${target} קיבל גישה.`,

      components:
        []
    });
  }

  if (
    action ===
    "reject"
  ) {
    await room.permissionOverwrites.edit(
      target.id,
      {
        Connect:
          false
      }
    );

    if (
      target.voice.channelId ===
      room.id
    ) {
      await target.voice
        .disconnect()
        .catch(() => {});
    }

    return interaction.update({
      content:
        `⛔ ${target} נחסם מהחדר.`,

      components:
        []
    });
  }

  if (
    action ===
    "kick"
  ) {
    if (
      target.voice.channelId !==
      room.id
    ) {
      return interaction.update({
        content:
          "❌ המשתמש לא נמצא בחדר.",

        components:
          []
      });
    }

    await target.voice
      .disconnect()
      .catch(() => {});

    return interaction.update({
      content:
        `👢 ${target} הוצא מהחדר.`,

      components:
        []
    });
  }

  if (
    action ===
    "transfer"
  ) {
    if (
      target.voice.channelId !==
      room.id
    ) {
      return interaction.update({
        content:
          "❌ אפשר להעביר בעלות רק למישהו שנמצא בחדר.",

        components:
          []
      });
    }

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
          true
      }
    );

    await room
      .setName(
        buildTempRoomName(
          target
        )
      )
      .catch(() => {});

    return interaction.update({
      content:
        `👑 הבעלות הועברה ל-${target}.`,

      components:
        []
    });
  }
}

// ========================================================
// ARCADE
// ========================================================

function createArcadePanelEmbed() {
  return new EmbedBuilder()
    .setColor(
      0x9B59B6
    )
    .setTitle(
      "🕹️ Roei Arcade"
    )
    .setDescription(
      `המשחקים ייפתחו ב-<#${ARCADE_GAMES_CHANNEL_ID}>.\n\n` +
      "❌⭕ **איקס עיגול**\n" +
      "💣 **בומבה**\n" +
      "🕵️ **נחש את המתחזה**\n" +
      "✊✋✌️ **אבן נייר ומספריים**\n\n" +
      "👇 בחרו משחק מהתפריט."
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
          "בחר משחק..."
        )
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(
              "איקס עיגול"
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
      .catch(() => null);

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
        message.author.id ===
          client.user.id &&
        message.embeds[0]
          ?.footer
          ?.text ===
          "arcade-panel-v1"
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
    );
  } else {
    await channel.send(
      payload
    );
  }
}

function randomItem(
  array
) {
  return array[
    crypto.randomInt(
      array.length
    )
  ];
}

function createTttChallengeRow(
  gameId
) {
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

function getTttWinner(
  board
) {
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
      board[a] ===
        board[b] &&
      board[a] ===
        board[c]
    ) {
      return board[a];
    }
  }

  return null;
}

function createTttBoardRows(
  game
) {
  const rows =
    [];

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

function createTttEmbed(
  game
) {
  let status =
    "";

  if (
    game.winner
  ) {
    const winnerId =
      game.winner ===
        "❌"
        ? game.playerX
        : game.playerO;

    status =
      `🏆 המנצח: <@${winnerId}>`;

  } else if (
    game.draw
  ) {
    status =
      "🤝 תיקו!";

  } else {
    status =
      `🎯 התור של <@${game.turn}>`;
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
    );
}

function createRpsChallengeRow(
  gameId
) {
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

function createRpsChoiceRow(
  gameId
) {
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

function rpsEmoji(
  choice
) {
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

function createImpostorLobbyRows(
  gameId
) {
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

function createImpostorLobbyEmbed(
  game
) {
  const players =
    [
      ...game.players
    ]
      .map(
        id =>
          `<@${id}>`
      )
      .join(
        "\n"
      );

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
      "כולם יקבלו אותה מילה ב-DM — חוץ מהמתחזה."
    );
}

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
  "דברים לבית ספר",
  "דברים במטבח",
  "מקצועות",
  "צבעים"
];

function createBombaLobbyRows(
  gameId
) {
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

function createBombaLobbyEmbed(
  game
) {
  const players =
    [
      ...game.players
    ]
      .map(
        id =>
          `<@${id}>`
      )
      .join(
        "\n"
      );

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
      "צריך לפחות **2 שחקנים**."
    );
}

// ========================================================
// YOUTUBE NOTIFICATIONS
// ========================================================

function decodeXml(
  text
) {
  return String(
    text || ""
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

function parseYouTubeFeed(
  xml
) {
  const entries =
    [];

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
        escaped =
          false;

      } else if (
        char === "\\"
      ) {
        escaped =
          true;

      } else if (
        char === '"'
      ) {
        inString =
          false;
      }

      continue;
    }

    if (
      char === '"'
    ) {
      inString =
        true;

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

    if (found) {
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

async function getYouTubeVideoMeta(
  videoId
) {
  const fallback = {
    title:
      null,

    isLiveNow:
      false,

    isLiveContent:
      false,

    endTimestamp:
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
      const marker of [
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
      player
        ?.microformat
        ?.playerMicroformatRenderer ||
      {};

    const live =
      micro.liveBroadcastDetails ||
      {};

    return {
      title:
        details.title ||
        micro.title?.simpleText ||
        null,

      isLiveNow:
        live.isLiveNow ===
          true ||
        /"isLiveNow":true/.test(
          html
        ),

      isLiveContent:
        details.isLiveContent ===
          true ||
        /"isLiveContent":true/.test(
          html
        ),

      endTimestamp:
        live.endTimestamp ||
        null,

      isShortsEligible:
        details.isShortsEligible ===
          true ||
        /"isShortsEligible":true/.test(
          html
        ),

      thumbnail:
        details.thumbnail
          ?.thumbnails
          ?.at(-1)
          ?.url ||
        fallback.thumbnail
    };

  } catch {
    return fallback;
  }
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
      .catch(() => null);

  if (
    !channel?.isTextBased()
  ) {
    return null;
  }

  const title =
    meta.title ||
    entry.title;

  const url =
    type === "short"
      ? `https://www.youtube.com/shorts/${entry.videoId}`
      : `https://www.youtube.com/watch?v=${entry.videoId}`;

  const embed =
    new EmbedBuilder()
      .setColor(
        type === "live"
          ? 0xED4245
          : type === "short"
            ? 0x9B59B6
            : 0x3498DB
      )
      .setTitle(
        type === "live"
          ? "🔴 אנחנו בלייב עכשיו!"
          : type === "short"
            ? "📱 SHORT חדש עלה!"
            : "🎬 סרטון חדש עלה!"
      )
      .setDescription(
        `**${title}**`
      )
      .setImage(
        meta.thumbnail
      )
      .setTimestamp();

  return channel.send({
    content:
      type === "live"
        ? "@everyone 🔴 **אנחנו בלייב עכשיו!**"
        : null,

    embeds: [
      embed
    ],

    components: [
      new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setLabel(
              type === "live"
                ? "היכנסו ללייב"
                : "צפו עכשיו"
            )
            .setEmoji(
              "▶️"
            )
            .setStyle(
              ButtonStyle.Link
            )
            .setURL(
              url
            )
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
            parse:
              []
          }
  }).catch(
    () => null
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
        youtubeSeen.set(
          entry.videoId,
          {
            videoId:
              entry.videoId,

            type:
              "ignored",

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

      if (
        !sent
      ) {
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

  } catch (
    error
  ) {
    console.error(
      "❌ בדיקת YouTube:",
      error.message
    );

  } finally {
    youtubePollRunning =
      false;
  }
}

// ========================================================
// CLEAR
// ========================================================

async function deleteChannelMessages(
  channel,
  requestedAmount,
  protectedIds =
    new Set()
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
    const fetched =
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
      !fetched.size
    ) {
      break;
    }

    for (
      const message of
      fetched.values()
    ) {
      if (
        remaining <= 0
      ) {
        break;
      }

      if (
        protectedIds.has(
          message.id
        )
      ) {
        continue;
      }

      try {
        await message.delete();

        deleted++;

        if (
          remaining !==
          Infinity
        ) {
          remaining--;
        }

        await new Promise(
          resolve =>
            setTimeout(
              resolve,
              250
            )
        );

      } catch {}
    }

    before =
      fetched.last()?.id;

    if (
      !before ||
      fetched.size < 100
    ) {
      break;
    }
  }

  return deleted;
}

// ========================================================
// MAIN SLASH COMMANDS
// ========================================================

const staffManageCommand =
  new SlashCommandBuilder()
    .setName(
      "staffmanage"
    )
    .setDescription(
      "פתיחת פאנל ניהול הצוות"
    );

const giveawayCommand =
  new SlashCommandBuilder()
    .setName(
      "giveaway"
    )
    .setDescription(
      "פתיחת הגרלה חדשה"
    )
    .addStringOption(
      option =>
        option
          .setName(
            "prize"
          )
          .setDescription(
            "מה הפרס?"
          )
          .setRequired(
            true
          )
    )
    .addStringOption(
      option =>
        option
          .setName(
            "duration"
          )
          .setDescription(
            "לדוגמה 10m / 2h / 1d"
          )
          .setRequired(
            true
          )
    )
    .addIntegerOption(
      option =>
        option
          .setName(
            "winners"
          )
          .setDescription(
            "כמה זוכים?"
          )
          .setMinValue(
            1
          )
          .setMaxValue(
            10
          )
    );

const clearCommand =
  new SlashCommandBuilder()
    .setName(
      "clear"
    )
    .setDescription(
      "מחיקת הודעות מהחדר"
    )
    .addIntegerOption(
      option =>
        option
          .setName(
            "amount"
          )
          .setDescription(
            "0 = כל ההודעות בחדר"
          )
          .setRequired(
            true
          )
          .setMinValue(
            0
          )
    );

// ========================================================
// MAIN READY
// ========================================================

client.once(
  Events.ClientReady,
  async readyClient => {
    console.log(
      `✅ הבוט הראשי מחובר בתור ${readyClient.user.tag}`
    );

    try {
      const rest =
        new REST({
          version:
            "10"
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

    } catch (
      error
    ) {
      console.error(
        "❌ רישום פקודות הבוט הראשי:",
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

      await loadApplicationState();

      await guild.members.fetch();

      for (
        const member of
        guild.members.cache.values()
      ) {
        if (
          member.user.bot
        ) {
          continue;
        }

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

      await restoreTempVoiceRooms(
        guild
      );

    } catch (
      error
    ) {
      console.error(
        "❌ טעינת נתוני הבוט:",
        error
      );
    }

    await setupTicketPanel()
      .catch(console.error);

    await setupSuggestionsPanel()
      .catch(console.error);

    await setupSocialsPanel()
      .catch(console.error);

    await setupPartnerPanel()
      .catch(console.error);

    await setupTempVoicePanel()
      .catch(console.error);

    await setupArcadePanel()
      .catch(console.error);

    await pollYouTube();

    setInterval(
      () => {
        pollYouTube()
          .catch(() => {});
      },
      YOUTUBE_CHECK_INTERVAL_MS
    );
  }
);

// ========================================================
// MAIN EVENTS
// ========================================================

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
        const room =
          oldState.guild
            .channels
            .cache
            .get(
              oldState.channelId
            );

        if (
          room?.type ===
            ChannelType.GuildVoice &&
          room.members.size === 0
        ) {
          await deleteTempVoiceRoom(
            room
          );
        }
      }

    } catch (
      error
    ) {
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
    );
  }
);

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

    await applyPreferredNickname(
      member
    );
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
      const oldRole =
        getHighestLadderRoleId(
          oldMember
        );

      const newRole =
        getHighestLadderRoleId(
          newMember
        );

      const partnerChanged =
        oldMember.roles.cache.has(
          PARTNER_ROLE_ID
        ) !==
        newMember.roles.cache.has(
          PARTNER_ROLE_ID
        );

      if (
        oldRole !== newRole ||
        partnerChanged
      ) {
        await applyPreferredNickname(
          newMember
        );

        if (
          oldRole !== newRole
        ) {
          await sendStaffChangeDM(
            newMember,
            oldRole,
            newRole
          );
        }

        return;
      }

      if (
        oldMember.nickname !==
        newMember.nickname
      ) {
        const name =
          newMember.nickname ||
          newMember.user.globalName ||
          newMember.user.username;

        if (
          newRole
        ) {
          const fake =
            await handleFakePromotion(
              newMember,
              name
            );

          if (
            !fake
          ) {
            await applyPreferredNickname(
              newMember
            );
          }

        } else if (
          getDesiredPrefix(
            newMember
          )
        ) {
          await applyPreferredNickname(
            newMember
          );

        } else if (
          hasAnyPrefix(
            name
          )
        ) {
          await handleUnauthorizedPrefix(
            newMember,
            name
          );
        }
      }

    } catch (
      error
    ) {
      console.error(
        "❌ guildMemberUpdate:",
        error
      );
    }
  }
);

// ========================================================
// MAIN INTERACTIONS
// ========================================================

client.on(
  "interactionCreate",
  async interaction => {
    try {

      // ===================== CLEAR =====================

      if (
        interaction.isChatInputCommand() &&
        interaction.commandName ===
          "clear"
      ) {
        const member =
          await fetchFreshMember(
            interaction.guild,
            interaction.user.id
          );

        if (
          !hasClearAccess(
            member
          )
        ) {
          return interaction.reply({
            content:
              "❌ רק Team ומעלה יכולים להשתמש בפקודה.",

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

        const reply =
          await interaction
            .fetchReply()
            .catch(
              () => null
            );

        const protectedIds =
          new Set();

        if (
          reply?.id
        ) {
          protectedIds.add(
            reply.id
          );
        }

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
                  ? `✅ נמחקו **${deleted} הודעות**.`
                  : `✅ נמחקו **${deleted} מתוך ${amount} הודעות**.`
              )
              .setFooter({
                text:
                  "ההודעה תימחק בעוד 10 שניות"
              })
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

        return;
      }

      // ===================== TEMP VOICE =====================

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
        const roomId =
          interaction.customId
            .split(":")[1];

        const room =
          await getControlledTempRoom(
            interaction,
            roomId
          );

        if (!room) {
          return interaction.reply({
            content:
              "❌ החדר לא נמצא.",

            ephemeral:
              true
          });
        }

        const name =
          interaction.fields
            .getTextInputValue(
              "room_name"
            )
            .trim()
            .slice(
              0,
              100
            );

        await room.setName(
          name
        );

        return interaction.reply({
          content:
            `✅ שם החדר שונה ל-**${name}**.`,

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
        const roomId =
          interaction.customId
            .split(":")[1];

        const room =
          await getControlledTempRoom(
            interaction,
            roomId
          );

        if (!room) {
          return interaction.reply({
            content:
              "❌ החדר לא נמצא.",

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
          !Number.isInteger(
            limit
          ) ||
          limit < 0 ||
          limit > 99
        ) {
          return interaction.reply({
            content:
              "❌ צריך מספר בין 0 ל-99.",

            ephemeral:
              true
          });
        }

        await room.setUserLimit(
          limit
        );

        return interaction.reply({
          content:
            limit === 0
              ? "✅ הוסרה ההגבלה."
              : `✅ ההגבלה שונתה ל-${limit}.`,

          ephemeral:
            true
        });
      }

      // ===================== OWNER NICKNAME =====================

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
              "❌ אין הרשאה.",

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
                      "הניקניים החדש"
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
          return;
        }

        const [
          ,
          guildId,
          memberId
        ] =
          interaction.customId
            .split(":");

        const guild =
          await client.guilds
            .fetch(
              guildId
            );

        const member =
          await fetchFreshMember(
            guild,
            memberId
          );

        const nickname =
          interaction.fields
            .getTextInputValue(
              "new_nickname"
            )
            .trim();

        await member.setNickname(
          nickname
        );

        return interaction.reply({
          content:
            "✅ הניקניים שונה.",

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

        const prize =
          interaction.options
            .getString(
              "prize",
              true
            );

        const duration =
          parseGiveawayDuration(
            interaction.options
              .getString(
                "duration",
                true
              )
          );

        const winners =
          interaction.options
            .getInteger(
              "winners"
            ) ||
          1;

        if (!duration) {
          return interaction.reply({
            content:
              "❌ זמן לא תקין. לדוגמה: `10m`, `2h`, `1d`.",

            ephemeral:
              true
          });
        }

        const giveaway = {
          messageId:
            null,

          channelId:
            interaction.channelId,

          guildId:
            interaction.guildId,

          hostId:
            interaction.user.id,

          prize,

          winnerCount:
            winners,

          endsAt:
            Date.now() +
            duration,

          participants:
            new Set(),

          guildIcon:
            interaction.guild.iconURL(),

          ended:
            false,

          timer:
            null
        };

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

        return interaction.reply({
          content:
            `✅ ההגרלה נפתחה: ${message.url}`,

          ephemeral:
            true
        });
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
              "❌ ההגרלה לא פעילה.",

            ephemeral:
              true
          });
        }

        if (
          giveaway.participants.has(
            interaction.user.id
          )
        ) {
          giveaway.participants.delete(
            interaction.user.id
          );
        } else {
          giveaway.participants.add(
            interaction.user.id
          );
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
        });

        return interaction.reply({
          content:
            giveaway.participants.has(
              interaction.user.id
            )
              ? "✅ נכנסת להגרלה!"
              : "↩️ יצאת מההגרלה.",

          ephemeral:
            true
        });
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
          );

        if (
          !hasStaffAccess(
            member
          )
        ) {
          return interaction.reply({
            content:
              "❌ אין הרשאה.",

            ephemeral:
              true
          });
        }

        const giveaway =
          activeGiveaways.get(
            interaction.message.id
          );

        if (!giveaway) {
          return interaction.reply({
            content:
              "❌ ההגרלה לא פעילה.",

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
          "✅ ההגרלה נסגרה."
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
              "❌ רק הבעלים יכול להשתמש בזה.",

            ephemeral:
              true
          });
        }

        return interaction.reply({
          content:
            "🛡️ בחר משתמש:",

          components: [
            new ActionRowBuilder()
              .addComponents(
                new UserSelectMenuBuilder()
                  .setCustomId(
                    "manage_select_user"
                  )
                  .setPlaceholder(
                    "בחר משתמש"
                  )
                  .setMinValues(1)
                  .setMaxValues(1)
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
        const member =
          await fetchFreshMember(
            interaction.guild,
            interaction.values[0]
          );

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
              "❌ רק הבעלים יכול לעשות את זה.",

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
          );

        return interaction.update({
          content:
            "➕ באיזו דרגה להוסיף?",

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
              "❌ רק הבעלים יכול לעשות את זה.",

            ephemeral:
              true
          });
        }

        const [
          ,
          targetId,
          roleId
        ] =
          interaction.customId
            .split(":");

        await interaction.deferUpdate();

        const member =
          await fetchFreshMember(
            interaction.guild,
            targetId
          );

        await member.roles.add(
          roleId
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
            "➕ הוספה לצוות",

          toRoleId:
            roleId
        });

        return refreshManagementPanel(
          interaction,
          targetId,
          "✅ המשתמש נוסף לצוות."
        );
      }

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
              "❌ רק הבעלים יכול לעשות את זה.",

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
          );

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
          return interaction.reply({
            content:
              "🏆 אין דרגה גבוהה יותר.",

            ephemeral:
              true
          });
        }

        return interaction.update({
          content:
            "⬆️ בחר דרגה:",

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
              "❌ רק הבעלים יכול לעשות את זה.",

            ephemeral:
              true
          });
        }

        const [
          ,
          targetId,
          roleId
        ] =
          interaction.customId
            .split(":");

        await interaction.deferUpdate();

        const member =
          await fetchFreshMember(
            interaction.guild,
            targetId
          );

        const oldRole =
          getHighestLadderRoleId(
            member
          );

        await member.roles.add(
          roleId
        );

        if (
          oldRole &&
          oldRole !== roleId
        ) {
          await member.roles.remove(
            oldRole
          ).catch(() => {});
        }

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
            "⬆️ קידום צוות",

          fromRoleId:
            oldRole,

          toRoleId:
            roleId
        });

        return refreshManagementPanel(
          interaction,
          targetId,
          "✅ הקידום בוצע."
        );
      }

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
              "❌ רק הבעלים יכול לעשות את זה.",

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
          );

        const currentRole =
          getHighestLadderRoleId(
            member
          );

        const index =
          LADDER_ROLE_IDS.indexOf(
            currentRole
          );

        if (
          index <= 0
        ) {
          return refreshManagementPanel(
            interaction,
            targetId,
            "ℹ️ Helper היא הדרגה הנמוכה ביותר."
          );
        }

        const previousRole =
          LADDER_ROLE_IDS[
            index - 1
          ];

        await member.roles.add(
          previousRole
        );

        await member.roles.remove(
          currentRole
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
            currentRole,

          toRoleId:
            previousRole
        });

        return refreshManagementPanel(
          interaction,
          targetId,
          "✅ הדרגה הורדה."
        );
      }

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
              "❌ רק הבעלים יכול לעשות את זה.",

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
          );

        const oldRole =
          getHighestLadderRoleId(
            member
          );

        const roles =
          LADDER_ROLE_IDS.filter(
            id =>
              member.roles.cache.has(
                id
              )
          );

        if (
          roles.length
        ) {
          await member.roles.remove(
            roles
          );
        }

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
            "❌ הסרה מהצוות",

          fromRoleId:
            oldRole,

          toRoleId:
            null
        });

        return refreshManagementPanel(
          interaction,
          targetId,
          "✅ המשתמש הוסר מהצוות."
        );
      }

      // ===================== PARTNER =====================

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
              "⏳ כבר יש לך בקשה שממתינה.",

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
              `⏳ אפשר להגיש שוב <t:${Math.floor(expiry / 1000)}:R>.`,

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
          !/^https?:\/\/(?:www\.)?(?:discord\.gg|discord\.com\/invite)\//i.test(
            inviteUrl
          )
        ) {
          return interaction.reply({
            content:
              "❌ קישור Discord לא תקין.",

            ephemeral:
              true
          });
        }

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

        await sendPartnerRequestToOwner(
          state
        );

        return interaction.reply({
          content:
            "✅ הבקשה נשלחה לבדיקה.",

          ephemeral:
            true
        });
      }

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "partner_"
        ) &&
        interaction.customId !==
          "partner_apply"
      ) {
        if (
          interaction.user.id !==
          OWNER_USER_ID
        ) {
          return interaction.reply({
            content:
              "❌ רק הבעלים יכול לטפל בבקשות Partner.",

            ephemeral:
              true
          });
        }
      }

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "partner_approve:"
        )
      ) {
        const requestId =
          interaction.customId
            .split(":")[1];

        return interaction.reply({
          content:
            "האם הוא כבר פרסם את השרת שלך?",

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
        const requestId =
          interaction.customId
            .split(":")[1];

        const state =
          partnerStates.get(
            requestId
          );

        if (!state) {
          return interaction.update({
            content:
              "❌ הבקשה לא נמצאה.",

            components:
              []
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
            "⏳ ממתינים שהוא יפרסם.",

          components:
            []
        });
      }

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "partner_confirm_yes:"
        )
      ) {
        const requestId =
          interaction.customId
            .split(":")[1];

        const state =
          partnerStates.get(
            requestId
          );

        if (!state) {
          return interaction.update({
            content:
              "❌ הבקשה לא נמצאה.",

            components:
              []
          });
        }

        await interaction.deferUpdate();

        await finalizePartnerApproval(
          state
        );

        return interaction.editReply({
          content:
            "✅ ה-Partner אושר.",

          components:
            []
        });
      }

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "partner_reject:"
        )
      ) {
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
          return;
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
              "❌ הבקשה לא נמצאה.",

            ephemeral:
              true
          });
        }

        const reason =
          interaction.fields
            .getTextInputValue(
              "reason"
            );

        await rejectPartnerRequest(
          state,
          reason
        );

        return interaction.reply(
          "✅ הבקשה נדחתה."
        );
      }

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "partner_edit:"
        )
      ) {
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
              "❌ הבקשה לא נמצאה.",

            ephemeral:
              true
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
          return;
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
              "❌ הבקשה לא נמצאה.",

            ephemeral:
              true
          });
        }

        state.promoText =
          interaction.fields
            .getTextInputValue(
              "promo_text"
            );

        await savePartnerField(
          requestId,
          "promoText",
          state.promoText
        );

        await updatePartnerOwnerMessage(
          state
        );

        return interaction.reply(
          "✅ הכיתוב עודכן."
        );
      }

      // ===================== SUGGESTIONS =====================

      if (
        interaction.isStringSelectMenu() &&
        interaction.customId ===
          "suggestion_type"
      ) {
        const type =
          interaction.values[0];

        return interaction.showModal(
          createSuggestionModal(
            type
          )
        );
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

        const idea =
          interaction.fields
            .getTextInputValue(
              "idea"
            );

        const channel =
          await client.channels.fetch(
            config.channelId
          );

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
          await channel.send({
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

        return interaction.reply({
          content:
            `✅ הרעיון נשלח: ${message.url}`,

          ephemeral:
            true
        });
      }

      if (
        interaction.isButton() &&
        (
          interaction.customId ===
            "suggestion_vote_up" ||
          interaction.customId ===
            "suggestion_vote_down"
        )
      ) {
        const state =
          hydrateSuggestion(
            interaction.message
          );

        if (!state) {
          return interaction.reply({
            content:
              "❌ לא מצאתי את ההצעה.",

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
              "❌ אי אפשר להצביע לעצמך.",

            ephemeral:
              true
          });
        }

        const choice =
          interaction.customId ===
            "suggestion_vote_up"
            ? "up"
            : "down";

        const previous =
          state.votes.get(
            interaction.user.id
          );

        if (
          previous ===
          choice
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
          "✅ ההצבעה עודכנה."
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
              "❌ רק הצוות יכול לפתוח את האפשרויות האלה.",

            ephemeral:
              true
          });
        }

        return interaction.reply({
          content:
            "🛡️ אפשרויות צוות:",

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
              "❌ אין הרשאה.",

            ephemeral:
              true
          });
        }

        const messageId =
          interaction.customId
            .split(":")[1];

        const original =
          await interaction.channel
            .messages
            .fetch(
              messageId
            )
            .catch(() => null);

        if (!original) {
          return interaction.reply({
            content:
              "❌ ההצעה לא נמצאה.",

            ephemeral:
              true
          });
        }

        const state =
          hydrateSuggestion(
            original
          );

        if (!state) {
          return interaction.reply({
            content:
              "❌ ההצעה לא נמצאה.",

            ephemeral:
              true
          });
        }

        const sent =
          await sendSuggestionForwardDM(
            original,
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
          original,
          state
        );

        return interaction.reply({
          content:
            "✅ ההצעה נשלחה לבעלים.",

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
              "❌ אין הרשאה.",

            ephemeral:
              true
          });
        }

        const messageId =
          interaction.customId
            .split(":")[1];

        const original =
          await interaction.channel
            .messages
            .fetch(
              messageId
            )
            .catch(() => null);

        if (!original) {
          return interaction.reply({
            content:
              "❌ ההצעה לא נמצאה.",

            ephemeral:
              true
          });
        }

        const state =
          hydrateSuggestion(
            original
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

        await updateSuggestionMessage(
          original,
          state
        );

        await sendSuggestionCreatorDM(
          state,
          false,
          interaction.user
        );

        return interaction.reply({
          content:
            "✅ ההצעה נסגרה.",

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
              "❌ רק הבעלים יכול לאשר הצעה.",

            ephemeral:
              true
          });
        }

        const messageId =
          interaction.customId
            .split(":")[1];

        const original =
          await interaction.channel
            .messages
            .fetch(
              messageId
            )
            .catch(() => null);

        if (!original) {
          return interaction.reply({
            content:
              "❌ ההצעה לא נמצאה.",

            ephemeral:
              true
          });
        }

        const state =
          hydrateSuggestion(
            original
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

        await updateSuggestionMessage(
          original,
          state
        );

        await sendSuggestionCreatorDM(
          state,
          true
        );

        return interaction.reply({
          content:
            "✅ ההצעה אושרה ונמצאת בטיפול.",

          ephemeral:
            true
        });
      }

      // ===================== TICKETS =====================

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

          const appType =
            roleId
              ? "promotion"
              : "initial";

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
                  `⏳ אפשר להגיש בקשה חדשה <t:${Math.floor(expiry / 1000)}:R>.`,

                ephemeral:
                  true
              });
            }
          }

          const key =
            applicationKey(
              appType,
              interaction.user.id
            );

          if (
            pendingApplications.has(
              key
            )
          ) {
            return interaction.reply({
              content:
                "⏳ כבר יש לך בקשה שממתינה לבדיקה.",

              ephemeral:
                true
            });
          }

          return interaction.showModal(
            createStaffApplicationModal(
              appType
            )
          );
        }

        await interaction.deferReply({
          ephemeral:
            true
        });

        const existing =
          interaction.guild
            .channels
            .cache
            .find(
              ch =>
                ch.topic
                  ?.includes(
                    `ticket-owner:${interaction.user.id}`
                  )
            );

        if (
          existing
        ) {
          return interaction.editReply(
            `❌ כבר יש לך טיקט: ${existing}`
          );
        }

        const config =
          ticketTypes[
            type
          ];

        const data = {
          name:
            `${config.channelName}-${interaction.user.id.slice(-5)}`,

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
          CATEGORY_ID
        ) {
          data.parent =
            CATEGORY_ID;
        }

        const channel =
          await interaction.guild
            .channels
            .create(
              data
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
          ]
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
              "❌ אין הרשאה.",

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
              .catch(() => {});
          },
          3000
        );

        return;
      }

      // ===================== STAFF APPLICATIONS =====================

      if (
        interaction.isModalSubmit() &&
        interaction.customId.startsWith(
          "staff_application_modal:"
        )
      ) {
        const type =
          interaction.customId
            .split(":")[1];

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
          return interaction.reply({
            content:
              "⏳ כבר יש לך בקשה שממתינה.",

            ephemeral:
              true
          });
        }

        const channel =
          await client.channels.fetch(
            STAFF_APPLICATION_CHANNEL_ID
          );

        const member =
          await fetchFreshMember(
            interaction.guild,
            interaction.user.id
          );

        const currentRole =
          getHighestLadderRoleId(
            member
          );

        const embed =
          new EmbedBuilder()
            .setColor(
              0x5865F2
            )
            .setTitle(
              type ===
                "promotion"
                ? "⬆️ בקשת קידום"
                : "🛡️ בקשת הצטרפות לצוות"
            )
            .addFields(
              {
                name:
                  "👤 משתמש",

                value:
                  `${interaction.user}`
              },

              ...(
                currentRole
                  ? [
                      {
                        name:
                          "🎖️ דרגה נוכחית",

                        value:
                          `<@&${currentRole}>`
                      }
                    ]
                  : []
              ),

              {
                name:
                  "🎂 גיל",

                value:
                  safeText(
                    interaction.fields
                      .getTextInputValue(
                        "age"
                      )
                  )
              },

              {
                name:
                  "⚠️ סיטואציה",

                value:
                  safeText(
                    interaction.fields
                      .getTextInputValue(
                        "situation"
                      )
                  )
              },

              {
                name:
                  "📛 שם",

                value:
                  safeText(
                    interaction.fields
                      .getTextInputValue(
                        "name"
                      )
                  )
              },

              {
                name:
                  "🛡️ ניסיון",

                value:
                  safeText(
                    interaction.fields
                      .getTextInputValue(
                        "experience"
                      )
                  )
              },

              {
                name:
                  "📝 הערות",

                value:
                  safeText(
                    interaction.fields
                      .getTextInputValue(
                        "notes"
                      ) ||
                    "אין"
                  )
              },

              {
                name:
                  "📋 סטטוס",

                value:
                  "⏳ בבדיקה"
              }
            )
            .setFooter({
              text:
                buildApplicationFooter(
                  interaction.user.id,
                  type,
                  "pending"
                )
            });

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

        return interaction.reply({
          content:
            "✅ הבקשה נשלחה.",

          ephemeral:
            true
        });
      }

      if (
        interaction.isButton() &&
        (
          interaction.customId.startsWith(
            "app_approve:"
          ) ||
          interaction.customId.startsWith(
            "app_reject:"
          ) ||
          interaction.customId.startsWith(
            "app_assign:"
          )
        )
      ) {
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
              "❌ רק הצוות יכול לטפל בבקשות.",

            ephemeral:
              true
          });
        }
      }

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

        const applicant =
          await fetchFreshMember(
            interaction.guild,
            applicantId
          );

        const currentRole =
          getHighestLadderRoleId(
            applicant
          );

        const targets =
          type === "initial"
            ? [
                ROLE_HELPER
              ]
            : getPromotionTargets(
                currentRole
              );

        if (
          !targets.length
        ) {
          return interaction.reply({
            content:
              "❌ אין דרגת קידום זמינה למשתמש הזה.",

            ephemeral:
              true
          });
        }

        const labels =
          type === "initial"
            ? {
                [ROLE_HELPER]:
                  "Helper"
              }
            : getPromotionLabels(
                currentRole
              );

        return interaction.update({
          embeds:
            interaction.message.embeds,

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
            interaction.message.embeds[0]
          );

        setStatusField(
          embed,
          `❌ נדחה על ידי ${interaction.user}`
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
              interaction.member.displayName
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
          roleId
        ] =
          interaction.customId
            .split(":");

        await interaction.deferUpdate();

        const applicant =
          await fetchFreshMember(
            interaction.guild,
            applicantId
          );

        const beforeRole =
          getHighestLadderRoleId(
            applicant
          );

        await applicant.roles.add(
          roleId
        );

        if (
          type === "promotion" &&
          beforeRole &&
          beforeRole !== roleId
        ) {
          await applicant.roles.remove(
            beforeRole
          ).catch(() => {});
        }

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
              ? "✅ צירוף לצוות"
              : "⬆️ קידום צוות",

          fromRoleId:
            beforeRole,

          toRoleId:
            roleId
        });

        const embed =
          EmbedBuilder.from(
            interaction.message.embeds[0]
          );

        setStatusField(
          embed,
          `✅ אושר על ידי ${interaction.user}\n🎖️ דרגה: <@&${roleId}>`
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
              interaction.member.displayName
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
        const type =
          interaction.values[0];

        const destination =
          await client.channels.fetch(
            ARCADE_GAMES_CHANNEL_ID
          );

        if (
          type === "ttt" ||
          type === "rps"
        ) {
          return interaction.reply({
            content:
              "🎮 בחר יריב:",

            components: [
              new ActionRowBuilder()
                .addComponents(
                  new UserSelectMenuBuilder()
                    .setCustomId(
                      `arcade_target_select:${type}`
                    )
                    .setPlaceholder(
                      "בחר שחקן"
                    )
                    .setMinValues(1)
                    .setMaxValues(1)
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
          type === "impostor"
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
              false
          };

          arcadeImpostorGames.set(
            gameId,
            game
          );

          const message =
            await destination.send({
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

          return interaction.reply({
            content:
              `✅ המשחק נפתח: ${message.url}`,

            ephemeral:
              true
          });
        }

        if (
          type === "bomba"
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

            timer:
              null
          };

          arcadeBombaGames.set(
            gameId,
            game
          );

          const message =
            await destination.send({
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

          return interaction.reply({
            content:
              `✅ המשחק נפתח: ${message.url}`,

            ephemeral:
              true
          });
        }
      }

      if (
        interaction.isUserSelectMenu() &&
        interaction.customId.startsWith(
          "arcade_target_select:"
        )
      ) {
        const type =
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

            components:
              []
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
          type === "ttt"
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
              Array(9).fill(
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
                `<@${targetId}> הוזמנת לאיקס עיגול על ידי ${interaction.user}!`,

              components: [
                createTttChallengeRow(
                  gameId
                )
              ]
            });

          return interaction.update({
            content:
              `✅ ההזמנה נשלחה: ${message.url}`,

            components:
              []
          });
        }

        if (
          type === "rps"
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

            choices:
              new Map(),

            accepted:
              false
          };

          arcadeRpsGames.set(
            gameId,
            game
          );

          const message =
            await destination.send({
              content:
                `<@${targetId}> הוזמנת לאבן נייר ומספריים!`,

              components: [
                createRpsChallengeRow(
                  gameId
                )
              ]
            });

          return interaction.update({
            content:
              `✅ ההזמנה נשלחה: ${message.url}`,

            components:
              []
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
        const id =
          interaction.customId
            .split(":")[1];

        const game =
          arcadeTttGames.get(
            id
          );

        if (
          !game ||
          interaction.user.id !==
            game.targetId
        ) {
          return interaction.reply({
            content:
              "❌ אי אפשר לאשר את המשחק.",

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
        const id =
          interaction.customId
            .split(":")[1];

        const game =
          arcadeTttGames.get(
            id
          );

        if (
          !game ||
          ![
            game.challengerId,
            game.targetId
          ].includes(
            interaction.user.id
          )
        ) {
          return interaction.reply({
            content:
              "❌ רק שחקני המשחק יכולים לבטל.",

            ephemeral:
              true
          });
        }

        arcadeTttGames.delete(
          id
        );

        return interaction.update({
          content:
            "❌ המשחק בוטל.",

          components:
            [],

          embeds:
            []
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
          id,
          raw
        ] =
          interaction.customId
            .split(":");

        const game =
          arcadeTttGames.get(
            id
          );

        if (
          !game ||
          interaction.user.id !==
            game.turn
        ) {
          return interaction.reply({
            content:
              "❌ זה לא התור שלך.",

            ephemeral:
              true
          });
        }

        const index =
          Number(
            raw
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

        await interaction.update({
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

        if (
          game.finished
        ) {
          arcadeTttGames.delete(
            id
          );
        }

        return;
      }

      // ===================== RPS =====================

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "rps_accept:"
        )
      ) {
        const id =
          interaction.customId
            .split(":")[1];

        const game =
          arcadeRpsGames.get(
            id
          );

        if (
          interaction.user.id !==
          game?.targetId
        ) {
          return interaction.reply({
            content:
              "❌ רק המוזמן יכול לאשר.",

            ephemeral:
              true
          });
        }

        game.accepted =
          true;

        return interaction.update({
          content:
            "✊✋✌️ המשחק התחיל!",

          components: [
            createRpsChoiceRow(
              id
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
        const id =
          interaction.customId
            .split(":")[1];

        const game =
          arcadeRpsGames.get(
            id
          );

        if (
          !game ||
          !game.players.includes(
            interaction.user.id
          )
        ) {
          return interaction.reply({
            content:
              "❌ רק שחקני המשחק יכולים לבטל.",

            ephemeral:
              true
          });
        }

        arcadeRpsGames.delete(
          id
        );

        return interaction.update({
          content:
            "❌ המשחק בוטל.",

          components:
            []
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
          id,
          choice
        ] =
          interaction.customId
            .split(":");

        const game =
          arcadeRpsGames.get(
            id
          );

        if (
          !game?.players.includes(
            interaction.user.id
          )
        ) {
          return;
        }

        game.choices.set(
          interaction.user.id,
          choice
        );

        await interaction.reply({
          content:
            `✅ בחרת ${rpsEmoji(choice)}`,

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

        let resultText =
          "🤝 תיקו!";

        if (
          result === "first"
        ) {
          resultText =
            `🏆 <@${firstId}> ניצח!`;
        }

        if (
          result === "second"
        ) {
          resultText =
            `🏆 <@${secondId}> ניצח!`;
        }

        await interaction.message.edit({
          content:
            `<@${firstId}> ${rpsEmoji(first)}\n` +
            `<@${secondId}> ${rpsEmoji(second)}\n\n` +
            resultText,

          components:
            []
        });

        arcadeRpsGames.delete(
          id
        );

        return;
      }

      // ===================== IMPOSTOR =====================

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "impostor_join:"
        )
      ) {
        const id =
          interaction.customId
            .split(":")[1];

        const game =
          arcadeImpostorGames.get(
            id
          );

        if (
          !game ||
          game.started
        ) {
          return;
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
              id
            )
        });
      }

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "impostor_leave:"
        )
      ) {
        const id =
          interaction.customId
            .split(":")[1];

        const game =
          arcadeImpostorGames.get(
            id
          );

        if (
          !game
        ) {
          return;
        }

        if (
          interaction.user.id ===
          game.hostId
        ) {
          return interaction.reply({
            content:
              "❌ המארח לא יכול לצאת.",

            ephemeral:
              true
          });
        }

        game.players.delete(
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
              id
            )
        });
      }

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "impostor_cancel:"
        )
      ) {
        const id =
          interaction.customId
            .split(":")[1];

        const game =
          arcadeImpostorGames.get(
            id
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
          id
        );

        return interaction.update({
          content:
            "❌ המשחק בוטל.",

          embeds:
            [],

          components:
            []
        });
      }

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "impostor_start:"
        )
      ) {
        const id =
          interaction.customId
            .split(":")[1];

        const game =
          arcadeImpostorGames.get(
            id
          );

        if (
          interaction.user.id !==
          game?.hostId
        ) {
          return;
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
          [
            ...game.players
          ];

        game.impostorId =
          randomItem(
            players
          );

        game.word =
          randomItem(
            IMPOSTOR_WORDS
          );

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
            continue;
          }

          if (
            playerId ===
            game.impostorId
          ) {
            await user.send(
              "🕵️ **אתה המתחזה!** לא קיבלת מילה."
            ).catch(() => {});

          } else {
            await user.send(
              `🔐 המילה שלך היא: **${game.word}**`
            ).catch(() => {});
          }
        }

        return interaction.update({
          content:
            "🕵️ המשחק התחיל! בדקו DM.",

          embeds:
            [],

          components: [
            new ActionRowBuilder()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId(
                    `impostor_reveal:${id}`
                  )
                  .setLabel(
                    "חשוף את המתחזה"
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
        const id =
          interaction.customId
            .split(":")[1];

        const game =
          arcadeImpostorGames.get(
            id
          );

        if (
          interaction.user.id !==
          game?.hostId
        ) {
          return;
        }

        arcadeImpostorGames.delete(
          id
        );

        return interaction.update({
          content:
            `🕵️ המתחזה היה <@${game.impostorId}>!\n🔐 המילה הייתה **${game.word}**`,

          components:
            []
        });
      }

      // ===================== BOMBA =====================

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "bomba_join:"
        )
      ) {
        const id =
          interaction.customId
            .split(":")[1];

        const game =
          arcadeBombaGames.get(
            id
          );

        if (
          !game ||
          game.started
        ) {
          return;
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
              id
            )
        });
      }

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "bomba_leave:"
        )
      ) {
        const id =
          interaction.customId
            .split(":")[1];

        const game =
          arcadeBombaGames.get(
            id
          );

        if (
          !game
        ) {
          return;
        }

        if (
          interaction.user.id ===
          game.hostId
        ) {
          return interaction.reply({
            content:
              "❌ המארח לא יכול לצאת.",

            ephemeral:
              true
          });
        }

        game.players.delete(
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
              id
            )
        });
      }

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "bomba_cancel:"
        )
      ) {
        const id =
          interaction.customId
            .split(":")[1];

        const game =
          arcadeBombaGames.get(
            id
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
          id
        );

        return interaction.update({
          content:
            "❌ המשחק בוטל.",

          embeds:
            [],

          components:
            []
        });
      }

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "bomba_start:"
        )
      ) {
        const id =
          interaction.customId
            .split(":")[1];

        const game =
          arcadeBombaGames.get(
            id
          );

        if (
          interaction.user.id !==
          game?.hostId
        ) {
          return;
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

        const unlucky =
          randomItem(
            [
              ...game.players
            ]
          );

        await interaction.update({
          content:
            `💣 המשחק התחיל!\n📚 הנושא: **${topic}**\nתענו מהר בצ'אט...`,

          embeds:
            [],

          components:
            []
        });

        game.timer =
          setTimeout(
            async () => {
              await interaction.message.edit({
                content:
                  `💥 **בווום!** הבומבה התפוצצה על <@${unlucky}>!\n📚 הנושא היה **${topic}**`
              }).catch(
                () => {}
              );

              arcadeBombaGames.delete(
                id
              );
            },
            crypto.randomInt(
              15_000,
              31_000
            )
          );

        return;
      }

    } catch (
      error
    ) {
      console.error(
        "❌ Main interaction error:",
        error
      );

      try {
        if (
          interaction.deferred ||
          interaction.replied
        ) {
          await interaction.followUp({
            content:
              "❌ קרתה שגיאה.",

            ephemeral:
              true
          });
        } else {
          await interaction.reply({
            content:
              "❌ קרתה שגיאה.",

            ephemeral:
              true
          });
        }
      } catch {}
    }
  }
);
// ========================================================
// ROEI MUSIC BOT — SOUNDCLOUD ONLY
// ========================================================

const musicPlayer =
  new Player(
    musicClient
  );

let musicExtractorReady =
  false;

// ========================================================
// MUSIC COMMANDS
// ========================================================

const musicPlayCommand =
  new SlashCommandBuilder()
    .setName(
      "play"
    )
    .setDescription(
      "השמעת מוזיקה"
    )

    .addSubcommand(
      sub =>
        sub
          .setName(
            "song"
          )
          .setDescription(
            "הפעל שיר"
          )
          .addStringOption(
            option =>
              option
                .setName(
                  "query"
                )
                .setDescription(
                  "שם שיר, קישור SoundCloud או קישור YouTube"
                )
                .setRequired(
                  true
                )
                .setMaxLength(
                  500
                )
          )
    )

    .addSubcommand(
      sub =>
        sub
          .setName(
            "playlist"
          )
          .setDescription(
            "הפעל פלייליסט אישי"
          )
          .addStringOption(
            option =>
              option
                .setName(
                  "name"
                )
                .setDescription(
                  "שם הפלייליסט"
                )
                .setRequired(
                  true
                )
                .setMaxLength(
                  60
                )
          )
    );

const musicPlaylistCommand =
  new SlashCommandBuilder()
    .setName(
      "playlist"
    )
    .setDescription(
      "ניהול הפלייליסטים האישיים שלך"
    )

    .addSubcommand(
      sub =>
        sub
          .setName(
            "create"
          )
          .setDescription(
            "צור פלייליסט חדש"
          )
          .addStringOption(
            option =>
              option
                .setName(
                  "name"
                )
                .setDescription(
                  "שם הפלייליסט"
                )
                .setRequired(
                  true
                )
                .setMaxLength(
                  60
                )
          )
    )

    .addSubcommand(
      sub =>
        sub
          .setName(
            "add"
          )
          .setDescription(
            "הוסף שיר לפלייליסט"
          )
          .addStringOption(
            option =>
              option
                .setName(
                  "name"
                )
                .setDescription(
                  "שם הפלייליסט"
                )
                .setRequired(
                  true
                )
                .setMaxLength(
                  60
                )
          )
          .addStringOption(
            option =>
              option
                .setName(
                  "song"
                )
                .setDescription(
                  "שם שיר, SoundCloud או YouTube"
                )
                .setRequired(
                  true
                )
                .setMaxLength(
                  500
                )
          )
    )

    .addSubcommand(
      sub =>
        sub
          .setName(
            "list"
          )
          .setDescription(
            "הצג את הפלייליסטים שלך"
          )
    )

    .addSubcommand(
      sub =>
        sub
          .setName(
            "show"
          )
          .setDescription(
            "הצג את השירים בפלייליסט"
          )
          .addStringOption(
            option =>
              option
                .setName(
                  "name"
                )
                .setDescription(
                  "שם הפלייליסט"
                )
                .setRequired(
                  true
                )
          )
    )

    .addSubcommand(
      sub =>
        sub
          .setName(
            "remove"
          )
          .setDescription(
            "הסר שיר מפלייליסט"
          )
          .addStringOption(
            option =>
              option
                .setName(
                  "name"
                )
                .setDescription(
                  "שם הפלייליסט"
                )
                .setRequired(
                  true
                )
          )
          .addIntegerOption(
            option =>
              option
                .setName(
                  "position"
                )
                .setDescription(
                  "מספר השיר"
                )
                .setRequired(
                  true
                )
                .setMinValue(
                  1
                )
          )
    )

    .addSubcommand(
      sub =>
        sub
          .setName(
            "delete"
          )
          .setDescription(
            "מחק פלייליסט"
          )
          .addStringOption(
            option =>
              option
                .setName(
                  "name"
                )
                .setDescription(
                  "שם הפלייליסט"
                )
                .setRequired(
                  true
                )
          )
    );

const musicPauseCommand =
  new SlashCommandBuilder()
    .setName(
      "pause"
    )
    .setDescription(
      "עצור זמנית את המוזיקה"
    );

const musicResumeCommand =
  new SlashCommandBuilder()
    .setName(
      "resume"
    )
    .setDescription(
      "המשך את המוזיקה"
    );

const musicSkipCommand =
  new SlashCommandBuilder()
    .setName(
      "skip"
    )
    .setDescription(
      "דלג לשיר הבא"
    );

const musicStopCommand =
  new SlashCommandBuilder()
    .setName(
      "stop"
    )
    .setDescription(
      "עצור ונקה את כל התור"
    );

const musicQueueCommand =
  new SlashCommandBuilder()
    .setName(
      "queue"
    )
    .setDescription(
      "הצג את תור המוזיקה"
    );

const musicNowPlayingCommand =
  new SlashCommandBuilder()
    .setName(
      "nowplaying"
    )
    .setDescription(
      "הצג מה מתנגן עכשיו"
    );

const musicVolumeCommand =
  new SlashCommandBuilder()
    .setName(
      "volume"
    )
    .setDescription(
      "שנה את עוצמת המוזיקה"
    )
    .addIntegerOption(
      option =>
        option
          .setName(
            "amount"
          )
          .setDescription(
            "עוצמה בין 1 ל-100"
          )
          .setRequired(
            true
          )
          .setMinValue(
            1
          )
          .setMaxValue(
            100
          )
    );

const musicShuffleCommand =
  new SlashCommandBuilder()
    .setName(
      "shuffle"
    )
    .setDescription(
      "ערבב את השירים שבתור"
    );

const musicLoopCommand =
  new SlashCommandBuilder()
    .setName(
      "loop"
    )
    .setDescription(
      "בחר מצב חזרה"
    )
    .addStringOption(
      option =>
        option
          .setName(
            "mode"
          )
          .setDescription(
            "מצב החזרה"
          )
          .setRequired(
            true
          )
          .addChoices(
            {
              name:
                "כבוי",

              value:
                "off"
            },

            {
              name:
                "חזרה על השיר",

              value:
                "track"
            },

            {
              name:
                "חזרה על כל התור",

              value:
                "queue"
            }
          )
    );

const musicRemoveCommand =
  new SlashCommandBuilder()
    .setName(
      "remove"
    )
    .setDescription(
      "הסר שיר מהתור"
    )
    .addIntegerOption(
      option =>
        option
          .setName(
            "position"
          )
          .setDescription(
            "מספר השיר בתור"
          )
          .setRequired(
            true
          )
          .setMinValue(
            1
          )
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

// ========================================================
// MUSIC EXTRACTOR
// ========================================================

async function ensureMusicExtractor() {
  if (
    musicExtractorReady
  ) {
    return;
  }

  await musicPlayer
    .extractors
    .register(
      SoundCloudExtractor
    );

  musicExtractorReady =
    true;

  console.log(
    "✅ SoundCloud Music Extractor נטען"
  );
}

// ========================================================
// MUSIC HELPERS
// ========================================================

async function fetchMusicMember(
  guild,
  userId
) {
  return guild.members
    .fetch({
      user:
        userId,

      force:
        true
    })
    .catch(
      () => null
    );
}

function getMusicQueue(
  guildId =
    GUILD_ID
) {
  return (
    musicPlayer.nodes.get(
      guildId
    ) ||
    null
  );
}

function isYouTubeUrl(
  input
) {
  try {
    const url =
      new URL(
        input
      );

    const host =
      url.hostname
        .toLowerCase()
        .replace(
          /^www\./,
          ""
        );

    return (
      host ===
        "youtube.com" ||
      host ===
        "m.youtube.com" ||
      host ===
        "music.youtube.com" ||
      host ===
        "youtu.be"
    );

  } catch {
    return false;
  }
}

function isSoundCloudUrl(
  input
) {
  try {
    const url =
      new URL(
        input
      );

    const host =
      url.hostname
        .toLowerCase()
        .replace(
          /^www\./,
          ""
        );

    return (
      host ===
        "soundcloud.com" ||
      host.endsWith(
        ".soundcloud.com"
      )
    );

  } catch {
    return false;
  }
}

// ========================================================
// YOUTUBE LINK -> TITLE ONLY
// אנחנו לא משמיעים את YouTube.
// רק לוקחים את שם הסרטון ומחפשים אותו ב-SoundCloud.
// ========================================================

async function getYouTubeTitle(
  youtubeUrl
) {
  try {
    const response =
      await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeUrl)}&format=json`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0"
          }
        }
      );

    if (
      response.ok
    ) {
      const data =
        await response.json();

      if (
        data?.title
      ) {
        return String(
          data.title
        ).trim();
      }
    }
  } catch {}

  // fallback — ננסה לקרוא רק את הכותרת מהעמוד

  try {
    const response =
      await fetch(
        youtubeUrl,
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
      return null;
    }

    const html =
      await response.text();

    const ogMatch =
      html.match(
        /<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i
      );

    if (
      ogMatch?.[1]
    ) {
      return decodeXml(
        ogMatch[1]
      );
    }

    const titleMatch =
      html.match(
        /<title>([^<]+)<\/title>/i
      );

    if (
      titleMatch?.[1]
    ) {
      return decodeXml(
        titleMatch[1]
      )
        .replace(
          /\s*-\s*YouTube\s*$/i,
          ""
        )
        .trim();
    }

  } catch {}

  return null;
}

function cleanSearchTitle(
  title
) {
  return String(
    title ||
    ""
  )
    .replace(
      /\[(official|lyrics?|audio|video|music video)[^\]]*\]/gi,
      " "
    )
    .replace(
      /\((official|lyrics?|audio|video|music video)[^)]*\)/gi,
      " "
    )
    .replace(
      /\bofficial\s+(music\s+)?video\b/gi,
      " "
    )
    .replace(
      /\bofficial\s+audio\b/gi,
      " "
    )
    .replace(
      /\blyrics?\b/gi,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

async function searchSoundCloud(
  query,
  requestedBy
) {
  await ensureMusicExtractor();

  const result =
    await musicPlayer.search(
      query,
      {
        requestedBy,

        searchEngine:
          `ext:${SoundCloudExtractor.identifier}`
      }
    );

  return result;
}

async function resolveMusicInput(
  input,
  requestedBy
) {
  const query =
    String(
      input ||
      ""
    ).trim();

  if (
    !query
  ) {
    throw new Error(
      "EMPTY_QUERY"
    );
  }

  // ===================== YOUTUBE LINK =====================

  if (
    isYouTubeUrl(
      query
    )
  ) {
    console.log(
      `🔗 YouTube link received: ${query}`
    );

    const youtubeTitle =
      await getYouTubeTitle(
        query
      );

    if (
      !youtubeTitle
    ) {
      throw new Error(
        "YOUTUBE_TITLE_NOT_FOUND"
      );
    }

    const searchTitle =
      cleanSearchTitle(
        youtubeTitle
      );

    console.log(
      `🔎 YouTube title -> SoundCloud: ${searchTitle}`
    );

    const result =
      await searchSoundCloud(
        searchTitle,
        requestedBy
      );

    const track =
      result.tracks[0];

    if (
      !track
    ) {
      throw new Error(
        "SOUNDCLOUD_MATCH_NOT_FOUND"
      );
    }

    return {
      track,

      originalQuery:
        query,

      youtubeTitle,

      convertedFromYouTube:
        true
    };
  }

  // ===================== SOUNDCLOUD LINK =====================

  if (
    isSoundCloudUrl(
      query
    )
  ) {
    const result =
      await searchSoundCloud(
        query,
        requestedBy
      );

    const track =
      result.tracks[0];

    if (
      !track
    ) {
      throw new Error(
        "SOUNDCLOUD_TRACK_NOT_FOUND"
      );
    }

    return {
      track,

      originalQuery:
        query,

      youtubeTitle:
        null,

      convertedFromYouTube:
        false
    };
  }

  // ===================== NORMAL SONG NAME =====================

  const result =
    await searchSoundCloud(
      query,
      requestedBy
    );

  const track =
    result.tracks[0];

  if (
    !track
  ) {
    throw new Error(
      "SOUNDCLOUD_TRACK_NOT_FOUND"
    );
  }

  return {
    track,

    originalQuery:
      query,

    youtubeTitle:
      null,

    convertedFromYouTube:
      false
  };
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

  if (
    !guild
  ) {
    throw new Error(
      "MUSIC_GUILD_NOT_FOUND"
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
      "MUSIC_VOICE_CHANNEL_NOT_FOUND"
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

          leaveOnEmptyCooldown:
            0,

          leaveOnEnd:
            false,

          leaveOnEndCooldown:
            0,

          leaveOnStop:
            false,

          leaveOnStopCooldown:
            0,

          pauseOnEmpty:
            false,

          selfDeaf:
            true,

          volume:
            50,

          bufferingTimeout:
            30_000,

          connectionTimeout:
            30_000
        }
      );
  }

  queue.setMetadata(
    voiceChannel
  );

  const me =
    guild.members.me ||
    await guild.members
      .fetch(
        musicClient.user.id
      )
      .catch(
        () => null
      );

  if (
    !queue.connection ||
    me?.voice?.channelId !==
      voiceChannel.id
  ) {
    await queue.connect(
      voiceChannel,
      {
        deaf:
          true,

        timeout:
          30_000
      }
    );
  }

  return {
    guild,
    voiceChannel,
    queue
  };
}

async function playResolvedTrack(
  track,
  requestedBy
) {
  const {
    voiceChannel
  } =
    await ensureMusicConnection();

  return musicPlayer.play(
    voiceChannel,
    track,
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
          30_000,

        connectionTimeout:
          30_000
      }
    }
  );
}

async function resolveAndPlay(
  input,
  requestedBy
) {
  const resolved =
    await resolveMusicInput(
      input,
      requestedBy
    );

  const result =
    await playResolvedTrack(
      resolved.track,
      requestedBy
    );

  return {
    ...resolved,

    result
  };
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
    typeof channel.send !==
      "function"
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

function getTrackTitle(
  track
) {
  return (
    track?.cleanTitle ||
    track?.title ||
    "שיר לא ידוע"
  );
}

function getTrackUrl(
  track
) {
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

  if (
    url
  ) {
    return (
      `${prefix}[${title}](${url})`
    );
  }

  return (
    `${prefix}${title}`
  );
}

function getFriendlyMusicError(
  error
) {
  const message =
    String(
      error?.message ||
      error ||
      ""
    );

  if (
    message.includes(
      "YOUTUBE_TITLE_NOT_FOUND"
    )
  ) {
    return (
      "❌ לא הצלחתי לזהות את שם הסרטון מהקישור של YouTube."
    );
  }

  if (
    message.includes(
      "SOUNDCLOUD_MATCH_NOT_FOUND"
    )
  ) {
    return (
      "❌ זיהיתי את הסרטון ב-YouTube, אבל לא מצאתי גרסה מתאימה ב-SoundCloud."
    );
  }

  if (
    message.includes(
      "SOUNDCLOUD_TRACK_NOT_FOUND"
    )
  ) {
    return (
      "❌ לא מצאתי את השיר ב-SoundCloud."
    );
  }

  return (
    "❌ לא הצלחתי להפעיל את השיר."
  );
}

// ========================================================
// MUSIC EVENTS
// ========================================================

musicPlayer.events.on(
  "playerStart",
  async (
    queue,
    track
  ) => {
    console.log(
      `▶️ Music started: ${track.title}`
    );

    try {
      const channel =
        await getMusicTextChannel();

      if (
        !channel
      ) {
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
            },

            {
              name:
                "☁️ מקור",

              value:
                "SoundCloud",

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
        "❌ playerStart message:",
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
  queue => {
    console.log(
      "⚠️ Music disconnected — reconnecting..."
    );

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

// ========================================================
// MUSIC READY
// ========================================================

musicClient.once(
  Events.ClientReady,
  async readyClient => {
    console.log(
      `🎵 Roei Music Bot מחובר בתור ${readyClient.user.tag}`
    );

    try {
      await ensureMusicExtractor();

    } catch (
      error
    ) {
      console.error(
        "❌ SoundCloud Extractor:",
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

// ========================================================
// MUSIC 24/7
// ========================================================

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
            error =>
              console.error(
                "❌ Music 24/7 reconnect:",
                error.message
              )
          );
      },
      2500
    );
  }
);

// ========================================================
// MUSIC INTERACTIONS
// ========================================================

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

      if (
        !guild
      ) {
        return interaction.reply({
          content:
            "❌ לא מצאתי את השרת.",

          ephemeral:
            true
        });
      }

      const member =
        await fetchMusicMember(
          guild,
          interaction.user.id
        );

      if (
        !member
      ) {
        return interaction.reply({
          content:
            "❌ לא מצאתי אותך בשרת.",

          ephemeral:
            true
        });
      }

      // ==================================================
      // PLAYLIST — כל אחד
      // ==================================================

      if (
        interaction.commandName ===
        "playlist"
      ) {
        const sub =
          interaction.options
            .getSubcommand();

        // ===================== CREATE =====================

        if (
          sub ===
          "create"
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

          if (
            !playlist
          ) {
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
                  "הוסף שירים עם `/playlist add`."
                )
            ],

            ephemeral:
              true
          });
        }

        // ===================== ADD =====================

        if (
          sub ===
          "add"
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

          if (
            !playlist
          ) {
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
                "❌ אפשר לשמור עד 100 שירים בפלייליסט.",

              ephemeral:
                true
            });
          }

          await interaction.deferReply({
            ephemeral:
              true
          });

          try {
            const resolved =
              await resolveMusicInput(
                song,
                interaction.user
              );

            const storedSong =
              resolved.track.url;

            if (
              !storedSong
            ) {
              return interaction.editReply(
                "❌ לא הצלחתי לשמור את השיר."
              );
            }

            playlist.songs.push(
              storedSong
            );

            await logBotData(
              `MUSIC_PL_ADD|${interaction.user.id}|${encodeSmall(playlist.name)}|${encodeSmall(storedSong)}`
            );

            let extra =
              "";

            if (
              resolved.convertedFromYouTube
            ) {
              extra =
                `\n🔗 YouTube: **${safeText(resolved.youtubeTitle, 100)}**` +
                "\n☁️ נשמרה הגרסה שמצאתי ב-SoundCloud.";
            }

            return interaction.editReply(
              `✅ **${getTrackTitle(resolved.track)}** נוסף ל-**${playlist.name}**.` +
              extra +
              `\n🎵 יש עכשיו **${playlist.songs.length} שירים**.`
            );

          } catch (
            error
          ) {
            console.error(
              "❌ playlist add:",
              error
            );

            return interaction.editReply(
              getFriendlyMusicError(
                error
              )
            );
          }
        }

        // ===================== LIST =====================

        if (
          sub ===
          "list"
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
                "🎵 עדיין אין לך פלייליסטים.\nהשתמש ב-`/playlist create`.",

              ephemeral:
                true
            });
          }

          const text =
            [
              ...map.values()
            ]
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
                  text
                )
            ],

            ephemeral:
              true
          });
        }

        // ===================== SHOW =====================

        if (
          sub ===
          "show"
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

          if (
            !playlist
          ) {
            return interaction.reply({
              content:
                `❌ לא מצאתי פלייליסט בשם **${name}**.`,

              ephemeral:
                true
            });
          }

          if (
            !playlist.songs.length
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
                    playlist.songs.length >
                    25
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

        // ===================== REMOVE =====================

        if (
          sub ===
          "remove"
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

          if (
            !playlist
          ) {
            return interaction.reply({
              content:
                "❌ הפלייליסט לא נמצא.",

              ephemeral:
                true
            });
          }

          const index =
            position -
            1;

          if (
            index < 0 ||
            index >=
              playlist.songs.length
          ) {
            return interaction.reply({
              content:
                `❌ יש בפלייליסט רק **${playlist.songs.length} שירים**.`,

              ephemeral:
                true
            });
          }

          playlist.songs.splice(
            index,
            1
          );

          await logBotData(
            `MUSIC_PL_REMOVE|${interaction.user.id}|${encodeSmall(playlist.name)}|${index}`
          );

          return interaction.reply({
            content:
              `🗑️ שיר מספר **${position}** הוסר מ-**${playlist.name}**.`,

            ephemeral:
              true
          });
        }

        // ===================== DELETE =====================

        if (
          sub ===
          "delete"
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
                "❌ הפלייליסט לא נמצא.",

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
      // PLAY — STUFF ומעלה
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

        // ===================== PLAY SONG =====================

        if (
          sub ===
          "song"
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
            console.log(
              `🎵 Play request: ${query}`
            );

            const {
              track,
              youtubeTitle,
              convertedFromYouTube
            } =
              await resolveAndPlay(
                query,
                interaction.user
              );

            let description =
              formatTrackLine(
                track
              );

            if (
              convertedFromYouTube
            ) {
              description +=
                `\n\n🔗 **קישור YouTube זוהה:** ${safeText(youtubeTitle, 100)}` +
                "\n☁️ הבוט מצא והשמיע גרסה מ-SoundCloud.";
            }

            return interaction.editReply({
              embeds: [
                new EmbedBuilder()
                  .setColor(
                    0x57F287
                  )
                  .setTitle(
                    "✅ נוסף לתור"
                  )
                  .setDescription(
                    description
                  )
                  .addFields({
                    name:
                      "☁️ מקור האודיו",

                    value:
                      "SoundCloud"
                  })
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
              getFriendlyMusicError(
                error
              )
            );
          }
        }

        // ===================== PLAY PLAYLIST =====================

        if (
          sub ===
          "playlist"
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

          if (
            !playlist
          ) {
            return interaction.reply({
              content:
                `❌ לא מצאתי פלייליסט בשם **${name}**.`,

              ephemeral:
                true
            });
          }

          if (
            !playlist.songs.length
          ) {
            return interaction.reply({
              content:
                "❌ הפלייליסט ריק.",

              ephemeral:
                true
            });
          }

          await interaction.deferReply();

          let added =
            0;

          let failed =
            0;

          for (
            const song of
            playlist.songs
          ) {
            try {
              const resolved =
                await resolveMusicInput(
                  song,
                  interaction.user
                );

              await playResolvedTrack(
                resolved.track,
                interaction.user
              );

              added++;

            } catch (
              error
            ) {
              console.error(
                "❌ Playlist track:",
                error.message
              );

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
                      ? `\n❌ נכשלו: **${failed}**`
                      : ""
                  )
                )
                .addFields({
                  name:
                    "☁️ מקור",

                  value:
                    "SoundCloud"
                })
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

        // ===================== PAUSE =====================

        if (
          interaction.commandName ===
          "pause"
        ) {
          if (
            !queue?.currentTrack
          ) {
            return interaction.reply({
              content:
                "❌ אין מוזיקה שמתנגנת כרגע.",

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

          queue.node.pause();

          return interaction.reply(
            "⏸️ המוזיקה נעצרה זמנית."
          );
        }

        // ===================== RESUME =====================

        if (
          interaction.commandName ===
          "resume"
        ) {
          if (
            !queue?.currentTrack
          ) {
            return interaction.reply({
              content:
                "❌ אין מוזיקה פעילה.",

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

          queue.node.resume();

          return interaction.reply(
            "▶️ המוזיקה ממשיכה."
          );
        }

        // ===================== SKIP =====================

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

          const title =
            getTrackTitle(
              queue.currentTrack
            );

          queue.node.skip();

          return interaction.reply(
            `⏭️ דילגתי על **${title}**.`
          );
        }

        // ===================== STOP =====================

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

          setTimeout(
            () => {
              ensureMusicConnection()
                .catch(
                  () => {}
                );
            },
            1000
          );

          return interaction.reply(
            "⏹️ המוזיקה נעצרה והתור נוקה.\n🎧 הבוט נשאר בחדר."
          );
        }

        // ===================== QUEUE =====================

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

          const next =
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
                  `**🎵 עכשיו:**\n${formatTrackLine(queue.currentTrack)}\n\n` +
                  (
                    next
                      ? `**⏭️ הבאים:**\n${next}`
                      : "**⏭️ אין עוד שירים בתור.**"
                  )
                )
                .setFooter({
                  text:
                    tracks.length > 10
                      ? `מוצגים 10 מתוך ${tracks.length}`
                      : `${tracks.length} שירים ממתינים`
                })
            ]
          });
        }

        // ===================== NOW PLAYING =====================

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

          let progress =
            "";

          try {
            progress =
              queue.node
                .createProgressBar() ||
              "";
          } catch {}

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
                },

                {
                  name:
                    "☁️ מקור",

                  value:
                    "SoundCloud",

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
      // STUFF ומעלה
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
              "❌ אין כרגע תור מוזיקה.",

            ephemeral:
              true
          });
        }

        // ===================== VOLUME =====================

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

        // ===================== SHUFFLE =====================

        if (
          interaction.commandName ===
          "shuffle"
        ) {
          if (
            queue.size < 2
          ) {
            return interaction.reply({
              content:
                "❌ צריך לפחות שני שירים שממתינים בתור.",

              ephemeral:
                true
            });
          }

          queue.enableShuffle(
            false
          );

          return interaction.reply(
            `🔀 ערבבתי את השירים שבתור.`
          );
        }

        // ===================== LOOP =====================

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
            modes[
              mode
            ]
          );

          return interaction.reply(
            `🔁 מצב החזרה: **${labels[mode]}**`
          );
        }

        // ===================== REMOVE =====================

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
            position -
            1;

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
            tracks[
              index
            ];

          queue.removeTrack(
            track
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
        const message =
          getFriendlyMusicError(
            error
          );

        if (
          interaction.deferred ||
          interaction.replied
        ) {
          await interaction.followUp({
            content:
              message,

            ephemeral:
              true
          });

        } else {
          await interaction.reply({
            content:
              message,

            ephemeral:
              true
          });
        }

      } catch {}
    }
  }
);

// ========================================================
// ERROR HANDLERS
// ========================================================

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

// ========================================================
// LOGIN BOTH BOTS
// ========================================================

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
