'use strict';
const { DatabaseSync } = require('node:sqlite');
const { randomUUID, randomInt } = require('node:crypto');
const RANKS = [
  ['Rookie', '1556733347517042708', 0, 0, '🟢'],
  ['Player', '1556733918072279040', 1000, 0, '🔵'],
  ['Gamer', '1556734050230870036', 2500, 0, '🎮'],
  ['Pro', '1556734198872674454', 5000, 2, '⚡'],
  ['Elite', '1556734312282460323', 10000, 3, '💎'],
  ['Master', '1556734516444274780', 20000, 4, '🔥'],
  ['Champion', '1556734639240908961', 35000, 5, '🏆'],
  ['Legend', '1556735083073769622', 55000, 6, '👑'],
  ['Mythic', '1556735244999204894', 80000, 8, '🌌'],
  ['God Tier', '1556735341098958968', 120000, 10, '✨']
].map(([name, roleId, price, bonus, badge], index) => ({ name, roleId, price, bonus, badge, index }));
const LIMIT = 1_000_000_000;
const DAY = 86400000;
class CoinsError extends Error { constructor(code, details = {}) { super(code); this.code = code; this.details = details; } }
function amount(value, zero = false) { if (!Number.isSafeInteger(value) || value < (zero ? 0 : 1) || value > LIMIT) throw new CoinsError('AMOUNT'); return value; }

class CoinsStore {
  constructor(path, { now = Date.now, random = (min, max) => randomInt(min, max + 1) } = {}) {
    this.now = now; this.random = random;
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS receipts(id TEXT PRIMARY KEY, result TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS purchases(id TEXT PRIMARY KEY, user_id TEXT NOT NULL, data TEXT NOT NULL);
      CREATE UNIQUE INDEX IF NOT EXISTS one_purchase_per_user ON purchases(user_id);
      CREATE TABLE IF NOT EXISTS drops(id TEXT PRIMARY KEY, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, data TEXT NOT NULL);`);
  }
  close() { this.db.close(); }
  transaction(fn) { this.db.exec('BEGIN IMMEDIATE'); try { const result = fn(); this.db.exec('COMMIT'); return result; } catch (e) { this.db.exec('ROLLBACK'); throw e; } }
  read(id) { const row = this.db.prepare('SELECT data FROM users WHERE id=?').get(id); return row ? JSON.parse(row.data) : null; }
  save(user) {
    amount(user.balance, true);
    for (const threshold of [1000, 10000, 50000, 100000]) if (user.balance >= threshold && !user.milestones.includes(threshold)) user.milestones.push(threshold);
    this.db.prepare('INSERT INTO users VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(user.userId, JSON.stringify(user));
    return user;
  }
  ensure(userId, initialRank = 0) {
    if (!/^\d{1,22}$/.test(userId) || !RANKS[initialRank]) throw new CoinsError('USER');
    return this.transaction(() => this.read(userId) || this.save({ userId, balance: 0, lastDaily: 0, lastChat: 0, lastPay: 0, lastPurchase: 0, currentRank: initialRank, rankHistory: [{ rank: initialRank, at: this.now(), initial: true }], milestones: [], bonusRemainder: 0 }));
  }
  user(id) { const user = this.read(id); if (!user) throw new CoinsError('USER'); return user; }
  getBalance(id) { return this.read(id)?.balance || 0; }
  once(key, fn) {
    return this.transaction(() => {
      if (key) { const row = this.db.prepare('SELECT result FROM receipts WHERE id=?').get(key); if (row) return JSON.parse(row.result); }
      const result = fn();
      if (key) this.db.prepare('INSERT INTO receipts VALUES(?,?)').run(key, JSON.stringify(result));
      return result;
    });
  }
  addCoins(id, value, reason, key) { amount(value); return this.once(key, () => { const user = this.user(id); user.balance += value; this.save(user); return { balance: user.balance, amount: value, reason }; }); }
  removeCoins(id, value, reason, key) { amount(value); return this.once(key, () => { const user = this.user(id); if (user.balance < value) throw new CoinsError('FUNDS', { balance: user.balance, price: value }); user.balance -= value; this.save(user); return { balance: user.balance, amount: value, reason }; }); }
  setCoins(id, value, key) { amount(value, true); return this.once(key, () => { const user = this.user(id); user.balance = value; this.save(user); return { balance: value }; }); }
  daily(id, key) {
    return this.once(key, () => { const user = this.user(id); if (user.lastDaily && this.now() - user.lastDaily < DAY) throw new CoinsError('DAILY', { next: user.lastDaily + DAY }); const value = this.random(150, 300); user.lastDaily = this.now(); user.balance += value; this.save(user); return { amount: value, balance: user.balance }; });
  }
  pay(from, to, value, key) {
    amount(value); if (from === to) throw new CoinsError('SELF');
    return this.once(key, () => {
      const sender = this.user(from), recipient = this.user(to);
      if (sender.lastPay && this.now() - sender.lastPay < 5000) throw new CoinsError('COOLDOWN');
      if (sender.balance < value) throw new CoinsError('FUNDS', { balance: sender.balance, price: value });
      sender.balance -= value; recipient.balance += value; sender.lastPay = this.now();
      this.save(sender); this.save(recipient); return { balance: sender.balance, amount: value };
    });
  }
  activity(id, kind) {
    return this.transaction(() => {
      const user = this.user(id);
      if (kind === 'chat') { if (user.lastChat && this.now() - user.lastChat < 60000) return 0; user.lastChat = this.now(); if (this.random(1, 100) > 50) { this.save(user); return 0; } }
      const base = kind === 'voice' ? 5 : this.random(2, 5);
      const bonus = user.bonusRemainder + base * RANKS[user.currentRank].bonus;
      const earned = base + Math.floor(bonus / 100); user.bonusRemainder = bonus % 100;
      user.balance = Math.min(LIMIT, user.balance + earned); this.save(user); return earned;
    });
  }
  beginPurchase(id, target, key) {
    return this.once(key, () => {
      const user = this.user(id);
      if (!RANKS[target] || target !== user.currentRank + 1) throw new CoinsError('RANK');
      if (this.pending(id)) throw new CoinsError('PENDING');
      if (user.lastPurchase && this.now() - user.lastPurchase < 5000) throw new CoinsError('COOLDOWN');
      const price = RANKS[target].price;
      if (user.balance < price) throw new CoinsError('FUNDS', { balance: user.balance, price });
      const purchase = { id: randomUUID(), userId: id, previous: user.currentRank, target, price, at: this.now() };
      user.balance -= price; user.lastPurchase = this.now(); this.save(user);
      this.db.prepare('INSERT INTO purchases VALUES(?,?,?)').run(purchase.id, id, JSON.stringify(purchase)); return purchase;
    });
  }
  pending(id) { const row = this.db.prepare('SELECT data FROM purchases WHERE user_id=?').get(id); return row ? JSON.parse(row.data) : null; }
  completePurchase(id) {
    return this.transaction(() => { const purchase = this.pending(id); if (!purchase) return this.user(id); const user = this.user(id); user.currentRank = purchase.target; user.rankHistory.push({ rank: purchase.target, at: purchase.at }); this.save(user); this.db.prepare('DELETE FROM purchases WHERE user_id=?').run(id); return user; });
  }
  all() { return this.db.prepare('SELECT data FROM users').all().map(row => JSON.parse(row.data)); }
  leaderboard() { return this.all().sort((a,b) => b.balance - a.balance || a.userId.localeCompare(b.userId)); }
  meta(key, value) { if (value === undefined) { const row = this.db.prepare('SELECT data FROM meta WHERE key=?').get(key); return row ? JSON.parse(row.data) : null; } this.db.prepare('INSERT INTO meta VALUES(?,?) ON CONFLICT(key) DO UPDATE SET data=excluded.data').run(key, JSON.stringify(value)); return value; }
  newDrop() {
    return this.transaction(() => {
      const roll = this.random(1, 10000);
      const tier = roll <= 10 ? ['Golden', 2500, 5000, 0xffd700] : roll <= 100 ? ['Legendary', 1000, 2000, 0xffa500] : roll <= 600 ? ['Epic', 500, 800, 0xa855f7] : roll <= 2600 ? ['Rare', 200, 400, 0x3498db] : ['Common', 50, 150, 0x57f287];
      const drop = { id: randomUUID(), tier: tier[0], amount: this.random(tier[1], tier[2]), color: tier[3], expires: this.now() + 600000, winner: null, messageId: null };
      this.saveDrop(drop); this.meta('nextDrop', this.now() + this.random(120, 240) * 60000); return drop;
    });
  }
  saveDrop(drop) { this.db.prepare('INSERT INTO drops VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(drop.id, JSON.stringify(drop)); }
  drops() { return this.db.prepare('SELECT data FROM drops').all().map(row => JSON.parse(row.data)); }
  claim(id, userId, messageId) {
    return this.transaction(() => {
      const row = this.db.prepare('SELECT data FROM drops WHERE id=?').get(id); const drop = row && JSON.parse(row.data);
      if (!drop || drop.winner || drop.expires <= this.now() || drop.messageId !== messageId) throw new CoinsError('DROP');
      const user = this.user(userId); user.balance += drop.amount; this.save(user); drop.winner = userId; this.saveDrop(drop); return drop;
    });
  }
}
module.exports = { CoinsStore, CoinsError, RANKS, LIMIT, DAY };
