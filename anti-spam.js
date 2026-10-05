const { PermissionFlagsBits, Events, AutoModerationRuleTriggerType, AutoModerationRuleEventType, AutoModerationActionType } = require('discord.js');

function createSpamDetector({ now = Date.now } = {}) {
  const users = new Map();
  function inspect(message) {
    const time = now();
    const key = `${message.guildId}:${message.author.id}`;
    let state = users.get(key);
    if (!state) { state = { entries: [], cooldown: 0, last: time }; users.set(key, state); }
    state.last = time;
    state.entries = state.entries.filter(entry => time - entry.time < 7000);
    if (state.entries.some(entry => entry.message.id === message.id)) return null;
    state.entries.push({ time, message });
    if (time < state.cooldown) return null;
    const mentions = (message.mentions?.users?.size || 0) + (message.mentions?.roles?.size || 0);
    if (state.entries.length < 6 && mentions < 6 && !message.mentions?.everyone) return null;
    const messages = mentions >= 6 || message.mentions?.everyone ? [message] : state.entries.map(entry => entry.message);
    state.entries = [];
    state.cooldown = time + 60000;
    return { messages, reason: mentions >= 6 || message.mentions?.everyone ? 'הצפת אזכורים' : '6 הודעות בתוך 7 שניות' };
  }
  function prune() { const time = now(); for (const [key, state] of users) if (time - state.last > 60000) users.delete(key); }
  return { inspect, prune };
}

async function configureAutoMod(guild) {
  const me = guild.members.me || await guild.members.fetchMe();
  if (!me.permissions.has(PermissionFlagsBits.ManageGuild)) {
    console.error('Anti-spam AutoMod unavailable: missing ManageGuild permission'); return;
  }
  const rules = await guild.autoModerationRules.fetch();
  const definitions = [
    { name: 'Roei — Spam protection', triggerType: AutoModerationRuleTriggerType.Spam, actions: [{ type: AutoModerationActionType.BlockMessage, metadata: { customMessage: 'ההודעה נחסמה כי זוהתה כספאם.' } }] },
    { name: 'Roei — Mention protection', triggerType: AutoModerationRuleTriggerType.MentionSpam, triggerMetadata: { mentionTotalLimit: 5, mentionRaidProtectionEnabled: true }, actions: [{ type: AutoModerationActionType.BlockMessage, metadata: { customMessage: 'אפשר להזכיר עד 5 משתמשים או רולים בהודעה.' } }, ...(me.permissions.has(PermissionFlagsBits.ModerateMembers) ? [{ type: AutoModerationActionType.Timeout, metadata: { durationSeconds: 60 } }] : [])] }
  ];
  for (const definition of definitions) {
    const existing = rules.find(rule => rule.triggerType === definition.triggerType);
    if (existing) { console.log(`Anti-spam AutoMod existing: ${existing.name}, enabled=${existing.enabled}`); continue; }
    await guild.autoModerationRules.create({ ...definition, eventType: AutoModerationRuleEventType.MessageSend, enabled: true, reason: 'Owner requested spam and mention protection' });
    console.log(`Anti-spam AutoMod enabled: ${definition.name}`);
  }
}

function installAntiSpam(client, { guildId }) {
  const detector = createSpamDetector();
  const timer = setInterval(detector.prune, 60000); timer.unref?.();
  client.once(Events.ClientReady, async () => {
    try {
      const guild = await client.guilds.fetch(guildId);
      await configureAutoMod(guild);
      const me = guild.members.me;
      console.log(`Anti-spam ready: delete=${me.permissions.has(PermissionFlagsBits.ManageMessages)}, timeout=${me.permissions.has(PermissionFlagsBits.ModerateMembers)}`);
    } catch (error) { console.error('Anti-spam setup:', error.message); }
  });
  client.on(Events.MessageCreate, async message => {
    if (message.guildId !== guildId || message.author.bot || message.webhookId) return;
    try {
      const member = message.member || await message.guild.members.fetch(message.author.id);
      if (member.id === message.guild.ownerId || member.permissions.has(PermissionFlagsBits.ManageMessages) || member.permissions.has(PermissionFlagsBits.Administrator)) return;
      const incident = detector.inspect(message);
      if (!incident) return;
      const deletions = await Promise.allSettled(incident.messages.map(item => item.deletable ? item.delete() : Promise.reject(new Error('Missing permission to delete spam'))));
      let timedOut = false;
      if (member.moderatable && (member.communicationDisabledUntilTimestamp || 0) < Date.now() + 60000) {
        await member.timeout(60000, `Anti-spam: ${incident.reason}`); timedOut = true;
      }
      console.log(`Anti-spam incident: deleted=${deletions.filter(r => r.status === 'fulfilled').length}/${incident.messages.length}, timeout=${timedOut}`);
    } catch (error) { console.error('Anti-spam moderation:', error.message); }
  });
}
module.exports = { createSpamDetector, configureAutoMod, installAntiSpam };
