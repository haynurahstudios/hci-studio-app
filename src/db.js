// HCI Studio — database (SQLite, file-based, no separate server).
// Uses Node's built-in node:sqlite — no extra dependency.
// DATA_DIR: where the database, user keys, images and sites live.
// On hosting that resets the app folder on every deploy, set DATA_DIR to a
// persistent volume (e.g. /data on Railway) so accounts and projects survive
// redeploys. Defaults to the app's own data/ folder. The knowledge base
// (knowledge.json, tutorials.json) always stays in the app's data/ folder.
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(path.join(DATA_DIR, 'images'), { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'hci-studio.db'));
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT '',
  data_json TEXT NOT NULL DEFAULT '{}',
  prompt_text TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS usage_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  kind TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT '',
  ok INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id INTEGER,
  prompt TEXT NOT NULL,
  style TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  file_path TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id INTEGER,
  title TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'showcase',
  file_path TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

// Trial / plan columns — must run AFTER the tables above exist.
// (SQLite has no ADD COLUMN IF NOT EXISTS, so failures mean "already there".)
for (const [col, def] of [
  ['plan', "TEXT NOT NULL DEFAULT 'trial'"],
  ['trial_ends_at', 'TEXT'],
  ['free_forever', 'INTEGER NOT NULL DEFAULT 0'],
  // Privacy: "use my chats to improve the AI" — ON by default for everyone.
  // The person can turn it off anytime from Settings.
  ['improve_ai', 'INTEGER NOT NULL DEFAULT 1'],
]) {
  try { db.exec(`ALTER TABLE users ADD COLUMN ${col} ${def};`); } catch (_) { /* already there */ }
}
// Backfill: any user without a trial end gets 14 days from account creation.
try {
  db.exec(`UPDATE users SET trial_ends_at = datetime(created_at, '+14 days') WHERE trial_ends_at IS NULL;`);
  db.exec(`UPDATE users SET plan = 'owner' WHERE role = 'owner';`);
} catch (_) { /* table was fresh; defaults already apply */ }

function logUsage(userId, kind, provider, model, detail, ok = true) {
  try {
    db.prepare(
      'INSERT INTO usage_log (user_id, kind, provider, model, detail, ok) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(userId || null, kind, provider || '', model || '', detail || '', ok ? 1 : 0);
  } catch (_) {
    // Usage logging must never break the request it measures.
  }
}

module.exports = { db, logUsage, DATA_DIR };
