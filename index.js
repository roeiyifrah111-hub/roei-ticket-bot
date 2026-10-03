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
  Routes
} = require("discord.js");

const crypto = require("crypto");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// ======================================================
// ENV
// ======================================================

const TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const CATEGORY_ID = process.env.CATEGORY_ID;

// לא חובה.
// אם בעתיד תרצה, אפשר לשים ב-Railway משתנה בשם YOUTUBE_CHANNEL_ID.
// אם אין אותו, הבוט ינסה למצוא לבד לפי @RoeiKing1.
const YOUTUBE_CHANNEL_ID_FROM_ENV =
  process.env.YOUTUBE_CHANNEL_ID || null;

// ======================================================
// IDS
// ======================================================

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

// ======================================================
// SUGGESTIONS
// ======================================================

const SUGGESTIONS_PANEL_CHANNEL_ID =
  "1555834756481024062";

const VIDEO_IDEAS_CHANNEL_ID =
  "1555835422624587826";

const EDIT_IDEAS_CHANNEL_ID =
  "1555836109496516748";

const SERVER_SUGGESTIONS_CHANNEL_ID =
  "1555835110010527855";

// ======================================================
// YOUTUBE
// ======================================================

const YOUTUBE_NOTIFY_CHANNEL_ID =
  "1555879776936402965";

const YOUTUBE_HANDLE_URL =
  "https://www.youtube.com/@RoeiKing1";

// בדיקה כל 2 דקות
const YOUTUBE_CHECK_INTERVAL_MS =
  2 * 60 * 1000;

// ======================================================
// STAFF ROLES
// ======================================================

// Stuff
const ROLE_STAFF =
  "1555587941575696444";

// Big Stuff
const ROLE_PROMO_1 =
  "1555588224636821526";

// Team
const ROLE_TEAM =
  "1555588615520653332";

// Admin
const ROLE_ADMIN =
  "1555908830209118268";

// Head Admin
const ROLE_HEAD_ADMIN =
  "1555908924643737621";

// Co-owner
const ROLE_TOP =
  "1555588725398839376";

// רול נוסף שיכול לטפל בטיקטים ובבחינות
const EXTRA_HANDLER_ROLE =
  "1541371707011629077";

// ======================================================
// STAFF ACCESS
// ======================================================

const STAFF_ACCESS_ROLE_IDS = [
  ROLE_STAFF,
  EXTRA_HANDLER_ROLE,
  ROLE_PROMO_1,
  ROLE_TEAM,
  ROLE_ADMIN,
  ROLE_HEAD_ADMIN,
  ROLE_TOP
];

// ======================================================
// STAFF LADDER
//
// Stuff
// ↓
// Big Stuff
// ↓
// Team
// ↓
// Admin
// ↓
// Head Admin
// ↓
// Co-owner
//
// ======================================================

const LADDER_ROLE_IDS = [
  ROLE_STAFF,
  ROLE_PROMO_1,
  ROLE_TEAM,
  ROLE_ADMIN,
  ROLE_HEAD_ADMIN,
  ROLE_TOP
];

// ======================================================
// NICKNAME PREFIXES
// ======================================================

const NICKNAME_PREFIX_BY_ROLE = {
  [ROLE_STAFF]:
    "ST",

  [ROLE_PROMO_1]:
    "BST",

  [ROLE_TEAM]:
    "TM",

  [ROLE_ADMIN]:
    "AD",

  [ROLE_HEAD_ADMIN]:
    "HA",

  [ROLE_TOP]:
    "CO"
};

const PREFIX_RANKS = {
  ST: 0,
  BST: 1,
  TM: 2,
  AD: 3,
  HA: 4,
  CO: 5
};

const RESERVED_PREFIX_REGEX =
  /^\s*(ST|BST|TM|AD|HA|CO)\s*(?:\||｜|│|:|-|–|—)\s*/i;

const FAKE_PROMOTION_TIMEOUT_MS =
  15 * 60 * 1000;

// ======================================================
// STATE
// ======================================================

const REJECT_COOLDOWN_MS =
  7 * 24 * 60 * 60 * 1000;

const rejectionCooldowns =
  new Map();

const pendingApplications =
  new Set();

const processingApplications =
  new Set();

const activeGiveaways =
  new Map();

const suggestionStates =
  new Map();

const processingSuggestions =
  new Set();

const youtubeSeen =
  new Map();

let youtubeInitialized =
  false;

let resolvedYouTubeChannelId =
  YOUTUBE_CHANNEL_ID_FROM_ENV;

let youtubePollRunning =
  false;

// ======================================================
// PRIVATE BOT DATA CHANNEL
// ======================================================

const BOT_DATA_CHANNEL_NAME =
  "bot-data";

const BOT_DATA_CHANNEL_TOPIC =
  "roei-bot-private-data-v1";

let botDataChannelId =
  null;

// ======================================================
// TICKET TYPES
// ======================================================

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

// ======================================================
// BASIC HELPERS
// ======================================================

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

function hasStaffAccess(
  member
) {
  if (
    member.id ===
    OWNER_USER_ID
  ) {
    return true;
  }

  return STAFF_ACCESS_ROLE_IDS.some(
    roleId =>
      member.roles.cache.has(
        roleId
      )
  );
}

function getHighestLadderRoleId(
  member
) {
  for (
    let i =
      LADDER_ROLE_IDS.length - 1;

    i >= 0;

    i--
  ) {
    const roleId =
      LADDER_ROLE_IDS[i];

    if (
      member.roles.cache.has(
        roleId
      )
    ) {
      return roleId;
    }
  }

  return null;
}

// ======================================================
// PROMOTION PATH
// ======================================================

function getPromotionTargets(
  roleId
) {
  // Stuff -> Big Stuff / Team
  if (
    roleId ===
    ROLE_STAFF
  ) {
    return [
      ROLE_PROMO_1,
      ROLE_TEAM
    ];
  }

  // Big Stuff -> Team
  if (
    roleId ===
    ROLE_PROMO_1
  ) {
    return [
      ROLE_TEAM
    ];
  }

  // Team -> Admin
  if (
    roleId ===
    ROLE_TEAM
  ) {
    return [
      ROLE_ADMIN
    ];
  }

  // Admin -> Head Admin
  if (
    roleId ===
    ROLE_ADMIN
  ) {
    return [
      ROLE_HEAD_ADMIN
    ];
  }

  // Head Admin -> Co-owner
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
      .fetch(
        roleId
      )
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
      roleId =>
        `<@&${roleId}>`
    )
    .join(
      " "
    );
}

// ======================================================
// PRIVATE BOT DATA CHANNEL
// ======================================================

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

        "החדר הזה משמש את הבוט לשמירת הצבעות, הצעות ונתוני YouTube אחרי Restart/Deploy.\n" +

        "**מומלץ לא למחוק הודעות מכאן.**"

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

  if (
    !GUILD_ID
  ) {
    return null;
  }

  const guild =
    await client.guilds
      .fetch(
        GUILD_ID
      )
      .catch(
        () => null
      );

  if (!guild) {
    return null;
  }

  return ensureBotDataChannel(
    guild
  )
    .catch(
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
        parse: []
      }

    });

    return true;

  } catch (error) {
    console.error(
      "❌ שמירת נתוני בוט נכשלה:",
      error.message
    );

    return false;
  }
}

// ======================================================
// LOAD SAVED DATA
// ======================================================

async function loadPersistentBotData() {
  const channel =
    await getBotDataChannel();

  if (!channel) {
    return;
  }

  const allMessages =
    [];

  let before;

  let scanned =
    0;

  const MAX_SCAN =
    20000;

  while (
    scanned <
    MAX_SCAN
  ) {
    const batch =
      await channel.messages.fetch({

        limit:
          100,

        ...(
          before
            ? {
                before
              }
            : {}
        )

      });

    if (
      !batch.size
    ) {
      break;
    }

    allMessages.push(
      ...batch.values()
    );

    scanned +=
      batch.size;

    before =
      batch.last()?.id;

    if (
      !before ||
      batch.size <
      100
    ) {
      break;
    }
  }

  allMessages.sort(
    (a, b) =>
      a.createdTimestamp -
      b.createdTimestamp
  );

  for (
    const message of
    allMessages
  ) {
    const line =
      message.content || "";

    // ================================================
    // YOUTUBE
    // ================================================

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
        discordMessageId,
        channelId
      ] =
        line.split("|");

      if (
        !videoId
      ) {
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
            discordMessageId &&
            discordMessageId !== "-"

              ? discordMessageId

              : null,

          channelId:
            channelId &&
            channelId !== "-"

              ? channelId

              : null,

          ended:
            type !==
            "live"
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

      if (
        state
      ) {
        state.ended =
          true;
      }

      continue;
    }

    // ================================================
    // SUGGESTIONS
    // ================================================

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

      if (
        !state ||
        !userId
      ) {
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

      if (
        state
      ) {
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

      if (
        state
      ) {
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

      if (
        state
      ) {
        state.status =
          status ||
          "open";

        state.statusBy =
          staffId ||
          null;
      }
    }
  }

  console.log(

    `✅ נטענו ${suggestionStates.size} הצעות שמורות ו-${youtubeSeen.size} פריטי YouTube שמורים`

  );
}

// ======================================================
// NICKNAME SYSTEM
// ======================================================

function getNicknamePrefixForMember(
  member
) {
  const highest =
    getHighestLadderRoleId(
      member
    );

  return highest

    ? NICKNAME_PREFIX_BY_ROLE[
        highest
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
        RESERVED_PREFIX_REGEX
      );

  return match

    ? match[1]
        .toUpperCase()

    : null;
}

function hasReservedPrefix(
  name
) {
  return RESERVED_PREFIX_REGEX.test(
    String(
      name || ""
    ).trim()
  );
}

function stripReservedPrefix(
  name
) {
  return String(
    name || ""
  )
    .replace(
      RESERVED_PREFIX_REGEX,
      ""
    )
    .trim();
}

function getBaseName(
  member
) {
  let base =
    stripReservedPrefix(

      member.nickname ||

      member.user.globalName ||

      member.user.username

    );

  if (
    !base ||
    base ===
    "אין שם"
  ) {
    base =
      stripReservedPrefix(

        member.user.globalName ||

        member.user.username

      );
  }

  return (
    base ||

    member.user.username ||

    "אין שם"
  )
    .trim();
}

async function applyStaffNickname(
  member
) {
  const prefix =
    getNicknamePrefixForMember(
      member
    );

  if (
    !prefix ||
    !member.manageable
  ) {
    return;
  }

  const prefixText =
    `${prefix} | `;

  const maxBaseLength =
    Math.max(

      1,

      32 -
      prefixText.length

    );

  const base =
    getBaseName(
      member
    )
      .slice(
        0,
        maxBaseLength
      );

  const wantedNickname =
    `${prefixText}${base}`;

  if (
    member.nickname ===
    wantedNickname
  ) {
    return;
  }

  await member.setNickname(

    wantedNickname,

    "עדכון ניקניים אוטומטי לפי דרגת צוות"

  )
    .catch(
      error =>
        console.error(

          "❌ שינוי ניקניים נכשל:",

          error.message

        )
    );
}

async function restoreNicknameAfterLeavingStaff(
  member
) {
  if (
    !member.manageable
  ) {
    return;
  }

  const current =

    member.nickname ||

    member.user.globalName ||

    member.user.username;

  const clean =
    (
      stripReservedPrefix(
        current
      ) ||

      member.user.globalName ||

      member.user.username ||

      "אין שם"
    )
      .slice(
        0,
        32
      );

  if (
    member.nickname ===
    clean
  ) {
    return;
  }

  await member.setNickname(

    clean,

    "הסרת קידומת צוות"

  )
    .catch(
      () => {}
    );
}

// ======================================================
// NON-STAFF USING STAFF NAME
// ======================================================

async function notifyOwnerAboutFakeStaffName(
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

  if (
    !owner
  ) {
    return;
  }

  const embed =
    new EmbedBuilder()

      .setTitle(
        "⚠️ שימוש בתג צוות ללא רול"
      )

      .setDescription(

        `${member.user} השתמש/ה בתג צוות בלי להיות בצוות.\n\n` +

        `📝 **השם שהיה:** \`${attemptedName}\`\n` +

        `🔄 **הניקניים שונה ל:** \`אין שם\``

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

  })
    .catch(
      () => {}
    );
}

async function handleUnauthorizedStaffName(
  member,
  attemptedName
) {
  if (
    getHighestLadderRoleId(
      member
    )
  ) {
    return;
  }

  if (
    !hasReservedPrefix(
      attemptedName
    )
  ) {
    return;
  }

  if (
    member.manageable
  ) {
    await member.setNickname(

      "אין שם",

      "שימוש בתג צוות ללא רול"

    )
      .catch(
        () => {}
      );
  }

  await notifyOwnerAboutFakeStaffName(
    member,
    attemptedName
  );
}

// ======================================================
// FAKE PROMOTION PROTECTION
// ======================================================

async function notifyOwnerAboutFakePromotion(
  member,
  attemptedName,
  realPrefix,
  attemptedPrefix,
  timeoutSuccess
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

  const realRoleName =
    await getRoleName(

      member.guild,

      getHighestLadderRoleId(
        member
      )

    );

  const embed =
    new EmbedBuilder()

      .setTitle(
        "🚨 ניסיון לזייף דרגת צוות"
      )

      .setDescription(

        `${member.user} ניסה/תה לשים תג של דרגה גבוהה יותר.\n\n` +

        `🎖️ **הדרגה האמיתית:** ${realRoleName} (\`${realPrefix}\`)\n` +

        `⚠️ **התג שניסה/תה:** \`${attemptedPrefix}\`\n` +

        `📝 **הניקניים שניסה/תה:** \`${attemptedName}\`\n\n` +

        (
          timeoutSuccess

            ? "⏱️ המשתמש קיבל **Timeout ל-15 דקות** והניקניים תוקן."

            : "⚠️ הניקניים תוקן, אבל לא הצלחתי לתת Timeout."
        )

      )

      .setFooter({
        text:
          `User ID: ${member.id}`
      })

      .setTimestamp();

  await owner.send({
    embeds: [
      embed
    ]
  })
    .catch(
      () => {}
    );
}

async function handleFakePromotion(
  member,
  attemptedName
) {
  const realPrefix =
    getNicknamePrefixForMember(
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

  try {
    if (
      member.moderatable
    ) {
      await member.timeout(

        FAKE_PROMOTION_TIMEOUT_MS,

        `ניסיון להשתמש בתג ${attemptedPrefix} ללא הדרגה המתאימה`

      );

      timeoutSuccess =
        true;
    }

  } catch (error) {
    console.error(
      "❌ Timeout נכשל:",
      error.message
    );
  }

  await applyStaffNickname(
    member
  );

  await notifyOwnerAboutFakePromotion(

    member,

    attemptedName,

    realPrefix,

    attemptedPrefix,

    timeoutSuccess

  );

  return true;
}

// ======================================================
// WELCOME MESSAGE
// ======================================================

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
    !channel ||
    !channel.isTextBased()
  ) {
    return;
  }

  const avatarUrl =
    member.user
      .displayAvatarURL({
        extension:
          "png",

        size:
          256
      });

  const embed =
    new EmbedBuilder()

      .setTitle(
        "👋 ברוך/ה הבא/ה לשרת!"
      )

      .setDescription(

        `היי ${member} — כיף שהצטרפת! 🎉\n\n` +

        `📜 קודם כל כדאי לעבור על החוקים ב-<#${RULES_CHANNEL_ID}>\n` +

        `🎫 צריך עזרה? מערכת הטיקטים נמצאת ב-<#${PANEL_CHANNEL_ID}>\n` +

        `💡 יש רעיון לסרטון, אדיט או לשרת? יש לנו גם מערכת הצעות.\n` +

        `🎉 מדי פעם יש גם הגרלות ועדכונים מהיוטיוב.\n\n` +

        `👥 **את/ה חבר/ה מספר ${member.guild.memberCount} בשרת!**`

      )

      .setThumbnail(
        avatarUrl
      )

      .setTimestamp();

  const guildIcon =
    member.guild.iconURL({
      size:
        256
    });

  if (
    guildIcon
  ) {
    embed.setAuthor({

      name:
        member.guild.name,

      iconURL:
        guildIcon

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

  })
    .catch(
      error =>
        console.error(

          "❌ הודעת ברוכים הבאים נכשלה:",

          error.message

        )
    );
}

// ======================================================
// APPLICATION STATE
// ======================================================

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

    `applicant:${userId}` +

    `|type:${type}` +

    `|status:${status}`;

  if (
    rejectedAt
  ) {
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
      index !==
      -1
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

  if (
    !expiry
  ) {
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
    !channel ||
    !channel.isTextBased()
  ) {
    return;
  }

  let before;

  let scanned =
    0;

  while (
    scanned <
    2000
  ) {
    const batch =
      await channel.messages.fetch({

        limit:
          100,

        ...(
          before
            ? {
                before
              }
            : {}
        )

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

      if (
        !data
      ) {
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
          Number.isFinite(
            expiry
          ) &&

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
      batch.size <
      100
    ) {
      break;
    }
  }
}

// ======================================================
// TICKET PANEL
// ======================================================

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

function createPanelEmbed() {
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
    type ===
    "report"
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

        "🕒 **מתי זה קרה?** — זמן משוער\n\n" +

        "**צוות השרת יעבור על הדיווח בהקדם.**"

      );
  }

  if (
    type ===
    "technical"
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

      "כתבו כאן במה אתם צריכים עזרה והוסיפו כמה שיותר פרטים.\n\n" +

      "**צוות השרת יענה בהקדם.**"

    );
}

function createTicketPermissions(
  guild,
  userId
) {
  const overwrites = [

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
    overwrites.push({

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

  return overwrites;
}

// ======================================================
// STAFF APPLICATION MODAL
// ======================================================

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

          `טופל על ידי ${displayName}`

            .slice(
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

// ======================================================
// STAFF DMS
// ======================================================

async function sendApplicantDM(
  userId,
  type,
  status,
  roleName = null
) {
  const user =
    await client.users
      .fetch(
        userId
      )
      .catch(
        () => null
      );

  if (
    !user
  ) {
    return false;
  }

  let embed;

  if (
    status ===
    "pending"
  ) {
    embed =
      new EmbedBuilder()

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

        );

  } else if (
    status ===
    "approved"
  ) {
    embed =
      new EmbedBuilder()

        .setTitle(

          type ===
          "promotion"

            ? "🎉 קיבלת קידום!"

            : "✅ התקבלת לצוות!"

        )

        .setDescription(

          type ===
          "promotion"

            ? `**בקשת הקידום אושרה!**\n\n🎖️ הדרגה החדשה: **${roleName}**`

            : `**הבקשה אושרה! 🎉**\n\n🎖️ התפקיד שקיבלת: **${roleName}**`

        );

  } else {
    embed =
      new EmbedBuilder()

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
  }

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

// ======================================================
// STAFF LOG
// ======================================================

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
    !channel ||
    !channel.isTextBased()
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

  const embed =
    new EmbedBuilder()

      .setTitle(
        title
      )

      .addFields(

        {
          name:
            "👤 משתמש",

          value:
            `${targetMember.user}\n` +
            `\`${targetMember.id}\``
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
            `${actorUser}\n` +
            `\`${actorUser.id}\``
        }

      )

      .setTimestamp();

  await channel.send({
    embeds: [
      embed
    ]
  })
    .catch(
      () => {}
    );
}

// ======================================================
// STAFF MANAGEMENT PANEL
// ======================================================

async function buildManagementEmbed(
  guild,
  member
) {
  member =
    await fetchFreshMember(
      guild,
      member.id
    );

  const highest =
    getHighestLadderRoleId(
      member
    );

  const rankName =

    highest

      ? await getRoleName(
          guild,
          highest
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
        highest

          ? "בחר פעולה לניהול המשתמש:"

          : "המשתמש לא נמצא כרגע בסולם הצוות. אפשר להוסיף אותו ידנית:"
      )

    );
}

function createManagementButtons(
  member
) {
  const currentRoleId =
    getHighestLadderRoleId(
      member
    );

  if (
    !currentRoleId
  ) {
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
            currentRoleId ===
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

    )
      .catch(
        () => null
      );

  if (
    !member
  ) {
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
  customLabels = {}

) {
  const row =
    new ActionRowBuilder();

  for (
    const roleId of
    roleIds
  ) {
    const roleName =

      customLabels[
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
          roleName.slice(
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

// ======================================================
// GIVEAWAYS
// ======================================================

function parseGiveawayDuration(
  input
) {
  const match =
    String(
      input || ""
    )
      .trim()
      .toLowerCase()
      .match(
        /^(\d+)\s*(s|m|h|d)$/
      );

  if (
    !match
  ) {
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
      60 * 1000,

    h:
      60 * 60 * 1000,

    d:
      24 * 60 * 60 * 1000

  }[
    match[2]
  ];

  const duration =
    amount *
    multiplier;

  if (
    !Number.isSafeInteger(
      amount
    ) ||

    amount <= 0 ||

    duration <
    10 * 1000 ||

    duration >
    30 * 24 * 60 * 60 * 1000
  ) {
    return null;
  }

  return duration;
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
  const endTimestamp =
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
            giveaway.prize,

          inline:
            false
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

              ? `<t:${Math.floor(
                  Date.now() /
                  1000
                )}:R>`

              : `<t:${endTimestamp}:R>\n<t:${endTimestamp}:F>`,

          inline:
            false
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
                userId =>
                  `<@${userId}>`
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
  winnerCount

) {
  const users =
    [
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
    ] =
      [
        users[j],
        users[i]
      ];
  }

  return users.slice(

    0,

    Math.min(
      winnerCount,
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
    !channel ||
    !channel.isTextBased()
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

    })
      .catch(
        () => {}
      );
  }

  if (
    winners.length
  ) {
    await channel.send({

      content:

        `🎉 **ההגרלה הסתיימה!**\n` +

        `${
          winners.length === 1

            ? "🏆 הזוכה"

            : "🏆 הזוכים"
        }: ` +

        `${winners
          .map(
            userId =>
              `<@${userId}>`
          )
          .join(", ")}\n` +

        `🎁 **הפרס:** ${giveaway.prize}` +

        (
          endedBy

            ? `\n🔒 **נסגרה על ידי:** ${endedBy}`

            : ""
        ),

      allowedMentions: {
        users:
          winners
      }

    })
      .catch(
        () => {}
      );

  } else {
    await channel.send({

      content:

        "🎉 **ההגרלה הסתיימה!**\n" +

        "😕 לא היו משתתפים.\n" +

        `🎁 **הפרס:** ${giveaway.prize}` +

        (
          endedBy

            ? `\n🔒 **נסגרה על ידי:** ${endedBy}`

            : ""
        )

    })
      .catch(
        () => {}
      );
  }
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
        remaining <=
        0
      ) {
        endGiveaway(
          giveaway
        )
          .catch(
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

// ======================================================
// SUGGESTIONS
// ======================================================

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

      config

        ? config.label

        : "שליחת רעיון"

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
  let up =
    0;

  let down =
    0;

  for (
    const vote of
    state.votes.values()
  ) {
    if (
      vote ===
      "up"
    ) {
      up++;
    }

    if (
      vote ===
      "down"
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

function createSuggestionEmbedFromData(

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
          `<@${creatorId}>`,

        inline:
          false
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
          ),

        inline:
          false
      }

    )

    .setFooter({

      text:
        `suggestion:${type}:${creatorId}`

    })

    .setTimestamp();
}

function getSuggestionIdeaFromMessage(
  message
) {
  const description =
    message.embeds[0]
      ?.description ||
    "";

  return description

    .replace(
      /^📝 \*\*הרעיון:\*\*\n?/,
      ""
    )

    .trim();
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

function createSuggestionStaffOptionsRow(
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

function parseSuggestionFooter(
  message
) {
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

  return {
    type:
      match[1],

    creatorId:
      match[2]
  };
}

function getOrHydrateSuggestionState(
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

  const parsed =
    parseSuggestionFooter(
      message
    );

  if (
    !parsed
  ) {
    return null;
  }

  const state = {

    messageId:
      message.id,

    creatorId:
      parsed.creatorId,

    type:
      parsed.type,

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

async function updateSuggestionPublicMessage(
  message,
  state
) {
  const idea =
    getSuggestionIdeaFromMessage(
      message
    );

  await message.edit({

    embeds: [

      createSuggestionEmbedFromData(

        state.type,

        state.creatorId,

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
}

async function notifyOwnerSuggestionReachedFive(
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

  const idea =
    getSuggestionIdeaFromMessage(
      message
    );

  const config =

    suggestionTypes[
      state.type
    ] ||

    suggestionTypes.server;

  const embed =
    new EmbedBuilder()

      .setColor(
        0x57F287
      )

      .setTitle(
        "🔥 הצעה הגיעה ל-5 בעד!"
      )

      .setDescription(

        `${config.emoji} **${config.label}**\n\n` +

        `📝 **הרעיון:**\n${idea}`

      )

      .addFields(

        {
          name:
            "👤 נשלח על ידי",

          value:
            `<@${state.creatorId}>`,

          inline:
            false
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

      .setTimestamp();

  const row =
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

      );

  await owner.send({

    embeds: [
      embed
    ],

    components: [
      row
    ]

  })
    .catch(
      () => {}
    );
}

async function sendSuggestionForwardToOwner(
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

  const idea =
    getSuggestionIdeaFromMessage(
      message
    );

  const config =

    suggestionTypes[
      state.type
    ] ||

    suggestionTypes.server;

  const embed =
    new EmbedBuilder()

      .setColor(
        0x5865F2
      )

      .setTitle(
        "📨 הצעה הועברה אליך על ידי צוות"
      )

      .setDescription(

        `${config.emoji} **${config.label}**\n\n` +

        `📝 **הרעיון:**\n${idea}`

      )

      .addFields(

        {
          name:
            "👤 יוצר ההצעה",

          value:
            `<@${state.creatorId}>`,

          inline:
            false
        },

        {
          name:
            "🛡️ הועבר על ידי",

          value:
            `${staffUser}`,

          inline:
            false
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

      .setTimestamp();

  const row =
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

      );

  return owner.send({

    embeds: [
      embed
    ],

    components: [
      row
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
  status,
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

  let embed;

  if (
    status ===
    "approved"
  ) {
    embed =
      new EmbedBuilder()

        .setColor(
          0x57F287
        )

        .setTitle(
          "✅ ההצעה שלך אושרה!"
        )

        .setDescription(

          "ההצעה שלך **אושרה ונמצאת בטיפול**. 🎉\n" +

          "תודה על הרעיון!"

        );

  } else {
    embed =
      new EmbedBuilder()

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
  }

  await user.send({
    embeds: [
      embed
    ]
  })
    .catch(
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
    !channel ||
    !channel.isTextBased()
  ) {
    return;
  }

  const messages =
    await channel.messages.fetch({
      limit:
        100
    });

  const oldPanel =
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

  if (
    oldPanel
  ) {
    await oldPanel.edit({

      embeds: [
        createSuggestionsPanelEmbed()
      ],

      components: [
        createSuggestionsPanelMenu()
      ]

    });

  } else {
    await channel.send({

      embeds: [
        createSuggestionsPanelEmbed()
      ],

      components: [
        createSuggestionsPanelMenu()
      ]

    });
  }
}

// ======================================================
// YOUTUBE
// ======================================================

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
      "\""
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

    const titleRaw =
      block.match(

        /<title>([\s\S]*?)<\/title>/

      )?.[1];

    const published =
      block.match(

        /<published>([^<]+)<\/published>/

      )?.[1];

    if (
      !videoId
    ) {
      continue;
    }

    entries.push({

      videoId,

      title:
        decodeXml(
          titleRaw ||
          "סרטון חדש"
        ),

      published:
        published ||
        null

    });
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
    markerIndex ===
    -1
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
    start ===
    -1
  ) {
    return null;
  }

  let depth =
    0;

  let inString =
    false;

  let escaped =
    false;

  for (
    let i =
      start;

    i <
    html.length;

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
        char ===
        "\\"
      ) {
        escaped =
          true;

      } else if (
        char ===
        "\""
      ) {
        inString =
          false;
      }

      continue;
    }

    if (
      char ===
      "\""
    ) {
      inString =
        true;

      continue;
    }

    if (
      char ===
      "{"
    ) {
      depth++;
    }

    if (
      char ===
      "}"
    ) {
      depth--;
    }

    if (
      depth ===
      0
    ) {
      const jsonText =
        html.slice(
          start,
          i + 1
        );

      try {
        return JSON.parse(
          jsonText
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

    /"channelId":"(UC[^"]+)"/,

    /"externalId":"(UC[^"]+)"/,

    /<meta itemprop="channelId" content="(UC[^"]+)"/,

    /\/channel\/(UC[a-zA-Z0-9_-]+)/

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

      return found;
    }
  }

  throw new Error(
    "Could not resolve YouTube channel ID from handle"
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
    return null;
  }

  const html =
    await response.text();

  const markers = [

    "var ytInitialPlayerResponse = ",

    "ytInitialPlayerResponse = ",

    "\"ytInitialPlayerResponse\":"

  ];

  let player =
    null;

  for (
    const marker of
    markers
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

  if (
    !player
  ) {
    return null;
  }

  const details =
    player.videoDetails ||
    {};

  const micro =
    player.microformat
      ?.playerMicroformatRenderer ||
    {};

  const live =
    micro.liveBroadcastDetails ||
    null;

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

      : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  return {

    title:

      details.title ||

      micro.title
        ?.simpleText ||

      "YouTube",

    isLiveNow:
      live?.isLiveNow ===
      true,

    isLiveContent:

      details.isLiveContent ===
      true ||

      Boolean(
        live
      ),

    endTimestamp:
      live?.endTimestamp ||
      null,

    startTimestamp:
      live?.startTimestamp ||
      null,

    isShortsEligible:
      micro.isShortsEligible ===
      true,

    thumbnail

  };
}

function youtubeWatchUrl(
  videoId
) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function youtubeShortUrl(
  videoId
) {
  return `https://www.youtube.com/shorts/${videoId}`;
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
    !channel ||
    !channel.isTextBased()
  ) {
    return null;
  }

  let embed;

  let button;

  let content =
    null;

  // ==================================================
  // LIVE
  // ==================================================

  if (
    type ===
    "live"
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

          `📺 **${meta?.title || entry.title}**\n\n` +

          "🎙️ **הלייב התחיל — בואו עכשיו!**\n" +

          "👥 כולם מוזמנים להצטרף\n" +

          "🔥 אל תפספסו!"

        )

        .setImage(

          meta?.thumbnail ||

          `https://i.ytimg.com/vi/${entry.videoId}/hqdefault.jpg`

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

  }

  // ==================================================
  // SHORT
  // ==================================================

  else if (
    type ===
    "short"
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

          `**${meta?.title || entry.title}**\n\n` +

          "⚡ קצר, מהיר ושווה צפייה\n" +

          "❤️ תנו לייק אם אהבתם!"

        )

        .setImage(

          meta?.thumbnail ||

          `https://i.ytimg.com/vi/${entry.videoId}/hqdefault.jpg`

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

  }

  // ==================================================
  // NORMAL VIDEO
  // ==================================================

  else {
    embed =
      new EmbedBuilder()

        .setColor(
          0x3498DB
        )

        .setTitle(
          "🎬 סרטון חדש עלה לערוץ!"
        )

        .setDescription(

          `📺 **${meta?.title || entry.title}**\n\n` +

          "🔥 שווה צפייה — אל תשכחו לייק וסאב!"

        )

        .setImage(

          meta?.thumbnail ||

          `https://i.ytimg.com/vi/${entry.videoId}/hqdefault.jpg`

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

      type ===
      "live"

        ? {
            parse: [
              "everyone"
            ]
          }

        : {
            parse: []
          }

  })
    .catch(
      error => {

        console.error(

          "❌ הודעת YouTube נכשלה:",

          error.message

        );

        return null;

      }
    );
}

// ======================================================
// LIVE ENDED
// ======================================================

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
    !channel ||
    !channel.isTextBased()
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

  if (
    !message
  ) {
    return;
  }

  const currentEmbed =

    message.embeds[0]

      ? EmbedBuilder.from(
          message.embeds[0]
        )

      : new EmbedBuilder();

  currentEmbed

    .setColor(
      0x747F8D
    )

    .setTitle(
      "⚫ 「 הלייב נגמר 」"
    )

    .setDescription(

      `📺 **${meta?.title || "הלייב"}**\n\n` +

      "השידור הסתיים, אבל הקישור נשאר פתוח כדי שתוכלו לצפות בשידור החוזר. 👇"

    )

    .setTimestamp();

  const replayButton =
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
      );

  await message.edit({

    content:
      null,

    embeds: [
      currentEmbed
    ],

    components: [

      new ActionRowBuilder()

        .addComponents(
          replayButton
        )

    ],

    allowedMentions: {
      parse: []
    }

  })
    .catch(
      () => {}
    );

  state.ended =
    true;

  await logBotData(
    `YT_ENDED|${videoId}`
  );
}

// ======================================================
// YOUTUBE CHECK
// ======================================================

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

    // ==================================================
    // FIRST START
    //
    // לא שולח פתאום את כל הסרטונים הישנים.
    // אם כרגע יש לייב פעיל - כן שולח אותו.
    // לייב עתידי נשאר במעקב עד שהוא מתחיל.
    // ==================================================

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
          )
            .catch(
              () => null
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
          // לייב מתוזמן שעדיין לא התחיל.
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

    // ==================================================
    // NEW CONTENT
    // ==================================================

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
        )
          .catch(
            () => null
          );

      if (
        !meta
      ) {
        continue;
      }

      // לייב מתוזמן שעדיין לא התחיל
      if (
        meta.isLiveContent &&
        !meta.isLiveNow &&
        !meta.endTimestamp
      ) {
        continue;
      }

      // אם לייב התחיל ונגמר כשהבוט היה כבוי,
      // לא נשלח אותו כאילו הוא סרטון רגיל.
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

      if (
        !sent
      ) {
        continue;
      }

      const state = {

        videoId:
          entry.videoId,

        type,

        messageId:
          sent.id,

        channelId:
          sent.channel.id,

        ended:
          type !==
          "live"

      };

      youtubeSeen.set(
        entry.videoId,
        state
      );

      await logBotData(

        `YT_SEEN|${entry.videoId}|${type}|${sent.id}|${sent.channel.id}`

      );
    }

    // ==================================================
    // CHECK ACTIVE LIVES
    // ==================================================

    for (
      const [
        videoId,
        state
      ] of
      youtubeSeen.entries()
    ) {
      if (
        state.type !==
        "live" ||

        state.ended
      ) {
        continue;
      }

      const meta =
        await getYouTubeVideoMeta(
          videoId
        )
          .catch(
            () => null
          );

      if (
        !meta
      ) {
        continue;
      }

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

  } catch (error) {
    console.error(

      "❌ בדיקת YouTube נכשלה:",

      error.message

    );

  } finally {
    youtubePollRunning =
      false;
  }
}

// ======================================================
// COMMANDS
// ======================================================

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
            "מה הפרס בהגרלה?"
          )

          .setRequired(
            true
          )

          .setMaxLength(
            200
          )
    )

    .addStringOption(
      option =>
        option

          .setName(
            "duration"
          )

          .setDescription(
            "זמן: למשל 30s, 10m, 2h, 1d"
          )

          .setRequired(
            true
          )

          .setMaxLength(
            20
          )
    )

    .addIntegerOption(
      option =>
        option

          .setName(
            "winners"
          )

          .setDescription(
            "כמה זוכים? ברירת מחדל: 1"
          )

          .setRequired(
            false
          )

          .setMinValue(
            1
          )

          .setMaxValue(
            10
          )
    );

// ======================================================
// READY
// ======================================================

client.once(
  "ready",
  async () => {

    console.log(
      `✅ הבוט מחובר בתור ${client.user.tag}`
    );

    // ==================================================
    // COMMANDS
    // ==================================================

    try {
      const rest =
        new REST({
          version:
            "10"
        })
          .setToken(
            TOKEN
          );

      await rest.put(

        Routes.applicationGuildCommands(
          CLIENT_ID,
          GUILD_ID
        ),

        {
          body: [

            staffManageCommand
              .toJSON(),

            giveawayCommand
              .toJSON()

          ]
        }

      );

      console.log(
        "✅ /staffmanage ו-/giveaway נטענו"
      );

    } catch (error) {
      console.error(
        "❌ שגיאה בפקודות:",
        error
      );
    }

    // ==================================================
    // BOT DATA
    // ==================================================

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

    // ==================================================
    // APPLICATION DATA
    // ==================================================

    await loadApplicationState();

    // ==================================================
    // STAFF NICKNAMES
    // ==================================================

    try {
      const guild =
        await client.guilds.fetch(
          GUILD_ID
        );

      const fullGuild =
        await guild.fetch();

      const members =
        await fullGuild.members.fetch();

      for (
        const member of
        members.values()
      ) {
        if (
          !member.user.bot &&

          getHighestLadderRoleId(
            member
          )
        ) {
          await applyStaffNickname(
            member
          );
        }
      }

    } catch (error) {
      console.error(

        "❌ שגיאה בסנכרון ניקניים:",

        error.message

      );
    }

    // ==================================================
    // TICKET PANEL
    // ==================================================

    try {
      const channel =
        await client.channels.fetch(
          PANEL_CHANNEL_ID
        );

      if (
        channel?.isTextBased()
      ) {
        const messages =
          await channel.messages.fetch({
            limit:
              100
          });

        const oldPanel =
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

        if (
          oldPanel
        ) {
          await oldPanel.edit({

            embeds: [
              createPanelEmbed()
            ],

            components: [
              createTicketMenu()
            ]

          });

        } else {
          await channel.send({

            embeds: [
              createPanelEmbed()
            ],

            components: [
              createTicketMenu()
            ]

          });
        }
      }

    } catch (error) {
      console.error(

        "❌ שגיאה בפאנל הטיקטים:",

        error

      );
    }

    // ==================================================
    // SUGGESTIONS PANEL
    // ==================================================

    try {
      await setupSuggestionsPanel();

    } catch (error) {
      console.error(

        "❌ שגיאה בפאנל ההצעות:",

        error

      );
    }

    // ==================================================
    // YOUTUBE
    // ==================================================

    await pollYouTube();

    setInterval(
      () => {

        pollYouTube()
          .catch(
            () => {}
          );

      },

      YOUTUBE_CHECK_INTERVAL_MS
    );
  }
);

// ======================================================
// MEMBER JOIN
// ======================================================

client.on(
  "guildMemberAdd",
  async member => {

    try {
      if (
        member.user.bot
      ) {
        return;
      }

      // Welcome
      await sendWelcomeMessage(
        member
      );

      const currentName =

        member.nickname ||

        member.user.globalName ||

        member.user.username;

      if (
        getHighestLadderRoleId(
          member
        )
      ) {
        await applyStaffNickname(
          member
        );

      } else if (
        hasReservedPrefix(
          currentName
        )
      ) {
        await handleUnauthorizedStaffName(

          member,

          currentName

        );
      }

    } catch (error) {
      console.error(
        "❌ guildMemberAdd:",
        error
      );
    }
  }
);

// ======================================================
// MEMBER UPDATE
// ======================================================

client.on(
  "guildMemberUpdate",
  async (
    oldMember,
    newMember
  ) => {

    try {
      if (
        newMember.user.bot
      ) {
        return;
      }

      const oldRole =
        getHighestLadderRoleId(
          oldMember
        );

      const newRole =
        getHighestLadderRoleId(
          newMember
        );

      const rolesChanged =
        oldRole !==
        newRole;

      const nicknameChanged =
        oldMember.nickname !==
        newMember.nickname;

      // =================================================
      // REAL PROMOTION / DEMOTION
      // =================================================

      if (
        rolesChanged
      ) {
        if (
          newRole
        ) {
          await applyStaffNickname(
            newMember
          );

        } else if (
          oldRole
        ) {
          await restoreNicknameAfterLeavingStaff(
            newMember
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

      // =================================================
      // STAFF CHANGED NAME
      // =================================================

      if (
        newRole
      ) {
        const punished =
          await handleFakePromotion(

            newMember,

            currentName

          );

        if (
          punished
        ) {
          return;
        }

        await applyStaffNickname(
          newMember
        );

        return;
      }

      // =================================================
      // NON STAFF USING STAFF PREFIX
      // =================================================

      if (
        hasReservedPrefix(
          currentName
        )
      ) {
        await handleUnauthorizedStaffName(

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

// ======================================================
// INTERACTIONS
// ======================================================

client.on(
  "interactionCreate",
  async interaction => {

    // ==================================================
    // OWNER NICKNAME BUTTON
    // ==================================================

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
            "❌ אין לך הרשאה להשתמש בכפתור הזה."

        });
      }

      const [
        ,
        guildId,
        memberId
      ] =
        interaction.customId
          .split(":");

      const modal =
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

          );

      return interaction.showModal(
        modal
      );
    }

    // ==================================================
    // OWNER NICKNAME MODAL
    // ==================================================

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
            "❌ אין לך הרשאה."
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
        !member ||
        !member.manageable
      ) {
        return interaction.reply({

          content:
            "❌ לא הצלחתי לשנות את הניקניים."

        });
      }

      await member.setNickname(

        nickname,

        "שינוי ידני על ידי בעל הבוט"

      )
        .catch(
          () => null
        );

      return interaction.reply({

        content:
          `✅ הניקניים של ${member.user} שונה ל-\`${nickname}\`.`

      });
    }

    // ==================================================
    // /GIVEAWAY
    // ==================================================

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

      const durationText =
        interaction.options
          .getString(
            "duration",
            true
          );

      const durationMs =
        parseGiveawayDuration(
          durationText
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

            "המינימום הוא 10 שניות והמקסימום 30 יום.",

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
          `✅ ההגרלה נפתחה בהצלחה: ${message.url}`
        );

      } catch (error) {
        console.error(
          "❌ שגיאה בפתיחת הגרלה:",
          error
        );

        return interaction.editReply(
          "❌ הייתה בעיה בפתיחת ההגרלה."
        );
      }
    }

    // ==================================================
    // GIVEAWAY JOIN / LEAVE
    // ==================================================

    if (
      interaction.isButton() &&

      interaction.customId ===
      "giveaway_join"
    ) {
      const giveaway =
        activeGiveaways.get(
          interaction.message.id
        );

      if (
        !giveaway
      ) {
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

      })
        .catch(
          () => {}
        );

      return interaction.editReply(

        joined

          ? "✅ נכנסת להגרלה! בהצלחה 🎉"

          : "↩️ יצאת מההגרלה."

      );
    }

    // ==================================================
    // END GIVEAWAY
    // ==================================================

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
        "✅ ההגרלה נסגרה והזוכה נבחר באקראי."
      );
    }

    // ==================================================
    // /STAFFMANAGE
    // ==================================================

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

      const userSelect =
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
          );

      return interaction.reply({

        content:
          "🛡️ **ניהול צוות**\nבחר משתמש:",

        components: [

          new ActionRowBuilder()

            .addComponents(
              userSelect
            )

        ],

        ephemeral:
          true

      });
    }

    // ==================================================
    // STAFF MANAGEMENT SELECT USER
    // ==================================================

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

      const targetId =
        interaction.values[0];

      const member =
        await fetchFreshMember(

          interaction.guild,

          targetId

        )
          .catch(
            () => null
          );

      if (
        !member
      ) {
        return interaction.update({

          content:
            "❌ לא מצאתי את המשתמש בשרת.",

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

    // ==================================================
    // SUGGESTIONS MENU
    // ==================================================

    if (
      interaction.isStringSelectMenu() &&

      interaction.customId ===
      "suggestion_type"
    ) {
      const type =
        interaction.values[0];

      if (
        !suggestionTypes[
          type
        ]
      ) {
        return interaction.reply({

          content:
            "❌ האפשרות הזאת לא קיימת.",

          ephemeral:
            true

        });
      }

      await interaction.showModal(

        createSuggestionModal(
          type
        )

      );

      await interaction.message.edit({

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

    // ==================================================
    // SUGGESTION SUBMIT
    // ==================================================

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

      if (
        !config
      ) {
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
        !destination ||
        !destination.isTextBased()
      ) {
        return interaction.editReply(
          "❌ חדר ההצעות לא נמצא."
        );
      }

      const tempState = {

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

            createSuggestionEmbedFromData(

              type,

              interaction.user.id,

              idea,

              tempState

            )

          ],

          components: [

            createSuggestionButtons(
              tempState
            )

          ],

          allowedMentions: {
            parse: []
          }

        });

      tempState.messageId =
        message.id;

      suggestionStates.set(

        message.id,

        tempState

      );

      await logBotData(

        `SUGG_CREATE|${message.id}|${interaction.user.id}|${type}|${config.channelId}`

      );

      return interaction.editReply(
        `✅ הרעיון נשלח בהצלחה! ${message.url}`
      );
    }

    // ==================================================
    // SUGGESTION VOTING
    // ==================================================

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
        getOrHydrateSuggestionState(
          interaction.message
        );

      if (
        !state
      ) {
        return interaction.reply({

          content:
            "❌ לא הצלחתי לקרוא את ההצעה הזאת.",

          ephemeral:
            true

        });
      }

      if (
        state.status !==
        "open"
      ) {
        return interaction.reply({

          content:
            "🔒 ההצעה הזאת כבר לא פתוחה להצבעה.",

          ephemeral:
            true

        });
      }

      // אי אפשר להצביע לעצמך
      if (
        interaction.user.id ===
        state.creatorId
      ) {
        return interaction.reply({

          content:
            "❌ אי אפשר להצביע על ההצעה של עצמך.",

          ephemeral:
            true

        });
      }

      if (
        processingSuggestions.has(
          interaction.message.id
        )
      ) {
        return interaction.reply({

          content:
            "⏳ רגע, מתבצעת הצבעה אחרת כרגע.",

          ephemeral:
            true

        });
      }

      processingSuggestions.add(
        interaction.message.id
      );

      await interaction.deferReply({
        ephemeral:
          true
      });

      try {
        const newChoice =

          interaction.customId ===
          "suggestion_vote_up"

            ? "up"

            : "down";

        const previous =
          state.votes.get(
            interaction.user.id
          ) ||
          null;

        let resultText;

        // לחץ שוב על אותו כפתור = ביטול
        if (
          previous ===
          newChoice
        ) {
          state.votes.delete(
            interaction.user.id
          );

          await logBotData(

            `SUGG_VOTE|${interaction.message.id}|${interaction.user.id}|none`

          );

          resultText =
            "↩️ ההצבעה שלך בוטלה.";

        }

        // החליף 👍 -> 👎 או 👎 -> 👍
        else {
          state.votes.set(

            interaction.user.id,

            newChoice

          );

          await logBotData(

            `SUGG_VOTE|${interaction.message.id}|${interaction.user.id}|${newChoice}`

          );

          resultText =

            newChoice ===
            "up"

              ? "👍 הצבעת **בעד**."

              : "👎 הצבעת **נגד**.";
        }

        await updateSuggestionPublicMessage(

          interaction.message,

          state

        );

        const {
          up
        } =
          countSuggestionVotes(
            state
          );

        // ברגע שמגיע ל-5 בעד
        if (
          up >=
          5 &&

          !state.thresholdNotified
        ) {
          state.thresholdNotified =
            true;

          await logBotData(

            `SUGG_THRESHOLD|${interaction.message.id}`

          );

          await notifyOwnerSuggestionReachedFive(

            interaction.message,

            state

          );
        }

        return interaction.editReply(
          resultText
        );

      } finally {
        processingSuggestions.delete(
          interaction.message.id
        );
      }
    }

    // ==================================================
    // SUGGESTION STAFF OPTIONS
    // ==================================================

    if (
      interaction.isButton() &&

      interaction.customId ===
      "suggestion_staff_options"
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
            "❌ אין לך גישה לאפשרויות צוות.",

          ephemeral:
            true

        });
      }

      const state =
        getOrHydrateSuggestionState(
          interaction.message
        );

      if (
        !state ||
        state.status !==
        "open"
      ) {
        return interaction.reply({

          content:
            "🔒 ההצעה הזאת כבר טופלה.",

          ephemeral:
            true

        });
      }

      return interaction.reply({

        content:

          "🛡️ **אפשרויות צוות**\n" +

          "בחר מה לעשות עם ההצעה:",

        components: [

          createSuggestionStaffOptionsRow(

            interaction.message.id,

            interaction.user.id ===
            OWNER_USER_ID

          )

        ],

        ephemeral:
          true

      });
    }

    // ==================================================
    // SUGGESTION FORWARD TO OWNER
    // ==================================================

    if (
      interaction.isButton() &&

      interaction.customId.startsWith(
        "suggestion_forward:"
      )
    ) {
      const messageId =
        interaction.customId
          .split(":")[1];

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
            "❌ אין לך גישה.",

          ephemeral:
            true

        });
      }

      const state =
        suggestionStates.get(
          messageId
        );

      if (
        !state
      ) {
        return interaction.reply({

          content:
            "❌ לא מצאתי את ההצעה.",

          ephemeral:
            true

        });
      }

      if (
        state.status !==
        "open"
      ) {
        return interaction.reply({

          content:
            "🔒 ההצעה כבר טופלה.",

          ephemeral:
            true

        });
      }

      if (
        state.forwardedBy
      ) {
        return interaction.reply({

          content:
            `ℹ️ ההצעה כבר הועברה לבעלים על ידי <@${state.forwardedBy}>.`,

          ephemeral:
            true

        });
      }

      await interaction.deferReply({
        ephemeral:
          true
      });

      const suggestionChannel =
        await client.channels
          .fetch(
            state.channelId
          )
          .catch(
            () => null
          );

      const suggestionMessage =

        suggestionChannel
          ?.isTextBased()

          ? await suggestionChannel.messages
              .fetch(
                messageId
              )
              .catch(
                () => null
              )

          : null;

      if (
        !suggestionMessage
      ) {
        return interaction.editReply(
          "❌ לא מצאתי את הודעת ההצעה."
        );
      }

      const sent =
        await sendSuggestionForwardToOwner(

          suggestionMessage,

          state,

          interaction.user

        );

      if (
        !sent
      ) {
        return interaction.editReply(

          "❌ לא הצלחתי לשלוח הודעה פרטית לבעלים."

        );
      }

      state.forwardedBy =
        interaction.user.id;

      await logBotData(

        `SUGG_FORWARD|${messageId}|${interaction.user.id}`

      );

      await updateSuggestionPublicMessage(

        suggestionMessage,

        state

      );

      return interaction.editReply(
        "✅ ההצעה נשלחה לבעלים בפרטי."
      );
    }

    // ==================================================
    // CLOSE SUGGESTION
    // ==================================================

    if (
      interaction.isButton() &&

      interaction.customId.startsWith(
        "suggestion_close:"
      )
    ) {
      const messageId =
        interaction.customId
          .split(":")[1];

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
            "❌ אין לך גישה.",

          ephemeral:
            true

        });
      }

      const state =
        suggestionStates.get(
          messageId
        );

      if (
        !state
      ) {
        return interaction.reply({

          content:
            "❌ לא מצאתי את ההצעה.",

          ephemeral:
            true

        });
      }

      if (
        state.status !==
        "open"
      ) {
        return interaction.reply({

          content:
            "ℹ️ ההצעה כבר טופלה.",

          ephemeral:
            true

        });
      }

      await interaction.deferReply({
        ephemeral:
          true
      });

      state.status =
        "closed";

      state.statusBy =
        interaction.user.id;

      await logBotData(

        `SUGG_STATUS|${messageId}|closed|${interaction.user.id}`

      );

      const suggestionChannel =
        await client.channels
          .fetch(
            state.channelId
          )
          .catch(
            () => null
          );

      const suggestionMessage =

        suggestionChannel
          ?.isTextBased()

          ? await suggestionChannel.messages
              .fetch(
                messageId
              )
              .catch(
                () => null
              )

          : null;

      if (
        suggestionMessage
      ) {
        await updateSuggestionPublicMessage(

          suggestionMessage,

          state

        );
      }

      await sendSuggestionCreatorDM(

        state,

        "closed",

        interaction.user

      );

      return interaction.editReply(

        "🔒 ההצעה נסגרה, ההצבעה ננעלה והיוצר קיבל הודעה פרטית."

      );
    }

    // ==================================================
    // APPROVE SUGGESTION - ONLY OWNER
    // ==================================================

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
            "❌ רק בעל השרת יכול לאשר הצעה.",

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

      if (
        !state
      ) {
        return interaction.reply({

          content:
            "❌ לא מצאתי את ההצעה.",

          ephemeral:
            true

        });
      }

      if (
        state.status !==
        "open"
      ) {
        return interaction.reply({

          content:
            "ℹ️ ההצעה כבר טופלה.",

          ephemeral:
            true

        });
      }

      await interaction.deferReply({
        ephemeral:
          true
      });

      state.status =
        "approved";

      state.statusBy =
        interaction.user.id;

      await logBotData(

        `SUGG_STATUS|${messageId}|approved|${interaction.user.id}`

      );

      const suggestionChannel =
        await client.channels
          .fetch(
            state.channelId
          )
          .catch(
            () => null
          );

      const suggestionMessage =

        suggestionChannel
          ?.isTextBased()

          ? await suggestionChannel.messages
              .fetch(
                messageId
              )
              .catch(
                () => null
              )

          : null;

      if (
        suggestionMessage
      ) {
        await updateSuggestionPublicMessage(

          suggestionMessage,

          state

        );
      }

      await sendSuggestionCreatorDM(

        state,

        "approved"

      );

      return interaction.editReply(

        "✅ ההצעה אושרה, סומנה כ-**בטיפול**, ההצבעה ננעלה והיוצר קיבל הודעה פרטית."

      );
    }

    // ==================================================
    // TICKET MENU
    // ==================================================

    if (
      interaction.isStringSelectMenu() &&

      interaction.customId ===
      "ticket_type"
    ) {
      const type =
        interaction.values[0];

      // ================================================
      // STAFF APPLICATION / PROMOTION
      // ================================================

      if (
        type ===
        "staff"
      ) {
        const member =
          await fetchFreshMember(

            interaction.guild,

            interaction.user.id

          );

        const currentRoleId =
          getHighestLadderRoleId(
            member
          );

        if (
          currentRoleId ===
          ROLE_TOP
        ) {
          await interaction.reply({

            content:
              "🏆 כבר הגעת לדרגה הגבוהה ביותר ואין כרגע קידום נוסף.",

            ephemeral:
              true

          });

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

        const applicationType =

          currentRoleId

            ? "promotion"

            : "initial";

        if (
          applicationType ===
          "initial"
        ) {
          const expiry =
            getCooldownExpiry(
              interaction.user.id
            );

          if (
            expiry
          ) {
            await interaction.reply({

              content:

                `⏳ ניתן להגיש בקשה חדשה <t:${Math.floor(
                  expiry /
                  1000
                )}:R>.`,

              ephemeral:
                true

            });

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
        }

        if (
          pendingApplications.has(

            applicationKey(

              applicationType,

              interaction.user.id

            )

          )
        ) {
          await interaction.reply({

            content:
              "⏳ כבר יש לך בקשה שממתינה לטיפול.",

            ephemeral:
              true

          });

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

        await interaction.showModal(

          createStaffApplicationModal(
            applicationType
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

      // ================================================
      // NORMAL TICKET
      // ================================================

      await interaction.deferReply({
        ephemeral:
          true
      });

      try {
        const guild =
          interaction.guild;

        const ticketType =
          ticketTypes[
            type
          ];

        if (
          !ticketType
        ) {
          return interaction.editReply(
            "❌ סוג הטיקט לא נמצא."
          );
        }

        await guild.channels.fetch();

        const existingTicket =
          guild.channels.cache.find(

            channel =>
              channel.topic?.includes(

                `ticket-owner:${interaction.user.id}`

              )

          );

        if (
          existingTicket
        ) {
          await interaction.message.edit({

            components: [
              createTicketMenu()
            ]

          });

          return interaction.editReply(

            `❌ כבר יש לך טיקט פתוח: ${existingTicket}`

          );
        }

        let validCategoryId =
          null;

        if (
          CATEGORY_ID
        ) {
          const category =
            await guild.channels
              .fetch(
                CATEGORY_ID
              )
              .catch(
                () => null
              );

          if (
            category &&

            category.type ===
            ChannelType.GuildCategory
          ) {
            validCategoryId =
              category.id;
          }
        }

        const channelData = {

          name:

            `${ticketType.channelName}-` +

            `${interaction.user.id.slice(-5)}`,

          type:
            ChannelType.GuildText,

          topic:

            `ticket-owner:${interaction.user.id}` +

            `|type:${type}`,

          permissionOverwrites:
            createTicketPermissions(

              guild,

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
          await guild.channels.create(
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

        await interaction.message.edit({

          components: [
            createTicketMenu()
          ]

        });

        return interaction.editReply(
          `✅ הטיקט שלך נפתח: ${channel}`
        );

      } catch (error) {
        console.error(
          "❌ שגיאה בפתיחת טיקט:",
          error
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

        return interaction.editReply(
          "❌ הייתה בעיה בפתיחת הטיקט."
        );
      }
    }

    // ==================================================
    // CLOSE TICKET
    // ==================================================

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
            "❌ רק צוות מורשה יכול לסגור את הטיקט.",

          ephemeral:
            true

        });
      }

      if (
        !interaction.channel.topic?.includes(
          "ticket-owner:"
        )
      ) {
        return interaction.reply({

          content:
            "❌ החדר הזה אינו טיקט.",

          ephemeral:
            true

        });
      }

      await interaction.reply(
        "🔒 הטיקט יימחק בעוד 3 שניות..."
      );

      setTimeout(

        async () => {

          await interaction.channel
            .delete()
            .catch(
              () => {}
            );

        },

        3000

      );

      return;
    }

    // ==================================================
    // APPLICATION SUBMIT
    // ==================================================

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

      try {
        const requestedType =
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

        if (
          requestedType ===
          "initial" &&

          currentRoleId
        ) {
          return interaction.editReply(

            "ℹ️ הדרגה שלך השתנתה. פתח/י מחדש את הבחינה."

          );
        }

        if (
          requestedType ===
          "promotion" &&

          !currentRoleId
        ) {
          return interaction.editReply(

            "ℹ️ כרגע אינך מזוהה כחבר/ת צוות."

          );
        }

        if (
          requestedType ===
          "promotion" &&

          currentRoleId ===
          ROLE_TOP
        ) {
          return interaction.editReply(
            "🏆 כבר הגעת לדרגה הגבוהה ביותר."
          );
        }

        if (
          requestedType ===
          "initial"
        ) {
          const expiry =
            getCooldownExpiry(
              interaction.user.id
            );

          if (
            expiry
          ) {
            return interaction.editReply(

              `⏳ ניתן להגיש בקשה חדשה <t:${Math.floor(
                expiry /
                1000
              )}:R>.`

            );
          }
        }

        const key =
          applicationKey(

            requestedType,

            interaction.user.id

          );

        if (
          pendingApplications.has(
            key
          )
        ) {
          return interaction.editReply(

            "⏳ כבר קיימת בקשה שלך שממתינה לטיפול."

          );
        }

        const applicationChannel =
          await client.channels.fetch(

            STAFF_APPLICATION_CHANNEL_ID

          );

        if (
          !applicationChannel ||
          !applicationChannel.isTextBased()
        ) {
          return interaction.editReply(

            "❌ חדר הבקשות לא נמצא."

          );
        }

        const isPromotion =
          requestedType ===
          "promotion";

        const currentRoleName =

          currentRoleId

            ? await getRoleName(

                interaction.guild,

                currentRoleId

              )

            : null;

        const embed =
          new EmbedBuilder()

            .setTitle(

              isPromotion

                ? "⬆️ בקשת קידום חדשה בצוות"

                : "🛡️ בקשה חדשה להצטרפות לצוות"

            )

            .setDescription(

              `${interaction.user} שלח/ה **${

                isPromotion

                  ? "בקשת קידום בצוות"

                  : "בקשה להצטרפות לצוות"

              }**.`

            )

            .addFields(

              {
                name:
                  "👤 משתמש",

                value:

                  `${interaction.user}\n` +

                  `\`${interaction.user.id}\``

              },

              ...(
                isPromotion

                  ? [
                      {
                        name:
                          "🎖️ דרגה נוכחית",

                        value:

                          `${currentRoleName}\n` +

                          `<@&${currentRoleId}>`

                      }
                    ]

                  : []
              ),

              {
                name:
                  "🎂 בן כמה את/ה?",

                value:
                  interaction.fields
                    .getTextInputValue(
                      "age"
                    )
              },

              {
                name:
                  "⚠️ אם שני אנשים רבים ומקללים, מה את/ה עושה?",

                value:
                  interaction.fields
                    .getTextInputValue(
                      "situation"
                    )
              },

              {
                name:
                  "📛 איך קוראים לך?",

                value:
                  interaction.fields
                    .getTextInputValue(
                      "name"
                    )
              },

              {
                name:
                  "🛡️ יש לך ניסיון בניהול?",

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

                  requestedType,

                  "pending"

                )

            })

            .setTimestamp();

        const approveButton =
          new ButtonBuilder()

            .setCustomId(

              `app_approve:${requestedType}:${interaction.user.id}`

            )

            .setLabel(
              "לאשר"
            )

            .setEmoji(
              "✅"
            )

            .setStyle(
              ButtonStyle.Success
            );

        const rejectButton =
          new ButtonBuilder()

            .setCustomId(

              `app_reject:${requestedType}:${interaction.user.id}`

            )

            .setLabel(
              "לא לאשר"
            )

            .setEmoji(
              "❌"
            )

            .setStyle(
              ButtonStyle.Danger
            );

        await applicationChannel.send({

          content:
            getStaffMentions(),

          embeds: [
            embed
          ],

          components: [

            new ActionRowBuilder()

              .addComponents(

                approveButton,

                rejectButton

              )

          ],

          allowedMentions: {
            roles:
              STAFF_ACCESS_ROLE_IDS
          }

        });

        pendingApplications.add(
          key
        );

        const dmSent =
          await sendApplicantDM(

            interaction.user.id,

            requestedType,

            "pending"

          );

        return interaction.editReply(

          dmSent

            ? "✅ הבקשה נשלחה ונשלחה לך גם הודעה פרטית."

            : "✅ הבקשה נשלחה. לא הצלחתי לשלוח הודעה פרטית."

        );

      } catch (error) {
        console.error(

          "❌ שגיאה בשליחת בקשה:",

          error

        );

        return interaction.editReply(
          "❌ הייתה בעיה בשליחת הבקשה."
        );
      }
    }

    // ==================================================
    // APPROVE APPLICATION
    // ==================================================

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
            "❌ אין לך הרשאה לטפל בבקשה הזאת.",

          ephemeral:
            true

        });
      }

      if (
        processingApplications.has(
          interaction.message.id
        )
      ) {
        return interaction.reply({

          content:
            "⏳ מישהו כבר מטפל בבקשה הזאת.",

          ephemeral:
            true

        });
      }

      processingApplications.add(
        interaction.message.id
      );

      await interaction.deferUpdate();

      try {
        const applicant =
          await fetchFreshMember(

            interaction.guild,

            applicantId

          )
            .catch(
              () => null
            );

        if (
          !applicant
        ) {
          return interaction.followUp({

            content:
              "❌ המשתמש כבר לא נמצא בשרת.",

            ephemeral:
              true

          });
        }

        const currentRoleId =
          getHighestLadderRoleId(
            applicant
          );

        let targets;

        let labels =
          {};

        if (
          type ===
          "initial"
        ) {
          if (
            currentRoleId
          ) {
            return interaction.followUp({

              content:
                "ℹ️ המשתמש כבר נמצא בצוות.",

              ephemeral:
                true

            });
          }

          // עדיין אפשר להתחיל Stuff או Team
          targets = [
            ROLE_STAFF,
            ROLE_TEAM
          ];

          labels = {

            [ROLE_STAFF]:
              "Stuff",

            [ROLE_TEAM]:
              "Team"

          };

        } else {
          if (
            !currentRoleId
          ) {
            return interaction.followUp({

              content:
                "❌ המשתמש כבר לא נמצא בצוות.",

              ephemeral:
                true

            });
          }

          targets =
            getPromotionTargets(
              currentRoleId
            );

          labels =
            getPromotionLabels(
              currentRoleId
            );

          if (
            !targets.length
          ) {
            return interaction.followUp({

              content:
                "🏆 המשתמש כבר בדרגה הגבוהה ביותר.",

              ephemeral:
                true

            });
          }
        }

        const updatedEmbed =
          EmbedBuilder.from(
            interaction.message.embeds[0]
          );

        setStatusField(

          updatedEmbed,

          "✅ **אושר עקרונית — עכשיו בחרו איזה רול לתת**"

        );

        updatedEmbed.setFooter({

          text:
            buildApplicationFooter(

              applicantId,

              type,

              "awaiting_role"

            )

        });

        const roleRow =
          await createRoleChoiceRow(

            interaction.guild,

            applicantId,

            targets,

            `app_assign:${type}`,

            labels

          );

        return interaction.editReply({

          embeds: [
            updatedEmbed
          ],

          components: [
            roleRow
          ]

        });

      } finally {
        processingApplications.delete(
          interaction.message.id
        );
      }
    }

    // ==================================================
    // REJECT APPLICATION
    // ==================================================

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

      if (
        processingApplications.has(
          interaction.message.id
        )
      ) {
        return interaction.reply({

          content:
            "⏳ מישהו כבר מטפל בבקשה.",

          ephemeral:
            true

        });
      }

      processingApplications.add(
        interaction.message.id
      );

      await interaction.deferUpdate();

      try {
        const rejectedAt =
          Date.now();

        if (
          type ===
          "initial"
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

        const updatedEmbed =
          EmbedBuilder.from(
            interaction.message.embeds[0]
          );

        setStatusField(

          updatedEmbed,

          `❌ **לא אושר**\nטופל על ידי ${interaction.user}`

        );

        updatedEmbed.setFooter({

          text:
            buildApplicationFooter(

              applicantId,

              type,

              "rejected",

              rejectedAt

            )

        });

        return interaction.editReply({

          embeds: [
            updatedEmbed
          ],

          components: [

            createHandledRow(
              reviewer.displayName
            )

          ]

        });

      } finally {
        processingApplications.delete(
          interaction.message.id
        );
      }
    }

    // ==================================================
    // ASSIGN ROLE AFTER APPROVAL
    // ==================================================

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

      if (
        processingApplications.has(
          interaction.message.id
        )
      ) {
        return interaction.reply({

          content:
            "⏳ מישהו כבר מטפל בבקשה.",

          ephemeral:
            true

        });
      }

      processingApplications.add(
        interaction.message.id
      );

      await interaction.deferUpdate();

      try {
        const applicant =
          await fetchFreshMember(

            interaction.guild,

            applicantId

          )
            .catch(
              () => null
            );

        if (
          !applicant
        ) {
          return interaction.followUp({

            content:
              "❌ המשתמש כבר לא נמצא בשרת.",

            ephemeral:
              true

          });
        }

        const beforeRoleId =
          getHighestLadderRoleId(
            applicant
          );

        const allowedTargets =

          type ===
          "initial"

            ? [
                ROLE_STAFF,
                ROLE_TEAM
              ]

            : getPromotionTargets(
                beforeRoleId
              );

        if (
          !allowedTargets.includes(
            targetRoleId
          )
        ) {
          return interaction.followUp({

            content:
              "❌ הדרגה הזאת כבר לא מתאימה למצב הנוכחי.",

            ephemeral:
              true

          });
        }

        await applicant.roles.add(
          targetRoleId
        );

        const freshApplicant =
          await fetchFreshMember(

            interaction.guild,

            applicantId

          );

        await applyStaffNickname(
          freshApplicant
        );

        const targetRoleName =
          await getRoleName(

            interaction.guild,

            targetRoleId

          );

        pendingApplications.delete(

          applicationKey(
            type,
            applicantId
          )

        );

        await sendApplicantDM(

          applicantId,

          type,

          "approved",

          targetRoleName

        );

        await sendStaffLog({

          guild:
            interaction.guild,

          targetMember:
            freshApplicant,

          actorUser:
            interaction.user,

          title:

            type ===
            "initial"

              ? "✅ צירוף חדש לצוות"

              : "⬆️ קידום צוות",

          fromRoleId:
            beforeRoleId,

          toRoleId:
            targetRoleId

        });

        const updatedEmbed =
          EmbedBuilder.from(
            interaction.message.embeds[0]
          );

        setStatusField(

          updatedEmbed,

          `✅ **אושר**\n` +

          `🎖️ דרגה: **${targetRoleName}**\n` +

          `טופל על ידי ${interaction.user}`

        );

        updatedEmbed.setFooter({

          text:
            buildApplicationFooter(

              applicantId,

              type,

              "approved"

            )

        });

        return interaction.editReply({

          embeds: [
            updatedEmbed
          ],

          components: [

            createHandledRow(
              reviewer.displayName
            )

          ]

        });

      } finally {
        processingApplications.delete(
          interaction.message.id
        );
      }
    }

    // ==================================================
    // MANAGE ADD
    // ==================================================

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
            "❌ אין לך גישה לפאנל הזה.",

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

      if (
        !member
      ) {
        await interaction.deferUpdate();

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
              ROLE_STAFF,
              ROLE_TEAM
            ],

            "manage_add_to",

            {
              [ROLE_STAFF]:
                "Stuff",

              [ROLE_TEAM]:
                "Team"
            }

          )

        ]

      });
    }

    // ==================================================
    // MANAGE ADD TO
    // ==================================================

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
            "❌ אין לך גישה לפאנל הזה.",

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

      if (
        !member
      ) {
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

      const freshMember =
        await fetchFreshMember(

          interaction.guild,

          targetId

        );

      await applyStaffNickname(
        freshMember
      );

      await sendStaffLog({

        guild:
          interaction.guild,

        targetMember:
          freshMember,

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

        `✅ ${freshMember.user} נוסף/ה לצוות בתור **${await getRoleName(
          interaction.guild,
          targetRoleId
        )}**.`

      );
    }

    // ==================================================
    // MANAGE PROMOTE
    // ==================================================

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
            "❌ אין לך גישה לפאנל הזה.",

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

      if (
        !member
      ) {
        await interaction.deferUpdate();

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

      const targets =
        getPromotionTargets(
          currentRoleId
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
              currentRoleId
            )

          )

        ]

      });
    }

    // ==================================================
    // MANAGE PROMOTE TO
    // ==================================================

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
            "❌ אין לך גישה לפאנל הזה.",

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

      if (
        !member
      ) {
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
        )
          .includes(
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

      const freshMember =
        await fetchFreshMember(

          interaction.guild,

          targetId

        );

      await applyStaffNickname(
        freshMember
      );

      await sendStaffLog({

        guild:
          interaction.guild,

        targetMember:
          freshMember,

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

        `✅ ${freshMember.user} קודם/ה ל-**${await getRoleName(
          interaction.guild,
          targetRoleId
        )}**.`

      );
    }

    // ==================================================
    // MANAGE DEMOTE
    // ==================================================

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
            "❌ אין לך גישה לפאנל הזה.",

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

      if (
        !member
      ) {
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

      if (
        !currentRoleId
      ) {
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

      let previousRoleId =
        null;

      for (
        let i =
          currentIndex - 1;

        i >= 0;

        i--
      ) {
        if (
          member.roles.cache.has(
            LADDER_ROLE_IDS[i]
          )
        ) {
          previousRoleId =
            LADDER_ROLE_IDS[i];

          break;
        }
      }

      if (
        !previousRoleId
      ) {
        return refreshManagementPanel(

          interaction,

          targetId,

          "ℹ️ אין דרגה קודמת שמורה. אם אתה רוצה להוציא אותו מהצוות, השתמש ב-**הורדה מהצוות**."

        );
      }

      await member.roles.remove(
        currentRoleId
      );

      const freshMember =
        await fetchFreshMember(

          interaction.guild,

          targetId

        );

      await applyStaffNickname(
        freshMember
      );

      await sendStaffLog({

        guild:
          interaction.guild,

        targetMember:
          freshMember,

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

        `✅ ${freshMember.user} הורד/ה ל-**${await getRoleName(
          interaction.guild,
          previousRoleId
        )}**.`

      );
    }

    // ==================================================
    // MANAGE REMOVE
    // ==================================================

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
            "❌ אין לך גישה לפאנל הזה.",

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

      if (
        !member
      ) {
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
        STAFF_ACCESS_ROLE_IDS.filter(

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

      for (
        const roleId of
        rolesToRemove
      ) {
        await member.roles.remove(
          roleId
        );
      }

      const freshMember =
        await fetchFreshMember(

          interaction.guild,

          targetId

        );

      await restoreNicknameAfterLeavingStaff(
        freshMember
      );

      await sendStaffLog({

        guild:
          interaction.guild,

        targetMember:
          freshMember,

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

        `✅ ${freshMember.user} הוסר/ה מהצוות.`

      );
    }

  }
);

// ======================================================
// LOGIN
// ======================================================

client.login(
  TOKEN
);
