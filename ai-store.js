'use strict';
const DEFAULTS = Object.freeze({ enabled: true, web: true, memory: true, actions: true, vision: true, files: true, maxOutputTokens: 1800, dailyRequests: 60, dailyTokens: 150000, dailyWeb: 20, concurrent: 3, knowledgeChannels: ['1541369624644554772'] });
function cleanName(value) {
  const name = String(value).normalize('NFKC').replace(/[@<>*_`~|\\\[\]\r\n\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, '').trim();
  if (name.length < 2 || name.length > 24) throw new Error('NAME');
  return name;
}
class AIStore {
  constructor(db) {
    this.db = db;
    db.exec('CREATE TABLE IF NOT EXISTS ai_profiles(id TEXT PRIMARY KEY, data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS ai_usage(id TEXT, day TEXT, requests INTEGER DEFAULT 0, tokens INTEGER DEFAULT 0, web INTEGER DEFAULT 0, PRIMARY KEY(id,day)); CREATE TABLE IF NOT EXISTS ai_settings(id TEXT PRIMARY KEY, data TEXT NOT NULL);');
  }
  get(id) {
    if (!/^\d{1,22}$/.test(id)) throw new Error('USER');
    const row = this.db.prepare('SELECT data FROM ai_profiles WHERE id=?').get(id);
    return row ? JSON.parse(row.data) : this.save({ userId: id, assistantName: 'Roei AI', preferredLanguage: 'auto', responseStyle: 'רגיל', preferences: '', memorySummary: '', recentMessages: [], conversationId: null, privateConversationId: null, turns: 0, privateTurns: 0, privateSummary: '', privateRecent: [], messageCount: 0, createdAt: Date.now() });
  }
  save(p) { p.updatedAt = Date.now(); this.db.prepare('INSERT INTO ai_profiles VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(p.userId, JSON.stringify(p)); return p; }
  settings(patch) {
    const row = this.db.prepare("SELECT data FROM ai_settings WHERE id='global'").get();
    const value = { ...DEFAULTS, ...(row ? JSON.parse(row.data) : {}), ...patch };
    if (patch) this.db.prepare("INSERT INTO ai_settings VALUES('global',?) ON CONFLICT(id) DO UPDATE SET data=excluded.data").run(JSON.stringify(value));
    return value;
  }
  usage(id, add = {}) {
    const day = new Date().toISOString().slice(0,10);
    this.db.prepare('INSERT INTO ai_usage(id,day,requests,tokens,web) VALUES(?,?,?,?,?) ON CONFLICT(id,day) DO UPDATE SET requests=requests+excluded.requests,tokens=tokens+excluded.tokens,web=web+excluded.web').run(id, day, add.requests || 0, add.tokens || 0, add.web || 0);
    this.db.prepare('DELETE FROM ai_usage WHERE day < ?').run(new Date(Date.now()-7*86400000).toISOString().slice(0,10));
    return this.db.prepare('SELECT requests,tokens,web FROM ai_usage WHERE id=? AND day=?').get(id,day);
  }
}
module.exports = { AIStore, cleanName, DEFAULTS };
