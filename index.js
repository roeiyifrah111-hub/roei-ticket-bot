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

// רול הצוות שיכול לראות את כל הטיקטים
const SUPPORT_ROLE_ID = "1555587941575696444";


// =========================
// פקודות
// =========================

const commands = [
  new SlashCommandBuilder()
    .setName("ticketpanel")
    .setDescription("שולח את מערכת הטיקטים")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageChannels
    )
].map(command => command.toJSON());


// =========================
// סוגי הטיקטים
// =========================

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
    emoji: "🛡️",
    channelName: "בחינה"
  }
};


// =========================
// יצירת התפריט
// =========================

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
        .setLabel("כללי")
        .setDescription("פתיחת פנייה כללית")
        .setEmoji("💬")
        .setValue("general"),

      new StringSelectMenuOptionBuilder()
        .setLabel("בחינה לצוות")
        .setDescription("פתיחת בחינה לצוות")
        .setEmoji("🛡️")
        .setValue("staff")
    );

  return new ActionRowBuilder().addComponents(menu);
}


// =========================
// כשהבוט עולה
// =========================

client.once("ready", async () => {
  console.log(`✅ הבוט מחובר בתור ${client.user.tag}`);

  try {
    const rest = new REST({
      version: "10"
    }).setToken(TOKEN);

    await rest.put(
      Routes.applicationGuildCommands(
        CLIENT_ID,
        GUILD_ID
      ),
      {
        body: commands
      }
    );

    console.log("✅ הפקודות נטענו בהצלחה");

  } catch (error) {
    console.error(
      "❌ שגיאה בטעינת הפקודות:",
      error
    );
  }
});


// =========================
// אינטראקציות
// =========================

client.on("interactionCreate", async interaction => {

  // =========================
  // /ticketpanel
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
        "3️⃣ 💬 **כללי**\n" +
        "4️⃣ 🛡️ **בחינה לצוות**\n\n" +

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
  // פתיחת טיקט מהתפריט
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

      const ticketType =
        ticketTypes[typeId];


      if (!ticketType) {
        return interaction.editReply(
          "❌ סוג הטיקט לא נמצא."
        );
      }


      // =========================
      // בדיקה אם כבר יש טיקט
      // =========================

      const existingTicket =
        interaction.guild.channels.cache.find(
          channel =>
            channel.topic?.includes(
              `ticket-owner:${interaction.user.id}`
            )
        );


      if (existingTicket) {

        // מאפס את התפריט
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
      // הרשאות
      // =========================

      const permissions = [

        // כולם לא רואים
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


        // צוות
        {
          id: SUPPORT_ROLE_ID,

          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks,
            PermissionFlagsBits.ManageMessages
          ]
        }

      ];


      // =========================
      // יצירת החדר
      // =========================

      const channelData = {
        name:
          `${ticketType.channelName}-${interaction.user.id.slice(-5)}`,

        type:
          ChannelType.GuildText,

        topic:
          `ticket-owner:${interaction.user.id}|type:${typeId}`,

        permissionOverwrites:
          permissions
      };


      // אם CATEGORY_ID קיים
      if (CATEGORY_ID) {
        channelData.parent =
          CATEGORY_ID;
      }


      const channel =
        await interaction.guild.channels.create(
          channelData
        );


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

            `הטיקט שלך נפתח בהצלחה.\n\n` +

            `**סוג הפנייה:** ${ticketType.name}\n\n` +

            "כתוב כאן את כל הפרטים וצוות השרת יענה לך בהקדם."
          );


      await channel.send({
        content:
          `${interaction.user} <@&${SUPPORT_ROLE_ID}>`,

        embeds: [
          ticketEmbed
        ],

        allowedMentions: {
          users: [
            interaction.user.id
          ],

          roles: [
            SUPPORT_ROLE_ID
          ]
        }
      });


      // =========================
      // מאפס את התפריט
      // =========================

      await interaction.message.edit({
        components: [
          createTicketMenu()
        ]
      });


      // =========================
      // הודעה למשתמש
      // =========================

      await interaction.editReply(
        `✅ הטיקט שלך נפתח בהצלחה: ${channel}`
      );


    } catch (error) {

      console.error(
        "❌ שגיאה בפתיחת טיקט:",
        error
      );


      // מנסה להחזיר את התפריט
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


// =========================
// התחברות
// =========================

client.login(TOKEN);
