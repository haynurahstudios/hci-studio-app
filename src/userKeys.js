// HCI Studio — per-user provider keys (bring your own key).
// Each user may store their own provider keys. Their thinking then uses
// their own key and their own free credits; the app itself charges nothing.
// Keys are stored encrypted (AES-256-GCM) with a server secret that lives
// in APP_SECRET or, if unset, in a file under data/ (never in code).
// Keys are never shown back in full — only the last 4 characters.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { db, DATA_DIR } = require('./db');

const SECRET_FILE = path.join(DATA_DIR, 'secret.key');

function serverSecret() {
  if ((process.env.APP_SECRET || '').trim()) return crypto.createHash('sha256').update(process.env.APP_SECRET.trim()).digest();
  try {
    const existing = fs.readFileSync(SECRET_FILE, 'utf8').trim();
    if (existing) return Buffer.from(existing, 'hex');
  } catch (_) { /* no secret file yet */ }
  const secret = crypto.randomBytes(32);
  fs.writeFileSync(SECRET_FILE, secret.toString('hex'), { mode: 0o600 });
  return secret;
}

let SECRET = null;
function secret() {
  if (!SECRET) SECRET = serverSecret();
  return SECRET;
}

function encrypt(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', secret(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { iv: iv.toString('hex'), data: enc.toString('hex'), tag: tag.toString('hex') };
}

function decrypt(rec) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', secret(), Buffer.from(rec.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(rec.tag, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(rec.data, 'hex')), decipher.final()]).toString('utf8');
}

db.exec(`
CREATE TABLE IF NOT EXISTS user_keys (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  iv TEXT NOT NULL,
  data TEXT NOT NULL,
  tag TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, provider)
);
`);

const VALID_PROVIDERS = ['anthropic', 'openai', 'gemini', 'perplexity', 'tavily'];

function setUserKey(userId, provider, key) {
  if (!VALID_PROVIDERS.includes(provider)) throw new Error('Unknown provider: ' + provider);
  const k = String(key || '').trim();
  if (!k) throw new Error('Key is empty.');
  const { iv, data, tag } = encrypt(k);
  db.prepare(
    `INSERT INTO user_keys (user_id, provider, iv, data, tag) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id, provider) DO UPDATE SET iv=excluded.iv, data=excluded.data, tag=excluded.tag, created_at=datetime('now')`
  ).run(userId, provider, iv, data, tag);
}

function getUserKeys(userId) {
  const rows = db.prepare('SELECT provider, iv, data, tag FROM user_keys WHERE user_id = ?').all(userId);
  const out = {};
  for (const row of rows) {
    try { out[row.provider] = decrypt(row); } catch (_) { /* corrupted entry: skip it */ }
  }
  return out;
}

function listUserKeys(userId) {
  const rows = db.prepare('SELECT provider, created_at FROM user_keys WHERE user_id = ?').all(userId);
  return rows.map((r) => ({ provider: r.provider, created_at: r.created_at }));
}

function deleteUserKey(userId, provider) {
  db.prepare('DELETE FROM user_keys WHERE user_id = ? AND provider = ?').run(userId, provider);
}

module.exports = { setUserKey, getUserKeys, listUserKeys, deleteUserKey, VALID_PROVIDERS };
