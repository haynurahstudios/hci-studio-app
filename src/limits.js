// HCI Studio — free limits.
// The app is FREE for about two years: it charges nothing. Provider free
// credits are short-lived, so the two-year free goal is met by
// bring-your-own-key (each user adds their own key) plus limits that keep
// no one person burning through shared credits.
// The free rule, as the owner set it:
//   OWNER and CHOSEN (the up to 10 he names): free forever, unlimited.
//   TRIAL (first 14 days): unlimited — full access to everything.
//   AFTER THE TRIAL: 2 free guided uses per week. A "use" is one live
//   brain call of any kind (chat, thinking, research, trend search,
//   image). The learning pages stay free forever and never count.
// Daily per-kind caps still guard the shared free credits for users who
// are not unlimited; the weekly cap binds first for basic users.
// Limits are counted from the usage log.
const { db } = require('./db');

const LIMITS = {
  think: parseInt(process.env.LIMIT_THINK_PER_DAY || '20', 10),
  research: parseInt(process.env.LIMIT_RESEARCH_PER_DAY || '10', 10),
  trending: parseInt(process.env.LIMIT_TRENDING_PER_DAY || '10', 10),
  image: parseInt(process.env.LIMIT_IMAGE_PER_DAY || '5', 10),
  chat: parseInt(process.env.LIMIT_CHAT_PER_DAY || '5', 10),
};

// Free guided uses per week after the trial ends.
const WEEKLY_FREE = 2;
// Kinds that count as one guided use of the live brain.
const BRAIN_KINDS = ['chat', 'think', 'research', 'trending', 'image'];

function usedToday(userId, kind) {
  const row = db.prepare(
    `SELECT COUNT(*) AS n FROM usage_log
     WHERE user_id = ? AND kind = ? AND ok = 1 AND date(created_at) = date('now')`
  ).get(userId, kind);
  return row ? row.n : 0;
}

function remainingToday(userId, kind) {
  return Math.max(0, (LIMITS[kind] || 0) - usedToday(userId, kind));
}

// Live brain calls in the last 7 days (successful only).
function weeklyUses(userId) {
  const row = db.prepare(
    `SELECT COUNT(*) AS n FROM usage_log
     WHERE user_id = ? AND ok = 1 AND kind IN (${BRAIN_KINDS.map(() => '?').join(',')})
       AND datetime(created_at) >= datetime('now', '-7 days')`
  ).get(userId, ...BRAIN_KINDS);
  return row ? row.n : 0;
}

function weeklyLeft(userId) {
  return Math.max(0, WEEKLY_FREE - weeklyUses(userId));
}

// DB timestamps are 'YYYY-MM-DD HH:MM:SS' (UTC); ISO strings carry a Z.
function parseDbTime(s) {
  if (!s) return NaN;
  const t = String(s).trim().replace(' ', 'T');
  return new Date(t.endsWith('Z') ? t : t + 'Z').getTime();
}

// Is this user inside their 14-day free trial right now?
function isTrial(user) {
  if (!user || typeof user !== 'object') return false;
  if (user.role === 'owner' || user.free_forever) return false;
  const ends = user.trial_ends_at
    ? parseDbTime(user.trial_ends_at)
    : parseDbTime(user.created_at) + 14 * 24 * 60 * 60 * 1000;
  return Number.isFinite(ends) && ends > Date.now();
}

// Unlimited users: the owner, the chosen ten, and anyone inside their
// 14-day trial. The limits exist to protect the shared free credits —
// not to lock the owner out of his own app, and not to ration a trial
// the owner promised as unlimited.
function isUnlimited(user) {
  if (!user || typeof user !== 'object') return false;
  return user.role === 'owner' || Boolean(user.free_forever) || isTrial(user);
}

// Returns null when allowed, or an Error with a plain message when over.
// `user` is the logged-in user row (or a plain user id for old callers).
function checkLimit(user, kind) {
  const userId = user && typeof user === 'object' ? user.id : user;
  if (isUnlimited(user)) return null;
  const limit = LIMITS[kind];
  if (!limit) return null;
  if (usedToday(userId, kind) >= limit) {
    return new Error(
      `Free limit reached for today: ${kind} is limited to ${limit} uses per person per day, so the free credits last. It resets tomorrow. The app itself charges nothing.`
    );
  }
  return null;
}

function usageSummary(userId) {
  const out = {};
  for (const kind of Object.keys(LIMITS)) {
    out[kind] = { limit: LIMITS[kind], used: usedToday(userId, kind), remaining: remainingToday(userId, kind) };
  }
  out.weekly = { limit: WEEKLY_FREE, used: weeklyUses(userId), remaining: weeklyLeft(userId) };
  return out;
}

module.exports = { LIMITS, WEEKLY_FREE, BRAIN_KINDS, usedToday, remainingToday, weeklyUses, weeklyLeft, isTrial, isUnlimited, checkLimit, usageSummary };
