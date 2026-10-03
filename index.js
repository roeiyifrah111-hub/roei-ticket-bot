const {
  Client,
  GatewayIntentBits,
  PermissionFlagsBits,
  ChannelType,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds
  ]
});

const TOKEN = process.env.BOT_TOKEN;


// ======================================================
// IDS
// ======================================================

// החדר שבו נמצא פאנל הטיקטים
const PANEL_CHANNEL_ID = "1541390151757078599";

// החדר שאליו נשלחות הבחינות לצוות
const STAFF_APPLICATION_CHANNEL_ID = "1541391169936687195";

// כל הרולים שיכולים לטפל בטיקטים ובבקשות לצוות
const STAFF_ROLE_IDS = [
  "1555587941575696444",
  "1541371707011629077",
  "1555588725398839376",
  "1555588615520653332",
  "1555588224636821526"
];

// קטגוריית הטיקטים מ-Railway
const CATEGORY_ID = process.env.CATEGORY_ID;


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
  },

  staff: {
    name: "בחינה לצוות",
    emoji: "🛡️"
  }

};


// ======================================================
// יצירת התפריט הראשי
// ======================================================

function createTicketMenu() {

  const menu = new StringSelectMenuBuilder()

    .setCustomId("ticket_type")

    .setPlaceholder("בחרו את סוג הפנייה שלכם")

    .addOptions(

      new StringSelectMenuOptionBuilder()
        .setLabel("דיווח על משתמש")
        .setDescription("דיווח על משתמש שעבר על חוקי השרת")
        .setEmoji("🚨")
        .setValue("report"),

      new StringSelectMenuOptionBuilder()
        .setLabel("תמיכה טכנית")
        .setDescription("קבלת עזרה בבעיה או תקלה")
        .setEmoji("🛠️")
        .setValue("technical"),

      new StringSelectMenuOptionBuilder()
        .setLabel("כללי")
        .setDescription("פנייה כללית לצוות")
        .setEmoji("💬")
        .setValue("general"),

      new StringSelectMenuOptionBuilder()
        .setLabel("בחינה לצוות")
        .setDescription("שליחת בקשה להצטרפות לצוות")
        .setEmoji("🛡️")
        .setValue("staff")

    );

  return new ActionRowBuilder()
    .addComponents(menu);
}


// ======================================================
// פאנל הטיקטים
// ======================================================

function createPanelEmbed() {

  return new EmbedBuilder()

    .setTitle("מערכת טיקטים🎫")

    .setDescription(
      "**שלום לכולם! ✨**\n\n" +

      "**בחרו סוג פנייה**\n\n" +

      "1️⃣ 🚨 **דיווח על משתמש**\n" +
      "2️⃣ 🛠️ **תמיכה טכנית**\n" +
      "3️⃣ 💬 **כללי**\n" +
      "4️⃣ 🛡️ **בחינה לצוות**\n\n" +

      "**⚠️ פניות שלא קשורות יסגרו ישר, פתחו טיקט רק אם באמת צריך**"
    );
}


// ======================================================
// הודעה בתוך טיקט
// ======================================================

function createTicketEmbed(type, user) {

  if (type === "report") {

    return new EmbedBuilder()

      .setTitle("🚨 דיווח על משתמש")

      .setDescription(
        `שלום ${user} 👋\n\n` +

        "**תודה שפנית לצוות השרת.**\n\n" +

        "כדי שנוכל לבדוק את הדיווח בצורה מסודרת, כתבו בבקשה:\n\n" +

        "👤 **על מי הדיווח?**\n" +
        "כתבו שם משתמש או ID.\n\n" +

        "📝 **מה קרה?**\n" +
        "הסבירו את המקרה בצורה ברורה.\n\n" +

        "📸 **יש הוכחות?**\n" +
        "צרפו תמונות, סרטונים או צילומי מסך אם יש.\n\n" +

        "🕒 **מתי זה קרה?**\n" +
        "כתבו זמן משוער אם אתם זוכרים.\n\n" +

        "⚠️ אין צורך להתווכח או לתייג את המשתמש שעליו דיווחתם.\n\n" +

        "**צוות השרת יעבור על המקרה ויטפל בו בהקדם.**"
      );
  }


  if (type === "technical") {

    return new EmbedBuilder()

      .setTitle("🛠️ תמיכה טכנית")

      .setDescription(
        `שלום ${user} 👋\n\n` +

        "**ברוכים הבאים לתמיכה הטכנית.**\n\n" +

        "כדי שנוכל לעזור לכם במהירות, כתבו בבקשה:\n\n" +

        "🔧 **מה הבעיה?**\n" +
        "הסבירו בדיוק מה לא עובד.\n\n" +

        "📱 **איפה הבעיה מתרחשת?**\n" +
        "לדוגמה: Discord, משחק, אתר או משהו אחר.\n\n" +

        "📸 **צילום מסך / סרטון**\n" +
        "אם אפשר, צרפו צילום שמראה את התקלה.\n\n" +

        "✅ **מה כבר ניסיתם לעשות?**\n" +
        "ספרו לנו מה כבר ניסיתם כדי לפתור את הבעיה.\n\n" +

        "**אחד מאנשי הצוות יענה לכם בהקדם.**"
      );
  }


  return new EmbedBuilder()

    .setTitle("💬 פנייה כללית")

    .setDescription(
      `שלום ${user} 👋\n\n` +

      "**פתחתם פנייה כללית לצוות.**\n\n" +

      "כתבו כאן בצורה ברורה במה אתם צריכים עזרה או על מה תרצו לדבר.\n\n" +

      "📝 מומלץ להסביר את כל הפרטים כבר בהודעה הראשונה כדי שנוכל לעזור לכם מהר יותר.\n\n" +

      "**צוות השרת יענה לכם בהקדם האפשרי.**"
    );
}


// ======================================================
// טופס בחינה לצוות
// ======================================================

function createStaffApplicationModal() {

  const modal = new ModalBuilder()

    .setCustomId("staff_application_modal")

    .setTitle("בחינה לצוות 🛡️");


  const ageInput = new TextInputBuilder()

    .setCustomId("age")

    .setLabel("בן כמה את/ה?")

    .setPlaceholder("אני בן/בת...")

    .setStyle(TextInputStyle.Short)

    .setMaxLength(50)

    .setRequired(true);


  const situationInput = new TextInputBuilder()

    .setCustomId("situation")

    .setLabel("אם שני אנשים רבים ומקללים, מה תעשה?")

    .setPlaceholder("אני הייתי...")

    .setStyle(TextInputStyle.Paragraph)

    .setMaxLength(1000)

    .setRequired(true);


  const nameInput = new TextInputBuilder()

    .setCustomId("name")

    .setLabel("איך קוראים לך?")

    .setPlaceholder("קוראים לי...")

    .setStyle(TextInputStyle.Short)

    .setMaxLength(100)

    .setRequired(true);


  const experienceInput = new TextInputBuilder()

    .setCustomId("experience")

    .setLabel("יש לך ניסיון בניהול?")

    .setPlaceholder("כן, יש לי... / לא, אין לי...")

    .setStyle(TextInputStyle.Paragraph)

    .setMaxLength(1000)

    .setRequired(true);


  const notesInput = new TextInputBuilder()

    .setCustomId("notes")

    .setLabel("הערות")

    .setPlaceholder("משהו נוסף שתרצו לספר לנו...")

    .setStyle(TextInputStyle.Paragraph)

    .setMaxLength(1000)

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
// בדיקה אם משתמש הוא צוות
// ======================================================

function memberIsStaff(member) {

  if (
    member.permissions.has(
      PermissionFlagsBits.Administrator
    )
  ) {
    return true;
  }


  return STAFF_ROLE_IDS.some(
    roleId =>
      member.roles.cache.has(roleId)
  );
}


// ======================================================
// יצירת הרשאות לטיקט
// ======================================================

function createTicketPermissions(
  guild,
  userId
) {

  const overwrites = [

    // כל השרת לא רואה
    {
      id: guild.id,

      deny: [
        PermissionFlagsBits.ViewChannel
      ]
    },


    // מי שפתח את הטיקט
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


  // מוסיף את כל רולי הצוות
  for (
    const roleId of STAFF_ROLE_IDS
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
// פינג לכל רולי הצוות
// ======================================================

function getStaffMentions() {

  return STAFF_ROLE_IDS
    .map(
      roleId => `<@&${roleId}>`
    )
    .join(" ");
}


// ======================================================
// כשהבוט עולה
// ======================================================

client.once(
  "ready",
  async () => {

    console.log(
      `✅ הבוט מחובר בתור ${client.user.tag}`
    );


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
          "❌ לא מצאתי את חדר מערכת הטיקטים"
        );

        return;
      }


      // ====================================
      // מוחק /ticketpanel ישן
      // ====================================

      try {

        const commands =
          await panelChannel.guild.commands.fetch();


        const oldCommand =
          commands.find(
            command =>
              command.name ===
              "ticketpanel"
          );


        if (oldCommand) {

          await oldCommand.delete();

          console.log(
            "✅ /ticketpanel נמחק"
          );

        }

      } catch (error) {

        console.log(
          "⚠️ לא הצלחתי לבדוק פקודות ישנות"
        );

      }


      // ====================================
      // מחפש פאנל קיים
      // ====================================

      const messages =
        await panelChannel.messages.fetch({
          limit: 100
        });


      const oldPanel =
        messages.find(message => {

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

        });


      if (oldPanel) {

        await oldPanel.edit({

          embeds: [
            createPanelEmbed()
          ],

          components: [
            createTicketMenu()
          ]

        });


        console.log(
          "✅ מערכת הטיקטים עודכנה"
        );

      } else {

        await panelChannel.send({

          embeds: [
            createPanelEmbed()
          ],

          components: [
            createTicketMenu()
          ]

        });


        console.log(
          "✅ מערכת הטיקטים נשלחה"
        );

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
// אינטראקציות
// ======================================================

client.on(
  "interactionCreate",
  async interaction => {


    // ==================================================
    // בחירה מהתפריט
    // ==================================================

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId ===
      "ticket_type"
    ) {

      const type =
        interaction.values[0];


      // ================================================
      // בחינה לצוות
      // ================================================

      if (type === "staff") {

        try {

          await interaction.message.edit({

            components: [
              createTicketMenu()
            ]

          });


          await interaction.showModal(
            createStaffApplicationModal()
          );


        } catch (error) {

          console.error(
            "❌ שגיאה בפתיחת הבחינה:",
            error
          );

        }


        return;
      }


      // ================================================
      // טיקט רגיל
      // ================================================

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


        // ==============================================
        // כבר יש טיקט?
        // ==============================================

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


        // ==============================================
        // בדיקת קטגוריה
        // ==============================================

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


        // ==============================================
        // יצירת החדר
        // ==============================================

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


        // ==============================================
        // הודעה בתוך הטיקט
        // ==============================================

        await channel.send({

          content:
            `${interaction.user} ${getStaffMentions()}`,

          embeds: [
            createTicketEmbed(
              type,
              interaction.user
            )
          ],

          allowedMentions: {

            users: [
              interaction.user.id
            ],

            roles:
              STAFF_ROLE_IDS

          }

        });


        // ==============================================
        // מאפס תפריט
        // ==============================================

        await interaction.message.edit({

          components: [
            createTicketMenu()
          ]

        });


        await interaction.editReply(
          `✅ הטיקט שלך נפתח בהצלחה: ${channel}`
        );


      } catch (error) {

        console.error(
          "❌ שגיאה בפתיחת טיקט:",
          error
        );


        try {

          await interaction.message.edit({

            components: [
              createTicketMenu()
            ]

          });

        } catch {}


        await interaction.editReply(
          "❌ הייתה בעיה בפתיחת הטיקט."
        );

      }


      return;
    }


    // ==================================================
    // שליחת בחינה לצוות
    // ==================================================

    if (
      interaction.isModalSubmit() &&
      interaction.customId ===
      "staff_application_modal"
    ) {

      await interaction.deferReply({
        ephemeral: true
      });


      try {

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


        // ==============================================
        // חדר הבחינות
        // ==============================================

        const applicationChannel =
          await client.channels.fetch(
            STAFF_APPLICATION_CHANNEL_ID
          );


        if (
          !applicationChannel ||
          !applicationChannel.isTextBased()
        ) {

          return interaction.editReply(
            "❌ הייתה בעיה בשליחת הטופס."
          );

        }


        // ==============================================
        // Embed
        // ==============================================

        const applicationEmbed =
          new EmbedBuilder()

            .setTitle(
              "🛡️ בקשה חדשה להצטרפות לצוות"
            )

            .setDescription(
              `בקשה חדשה התקבלה מ־${interaction.user}.`
            )

            .addFields(

              {
                name:
                  "👤 המשתמש ששלח את הבקשה",

                value:
                  `${interaction.user}\n` +
                  `ID: \`${interaction.user.id}\``
              },

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
              }

            )

            .setTimestamp();


        // ==============================================
        // כפתורים
        // ==============================================

        const approveButton =
          new ButtonBuilder()

            .setCustomId(
              `staff_approve_${interaction.user.id}`
            )

            .setLabel("לאשר")

            .setEmoji("✅")

            .setStyle(
              ButtonStyle.Success
            );


        const rejectButton =
          new ButtonBuilder()

            .setCustomId(
              `staff_reject_${interaction.user.id}`
            )

            .setLabel("לא לאשר")

            .setEmoji("❌")

            .setStyle(
              ButtonStyle.Danger
            );


        const buttons =
          new ActionRowBuilder()

            .addComponents(
              approveButton,
              rejectButton
            );


        // ==============================================
        // שולח לחדר הבחינות
        // ==============================================

        await applicationChannel.send({

          content:
            getStaffMentions(),

          embeds: [
            applicationEmbed
          ],

          components: [
            buttons
          ],

          allowedMentions: {
            roles:
              STAFF_ROLE_IDS
          }

        });


        // ==============================================
        // DM למשתמש
        // ==============================================

        const dmEmbed =
          new EmbedBuilder()

            .setTitle(
              "🛡️ הבקשה שלך התקבלה"
            )

            .setDescription(
              `שלום ${interaction.user.username} 👋\n\n` +

              "**הבקשה שלך להצטרפות לצוות התקבלה ונשלחה לבדיקה.**\n\n" +

              "צוות השרת יעבור על התשובות שלך ויבחן את הבקשה בצורה מסודרת.\n\n" +

              "אין צורך לשלוח את הטופס שוב או לפתוח פנייה נוספת בנוגע לבקשה בזמן ההמתנה.\n\n" +

              "**נענה לבקשה בהקדם האפשרי. תודה על ההתעניינות ובהצלחה! ✨**"
            );


        let dmSent = true;


        try {

          await interaction.user.send({

            embeds: [
              dmEmbed
            ]

          });

        } catch {

          dmSent = false;

        }


        if (dmSent) {

          await interaction.editReply(
            "✅ הטופס נשלח בהצלחה! שלחנו לך גם אישור בהודעה פרטית."
          );

        } else {

          await interaction.editReply(
            "✅ הטופס נשלח בהצלחה! לא הצלחתי לשלוח לך הודעה פרטית בגלל הגדרות הפרטיות שלך."
          );

        }


      } catch (error) {

        console.error(
          "❌ שגיאה בשליחת הבחינה:",
          error
        );


        await interaction.editReply(
          "❌ הייתה בעיה בשליחת הטופס. נסה שוב."
        );

      }


      return;
    }


    // ==================================================
    // אישור / דחייה
    // ==================================================

    if (
      interaction.isButton() &&
      (
        interaction.customId.startsWith(
          "staff_approve_"
        ) ||

        interaction.customId.startsWith(
          "staff_reject_"
        )
      )
    ) {

      try {

        const member =
          await interaction.guild.members.fetch(
            interaction.user.id
          );


        // ==============================================
        // רק אחד מחמשת הרולים / Admin
        // ==============================================

        if (!memberIsStaff(member)) {

          return interaction.reply({

            content:
              "❌ אין לך הרשאה לטפל בבקשה הזאת.",

            ephemeral: true

          });

        }


        const approved =
          interaction.customId.startsWith(
            "staff_approve_"
          );


        const applicantId =
          interaction.customId
            .replace(
              "staff_approve_",
              ""
            )
            .replace(
              "staff_reject_",
              ""
            );


        // ==============================================
        // מעדכן Embed
        // ==============================================

        const oldEmbed =
          interaction.message.embeds[0];


        const updatedEmbed =
          EmbedBuilder.from(
            oldEmbed
          );


        updatedEmbed.addFields({

          name:
            "📋 סטטוס הבקשה",

          value:
            approved
              ? `✅ **הבקשה אושרה**\nטופל על ידי ${interaction.user}`
              : `❌ **הבקשה לא אושרה**\nטופל על ידי ${interaction.user}`

        });


        // ==============================================
        // כפתור מושבת
        // ==============================================

        const handledButton =
          new ButtonBuilder()

            .setCustomId(
              `handled_${applicantId}`
            )

            .setLabel(
              `טופל על ידי ${member.displayName}`.slice(
                0,
                80
              )
            )

            .setEmoji("📋")

            .setStyle(
              ButtonStyle.Secondary
            )

            .setDisabled(true);


        const handledRow =
          new ActionRowBuilder()

            .addComponents(
              handledButton
            );


        // ==============================================
        // מוחק אשר/לא לאשר
        // ומחליף בכפתור טופל
        // ==============================================

        await interaction.update({

          embeds: [
            updatedEmbed
          ],

          components: [
            handledRow
          ]

        });


      } catch (error) {

        console.error(
          "❌ שגיאה בטיפול בבקשה:",
          error
        );


        if (
          !interaction.replied &&
          !interaction.deferred
        ) {

          await interaction.reply({

            content:
              "❌ הייתה בעיה בטיפול בבקשה.",

            ephemeral: true

          });

        }

      }


      return;
    }

  }
);


// ======================================================
// התחברות
// ======================================================

client.login(TOKEN);
