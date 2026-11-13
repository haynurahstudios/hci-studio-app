// HCI Studio — server.
// An independent web app. Not a Muse artifact, not a Muse space.
// Run it with:  npm install && npm start   (then open http://127.0.0.1:3000)
// It works from a link on any phone: the server runs on a host, the student
// opens it in the browser. On-device thinking is out — the owner's phone
// and computer are weak, so the thinking happens through provider APIs.
const fs = require('node:fs');
const path = require('node:path');

// Tiny .env loader (no dependency): KEY=VALUE lines, # comments.
(function loadEnv() {
  const file = path.join(__dirname, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i <= 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (!(key in process.env)) process.env[key] = val;
  }
})();

const express = require('express');
const { db, logUsage, DATA_DIR } = require('./src/db');
const auth = require('./src/auth');
const providers = require('./src/providers');
const { getUserKeys, setUserKey, listUserKeys, deleteUserKey } = require('./src/userKeys');
const limits = require('./src/limits');
const access = require('./src/access');
const { trending } = require('./src/search');
const { knowledge, tutorials } = require('./src/knowledge');
const { platformList, PLATFORMS } = require('./src/platforms');
const { assemble } = require('./src/assemble');
const muse = require('./src/muse');
const website = require('./src/website');
const { DECENCY_STATUS } = require('./src/ruling');
const sleep = require('./src/sleep');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(auth.authMiddleware);
app.use(sleep.sleepMiddleware);

const DOWNLOADS = {
  'HCI_New_Share_Pack_for_Claude.zip': path.join(__dirname, 'downloads', 'HCI_New_Share_Pack_for_Claude.zip'),
  'HCI_New_Share_Pack_for_ChatGPT_and_Others.zip': path.join(__dirname, 'downloads', 'HCI_New_Share_Pack_for_ChatGPT_and_Others.zip'),
};

function cookieHeader(token) {
  return `hci_session=${token}; HttpOnly; Path=/; Max-Age=${30 * 24 * 60 * 60}; SameSite=Lax`;
}

function userKeysFor(req) {
  return req.user ? getUserKeys(req.user.id) : {};
}

// ---------- Status ----------
app.get('/api/status', (req, res) => {
  const keys = userKeysFor(req);
  const k = knowledge();
  res.json({
    app: 'HCI Studio',
    credit: 'Made by Haynurah, the founder of Haynurah Studios.',
    tagline: 'IMAGINE WITHOUT LIMITS. RESEARCH WITH INTELLIGENCE. CREATE WITH DIRECTION.',
    ruling: DECENCY_STATUS,
    sleep: sleep.sleepStatus(),
    brain: providers.brainStatus(keys),
    assistant: { name: 'Muse', note: 'Your own assistant inside the studio. She guides you step by step, answers questions, and helps with prompts — warm, direct, plain words, honest about what she does not know.' },
    availability: 'For the owner’s students, anywhere in the world. No region restriction, no country blocking. Any student, anywhere, can use it.',
    features: { prompts: true, images: true, websites: true, video: false },
    access: access.getAccess(req.user),
    payment: {
      owner: 'Free forever, everything unlocked.',
      chosen: 'The owner chooses up to 10 people to be free forever, everything unlocked. Anytime someone wins his heart, he makes it free for them.',
      trial: '14 days free, full access to everything.',
      afterTrial: 'Deep thinking tools (live research, trend search, image creation, the full step-by-step prompt studio) need a paid plan. Payments start after the test — no payment provider is integrated yet. Users who do not pay keep basic access: the learning pages and simple chatting with HCI.',
      moneyFlow: 'When users pay, the money goes to the owner. He is the builder and creator, so he earns from it: subscription payments come to him, the AI thinking costs are paid out of that revenue, and the remainder is his earnings. The app never takes payments for itself and never routes them anywhere except the owner’s account. Natural option: Selar (he already sells his lessons through Selar, in Naira and dollars). Alternatives: Stripe or Paystack. The final provider choice is his, after the test.',
      note: 'This model exists so the cost does not fall on the owner: paying users cover the AI costs, the owner stays free.',
    },
    limits: req.user ? limits.usageSummary(req.user.id) : null,
    knowledgeLoaded: Array.isArray(k.styles) && k.styles.length > 0,
    video: { available: false, note: 'Video generation is paused — it needs a server or a heavy device. The studio hands you a production-ready prompt for Kling, Flow or Creen AI instead.' },
    user: req.user ? { id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role } : null,
  });
});

// ---------- Auth ----------
app.post('/api/auth/register', (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!name) return res.status(400).json({ error: 'Please enter your name.' });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'Please enter a real email address.' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(400).json({ error: 'An account with that email already exists. Log in instead.' });
  const count = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  const role = count === 0 ? 'owner' : 'user';
  const trialEnds = new Date(Date.now() + access.TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const info = db.prepare('INSERT INTO users (email, name, password_hash, role, plan, trial_ends_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    email, name, auth.hashPassword(password), role, role === 'owner' ? 'owner' : 'trial', role === 'owner' ? null : trialEnds
  );
  const user = { id: info.lastInsertRowid, email, name, role };
  const session = auth.createSession(user.id);
  res.setHeader('Set-Cookie', cookieHeader(session.token));
  res.json({ user, ownerNote: role === 'owner' ? 'You are the first account, so you are the owner. You can see all accounts and delete any of them.' : null });
});

app.post('/api/auth/login', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!row || !auth.checkPassword(password, row.password_hash)) {
    return res.status(401).json({ error: 'Email or password is wrong.' });
  }
  const session = auth.createSession(row.id);
  res.setHeader('Set-Cookie', cookieHeader(session.token));
  res.json({ user: { id: row.id, email: row.email, name: row.name, role: row.role } });
});

app.post('/api/auth/logout', (req, res) => {
  auth.destroySession(auth.parseCookies(req).hci_session);
  res.setHeader('Set-Cookie', 'hci_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax');
  res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  if (!req.user) return res.json({ user: null });
  res.json({ user: { id: req.user.id, email: req.user.email, name: req.user.name, role: req.user.role } });
});

// ---------- My provider keys (bring your own key) ----------
app.get('/api/keys', auth.requireLogin, (req, res) => {
  res.json({ keys: listUserKeys(req.user.id), providers: providers.PROVIDER_META });
});

app.post('/api/keys', auth.requireLogin, (req, res) => {
  try {
    setUserKey(req.user.id, String(req.body?.provider || ''), String(req.body?.key || ''));
    res.json({ ok: true, keys: listUserKeys(req.user.id) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/keys/:provider', auth.requireLogin, (req, res) => {
  deleteUserKey(req.user.id, req.params.provider);
  res.json({ ok: true, keys: listUserKeys(req.user.id) });
});

// ---------- Knowledge, tutorials, tools ----------
app.get('/api/knowledge', (req, res) => res.json(knowledge()));
app.get('/api/tutorials', (req, res) => res.json(tutorials()));
app.get('/api/platforms', (req, res) => res.json(platformList()));

// ---------- Ideas: trending + directions (live brain — deep tools) ----------
app.post('/api/idea/trending', auth.requireLogin, access.requireDeep, async (req, res) => {
  const over = limits.checkLimit(req.user, 'trending');
  if (over) return res.status(429).json({ error: over.message });
  try {
    const result = await trending(String(req.body?.topic || ''), userKeysFor(req));
    logUsage(req.user.id, 'trending', result.source || '', '', 'topic=' + String(req.body?.topic || ''), result.available !== false);
    if (result.available === false) return res.json(result);
    res.json(result);
  } catch (e) {
    console.error('trending failed:', String(e.message).slice(0, 300));
    logUsage(req.user.id, 'trending', '', '', String(e.message).slice(0, 200), false);
    res.status(502).json({ error: 'Live search failed: ' + String(e.message).slice(0, 300) });
  }
});

app.post('/api/idea/directions', auth.requireLogin, access.requireDeep, async (req, res) => {
  const over = limits.checkLimit(req.user, 'think');
  if (over) return res.status(429).json({ error: over.message });
  const keys = userKeysFor(req);
  if (!providers.hasBrain(keys)) {
    return res.status(503).json({
      error: 'The live brain needs a key. No AI key is set — add your own key in Settings (your key stays yours, and your thinking uses your own free credits), or ask the owner to set one. The studio can still build prompts from its built-in knowledge without a key.',
    });
  }
  const topic = String(req.body?.topic || '').trim();
  const platform = String(req.body?.platform || '').trim();
  if (!topic) return res.status(400).json({ error: 'Tell the studio what the idea is about, or use trending ideas first.' });
  try {
    const platformNote = PLATFORMS[platform] ? ` The finished work is for ${PLATFORMS[platform].name}: ${PLATFORMS[platform].clip}. ${PLATFORMS[platform].audio}` : (platform ? ` The finished work is for ${platform} — your own platform, not in the registry, so keep the clip short and verify length and audio on the platform.` : '');
    const out = await providers.think(
      [{ role: 'user', content:
        `You are HCI. A student has no idea and wants fresh, original directions about: ${topic}.${platformNote}\n` +
        'Give THREE functionally distinct directions. For each: a title, a 2-3 sentence story, the visual style mix (one style leads, one supports, and why the mix works), and a profile scored weak/adequate/strong with one reason each on originality, value, surprise, coherence and feasibility. ' +
        'Then recommend ONE direction and name the strongest alternative. Refuse clichés (a perfume bottle on marble at golden hour, a lone figure on a mountain ridge, a robot that learns to feel). ' +
        'Reply as JSON only: {"directions":[{"title":"...","story":"...","styleLead":"...","styleSupport":"...","mixWhy":"...","scores":{"originality":"strong","value":"strong","surprise":"adequate","coherence":"strong","feasibility":"strong"},"scoreReasons":{"originality":"...","value":"...","surprise":"...","coherence":"...","feasibility":"..."}}],"recommendation":"...","alternative":"..."}' }],
      { system: 'You are HCI, Haynurah Creative Intelligence. Think in plain words. Evaluate creativity as a profile, never a single score. Never invent evidence.', temperature: 0.9 },
      keys
    );
    logUsage(req.user.id, 'think', out.provider, out.model, 'directions topic=' + topic.slice(0, 80), true);
    let parsed = null;
    try {
      const m = out.text.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : null;
    } catch (_) { parsed = null; }
    if (parsed && Array.isArray(parsed.directions)) return res.json({ ...parsed, provider: out.provider, model: out.model });
    res.json({ raw: out.text, provider: out.provider, model: out.model, note: 'The brain answered in words, not JSON. Read it as three directions and pick one.' });
  } catch (e) {
    console.error('directions failed:', String(e.message).slice(0, 300));
    logUsage(req.user.id, 'think', '', '', String(e.message).slice(0, 200), false);
    res.status(502).json({ error: 'The brain could not answer: ' + String(e.message).slice(0, 300) });
  }
});

// ---------- Muse, the in-app assistant ----------
// Guide tips are built-in knowledge — no key, no login, no limit.
app.get('/api/muse/tip', (req, res) => {
  res.json(muse.museTip(req.query.step || 0));
});

app.get('/api/muse/greeting', auth.requireLogin, (req, res) => {
  res.json({ greeting: muse.museGreeting(req.user) });
});

// ---------- Basic chatting with Muse (stays free for everyone, including basic tier) ----------
// Simple questions and short answers. Deep thinking tools are separate.
app.post('/api/chat', auth.requireLogin, async (req, res) => {
  const over = limits.checkLimit(req.user, 'chat');
  if (over) return res.status(429).json({ error: over.message });
  const keys = userKeysFor(req);
  if (!providers.hasBrain(keys)) {
    return res.status(503).json({
      error: 'Muse needs a key to answer live. No AI key is set — add your own key in Settings, or ask the owner to set one. The learning pages still work without a key.',
    });
  }
  const message = String(req.body?.message || '').trim();
  if (!message) return res.status(400).json({ error: 'Write a message first.' });
  try {
    const out = await providers.think(
      [{ role: 'user', content: message }],
      { system: muse.museSystemPrompt(req.user), temperature: 0.7, maxTokens: 800 },
      keys
    );
    logUsage(req.user.id, 'chat', out.provider, out.model, message.slice(0, 80), true);
    res.json({ reply: out.text, provider: out.provider, assistant: 'Muse' });
  } catch (e) {
    console.error('chat failed:', String(e.message).slice(0, 300));
    logUsage(req.user.id, 'chat', '', '', String(e.message).slice(0, 200), false);
    res.status(502).json({ error: 'Muse could not answer: ' + String(e.message).slice(0, 300) });
  }
});

// ---------- Studio: prompt assembly (works with NO key — deep tool) ----------
app.post('/api/studio/prompt', auth.requireLogin, access.requireDeep, (req, res) => {
  const result = assemble(req.body || {});
  if (!result.ok) {
    return res.status(400).json({ error: 'The prompt is not complete yet. These steps are missing: ' + result.missing.join(', ') + '. No step is skipped.', missing: result.missing });
  }
  res.json(result);
});

// ---------- Studio: image creation (needs an image key — deep tool) ----------
app.post('/api/studio/image', auth.requireLogin, access.requireDeep, async (req, res) => {
  const over = limits.checkLimit(req.user, 'image');
  if (over) return res.status(429).json({ error: over.message });
  const keys = userKeysFor(req);
  if (!providers.keyFor('openai', keys)) {
    return res.status(503).json({ error: 'Image creation needs an OpenAI key. Add your own key in Settings, or ask the owner to set one. The studio will not pretend to create an image it cannot make.' });
  }
  const prompt = String(req.body?.prompt || '').trim();
  const style = String(req.body?.style || 'cinematic realism').trim();
  if (!prompt) return res.status(400).json({ error: 'Describe the image first.' });
  try {
    const img = await providers.createImage(prompt, style, keys);
    const id = db.prepare('INSERT INTO images (user_id, project_id, prompt, style, model, file_path) VALUES (?, ?, ?, ?, ?, ?)').run(
      req.user.id, req.body?.projectId || null, prompt, style, img.model, ''
    ).lastInsertRowid;
    const filePath = path.join(DATA_DIR, 'images', id + '.png');
    fs.writeFileSync(filePath, Buffer.from(img.base64, 'base64'));
    db.prepare('UPDATE images SET file_path = ? WHERE id = ?').run(filePath, id);
    logUsage(req.user.id, 'image', img.provider, img.model, style, true);
    res.json({ id, url: '/api/images/' + id, model: img.model, style });
  } catch (e) {
    console.error('image failed:', String(e.message).slice(0, 300));
    logUsage(req.user.id, 'image', 'openai', '', String(e.message).slice(0, 200), false);
    res.status(502).json({ error: 'Image creation failed: ' + String(e.message).slice(0, 300) });
  }
});

app.get('/api/images/:id', auth.requireLogin, (req, res) => {
  const row = db.prepare('SELECT * FROM images WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Image not found.' });
  if (row.user_id !== req.user.id && req.user.role !== 'owner') return res.status(403).json({ error: 'That image is not yours.' });
  if (!fs.existsSync(row.file_path)) return res.status(404).json({ error: 'Image file is gone.' });
  res.type('image/png').sendFile(row.file_path);
});

// ---------- Projects ----------
app.get('/api/projects', auth.requireLogin, (req, res) => {
  const rows = db.prepare('SELECT id, title, platform, updated_at, created_at FROM projects WHERE user_id = ? ORDER BY updated_at DESC').all(req.user.id);
  res.json(rows);
});

app.get('/api/projects/:id', auth.requireLogin, (req, res) => {
  const row = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: 'Project not found.' });
  res.json({ ...row, data: JSON.parse(row.data_json || '{}') });
});

app.post('/api/projects', auth.requireLogin, access.requireDeep, (req, res) => {
  const title = String(req.body?.title || 'Untitled project').trim();
  const info = db.prepare('INSERT INTO projects (user_id, title, platform, data_json, prompt_text) VALUES (?, ?, ?, ?, ?)').run(
    req.user.id, title, String(req.body?.platform || ''), JSON.stringify(req.body?.data || {}), String(req.body?.prompt || '')
  );
  res.json({ id: info.lastInsertRowid });
});

app.put('/api/projects/:id', auth.requireLogin, access.requireDeep, (req, res) => {
  const row = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: 'Project not found.' });
  db.prepare('UPDATE projects SET title = ?, platform = ?, data_json = ?, prompt_text = ?, updated_at = datetime(\'now\') WHERE id = ?').run(
    String(req.body?.title || 'Untitled project').trim(), String(req.body?.platform || ''),
    JSON.stringify(req.body?.data || {}), String(req.body?.prompt || ''), req.params.id
  );
  res.json({ ok: true });
});

app.delete('/api/projects/:id', auth.requireLogin, (req, res) => {
  db.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

// ---------- Usage ----------
app.get('/api/usage/me', auth.requireLogin, (req, res) => {
  res.json(limits.usageSummary(req.user.id));
});

app.get('/api/usage', auth.requireOwner, (req, res) => {
  const totals = db.prepare(
    `SELECT kind, COUNT(*) AS n FROM usage_log WHERE date(created_at) = date('now') GROUP BY kind`
  ).all();
  const byUser = db.prepare(
    `SELECT u.email, u.name, ul.kind, COUNT(*) AS n FROM usage_log ul JOIN users u ON u.id = ul.user_id
     WHERE date(ul.created_at) = date('now') GROUP BY u.email, ul.kind ORDER BY u.email`
  ).all();
  res.json({ today: totals, byUser });
});

// ---------- Owner admin ----------
app.get('/api/admin/users', auth.requireOwner, (req, res) => {
  const rows = db.prepare('SELECT id, email, name, role, created_at, trial_ends_at, free_forever FROM users ORDER BY created_at ASC').all();
  res.json(rows.map((r) => ({ ...r, access: access.getAccess(r) })));
});

// The owner makes one person free forever (up to 10 people), or takes it back.
// Only the owner can grant it — never automatic. Tell Muse a name and she can
// do it too, but the button below is the owner's own hand.
app.post('/api/admin/users/:id/free', auth.requireOwner, (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT id, name, role, free_forever FROM users WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Account not found.' });
  if (row.role === 'owner') return res.status(400).json({ error: 'The owner is already free forever.' });
  if (row.free_forever) return res.json({ ok: true, message: row.name + ' is already free forever.' });
  if (access.countChosen() >= access.MAX_CHOSEN) {
    return res.status(400).json({ error: 'You have already made 10 people free. Take it back from someone first, then choose another.' });
  }
  db.prepare("UPDATE users SET free_forever = 1, plan = 'chosen' WHERE id = ?").run(id);
  res.json({ ok: true, message: row.name + ' is now free forever, everything unlocked.' });
});

app.delete('/api/admin/users/:id/free', auth.requireOwner, (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT id, name, role, free_forever FROM users WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Account not found.' });
  if (!row.free_forever) return res.json({ ok: true, message: row.name + ' was not free forever.' });
  db.prepare("UPDATE users SET free_forever = 0, plan = 'trial' WHERE id = ?").run(id);
  res.json({ ok: true, message: 'Free forever taken back from ' + row.name + '. Their 14-day trial rules apply again.' });
});

app.delete('/api/admin/users/:id', auth.requireOwner, (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error: 'The owner cannot delete their own account from here.' });
  const row = db.prepare('SELECT id, role FROM users WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Account not found.' });
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
  db.prepare('DELETE FROM user_keys WHERE user_id = ?').run(id);
  db.prepare('DELETE FROM projects WHERE user_id = ?').run(id);
  db.prepare('DELETE FROM images WHERE user_id = ?').run(id);
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ ok: true });
});

// Withdraw the whole app (owner only). The server stops; starting it again
// brings it back. Full removal is deleting the app folder.
app.post('/api/admin/withdraw', auth.requireOwner, (req, res) => {
  res.json({ ok: true, message: 'HCI Studio is withdrawing. The server is stopping now. Start it again with npm start to bring it back.' });
  setTimeout(() => process.exit(0), 600);
});

// ---------- Websites: the studio builds a website's code ----------
// A student asks for a website (showcase for their work, or a page for a
// project) and the studio builds it — pages, design, text, images — ready
// to use. Template path works with no key; the live brain writes custom
// HTML when a key is set. Sites are static HTML + CSS only (no JavaScript).
app.post('/api/website/build', auth.requireLogin, access.requireDeep, async (req, res) => {
  const body = req.body || {};
  const kind = ['showcase', 'project', 'landing'].includes(body.kind) ? body.kind : 'showcase';
  const title = String(body.title || 'My Work').trim();
  const keys = userKeysFor(req);
  let imageDataUri = '';
  let imageNote = '';
  if (body.imageId) {
    const img = db.prepare('SELECT * FROM images WHERE id = ? AND user_id = ?').get(body.imageId, req.user.id);
    if (img && fs.existsSync(img.file_path)) {
      const size = fs.statSync(img.file_path).size;
      if (size <= 1500000) imageDataUri = 'data:image/png;base64,' + fs.readFileSync(img.file_path).toString('base64');
      else imageNote = 'Your image was too large to embed (over 1.5 MB), so the site was built without it.';
    }
  }
  const input = {
    kind, title,
    tagline: String(body.tagline || ''),
    about: String(body.about || ''),
    sections: Array.isArray(body.sections) ? body.sections : [],
    palette: String(body.palette || 'navy-gold'),
    ctaHeading: String(body.ctaHeading || ''),
    ctaText: String(body.ctaText || ''),
    imageDataUri,
  };
  let html;
  let builtBy = 'template';
  try {
    if (body.useBrain) {
      if (!providers.hasBrain(keys)) {
        return res.status(503).json({ error: 'Custom website building needs a key. No AI key is set — add your own key in Settings, or use the template builder, which works without a key.' });
      }
      const over = limits.checkLimit(req.user, 'think');
      if (over) return res.status(429).json({ error: over.message });
      const out = await providers.think(
        [{ role: 'user', content:
          'Build a complete, single, self-contained website as ONE HTML file for: ' + JSON.stringify({ kind, title, tagline: input.tagline, about: input.about, sections: input.sections }) +
          '. Use inline CSS only, in the style of: ' + (input.palette || 'navy-gold') + '. No JavaScript at all. No external links, fonts or images. Mobile-friendly. Write the full HTML and nothing else — no explanations, no markdown fences.' }],
        { system: 'You are HCI, a web builder. You write clean, complete, single-file HTML websites with inline CSS and no JavaScript. Never invent facts about the person. Keep the words the student gave you.', temperature: 0.5, maxTokens: 4000 },
        keys
      );
      logUsage(req.user.id, 'think', out.provider, out.model, 'website ' + title.slice(0, 60), true);
      html = website.sanitizeBrainHtml(out.text.replace(/```html/gi, '').replace(/```/g, ''));
      builtBy = 'brain';
    } else {
      html = website.buildFromTemplate(input).html;
    }
  } catch (e) {
    console.error('website failed:', String(e.message).slice(0, 300));
    logUsage(req.user.id, 'website', '', '', String(e.message).slice(0, 200), false);
    return res.status(502).json({ error: 'Website building failed: ' + String(e.message).slice(0, 300) });
  }
  const info = db.prepare('INSERT INTO sites (user_id, project_id, title, kind, file_path) VALUES (?, ?, ?, ?, ?)').run(
    req.user.id, body.projectId || null, title, kind, ''
  );
  const filePath = path.join(website.sitesDir(DATA_DIR), info.lastInsertRowid + '.html');
  fs.writeFileSync(filePath, html, 'utf8');
  db.prepare('UPDATE sites SET file_path = ? WHERE id = ?').run(filePath, info.lastInsertRowid);
  logUsage(req.user.id, 'website', builtBy, '', title.slice(0, 80), true);
  res.json({ id: info.lastInsertRowid, title, kind, builtBy, imageNote, url: '/api/website/' + info.lastInsertRowid + '/preview', downloadUrl: '/api/website/' + info.lastInsertRowid + '/download' });
});

app.get('/api/website', auth.requireLogin, (req, res) => {
  const rows = db.prepare('SELECT id, title, kind, created_at FROM sites WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json(rows);
});

function loadSiteFor(req, res) {
  const row = db.prepare('SELECT * FROM sites WHERE id = ?').get(req.params.id);
  if (!row) { res.status(404).json({ error: 'Website not found.' }); return null; }
  if (row.user_id !== req.user.id && req.user.role !== 'owner') { res.status(403).json({ error: 'That website is not yours.' }); return null; }
  return row;
}

app.get('/api/website/:id/preview', auth.requireLogin, (req, res) => {
  const row = loadSiteFor(req, res);
  if (!row || !fs.existsSync(row.file_path)) return res.status(404).json({ error: 'Website file is gone.' });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox");
  res.sendFile(row.file_path);
});

app.get('/api/website/:id/download', auth.requireLogin, (req, res) => {
  const row = loadSiteFor(req, res);
  if (!row || !fs.existsSync(row.file_path)) return res.status(404).json({ error: 'Website file is gone.' });
  const safe = row.title.replace(/[^a-z0-9-_]+/gi, '-').slice(0, 50) || 'website';
  res.download(row.file_path, safe + '.html');
});

app.delete('/api/website/:id', auth.requireLogin, (req, res) => {
  const row = loadSiteFor(req, res);
  if (!row) return;
  try { fs.unlinkSync(row.file_path); } catch (_) {}
  db.prepare('DELETE FROM sites WHERE id = ?').run(row.id);
  res.json({ ok: true });
});

// ---------- Downloads (the HCI share packs) ----------
app.get('/downloads/:file', (req, res) => {
  const file = DOWNLOADS[req.params.file];
  if (!file || !fs.existsSync(file)) return res.status(404).send('Not found.');
  res.download(file);
});

// ---------- Frontend ----------
app.use(express.static(path.join(__dirname, 'public')));
app.get(/.*/, (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found.' });
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server. Please try again.' });
});

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0'; // 0.0.0.0 so hosts (Railway/Render) can reach the app; 127.0.0.1 hides it from their proxy and gives a 502.
app.listen(PORT, HOST, () => {
  console.log('HCI Studio running at http://' + HOST + ':' + PORT);
  console.log('Made by Haynurah, the founder of Haynurah Studios.');
});
