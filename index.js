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
// VARIABLES
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

const ROLE_STAFF = "1555587941575696444"; // Stuff
const ROLE_PROMO_1 = "1555588224636821526"; // Big Stuff
const ROLE_TEAM = "1555588615520653332"; // Team
const ROLE_TOP = "1555588725398839376"; // Co-owner
const EXTRA_HANDLER_ROLE = "1541371707011629077";

const STAFF_ACCESS_ROLE_IDS = [
  ROLE_STAFF,
  EXTRA_HANDLER_ROLE,
  ROLE_PROMO_1,
  ROLE_TEAM,
  ROLE_TOP
];

const LADDER_ROLE_IDS = [
  ROLE_STAFF,
  ROLE_PROMO_1,
  ROLE_TEAM,
  ROLE_TOP
];

// ======================================================
// NICKNAME SYSTEM
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

const RESERVED_PREFIX_REGEX =
  /^\s*(ST|BST|TM|CO)\s*(?:[|｜│:\-–—]\s*)?/i;

const FAKE_PROMOTION_TIMEOUT_MS =
  15 * 60 * 1000;

// ======================================================
// STATE
// ======================================================

const REJECT_COOLDOWN_MS =
  7 * 24 * 60 * 60 * 1000;

const rejectionCooldowns = new Map();
const pendingApplications = new Set();
const processingApplications = new Set();

const activeGiveaways = new Map();

// ======================================================
// TICKET TYPES
// ======================================================

const ticketTypes = {
  report: {
    name: "דיווח על משתמש",
    channelName: "דיווח"
  },

  technical: {
    name: "תמיכה טכנית",
    channelName: "תמיכה"
  },

  general: {
    name: "כללי",
    channelName: "כללי"
  }
};

// ======================================================
// MEMBER HELPERS
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
  roleId
) {
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

// ======================================================
// NICKNAMES
// ======================================================

function stripStaffPrefix(
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

function getPrefixFromNickname(
  name
) {
  const match =
    String(
      name || ""
    )
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
    )
  );
}

function getExpectedPrefix(
  member
) {
  const roleId =
    getHighestLadderRoleId(
      member
    );

  if (!roleId) {
    return null;
  }

  return NICK_PREFIX_BY_ROLE[
    roleId
  ];
}

function getBaseName(
  member
) {
  let base =
    stripStaffPrefix(
      member.nickname ||
      member.user.globalName ||
      member.user.username
    );

  if (
    !base ||
    base === "אין שם"
  ) {
    base =
      stripStaffPrefix(
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

async function setNick(
  member,
  nickname,
  reason
) {
  if (
    !member.manageable
  ) {
    return false;
  }

  try {
    const finalNickname =
      nickname.slice(
        0,
        32
      );

    if (
      member.nickname !==
      finalNickname
    ) {
      await member.setNickname(
        finalNickname,
        reason
      );
    }

    return true;

  } catch (error) {
    console.error(
      "❌ שגיאה בשינוי ניקניים:",
      error.message
    );

    return false;
  }
}

async function applyStaffNickname(
  member
) {
  const prefix =
    getExpectedPrefix(
      member
    );

  if (!prefix) {
    return;
  }

  const prefixText =
    `${prefix} | `;

  const maxLength =
    Math.max(
      1,
      32 - prefixText.length
    );

  const baseName =
    getBaseName(
      member
    ).slice(
      0,
      maxLength
    );

  await setNick(
    member,
    `${prefixText}${baseName}`,
    "עדכון ניקניים לפי דרגת צוות"
  );
}

async function restoreNicknameAfterLeavingStaff(
  member
) {
  const current =
    member.nickname ||
    member.user.globalName ||
    member.user.username;

  const clean =
    stripStaffPrefix(
      current
    ) ||

    member.user.globalName ||

    member.user.username ||

    "אין שם";

  await setNick(
    member,
    clean,
    "הסרת קידומת צוות"
  );
}

async function notifyOwnerFakeStaff(
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

        `🔄 **השם שונה ל:** \`אין שם\``
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

  const changed =
    await setNick(
      member,
      "אין שם",
      "שימוש בתג צוות ללא רול"
    );

  if (changed) {
    await notifyOwnerFakeStaff(
      member,
      attemptedName
    );
  }
}

async function handleFakePromotion(
  member,
  attemptedName
) {
  const realPrefix =
    getExpectedPrefix(
      member
    );

  const attemptedPrefix =
    getPrefixFromNickname(
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

  let timedOut =
    false;

  try {
    if (
      member.moderatable
    ) {
      await member.timeout(
        FAKE_PROMOTION_TIMEOUT_MS,
        `ניסיון להשתמש בתג ${attemptedPrefix} ללא הדרגה המתאימה`
      );

      timedOut =
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

    const embed =
      new EmbedBuilder()

        .setTitle(
          "🚨 ניסיון לזייף דרגת צוות"
        )

        .setDescription(
          `${member.user} ניסה/תה לשים תג של דרגה גבוהה יותר.\n\n` +

          `🎖️ **דרגה אמיתית:** ${roleName} (\`${realPrefix}\`)\n` +

          `⚠️ **תג שניסה:** \`${attemptedPrefix}\`\n` +

          `📝 **ניקניים שניסה:** \`${attemptedName}\`\n\n` +

          (
            timedOut

              ? "⏱️ קיבל **Timeout ל-15 דקות** והשם תוקן."

              : "⚠️ השם תוקן, אבל לא הצלחתי לתת Timeout."
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
    }).catch(
      () => {}
    );
  }

  return true;
}

// ======================================================
// GIVEAWAYS
// ======================================================

function parseDuration(
  input
) {
  const match =
    String(
      input || ""
    )
      .trim()
      .match(
        /^(\d+)\s*(s|m|h|d)$/i
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
    match[2].toLowerCase()
  ];

  const ms =
    amount *
    multiplier;

  if (
    !Number.isSafeInteger(
      amount
    ) ||

    amount <= 0 ||

    ms <
    10 * 1000 ||

    ms >
    30 * 24 * 60 * 60 * 1000
  ) {
    return null;
  }

  return ms;
}

function giveawayButtons(
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

function giveawayEmbed(
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

      .addFields(

        {
          name:
            "🎁 פרס",

          value:
            giveaway.prize
        },

        {
          name:
            "👤 נוצרה על ידי",

          value:
            `<@${giveaway.hostId}>`,

          inline:
            true
        },

        {
          name:
            ended
              ? "⏰ הסתיימה"
              : "⏰ נגמרת",

          value:
            ended

              ? `<t:${Math.floor(
                  Date.now() /
                  1000
                )}:R>`

              : `<t:${endTimestamp}:R>\n<t:${endTimestamp}:F>`,

          inline:
            true
        },

        {
          name:
            "👥 משתתפים",

          value:
            String(
              giveaway
                .participants
                .size
            ),

          inline:
            true
        },

        {
          name:
            "🏆 מספר זוכים",

          value:
            String(
              giveaway
                .winnerCount
            ),

          inline:
            true
        }

      )

      .setFooter({
        text:
          ended
            ? "ההגרלה נסגרה"
            : "לחצו על 🎉 כדי להצטרף. לחיצה נוספת מוציאה אתכם."
      })

      .setTimestamp();

  if (ended) {
    embed.addFields({
      name:
        "🏆 הזוכה / הזוכים",

      value:
        winners.length

          ? winners
              .map(
                id =>
                  `<@${id}>`
              )
              .join("\n")

          : "לא היו משתתפים."
    });
  }

  return embed;
}

function pickWinners(
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
    return [];
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
    pickWinners(
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
    channel?.isTextBased()
  ) {
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
          giveawayEmbed(
            giveaway,
            true,
            winners
          )
        ],

        components: [
          giveawayButtons(
            true
          )
        ]
      }).catch(
        () => {}
      );
    }

    if (
      winners.length
    ) {
      await channel.send({
        content:
          `🎉 **ההגרלה הסתיימה!**\n` +

          `🏆 ${
            winners.length === 1
              ? "הזוכה"
              : "הזוכים"
          }: ${winners
            .map(
              id =>
                `<@${id}>`
            )
            .join(", ")}\n` +

          `🎁 **פרס:** ${giveaway.prize}` +

          (
            endedBy

              ? `\n🔒 **נסגרה על ידי:** ${endedBy}`

              : ""
          ),

        allowedMentions: {
          users:
            winners
        }
      }).catch(
        () => {}
      );

    } else {
      await channel.send({
        content:
          `🎉 **ההגרלה הסתיימה!**\n` +

          `😕 לא היו משתתפים.\n` +

          `🎁 **פרס:** ${giveaway.prize}` +

          (
            endedBy

              ? `\n🔒 **נסגרה על ידי:** ${endedBy}`

              : ""
          )
      }).catch(
        () => {}
      );
    }
  }

  return winners;
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

// ======================================================
// APPLICATION HELPERS
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
    !text?.includes(
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
    type === "report"
  ) {
    return new EmbedBuilder()

      .setTitle(
        "🚨 דיווח על משתמש"
      )

      .setDescription(
        `שלום ${user} 👋\n\n` +

        "**תודה שפנית לצוות השרת.**\n\n" +

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

        "✅ **מה כבר ניסיתם לעשות?**\n\n" +

        "**אחד מאנשי הצוות יענה בהקדם.**"
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
// APPLICATION MODAL
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
        type === "promotion"
          ? "בחינת קידום בצוות 🛡️"
          : "בחינה לצוות 🛡️"
      );

  const inputs = [

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
    ] of inputs
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
  name
) {
  return new ActionRowBuilder()
    .addComponents(

      new ButtonBuilder()

        .setCustomId(
          "application_handled"
        )

        .setLabel(
          `טופל על ידי ${name}`.slice(
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

async function loadApplicationState() {
  try {
    const channel =
      await client.channels
        .fetch(
          STAFF_APPLICATION_CHANNEL_ID
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
            message
              .embeds[0]
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

  } catch (error) {
    console.error(
      "❌ שגיאה בטעינת בקשות:",
      error
    );
  }
}

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
  }).catch(
    () => {}
  );
}

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

  return new EmbedBuilder()

    .setTitle(
      "🛡️ ניהול צוות"
    )

    .setDescription(
      `👤 **משתמש:** ${member.user}\n` +

      `🎖️ **דרגה נוכחית:** ${
        highest

          ? await getRoleName(
              guild,
              highest
            )

          : "לא בצוות"
      }\n\n` +

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
  const role =
    getHighestLadderRoleId(
      member
    );

  if (!role) {
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
            role ===
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
  labels = {}
) {
  const row =
    new ActionRowBuilder();

  for (
    const roleId of
    roleIds
  ) {
    const roleName =
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

    try {
      const guild =
        await client.guilds.fetch(
          GUILD_ID
        );

      await guild.members.fetch();

      for (
        const member of
        guild.members.cache.values()
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

    try {
      const channel =
        await client.channels.fetch(
          PANEL_CHANNEL_ID
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

    const name =
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
        name
      )
    ) {
      await handleUnauthorizedStaffName(
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

      if (
        oldRole !==
        newRole
      ) {
        if (newRole) {
          await applyStaffNickname(
            newMember
          );

        } else if (oldRole) {
          await restoreNicknameAfterLeavingStaff(
            newMember
          );
        }

        return;
      }

      if (
        oldMember.nickname ===
        newMember.nickname
      ) {
        return;
      }

      const name =
        newMember.nickname ||
        newMember.user.globalName ||
        newMember.user.username;

      if (newRole) {
        const punished =
          await handleFakePromotion(
            newMember,
            name
          );

        if (punished) {
          return;
        }

        await applyStaffNickname(
          newMember
        );

      } else if (
        hasReservedPrefix(
          name
        )
      ) {
        await handleUnauthorizedStaffName(
          newMember,
          name
        );
      }

    } catch (error) {
      console.error(
        "❌ שגיאה ב-guildMemberUpdate:",
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
    // CHANGE NICK BUTTON
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

      const modal =
        new ModalBuilder()

          .setCustomId(
            `nickname_modal:${guildId}:${memberId}`
          )

          .setTitle(
            "שינוי ניקניים"
          );

      modal.addComponents(

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
    // CHANGE NICK MODAL
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
          .trim();

      try {
        const guild =
          await client.guilds.fetch(
            guildId
          );

        const member =
          await fetchFreshMember(
            guild,
            memberId
          );

        await member.setNickname(
          nickname.slice(
            0,
            32
          ),
          "שינוי ידני על ידי בעל הבוט"
        );

        return interaction.reply({
          content:
            `✅ הניקניים של ${member.user} שונה ל-\`${nickname.slice(
              0,
              32
            )}\`.`
        });

      } catch {
        return interaction.reply({
          content:
            "❌ לא הצלחתי לשנות את הניקניים."
        });
      }
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
            "❌ רק צוות יכול לפתוח הגרלה.",

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

      const duration =
        interaction.options
          .getString(
            "duration",
            true
          );

      const durationMs =
        parseDuration(
          duration
        );

      const winnerCount =
        interaction.options
          .getInteger(
            "winners"
          ) ||
        1;

      if (!durationMs) {
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

        ended:
          false,

        timer:
          null
      };

      try {
        const message =
          await interaction.channel.send({
            embeds: [
              giveawayEmbed(
                giveaway
              )
            ],

            components: [
              giveawayButtons()
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
    // JOIN GIVEAWAY
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

      if (!giveaway) {
        return interaction.reply({
          content:
            "❌ ההגרלה לא פעילה או שהבוט הופעל מחדש מאז שנפתחה.",

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
          giveawayEmbed(
            giveaway
          )
        ],

        components: [
          giveawayButtons()
        ]
      }).catch(
        () => {}
      );

      return interaction.editReply(
        joined
          ? "✅ נכנסת להגרלה! לחיצה נוספת תוציא אותך."
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
            "❌ רק צוות יכול לסגור הגרלה.",

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
            "❌ לא מצאתי את ההגרלה. יכול להיות שהבוט הופעל מחדש.",

          ephemeral:
            true
        });
      }

      if (
        giveaway.ended
      ) {
        return interaction.reply({
          content:
            "ℹ️ ההגרלה כבר נסגרה.",

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
            "❌ הפקודה הזאת זמינה רק לך.",

          ephemeral:
            true
        });
      }

      const menu =
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
              menu
            )
        ],

        ephemeral:
          true
      });
    }

    // ==================================================
    // MANAGE SELECT USER
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

      if (
        type === "staff"
      ) {
        const member =
          await fetchFreshMember(
            interaction.guild,
            interaction.user.id
          );

        const currentRole =
          getHighestLadderRoleId(
            member
          );

        if (
          currentRole ===
          ROLE_TOP
        ) {
          await interaction.reply({
            content:
              "🏆 כבר הגעת לדרגה הגבוהה ביותר.",

            ephemeral:
              true
          });

          await interaction.message.edit({
            components: [
              createTicketMenu()
            ]
          }).catch(
            () => {}
          );

          return;
        }

        const applicationType =
          currentRole
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
                `⏳ ניתן להגיש בקשה חדשה <t:${Math.floor(
                  expiry /
                  1000
                )}:R>.`,

              ephemeral:
                true
            });

            await interaction.message.edit({
              components: [
                createTicketMenu()
              ]
            }).catch(
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

          await interaction.message.edit({
            components: [
              createTicketMenu()
            ]
          }).catch(
            () => {}
          );

          return;
        }

        await interaction.showModal(
          createStaffApplicationModal(
            applicationType
          )
        );

        await interaction.message.edit({
          components: [
            createTicketMenu()
          ]
        }).catch(
          () => {}
        );

        return;
      }

      await interaction.deferReply({
        ephemeral:
          true
      });

      try {
        const guild =
          interaction.guild;

        const ticketType =
          ticketTypes[type];

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

        let categoryId =
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
            category?.type ===
            ChannelType.GuildCategory
          ) {
            categoryId =
              category.id;
          }
        }

        const channelData = {
          name:
            `${ticketType.channelName}-${interaction.user.id.slice(
              -5
            )}`,

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

        if (categoryId) {
          channelData.parent =
            categoryId;
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

        await interaction.message.edit({
          components: [
            createTicketMenu()
          ]
        }).catch(
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
        () =>
          interaction.channel
            .delete()
            .catch(
              () => {}
            ),

        3000
      );

      return;
    }

    // ==================================================
    // APPLICATION MODAL
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
        const type =
          interaction.customId
            .split(":")[1];

        const member =
          await fetchFreshMember(
            interaction.guild,
            interaction.user.id
          );

        const currentRole =
          getHighestLadderRoleId(
            member
          );

        if (
          type === "initial" &&
          currentRole
        ) {
          return interaction.editReply(
            "ℹ️ הדרגה שלך השתנתה. פתח/י מחדש את הבחינה."
          );
        }

        if (
          type === "promotion" &&
          !currentRole
        ) {
          return interaction.editReply(
            "ℹ️ כרגע אינך מזוהה כחבר/ת צוות."
          );
        }

        if (
          type === "promotion" &&
          currentRole ===
          ROLE_TOP
        ) {
          return interaction.editReply(
            "🏆 כבר הגעת לדרגה הגבוהה ביותר."
          );
        }

        if (
          type === "initial"
        ) {
          const expiry =
            getCooldownExpiry(
              interaction.user.id
            );

          if (expiry) {
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
            type,
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

        const channel =
          await client.channels.fetch(
            STAFF_APPLICATION_CHANNEL_ID
          );

        if (
          !channel?.isTextBased()
        ) {
          return interaction.editReply(
            "❌ חדר הבקשות לא נמצא."
          );
        }

        const isPromotion =
          type ===
          "promotion";

        const currentRoleName =
          currentRole
            ? await getRoleName(
                interaction.guild,
                currentRole
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
                          `<@&${currentRole}>`
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
                  type,
                  "pending"
                )
            })

            .setTimestamp();

        const row =
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

            );

        await channel.send({
          content:
            getStaffMentions(),

          embeds: [
            embed
          ],

          components: [
            row
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
            type,
            "pending"
          );

        return interaction.editReply(
          dmSent

            ? "✅ הבקשה נשלחה ונשלחה לך גם הודעה פרטית."

            : "✅ הבקשה נשלחה. לא הצלחתי לשלוח DM."
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

        if (!applicant) {
          return interaction.followUp({
            content:
              "❌ המשתמש לא נמצא בשרת.",

            ephemeral:
              true
          });
        }

        const currentRole =
          getHighestLadderRoleId(
            applicant
          );

        let targets;
        let labels =
          {};

        if (
          type === "initial"
        ) {
          if (currentRole) {
            return interaction.followUp({
              content:
                "ℹ️ המשתמש כבר בצוות.",

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
          if (!currentRole) {
            return interaction.followUp({
              content:
                "❌ המשתמש לא בצוות.",

              ephemeral:
                true
            });
          }

          targets =
            getPromotionTargets(
              currentRole
            );

          labels =
            getPromotionLabels(
              currentRole
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

        const embed =
          EmbedBuilder.from(
            interaction.message.embeds[0]
          );

        setStatusField(
          embed,
          "✅ **אושר עקרונית — עכשיו בחרו איזה רול לתת**"
        );

        embed.setFooter({
          text:
            buildApplicationFooter(
              applicantId,
              type,
              "awaiting_role"
            )
        });

        return interaction.editReply({
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

      processingApplications.delete(
        interaction.message.id
      );

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

    // ==================================================
    // ASSIGN APPLICATION ROLE
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

      const applicant =
        await fetchFreshMember(
          interaction.guild,
          applicantId
        )
          .catch(
            () => null
          );

      if (!applicant) {
        processingApplications.delete(
          interaction.message.id
        );

        return interaction.followUp({
          content:
            "❌ המשתמש לא נמצא בשרת.",

          ephemeral:
            true
        });
      }

      const previousRole =
        getHighestLadderRoleId(
          applicant
        );

      const allowedTargets =
        type === "initial"

          ? [
              ROLE_STAFF,
              ROLE_TEAM
            ]

          : getPromotionTargets(
              previousRole
            );

      if (
        !allowedTargets.includes(
          targetRoleId
        )
      ) {
        processingApplications.delete(
          interaction.message.id
        );

        return interaction.followUp({
          content:
            "❌ הדרגה כבר לא מתאימה למצב הנוכחי.",

          ephemeral:
            true
        });
      }

      await applicant.roles.add(
        targetRoleId
      );

      const freshMember =
        await fetchFreshMember(
          interaction.guild,
          applicantId
        );

      await applyStaffNickname(
        freshMember
      );

      const roleName =
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
        roleName
      );

      await sendStaffLog({
        guild:
          interaction.guild,

        targetMember:
          freshMember,

        actorUser:
          interaction.user,

        title:
          type === "initial"
            ? "✅ צירוף חדש לצוות"
            : "⬆️ קידום צוות",

        fromRoleId:
          previousRole,

        toRoleId:
          targetRoleId
      });

      const embed =
        EmbedBuilder.from(
          interaction.message.embeds[0]
        );

      setStatusField(
        embed,
        `✅ **אושר**\n` +
        `🎖️ דרגה: **${roleName}**\n` +
        `טופל על ידי ${interaction.user}`
      );

      embed.setFooter({
        text:
          buildApplicationFooter(
            applicantId,
            type,
            "approved"
          )
      });

      processingApplications.delete(
        interaction.message.id
      );

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
            "❌ אין לך הרשאה.",

          ephemeral:
            true
        });
      }

      const userId =
        interaction.customId
          .split(":")[1];

      const member =
        await fetchFreshMember(
          interaction.guild,
          userId
        )
          .catch(
            () => null
          );

      if (!member) {
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
          userId,
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
            userId,

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
            "❌ אין לך הרשאה.",

          ephemeral:
            true
        });
      }

      const [
        ,
        userId,
        roleId
      ] =
        interaction.customId
          .split(":");

      await interaction.deferUpdate();

      const member =
        await fetchFreshMember(
          interaction.guild,
          userId
        );

      if (
        getHighestLadderRoleId(
          member
        )
      ) {
        return refreshManagementPanel(
          interaction,
          userId,
          "ℹ️ המשתמש כבר בצוות."
        );
      }

      if (
        ![
          ROLE_STAFF,
          ROLE_TEAM
        ].includes(
          roleId
        )
      ) {
        return refreshManagementPanel(
          interaction,
          userId,
          "❌ דרגה לא תקינה."
        );
      }

      await member.roles.add(
        roleId
      );

      const freshMember =
        await fetchFreshMember(
          interaction.guild,
          userId
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

        toRoleId:
          roleId
      });

      return refreshManagementPanel(
        interaction,
        userId,
        `✅ ${freshMember.user} נוסף/ה לצוות בתור **${await getRoleName(
          interaction.guild,
          roleId
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
            "❌ אין לך הרשאה.",

          ephemeral:
            true
        });
      }

      const userId =
        interaction.customId
          .split(":")[1];

      const member =
        await fetchFreshMember(
          interaction.guild,
          userId
        );

      const currentRole =
        getHighestLadderRoleId(
          member
        );

      const targets =
        getPromotionTargets(
          currentRole
        );

      if (
        !targets.length
      ) {
        await interaction.deferUpdate();

        return refreshManagementPanel(
          interaction,
          userId,
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
            userId,
            targets,
            "manage_promote_to",
            getPromotionLabels(
              currentRole
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
            "❌ אין לך הרשאה.",

          ephemeral:
            true
        });
      }

      const [
        ,
        userId,
        roleId
      ] =
        interaction.customId
          .split(":");

      await interaction.deferUpdate();

      const member =
        await fetchFreshMember(
          interaction.guild,
          userId
        );

      const previousRole =
        getHighestLadderRoleId(
          member
        );

      if (
        !getPromotionTargets(
          previousRole
        ).includes(
          roleId
        )
      ) {
        return refreshManagementPanel(
          interaction,
          userId,
          "❌ הקידום כבר לא מתאים."
        );
      }

      await member.roles.add(
        roleId
      );

      const freshMember =
        await fetchFreshMember(
          interaction.guild,
          userId
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
          previousRole,

        toRoleId:
          roleId
      });

      return refreshManagementPanel(
        interaction,
        userId,
        `✅ ${freshMember.user} קודם/ה ל-**${await getRoleName(
          interaction.guild,
          roleId
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
            "❌ אין לך הרשאה.",

          ephemeral:
            true
        });
      }

      const userId =
        interaction.customId
          .split(":")[1];

      await interaction.deferUpdate();

      const member =
        await fetchFreshMember(
          interaction.guild,
          userId
        );

      const currentRole =
        getHighestLadderRoleId(
          member
        );

      if (!currentRole) {
        return refreshManagementPanel(
          interaction,
          userId,
          "❌ המשתמש לא בצוות."
        );
      }

      const currentIndex =
        LADDER_ROLE_IDS.indexOf(
          currentRole
        );

      let previousRole =
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
          previousRole =
            LADDER_ROLE_IDS[i];

          break;
        }
      }

      if (!previousRole) {
        return refreshManagementPanel(
          interaction,
          userId,
          "ℹ️ אין דרגה קודמת שמורה. השתמש ב-הורדה מהצוות."
        );
      }

      await member.roles.remove(
        currentRole
      );

      const freshMember =
        await fetchFreshMember(
          interaction.guild,
          userId
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
          currentRole,

        toRoleId:
          previousRole
      });

      return refreshManagementPanel(
        interaction,
        userId,
        `✅ ${freshMember.user} הורד/ה ל-**${await getRoleName(
          interaction.guild,
          previousRole
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
            "❌ אין לך הרשאה.",

          ephemeral:
            true
        });
      }

      const userId =
        interaction.customId
          .split(":")[1];

      await interaction.deferUpdate();

      const member =
        await fetchFreshMember(
          interaction.guild,
          userId
        );

      const previousRole =
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
          userId,
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
          userId
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
          previousRole
      });

      return refreshManagementPanel(
        interaction,
        userId,
        `✅ ${freshMember.user} הוסר/ה מהצוות.`
      );
    }
  }
);

// ======================================================
// LOGIN
// ======================================================

client.login(TOKEN);
