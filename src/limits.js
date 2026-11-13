// HCI Studio — free limits.
// The app is FREE for about two years: it charges nothing. Provider free
// credits are short-lived, so the two-year free goal is met by
// bring-your-own-key (each user adds their own key) plus tight daily limits
// per person, so no one person can burn through shared credits.
// Limits are per user, per day (UTC), counted from the usage log.
const { db } = require('./db');

const LIMITS = {
  think: parseInt(process.env.LIMIT_THINK_PER_DAY || '20', 10),
  research: parseInt(process.env.LIMIT_RESEARCH_PER_DAY || '10', 10),
  trending: parseInt(process.env.LIMIT_TRENDING_PER_DAY || '10', 10),
  image: parseInt(process.env.LIMIT_IMAGE_PER_DAY || '5', 10),
  chat: parseInt(process.env.LIMIT_CHAT_PER_DAY || '5', 10),
};

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

// Returns null when allowed, or an Error with a plain message when over.
// The OWNER is exempt from daily limits: he is free forever with
// everything unlocked, and the limits exist to protect the shared free
// credits from other users — not to lock the owner out of his own app.
// `user` is the logged-in user row (or a plain user id for old callers).
function checkLimit(user, kind) {
  const userId = user && typeof user === 'object' ? user.id : user;
  if (user && typeof user === 'object' && user.role === 'owner') return null;
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
  return out;
}

module.exports = { LIMITS, usedToday, remainingToday, checkLimit, usageSummary };
