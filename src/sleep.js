// HCI Studio — the sleep window.
// The app sleeps every day from 12:00 AM to 5:00 AM Nigeria time
// (Africa/Lagos, WAT) for everyone EXCEPT the owner. The owner can use
// the app anytime, including during the sleep hours. During those hours
// the app relaxes — no pressure, no work for anyone else — but the owner
// passes straight through.
// The window is always computed in the Africa/Lagos timezone, never in
// the server's local timezone: a server running in UTC still sleeps
// 00:00–05:00 Lagos time.
const TIMEZONE = 'Africa/Lagos';
const SLEEP_START_HOUR = 0; // 12:00 AM
const SLEEP_END_HOUR = 5; // 5:00 AM
const WINDOW_TEXT = '12:00 AM – 5:00 AM Nigeria time';
const WAKES_AT_TEXT = '5:00 AM Nigeria time';

// Test-only override: set HCI_FAKE_NOW to an ISO date string to pretend
// the current time is that moment. It exists so the regression suite can
// simulate a time inside the sleep window and one outside it. Never set
// it in production — real time always wins there.
function now() {
  if (process.env.HCI_FAKE_NOW) {
    const d = new Date(process.env.HCI_FAKE_NOW);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

const lagosHourFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIMEZONE,
  hour: 'numeric',
  hourCycle: 'h23',
});

// The hour of the day (0–23) in Nigeria time for a given moment.
function lagosHour(date) {
  return Number(lagosHourFmt.format(date));
}

// True when the given moment falls inside the sleep window
// (00:00–04:59 Nigeria time). 05:00 is awake again.
function isAsleep(date) {
  const d = date || now();
  const h = lagosHour(d);
  return h >= SLEEP_START_HOUR && h < SLEEP_END_HOUR;
}

function sleepStatus(date) {
  const asleep = isAsleep(date);
  return {
    asleep,
    window: WINDOW_TEXT,
    timezone: TIMEZONE,
    wakesAt: WAKES_AT_TEXT,
    ownerExempt: true,
    note: asleep
      ? 'HCI is sleeping. Back at 5:00 AM Nigeria time. The owner is exempt and can use the app anytime.'
      : 'HCI is awake. The app sleeps every day from 12:00 AM to 5:00 AM Nigeria time; the owner is exempt and can use the app anytime.',
  };
}

// Short statement for the status endpoint and the README.
const SLEEP_STATUS =
  'HCI sleeps every day from 12:00 AM to 5:00 AM Nigeria time (Africa/Lagos). ' +
  'During those hours the studio rests and does not serve, think, research, create images, or build anything. ' +
  'The owner is exempt and can use the app anytime.';

// The sleeping page — what anyone who is not the owner sees when they
// open the app during the sleep hours. Self-contained (inline CSS only)
// so it needs nothing from the server except the logo at /logo.png.
function sleepPageHtml() {
  return '<!DOCTYPE html>\n' +
    '<html lang="en">\n' +
    '<head>\n' +
    '<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '<title>HCI is sleeping — HCI Studio</title>\n' +
    '<style>\n' +
    '  body { margin:0; min-height:100vh; background:#0E101C; color:#f2ead9; font-family:Georgia, "Times New Roman", serif; display:flex; align-items:center; justify-content:center; text-align:center; padding:24px; box-sizing:border-box; }\n' +
    '  .card { max-width:520px; }\n' +
    '  img.logo { width:160px; height:160px; border-radius:50%; }\n' +
    '  h1 { color:#D9B36A; font-size:32px; margin:20px 0 8px; }\n' +
    '  p { font-size:18px; line-height:1.6; color:#cfc6ae; }\n' +
    '  .back { color:#D9B36A; font-size:20px; margin-top:16px; }\n' +
    '  .credit { margin-top:28px; font-size:13px; color:#8d8570; }\n' +
    '</style>\n' +
    '</head>\n' +
    '<body>\n' +
    '  <div class="card">\n' +
    '    <img class="logo" src="/logo.png" alt="HCI logo">\n' +
    '    <h1>HCI is sleeping</h1>\n' +
    '    <p>The studio is resting now, my dear. It is not serving, thinking, researching, creating images or building anything while it sleeps. Rest well, and come back with fresh eyes.</p>\n' +
    '    <p class="back">Back at 5:00 AM Nigeria time.</p>\n' +
    '    <div class="credit">Made by Haynurah, the founder of Haynurah Studios.</div>\n' +
    '  </div>\n' +
    '</body>\n' +
    '</html>\n';
}

// Express middleware. Runs on every request, before the routes.
// - Awake: everything passes through normally.
// - Asleep and the logged-in user is the owner: passes straight through.
// - Asleep and anyone else (student or guest): the sleeping page for
//   pages (HTTP 503), a short sleeping JSON message for API calls.
// - /api/status and /logo.png always pass through, so the status can
//   report the sleep and the sleeping page can show the logo.
function sleepMiddleware(req, res, next) {
  if (!isAsleep()) return next();
  if (req.user && req.user.role === 'owner') return next();
  if (req.path === '/api/status' || req.path === '/logo.png') return next();
  if (req.path.startsWith('/api/')) {
    return res.status(503).json({
      error: 'HCI is sleeping. The studio rests from 12:00 AM to 5:00 AM Nigeria time. Back at 5:00 AM Nigeria time.',
      asleep: true,
      wakesAt: WAKES_AT_TEXT,
      ownerExempt: true,
    });
  }
  return res.status(503).type('text/html; charset=utf-8').send(sleepPageHtml());
}

module.exports = {
  TIMEZONE,
  SLEEP_START_HOUR,
  SLEEP_END_HOUR,
  WINDOW_TEXT,
  WAKES_AT_TEXT,
  SLEEP_STATUS,
  lagosHour,
  isAsleep,
  sleepStatus,
  sleepPageHtml,
  sleepMiddleware,
};
