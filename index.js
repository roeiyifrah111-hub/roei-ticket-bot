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
  intents: [GatewayIntentBits.Guilds]
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

// רק אתה יכול להשתמש ב-/staffmanage
const OWNER_USER_ID = "1243097719262941224";

// חדר פאנל הטיקטים
const PANEL_CHANNEL_ID = "1541390151757078599";

// חדר הבחינות לצוות
const STAFF_APPLICATION_CHANNEL_ID = "1541391169936687195";

// חדר לוג קידומים / הורדות
const STAFF_LOG_CHANNEL_ID = "1555688820916363354";


// ======================================================
// רולים
// ======================================================

// Staff
const ROLE_STAFF = "1555587941575696444";

// קידום ראשון
const ROLE_PROMO_1 = "1555588224636821526";

// Team
const ROLE_TEAM = "1555588615520653332";

// הדרגה הגבוהה
const ROLE_TOP = "1555588725398839376";

// רול נוסף שיכול לטפל בטיקטים ובבחינות
const EXTRA_HANDLER_ROLE = "1541371707011629077";


// כל הרולים שמותר להם:
// לראות טיקטים
// לסגור טיקטים
// לאשר / לדחות בחינות
const STAFF_ACCESS_ROLE_IDS = [
  ROLE_STAFF,
  EXTRA_HANDLER_ROLE,
  ROLE_PROMO_1,
  ROLE_TEAM,
  ROLE_TOP
];


// סולם הקידומים
// נמוך -> גבוה
const LADDER_ROLE_IDS = [
  ROLE_STAFF,
  ROLE_PROMO_1,
  ROLE_TEAM,
  ROLE_TOP
];


// ======================================================
// חסימה אחרי דחייה
// ======================================================

const REJECT_COOLDOWN_MS =
  7 * 24 * 60 * 60 * 1000;

const rejectionCooldowns = new Map();


// בקשות שעדיין מחכות לטיפול
const pendingApplications = new Set();

// מונע משני אנשי צוות לטפל באותה שנייה
const processingApplications = new Set();


// ======================================================
// סוגי טיקטים
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
// HELPERS
// ======================================================

function hasStaffAccess(member) {

  // אתה תמיד יכול
  if (member.id === OWNER_USER_ID) {
    return true;
  }

  return STAFF_ACCESS_ROLE_IDS.some(
    roleId =>
      member.roles.cache.has(roleId)
  );
}


// ======================================================
// הדרגה הכי גבוהה שיש למשתמש
// ======================================================

function getHighestLadderRoleId(member) {

  for (
    let i = LADDER_ROLE_IDS.length - 1;
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


// ======================================================
// לאיזה רולים אפשר להתקדם
// ======================================================

function getPromotionTargets(currentRoleId) {

  // Staff
  // אפשר קידום ראשון
  // או ישר Team

  if (currentRoleId === ROLE_STAFF) {

    return [
      ROLE_PROMO_1,
      ROLE_TEAM
    ];

  }


  // קידום ראשון -> Team

  if (currentRoleId === ROLE_PROMO_1) {

    return [
      ROLE_TEAM
    ];

  }


  // Team -> דרגה עליונה

  if (currentRoleId === ROLE_TEAM) {

    return [
      ROLE_TOP
    ];

  }


  // כבר בדרגה הכי גבוהה

  return [];
}


// ======================================================
// KEY לבקשה
// ======================================================

function applicationKey(
  type,
  userId
) {

  return `${type}:${userId}`;

}


// ======================================================
// מידע שנשמר בתוך Footer
// כדי שהחסימה תישמר גם אחרי Restart
// ======================================================

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


// ======================================================
// קריאת Footer
// ======================================================

function parseApplicationFooter(text) {

  if (
    !text ||
    !text.includes("applicant:")
  ) {

    return null;

  }


  const data = {};


  for (const part of text.split("|")) {

    const index =
      part.indexOf(":");


    if (index === -1) {
      continue;
    }


    const key =
      part.slice(0, index);

    const value =
      part.slice(index + 1);


    data[key] = value;

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


// ======================================================
// שם של רול
// ======================================================

async function getRoleName(
  guild,
  roleId
) {

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


// ======================================================
// פינג כל צוות הטיקטים
// ======================================================

function getStaffMentions() {

  return STAFF_ACCESS_ROLE_IDS
    .map(
      roleId =>
        `<@&${roleId}>`
    )
    .join(" ");

}


// ======================================================
// תפריט הטיקטים
// ======================================================

function createTicketMenu() {

  const menu =
    new StringSelectMenuBuilder()

      .setCustomId("ticket_type")

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

          .setValue("report"),


        new StringSelectMenuOptionBuilder()

          .setLabel(
            "תמיכה טכנית"
          )

          .setDescription(
            "קבלת עזרה בבעיה או תקלה"
          )

          .setEmoji("🛠️")

          .setValue("technical"),


        new StringSelectMenuOptionBuilder()

          .setLabel("כללי")

          .setDescription(
            "פנייה כללית לצוות"
          )

          .setEmoji("💬")

          .setValue("general"),


        new StringSelectMenuOptionBuilder()

          .setLabel(
            "בחינה / קידום לצוות"
          )

          .setDescription(
            "לחדשים: בחינה | לצוות: קידום"
          )

          .setEmoji("🛡️")

          .setValue("staff")

      );


  return new ActionRowBuilder()
    .addComponents(menu);
}


// ======================================================
// הפאנל הראשי
// ======================================================

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


// ======================================================
// כפתור סגירת טיקט
// ======================================================

function createCloseTicketRow() {

  const button =
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
      );


  return new ActionRowBuilder()
    .addComponents(button);
}


// ======================================================
// הודעות בתוך טיקט
// ======================================================

function createTicketEmbed(
  type,
  user
) {

  if (type === "report") {

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


  if (type === "technical") {

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


// ======================================================
// הרשאות טיקט
// ======================================================

function createTicketPermissions(
  guild,
  userId
) {

  const overwrites = [

    // כולם לא רואים
    {
      id: guild.id,

      deny: [
        PermissionFlagsBits.ViewChannel
      ]
    },


    // מי שפתח
    {
      id: userId,

      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks
      ]
    },


    // הבוט
    {
      id: client.user.id,

      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageMessages
      ]
    }

  ];


  // כל רולי הצוות
  for (
    const roleId of
    STAFF_ACCESS_ROLE_IDS
  ) {

    overwrites.push({

      id: roleId,

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
// טופס בחינה / קידום
// ======================================================

function createStaffApplicationModal(
  type
) {

  const isPromotion =
    type === "promotion";


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

      .setCustomId("age")

      .setLabel(
        "בן כמה את/ה?"
      )

      .setPlaceholder(
        "אני בן/בת..."
      )

      .setStyle(
        TextInputStyle.Short
      )

      .setMaxLength(50)

      .setRequired(true);


  const situationInput =
    new TextInputBuilder()

      .setCustomId("situation")

      .setLabel(
        "אם שני אנשים רבים ומקללים, מה תעשה?"
      )

      .setPlaceholder(
        "אני הייתי..."
      )

      .setStyle(
        TextInputStyle.Paragraph
      )

      .setMaxLength(1000)

      .setRequired(true);


  const nameInput =
    new TextInputBuilder()

      .setCustomId("name")

      .setLabel(
        "איך קוראים לך?"
      )

      .setPlaceholder(
        "קוראים לי..."
      )

      .setStyle(
        TextInputStyle.Short
      )

      .setMaxLength(100)

      .setRequired(true);


  const experienceInput =
    new TextInputBuilder()

      .setCustomId("experience")

      .setLabel(
        "יש לך ניסיון בניהול?"
      )

      .setPlaceholder(
        "כן, יש לי... / לא, אין לי..."
      )

      .setStyle(
        TextInputStyle.Paragraph
      )

      .setMaxLength(1000)

      .setRequired(true);


  const notesInput =
    new TextInputBuilder()

      .setCustomId("notes")

      .setLabel("הערות")

      .setPlaceholder(
        "משהו נוסף שתרצו לספר לנו..."
      )

      .setStyle(
        TextInputStyle.Paragraph
      )

      // היחיד שלא חובה
      .setRequired(false);


  modal.addComponents(

    new ActionRowBuilder()
      .addComponents(ageInput),

    new ActionRowBuilder()
      .addComponents(situationInput),

    new ActionRowBuilder()
      .addComponents(nameInput),

    new ActionRowBuilder()
      .addComponents(experienceInput),

    new ActionRowBuilder()
      .addComponents(notesInput)

  );


  return modal;
}


// ======================================================
// כפתור "טופל על ידי"
// ======================================================

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

        .setEmoji("📋")

        .setStyle(
          ButtonStyle.Secondary
        )

        .setDisabled(true)

    );

}


// ======================================================
// החלפת שדה סטטוס
// ======================================================

function setStatusField(
  embed,
  value
) {

  const oldFields =
    embed.data.fields || [];


  const fields =
    oldFields.filter(
      field =>
        field.name !== "📋 סטטוס"
    );


  embed.setFields(

    ...fields,

    {
      name: "📋 סטטוס",
      value
    }

  );


  return embed;
}


// ======================================================
// בדיקת חסימה
// ======================================================

function getCooldownExpiry(userId) {

  const expiry =
    rejectionCooldowns.get(userId);


  if (!expiry) {

    return null;

  }


  if (
    Date.now() >= expiry
  ) {

    rejectionCooldowns.delete(
      userId
    );

    return null;

  }


  return expiry;
}


// ======================================================
// טעינת חסימות ובקשות אחרי Restart
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
    let scanned = 0;


    while (scanned < 2000) {

      const batch =
        await channel.messages.fetch({

          limit: 100,

          ...(before
            ? { before }
            : {})

        });


      if (!batch.size) {

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
            expiry > Date.now()
          ) {

            const old =
              rejectionCooldowns.get(
                data.applicant
              ) || 0;


            if (expiry > old) {

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
        batch.size < 100
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
// לוג שינוי רול
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

        .setTitle(title)

        .addFields(

          {
            name: "👤 משתמש",

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
      embeds: [embed]
    });


  } catch (error) {

    console.error(
      "❌ שגיאה בלוג:",
      error
    );

  }

}


// ======================================================
// הודעה פרטית למועמד
// ======================================================

async function sendApplicantDM(
  userId,
  type,
  status,
  roleName = null
) {

  const user =
    await client.users
      .fetch(userId)
      .catch(() => null);


  if (!user) {

    return false;

  }


  let embed;


  // בבדיקה
  if (status === "pending") {

    embed =
      new EmbedBuilder()

        .setTitle(

          type === "promotion"

            ? "⬆️ בקשת הקידום שלך בבדיקה"

            : "🛡️ הבקשה שלך בבדיקה"

        )

        .setDescription(

          "**הבקשה התקבלה בהצלחה ✅**\n\n" +

          "⏳ **סטטוס: בבדיקה**\n\n" +

          "צוות השרת יעבור על התשובות שלך.\n" +

          "כשתתקבל החלטה, תקבל/י כאן הודעה פרטית."

        );

  }


  // התקבל
  else if (
    status === "approved"
  ) {

    embed =
      new EmbedBuilder()

        .setTitle(

          type === "promotion"

            ? "🎉 קיבלת קידום!"

            : "✅ התקבלת לצוות!"

        )

        .setDescription(

          type === "promotion"

            ? "**בקשת הקידום שלך אושרה!**\n\n" +

              `🎖️ הדרגה החדשה שלך: **${roleName}**\n\n` +

              "**כל הכבוד ובהצלחה! 🛡️**"

            : "**שמחים לעדכן שהבקשה שלך אושרה! 🎉**\n\n" +

              `🎖️ התפקיד שקיבלת: **${roleName}**\n\n` +

              "**בהצלחה בצוות! 🛡️**"

        );

  }


  // נדחה
  else {

    embed =
      new EmbedBuilder()

        .setTitle(

          type === "promotion"

            ? "❌ בקשת הקידום לא אושרה"

            : "❌ עדכון לגבי הבקשה שלך"

        )

        .setDescription(

          type === "promotion"

            ? "**בקשת הקידום שלך נבדקה, אך הפעם היא לא אושרה.**\n\n" +

              "תודה על ההשקעה 💙"

            : "**הבקשה שלך להצטרפות לצוות נבדקה, אך הפעם היא לא אושרה.**\n\n" +

              "⏳ ניתן להגיש בקשה חדשה בעוד **7 ימים**.\n\n" +

              "תודה שהקדשת זמן למילוי הטופס 💙"

        );

  }


  try {

    await user.send({
      embeds: [embed]
    });


    return true;

  } catch {

    return false;

  }

}


// ======================================================
// Embed ניהול צוות
// ======================================================

async function buildManagementEmbed(
  guild,
  member
) {

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

      "**בחר פעולה:**"

    );

}


// ======================================================
// כפתורי ניהול
// ======================================================

function createManagementButtons(
  userId
) {

  return new ActionRowBuilder()

    .addComponents(

      new ButtonBuilder()

        .setCustomId(
          `manage_promote:${userId}`
        )

        .setLabel("קידום")

        .setEmoji("⬆️")

        .setStyle(
          ButtonStyle.Success
        ),


      new ButtonBuilder()

        .setCustomId(
          `manage_demote:${userId}`
        )

        .setLabel(
          "הורדת דרגה"
        )

        .setEmoji("⬇️")

        .setStyle(
          ButtonStyle.Primary
        ),


      new ButtonBuilder()

        .setCustomId(
          `manage_remove:${userId}`
        )

        .setLabel(
          "הורדה מהצוות"
        )

        .setEmoji("❌")

        .setStyle(
          ButtonStyle.Danger
        )

    );

}


// ======================================================
// יצירת כפתורי דרגות
// ======================================================

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
    const roleId of roleIds
  ) {

    const roleName =
      customLabels[roleId] ||

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
// /staffmanage
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


    // ==================================================
    // רישום /staffmanage
    // ==================================================

    if (
      TOKEN &&
      CLIENT_ID &&
      GUILD_ID
    ) {

      try {

        const rest =
          new REST({
            version: "10"
          }).setToken(TOKEN);


        // מוחק פקודות ישנות כמו /ticketpanel
        // ומשאיר רק /staffmanage

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


    // ==================================================
    // טעינת חסימות
    // ==================================================

    await loadApplicationState();


    // ==================================================
    // פאנל טיקטים
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
        await panelChannel.messages.fetch({
          limit: 100
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


            return message.components.some(

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

      }

      else {

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
// INTERACTIONS
// ======================================================

client.on(
  "interactionCreate",
  async interaction => {


    // ==================================================
    // /staffmanage
    // ==================================================

    if (
      interaction.isChatInputCommand() &&
      interaction.commandName ===
      "staffmanage"
    ) {

      // רק אתה

      if (
        interaction.user.id !==
        OWNER_USER_ID
      ) {

        return interaction.reply({

          content:
            "❌ הפקודה הזאת זמינה רק לבעל השרת.",

          ephemeral: true

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

          .setMinValues(1)

          .setMaxValues(1);


      return interaction.reply({

        content:
          "🛡️ **ניהול צוות**\nבחר משתמש:",

        components: [

          new ActionRowBuilder()
            .addComponents(
              userSelect
            )

        ],

        ephemeral: true

      });

    }


// ======================================================
// בחירת משתמש ב-/staffmanage
// ======================================================

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

          ephemeral: true

        });

      }


      const targetId =
        interaction.values[0];


      const member =
        await interaction.guild.members
          .fetch(targetId)
          .catch(() => null);


      if (!member) {

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

        components: [

          createManagementButtons(
            member.id
          )

        ]

      });

    }


// ======================================================
// תפריט הטיקטים
// ======================================================

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId ===
      "ticket_type"
    ) {

      const type =
        interaction.values[0];


      // =================================================
      // בחינה / קידום
      // =================================================

      if (type === "staff") {

        try {

          const member =
            await interaction.guild.members
              .fetch(
                interaction.user.id
              );


          const currentRoleId =
            getHighestLadderRoleId(
              member
            );


          // כבר בדרגה האחרונה

          if (
            currentRoleId ===
            ROLE_TOP
          ) {

            await interaction.reply({

              content:
                "🏆 כבר הגעת לדרגה הגבוהה ביותר ואין כרגע קידום נוסף.",

              ephemeral: true

            });


            await interaction.message
              .edit({

                components: [
                  createTicketMenu()
                ]

              })
              .catch(() => {});


            return;

          }


          // אם כבר בצוות -> קידום
          // אם לא -> בחינה רגילה

          const applicationType =
            currentRoleId

              ? "promotion"

              : "initial";


          // ===============================================
          // חסימת 7 ימים
          // רק על בחינה ראשונה לצוות
          // ===============================================

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

                ephemeral: true

              });


              await interaction.message
                .edit({

                  components: [
                    createTicketMenu()
                  ]

                })
                .catch(() => {});


              return;

            }

          }


          // כבר קיימת בקשה

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

              ephemeral: true

            });


            await interaction.message
              .edit({

                components: [
                  createTicketMenu()
                ]

              })
              .catch(() => {});


            return;

          }


          // קודם פותחים Modal
          // כדי שהתגובה תהיה מהירה

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
            .catch(() => {});


        } catch (error) {

          console.error(
            "❌ שגיאה בפתיחת הבחינה:",
            error
          );

        }


        return;

      }


// ======================================================
// טיקט רגיל
// ======================================================

      await interaction.deferReply({
        ephemeral: true
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


        // ===============================================
        // כבר יש טיקט?
        // ===============================================

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


        // ===============================================
        // קטגוריה
        // ===============================================

        let validCategoryId = null;


        if (CATEGORY_ID) {

          const category =
            await guild.channels
              .fetch(CATEGORY_ID)
              .catch(() => null);


          if (
            category &&
            category.type ===
            ChannelType.GuildCategory
          ) {

            validCategoryId =
              category.id;

          }

        }


        // ===============================================
        // יצירת הטיקט
        // ===============================================

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


        if (validCategoryId) {

          channelData.parent =
            validCategoryId;

        }


        const channel =
          await guild.channels.create(
            channelData
          );


        // ===============================================
        // הודעה בטיקט
        // ===============================================

        await channel.send({

          content:

            `${interaction.user} ` +
            `${getStaffMentions()}`,

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


        // איפוס התפריט

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
          .catch(() => {});


        return interaction.editReply(
          "❌ הייתה בעיה בפתיחת הטיקט."
        );

      }

    }


// ======================================================
// סגור טיקט
// ======================================================

    if (
      interaction.isButton() &&
      interaction.customId ===
      "close_ticket"
    ) {

      const member =
        await interaction.guild.members
          .fetch(
            interaction.user.id
          );


      // רק הרולים שהגדרת + אתה

      if (
        !hasStaffAccess(member)
      ) {

        return interaction.reply({

          content:
            "❌ רק צוות מורשה יכול לסגור את הטיקט.",

          ephemeral: true

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

          ephemeral: true

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


// ======================================================
// שליחת טופס בחינה / קידום
// ======================================================

    if (

      interaction.isModalSubmit() &&

      interaction.customId.startsWith(
        "staff_application_modal:"
      )

    ) {

      await interaction.deferReply({
        ephemeral: true
      });


      try {

        const requestedType =
          interaction.customId
            .split(":")[1];


        const member =
          await interaction.guild.members
            .fetch(
              interaction.user.id
            );


        const currentRoleId =
          getHighestLadderRoleId(
            member
          );


        // מצב השתנה בזמן שמילא את הטופס

        if (
          requestedType === "initial" &&
          currentRoleId
        ) {

          return interaction.editReply(

            "ℹ️ הדרגה שלך השתנתה. פתח/י מחדש את הבחינה מהפאנל."

          );

        }


        if (
          requestedType === "promotion" &&
          !currentRoleId
        ) {

          return interaction.editReply(

            "ℹ️ כרגע אינך מזוהה כחבר/ת צוות. פתח/י מחדש את הבחינה."

          );

        }


        if (
          requestedType === "promotion" &&
          currentRoleId === ROLE_TOP
        ) {

          return interaction.editReply(
            "🏆 כבר הגעת לדרגה הגבוהה ביותר."
          );

        }


        // חסימה

        if (
          requestedType === "initial"
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
          pendingApplications.has(key)
        ) {

          return interaction.editReply(

            "⏳ כבר קיימת בקשה שלך שממתינה לטיפול."

          );

        }


        // ===============================================
        // תשובות
        // ===============================================

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


        // ===============================================
        // חדר הבחינות
        // ===============================================

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


        // ===============================================
        // Embed
        // ===============================================

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
                name: "👤 משתמש",

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

                value: age
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


        // ===============================================
        // כפתורים
        // ===============================================

        const approve =
          new ButtonBuilder()

            .setCustomId(

              `app_approve:` +
              `${requestedType}:` +
              `${interaction.user.id}`

            )

            .setLabel("לאשר")

            .setEmoji("✅")

            .setStyle(
              ButtonStyle.Success
            );


        const reject =
          new ButtonBuilder()

            .setCustomId(

              `app_reject:` +
              `${requestedType}:` +
              `${interaction.user.id}`

            )

            .setLabel(
              "לא לאשר"
            )

            .setEmoji("❌")

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


        // ===============================================
        // DM - בבדיקה
        // ===============================================

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


// ======================================================
// לחיצה על "לאשר"
// ======================================================

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


      const reviewer =
        await interaction.guild.members
          .fetch(
            interaction.user.id
          );


      if (
        !hasStaffAccess(reviewer)
      ) {

        return interaction.reply({

          content:
            "❌ אין לך הרשאה לטפל בבקשה הזאת.",

          ephemeral: true

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

          ephemeral: true

        });

      }


      processingApplications.add(
        interaction.message.id
      );


      await interaction.deferUpdate();


      try {

        const applicant =
          await interaction.guild.members

            .fetch(applicantId)

            .catch(() => null);


        if (!applicant) {

          return interaction.followUp({

            content:
              "❌ המשתמש כבר לא נמצא בשרת.",

            ephemeral: true

          });

        }


        const currentRoleId =
          getHighestLadderRoleId(
            applicant
          );


        let targets;
        let labels = {};


        // ===============================================
        // בחינה ראשונה
        // Staff / Team
        // ===============================================

        if (type === "initial") {

          if (currentRoleId) {

            return interaction.followUp({

              content:
                "ℹ️ המשתמש כבר נמצא בצוות.",

              ephemeral: true

            });

          }


          targets = [
            ROLE_STAFF,
            ROLE_TEAM
          ];


          labels = {

            [ROLE_STAFF]:
              "Staff",

            [ROLE_TEAM]:
              "Team"

          };

        }


        // ===============================================
        // קידום
        // ===============================================

        else {

          if (!currentRoleId) {

            return interaction.followUp({

              content:
                "❌ המשתמש אינו נמצא כרגע בצוות.",

              ephemeral: true

            });

          }


          targets =
            getPromotionTargets(
              currentRoleId
            );


          if (!targets.length) {

            return interaction.followUp({

              content:
                "🏆 המשתמש כבר בדרגה הגבוהה ביותר.",

              ephemeral: true

            });

          }

        }


        // ===============================================
        // שינוי הסטטוס
        // ===============================================

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

          ephemeral: true

        }).catch(() => {});


      } finally {

        processingApplications.delete(
          interaction.message.id
        );

      }


      return;

    }


// ======================================================
// דחיית בקשה
// ======================================================

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
        await interaction.guild.members
          .fetch(
            interaction.user.id
          );


      if (
        !hasStaffAccess(reviewer)
      ) {

        return interaction.reply({

          content:
            "❌ אין לך הרשאה לטפל בבקשה הזאת.",

          ephemeral: true

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

          ephemeral: true

        });

      }


      processingApplications.add(
        interaction.message.id
      );


      await interaction.deferUpdate();


      try {

        const rejectedAt =
          Date.now();


        // חסימת שבוע רק בבחינה הראשונה

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


        // DM

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

          `❌ **לא אושר**\n` +
          `טופל על ידי ${interaction.user}`

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


        await interaction.followUp({

          content:
            "❌ הייתה בעיה בדחיית הבקשה.",

          ephemeral: true

        }).catch(() => {});


      } finally {

        processingApplications.delete(
          interaction.message.id
        );

      }


      return;

    }


// ======================================================
// אחרי אישור - בחירת Staff / Team / קידום
// ======================================================

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
        await interaction.guild.members
          .fetch(
            interaction.user.id
          );


      if (
        !hasStaffAccess(reviewer)
      ) {

        return interaction.reply({

          content:
            "❌ אין לך הרשאה לבחור דרגה.",

          ephemeral: true

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

          ephemeral: true

        });

      }


      processingApplications.add(
        interaction.message.id
      );


      await interaction.deferUpdate();


      try {

        const applicant =
          await interaction.guild.members

            .fetch(applicantId)

            .catch(() => null);


        if (!applicant) {

          return interaction.followUp({

            content:
              "❌ המשתמש כבר לא נמצא בשרת.",

            ephemeral: true

          });

        }


        const beforeRoleId =
          getHighestLadderRoleId(
            applicant
          );


        let allowedTargets;


        if (type === "initial") {

          allowedTargets = [

            ROLE_STAFF,
            ROLE_TEAM

          ];

        }

        else {

          allowedTargets =
            getPromotionTargets(
              beforeRoleId
            );

        }


        if (
          !allowedTargets.includes(
            targetRoleId
          )
        ) {

          return interaction.followUp({

            content:
              "❌ הדרגה הזאת כבר לא מתאימה למצב הנוכחי של המשתמש.",

            ephemeral: true

          });

        }


        // ===============================================
        // מוסיף את הרול
        //
        // לא מוחק את הקודם בכוונה!
        // כך בהורדת דרגה ניתן לחזור לדרגה הקודמת.
        // ===============================================

        await applicant.roles.add(
          targetRoleId
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


        // ===============================================
        // DM התקבל
        // ===============================================

        await sendApplicantDM(

          applicantId,
          type,
          "approved",
          targetRoleName

        );


        // ===============================================
        // לוג
        // ===============================================

        await sendStaffLog({

          guild:
            interaction.guild,

          targetMember:
            applicant,

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


        // ===============================================
        // עדכון הודעת הבחינה
        // ===============================================

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


        await interaction.followUp({

          content:

            "❌ לא הצלחתי לתת את הרול.\n" +

            "ודא שהרול של הבוט נמצא **מעל רולי הצוות** ברשימת הרולים.",

          ephemeral: true

        }).catch(() => {});


      } finally {

        processingApplications.delete(
          interaction.message.id
        );

      }


      return;

    }


// ======================================================
// /staffmanage -> קידום
// ======================================================

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

          ephemeral: true

        });

      }


      const targetId =
        interaction.customId
          .split(":")[1];


      const member =
        await interaction.guild.members

          .fetch(targetId)

          .catch(() => null);


      if (!member) {

        return interaction.update({

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

        return interaction.update({

          content:
            "❌ המשתמש לא נמצא בסולם הצוות.",

          embeds: [

            await buildManagementEmbed(
              interaction.guild,
              member
            )

          ],

          components: [

            createManagementButtons(
              member.id
            )

          ]

        });

      }


      const targets =
        getPromotionTargets(
          currentRoleId
        );


      if (!targets.length) {

        return interaction.update({

          content:
            "🏆 המשתמש כבר בדרגה הגבוהה ביותר.",

          embeds: [

            await buildManagementEmbed(
              interaction.guild,
              member
            )

          ],

          components: [

            createManagementButtons(
              member.id
            )

          ]

        });

      }


      const row =
        await createRoleChoiceRow(

          interaction.guild,
          member.id,
          targets,
          "manage_promote_to"

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


// ======================================================
// /staffmanage -> בחירת דרגת קידום
// ======================================================

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

          ephemeral: true

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
        await interaction.guild.members

          .fetch(targetId)

          .catch(() => null);


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

        return interaction.editReply({

          content:
            "❌ הקידום הזה כבר לא מתאים לדרגה הנוכחית.",

          embeds: [

            await buildManagementEmbed(
              interaction.guild,
              member
            )

          ],

          components: [

            createManagementButtons(
              member.id
            )

          ]

        });

      }


      try {

        await member.roles.add(
          targetRoleId
        );


        await sendStaffLog({

          guild:
            interaction.guild,

          targetMember:
            member,

          actorUser:
            interaction.user,

          title:
            "⬆️ קידום צוות ידני",

          fromRoleId:
            beforeRoleId,

          toRoleId:
            targetRoleId

        });


        const newRoleName =
          await getRoleName(

            interaction.guild,
            targetRoleId

          );


        return interaction.editReply({

          content:

            `✅ ${member.user} קודם/ה ל־**${newRoleName}**.`,

          embeds: [

            await buildManagementEmbed(
              interaction.guild,
              member
            )

          ],

          components: [

            createManagementButtons(
              member.id
            )

          ]

        });


      } catch (error) {

        console.error(
          "❌ שגיאה בקידום:",
          error
        );


        return interaction.editReply({

          content:

            "❌ לא הצלחתי לתת את הרול. ודא שרול הבוט נמצא מעל רולי הצוות.",

          embeds: [

            await buildManagementEmbed(
              interaction.guild,
              member
            )

          ],

          components: [

            createManagementButtons(
              member.id
            )

          ]

        });

      }

    }


// ======================================================
// /staffmanage -> הורדת דרגה
// ======================================================

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

          ephemeral: true

        });

      }


      const targetId =
        interaction.customId
          .split(":")[1];


      await interaction.deferUpdate();


      const member =
        await interaction.guild.members

          .fetch(targetId)

          .catch(() => null);


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

        return interaction.editReply({

          content:
            "❌ המשתמש לא נמצא בצוות.",

          embeds: [

            await buildManagementEmbed(
              interaction.guild,
              member
            )

          ],

          components: [

            createManagementButtons(
              member.id
            )

          ]

        });

      }


      const currentIndex =
        LADDER_ROLE_IDS.indexOf(
          currentRoleId
        );


      let previousRoleId = null;


      // מחפש את הדרגה הקודמת
      // שהמשתמש עדיין מחזיק

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


      // אם למשל הוא נכנס ישר כ-Team
      // אין לנו דרגה קודמת

      if (!previousRoleId) {

        return interaction.editReply({

          content:

            "ℹ️ אין למשתמש דרגה קודמת שמורה.\n" +

            "אם אתה רוצה להוציא אותו מהצוות, השתמש ב־**הורדה מהצוות**.",

          embeds: [

            await buildManagementEmbed(
              interaction.guild,
              member
            )

          ],

          components: [

            createManagementButtons(
              member.id
            )

          ]

        });

      }


      try {

        // מוריד רק את הדרגה הכי גבוהה
        // הדרגה הקודמת נשארת

        await member.roles.remove(
          currentRoleId
        );


        await sendStaffLog({

          guild:
            interaction.guild,

          targetMember:
            member,

          actorUser:
            interaction.user,

          title:
            "⬇️ הורדת דרגה",

          fromRoleId:
            currentRoleId,

          toRoleId:
            previousRoleId

        });


        const previousName =
          await getRoleName(

            interaction.guild,
            previousRoleId

          );


        return interaction.editReply({

          content:

            `✅ ${member.user} הורד/ה ל־**${previousName}**.`,

          embeds: [

            await buildManagementEmbed(
              interaction.guild,
              member
            )

          ],

          components: [

            createManagementButtons(
              member.id
            )

          ]

        });


      } catch (error) {

        console.error(
          "❌ שגיאה בהורדת דרגה:",
          error
        );


        return interaction.editReply({

          content:

            "❌ לא הצלחתי להסיר את הרול. ודא שרול הבוט נמצא מעל רולי הצוות.",

          embeds: [

            await buildManagementEmbed(
              interaction.guild,
              member
            )

          ],

          components: [

            createManagementButtons(
              member.id
            )

          ]

        });

      }

    }


// ======================================================
// /staffmanage -> הורדה מהצוות
// ======================================================

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

          ephemeral: true

        });

      }


      const targetId =
        interaction.customId
          .split(":")[1];


      await interaction.deferUpdate();


      const member =
        await interaction.guild.members

          .fetch(targetId)

          .catch(() => null);


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


      if (!rolesToRemove.length) {

        return interaction.editReply({

          content:
            "ℹ️ למשתמש אין אף אחד מרולי הצוות.",

          embeds: [

            await buildManagementEmbed(
              interaction.guild,
              member
            )

          ],

          components: [

            createManagementButtons(
              member.id
            )

          ]

        });

      }


      try {

        // מוריד את כל רולי הצוות

        for (
          const roleId of
          rolesToRemove
        ) {

          await member.roles.remove(
            roleId
          );

        }


        await sendStaffLog({

          guild:
            interaction.guild,

          targetMember:
            member,

          actorUser:
            interaction.user,

          title:
            "❌ הורדה מהצוות",

          fromRoleId:
            beforeRoleId,

          toRoleId:
            null

        });


        return interaction.editReply({

          content:

            `✅ ${member.user} הוסר/ה מהצוות.`,

          embeds: [

            await buildManagementEmbed(
              interaction.guild,
              member
            )

          ],

          components: [

            createManagementButtons(
              member.id
            )

          ]

        });


      } catch (error) {

        console.error(
          "❌ שגיאה בהורדה מהצוות:",
          error
        );


        return interaction.editReply({

          content:

            "❌ לא הצלחתי להסיר את הרולים. ודא שרול הבוט נמצא מעל רולי הצוות.",

          embeds: [

            await buildManagementEmbed(
              interaction.guild,
              member
            )

          ],

          components: [

            createManagementButtons(
              member.id
            )

          ]

        });

      }

    }

  }
);


// ======================================================
// LOGIN
// ======================================================

client.login(TOKEN);
