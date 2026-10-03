const {
  Client,
  GatewayIntentBits,
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

// החדר שבו מערכת הטיקטים תישלח אוטומטית
const PANEL_CHANNEL_ID = "1541390151757078599";

// הרול שרואה את כל הטיקטים
const SUPPORT_ROLE_ID = "1555587941575696444";

// אופציונלי - קטגוריית הטיקטים מ-Railway
const CATEGORY_ID = process.env.CATEGORY_ID;


// ========================================
// סוגי הטיקטים
// ========================================

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


// ========================================
// תפריט בחירת סוג טיקט
// ========================================

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
        .setDescription("פתיחת טיקט כללי")
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


// ========================================
// הודעת מערכת הטיקטים
// ========================================

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


// ========================================
// כשהבוט עולה
// ========================================

client.once("ready", async () => {
  console.log(`✅ הבוט מחובר בתור ${client.user.tag}`);

  try {

    const panelChannel =
      await client.channels.fetch(PANEL_CHANNEL_ID);

    if (!panelChannel || !panelChannel.isTextBased()) {
      console.log("❌ החדר של מערכת הטיקטים לא נמצא");
      return;
    }


    // ========================================
    // מוחק את פקודת /ticketpanel הישנה
    // ========================================

    try {

      const commands =
        await panelChannel.guild.commands.fetch();

      const oldCommand =
        commands.find(
          command => command.name === "ticketpanel"
        );

      if (oldCommand) {
        await oldCommand.delete();
        console.log("✅ הפקודה /ticketpanel נמחקה");
      }

    } catch (error) {
      console.log(
        "⚠️ לא הצלחתי למחוק את הפקודה הישנה:",
        error.message
      );
    }


    // ========================================
    // מחפש אם כבר קיימת מערכת טיקטים
    // ========================================

    const messages =
      await panelChannel.messages.fetch({
        limit: 100
      });

    const existingPanel =
      messages.find(message => {

        if (message.author.id !== client.user.id) {
          return false;
        }

        return message.components.some(row =>
          row.components.some(component =>
            component.customId === "ticket_type"
          )
        );
      });


    // אם כבר יש פאנל - מעדכן אותו
    if (existingPanel) {

      await existingPanel.edit({
        embeds: [
          createPanelEmbed()
        ],

        components: [
          createTicketMenu()
        ]
      });

      console.log(
        "✅ מערכת הטיקטים הקיימת עודכנה"
      );

    }

    // אם אין - שולח חדש
    else {

      await panelChannel.send({
        embeds: [
          createPanelEmbed()
        ],

        components: [
          createTicketMenu()
        ]
      });

      console.log(
        "✅ מערכת הטיקטים נשלחה אוטומטית"
      );

    }

  } catch (error) {

    console.error(
      "❌ שגיאה בהפעלת מערכת הטיקטים:",
      error
    );

  }
});


// ========================================
// לחיצה על סוג טיקט
// ========================================

client.on("interactionCreate", async interaction => {

  if (
    !interaction.isStringSelectMenu() ||
    interaction.customId !== "ticket_type"
  ) {
    return;
  }


  await interaction.deferReply({
    ephemeral: true
  });


  try {

    const guild = interaction.guild;

    const typeId =
      interaction.values[0];

    const ticketType =
      ticketTypes[typeId];


    if (!ticketType) {
      return interaction.editReply(
        "❌ סוג הטיקט לא נמצא."
      );
    }


    // ========================================
    // בודק שהרול קיים
    // ========================================

    const supportRole =
      await guild.roles
        .fetch(SUPPORT_ROLE_ID)
        .catch(() => null);


    if (!supportRole) {

      console.log(
        "❌ רול התמיכה לא נמצא:",
        SUPPORT_ROLE_ID
      );

      return interaction.editReply(
        "❌ לא מצאתי את רול צוות התמיכה."
      );
    }


    // ========================================
    // טוען את החדרים
    // ========================================

    await guild.channels.fetch();


    // ========================================
    // בודק אם כבר יש למשתמש טיקט
    // ========================================

    const existingTicket =
      guild.channels.cache.find(channel =>
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


    // ========================================
    // בודק את קטגוריית הטיקטים
    // ========================================

    let validCategoryId = null;

    if (CATEGORY_ID) {

      const category =
        await guild.channels
          .fetch(CATEGORY_ID)
          .catch(() => null);

      if (
        category &&
        category.type === ChannelType.GuildCategory
      ) {

        validCategoryId = category.id;

      } else {

        console.log(
          "⚠️ CATEGORY_ID לא תקין - הטיקט ייפתח בלי קטגוריה"
        );

      }
    }


    // ========================================
    // יוצר את החדר
    // ========================================

    const channelData = {

      name:
        `${ticketType.channelName}-${interaction.user.id.slice(-5)}`,

      type:
        ChannelType.GuildText,

      topic:
        `ticket-owner:${interaction.user.id}|type:${typeId}`,

      permissionOverwrites: [

        // כל השרת לא רואה
        {
          id: guild.id,

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
            PermissionFlagsBits.EmbedLinks,
            PermissionFlagsBits.ManageMessages
          ]
        },


        // הבוט עצמו
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

      ]

    };


    if (validCategoryId) {
      channelData.parent =
        validCategoryId;
    }


    const channel =
      await guild.channels.create(
        channelData
      );


    // ========================================
    // הודעה בתוך הטיקט
    // ========================================

    const ticketEmbed =
      new EmbedBuilder()

        .setTitle(
          `${ticketType.emoji} ${ticketType.name}`
        )

        .setDescription(
          `שלום ${interaction.user} 👋\n\n` +

          `**סוג הפנייה:** ${ticketType.name}\n\n` +

          "כתבו כאן את כל הפרטים וצוות השרת יענה לכם בהקדם."
        );


    await channel.send({

      content:
        `${interaction.user} <@&${SUPPORT_ROLE_ID}>`,

      embeds: [
        ticketEmbed
      ]

    });


    // ========================================
    // מחזיר את התפריט למצב הרגיל
    // ========================================

    await interaction.message.edit({

      components: [
        createTicketMenu()
      ]

    });


    // ========================================
    // מודיע שהטיקט נפתח
    // ========================================

    await interaction.editReply(
      `✅ הטיקט שלך נפתח: ${channel}`
    );


  } catch (error) {

    console.error(
      "❌ שגיאה מלאה בפתיחת טיקט:",
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
});


// ========================================
// התחברות
// ========================================

client.login(TOKEN);
