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
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const CATEGORY_ID = process.env.CATEGORY_ID;
const SUPPORT_ROLE_ID = process.env.SUPPORT_ROLE_ID;

const commands = [
  new SlashCommandBuilder()
    .setName("ticketpanel")
    .setDescription("שולח את פאנל פתיחת הטיקטים")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
].map(command => command.toJSON());

const ticketTypes = {
  technical: {
    name: "תמיכה טכנית",
    emoji: "🛠️",
    channelName: "technical"
  },

  report: {
    name: "דיווח על שחקן",
    emoji: "🚨",
    channelName: "report"
  },

  staff: {
    name: "בחינות לצוות",
    emoji: "🛡️",
    channelName: "staff"
  },

  general: {
    name: "כללי",
    emoji: "💬",
    channelName: "general"
  }
};

client.once("ready", async () => {
  console.log(`✅ הבוט מחובר בתור ${client.user.tag}`);

  try {
    const rest = new REST({ version: "10" }).setToken(TOKEN);

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log("✅ הפקודות נטענו בהצלחה");
  } catch (error) {
    console.error("❌ שגיאה בטעינת הפקודות:", error);
  }
});

client.on("interactionCreate", async interaction => {

  // =========================
  // /ticketpanel
  // =========================

  if (
    interaction.isChatInputCommand() &&
    interaction.commandName === "ticketpanel"
  ) {

    const embed = new EmbedBuilder()
      .setTitle("🎫 פתיחת טיקט")
      .setDescription(
        "צריכים עזרה?\n\nבחרו את סוג הפנייה שלכם בתפריט למטה."
      );

    const menu = new StringSelectMenuBuilder()
      .setCustomId("ticket_type")
      .setPlaceholder("בחרו את סוג הפנייה שלכם")
      .addOptions(

        new StringSelectMenuOptionBuilder()
          .setLabel("תמיכה טכנית")
          .setDescription("קבלת עזרה ותמיכה טכנית")
          .setEmoji("🛠️")
          .setValue("technical"),

        new StringSelectMenuOptionBuilder()
          .setLabel("דיווח על שחקן")
          .setDescription("פתיחת טיקט לדיווח על משתמש")
          .setEmoji("🚨")
          .setValue("report"),

        new StringSelectMenuOptionBuilder()
          .setLabel("בחינות לצוות")
          .setDescription("הגשת בקשה להצטרפות לצוות")
          .setEmoji("🛡️")
          .setValue("staff"),

        new StringSelectMenuOptionBuilder()
          .setLabel("כללי")
          .setDescription("פתיחת פנייה כללית")
          .setEmoji("💬")
          .setValue("general")
      );

    const row = new ActionRowBuilder().addComponents(menu);

    await interaction.reply({
      embeds: [embed],
      components: [row]
    });

    return;
  }

  // =========================
  // בחירת סוג הטיקט
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

      // בדיקה אם כבר קיים טיקט
      const existingTicket =
        interaction.guild.channels.cache.find(channel =>
          channel.topic?.startsWith(
            `ticket-owner:${interaction.user.id}`
          )
        );

      if (existingTicket) {
        return interaction.editReply(
          `❌ כבר יש לך טיקט פתוח: ${existingTicket}`
        );
      }

      // יצירת הטיקט
      const channel =
        await interaction.guild.channels.create({

          name:
            `${ticketType.channelName}-${interaction.user.id.slice(-5)}`,

          type: ChannelType.GuildText,

          parent: CATEGORY_ID,

          topic:
            `ticket-owner:${interaction.user.id}|type:${typeId}`,

          permissionOverwrites: [

            {
              id: interaction.guild.id,
              deny: [
                PermissionFlagsBits.ViewChannel
              ]
            },

            {
              id: interaction.user.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory
              ]
            },

            {
              id: SUPPORT_ROLE_ID,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory
              ]
            }

          ]

        });

      const closeButton =
        new ButtonBuilder()
          .setCustomId("close_ticket")
          .setLabel("סגור טיקט")
          .setEmoji("🔒")
          .setStyle(ButtonStyle.Danger);

      const closeRow =
        new ActionRowBuilder()
          .addComponents(closeButton);

      const ticketEmbed =
        new EmbedBuilder()
          .setTitle(
            `${ticketType.emoji} ${ticketType.name}`
          )
          .setDescription(
            `שלום ${interaction.user} 👋\n\n` +
            `פתחת טיקט מסוג **${ticketType.name}**.\n\n` +
            `כתוב כאן את כל הפרטים וצוות השרת יענה לך בהקדם.`
          );

      await channel.send({
        content:
          `${interaction.user} <@&${SUPPORT_ROLE_ID}>`,
        embeds: [ticketEmbed],
        components: [closeRow]
      });

      await interaction.editReply(
        `✅ הטיקט נפתח בהצלחה: ${channel}`
      );

    } catch (error) {

      console.error(
        "❌ שגיאה ביצירת טיקט:",
        error
      );

      await interaction.editReply(
        "❌ הייתה בעיה בפתיחת הטיקט. בדוק את ה־CATEGORY_ID וה־SUPPORT_ROLE_ID ב־Railway."
      );

    }

    return;
  }

  // =========================
  // סגירת הטיקט
  // =========================

  if (
    interaction.isButton() &&
    interaction.customId === "close_ticket"
  ) {

    if (
      !interaction.channel.topic?.startsWith(
        "ticket-owner:"
      )
    ) return;

    await interaction.reply(
      "🔒 הטיקט ייסגר בעוד 3 שניות..."
    );

    setTimeout(async () => {

      try {
        await interaction.channel.delete();
      } catch (error) {
        console.error(error);
      }

    }, 3000);
  }

});

client.login(TOKEN);
