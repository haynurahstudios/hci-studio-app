// HCI Studio — access tiers (the payment model).
//   OWNER: free forever, everything unlocked. The owner never pays.
//   CHOSEN: up to 10 people the owner picks himself are free forever,
//           everything unlocked — anytime someone wins his heart, he makes
//           it free for them. Never automatic, never first-come-first-served:
//           only the owner can grant it, from the admin page (or by telling
//           Muse). Stored as free_forever on the user row.
//   TRIAL: other users get 14 days of FULL access from the day they register.
//   BASIC: after the trial, deep thinking tools lock. Basic access stays free:
//          learning pages, and simple chatting with HCI.
//   PAID:  reserved for later — payments start after the test. No payment
//          provider is integrated now; the paywall is a clear placeholder.
// This model exists so the cost does not fall on the owner: paying users
// cover the AI costs, the owner stays free.
const { db } = require('./db');

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

// Returns { tier, deepAllowed, trialEndsAt, daysLeft, message }.
function getAccess(user) {
  if (!user) return { tier: 'guest', deepAllowed: false, trialEndsAt: null, daysLeft: 0, message: 'Please log in first.' };
  if (user.role === 'owner') {
    return { tier: 'owner', deepAllowed: true, trialEndsAt: null, daysLeft: null, message: 'Owner — free forever, everything unlocked.' };
  }
  if (user.free_forever) {
    return { tier: 'chosen', deepAllowed: true, trialEndsAt: null, daysLeft: null, message: 'Chosen by the owner — free forever, everything unlocked.' };
  }
  const ends = trialEndsAtFor(user);
  const msLeft = new Date(ends).getTime() - Date.now();
  if (msLeft > 0) {
    const daysLeft = Math.max(1, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
    return { tier: 'trial', deepAllowed: true, trialEndsAt: ends, daysLeft, message: `Free trial — ${daysLeft} day${daysLeft === 1 ? '' : 's'} of full access left.` };
  }
  return { tier: 'basic', deepAllowed: false, trialEndsAt: ends, daysLeft: 0, message: 'Your 14-day free trial has ended. Deep thinking tools are locked. Basic access stays free.' };
}

// Express middleware for deep tools: owner + trial pass, basic gets a 402.
function requireDeep(req, res, next) {
  const access = getAccess(req.user);
  if (access.deepAllowed) return next();
  return res.status(402).json({
    error: 'Your 14-day free trial has ended.',
    paywall: true,
    message: 'Deep thinking tools (live research, trend search, image creation and the full step-by-step prompt studio) need a paid plan. Payments start after the test — the owner will share how to continue, and payments go to the owner, never to the app itself. Basic access (learning pages and simple chatting with HCI) stays free.',
  });
}

module.exports = { TRIAL_DAYS, MAX_CHOSEN, countChosen, getAccess, requireDeep, trialEndsAtFor };
