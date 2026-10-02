const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
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

client.once("ready", async () => {
  console.log(`✅ הבוט מחובר בתור ${client.user.tag}`);

  try {
    const rest = new REST({ version: "10" }).setToken(TOKEN);

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log("✅ פקודת /ticketpanel נוצרה");
  } catch (error) {
    console.error("❌ שגיאה ביצירת הפקודות:", error);
  }
});

client.on("interactionCreate", async interaction => {

  // /ticketpanel
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "ticketpanel") {

      const embed = new EmbedBuilder()
        .setTitle("🎫 תמיכה ועזרה")
        .setDescription(
          "צריכים עזרה?\nלחצו על הכפתור למטה כדי לפתוח טיקט פרטי עם צוות השרת."
        );

      const button = new ButtonBuilder()
        .setCustomId("open_ticket")
        .setLabel("פתח טיקט")
        .setEmoji("🎫")
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder().addComponents(button);

      await interaction.reply({
        embeds: [embed],
        components: [row]
      });
    }
  }

  // פתיחת טיקט
  if (interaction.isButton() && interaction.customId === "open_ticket") {

    const guild = interaction.guild;

    const existingTicket = guild.channels.cache.find(
      channel => channel.topic === `ticket-owner:${interaction.user.id}`
    );

    if (existingTicket) {
      return interaction.reply({
        content: `❌ כבר יש לך טיקט פתוח: ${existingTicket}`,
        ephemeral: true
      });
    }

    const channel = await guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: CATEGORY_ID || undefined,
      topic: `ticket-owner:${interaction.user.id}`,

      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionFlagsBits.ViewChannel]
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

    const closeButton = new ButtonBuilder()
      .setCustomId("close_ticket")
      .setLabel("סגור טיקט")
      .setEmoji("🔒")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(closeButton);

    const embed = new EmbedBuilder()
      .setTitle("🎫 טיקט תמיכה")
      .setDescription(
        `שלום ${interaction.user} 👋\n\nכתוב כאן במה אתה צריך עזרה וצוות השרת יענה לך בהקדם.`
      );

    await channel.send({
      content: `${interaction.user} <@&${SUPPORT_ROLE_ID}>`,
      embeds: [embed],
      components: [row]
    });

    await interaction.reply({
      content: `✅ הטיקט שלך נפתח: ${channel}`,
      ephemeral: true
    });
  }

  // סגירת טיקט
  if (interaction.isButton() && interaction.customId === "close_ticket") {

    if (!interaction.channel.topic?.startsWith("ticket-owner:")) {
      return;
    }

    await interaction.reply("🔒 הטיקט ייסגר בעוד 3 שניות...");

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
