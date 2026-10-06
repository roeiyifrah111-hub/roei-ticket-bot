'use strict';
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { randomUUID, randomInt } = require('node:crypto');
const { mkdirSync } = require('node:fs');
const { join } = require('node:path');
const { CoinsStore, CoinsError, RANKS, LIMIT } = require('./coins-store');
const CHANNEL_ID = '1556736219038093484';
const DROP_CHANNEL_ID = '1555552614878412940';
const OWNER_ID = '1243097719262941224';
const fmt = n => n.toLocaleString('en-US');
const label = rank => `${rank.badge} ${rank.name}`;
const baseEmbed = title => new EmbedBuilder().setColor(0xf5bc42).setTitle(title);
const button = (id, text, style = ButtonStyle.Secondary) => new ButtonBuilder().setCustomId(id).setLabel(text).setStyle(style);
const commands = ['balance', 'daily', 'pay', 'coinleaderboard', 'addcoins', 'removecoins', 'setcoins', 'rankshop', 'rankhistory', 'drop'].map(name => {
  const descriptions = { drop: 'צוות: יצירת דרופ ידני', balance: 'היתרה שלך או של חבר', daily: 'פרס יומי — פעם ב־24 שעות', pay: 'העברת Roei Coins לחבר', coinleaderboard: 'עשרת המובילים והמיקום האישי שלך', addcoins: 'ניהול: הוספת מטבעות', removecoins: 'ניהול: הסרת מטבעות', setcoins: 'ניהול: הגדרת יתרה', rankshop: 'הדרגה שלך וההתקדמות לדרגה הבאה', rankhistory: 'היסטוריית הדרגות וההישגים שלך' };
  const cmd = new SlashCommandBuilder().setName(name).setDescription(descriptions[name]);
  if (['balance', 'pay', 'addcoins', 'removecoins', 'setcoins'].includes(name)) cmd.addUserOption(o => o.setName('user').setDescription('משתמש').setRequired(name !== 'balance'));
  if (['pay', 'addcoins', 'removecoins', 'setcoins'].includes(name)) cmd.addIntegerOption(o => o.setName('amount').setDescription('כמות Roei Coins').setMinValue(name === 'setcoins' ? 0 : 1).setMaxValue(LIMIT).setRequired(true));
  if (name === 'drop') cmd.addStringOption(o => o.setName('type').setDescription('סוג הדרופ (ברירת מחדל Common)').addChoices(...['Common', 'Rare', 'Epic', 'Legendary', 'Golden'].map(name => ({ name, value: name }))));
  return cmd;
});
function rankEmbed(user) {
  const current = RANKS[user.currentRank], next = RANKS[user.currentRank + 1];
  const embed = baseEmbed('👤 הדרגה שלי — Roei Coins').setDescription(`${label(current)}\n🪙 יתרה: **${fmt(user.balance)}**\nבונוס פעילות: **${current.bonus}%**`);
  if (!next) embed.addFields({ name: '✨ MAX RANK', value: 'הגעת לדרגה המקסימלית — God Tier!' });
  else { const percent = Math.min(100, Math.floor(user.balance / next.price * 100)); const filled = Math.floor(percent / 10); embed.addFields({ name: `⬆️ הדרגה הבאה: ${label(next)}`, value: `💰 מחיר: **${fmt(next.price)}**\n📉 חסרים: **${fmt(Math.max(0, next.price - user.balance))}**\n🪙 ${fmt(user.balance)} / ${fmt(next.price)}\n${'█'.repeat(filled)}${'░'.repeat(10 - filled)} **${percent}%**` }); }
  embed.addFields({ name: '🏅 הישגים שנפתחו', value: user.milestones.length ? user.milestones.map(v => `🪙 ${fmt(v)}`).join(' • ') : 'ההישג הראשון מחכה ב־1,000 Coins.' });
  return embed;
}
function leaderboardEmbed(store, personal) {
  const list = store.leaderboard(); const index = list.findIndex(u => u.userId === personal);
  return baseEmbed('🏆 TOP 10 Roei Coins').setDescription((list.slice(0, 10).map((u,i) => `**${i + 1}.** <@${u.userId}> — **${fmt(u.balance)}**`).join('\n') || 'הפעילות מתחילה כאן — עוד אין יתרות.') + (personal ? `\n\n━━━━━━━━━━━━\n👤 המקום שלך:\n**#${index + 1} — ${fmt(store.getBalance(personal))} Roei Coins**\n━━━━━━━━━━━━` : '')).setFooter({ text: 'roei-coins:leaderboard:v1' });
}
function shopPayload(guild) {
  const counts = RANKS.slice(7).map(r => `${label(r)}: **${guild.members.cache.filter(m => !m.user.bot && m.roles.cache.has(r.roleId)).size}**`).join(' • ');
  const embed = baseEmbed('🪙 Roei Coins Shop').setDescription('**ברוכים הבאים לחנות הדרגות!**\nתהיו פעילים בשרת, תרוויחו Roei Coins ותתקדמו מדרגה לדרגה.\n\n💬 פעילות בצ׳אט • 🎙️ פעילות בוויס\n🎁 Random Drops • 📅 `/daily`\n\n' + RANKS.map(r => `${label(r)} — **${r.price ? fmt(r.price) : 'FREE'}**`).join('\n')).addFields({ name: '📜 כללי החנות', value: '⚠️ אי אפשר לדלג על דרגות — מתקדמים לפי הסדר.\n⚠️ אין החזר Coins על הדרגה הקודמת.\nבחרו דרגה כדי לבדוק מחיר וזמינות. הרכישה מתבצעת רק אחרי אישור אישי.' }, { name: '👑 הדרגות הגבוהות', value: counts }).setFooter({ text: 'roei-coins:shop:v1' });
  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('coins:rank').setPlaceholder('👑 בחירת דרגה').addOptions(RANKS.map(r => ({ label: `${r.name} — ${r.price ? fmt(r.price) : 'FREE'}`, value: String(r.index), emoji: r.badge })))), new ActionRowBuilder().addComponents(button('coins:profile', '👤 הדרגה שלי'), button('coins:leaderboard', '🏆 Leaderboard'), button('coins:daily', '📅 Daily', ButtonStyle.Primary))], allowedMentions: { parse: [] } };
}
function errorText(error) {
  const d = error.details || {};
  if (error.code === 'FUNDS') return `❌ אין לך מספיק Roei Coins!\n🪙 יש לך: ${fmt(d.balance)}\n💰 צריך: ${fmt(d.price)}\n📉 חסרים לך: ${fmt(d.price - d.balance)}`;
  if (error.code === 'DAILY') return `📅 כבר קיבלת Daily. הפרס הבא זמין <t:${Math.ceil(d.next / 1000)}:R>.`;
  return ({ ACTIVE_DROP: '🎁 כבר יש דרופ פעיל. יש להמתין לתביעה או לפקיעת התוקף שלו.', SELF: '❌ אי אפשר להעביר מטבעות לעצמך.', AMOUNT: '❌ הכמות חייבת להיות מספר שלם בטווח המותר.', COOLDOWN: '⏳ המתן 5 שניות בין פעולות.', RANK: '🔒 אפשר לקנות רק את הדרגה הבאה.', PENDING: '⏳ יש רכישה שממתינה לסנכרון הרול. הכסף שמור עבורה ולא תחויב שוב.', DROP: '🎁 הדרופ כבר נלקח או שפג תוקפו.', ROLE: '❌ לא ניתן לעדכן דרגה: בדקו Manage Roles, קיום הרולים ומיקום רול הבוט מעל כל רולי החנות.', USER: '❌ המשתמש אינו זמין במערכת.', BOT: '❌ בוטים לא משתתפים במערכת המטבעות.', STALE: '⌛ הכפתור ישן או אינו שייך לך. פתח שוב את החנות.', ADMIN: '❌ הפעולה זמינה רק לצוות המורשה.' })[error.code] || '❌ הפעולה לא הושלמה. נסה שוב; אם הבעיה נמשכת פנה לצוות.';
}
function createCoinsSystem({ client, guildId, canAdmin, env = process.env, store: suppliedStore }) {
  let store = suppliedStore, ready = false, started = false, channel, guild, refreshBusy = false;
  const locks = new Set(), confirmations = new Map(), voice = new Map(), activity = new Map();
  let lastSync = 0;
  const report = error => console.error('Roei Coins:', error.code || error.message);
  async function notify(id, text) {
    try { const user = await client.users.fetch(id); await user.send({ embeds: [baseEmbed('🪙 Roei Coins — עדכון').setDescription(text).setTimestamp()], allowedMentions: { parse: [] } }); }
    catch (error) { console.error(`Roei Coins DM unavailable: ${id} (${error.code || 'send failed'})`); }
  }
  async function notifyOnce(key, messages) {
    if (store.meta(`notice:${key}`)) return;
    store.meta(`notice:${key}`, true);
    await Promise.all(messages.map(([id, text]) => notify(id, text)));
  }
  async function rewardNotice(id, earned, reason) {
    if (earned > 0) await notify(id, `🎉 קיבלת **${fmt(earned)} Roei Coins** — ${reason}.\n🪙 יתרה: **${fmt(store.getBalance(id))}**`);
  }
  async function recoverDropMessages() {
    const pending = store.drops().filter(d => !d.messageId);
    for (const channelId of new Set(pending.map(d => d.channelId || CHANNEL_ID))) {
      const target = await guild.channels.fetch(channelId); let before;
      while (true) {
        const batch = await target.messages.fetch({ limit: 100, ...(before ? { before } : {}) });
        if (!batch.size) break;
        for (const message of batch.values()) if (message.author.id === client.user.id) {
          const drop = pending.find(d => message.embeds[0]?.footer?.text === `roei-coins:drop:${d.id}`);
          if (drop) { drop.messageId = message.id; store.saveDrop(drop); }
        }
        before = batch.last().id;
        if (batch.size < 100 || pending.filter(d => (d.channelId || CHANNEL_ID) === channelId).every(d => d.messageId)) break;
      }
    }
  }
  async function publishDrop(drop) {
    // Receipts may replay: always use the current persisted message ID.
    const saved = store.drops().find(d => d.id === drop.id);
    if (saved?.messageId) return saved;
    const target = await guild.channels.fetch(drop.channelId || CHANNEL_ID);
    try { const message = await target.send(dropPayload(drop)); drop.messageId = message.id; store.saveDrop(drop); }
    catch (e) { await recoverDropMessages().catch(report); throw e; }
    return drop;
  }

  async function locked(id, fn) { if (locks.has(id)) throw new CoinsError('PENDING'); locks.add(id); try { return await fn(); } finally { locks.delete(id); } }
  async function fetchHuman(id) { const member = await guild.members.fetch({ user: id, force: true }); if (member.user.bot) throw new CoinsError('BOT'); return member; }
  function ensureUser(member) {
    if (member.user.bot) throw new CoinsError('BOT');
    const highest = RANKS.filter(r => member.roles.cache.has(r.roleId)).at(-1)?.index || 0;
    return store.ensure(member.id, highest);
  }
  async function checkRoles(member) {
    const me = await guild.members.fetchMe();
    if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) throw new CoinsError('ROLE');
    for (const rank of RANKS) { const role = guild.roles.cache.get(rank.roleId); if (!role || role.managed || me.roles.highest.comparePositionTo(role) <= 0) throw new CoinsError('ROLE'); }
  }
  async function syncMember(member) {
    const user = ensureUser(member), purchase = store.pending(member.id), target = purchase?.target ?? user.currentRank;
    const correct = RANKS[target].roleId;
    const extra = RANKS.filter(r => r.roleId !== correct && member.roles.cache.has(r.roleId)).map(r => r.roleId);
    if (!member.roles.cache.has(correct) || extra.length) {
      await checkRoles(member);
      if (!member.roles.cache.has(correct)) await member.roles.add(correct, 'Roei Coins rank sync');
      if (extra.length) await member.roles.remove(extra, 'Roei Coins rank sync');
      const fresh = await fetchHuman(member.id);
      if (!fresh.roles.cache.has(correct) || RANKS.some(r => r.roleId !== correct && fresh.roles.cache.has(r.roleId))) throw new CoinsError('ROLE');
    }
    return purchase ? store.completePurchase(member.id) : user;
  }
  async function getPanelMessages() {
    const found = new Map(); let before;
    while (true) {
      const batch = await channel.messages.fetch({ limit: 100, ...(before ? { before } : {}) });
      if (!batch.size) break;
      for (const message of batch.values()) if (message.author.id === client.user.id) {
        const marker = message.embeds[0]?.footer?.text;
        if (marker === 'roei-coins:leaderboard:v1' || marker === 'roei-coins:shop:v1') found.set(marker, message);
        for (const drop of store.drops().filter(d => !d.messageId)) if (marker === `roei-coins:drop:${drop.id}`) { drop.messageId = message.id; store.saveDrop(drop); }
      }
      before = batch.last().id; if (batch.size < 100) break;
    }
    return found;
  }
  async function refreshPanels(recover = false) {
    if (refreshBusy) return; refreshBusy = true;
    try {
      let leader, shop;
      const ids = store.meta('panels');
      if (ids) { leader = await channel.messages.fetch(ids.leader).catch(e => { if (e.code !== 10008) throw e; }); shop = await channel.messages.fetch(ids.shop).catch(e => { if (e.code !== 10008) throw e; }); }
      if (!leader || !shop || recover) { const found = await getPanelMessages(); leader ||= found.get('roei-coins:leaderboard:v1'); shop ||= found.get('roei-coins:shop:v1'); }
      if (!leader) leader = await channel.send({ embeds: [leaderboardEmbed(store)], allowedMentions: { parse: [] } });
      // Repair only our shop message when a deleted leaderboard was recreated below it.
      if (shop && BigInt(shop.id) < BigInt(leader.id)) { await shop.delete(); shop = null; }
      if (!shop) shop = await channel.send(shopPayload(guild));
      store.meta('panels', { leader: leader.id, shop: shop.id });
      await leader.edit({ embeds: [leaderboardEmbed(store)], allowedMentions: { parse: [] } });
      await shop.edit(shopPayload(guild));
    } finally { refreshBusy = false; }
  }
  function dropPayload(drop) {
    const ended = drop.winner || drop.expires <= Date.now();
    return { embeds: [new EmbedBuilder().setColor(drop.color).setTitle(`🎁 RANDOM DROP! — ${drop.tier}`).setDescription(drop.winner ? `🏆 <@${drop.winner}> זכה ב־**${fmt(drop.amount)} Roei Coins!**` : ended ? '⌛ פג תוקף הדרופ.' : `נפל פרס בשרת! הראשון שלוחץ על **CLAIM** זוכה.\n🪙 **${fmt(drop.amount)} Roei Coins**\nזמין עד <t:${Math.floor(drop.expires / 1000)}:t>.`).setFooter({ text: `roei-coins:drop:${drop.id}` })], components: [new ActionRowBuilder().addComponents(button(`coins:claim:${drop.id}`, '🎁 CLAIM', ButtonStyle.Success).setDisabled(Boolean(ended)))], allowedMentions: { parse: [] } };
  }
  async function updateDrops() {
    for (const drop of store.drops()) {
      if (!drop.messageId || drop.renderedEnd) continue;
      if (drop.winner || drop.expires <= Date.now()) {
        try { const target = await guild.channels.fetch(drop.channelId || CHANNEL_ID); const message = await target.messages.fetch(drop.messageId); await message.edit(dropPayload(drop)); drop.renderedEnd = true; store.saveDrop(drop); } catch (e) { if (e.code === 10008) { drop.renderedEnd = true; store.saveDrop(drop); } else report(e); }
      }
    }
  }
  function eligibleVoice() {
    const result = new Set();
    for (const vc of guild.channels.cache.values()) {
      if (!vc.isVoiceBased() || vc.id === guild.afkChannelId) continue;
      const members = vc.members.filter(m => !m.user.bot && !m.voice.selfDeaf && !m.voice.serverDeaf && !m.voice.selfMute && !m.voice.serverMute && !m.voice.suppress);
      if (members.size >= 2) for (const m of members.values()) result.add(m.id);
    }
    return result;
  }
  async function tick() {
    if (!ready) return;
    const now = Date.now();
    const eligible = eligibleVoice();
    for (const id of voice.keys()) if (!eligible.has(id)) voice.delete(id);
    for (const id of eligible) {
      const m = guild.members.cache.get(id); if (!m) continue; ensureUser(m);
      const previous = voice.get(id) || { at: now, progress: 0 };
      const progress = previous.progress + Math.min(35000, Math.max(0, now - previous.at));
      if (progress >= 600000) { const earned = store.activity(id, 'voice'); void rewardNotice(id, earned, 'פעילות בוויס'); voice.set(id, { at: now, progress: progress - 600000 }); } else voice.set(id, { at: now, progress });
    }
    for (const [id, value] of activity) if (now - value.at > 600000) activity.delete(id);
    const active = eligible.size >= 2 || (activity.size >= 2 && [...activity.values()].reduce((n,v) => n + v.count, 0) >= 5);
    if (now >= store.meta('nextDrop') && active && !store.drops().some(d => !d.winner && d.expires > now)) {
      const drop = store.newDrop({ channelId: DROP_CHANNEL_ID });
      try { await publishDrop(drop); } catch (e) { report(e); }
    }
    await updateDrops();
    for (const [id, c] of confirmations) if (c.expires <= now) confirmations.delete(id);
  }
  let tickBusy = false;
  async function start() {
    if (started) return; started = true;
    try {
      if (!store) {
        const mount = env.RAILWAY_VOLUME_MOUNT_PATH;
        if (!mount) throw new Error('Persistent Railway volume is required; Coins remains disabled to protect balances');
        mkdirSync(mount, { recursive: true }); store = new CoinsStore(join(mount, 'roei-coins.sqlite'));
      }
      // The main ready handler has already loaded the complete member cache.
      guild = await client.guilds.fetch(guildId); await guild.roles.fetch();
      channel = await guild.channels.fetch(CHANNEL_ID);
      if (!channel?.isTextBased()) throw new Error('Coins shop channel unavailable');
      const me = await guild.members.fetchMe();
      for (const rank of RANKS) if (!guild.roles.cache.has(rank.roleId) || !me.permissions.has(PermissionFlagsBits.ManageRoles) || me.roles.highest.comparePositionTo(guild.roles.cache.get(rank.roleId)) <= 0) console.error(`Roei Coins role unavailable: ${rank.name} ${rank.roleId}`);
      if (!store.meta('nextDrop')) store.meta('nextDrop', Date.now() + randomInt(120, 241) * 60000);
      await refreshPanels(true);
      await recoverDropMessages();
      ready = true;
      console.log(`Roei Coins ready: persistent SQLite; users=${store.all().length}; panels=${JSON.stringify(store.meta('panels'))}`);
      const timer = setInterval(async () => { if (tickBusy) return; tickBusy = true; try { await tick(); } catch (e) { report(e); } finally { tickBusy = false; } }, 30000); timer.unref?.();
      const refresh = setInterval(async () => { try { await refreshPanels(); await reconcile(); } catch (e) { report(e); } }, 60000); refresh.unref?.();
      await reconcile();
    } catch (e) { report(e); started = false; const retry = setTimeout(() => void start(), 60000); retry.unref?.(); }
  }
  let reconcileBusy = false;
  async function reconcile() {
    if (reconcileBusy) return; reconcileBusy = true;
    try {
      await guild.roles.fetch();
      const all = Date.now() - lastSync > 900000;
      for (const user of store.all()) if ((all || store.pending(user.userId)) && !locks.has(user.userId)) {
        try { await locked(user.userId, async () => syncMember(await fetchHuman(user.userId))); } catch (e) { if (e.code !== 10007) report(e); }
      }
      if (all) lastSync = Date.now();
    } finally { reconcileBusy = false; }
  }
  async function handle(i) {
    const slash = i.isChatInputCommand?.() && commands.some(c => c.name === i.commandName);
    const component = (i.isButton?.() || i.isStringSelectMenu?.()) && i.customId?.startsWith('coins:');
    if (!slash && !component) return false;
    try {
      if (i.guildId !== guildId || i.user.bot) throw new CoinsError('USER');
      if (!ready) { await i.reply({ content: '⏳ מערכת המטבעות עדיין לא מוכנה. לא בוצע חיוב.', ephemeral: true }); return true; }
      await i.deferReply({ ephemeral: true });
      await locked(i.user.id, async () => {
        const member = await fetchHuman(i.user.id); ensureUser(member);
        try { await syncMember(member); } catch (e) { report(e); }
        let action = slash ? i.commandName : i.customId.split(':')[1];
        if (component && ['rank', 'profile', 'leaderboard', 'daily'].includes(action) && (i.message.id !== store.meta('panels')?.shop || i.channelId !== CHANNEL_ID)) throw new CoinsError('STALE');
        const send = payload => i.editReply(typeof payload === 'string' ? { content: payload, allowedMentions: { parse: [] } } : { ...payload, allowedMentions: { parse: [] } });
        if (action === 'confirm' || action === 'cancel') {
          const nonce = i.customId.split(':')[2], confirm = confirmations.get(i.user.id);
          if (!confirm || confirm.nonce !== nonce || confirm.expires <= Date.now()) throw new CoinsError('STALE');
          confirmations.delete(i.user.id);
          if (action === 'cancel') { await i.message.edit({ components: [] }).catch(() => {}); return send('✅ הרכישה בוטלה. לא חויבת.'); }
          await guild.roles.fetch(); await checkRoles(member);
          store.beginPurchase(member.id, confirm.target, `purchase:${nonce}`);
          await i.message.edit({ components: [] }).catch(() => {});
          try { const user = await syncMember(await fetchHuman(member.id)); return send({ embeds: [baseEmbed('✅ הקנייה הושלמה!').setDescription(`👑 דרגה חדשה: **${label(RANKS[user.currentRank])}**\n💰 מחיר: **${fmt(RANKS[user.currentRank].price)}**\n🪙 יתרה: **${fmt(user.balance)}**`)] }); }
          catch (e) { report(e); return send('⏳ הסכום נשמר לרכישה, אבל הרול עדיין לא הסתנכרן. המערכת תנסה שוב אוטומטית ולא תחייב שוב. אם הבעיה נמשכת, פנה לצוות לבדיקת הרולים.'); }
        }
        if (action === 'drop') {
          if (!canAdmin(member)) throw new CoinsError('ADMIN');
          const drop = await locked('__drop__', async () => {
            const created = store.newDrop({ manual: true, type: i.options.getString('type') || 'Common', channelId: DROP_CHANNEL_ID, key: `manual:${i.id}` });
            return publishDrop(created);
          });
          return send(`✅ נוצר דרופ **${drop.tier}** של **${fmt(drop.amount)} Coins** ב־<#${DROP_CHANNEL_ID}>.`);
        }
        if (action === 'claim') {
          const saved = store.drops().find(d => d.id === i.customId.split(':')[2]);
          if (!saved || i.channelId !== (saved.channelId || CHANNEL_ID)) throw new CoinsError('DROP');
          const drop = store.claim(i.customId.split(':')[2], member.id, i.message.id);
          await i.message.edit(dropPayload(drop)).catch(report);
          await notifyOnce(`drop:${drop.id}`, [[member.id, `🎁 זכית בדרופ **${drop.tier}** וקיבלת **${fmt(drop.amount)} Roei Coins**.\n🪙 יתרה: **${fmt(store.getBalance(member.id))}**`]]);
          return send(`🎉 זכית ב־**${fmt(drop.amount)} Roei Coins!**`);
        }
        if (action === 'rank') {
          const user = await syncMember(member), target = Number(i.values?.[0]), rank = RANKS[target];
          if (!rank || !Number.isInteger(target)) throw new CoinsError('RANK');
          if (target <= user.currentRank) return send(`${label(rank)}\nהדרגה הנוכחית שלך: **${RANKS[user.currentRank].name}**. אי אפשר לקנות דרגה נוכחית או נמוכה יותר.`);
          if (target !== user.currentRank + 1) return send(`🔒 ${label(rank)}\nהדרגה שלך: **${RANKS[user.currentRank].name}**\nעליך להגיע קודם ל־**${RANKS[target - 1].name}**. הדרגה הבאה שלך היא **${RANKS[user.currentRank + 1].name}**.`);
          if (confirmations.has(member.id) && confirmations.get(member.id).expires > Date.now()) throw new CoinsError('PENDING');
          if (user.balance < rank.price) throw new CoinsError('FUNDS', { balance: user.balance, price: rank.price });
          await guild.roles.fetch(); await checkRoles(member);
          const nonce = randomUUID(); confirmations.set(member.id, { nonce, target, expires: Date.now() + 60000 });
          return send({ embeds: [baseEmbed('🛒 אישור רכישה').setDescription(`אתה עומד לקנות: **${label(rank)}**\n\nמחיר: 🪙 **${fmt(rank.price)} Roei Coins**\nיתרה לאחר הקנייה: **${fmt(user.balance - rank.price)}**\n\nהאישור תקף לדקה. אין החזר על הדרגה הקודמת.`)], components: [new ActionRowBuilder().addComponents(button(`coins:confirm:${nonce}`, '✅ אישור קנייה', ButtonStyle.Success), button(`coins:cancel:${nonce}`, '❌ ביטול', ButtonStyle.Danger))] });
        }
        if (['addcoins', 'removecoins', 'setcoins'].includes(action)) {
          if (!canAdmin(member)) throw new CoinsError('ADMIN');
          const target = await fetchHuman(i.options.getUser('user', true).id); ensureUser(target);
          const value = i.options.getInteger('amount', true), key = i.id;
          const before = store.getBalance(target.id);
          const result = action === 'setcoins' ? store.setCoins(target.id, value, key) : action === 'addcoins' ? store.addCoins(target.id, value, 'admin', key) : store.removeCoins(target.id, value, 'admin', key);
          const operation = { addcoins: 'הוספה', removecoins: 'הסרה', setcoins: 'הגדרת יתרה' }[action];
          const detail = `🛠️ **${operation}**\nמבצע: <@${member.id}> (${member.id})\nמשתמש: <@${target.id}> (${target.id})\nערך הפקודה: **${fmt(value)}**\nלפני: **${fmt(before)}** → אחרי: **${fmt(result.balance)}**\nפעולה: ${i.id}`;
          const notices = new Map([[OWNER_ID, detail]]);
          if (target.id !== OWNER_ID) notices.set(target.id, `🛠️ <@${member.id}> ביצע **${operation}** בחשבונך.\nערך: **${fmt(value)} Coins**\nלפני: **${fmt(before)}** → יתרה: **${fmt(result.balance)}**`);
          if (member.id !== OWNER_ID && member.id !== target.id) notices.set(member.id, detail);
          await notifyOnce(i.id, [...notices]);
          return send(`✅ היתרה של <@${target.id}> עודכנה ל־**${fmt(result.balance)} Roei Coins**.`);
        }
        if (action === 'daily') { const result = store.daily(member.id, i.id); await notifyOnce(i.id, [[member.id, `📅 קיבלת **${fmt(result.amount)} Roei Coins** מהפרס היומי.\n🪙 יתרה: **${fmt(result.balance)}**`]]); return send(`📅 קיבלת **${fmt(result.amount)} Roei Coins!**\n🪙 יתרה: **${fmt(result.balance)}**`); }
        if (action === 'pay') {
          const target = await fetchHuman(i.options.getUser('user', true).id); ensureUser(target);
          const result = store.pay(member.id, target.id, i.options.getInteger('amount', true), i.id);
          await notifyOnce(i.id, [[member.id, `📤 העברת **${fmt(result.amount)} Roei Coins** ל־<@${target.id}>.\n🪙 יתרה: **${fmt(result.balance)}**`], [target.id, `📥 קיבלת **${fmt(result.amount)} Roei Coins** מ־<@${member.id}>.\n🪙 יתרה: **${fmt(store.getBalance(target.id))}**`]]);
          return send(`✅ העברת **${fmt(result.amount)} Roei Coins** ל־<@${target.id}>.\n🪙 יתרה: **${fmt(result.balance)}**`);
        }
        if (action === 'balance') {
          const target = i.options.getUser('user'); if (target) ensureUser(await fetchHuman(target.id));
          return send(`🪙 היתרה של <@${target?.id || member.id}>: **${fmt(store.getBalance(target?.id || member.id))} Roei Coins**`);
        }
        if (action === 'coinleaderboard' || action === 'leaderboard') return send({ embeds: [leaderboardEmbed(store, member.id)] });
        if (action === 'rankhistory') { const user = store.user(member.id); return send({ embeds: [baseEmbed('📜 היסטוריית הדרגות').setDescription(user.rankHistory.map(h => `${label(RANKS[h.rank])} — ${h.initial ? 'התחלה · ' : ''}<t:${Math.floor(h.at / 1000)}:d>`).join('\n')), rankEmbed(user)] }); }
        if (action === 'rankshop' || action === 'profile') { let user; try { user = await syncMember(member); } catch (e) { report(e); user = store.user(member.id); } return send({ embeds: [rankEmbed(user)], content: store.pending(member.id) ? '⏳ רכישה ממתינה לסנכרון הרול.' : undefined }); }
        throw new CoinsError('STALE');
      });
    } catch (e) { report(e); const payload = { content: errorText(e), allowedMentions: { parse: [] } }; if (i.deferred || i.replied) await i.editReply(payload).catch(report); else await i.reply({ ...payload, ephemeral: true }).catch(report); }
    return true;
  }
  async function onMessage(message) {
    if (!ready || message.guildId !== guildId || message.author.bot || message.webhookId || message.system) return;
    try {
      const member = message.member || await fetchHuman(message.author.id);
      if (member.communicationDisabledUntilTimestamp > Date.now() || message.mentions.everyone || message.mentions.users.size + message.mentions.roles.size >= 6) return;
      ensureUser(member); const earned = store.activity(member.id, 'chat'); void rewardNotice(member.id, earned, 'פעילות בצ׳אט');
      const prior = activity.get(member.id); activity.set(member.id, { at: Date.now(), count: Math.min(5, (prior?.count || 0) + 1) });
    } catch (e) { report(e); }
  }
  client.on('messageCreate', onMessage);
  client.on('voiceStateUpdate', () => {
    if (!ready) return;
    const eligible = eligibleVoice();
    for (const id of voice.keys()) if (!eligible.has(id)) voice.delete(id);
    for (const id of eligible) if (!voice.has(id)) voice.set(id, { at: Date.now(), progress: 0 });
  });
  client.on('guildMemberAdd', member => { if (ready && member.guild.id === guildId && !member.user.bot) locked(member.id, () => syncMember(member)).catch(report); });
  client.on('guildMemberUpdate', (old, member) => { if (ready && member.guild.id === guildId && !member.user.bot && store.read(member.id) && !locks.has(member.id) && RANKS.some(r => old.roles.cache.has(r.roleId) !== member.roles.cache.has(r.roleId))) locked(member.id, async () => syncMember(await fetchHuman(member.id))).catch(report); });
  async function aiRead(id) {
    if (!ready) throw new CoinsError('USER');
    const user = ensureUser(await fetchHuman(id)), next = RANKS[user.currentRank + 1];
    return { balance: user.balance, currentRank: RANKS[user.currentRank], nextRank: next || null, missing: next ? Math.max(0, next.price - user.balance) : 0 };
  }
  async function aiAction(action, id, args, key) {
    if (!ready) throw new CoinsError('USER');
    // The existing slash handler owns transfers, notifications, cooldowns and receipts.
    if (['daily', 'pay'].includes(action)) {
      let result;
      const interaction = { id: key, guildId, user: { id, bot: false }, commandName: action,
        isChatInputCommand: () => true, isButton: () => false, isStringSelectMenu: () => false,
        options: { getUser: () => ({ id: args.recipient }), getInteger: () => args.amount },
        deferReply: async () => { interaction.deferred = true; },
        reply: async value => { result = value; }, editReply: async value => { result = value; } };
      await handle(interaction); return { content: result?.content || result };
    }
    if (action !== 'rank') throw new CoinsError('RANK');
    return locked(id, async () => {
      const member = await fetchHuman(id); ensureUser(member);
      await guild.roles.fetch(); await checkRoles(member);
      store.beginPurchase(id, args.rank, key);
      try { const user = await syncMember(await fetchHuman(id)); return { rank: RANKS[user.currentRank].name, balance: user.balance }; }
      catch { return { status: 'pending_role_sync', message: 'הסכום שמור לרכישה והרול יסתנכרן אוטומטית, ללא חיוב נוסף.' }; }
    });
  }
  return { start, handle, commands, aiRead, aiAction, get store() { return store; }, refreshPanels, syncMember, tick, get ready() { return ready; } };
}
module.exports = { createCoinsSystem, commands, rankEmbed, leaderboardEmbed, shopPayload, errorText, CHANNEL_ID, DROP_CHANNEL_ID };
