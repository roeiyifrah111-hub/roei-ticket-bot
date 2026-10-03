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
const STAFF_APPLICATION_CHANNEL_ID = "1541391169936687195";
const STAFF_LOG_CHANNEL_ID = "1555688820916363354";

// ======================================================
// STAFF ROLES
// ======================================================

// Stuff
const ROLE_STAFF = "1555587941575696444";

// Big Stuff
const ROLE_PROMO_1 = "1555588224636821526";

// Team
const ROLE_TEAM = "1555588615520653332";

// Co-owner
const ROLE_TOP = "1555588725398839376";

// רול נוסף שיכול לטפל בטיקטים
const EXTRA_HANDLER_ROLE = "1541371707011629077";

const STAFF_ACCESS_ROLE_IDS = [
  ROLE_STAFF,
  EXTRA_HANDLER_ROLE,
  ROLE_PROMO_1,
  ROLE_TEAM,
  ROLE_TOP
];

// מדרג נמוך -> גבוה
const LADDER_ROLE_IDS = [
  ROLE_STAFF,
  ROLE_PROMO_1,
  ROLE_TEAM,
  ROLE_TOP
];

// ======================================================
// NICKNAME SETTINGS
// ======================================================

const NICK_PREFIX_BY_ROLE = {
  [ROLE_STAFF]: "ST",
  [ROLE_PROMO_1]: "BST",
  [ROLE_TEAM]: "TM",
  [ROLE_TOP]: "CO"
};

const PREFIX_RANKS = {
  ST: 0,
  BST: 1,
  TM: 2,
  CO: 3
};

const STAFF_PREFIX_REGEX =
  /^\s*(?:ST|BST|TM|CO)\s*\|\s*/i;

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

const botNicknameChanges =
  new Set();

// ======================================================
// TICKET TYPES
// ======================================================

const ticketTypes = {
  report: {
    name: "דיווח על משתמש",
    emoji: "🚨",
    channelName: "דיווח"
  },

  technical: {
    name: "תמיכה טכנית",
    emoji: "🛠️",
    channelName: "תמיכה"
  },

  general: {
    name: "כללי",
    emoji: "💬",
    channelName: "כללי"
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
    user: userId,
    force: true
  });
}

function hasStaffAccess(member) {
  if (
    member.id ===
    OWNER_USER_ID
  ) {
    return true;
  }

  return STAFF_ACCESS_ROLE_IDS.some(
    roleId =>
      member.roles.cache.has(roleId)
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
      member.roles.cache.has(roleId)
    ) {
      return roleId;
    }
  }

  return null;
}

function getPromotionTargets(
  currentRoleId
) {
  if (
    currentRoleId ===
    ROLE_STAFF
  ) {
    return [
      ROLE_PROMO_1,
      ROLE_TEAM
    ];
  }

  if (
    currentRoleId ===
    ROLE_PROMO_1
  ) {
    return [
      ROLE_TEAM
    ];
  }

  if (
    currentRoleId ===
    ROLE_TEAM
  ) {
    return [
      ROLE_TOP
    ];
  }

  return [];
}

function getPromotionLabels(
  currentRoleId
) {
  if (
    currentRoleId ===
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
    currentRoleId ===
    ROLE_PROMO_1
  ) {
    return {
      [ROLE_TEAM]:
        "Team"
    };
  }

  if (
    currentRoleId ===
    ROLE_TEAM
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
      .catch(() => null);

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

function stripStaffPrefix(name) {
  const cleaned =
    String(name || "")
      .replace(
        STAFF_PREFIX_REGEX,
        ""
      )
      .trim();

  return (
    cleaned ||
    "אין שם"
  );
}

function startsWithStaffPrefix(
  name
) {
  return STAFF_PREFIX_REGEX.test(
    String(name || "")
  );
}

function getNicknameStaffPrefix(
  name
) {
  const match =
    String(name || "")
      .trim()
      .match(
        /^(ST|BST|TM|CO)\s*\|/i
      );

  return match
    ? match[1].toUpperCase()
    : null;
}

function getExpectedStaffPrefix(
  member
) {
  const roleId =
    getHighestLadderRoleId(
      member
    );

  return roleId
    ? NICK_PREFIX_BY_ROLE[
        roleId
      ]
    : null;
}

function getBaseName(member) {
  const current =
    member.nickname ||
    member.user.globalName ||
    member.user.username ||
    "אין שם";

  return stripStaffPrefix(
    current
  );
}

function buildStaffNickname(
  member
) {
  const highestRoleId =
    getHighestLadderRoleId(
      member
    );

  const base =
    getBaseName(member);

  if (!highestRoleId) {
    return base.slice(
      0,
      32
    );
  }

  const prefix =
    NICK_PREFIX_BY_ROLE[
      highestRoleId
    ];

  const prefixText =
    `${prefix} | `;

  const maxBaseLength =
    Math.max(
      1,
      32 - prefixText.length
    );

  return (
    prefixText +
    base.slice(
      0,
      maxBaseLength
    )
  );
}

async function safeSetNickname(
  member,
  nickname
) {
  if (!member.manageable) {
    console.log(
      `⚠️ אי אפשר לשנות ניקניים ל-${member.user.tag} בגלל היררכיית הרולים.`
    );

    return false;
  }

  const finalNickname =
    String(nickname).slice(
      0,
      32
    );

  if (
    member.nickname ===
    finalNickname
  ) {
    return true;
  }

  try {
    botNicknameChanges.add(
      member.id
    );

    await member.setNickname(
      finalNickname,
      "Automatic staff nickname system"
    );

    setTimeout(
      () =>
        botNicknameChanges.delete(
          member.id
        ),
      3000
    );

    return true;

  } catch (error) {
    botNicknameChanges.delete(
      member.id
    );

    console.error(
      "❌ שגיאה בשינוי ניקניים:",
      error
    );

    return false;
  }
}

async function syncStaffNickname(
  member
) {
  if (
    member.user.bot
  ) {
    return;
  }

  await safeSetNickname(
    member,
    buildStaffNickname(member)
  );
}

async function sendUnauthorizedPrefixAlert(
  member,
  previousName
) {
  const owner =
    await client.users
      .fetch(
        OWNER_USER_ID
      )
      .catch(() => null);

  if (!owner) {
    return;
  }

  const embed =
    new EmbedBuilder()

      .setTitle(
        "⚠️ שימוש בתג צוות ללא הרשאה"
      )

      .setDescription(
        `${member.user} השתמש/ה בשם שנראה כמו תג צוות למרות שאין לו/לה רול צוות.\n\n` +
        `📝 **השם שהיה קודם:** \`${previousName}\`\n` +
        `🔄 **הניקניים שונה ל:** \`אין שם\``
      )

      .setFooter({
        text:
          `User ID: ${member.id}`
      })

      .setTimestamp();

  const button =
    new ButtonBuilder()

      .setCustomId(
        `owner_change_nick:${member.guild.id}:${member.id}`
      )

      .setLabel(
        "שנה ניקניים"
      )

      .setEmoji("✏️")

      .setStyle(
        ButtonStyle.Primary
      );

  await owner.send({
    embeds: [
      embed
    ],

    components: [
      new ActionRowBuilder()
        .addComponents(
          button
        )
    ]
  }).catch(() => {});
}

async function protectUnauthorizedStaffPrefix(
  member,
  previousName = null
) {
  if (
    member.user.bot
  ) {
    return;
  }

  if (
    getHighestLadderRoleId(
      member
    )
  ) {
    return;
  }

  const currentVisibleName =
    member.nickname ||
    member.user.globalName ||
    member.user.username ||
    "";

  if (
    !startsWithStaffPrefix(
      currentVisibleName
    )
  ) {
    return;
  }

  const oldName =
    previousName ||
    currentVisibleName;

  const changed =
    await safeSetNickname(
      member,
      "אין שם"
    );

  if (changed) {
    await sendUnauthorizedPrefixAlert(
      member,
      oldName
    );
  }
}

// ======================================================
// FAKE PROMOTION PROTECTION
// ======================================================

async function sendFakePromotionAlert(
  member,
  attemptedName,
  expectedPrefix,
  attemptedPrefix,
  timeoutSuccess
) {
  const owner =
    await client.users
      .fetch(
        OWNER_USER_ID
      )
      .catch(() => null);

  if (!owner) {
    return;
  }

  const realRoleId =
    getHighestLadderRoleId(
      member
    );

  const realRoleName =
    await getRoleName(
      member.guild,
      realRoleId
    );

  const embed =
    new EmbedBuilder()

      .setTitle(
        "🚨 ניסיון לזייף דרגת צוות"
      )

      .setDescription(
        `${member.user} ניסה/תה לשנות לעצמו/ה ניקניים עם תג של דרגה גבוהה יותר.`
      )

      .addFields(
        {
          name:
            "👤 משתמש",

          value:
            `${member.user}\n` +
            `\`${member.id}\``
        },

        {
          name:
            "🎖️ הדרגה האמיתית",

          value:
            `${realRoleName}\n` +
            `תג: \`${expectedPrefix}\``
        },

        {
          name:
            "⚠️ התג שניסה/תה לשים",

          value:
            `\`${attemptedPrefix}\``
        },

        {
          name:
            "📝 הניקניים שניסה/תה לשים",

          value:
            `\`${attemptedName}\``
        },

        {
          name:
            "⏱️ פעולה",

          value:
            timeoutSuccess

              ? "המשתמש קיבל **Timeout ל־15 דקות** והניקניים תוקן."

              : "הניקניים תוקן, אבל הבוט **לא הצליח לתת Timeout**."
        }
      )

      .setTimestamp();

  await owner.send({
    embeds: [
      embed
    ]
  }).catch(() => {});
}

async function handleFakePromotion(
  member,
  attemptedName,
  attemptedPrefix
) {
  const expectedPrefix =
    getExpectedStaffPrefix(
      member
    );

  if (
    !expectedPrefix ||
    !attemptedPrefix
  ) {
    return false;
  }

  const realRank =
    PREFIX_RANKS[
      expectedPrefix
    ];

  const attemptedRank =
    PREFIX_RANKS[
      attemptedPrefix
    ];

  // רק ניסיון לעלות לדרגה גבוהה יותר
  if (
    attemptedRank <=
    realRank
  ) {
    return false;
  }

  let timeoutSuccess =
    false;

  try {
    if (
      member.id !==
      OWNER_USER_ID &&

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
      "❌ לא הצלחתי לתת Timeout:",
      error
    );
  }

  await syncStaffNickname(
    member
  );

  await sendFakePromotionAlert(
    member,
    attemptedName,
    expectedPrefix,
    attemptedPrefix,
    timeoutSuccess
  );

  return true;
}

// ======================================================
// APPLICATION DATA
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

  const data = {};

  for (
    const part of
    text.split("|")
  ) {
    const index =
      part.indexOf(":");

    if (
      index === -1
    ) {
      continue;
    }

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

// ======================================================
// TICKET PANEL
// ======================================================

function createTicketMenu() {
  const menu =
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
          .setEmoji("🚨")
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
          .setEmoji("🛠️")
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
          .setEmoji("💬")
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
          .setEmoji("🛡️")
          .setValue(
            "staff"
          )
      );

  return new ActionRowBuilder()
    .addComponents(
      menu
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
        .setEmoji("🔒")
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

        "**תודה שפנית לצוות השרת.**\n\n" +

        "כדי שנוכל לבדוק את המקרה, כתבו:\n\n" +

        "👤 **על מי הדיווח?** — שם משתמש או ID\n" +

        "📝 **מה קרה?** — תיאור ברור של המקרה\n" +

        "📸 **הוכחות** — תמונות / סרטונים אם יש\n" +

        "🕒 **מתי זה קרה?** — זמן משוער אם ידוע\n\n" +

        "**צוות השרת יעבור על הדיווח ויטפל בו בהקדם.**"
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

        "**אנחנו כאן כדי לעזור.**\n\n" +

        "כדי שנוכל להבין את התקלה מהר, כתבו:\n\n" +

        "🔧 **מה הבעיה?**\n" +

        "📱 **איפה היא מתרחשת?**\n" +

        "📸 **צילום מסך / סרטון**, אם יש\n" +

        "✅ **מה כבר ניסיתם לעשות?**\n\n" +

        "**אחד מאנשי הצוות יענה לכם בהקדם.**"
      );
  }

  return new EmbedBuilder()

    .setTitle(
      "💬 פנייה כללית"
    )

    .setDescription(
      `שלום ${user} 👋\n\n` +

      "**פתחתם פנייה כללית לצוות.**\n\n" +

      "כתבו כאן במה אתם צריכים עזרה והוסיפו כמה שיותר פרטים כדי שנוכל לעזור מהר.\n\n" +

      "**צוות השרת יענה לכם בהקדם.**"
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
  const isPromotion =
    type ===
    "promotion";

  const modal =
    new ModalBuilder()

      .setCustomId(
        `staff_application_modal:${type}`
      )

      .setTitle(
        isPromotion
          ? "בחינת קידום בצוות 🛡️"
          : "בחינה לצוות 🛡️"
      );

  const ageInput =
    new TextInputBuilder()

      .setCustomId(
        "age"
      )

      .setLabel(
        "בן כמה את/ה?"
      )

      .setPlaceholder(
        "אני בן/בת..."
      )

      .setStyle(
        TextInputStyle.Short
      )

      .setMaxLength(
        50
      )

      .setRequired(
        true
      );

  const situationInput =
    new TextInputBuilder()

      .setCustomId(
        "situation"
      )

      .setLabel(
        "אם שני אנשים רבים ומקללים, מה תעשה?"
      )

      .setPlaceholder(
        "אני הייתי..."
      )

      .setStyle(
        TextInputStyle.Paragraph
      )

      .setMaxLength(
        1000
      )

      .setRequired(
        true
      );

  const nameInput =
    new TextInputBuilder()

      .setCustomId(
        "name"
      )

      .setLabel(
        "איך קוראים לך?"
      )

      .setPlaceholder(
        "קוראים לי..."
      )

      .setStyle(
        TextInputStyle.Short
      )

      .setMaxLength(
        100
      )

      .setRequired(
        true
      );

  const experienceInput =
    new TextInputBuilder()

      .setCustomId(
        "experience"
      )

      .setLabel(
        "יש לך ניסיון בניהול?"
      )

      .setPlaceholder(
        "כן, יש לי... / לא, אין לי..."
      )

      .setStyle(
        TextInputStyle.Paragraph
      )

      .setMaxLength(
        1000
      )

      .setRequired(
        true
      );

  const notesInput =
    new TextInputBuilder()

      .setCustomId(
        "notes"
      )

      .setLabel(
        "הערות"
      )

      .setPlaceholder(
        "משהו נוסף שתרצו לספר לנו..."
      )

      .setStyle(
        TextInputStyle.Paragraph
      )

      .setMaxLength(
        1000
      )

      .setRequired(
        false
      );

  modal.addComponents(
    new ActionRowBuilder()
      .addComponents(
        ageInput
      ),

    new ActionRowBuilder()
      .addComponents(
        situationInput
      ),

    new ActionRowBuilder()
      .addComponents(
        nameInput
      ),

    new ActionRowBuilder()
      .addComponents(
        experienceInput
      ),

    new ActionRowBuilder()
      .addComponents(
        notesInput
      )
  );

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

function setStatusField(
  embed,
  value
) {
  const oldFields =
    embed.data.fields ||
    [];

  const fields =
    oldFields.filter(
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
// LOAD APPLICATION STATE
// ======================================================

async function loadApplicationState() {
  try {
    const channel =
      await client.channels.fetch(
        STAFF_APPLICATION_CHANNEL_ID
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
        const footer =
          message.embeds[0]
            ?.footer
            ?.text;

        const data =
          parseApplicationFooter(
            footer
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
          const rejectedAt =
            Number(
              data.rejectedAt
            );

          const expiry =
            rejectedAt +
            REJECT_COOLDOWN_MS;

          if (
            Number.isFinite(
              rejectedAt
            ) &&

            expiry >
            Date.now()
          ) {
            const old =
              rejectionCooldowns.get(
                data.applicant
              ) ||
              0;

            if (
              expiry >
              old
            ) {
              rejectionCooldowns.set(
                data.applicant,
                expiry
              );
            }
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

    console.log(
      `✅ נטענו ${pendingApplications.size} בקשות פעילות`
    );

  } catch (error) {
    console.error(
      "❌ שגיאה בטעינת בקשות:",
      error
    );
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
  try {
    const channel =
      await client.channels.fetch(
        STAFF_LOG_CHANNEL_ID
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
    });

  } catch (error) {
    console.error(
      "❌ שגיאה בלוג:",
      error
    );
  }
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

          "צוות השרת יעבור על התשובות שלך.\n" +

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

            ? `**בקשת הקידום שלך אושרה!**\n\n🎖️ הדרגה החדשה שלך: **${roleName}**\n\n**כל הכבוד ובהצלחה! 🛡️**`

            : `**שמחים לעדכן שהבקשה שלך אושרה! 🎉**\n\n🎖️ התפקיד שקיבלת: **${roleName}**\n\n**בהצלחה בצוות! 🛡️**`
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

            ? "**בקשת הקידום שלך נבדקה, אך הפעם היא לא אושרה.**\n\nתודה על ההשקעה 💙"

            : "**הבקשה שלך להצטרפות לצוות נבדקה, אך הפעם היא לא אושרה.**\n\n⏳ ניתן להגיש בקשה חדשה בעוד **7 ימים**.\n\nתודה שהקדשת זמן למילוי הטופס 💙"
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

  if (!currentRoleId) {
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
// COMMAND
// ======================================================

const staffManageCommand =
  new SlashCommandBuilder()

    .setName(
      "staffmanage"
    )

    .setDescription(
      "פתיחת פאנל ניהול הצוות"
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

    if (
      TOKEN &&
      CLIENT_ID &&
      GUILD_ID
    ) {
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
              staffManageCommand.toJSON()
            ]
          }
        );

        console.log(
          "✅ /staffmanage נטענה"
        );

      } catch (error) {
        console.error(
          "❌ שגיאה בפקודות:",
          error
        );
      }
    }

    await loadApplicationState();

    // ==================================================
    // Sync nicknames
    // ==================================================

    if (GUILD_ID) {
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
            member.user.bot
          ) {
            continue;
          }

          if (
            getHighestLadderRoleId(
              member
            )
          ) {
            await syncStaffNickname(
              member
            );

          } else {
            await protectUnauthorizedStaffPrefix(
              member
            );
          }
        }

        console.log(
          "✅ מערכת הניקניים סונכרנה"
        );

      } catch (error) {
        console.error(
          "❌ שגיאה בסנכרון ניקניים:",
          error
        );
      }
    }

    // ==================================================
    // Ticket panel
    // ==================================================

    try {
      const panelChannel =
        await client.channels.fetch(
          PANEL_CHANNEL_ID
        );

      if (
        !panelChannel ||
        !panelChannel.isTextBased()
      ) {
        console.log(
          "❌ חדר פאנל הטיקטים לא נמצא"
        );

        return;
      }

      const messages =
        await panelChannel
          .messages
          .fetch({
            limit:
              100
          });

      const oldPanel =
        messages.find(
          message => {
            if (
              message.author.id !==
              client.user.id
            ) {
              return false;
            }

            return message
              .components
              .some(
                row =>
                  row.components.some(
                    component =>
                      component.customId ===
                      "ticket_type"
                  )
              );
          }
        );

      if (oldPanel) {
        await oldPanel.edit({
          embeds: [
            createPanelEmbed()
          ],

          components: [
            createTicketMenu()
          ]
        });

      } else {
        await panelChannel.send({
          embeds: [
            createPanelEmbed()
          ],

          components: [
            createTicketMenu()
          ]
        });
      }

      console.log(
        "✅ מערכת הטיקטים מוכנה"
      );

    } catch (error) {
      console.error(
        "❌ שגיאה בפאנל:",
        error
      );
    }
  }
);

// ======================================================
// MEMBER EVENTS
// ======================================================

client.on(
  "guildMemberAdd",
  async member => {
    if (
      member.user.bot
    ) {
      return;
    }

    if (
      getHighestLadderRoleId(
        member
      )
    ) {
      await syncStaffNickname(
        member
      );

    } else {
      await protectUnauthorizedStaffPrefix(
        member
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

    const oldHighest =
      getHighestLadderRoleId(
        oldMember
      );

    const newHighest =
      getHighestLadderRoleId(
        newMember
      );

    const rolesChanged =
      oldHighest !==
      newHighest;

    const nicknameChanged =
      oldMember.nickname !==
      newMember.nickname;

    // מתעלם רק מאירוע ניקניים שהבוט עצמו יצר
    // בלי לפספס שינוי רול אמיתי
    if (
      botNicknameChanges.has(
        newMember.id
      ) &&

      nicknameChanged &&

      !rolesChanged
    ) {
      return;
    }

    // ==================================================
    // Role changed
    // ==================================================

    if (rolesChanged) {
      if (newHighest) {
        await syncStaffNickname(
          newMember
        );

      } else {
        const cleanBase =
          stripStaffPrefix(
            oldMember.nickname ||
            newMember.nickname ||
            newMember.user.globalName ||
            newMember.user.username
          );

        await safeSetNickname(
          newMember,
          cleanBase
        );
      }

      return;
    }

    if (!nicknameChanged) {
      return;
    }

    const attemptedName =
      newMember.nickname ||
      newMember.user.globalName ||
      newMember.user.username ||
      "";

    // ==================================================
    // Staff member
    // ==================================================

    if (newHighest) {
      const attemptedPrefix =
        getNicknameStaffPrefix(
          attemptedName
        );

      const punished =
        await handleFakePromotion(
          newMember,
          attemptedName,
          attemptedPrefix
        );

      if (punished) {
        return;
      }

      await syncStaffNickname(
        newMember
      );

      return;
    }

    // ==================================================
    // Non staff using staff prefix
    // ==================================================

    if (
      startsWithStaffPrefix(
        attemptedName
      )
    ) {
      await protectUnauthorizedStaffPrefix(
        newMember,
        attemptedName
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
        "owner_change_nick:"
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
        targetId
      ] =
        interaction.customId
          .split(":");

      const modal =
        new ModalBuilder()

          .setCustomId(
            `owner_change_nick_modal:${guildId}:${targetId}`
          )

          .setTitle(
            "שינוי ניקניים"
          );

      const input =
        new TextInputBuilder()

          .setCustomId(
            "nickname"
          )

          .setLabel(
            "איזה ניקניים לתת למשתמש?"
          )

          .setPlaceholder(
            "כתוב כאן את השם החדש..."
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
        "owner_change_nick_modal:"
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
        targetId
      ] =
        interaction.customId
          .split(":");

      const nickname =
        interaction.fields
          .getTextInputValue(
            "nickname"
          )
          .trim();

      const guild =
        await client.guilds
          .fetch(
            guildId
          )
          .catch(
            () => null
          );

      if (!guild) {
        return interaction.reply({
          content:
            "❌ השרת לא נמצא."
        });
      }

      const member =
        await fetchFreshMember(
          guild,
          targetId
        )
          .catch(
            () => null
          );

      if (!member) {
        return interaction.reply({
          content:
            "❌ המשתמש כבר לא נמצא בשרת."
        });
      }

      const success =
        await safeSetNickname(
          member,
          nickname
        );

      return interaction.reply({
        content:
          success
            ? `✅ הניקניים של ${member.user} שונה ל־**${nickname}**.`
            : "❌ לא הצלחתי לשנות את הניקניים."
      });
    }

    // ==================================================
    // /staffmanage
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
            "❌ הפקודה הזאת זמינה רק לך.",

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
    // SELECT USER
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
            "❌ אין לך הרשאה.",

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

      if (!member) {
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
    // TICKET MENU
    // ==================================================

    if (
      interaction.isStringSelectMenu() &&

      interaction.customId ===
      "ticket_type"
    ) {
      const type =
        interaction.values[0];

      // =================================================
      // STAFF / PROMOTION
      // =================================================

      if (
        type ===
        "staff"
      ) {
        try {
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

            if (expiry) {
              await interaction.reply({
                content:
                  "⏳ הבקשה הקודמת שלך לא אושרה.\n" +

                  `ניתן להגיש בקשה חדשה <t:${Math.floor(
                    expiry / 1000
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
                applicationType ===
                "promotion"

                  ? "⏳ כבר יש לך בקשת קידום שממתינה לטיפול."

                  : "⏳ כבר יש לך בקשה לצוות שממתינה לטיפול.",

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

        } catch (error) {
          console.error(
            "❌ שגיאה בפתיחת הבחינה:",
            error
          );
        }

        return;
      }

      // =================================================
      // NORMAL TICKET
      // =================================================

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

        if (!ticketType) {
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

        if (existingTicket) {
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

        if (CATEGORY_ID) {
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

        if (validCategoryId) {
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
          `✅ הטיקט שלך נפתח בהצלחה: ${channel}`
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
              error =>
                console.error(
                  "❌ לא הצלחתי למחוק טיקט:",
                  error
                )
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
            "ℹ️ הדרגה שלך השתנתה. פתח/י מחדש את הבחינה מהפאנל."
          );
        }

        if (
          requestedType ===
          "promotion" &&

          !currentRoleId
        ) {
          return interaction.editReply(
            "ℹ️ כרגע אינך מזוהה כחבר/ת צוות. פתח/י מחדש את הבחינה."
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

          if (expiry) {
            return interaction.editReply(
              `⏳ ניתן להגיש בקשה חדשה <t:${Math.floor(
                expiry / 1000
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

        const age =
          interaction.fields
            .getTextInputValue(
              "age"
            );

        const situation =
          interaction.fields
            .getTextInputValue(
              "situation"
            );

        const name =
          interaction.fields
            .getTextInputValue(
              "name"
            );

        const experience =
          interaction.fields
            .getTextInputValue(
              "experience"
            );

        const notes =
          interaction.fields
            .getTextInputValue(
              "notes"
            ) ||
          "לא נכתבו הערות";

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
              isPromotion
                ? `${interaction.user} שלח/ה **בקשת קידום בצוות**.`
                : `${interaction.user} שלח/ה **בקשה להצטרפות לצוות**.`
            )

            .addFields(
              {
                name:
                  "👤 משתמש",

                value:
                  `${interaction.user}\n` +
                  `\`${interaction.user.id}\``
              },

              ...(isPromotion
                ? [
                    {
                      name:
                        "🎖️ דרגה נוכחית",

                      value:
                        `${currentRoleName}\n` +
                        `<@&${currentRoleId}>`
                    }
                  ]
                : []),

              {
                name:
                  "🎂 בן כמה את/ה?",

                value:
                  age
              },

              {
                name:
                  "⚠️ אם שני אנשים רבים ומקללים, מה את/ה עושה?",

                value:
                  situation
              },

              {
                name:
                  "📛 איך קוראים לך?",

                value:
                  name
              },

              {
                name:
                  "🛡️ יש לך ניסיון בניהול?",

                value:
                  experience
              },

              {
                name:
                  "📝 הערות",

                value:
                  notes
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

        const approve =
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

        const reject =
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
                approve,
                reject
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
            ? "✅ הבקשה נשלחה! הסטטוס כרגע: **בבדיקה**. שלחנו לך גם הודעה פרטית."
            : "✅ הבקשה נשלחה! הסטטוס כרגע: **בבדיקה**. לא הצלחתי לשלוח לך הודעה פרטית."
        );

      } catch (error) {
        console.error(
          "❌ שגיאה בשליחת טופס:",
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

        if (!applicant) {
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
          if (currentRoleId) {
            return interaction.followUp({
              content:
                "ℹ️ המשתמש כבר נמצא בצוות.",

              ephemeral:
                true
            });
          }

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
          if (!currentRoleId) {
            return interaction.followUp({
              content:
                "❌ המשתמש אינו נמצא כרגע בצוות.",

              ephemeral:
                true
            });
          }

          targets =
            getPromotionTargets(
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

          labels =
            getPromotionLabels(
              currentRoleId
            );
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

        const row =
          await createRoleChoiceRow(
            interaction.guild,
            applicantId,
            targets,
            `app_assign:${type}`,
            labels
          );

        await interaction.editReply({
          embeds: [
            updatedEmbed
          ],

          components: [
            row
          ]
        });

      } catch (error) {
        console.error(
          "❌ שגיאה באישור:",
          error
        );

        await interaction.followUp({
          content:
            "❌ הייתה בעיה באישור הבקשה.",

          ephemeral:
            true
        }).catch(
          () => {}
        );

      } finally {
        processingApplications.delete(
          interaction.message.id
        );
      }

      return;
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

        await interaction.editReply({
          embeds: [
            updatedEmbed
          ],

          components: [
            createHandledRow(
              reviewer.displayName
            )
          ]
        });

      } catch (error) {
        console.error(
          "❌ שגיאה בדחייה:",
          error
        );

      } finally {
        processingApplications.delete(
          interaction.message.id
        );
      }

      return;
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
            "❌ אין לך הרשאה לבחור דרגה.",

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

        if (!applicant) {
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
              "❌ הדרגה הזאת כבר לא מתאימה למצב הנוכחי של המשתמש.",

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

        await syncStaffNickname(
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
          `✅ **אושר**\n🎖️ דרגה: **${targetRoleName}**\nטופל על ידי ${interaction.user}`
        );

        updatedEmbed.setFooter({
          text:
            buildApplicationFooter(
              applicantId,
              type,
              "approved"
            )
        });

        await interaction.editReply({
          embeds: [
            updatedEmbed
          ],

          components: [
            createHandledRow(
              reviewer.displayName
            )
          ]
        });

      } catch (error) {
        console.error(
          "❌ שגיאה בהענקת רול:",
          error
        );

      } finally {
        processingApplications.delete(
          interaction.message.id
        );
      }

      return;
    }

    // ==================================================
    // MANAGEMENT - ADD NON STAFF
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
            "❌ אין לך הרשאה.",

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
        await interaction.deferUpdate();

        return interaction.editReply({
          content:
            "❌ המשתמש לא נמצא בשרת.",

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
          member.id,
          "ℹ️ המשתמש כבר נמצא בצוות."
        );
      }

      const row =
        await createRoleChoiceRow(
          interaction.guild,
          member.id,

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
        );

      return interaction.update({
        content:
          "➕ **באיזו דרגה להוסיף את המשתמש?**",

        embeds: [
          await buildManagementEmbed(
            interaction.guild,
            member
          )
        ],

        components: [
          row
        ]
      });
    }

    // ==================================================
    // MANAGEMENT - ADD TO STAFF
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
            "❌ אין לך הרשאה.",

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
            "❌ המשתמש לא נמצא בשרת.",

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
          member.id,
          "ℹ️ המשתמש כבר נמצא בצוות."
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
          member.id,
          "❌ הדרגה שנבחרה אינה תקינה."
        );
      }

      try {
        await member.roles.add(
          targetRoleId
        );

        const freshMember =
          await fetchFreshMember(
            interaction.guild,
            member.id
          );

        await syncStaffNickname(
          freshMember
        );

        const newRoleName =
          await getRoleName(
            interaction.guild,
            targetRoleId
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
          member.id,
          `✅ ${freshMember.user} נוסף/ה לצוות בתור **${newRoleName}**.`
        );

      } catch (error) {
        console.error(
          "❌ שגיאה בהוספה לצוות:",
          error
        );

        return refreshManagementPanel(
          interaction,
          member.id,
          "❌ לא הצלחתי לתת את הרול. ודא שרול הבוט נמצא מעל רולי הצוות."
        );
      }
    }

    // ==================================================
    // MANAGEMENT - PROMOTE
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
            "❌ אין לך הרשאה.",

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
        await interaction.deferUpdate();

        return interaction.editReply({
          content:
            "❌ המשתמש לא נמצא בשרת.",

          embeds: [],

          components: []
        });
      }

      const currentRoleId =
        getHighestLadderRoleId(
          member
        );

      if (!currentRoleId) {
        await interaction.deferUpdate();

        return refreshManagementPanel(
          interaction,
          member.id,
          "❌ המשתמש לא נמצא בסולם הצוות."
        );
      }

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
          member.id,
          "🏆 המשתמש כבר בדרגה הגבוהה ביותר."
        );
      }

      const row =
        await createRoleChoiceRow(
          interaction.guild,
          member.id,
          targets,
          "manage_promote_to",
          getPromotionLabels(
            currentRoleId
          )
        );

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
          row
        ]
      });
    }

    // ==================================================
    // MANAGEMENT - PROMOTE TO
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
            "❌ אין לך הרשאה.",

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
            "❌ המשתמש לא נמצא בשרת.",

          embeds: [],

          components: []
        });
      }

      const beforeRoleId =
        getHighestLadderRoleId(
          member
        );

      const allowedTargets =
        getPromotionTargets(
          beforeRoleId
        );

      if (
        !allowedTargets.includes(
          targetRoleId
        )
      ) {
        return refreshManagementPanel(
          interaction,
          member.id,
          "❌ הקידום הזה כבר לא מתאים לדרגה הנוכחית."
        );
      }

      try {
        await member.roles.add(
          targetRoleId
        );

        const freshMember =
          await fetchFreshMember(
            interaction.guild,
            member.id
          );

        await syncStaffNickname(
          freshMember
        );

        const newRoleName =
          await getRoleName(
            interaction.guild,
            targetRoleId
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
          member.id,
          `✅ ${freshMember.user} קודם/ה ל־**${newRoleName}**.`
        );

      } catch (error) {
        console.error(
          "❌ שגיאה בקידום:",
          error
        );

        return refreshManagementPanel(
          interaction,
          member.id,
          "❌ לא הצלחתי לתת את הרול. ודא שרול הבוט נמצא מעל רולי הצוות."
        );
      }
    }

    // ==================================================
    // MANAGEMENT - DEMOTE
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
            "❌ אין לך הרשאה.",

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
            "❌ המשתמש לא נמצא בשרת.",

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
          member.id,
          "❌ המשתמש לא נמצא בצוות."
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

      if (!previousRoleId) {
        return refreshManagementPanel(
          interaction,
          member.id,
          "ℹ️ אין למשתמש דרגה קודמת שמורה. אם אתה רוצה להוציא אותו מהצוות, השתמש ב־**הורדה מהצוות**."
        );
      }

      try {
        await member.roles.remove(
          currentRoleId
        );

        const freshMember =
          await fetchFreshMember(
            interaction.guild,
            member.id
          );

        await syncStaffNickname(
          freshMember
        );

        const previousName =
          await getRoleName(
            interaction.guild,
            previousRoleId
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
          member.id,
          `✅ ${freshMember.user} הורד/ה ל־**${previousName}**.`
        );

      } catch (error) {
        console.error(
          "❌ שגיאה בהורדת דרגה:",
          error
        );

        return refreshManagementPanel(
          interaction,
          member.id,
          "❌ לא הצלחתי להסיר את הרול. ודא שרול הבוט נמצא מעל רולי הצוות."
        );
      }
    }

    // ==================================================
    // MANAGEMENT - REMOVE FROM STAFF
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
            "❌ אין לך הרשאה.",

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
            "❌ המשתמש לא נמצא בשרת.",

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
          member.id,
          "ℹ️ למשתמש אין אף אחד מרולי הצוות."
        );
      }

      try {
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
            member.id
          );

        await syncStaffNickname(
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
          member.id,
          `✅ ${freshMember.user} הוסר/ה מהצוות.`
        );

      } catch (error) {
        console.error(
          "❌ שגיאה בהורדה מהצוות:",
          error
        );

        return refreshManagementPanel(
          interaction,
          member.id,
          "❌ לא הצלחתי להסיר את הרולים. ודא שרול הבוט נמצא מעל רולי הצוות."
        );
      }
    }
  }
);

// ======================================================
// LOGIN
// ======================================================

client.login(TOKEN);
