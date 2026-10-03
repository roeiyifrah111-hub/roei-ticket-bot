const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  EmbedBuilder
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const CATEGORY_ID = process.env.CATEGORY_ID;

// הרול היחיד שיכול לראות את הטיקטים חוץ ממי שפתח אותם
const SUPPORT_ROLE_ID = "1555587941575696444";

const commands = [
  new SlashCommandBuilder()
    .setName("ticketpanel")
    .setDescription("שולח את מערכת הטיקטים")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
].map(command => command.toJSON());


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

  staff: {
    name: "בחינה לצוות",
    emoji: "🛡️",
    channelName: "בחינה"
  },

  general: {
    name: "כללי",
    emoji: "💬",
    channelName: "כללי"
  }

};


function createTicketMenu() {

  const menu = new StringSelectMenuBuilder()
    .setCustomId("ticket_type")
    .setPlaceholder("בחרו את סוג הפנייה שלכם")
    .addOptions(

      new StringSelectMenuOptionBuilder()
        .setLabel("דיווח על משתמש")
        .setDescription("פתיחת דיווח על משתמש")
        .setEmoji("🚨")
        .setValue("report"),

      new StringSelectMenuOptionBuilder()
        .setLabel("תמיכה טכנית")
        .setDescription("קבלת עזרה ותמיכה טכנית")
        .setEmoji("🛠️")
        .setValue("technical"),

      new StringSelectMenuOptionBuilder()
        .setLabel("בחינה לצוות")
        .setDescription("פתיחת בחינה להצטרפות לצוות")
        .setEmoji("🛡️")
        .setValue("staff"),

      new StringSelectMenuOptionBuilder()
        .setLabel("כללי")
        .setDescription("פתיחת טיקט כללי")
        .setEmoji("💬")
        .setValue("general")
    );

  return new ActionRowBuilder().addComponents(menu);
}


client.once("ready", async () => {

  console.log(`✅ הבוט מחובר בתור ${client.user.tag}`);

  try {

    const rest = new REST({ version: "10" }).setToken(TOKEN);

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      {
        body: commands
      }
    );

    console.log("✅ הפקודות נטענו");

  } catch (error) {

    console.error("❌ שגיאה בטעינת הפקודות:", error);

  }

});


client.on("interactionCreate", async interaction => {


  // =========================
  // שליחת פאנל הטיקטים
  // =========================

  if (
    interaction.isChatInputCommand() &&
    interaction.commandName === "ticketpanel"
  ) {

    const embed = new EmbedBuilder()

      .setTitle("מערכת טיקטים🎫")

      .setDescription(
        "**שלום לכולם! ✨**\n\n" +

        "**בחרו סוג פנייה**\n\n" +

        "1️⃣ 🚨 **דיווח על משתמש**\n" +
        "2️⃣ 🛠️ **תמיכה טכנית**\n" +
        "3️⃣ 🛡️ **בחינה לצוות**\n\n" +

        "**⚠️ פניות שלא קשורות יסגרו ישר, פתחו טיקט רק אם באמת צריך**"
      );


    await interaction.reply({

      embeds: [embed],

      components: [
        createTicketMenu()
      ]

    });

    return;
  }



  // =========================
  // בחירת סוג טיקט
  // =========================

  if (
    interaction.isStringSelectMenu() &&
    interaction.customId === "ticket_type"
  ) {

    await interaction.deferReply({
      ephemeral: true
    });


    try {

      const typeId = interaction.values[0];

      const ticketType = ticketTypes[typeId];


      if (!ticketType) {

        return interaction.editReply(
          "❌ סוג הטיקט לא נמצא."
        );

      }


      // אם כבר יש למשתמש טיקט
      const existingTicket =
        interaction.guild.channels.cache.find(
          channel =>
            channel.topic?.startsWith(
              `ticket-owner:${interaction.user.id}`
            )
        );


      if (existingTicket) {

        // מחזיר את התפריט למצב הרגיל
        await interaction.message.edit({
          components: [
            createTicketMenu()
          ]
        });

        return interaction.editReply(
          `❌ כבר יש לך טיקט פתוח: ${existingTicket}`
        );

      }


      // =========================
      // יצירת הטיקט
      // =========================

      const channel =
        await interaction.guild.channels.create({

          name:
            `${ticketType.channelName}-${interaction.user.username}`,

          type:
            ChannelType.GuildText,

          parent:
            CATEGORY_ID || undefined,

          topic:
            `ticket-owner:${interaction.user.id}|type:${typeId}`,

          permissionOverwrites: [

            // אף אחד בשרת לא רואה
            {
              id: interaction.guild.id,

              deny: [
                PermissionFlagsBits.ViewChannel
              ]
            },


            // מי שפתח את הטיקט
            {
              id: interaction.user.id,

              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.EmbedLinks
              ]
            },


            // צוות התמיכה
            {
              id: SUPPORT_ROLE_ID,

              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.EmbedLinks
              ]
            }

          ]

        });



      // =========================
      // הודעה בתוך הטיקט
      // =========================

      const ticketEmbed =
        new EmbedBuilder()

          .setTitle(
            `${ticketType.emoji} ${ticketType.name}`
          )

          .setDescription(
            `שלום ${interaction.user} 👋\n\n` +
            `הטיקט שלך נפתח בהצלחה.\n` +
            `סוג הפנייה: **${ticketType.name}**\n\n` +
            `כתוב כאן את כל הפרטים וצוות השרת יעזור לך.`
          );


      await channel.send({

        content:
          `${interaction.user} <@&${SUPPORT_ROLE_ID}>`,

        embeds: [
          ticketEmbed
        ]

      });



      // מחזיר את התפריט ל"בחרו את סוג הפנייה"
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

  }

});


client.login(TOKEN);
