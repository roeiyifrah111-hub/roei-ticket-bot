const {
  Client, GatewayIntentBits, PermissionFlagsBits, ChannelType,
  ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
  UserSelectMenuBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder,
  TextInputStyle, ButtonBuilder, ButtonStyle, SlashCommandBuilder, REST, Routes
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

// ======================================================
// IDS
// ======================================================

const OWNER_USER_ID = "1243097719262941224";

const PANEL_CHANNEL_ID = "1541390151757078599";

const STAFF_APPLICATION_CHANNEL_ID =
  "1541391169936687195";

const STAFF_LOG_CHANNEL_ID =
  "1555688820916363354";

const WELCOME_CHANNEL_ID =
  "1541376515961262100";

const RULES_CHANNEL_ID =
  "1541369624644554772";

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
// Stuff -> Big Stuff -> Team -> Admin -> Head Admin -> Co-owner
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

const NICKNAME_ROLES = [
  {
    roleId: ROLE_TOP,
    prefix: "CO"
  },

  {
    roleId: ROLE_HEAD_ADMIN,
    prefix: "HA"
  },

  {
    roleId: ROLE_ADMIN,
    prefix: "AD"
  },

  {
    roleId: ROLE_TEAM,
    prefix: "TM"
  },

  {
    roleId: ROLE_PROMO_1,
    prefix: "BST"
  },

  {
    roleId: ROLE_STAFF,
    prefix: "ST"
  }
];

const PREFIX_RANKS = {
  ST: 0,
  BST: 1,
  TM: 2,
  AD: 3,
  HA: 4,
  CO: 5
};

const RESERVED_PREFIX_REGEX =
  /^(ST|BST|TM|AD|HA|CO)\s*(?:[|｜│:\-–—]\s*)?/i;

const FAKE_PROMOTION_TIMEOUT_MS =
  15 * 60 * 1000;

const REJECT_COOLDOWN_MS =
  7 * 24 * 60 * 60 * 1000;

// ======================================================
// STATE
// ======================================================

const rejectionCooldowns =
  new Map();

const pendingApplications =
  new Set();

const processingApplications =
  new Set();

const activeGiveaways =
  new Map();

// ======================================================
// BASIC HELPERS
// ======================================================

async function fetchFreshMember(
  guild,
  userId
) {
  return guild.members.fetch({
    user: userId,
    force: true
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
      roleId =>
        `<@&${roleId}>`
    )

    .join(" ");
}

// ======================================================
// NICKNAME SYSTEM
// ======================================================

function getNicknamePrefixForMember(
  member
) {
  for (
    const item of
    NICKNAME_ROLES
  ) {
    if (
      member.roles.cache.has(
        item.roleId
      )
    ) {
      return item.prefix;
    }
  }

  return null;
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
    ? match[1].toUpperCase()
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
    base === "אין שם"
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
  ).trim();
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
      32 - prefixText.length
    );

  const base =
    getBaseName(
      member
    ).slice(
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

  try {
    await member.setNickname(
      wantedNickname,
      "עדכון ניקניים אוטומטי לפי דרגת צוות"
    );

  } catch (error) {
    console.error(
      "❌ שינוי ניקניים נכשל:",
      error.message
    );
  }
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

  if (!owner) {
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

  if (!owner) {
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
    member.user.displayAvatarURL({
      extension: "png",
      size: 256
    });

  const guildIcon =
    member.guild.iconURL({
      size: 256
    });

  const embed =
    new EmbedBuilder()

      .setTitle(
        "👋 ברוך/ה הבא/ה לשרת!"
      )

      .setDescription(

        `היי ${member} — כיף שהצטרפת! 🎉\n\n` +

        `📜 תתחיל/י מקריאת החוקים ב-<#${RULES_CHANNEL_ID}>\n` +

        `🎫 צריך עזרה? פותחים טיקט ב-<#${PANEL_CHANNEL_ID}>\n` +

        `💬 תכירו אנשים, תיהנו ותשמרו על החוקים.\n\n` +

        `👥 **את/ה חבר/ה מספר ${member.guild.memberCount} בשרת!**`

      )

      .setThumbnail(
        "attachment://welcome-avatar.png"
      )

      .setTimestamp();

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

  let files = [];

  try {
    const response =
      await fetch(
        avatarUrl
      );

    if (
      response.ok
    ) {
      const buffer =
        Buffer.from(
          await response.arrayBuffer()
        );

      files = [
        {
          attachment:
            buffer,

          name:
            "welcome-avatar.png"
        }
      ];

    } else {
      embed.setThumbnail(
        avatarUrl
      );
    }

  } catch {
    embed.setThumbnail(
      avatarUrl
    );
  }

  await channel.send({

    content:
      `🎉 ${member} ברוך/ה הבא/ה!`,

    embeds: [
      embed
    ],

    files,

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
      await channel.messages
        .fetch({

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
// APPLICATION DMS
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

  if (!user) {
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
// STAFF MANAGEMENT
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
// GIVEAWAY SYSTEM
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
              .join("\n")

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
        remaining <= 0
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

            staffManageCommand.toJSON(),

            giveawayCommand.toJSON()

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

    await loadApplicationState();

    // ================================================
    // Sync staff nicknames
    // ================================================

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

    // ================================================
    // Ticket panel
    // ================================================

    try {
      const channel =
        await client.channels.fetch(
          PANEL_CHANNEL_ID
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

    } catch (error) {
      console.error(
        "❌ שגיאה בפאנל הטיקטים:",
        error
      );
    }
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

      // הודעת ברוכים הבאים
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

      // ================================================
      // REAL PROMOTION / DEMOTION
      // ================================================

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

      // ================================================
      // STAFF MEMBER CHANGED NAME
      // ================================================

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

      // ================================================
      // NON STAFF USING STAFF TAG
      // ================================================

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
          );

      const input =
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
          );

      modal.addComponents(

        new ActionRowBuilder()
          .addComponents(
            input
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
            size: 256
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
    // JOIN / LEAVE GIVEAWAY
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

        content: "",

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
      // STAFF APPLICATION / PROMOTION APPLICATION
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
            `${ticketType.channelName}-${interaction.user.id.slice(-5)}`,

          type:
            ChannelType.GuildText,

          topic:
            `ticket-owner:${interaction.user.id}|type:${type}`,

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

      // אי אפשר לאשר את עצמך
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

        // ==============================================
        // NEW STAFF
        // ==============================================

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
          // ============================================
          // PROMOTION
          // ============================================

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
    // MANAGE REMOVE FROM STAFF
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

client.login(TOKEN);
