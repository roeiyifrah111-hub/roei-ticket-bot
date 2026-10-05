const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const CONTROL_ROLE = '1555588615520653332';
const canControl = member => Boolean(member?.roles?.cache?.has(CONTROL_ROLE));

function createMusicControls({ client, runtime, guildId, channelId }) {
  const states = new Map();
  let sequence = 0;
  function start(player) {
    const state = { token: `${Date.now().toString(36)}-${++sequence}`, votes: new Set(), busy: false };
    states.set(player.guildId || guildId, state);
    const button = (action, label, style = ButtonStyle.Secondary) => new ButtonBuilder().setCustomId(`music:${state.token}:${action}`).setLabel(label).setStyle(style);
    return [new ActionRowBuilder().addComponents(button('pause', '⏯️ השהיה / המשך'), button('skip', '⏭️ דילוג'), button('stop', '⏹️ עצירה', ButtonStyle.Danger), button('queue', '📜 תור')),
      new ActionRowBuilder().addComponents(button('vote', '🗳️ הצבעה לדילוג', ButtonStyle.Primary))];
  }
  runtime.manager.on('queueEnd', () => states.delete(guildId));
  runtime.manager.on('playerDestroy', () => states.delete(guildId));

  async function handle(interaction) {
    const button = interaction.isButton?.() && interaction.customId?.startsWith('music:');
    const voteCommand = interaction.isChatInputCommand?.() && interaction.commandName === 'voteskip';
    if (!button && !voteCommand) return false;
    const reply = content => interaction.reply({ content, ephemeral: true, allowedMentions: { parse: [] } });
    try {
      if (interaction.guildId !== guildId || interaction.channelId !== channelId) { await reply('❌ הפעולה זמינה רק בצ׳אט של חדר המוזיקה.'); return true; }
      const member = await interaction.guild.members.fetch({ user: interaction.user.id, force: true });
      const action = voteCommand ? 'vote' : interaction.customId.split(':')[2];
      if (action !== 'vote' && !canControl(member)) { await reply(`❌ השליטה זמינה רק לבעלי הרול <@&${CONTROL_ROLE}>.`); return true; }
      if (member.voice?.channelId !== channelId) { await reply('❌ צריך להיות בחדר המוזיקה כדי להשתמש בפעולה הזאת.'); return true; }
      const player = runtime.manager.getPlayer(guildId);
      const state = states.get(guildId);
      if (!player?.queue.current || !state || (button && interaction.customId.split(':')[1] !== state.token)) { await reply('❌ השיר הסתיים או שהכפתור שייך לשיר קודם. השתמש בהודעה של השיר הנוכחי.'); return true; }
      if (state.busy) { await reply('⏳ פעולה כבר מתבצעת.'); return true; }
      state.busy = true;
      try {
        await interaction.deferReply({ ephemeral: true });
        if (states.get(guildId) !== state) { await interaction.editReply('❌ השיר כבר התחלף.'); return true; }
        let response;
        if (action === 'vote') {
          const listeners = member.voice.channel.members.filter(m => !m.user.bot);
          for (const id of state.votes) if (!listeners.has(id)) state.votes.delete(id);
          state.votes.add(member.id);
          const needed = Math.floor(listeners.size / 2) + 1;
          if (state.votes.size >= needed) {
            runtime.cancelPending(player);
            await player.skip(0, false);
            if (states.get(guildId) === state) states.delete(guildId);
            response = `⏭️ ההצבעה התקבלה (${state.votes.size}/${needed}) — השיר דולג.`;
          } else response = `🗳️ ההצבעה שלך נספרה: ${state.votes.size}/${needed}. לכל מאזין קול אחד.`;
        } else if (action === 'pause') {
          if (player.paused) { await player.resume(); response = '▶️ הניגון ממשיך.'; }
          else { await player.pause(); response = '⏸️ הניגון הושהה.'; }
        } else if (action === 'skip') {
          runtime.cancelPending(player); await player.skip(0, false); if (states.get(guildId) === state) states.delete(guildId); response = '⏭️ השיר דולג.';
        } else if (action === 'stop') {
          runtime.cancelPending(player); await player.stopPlaying(true, false); if (states.get(guildId) === state) states.delete(guildId); response = '⏹️ הניגון והתור נעצרו. הבוט נשאר בחדר.';
        } else if (action === 'queue') {
          response = player.queue.tracks.length ? player.queue.tracks.slice(0, 10).map((t, i) => `${i + 1}. ${t.info.title}`).join('\n').slice(0, 1900) : '📭 התור ריק.';
        } else response = '❌ פעולה לא מוכרת.';
        await interaction.editReply({ content: response, allowedMentions: { parse: [] } });
      } finally { state.busy = false; }
    } catch (error) {
      console.error('Music controls:', error.message);
      const content = '❌ הפעולה נכשלה. נסה שוב.';
      if (interaction.deferred || interaction.replied) await interaction.editReply({ content }).catch(() => {});
      else await reply(content).catch(() => {});
    }
    return true;
  }
  return { start, handle };
}
module.exports = { CONTROL_ROLE, canControl, createMusicControls };
