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
// IDs
// ======================================================

const PANEL_CHANNEL_ID = "1541390151757078599";

const STAFF_APPLICATION_CHANNEL_ID = "1541391169936687195";

const STAFF_ROLE_IDS = [
  "1555587941575696444",
  "1541371707011629077",
  "1555588725398839376",
  "1555588615520653332",
  "1555588224636821526"
];

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
// תפריט הטיקטים
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
// הפאנל הראשי
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
// כפתור סגירת טיקט
// ======================================================

function createCloseTicketButton() {

  const closeButton = new ButtonBuilder()

    .setCustomId("close_ticket")

    .setLabel("סגור טיקט")

    .setEmoji("🔒")

    .setStyle(ButtonStyle.Danger);


  return new ActionRowBuilder()
    .addComponents(closeButton);
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

        "כדי שנוכל לבדוק את המקרה, כתבו:\n\n" +

        "👤 **על מי הדיווח?**\n" +
        "שם משתמש או ID.\n\n" +

        "📝 **מה קרה?**\n" +
        "תארו את המקרה בצורה ברורה.\n\n" +

        "📸 **הוכחות**\n" +
        "צרפו תמונות או סרטונים אם יש.\n\n" +

        "🕒 **מתי זה קרה?**\n" +
        "כתבו זמן משוער אם אתם זוכרים.\n\n" +

        "**צוות השרת יטפל בדיווח בהקדם.**"
      );

  }


  if (type === "technical") {

    return new EmbedBuilder()

      .setTitle("🛠️ תמיכה טכנית")

      .setDescription(
        `שלום ${user} 👋\n\n` +

        "**נשמח לעזור לכם לפתור את הבעיה.**\n\n" +

        "כתבו בבקשה:\n\n" +

        "🔧 **מה הבעיה?**\n" +
        "📱 **איפה הבעיה מתרחשת?**\n" +
        "📸 **צילום מסך / סרטון אם יש**\n" +
        "✅ **מה כבר ניסיתם לעשות?**\n\n" +

        "**אחד מאנשי הצוות יענה לכם בהקדם.**"
      );

  }


  return new EmbedBuilder()

    .setTitle("💬 פנייה כללית")

    .setDescription(
      `שלום ${user} 👋\n\n` +

      "**פתחתם פנייה כללית לצוות.**\n\n" +

      "כתבו כאן במה אתם צריכים עזרה והוסיפו כמה שיותר פרטים.\n\n" +

      "**צוות השרת יענה לכם בהקדם.**"
    );
}


// ======================================================
// הרשאות לטיקט
// ======================================================

function createTicketPermissions(guild, userId) {

  const permissions = [

    {
      id: guild.id,

      deny: [
        PermissionFlagsBits.ViewChannel
      ]
    },

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


  for (const roleId of STAFF_ROLE_IDS) {

    permissions.push({

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


  return permissions;
}


// ======================================================
// פינג לרולים
// ======================================================

function getStaffMentions() {

  return STAFF_ROLE_IDS
    .map(roleId => `<@&${roleId}>`)
    .join(" ");
}


// ======================================================
// טופס בחינה
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

    .setRequired(true);


  const situationInput = new TextInputBuilder()

    .setCustomId("situation")

    .setLabel("אם שני אנשים רבים ומקללים, מה תעשה?")

    .setPlaceholder("אני הייתי...")

    .setStyle(TextInputStyle.Paragraph)

    .setRequired(true);


  const nameInput = new TextInputBuilder()

    .setCustomId("name")

    .setLabel("איך קוראים לך?")

    .setPlaceholder("קוראים לי...")

    .setStyle(TextInputStyle.Short)

    .setRequired(true);


  const experienceInput = new TextInputBuilder()

    .setCustomId("experience")

    .setLabel("יש לך ניסיון בניהול?")

    .setPlaceholder("כן, יש לי... / לא, אין לי...")

    .setStyle(TextInputStyle.Paragraph)

    .setRequired(true);


  const notesInput = new TextInputBuilder()

    .setCustomId("notes")

    .setLabel("הערות")

    .setPlaceholder("משהו נוסף שתרצו לספר לנו...")

    .setStyle(TextInputStyle.Paragraph)

    .setRequired(false);


  modal.addComponents(

    new ActionRowBuilder().addComponents(ageInput),

    new ActionRowBuilder().addComponents(situationInput),

    new ActionRowBuilder().addComponents(nameInput),

    new ActionRowBuilder().addComponents(experienceInput),

    new ActionRowBuilder().addComponents(notesInput)

  );


  return modal;
}


// ======================================================
// כשהבוט עולה
// ======================================================

client.once("ready", async () => {

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
        "❌ חדר הפאנל לא נמצא"
      );

      return;
    }


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

});


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


      // =================================================
      // בחינה לצוות
      // =================================================

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
            "❌ שגיאה בפתיחת הטופס:",
            error
          );

        }


        return;
      }


      // =================================================
      // טיקט רגיל
      // =================================================

      await interaction.deferReply({
        ephemeral: true
      });


      try {

        const guild =
          interaction.guild;

        const ticketType =
          ticketTypes[type];


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
            createCloseTicketButton()
          ],

          allowedMentions: {

            users: [
              interaction.user.id
            ],

            roles:
              STAFF_ROLE_IDS

          }

        });


        await interaction.message.edit({

          components: [
            createTicketMenu()
          ]

        });


        await interaction.editReply(
          `✅ הטיקט שלך נפתח: ${channel}`
        );


      } catch (error) {

        console.error(
          "❌ שגיאה בפתיחת טיקט:",
          error
        );


        await interaction.editReply(
          "❌ הייתה בעיה בפתיחת הטיקט."
        );

      }


      return;
    }


    // ==================================================
    // כפתור סגור טיקט
    // ==================================================

    if (
      interaction.isButton() &&
      interaction.customId ===
      "close_ticket"
    ) {

      try {

        const member =
          await interaction.guild.members.fetch(
            interaction.user.id
          );


        if (!memberIsStaff(member)) {

          return interaction.reply({

            content:
              "❌ רק צוות השרת יכול לסגור טיקט.",

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
          "🔒 הטיקט ייסגר בעוד 3 שניות..."
        );


        setTimeout(async () => {

          try {

            await interaction.channel.delete();

          } catch (error) {

            console.error(
              "❌ לא הצלחתי למחוק טיקט:",
              error
            );

          }

        }, 3000);


      } catch (error) {

        console.error(
          "❌ שגיאה בסגירת טיקט:",
          error
        );

      }


      return;
    }


    // ==================================================
    // שליחת טופס בחינה
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
            .getTextInputValue("age");

        const situation =
          interaction.fields
            .getTextInputValue("situation");

        const name =
          interaction.fields
            .getTextInputValue("name");

        const experience =
          interaction.fields
            .getTextInputValue("experience");

        const notes =
          interaction.fields
            .getTextInputValue("notes") ||
          "לא נכתבו הערות";


        const applicationChannel =
          await client.channels.fetch(
            STAFF_APPLICATION_CHANNEL_ID
          );


        const applicationEmbed =
          new EmbedBuilder()

            .setTitle(
              "🛡️ בקשה חדשה לצוות"
            )

            .setDescription(
              `${interaction.user} שלח/ה בקשה להצטרפות לצוות.`
            )

            .addFields(

              {
                name: "🎂 גיל",
                value: age
              },

              {
                name: "⚠️ שני אנשים רבים ומקללים",
                value: situation
              },

              {
                name: "📛 שם",
                value: name
              },

              {
                name: "🛡️ ניסיון בניהול",
                value: experience
              },

              {
                name: "📝 הערות",
                value: notes
              }

            )

            .setFooter({
              text:
                `User ID: ${interaction.user.id}`
            })

            .setTimestamp();


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


        await applicationChannel.send({

          embeds: [
            applicationEmbed
          ],

          components: [

            new ActionRowBuilder()
              .addComponents(
                approveButton,
                rejectButton
              )

          ]

        });


        // =================================================
        // DM ראשוני - קצר וברור
        // =================================================

        const dmEmbed =
          new EmbedBuilder()

            .setTitle(
              "🛡️ הבקשה שלך בבדיקה"
            )

            .setDescription(
              "**הבקשה שלך להצטרפות לצוות התקבלה! ✅**\n\n" +

              "⏳ **סטטוס: בבדיקה**\n\n" +

              "צוות השרת יעבור על התשובות שלך.\n" +
              "כשתתקבל החלטה, תקבל/י ממני הודעה פרטית כאן."
            );


        try {

          await interaction.user.send({
            embeds: [
              dmEmbed
            ]
          });

        } catch {}


        await interaction.editReply(
          "✅ הבקשה נשלחה! היא נמצאת עכשיו בבדיקה."
        );


      } catch (error) {

        console.error(
          "❌ שגיאה בשליחת טופס:",
          error
        );


        await interaction.editReply(
          "❌ הייתה בעיה בשליחת הבקשה."
        );

      }


      return;
    }


    // ==================================================
    // אישור / דחיית בקשה
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


        // =================================================
        // שולח תשובה בפרטי למועמד
        // =================================================

        const applicant =
          await client.users
            .fetch(applicantId)
            .catch(() => null);


        if (applicant) {

          try {

            if (approved) {

              const acceptedEmbed =
                new EmbedBuilder()

                  .setTitle(
                    "✅ התקבלת לצוות!"
                  )

                  .setDescription(
                    "**שמחים לעדכן שהבקשה שלך להצטרפות לצוות אושרה! 🎉**\n\n" +

                    "אחד מאנשי הצוות ייצור איתך קשר בהמשך במידת הצורך.\n\n" +

                    "**בהצלחה בתפקיד! 🛡️**"
                  );


              await applicant.send({
                embeds: [
                  acceptedEmbed
                ]
              });

            } else {

              const rejectedEmbed =
                new EmbedBuilder()

                  .setTitle(
                    "❌ עדכון לגבי הבקשה שלך"
                  )

                  .setDescription(
                    "**הבקשה שלך להצטרפות לצוות נבדקה, אך הפעם היא לא אושרה.**\n\n" +

                    "תודה שהקדשת זמן למילוי הטופס ולהגשת הבקשה. 💙"
                  );


              await applicant.send({
                embeds: [
                  rejectedEmbed
                ]
              });

            }

          } catch {

            console.log(
              "⚠️ לא ניתן לשלוח DM למועמד"
            );

          }

        }


        // =================================================
        // משנה את ההודעה בחדר הצוות
        // =================================================

        const updatedEmbed =
          EmbedBuilder.from(
            interaction.message.embeds[0]
          );


        updatedEmbed.addFields({

          name:
            "📋 סטטוס",

          value:
            approved
              ? `✅ **אושר** על ידי ${interaction.user}`
              : `❌ **לא אושר** על ידי ${interaction.user}`

        });


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


        await interaction.update({

          embeds: [
            updatedEmbed
          ],

          components: [

            new ActionRowBuilder()
              .addComponents(
                handledButton
              )

          ]

        });


      } catch (error) {

        console.error(
          "❌ שגיאה בטיפול בבקשה:",
          error
        );

      }


      return;
    }

  }
);


// ======================================================
// התחברות
// ======================================================

client.login(TOKEN);
