const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { EventEmitter } = require('node:events');
const { Collection } = require('discord.js');
const { CoinsStore, RANKS, LIMIT, DAY } = require('./coins-store');
const { createCoinsSystem, rankEmbed, leaderboardEmbed, commands, CHANNEL_ID } = require('./roei-coins');
function fixture(path = ':memory:') { let now = 100000000; const store = new CoinsStore(path, { now: () => now, random: min => min }); for (const id of ['1', '2', '3']) store.ensure(id); return { store, advance: ms => now += ms }; }
test('atomic transfer, replay safety, limits, negative and insufficient balances', () => {
  const { store } = fixture();
  store.addCoins('1', 100, 'test');
  const first = store.pay('1', '2', 80, 'transfer');
  assert.deepEqual(store.pay('1', '2', 80, 'transfer'), first);
  assert.equal(store.getBalance('1'), 20); assert.equal(store.getBalance('2'), 80);
  assert.throws(() => store.pay('1', '3', 1, 'new'), /COOLDOWN/);
  assert.throws(() => store.pay('1', '1', 1), /SELF/);
  for (const v of [-1, 0, 1.5, NaN, LIMIT + 1]) assert.throws(() => store.addCoins('1', v, 'test'), /AMOUNT/);
  assert.throws(() => store.removeCoins('1', 21, 'test'), /FUNDS/);
  store.setCoins('3', LIMIT);
  assert.throws(() => store.pay('2', '3', 1), /AMOUNT/);
  assert.equal(store.getBalance('2'), 80); assert.equal(store.getBalance('3'), LIMIT);
  store.close();
});
test('daily and chat cooldowns persist; bonuses accumulate only on activity', () => {
  const { store, advance } = fixture();
  store.ensure('4', 3);
  assert.equal(store.daily('4', 'daily').amount, 150);
  assert.throws(() => store.daily('4', 'daily2'), /DAILY/);
  advance(DAY); assert.equal(store.daily('4', 'daily3').amount, 150);
  for (let i = 0; i < 10; i++) store.activity('4', 'voice');
  assert.equal(store.getBalance('4'), 351); // 50 base + 1 accumulated 2% bonus
  assert.equal(store.activity('4', 'chat'), 2); assert.equal(store.activity('4', 'chat'), 0);
  advance(60000); assert.equal(store.activity('4', 'chat'), 2);
  store.close();
});
test('purchase cannot skip rank, double spend, or lose pending state on reopen', () => {
  const dir = mkdtempSync(join(tmpdir(), 'roei-coins-')); const path = join(dir, 'coins.sqlite');
  let { store } = fixture(path); store.addCoins('1', 500000, 'admin');
  assert.throws(() => store.beginPurchase('1', 8, 'skip'), /RANK/);
  store.beginPurchase('1', 1, 'buy');
  assert.throws(() => store.beginPurchase('1', 1, 'buy2'), /PENDING/);
  assert.equal(store.getBalance('1'), 499000); assert.equal(store.user('1').currentRank, 0);
  store.close(); store = new CoinsStore(path);
  assert.equal(store.pending('1').target, 1); store.completePurchase('1'); store.completePurchase('1');
  assert.equal(store.user('1').rankHistory.length, 2); assert.equal(store.user('1').currentRank, 1);
  assert.equal(store.getBalance('1'), 499000);
  assert.deepEqual(store.user('1').milestones, [1000, 10000, 50000, 100000]);
  assert.throws(() => store.beginPurchase('1', 1, 'old'), /RANK/);
  store.close(); rmSync(dir, { recursive: true });
});
test('two claim attempts award once, stale and foreign message IDs never award', () => {
  const { store, advance } = fixture(); const drop = store.newDrop(); drop.messageId = 'message'; store.saveDrop(drop);
  assert.equal(drop.tier, 'Golden'); assert.equal(drop.amount, 2500);
  assert.throws(() => store.claim(drop.id, '1', 'forged'), /DROP/);
  store.claim(drop.id, '1', 'message');
  assert.throws(() => store.claim(drop.id, '2', 'message'), /DROP/);
  assert.equal(store.getBalance('1'), 2500); assert.equal(store.getBalance('2'), 0);
  const expired = store.newDrop(); expired.messageId = 'expired'; store.saveDrop(expired); advance(600001);
  assert.throws(() => store.claim(expired.id, '2', 'expired'), /DROP/); store.close();
});

test('all ten ranks advance only in order, preserve history and stop at God Tier', () => {
  const { store, advance } = fixture(); store.addCoins('1', 500000, 'test');
  let spent = 0;
  for (let rank = 1; rank <= 9; rank++) {
    advance(5000); store.beginPurchase('1', rank, `rank-${rank}`); store.completePurchase('1'); spent += RANKS[rank].price;
    assert.equal(store.user('1').currentRank, rank); assert.equal(store.getBalance('1'), 500000 - spent);
  }
  assert.equal(store.user('1').rankHistory.length, 10);
  assert.throws(() => store.beginPurchase('1', 10, 'beyond'), /RANK/); store.close();
});
test('personal placement, progress, max rank and command schemas', () => {
  const { store } = fixture(); for (let i = 4; i < 50; i++) { store.ensure(String(i)); store.addCoins(String(i), i * 100, 'test'); }
  const board = leaderboardEmbed(store, '1').toJSON(); assert.match(board.description, /#47/);
  store.setCoins('1', 680); const embed = rankEmbed(store.user('1')).toJSON(); assert.match(embed.fields[0].value, /68%/);
  store.ensure('100', 9); assert.match(rankEmbed(store.user('100')).toJSON().fields[0].value, /God Tier/);
  assert.equal(commands.length, 10); for (const cmd of commands) assert.ok(cmd.toJSON().name);
  assert.deepEqual(RANKS.map(r => r.roleId), ['1556733347517042708','1556733918072279040','1556734050230870036','1556734198872674454','1556734312282460323','1556734516444274780','1556734639240908961','1556735083073769622','1556735244999204894','1556735341098958968']);
  assert.equal(CHANNEL_ID, '1556736219038093484'); store.close();
});

async function discordFixture(existing) {
  const { store } = existing || fixture(); const client = new EventEmitter(); client.user = { id: 'bot' };
  const dms = [], fetchedChannels = [];
  client.users = { async fetch(id) { return { async send(payload) { dms.push({ id, payload }); } }; } };
  const messages = existing?.messages || new Collection(); let serial = messages.size + 100;
  const channel = { id: CHANNEL_ID, isTextBased: () => true, async send(payload) { const message = { id: String(++serial), author: client.user, embeds: payload.embeds.map(e => e.toJSON()), components: payload.components, async edit(value) { this.embeds = value.embeds?.map(e => e.toJSON()) || this.embeds; this.components = value.components || []; }, async delete() { messages.delete(this.id); } }; messages.set(message.id, message); return message; }, messages: { async fetch(arg) { if (typeof arg === 'string') { if (!messages.has(arg)) throw Object.assign(new Error('missing'), { code: 10008 }); return messages.get(arg); } return new Collection([...messages].reverse()); } } };
  const roles = new Collection(RANKS.map(r => [r.roleId, { id: r.roleId }]));
  const members = new Collection();
  const guild = { id: 'guild', afkChannelId: 'afk', roles: { cache: roles, async fetch() { return roles; } }, channels: { cache: new Collection(), async fetch(id) { fetchedChannels.push(id); return channel; } } };
  for (const id of ['1','2','3']) { const member = { id, user: { id, bot: false }, guild, voice: {}, roles: { cache: new Collection([['unrelated', {}]]), async add(id) { this.cache.set(id, {}); }, async remove(ids) { for (const id of ids) this.cache.delete(id); } } }; members.set(id, member); }
  const me = { permissions: { has: () => true }, roles: { highest: { comparePositionTo: () => 1 } } };
  guild.members = { cache: members, async fetch(arg) { if (!arg) return members; const m = members.get(typeof arg === 'string' ? arg : arg.user); if (!m) throw Object.assign(new Error('left'), { code: 10007 }); return m; }, async fetchMe() { return me; } };
  client.guilds = { async fetch() { return guild; } };
  const system = createCoinsSystem({ client, guildId: 'guild', canAdmin: m => m.id === '1', store }); await system.start();
  function request(command, { user = '1', target = '2', value = 100, customId, values, message } = {}) {
    const replies = []; return { id: Math.random().toString(), user: { id: user }, guildId: 'guild', channelId: CHANNEL_ID, commandName: command, customId, values, message, options: { getUser: () => members.get(target)?.user || { id: target }, getInteger: () => value }, isChatInputCommand: () => !customId, isButton: () => Boolean(customId && !values), isStringSelectMenu: () => Boolean(values), replies, async deferReply() { this.deferred = true; }, async reply(p) { replies.push(p); }, async editReply(p) { replies.push(p); } };
  }
  return { system, store, messages, guild, members, client, me, request, dms, fetchedChannels };
}


test('panel recovery edits existing messages in order and role sync preserves unrelated roles', async () => {
  const f = await discordFixture(); const ids = f.store.meta('panels'); assert.ok(BigInt(ids.leader) < BigInt(ids.shop));
  await f.system.refreshPanels(true); assert.equal(f.messages.size, 2); assert.deepEqual(f.store.meta('panels'), ids);
  const m = f.members.get('1'); m.roles.cache.set(RANKS[8].roleId, {});
  await f.system.syncMember(m); assert.ok(m.roles.cache.has('unrelated')); assert.ok(m.roles.cache.has(RANKS[0].roleId)); assert.ok(!m.roles.cache.has(RANKS[8].roleId));
  m.roles.cache.delete(RANKS[0].roleId); await f.system.syncMember(m); assert.ok(m.roles.cache.has(RANKS[0].roleId));
  await f.messages.get(ids.leader).delete(); await f.system.refreshPanels();
  const repaired = f.store.meta('panels'); assert.equal(f.messages.size, 2); assert.ok(BigInt(repaired.leader) < BigInt(repaired.shop));
  f.store.close();
});
test('purchase UI rejects forged/stale confirmations, rechecks funds and permissions', async () => {
  const f = await discordFixture(); f.store.addCoins('1', 1000, 'test');
  const shop = f.messages.get(f.store.meta('panels').shop);
  const choose = f.request('', { customId: 'coins:rank', values: ['1'], message: shop }); await f.system.handle(choose);
  const confirmId = choose.replies.at(-1).components[0].toJSON().components[0].custom_id;
  const forged = f.request('', { user: '2', customId: confirmId, message: { async edit() {} } }); await f.system.handle(forged); assert.match(forged.replies[0].content, /ישן/);
  f.store.removeCoins('1', 1, 'test');
  const confirm = f.request('', { customId: confirmId, message: { async edit() {} } }); await f.system.handle(confirm); assert.match(confirm.replies[0].content, /אין לך מספיק/); assert.equal(f.store.getBalance('1'), 999);
  const admin = f.request('addcoins', { user: '2' }); await f.system.handle(admin); assert.match(admin.replies[0].content, /מורשה/);
  f.members.get('3').user.bot = true; const bot = f.request('pay', { target: '3' }); await f.system.handle(bot); assert.match(bot.replies[0].content, /בוטים/);
  f.me.roles.highest.comparePositionTo = () => -1;
  const role = f.members.get('1'); role.roles.cache.delete(RANKS[0].roleId); await assert.rejects(f.system.syncMember(role), /ROLE/);
  f.store.close();
});
test('failed role API leaves recoverable reservation, completes once after retry', async () => {
  const f = await discordFixture(); f.store.addCoins('1', 1000, 'test');
  f.store.beginPurchase('1', 1, 'buy'); const member = f.members.get('1'); const add = member.roles.add;
  member.roles.add = async () => { throw new Error('Discord temporary error'); };
  await assert.rejects(f.system.syncMember(member)); assert.equal(f.store.getBalance('1'), 0); assert.ok(f.store.pending('1'));
  member.roles.add = add; await f.system.syncMember(member); await f.system.syncMember(member);
  assert.equal(f.store.user('1').currentRank, 1); assert.equal(f.store.user('1').rankHistory.length, 2); assert.equal(f.store.pending('1'), null);
  f.store.close();
});

test('voice requires ten active minutes together, excludes AFK, muted users and bots', async () => {
  const f = await discordFixture(); const realNow = Date.now; let now = realNow(); Date.now = () => now;
  try {
    const vc = { id: 'voice', isVoiceBased: () => true, members: new Collection([['1', f.members.get('1')], ['2', f.members.get('2')]]) };
    f.guild.channels.cache.set('voice', vc);
    f.client.emit('voiceStateUpdate');
    f.store.meta('nextDrop', now + DAY);
    for (let i = 0; i < 20; i++) { now += 30000; await f.system.tick(); }
    assert.equal(f.store.getBalance('1'), 5); assert.equal(f.store.getBalance('2'), 5);
    f.members.get('2').voice.selfMute = true;
    for (let i = 0; i < 20; i++) { now += 30000; await f.system.tick(); }
    assert.equal(f.store.getBalance('1'), 5);
    f.members.get('2').voice.selfMute = false; vc.id = 'afk';
    for (let i = 0; i < 20; i++) { now += 30000; await f.system.tick(); }
    assert.equal(f.store.getBalance('2'), 5);
    vc.id = 'voice'; f.members.get('2').user.bot = true;
    for (let i = 0; i < 20; i++) { now += 30000; await f.system.tick(); }
    assert.equal(f.store.getBalance('1'), 5);
  } finally { Date.now = realNow; f.store.close(); }
});
test('concurrent confirms create only one purchase and one rank history entry', async () => {
  const f = await discordFixture(); f.store.addCoins('1', 10000, 'test');
  const choose = f.request('', { customId: 'coins:rank', values: ['1'], message: f.messages.get(f.store.meta('panels').shop) }); await f.system.handle(choose);
  const customId = choose.replies[0].components[0].toJSON().components[0].custom_id;
  const opts = { customId, message: { async edit() {} } };
  const a = f.request('', opts), b = f.request('', opts);
  await Promise.all([f.system.handle(a), f.system.handle(b)]);
  assert.equal(f.store.getBalance('1'), 9000); assert.equal(f.store.user('1').currentRank, 1); assert.equal(f.store.user('1').rankHistory.length, 2);
  f.store.close();
});

test('a fresh system instance reuses stored panels without requesting all guild members', async () => {
  const f = await discordFixture(); const ids = f.store.meta('panels'); const originalFetch = f.guild.members.fetch;
  f.guild.members.fetch = async arg => { assert.ok(arg, 'Coins must reuse the main bot member cache'); return originalFetch(arg); };
  const restarted = createCoinsSystem({ client: f.client, guildId: 'guild', canAdmin: () => false, store: f.store });
  await restarted.start(); assert.equal(restarted.ready, true); assert.equal(f.messages.size, 2); assert.deepEqual(f.store.meta('panels'), ids);
  f.store.close();
});

test('manual drop is staff only, uses drop room, preserves auto schedule and claims once', async () => {
  const f = await discordFixture(); const next = f.store.meta('nextDrop');
  const denied = f.request('drop', { user: '2' }); await f.system.handle(denied); assert.match(denied.replies[0].content, /מורשה/); assert.equal(f.store.drops().length, 0);
  const allowed = f.request('drop'); allowed.options.getString = () => 'Epic'; await f.system.handle(allowed);
  const drop = f.store.drops()[0]; assert.equal(drop.tier, 'Epic'); assert.equal(drop.channelId, '1555552614878412940'); assert.equal(f.store.meta('nextDrop'), next);
  assert.ok(f.fetchedChannels.includes(drop.channelId));
  const claim = f.request('', { user: '2', customId: `coins:claim:${drop.id}`, message: f.messages.get(drop.messageId) }); claim.channelId = drop.channelId;
  await f.system.handle(claim); assert.equal(f.store.getBalance('2'), 500); assert.equal(f.dms.filter(n => n.id === '2').length, 1);
  await f.system.handle(claim); assert.equal(f.store.getBalance('2'), 500); assert.equal(f.dms.filter(n => n.id === '2').length, 1);
  f.store.close();
});
test('transfers notify both users once, admin changes privately notify owner, closed DMs do not undo payment', async () => {
  const f = await discordFixture(); f.store.addCoins('1', 1000, 'test');
  const pay = f.request('pay'); await f.system.handle(pay); await f.system.handle(pay);
  assert.equal(f.store.getBalance('2'), 100); assert.deepEqual(f.dms.map(n => n.id), ['1','2']);
  const admin = f.request('removecoins', { value: 20 }); await f.system.handle(admin);
  assert.equal(f.store.getBalance('2'), 80); assert.ok(f.dms.some(n => n.id === '1243097719262941224'));
  const audit = f.dms.find(n => n.id === '1243097719262941224').payload.embeds[0].toJSON().description;
  assert.match(audit, /100.*80/s); assert.match(audit, /הסרה/);
  f.client.users.fetch = async () => { throw Object.assign(new Error('closed'), { code: 50007 }); };
  const daily = f.request('daily', { user: '2' }); await f.system.handle(daily);
  assert.equal(f.store.getBalance('2'), 230); assert.match(daily.replies[0].content, /150/); f.store.close();
});
test('automatic drops use the configured drop room and legacy shop claims still work', async () => {
  const f = await discordFixture();
  const legacy = f.store.newDrop(); legacy.messageId = 'old'; f.store.saveDrop(legacy);
  const oldClaim = f.request('', { customId: `coins:claim:${legacy.id}`, message: { id: 'old', async edit() {} } }); await f.system.handle(oldClaim); assert.equal(f.store.getBalance('1'), 2500);
  f.store.meta('nextDrop', 1);
  f.guild.channels.cache.set('voice', { id: 'voice', isVoiceBased: () => true, members: f.members });
  await f.system.tick(); assert.equal(f.store.drops().at(-1).channelId, '1555552614878412940'); f.store.close();
});
