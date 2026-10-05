const { randomUUID } = require('node:crypto');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

function createSongVotes({ runtime, guildId, channelId, now = Date.now, ttl = 120000 }) {
  const proposals = new Map();
  const pending = new Set();
  const cooldowns = new Map();
  function finish(proposal) {
    proposal.closed = true;
    clearTimeout(proposal.timer);
    proposals.delete(proposal.id);
    pending.delete(proposal.owner);
  }
  function view(proposal, status) {
    return {
      embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle('🗳️ להוסיף את השיר לתור?').setDescription(proposal.track.info.title.slice(0, 1000)).addFields({ name: 'הצבעות', value: `✅ ${proposal.yes.size} בעד · ❌ ${proposal.no.size} נגד\n${status || 'דרוש רוב של המאזינים בחדר. ההצבעה פתוחה לשתי דקות.'}` })],
      components: proposal.closed ? [] : [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`songvote:${proposal.id}:yes`).setLabel('✅ בעד').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`songvote:${proposal.id}:no`).setLabel('❌ נגד').setStyle(ButtonStyle.Danger))],
      allowedMentions: { parse: [] }
    };
  }
  async function render(proposal, status) {
    await proposal.interaction.editReply(view(proposal, status)).catch(error => console.error('Music song vote message:', error.message));
  }
  async function handle(interaction) {
    const command = interaction.isChatInputCommand?.() && interaction.commandName === 'votesong';
    const button = interaction.isButton?.() && interaction.customId?.startsWith('songvote:');
    if (!command && !button) return false;
    const reply = content => interaction.reply({ content, ephemeral: true, allowedMentions: { parse: [] } });
    try {
      if (interaction.guildId !== guildId || interaction.channelId !== channelId) { await reply('❌ הצבעות שירים זמינות בצ׳אט של חדר המוזיקה.'); return true; }
      const member = await interaction.guild.members.fetch({ user: interaction.user.id, force: true });
      if (member.voice?.channelId !== channelId) { await reply('❌ צריך להיות בחדר המוזיקה כדי להציע שיר או להצביע.'); return true; }
      if (command) {
        const userId = interaction.user.id;
        for (const [id, time] of cooldowns) if (now() - time >= 30000) cooldowns.delete(id);
        if (pending.has(userId) || cooldowns.has(userId) || pending.size >= 10) { await reply('⏳ אפשר הצעה פעילה אחת לכל משתמש, ועד הצעה אחת בכל 30 שניות. נסה שוב מעט מאוחר יותר.'); return true; }
        pending.add(userId); cooldowns.set(userId, now());
        let proposal;
        try {
          await interaction.deferReply();
          const result = await runtime.resolve(interaction.options.getString('query', true), interaction.user);
          proposal = { id: randomUUID(), owner: userId, interaction, track: result.track, yes: new Set(), no: new Set(), expires: now() + ttl, closed: false, busy: false };
          proposals.set(proposal.id, proposal);
          await interaction.editReply(view(proposal));
          proposal.timer = setTimeout(() => {
            if (!proposal.closed) { finish(proposal); void render(proposal, '⌛ זמן ההצבעה הסתיים. השיר לא נוסף.'); }
          }, ttl); proposal.timer.unref?.();
        } catch (error) {
          if (proposal) finish(proposal); else pending.delete(userId);
          throw error;
        }
        return true;
      }
      const [, id, choice] = interaction.customId.split(':');
      const proposal = proposals.get(id);
      if (!proposal || proposal.closed || proposal.expires <= now() || !['yes', 'no'].includes(choice)) { await reply('⌛ ההצבעה הסתיימה או כבר אינה פעילה.'); return true; }
      if (proposal.busy) { await reply('⏳ ההצבעה מתעדכנת, נסה שוב.'); return true; }
      proposal.busy = true;
      try {
        await interaction.deferReply({ ephemeral: true });
        if (proposal.closed || proposal.expires <= now()) { await interaction.editReply('⌛ ההצבעה הסתיימה.'); return true; }
        const listeners = member.voice.channel.members.filter(m => !m.user.bot);
        for (const votes of [proposal.yes, proposal.no]) for (const voter of votes) if (!listeners.has(voter)) votes.delete(voter);
        proposal.yes.delete(member.id); proposal.no.delete(member.id);
        proposal[choice].add(member.id);
        const needed = Math.floor(listeners.size / 2) + 1;
        if (proposal.yes.size >= needed) {
          finish(proposal);
          try {
            await runtime.play(proposal.track);
            await render(proposal, '✅ ההצבעה התקבלה והשיר נוסף לתור.');
          } catch (error) {
            const reason = error.message === 'MUSIC_QUEUE_LIMIT' ? 'למציע כבר יש 5 שירים ממתינים.' : error.message === 'MUSIC_DUPLICATE_TRACK' ? 'השיר כבר בתור או מתנגן.' : 'לא ניתן להוסיף את השיר כרגע.';
            await render(proposal, `❌ ${reason}`);
          }
        } else if (proposal.no.size >= needed) { finish(proposal); await render(proposal, '❌ ההצעה נדחתה. השיר לא נוסף.'); }
        else await render(proposal, `דרושים ${needed} קולות בעד. אפשר לשנות הצבעה, אך לכל מאזין קול אחד.`);
        await interaction.editReply('🗳️ ההצבעה שלך נספרה.');
      } finally { proposal.busy = false; }
    } catch (error) {
      console.error('Music song vote:', error.message);
      const content = '❌ לא הצלחתי להשלים את ההצבעה או למצוא את השיר. נסה שם שיר אחר.';
      if (interaction.deferred || interaction.replied) await interaction.editReply({ content, embeds: [], components: [] }).catch(() => {});
      else await reply(content).catch(() => {});
    }
    return true;
  }
  return { handle };
}
module.exports = { createSongVotes };
