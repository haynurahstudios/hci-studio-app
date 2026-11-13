// HCI Studio — access tiers (the payment model).
//   OWNER: free forever, everything unlocked. The owner never pays.
//   CHOSEN: up to 10 people the owner picks himself are free forever,
//           everything unlocked — anytime someone wins his heart, he makes
//           it free for them. Never automatic, never first-come-first-served:
//           only the owner can grant it, from the admin page (or by telling
//           Muse). Stored as free_forever on the user row.
//   TRIAL: other users get 14 days of FULL access from the day they register.
//          The trial is unlimited — no daily caps while it runs.
//   BASIC: after the trial, the user still gets 2 FREE guided uses a week.
//          A use is one live brain call of any kind (chat, thinking,
//          research, trend search, image). The learning pages stay free
//          forever and never count. After the 2 free times, deep tools
//          need a paid plan.
//   PAID:  reserved for later — payments start after the test. No payment
//          provider is integrated now; the paywall is a clear placeholder.
// This model exists so the cost does not fall on the owner: paying users
// cover the AI costs, the owner stays free.
const { db } = require('./db');
const limits = require('./limits');

const TRIAL_DAYS = 14;
const MAX_CHOSEN = 10;

// How many people the owner has made free so far (owner excluded).
function countChosen() {
  const row = db.prepare("SELECT COUNT(*) AS n FROM users WHERE free_forever = 1 AND role != 'owner'").get();
  return row ? row.n : 0;
}

function trialEndsAtFor(userRow) {
  if (userRow.trial_ends_at) return userRow.trial_ends_at;
  const created = new Date((userRow.created_at || '').replace(' ', 'T') + 'Z');
  return new Date(created.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

// Returns { tier, deepAllowed, trialEndsAt, daysLeft, weeklyLeft, message }.
function getAccess(user) {
  if (!user) return { tier: 'guest', deepAllowed: false, trialEndsAt: null, daysLeft: 0, weeklyLeft: 0, message: 'Please log in first.' };
  if (user.role === 'owner') {
    return { tier: 'owner', deepAllowed: true, trialEndsAt: null, daysLeft: null, weeklyLeft: null, message: 'Owner — free forever, everything unlocked.' };
  }
  if (user.free_forever) {
    return { tier: 'chosen', deepAllowed: true, trialEndsAt: null, daysLeft: null, weeklyLeft: null, message: 'Chosen by the owner — free forever, everything unlocked.' };
  }
  const ends = trialEndsAtFor(user);
  const msLeft = new Date(ends).getTime() - Date.now();
  if (msLeft > 0) {
    const daysLeft = Math.max(1, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
    return { tier: 'trial', deepAllowed: true, trialEndsAt: ends, daysLeft, weeklyLeft: null, message: `Free trial — ${daysLeft} day${daysLeft === 1 ? '' : 's'} of unlimited full access left.` };
  }
  const left = limits.weeklyLeft(user.id);
  if (left > 0) {
    return { tier: 'basic', deepAllowed: true, trialEndsAt: ends, daysLeft: 0, weeklyLeft: left, message: `Your 14-day free trial has ended. You still get 2 free times a week — ${left} left this week.` };
  }
  return { tier: 'basic', deepAllowed: false, trialEndsAt: ends, daysLeft: 0, weeklyLeft: 0, message: 'You have used your 2 free times this week. Deep thinking tools need a paid plan — or wait until next week. Basic access (learning pages) stays free.' };
}

// Express middleware for deep tools: owner + chosen + trial pass, and
// basic users pass while they still have a free time left this week.
function requireDeep(req, res, next) {
  const access = getAccess(req.user);
  if (access.deepAllowed) return next();
  return res.status(402).json({
    error: 'Your 2 free times this week are used up.',
    paywall: true,
    message: 'Deep thinking tools (the chatbot, live research, trend search, image creation) need a paid plan after your 2 free times a week. Payments start after the test — the owner will share how to continue, and payments go to the owner, never to the app itself. Basic access (learning pages) stays free.',
  });
}

module.exports = { TRIAL_DAYS, MAX_CHOSEN, countChosen, getAccess, requireDeep, trialEndsAtFor };
