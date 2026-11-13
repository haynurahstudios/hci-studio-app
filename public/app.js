// HCI Studio — frontend (no build step, plain JS).
// Made by Haynurah, the founder of Haynurah Studios.
const S = {
  status: null, knowledge: null, tutorials: [], platforms: [],
  user: null, access: null,
  chatLog: [], friendlyLog: [], chatSpace: 'work', chatFailed: null, greeting: '', sites: [], websiteDraft: null, websiteSections: [{ heading: '', text: '' }],
};
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CREDIT = 'Made by Haynurah, the founder of Haynurah Studios.';

async function api(path, method = 'GET', body = null) {
  const res = await fetch(path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : null,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || data.message || ('Request failed (' + res.status + ')'));
    err.status = res.status; err.paywall = data.paywall; err.data = data;
    throw err;
  }
  return data;
}

function paywallCard(err) {
  return `<div class="notice warn"><h3>Your 14-day free trial has ended</h3>
  <p>${esc(err?.data?.message || err?.message || 'Deep thinking tools need a paid plan.')}</p>
  <p class="muted">Payments start after the test — the owner will share how to continue, and payments go to the owner, never to the app itself. Basic access (learning pages and simple chatting with HCI) stays free.</p></div>`;
}

async function boot() {
  try { S.status = await api('/api/status'); S.user = S.status.user; S.access = S.status.access; } catch (e) { S.status = null; }
  try { S.knowledge = await api('/api/knowledge'); } catch (e) { S.knowledge = null; }
  try { S.tutorials = await api('/api/tutorials'); } catch (e) { S.tutorials = []; }
  try { S.platforms = await api('/api/platforms'); } catch (e) { S.platforms = []; }
  if (S.user) { try { S.greeting = (await api('/api/muse/greeting')).greeting; } catch (e) {} }
  renderUserChip();
  window.addEventListener('hashchange', route);
  // When the network comes back, retry a chat message that failed while
  // it was off — the user should never be stuck on "Failed to fetch".
  window.addEventListener('online', () => { if (S.chatFailed) App.retryChat(); });
  route();
}

function renderUserChip() {
  const el = $('#userChip');
  const adminLink = $('#adminLink');
  if (S.user) {
    el.innerHTML = `<span class="pill">${esc(S.user.name)} · ${esc(S.user.role)}</span> <button class="btn small ghost" onclick="App.logout()">Log out</button>`;
    if (S.user.role === 'owner') adminLink.style.display = '';
  } else {
    el.innerHTML = `<a class="btn small" href="#/auth">Log in / Sign up</a>`;
    adminLink.style.display = 'none';
  }
}

function setNav(page) {
  document.querySelectorAll('nav.main a').forEach((a) => a.classList.toggle('on', a.dataset.page === page));
}

function needLogin() {
  return `<div class="card"><h2>Log in first</h2><p>Create a free account or log in. The owner chooses up to 10 people to be free forever. After that, new accounts get a <b>14-day free trial</b> with full access to everything. The owner is free forever.</p><p><a class="btn" href="#/auth">Log in / Sign up</a></p></div>`;
}

function route() {
  const page = (location.hash || '#/home').replace('#/', '').split('?')[0] || 'home';
  setNav(page);
  const view = $('#view');
  const pages = { home: vHome, styles: vStyles, tools: vTools, learn: vLearn, projects: vProjects, websites: vWebsites, 'get-hci': vGetHci, settings: vSettings, admin: vAdmin, auth: vAuth };
  const fn = pages[page] || vHome;
  Promise.resolve(fn()).then((html) => { view.innerHTML = html; afterRender(page); }).catch((e) => { view.innerHTML = `<div class="notice warn">Something went wrong: ${esc(e.message)}</div>`; });
}

function afterRender(page) {}

// ---------------- Home ----------------
function brainCard() {
  const b = S.status?.brain;
  if (!b) return '';
  const rows = b.providers.map((p) => `<span class="chip">${esc(p.name)}${p.mine ? ' · your key' : ''}</span>`).join('') || '<span class="muted">No AI key set yet.</span>';
  return `<div class="card ${b.liveBrain ? 'gold' : ''}"><h3>The brain — ${b.liveBrain ? 'on' : 'needs a key'}</h3>
  <p>${rows}</p><p class="muted">${esc(b.note)}</p>
  <p><a class="btn small ghost" href="#/settings">Add my own key</a></p></div>`;
}

function accessCard() {
  const a = S.access;
  if (!a || !S.user) return '';
  const pay = S.status?.payment;
  let inner = '';
  if (a.tier === 'owner') inner = `<p><b>Owner — free forever, everything unlocked.</b> You never pay for your own use.</p>`;
  else if (a.tier === 'chosen') inner = `<p><b>Chosen by the owner — free forever, everything unlocked.</b></p>`;
  else if (a.tier === 'trial') inner = `<p><b>Free trial — ${a.daysLeft} day${a.daysLeft === 1 ? '' : 's'} of full access left.</b></p><p class="muted">After the trial, deep thinking tools need a paid plan. ${esc(pay?.afterTrial || '')}</p>`;
  else inner = `<p><b>Basic access.</b> Your trial has ended. Deep tools are locked. ${esc(pay?.afterTrial || '')}</p>`;
  return `<div class="card"><h3>Your access</h3>${inner}</div>`;
}

// ---------------- Chat: two spaces ----------------
// The app IS a chatbot. Workspace walks the person from an idea to the
// whole prompts; Friendly is just talking about your day. Both share the
// same brain and the same history-aware chat endpoint. Messages render
// spacious, never choked: roomy bubbles, and finished prompts in a
// copyable block.
function renderChatText(text) {
  const parts = String(text || '').split(/```/);
  return parts.map((part, i) => {
    if (i % 2 === 1) return `<pre class="prompt">${esc(part.replace(/^\w+\n/, ''))}</pre><button class="btn small ghost" onclick="if(navigator.clipboard){navigator.clipboard.writeText(this.previousElementSibling.innerText).then(()=>alert('Copied.'));}else{alert('Select the text above to copy it.');}">Copy</button>`;
    return esc(part).replace(/\n/g, '<br>');
  }).join('');
}
function chatLogHtml() {
  const space = S.chatSpace;
  const log = space === 'friendly' ? S.friendlyLog : S.chatLog;
  if (!log.length) {
    const greet = space === 'friendly'
      ? 'Hi, I’m here. Tell me about your day.'
      : 'Hi, what idea do you want to bring to life today?';
    return `<div class="chat-msg hci"><b>Muse:</b> ${esc(greet)}</div>`;
  }
  return log.map((m) => `<div class="chat-msg ${m.who === 'you' ? 'you' : 'hci'}"><b>${m.who === 'you' ? 'You' : 'Muse'}:</b> ${renderChatText(m.text)}${m.failed ? `<p><button class="btn small" onclick="App.retryChat()">Try again</button></p>` : ''}</div>`).join('');
}

async function vHome() {
  const k = S.knowledge;
  return `
  <div class="hero"><img src="/logo.png" alt="HCI logo">
    <h1>Haynurah Creative Intelligence</h1>
    <div class="tag">IMAGINE WITHOUT LIMITS.<br>RESEARCH WITH INTELLIGENCE.<br>CREATE WITH DIRECTION.</div>
    <p style="margin-top:14px">HCI exists for the students of Haynurah Studios Academy, who will not read everything. It teaches in plain words — it explains, answers, directs and writes your prompts for you.</p>
    <p><b>The ruling of this house, above everything else: decency only.</b> Every description decent, every person dressed decently and modestly — always.</p>
    <p><a class="btn ghost" href="#/learn">Learn cinematography</a></p>
  </div>
  ${accessCard()}
  ${brainCard()}
  ${S.greeting ? `<div class="card gold"><h3>Muse says</h3><p>${esc(S.greeting)}</p></div>` : ''}
  <div class="card chat-card"><h3>Chat with Muse</h3>
    <p class="muted">Talk to Muse like you talk to ChatGPT — just chat, no clicking through forms. Two spaces: <b>Workspace</b> turns your idea into the whole prompts; <b>Friendly chat</b> is for talking about your day.</p>
    <div class="chat-tabs"><button class="pill ${S.chatSpace === 'work' ? 'on' : ''}" onclick="App.setSpace('work')">💼 Workspace</button><button class="pill ${S.chatSpace === 'friendly' ? 'on' : ''}" onclick="App.setSpace('friendly')">💬 Friendly chat</button></div>
    <div id="chatLog" class="chatlog">${chatLogHtml()}</div>
    <textarea id="chatInput" class="chat-input" rows="2" placeholder="${S.chatSpace === 'work' ? 'Tell Muse your idea…' : 'How was your day?'}" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();App.chat();}"></textarea>
    <button class="btn" onclick="App.chat()">Send</button>
    <p class="muted">${S.access ? esc(S.access.message || '') : 'Log in to chat.'} ${S.access && S.access.tier === 'basic' ? 'The learning pages stay free.' : ''}</p>
  </div>
  <div class="card"><h3>What the chatbot does</h3>
    <p>1. It thinks for itself — it searches what is trending right now and turns it into fresh directions.<br>
    2. It asks which platform you are making for, and shapes every prompt for that platform.<br>
    3. It walks you through the idea in conversation: script, style, character, the AI tool to use, then the whole prompts.<br>
    4. It teaches you everything for cinematography and AI video creation — styles, angles, light, colour, behaviour, directing.</p>
    <p class="muted">Video generation is paused — it needs a server or a heavy device. The chatbot hands you a production-ready prompt for Kling, Flow or Creen AI instead, and says so plainly.</p>
  </div>
  ${k ? `<div class="card"><h3>The craft, in one line each</h3><p><b>Cinematography formula:</b> ${esc(k.cinematographyFormula || '')}</p><p><b>Director's formula:</b> ${esc(k.directorsFormula || '')}</p></div>` : ''}`;
}

// ---------------- Styles / Tools / Learn ----------------
async function vStyles() {
  const k = S.knowledge;
  if (!k || !k.styles?.length) return `<h1>Styles</h1><div class="notice">The knowledge file is still being prepared. The twenty styles will appear here.</div>`;
  return `<h1>Twenty visual styles — and beyond</h1>
  <p class="muted">Choose a style by asking: what is the objective, what is the emotion, who is the audience, what is the subject, and what can the tool render? Name the style and say why in one sentence.</p>
  <div class="grid two">${k.styles.map((s) => `<div class="card"><h3>${esc(s.name)}</h3><p><b>Use when:</b> ${esc(s.useWhen)}</p><p><b>Avoid when:</b> ${esc(s.avoidWhen)}</p>${s.notConfusedWith ? `<p class="muted">Not to be confused with: ${esc(s.notConfusedWith)}</p>` : ''}</div>`).join('')}</div>
  <div class="card"><h3>Mixing styles</h3><p>${esc(k.styleMixing?.rule || 'One style leads, one supports, and the mix must have a reason.')}</p>
  ${(k.styleMixing?.goodMixes || []).map((m) => `<p><b>${esc(m.lead)} + ${esc(m.support)}:</b> ${esc(m.why)}</p>`).join('')}
  ${(k.styleMixing?.badMixes || []).map((m) => `<p class="bad"><b>${esc(m.a)} + ${esc(m.b)}:</b> ${esc(m.why)}</p>`).join('')}</div>
  <div class="card"><h3>Shot sizes, angles, movements</h3>
  <p><b>Shot sizes:</b> ${(k.shotSizes || []).map((s) => esc(s.name)).join(' · ')}</p>
  <p><b>Angles:</b> ${(k.cameraAngles || []).map((s) => esc(s.name)).join(' · ')}</p>
  <p><b>Movements:</b> ${(k.cameraMovements || []).map((s) => esc(s.name)).join(' · ')}</p>
  <p><b>Lens and depth of field:</b> ${esc(k.lensDoF || '')}</p></div>`;
}

async function vTools() {
  const k = S.knowledge;
  return `<h1>Tools — which tool for which job</h1>
  <p class="muted">November 2026 registry. Verify on the vendor's own documentation, on the plan actually used, before spending.</p>
  <div class="card"><h3>Platforms the chatbot writes for</h3>
  <table><tr><th>Platform</th><th>Clips</th><th>Audio</th></tr>
  ${S.platforms.map((p) => `<tr><td>${esc(p.name)}</td><td>${esc(p.clip)}</td><td>${esc(p.audio)}</td></tr>`).join('')}</table>
  <p class="muted">Making for another platform? Tell Muse the platform name in the chat — any platform works. The prompt is shaped with general rules and tells you to verify clip length, audio and price on that platform.</p></div>
  ${k?.tools?.length ? `<div class="card"><h3>Full registry</h3><table><tr><th>Tool</th><th>What it does</th><th>Price</th><th>Limits</th></tr>
  ${k.tools.map((t) => `<tr><td>${esc(t.name)}</td><td>${esc(t.kind || '')} — ${esc(t.clips || '')}</td><td>${esc(t.price || '')}</td><td>${esc(t.limits || '')}</td></tr>`).join('')}</table></div>` : ''}
  <div class="notice warn"><h3>Honest limits</h3><p>${(k?.unverified || []).map(esc).join('<br>')}</p></div>`;
}

async function vLearn() {
  const k = S.knowledge;
  const byTopic = {};
  S.tutorials.forEach((t) => { (byTopic[t.topic] = byTopic[t.topic] || []).push(t); });
  return `<h1>Learn</h1>
  <div class="card"><h3>The formulas</h3>
  <p><b>Cinematography:</b> ${esc(k?.cinematographyFormula || '')}</p>
  <p><b>Directing:</b> ${esc(k?.directorsFormula || '')}</p>
  <p><b>Colour:</b> ${esc(k?.colour?.formula || '')}</p></div>
  <div class="card"><h3>The twelve animation principles</h3>
  ${(k?.animationPrinciples || []).map((p) => `<p><b>${p.n}. ${esc(p.name)}:</b> ${esc(p.what || '')} ${esc(p.howToUse || '')}</p>`).join('') || '<p class="muted">Loading…</p>'}</div>
  <div class="card"><h3>Human light and human skin</h3><p>${esc(k?.lighting?.rule || 'Soft warm directional light with a gentle fill. Never flat white light. Never unfilled shadows. Hyperrealism means sharper and clearer than a photograph, not dull.')}</p>
  <p class="muted">Key-to-fill: ${esc(k?.lighting?.keyToFill || '1:1 flat, 2:1 natural, 4:1 dramatic')}</p></div>
  <div class="card"><h3>Behaviour direction</h3><p>${(k?.behaviour?.rules || []).map(esc).join('<br>')}</p>
  <p class="muted">The 12-element framework: ${(k?.behaviour?.framework || []).join(', ')}</p></div>
  <div class="card"><h3>Tutorials — researched and verified online</h3>
  ${Object.entries(byTopic).map(([topic, list]) => `<h3>${esc(topic)}</h3>${list.map((t) => `<p><a href="${esc(t.url)}" target="_blank" rel="noopener">${esc(t.title)}</a> <span class="muted">— ${esc(t.source)} · ${esc(t.level)} · verified ${esc(t.verified)}</span><br><span class="muted">${esc(t.note || '')}</span></p>`).join('')}`).join('') || '<p class="muted">Tutorials are being verified and will appear here.</p>'}</div>`;
}

// ---------------- Projects / Get HCI / Settings / Admin / Auth ----------------
async function vProjects() {
  if (!S.user) return needLogin();
  let rows = [];
  try { rows = await api('/api/projects'); } catch (e) { return `<div class="notice warn">${esc(e.message)}</div>`; }
  return `<h1>My Projects</h1>
  ${rows.length ? rows.map((r) => `<div class="card"><h3>${esc(r.title)}</h3><p class="muted">${esc(r.platform || '')} · ${esc(r.updated_at || '')}</p>
  <button class="btn small danger" onclick="App.deleteProject(${r.id})">Delete</button></div>`).join('') : '<p class="muted">No projects yet.</p>'}`;
}

async function vWebsites() {
  if (!S.user) return needLogin();
  if (S.access && !S.access.deepAllowed) {
    return `<h1>Websites</h1>` + paywallCard({ data: { message: S.access.message } }) + `<p><a class="btn" href="#/learn">Keep learning for free</a></p>`;
  }
  let rows = [];
  try { rows = await api('/api/website'); S.sites = rows; } catch (e) { return `<div class="notice warn">${esc(e.message)}</div>`; }
  const d = S.websiteDraft || {};
  return `<h1>Websites — the studio builds the code</h1>
  <p class="muted">Ask for a website — a showcase for your work, or a page for a project — and the studio builds it: pages, design, text, images, ready to use. The template builder works with no key; tick "Let the brain write it" for a custom build when a key is set. Sites are static HTML + CSS, safe to open anywhere. Every site the studio builds follows the ruling of this house: decency only — descriptions decent, dressing modest, always.</p>
  <div class="card"><h3>Build a website</h3>
  <label>What kind?</label><select id="wKind"><option value="showcase" ${d.kind === 'showcase' ? 'selected' : ''}>Showcase — for my work</option><option value="project" ${d.kind === 'project' ? 'selected' : ''}>Project page</option><option value="landing" ${d.kind === 'landing' ? 'selected' : ''}>Landing page</option></select>
  <label>Title</label><input id="wTitle" value="${esc(d.title || '')}" placeholder="e.g. Amina's Films">
  <label>Tagline</label><input id="wTagline" value="${esc(d.tagline || '')}" placeholder="e.g. Stories told with light">
  <label>About</label><textarea id="wAbout" placeholder="A few lines about you or the project…">${esc(d.about || '')}</textarea>
  <label>Design</label><select id="wPalette"><option value="navy-gold">Navy &amp; Gold (HCI house)</option><option value="teal-gold">Teal &amp; Gold</option><option value="warm-cream">Warm Cream</option><option value="midnight-violet">Midnight Violet</option></select>
  <div id="wSections">${S.websiteSections.map((s, i) => `<label>Section ${i + 1} heading</label><input id="wSecH${i}" value="${esc(s.heading)}" placeholder="e.g. My latest work"><label>Section ${i + 1} text</label><textarea id="wSecT${i}" placeholder="Write what this section says…">${esc(s.text)}</textarea>`).join('')}</div>
  <button class="btn ghost" onclick="App.addWebsiteSection()">+ Add a section</button><br>
  <label><input type="checkbox" id="wBrain" style="width:auto"> Let the brain write it (custom build, needs a key)</label><br><br>
  <button class="btn" onclick="App.buildWebsite()">Build my website</button>
  <div id="wResult"></div></div>
  <h2>My websites</h2>
  ${rows.length ? rows.map((r) => `<div class="card"><h3>${esc(r.title)}</h3><p class="muted">${esc(r.kind)} · ${esc(r.created_at || '')}</p>
  <button class="btn small" onclick="App.previewSite(${r.id})">Preview</button>
  <a class="btn small ghost" href="/api/website/${r.id}/download">Download the file</a>
  <button class="btn small danger" onclick="App.deleteSite(${r.id})">Delete</button>
  <div id="preview-${r.id}"></div></div>`).join('') : '<p class="muted">No websites yet. Build your first one above.</p>'}`;
}

async function vGetHci() {
  return `<h1>Get HCI</h1>
  <p class="muted">HCI is a set of files you install in Claude or ChatGPT as a Project. The lessons and the encyclopedia are not in the pack — they are paid material.</p>
  <div class="card"><h3>Download the share packs</h3>
  <p><a class="btn" href="/downloads/HCI_New_Share_Pack_for_Claude.zip">Download for Claude</a>
  <a class="btn ghost" href="/downloads/HCI_New_Share_Pack_for_ChatGPT_and_Others.zip">Download for ChatGPT &amp; others</a></p>
  <p class="muted">Each pack holds the Blueprint, Operating Instructions, Tool Registry, Testing document and the install guide.</p></div>
  <div class="card"><h3>Install in 5 steps</h3><p>1. Create a Project named “Haynurah Creative Intelligence”. If an old Project still exists, do NOT add files to it — delete it or make a fresh one.<br>
  2. Paste the core rules into the Project instructions (below).<br>
  3. Upload the four documents from the pack.<br>
  4. Send the introduction message (below).<br>
  5. Run test T-01 (below). Only when it is run and recorded is the installation complete.</p></div>
  <div class="card"><h3>Core rules (paste into Project instructions)</h3><pre class="prompt">You are Haynurah Creative Intelligence (HCI), a multidisciplinary creative director, researcher, strategist, storyteller and production intelligence. Tagline: Imagine without limits. Research with intelligence. Create with direction. Mission: you exist for the students of Haynurah Studios Academy, who will not read everything. You teach in plain words: you explain, answer, direct and write their prompts for them. Work in three modes: Thinking (original directions), Research (verified facts), Direction (executable plans). Boundaries, never to be crossed: never invent evidence; never invent a capability; never claim to be built when it is not; no autonomous action; no false implementation; no authority outside your evidence. Work in order: understand the objective, check what you know, retrieve what you do not know, reason in the open, direct step by step — character, then environment and props, then scenes and action sequences, then prompts — each step locked before the next. Deliver only production-ready prompts, never a draft or a placeholder. Evaluate creativity as a profile across dimensions, never a single score. Check your own work with the quality gate: accuracy, originality, relevance, feasibility, coherence, completeness, consistency. If you do not know, say so and check — never present an unverified claim as fact.</pre></div>
  <div class="card"><h3>Introduction message</h3><pre class="prompt">I have installed Haynurah Creative Intelligence in this Project. You are HCI. The files are your operating instructions, your blueprint, your tool registry and your testing document. Read them and tell me, honestly: what can you do here, what can you not do, and what is the first test we should run before I call this installation complete?</pre></div>
  <div class="card"><h3>Test T-01</h3><pre class="prompt">Here is an ordinary idea: a perfume bottle on marble at golden hour. Improve it. Give me three functionally distinct directions, evaluate each on originality, value, surprise, coherence and feasibility, recommend one and name the strongest alternative, and write the production-ready prompt for the recommended direction.</pre>
  <p class="muted">On ChatGPT install as a Project, NOT a Custom GPT. On Gemini install as a Gem. On Perplexity install as a Space. Never mix old and new HCI files in one Project. Sora is discontinued — never use it.</p></div>`;
}

async function vSettings() {
  if (!S.user) return needLogin();
  let keys = [], usage = null;
  try { keys = (await api('/api/keys')).keys; } catch (e) {}
  try { usage = await api('/api/usage/me'); } catch (e) {}
  const a = S.access;
  return `<h1>Settings</h1>
  ${accessCard()}
  <div class="card"><h3>My own keys (bring your own key)</h3>
  <p class="muted">Your key stays yours. Your thinking uses your own free credits, and the app itself charges nothing. Keys are stored encrypted on the server and never shown back in full.</p>
  ${keys.length ? keys.map((k) => `<p><span class="chip">${esc(k.provider)}</span> <span class="muted">added ${esc(k.created_at || '')}</span> <button class="btn small danger" onclick="App.deleteKey('${esc(k.provider)}')">Remove</button></p>`).join('') : '<p class="muted">No keys added yet.</p>'}
  <label>Provider</label><select id="keyProvider"><option value="anthropic">Claude (Anthropic) — primary writing brain</option><option value="perplexity">Perplexity — research</option><option value="openai">ChatGPT (OpenAI) — also images</option><option value="gemini">Gemini (Google)</option><option value="tavily">Tavily — live search</option><option value="groq">Groq — fast open models</option><option value="openrouter">OpenRouter — free open models</option></select>
  <label>Key</label><input id="keyValue" type="password" placeholder="Paste your key here" autocomplete="off">
  <button class="btn" onclick="App.saveKey()">Save my key</button></div>
  <div class="card"><h3>My usage today (free limits)</h3>
  ${usage ? Object.entries(usage).map(([k, v]) => `<p><b>${esc(k)}:</b> ${v.used} of ${v.limit} used — ${v.remaining} left today</p>`).join('') : '<p class="muted">Could not load usage.</p>'}
  <p class="muted">Tight daily limits per person keep the free credits lasting. The app itself charges nothing.</p></div>
  <div class="card"><h3>Privacy</h3>
  <p><label style="font-weight:400"><input type="checkbox" id="privacyToggle" ${S.user && S.user.improveAi === false ? '' : 'checked'} onchange="App.setPrivacy(this.checked)"> Use my chats to improve the AI</label></p>
  <p class="muted">This is on by default. Your chats may be used to make the AI better. You can turn it off anytime — it stays off until you turn it back on.</p>
  <div id="privacyMsg"></div></div>
  <div class="card"><h3>About</h3><p>${CREDIT}</p><p class="muted">HCI Studio is an independent app. It runs under no single AI company — it borrows thinking through provider keys.</p></div>`;
}

async function vAdmin() {
  if (!S.user) return needLogin();
  if (S.user.role !== 'owner') return `<div class="notice warn">Only the owner can open this page.</div>`;
  let users = [], usage = null;
  try { users = await api('/api/admin/users'); } catch (e) { return `<div class="notice warn">${esc(e.message)}</div>`; }
  try { usage = await api('/api/usage'); } catch (e) {}
  return `<h1>Owner — accounts</h1>
  <p class="muted">You are the owner — free forever, everything unlocked. You can delete any account. You can also make up to 10 people free forever — anyone who wins your heart. The money from paying users comes to you: it pays the AI costs first, and the remainder is your earnings. Payments start after the test (natural option: Selar; alternatives: Stripe or Paystack).</p>
  <div class="card"><h3>All accounts (${users.length})</h3>
  <table><tr><th>Name</th><th>Email</th><th>Access</th><th>Trial ends</th><th></th></tr>
  ${users.map((u) => `<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.access?.tier || u.role)}${u.access?.tier === 'trial' ? ` (${u.access.daysLeft}d left)` : ''}</td><td>${esc(u.trial_ends_at || '—')}</td><td>${u.id !== S.user.id ? `${u.access?.tier === 'chosen' ? `<button class="btn small ghost" onclick="App.setFree(${u.id}, '${esc(u.name)}', false)">Take back free</button>` : `<button class="btn small" onclick="App.setFree(${u.id}, '${esc(u.name)}', true)">Make free</button>`} <button class="btn small danger" onclick="App.deleteUser(${u.id}, '${esc(u.name)}')">Delete</button>` : '<span class="muted">you</span>'}</td></tr>`).join('')}</table></div>
  <div class="card"><h3>Usage today</h3><p>${usage ? usage.today.map((t) => `<span class="chip">${esc(t.kind)}: ${t.n}</span>`).join(' ') : '—'}</p></div>
  <div class="card"><h3>Withdraw the app</h3><p class="muted">Stops the server. Start it again with <b>npm start</b> to bring it back. Full removal is deleting the app folder.</p>
  <button class="btn danger" onclick="App.withdraw()">Withdraw HCI Studio</button></div>`;
}

async function vAuth() {
  if (S.user) return `<div class="card"><h2>You are logged in as ${esc(S.user.name)}</h2><p><a class="btn" href="#/home">Chat with Muse</a></p></div>`;
  return `<h1>Log in / Sign up</h1>
  <div class="card"><h3>Create a free account</h3>
  <p class="muted">The owner chooses up to 10 people to be free forever. After that, new accounts get a <b>14-day free trial</b>, unlimited, with full access to everything. After the trial, you still get 2 free times a week. The first account ever created is the owner.</p>
  <p class="muted">For the owner's students, anywhere in the world — no region restriction, no country blocking.</p>
  <label>Name</label><input id="regName" placeholder="Your name">
  <label>Email</label><input id="regEmail" type="email" placeholder="you@example.com">
  <label>Password (at least 6 characters)</label><input id="regPass" type="password">
  <button class="btn" onclick="App.register()">Create my account</button>
  <div id="regMsg"></div></div>
  <div class="card"><h3>Log in</h3>
  <label>Email</label><input id="logEmail" type="email" placeholder="you@example.com">
  <label>Password</label><input id="logPass" type="password">
  <button class="btn" onclick="App.login()">Log in</button>
  <div id="logMsg"></div></div>`;
}

// ---------------- App actions ----------------
window.App = {
  async logout() { try { await api('/api/auth/logout', 'POST'); } catch (e) {} location.hash = '#/home'; location.reload(); },
  async register() {
    const msg = $('#regMsg');
    try {
      const r = await api('/api/auth/register', 'POST', { name: $('#regName').value, email: $('#regEmail').value, password: $('#regPass').value });
      msg.innerHTML = `<p class="ok">Welcome, ${esc(r.user.name)}. ${esc(r.ownerNote || 'Your 14-day free trial has started.')}</p>`;
      setTimeout(() => location.reload(), 800);
    } catch (e) { msg.innerHTML = `<p class="bad">${esc(e.message)}</p>`; }
  },
  async login() {
    const msg = $('#logMsg');
    try { await api('/api/auth/login', 'POST', { email: $('#logEmail').value, password: $('#logPass').value }); setTimeout(() => location.reload(), 300); }
    catch (e) { msg.innerHTML = `<p class="bad">${esc(e.message)}</p>`; }
  },
  async chat() {
    const input = $('#chatInput');
    const text = input.value.trim();
    if (!text) return;
    const space = S.chatSpace;
    const log = space === 'friendly' ? S.friendlyLog : S.chatLog;
    log.push({ who: 'you', text }); input.value = '';
    log.push({ who: 'hci', text: 'Thinking…' });
    route();
    await this.sendChat(log, space, text);
  },
  // Sends one chat message. If the network fails, the message is NOT lost:
  // the failed answer stays with a "Try again" button, and the app retries
  // by itself when the network comes back (the 'online' listener in boot).
  async sendChat(log, space, text) {
    try {
      const history = log.slice(0, -1).slice(-10).map((m) => ({ role: m.who === 'you' ? 'user' : 'assistant', content: m.text }));
      const r = await api('/api/chat', 'POST', { message: text, mode: space, history });
      log[log.length - 1] = { who: 'hci', text: r.reply };
      S.chatFailed = null;
    } catch (e) {
      const failed = /fetch|network|offline/i.test(String(e.message || ''));
      log[log.length - 1] = { who: 'hci', text: e.paywall ? (e.data?.message || e.message) : ('Could not reach the studio: ' + e.message + '. Check your network and try again.'), failed, retryText: text, retrySpace: space };
      if (failed) S.chatFailed = { log, space, text };
    }
    route();
  },
  async retryChat() {
    const f = S.chatFailed;
    if (!f) return;
    const log = f.log;
    if (log.length && log[log.length - 1].failed) log.pop();
    log.push({ who: 'hci', text: 'Thinking…' });
    route();
    await this.sendChat(log, f.space, f.text);
  },
  setSpace(space) { S.chatSpace = space; route(); },
  async setPrivacy(on) {
    const msg = $('#privacyMsg');
    try {
      const r = await api('/api/settings/privacy', 'POST', { improveAi: on });
      if (S.user) S.user.improveAi = r.improveAi;
      if (msg) msg.innerHTML = `<p class="ok">${r.improveAi ? 'On — your chats may be used to improve the AI.' : 'Off — your chats will not be used to improve the AI.'}</p>`;
    } catch (e) { if (msg) msg.innerHTML = `<p class="bad">${esc(e.message)}</p>`; }
  },
  addWebsiteSection() { S.websiteSections.push({ heading: '', text: '' }); route(); },
  async buildWebsite() {
    const sections = S.websiteSections.map((_, i) => ({ heading: document.getElementById('wSecH' + i)?.value || '', text: document.getElementById('wSecT' + i)?.value || '' })).filter((s) => s.heading || s.text);
    const box = $('#wResult');
    if (box) box.innerHTML = '<p class="muted">Building your website…</p>';
    try {
      const r = await api('/api/website/build', 'POST', {
        kind: $('#wKind').value, title: $('#wTitle').value, tagline: $('#wTagline').value,
        about: $('#wAbout').value, sections, palette: $('#wPalette').value,
        useBrain: document.getElementById('wBrain').checked,
      });
      S.websiteDraft = null;
      if (box) box.innerHTML = `<p class="ok">Your website is ready — built by ${esc(r.builtBy)}.</p><p><a class="btn" href="${esc(r.url)}" target="_blank">Open it</a> <a class="btn ghost" href="${esc(r.downloadUrl)}">Download the file</a></p>${r.imageNote ? `<p class="muted">${esc(r.imageNote)}</p>` : ''}`;
      const rows = await api('/api/website'); S.sites = rows; route();
    } catch (e) {
      if (box) box.innerHTML = e.paywall ? paywallCard(e) : `<div class="notice warn">${esc(e.message)}</div>`;
    }
  },
  previewSite(id) {
    const holder = document.getElementById('preview-' + id);
    if (holder) holder.innerHTML = `<iframe src="/api/website/${id}/preview" style="width:100%;height:480px;border:1px solid var(--line);border-radius:12px;background:#fff" sandbox></iframe>`;
  },
  async deleteSite(id) {
    if (!confirm('Delete this website?')) return;
    await api('/api/website/' + id, 'DELETE'); route();
  },
  async deleteProject(id) {
    if (!confirm('Delete this project?')) return;
    await api('/api/projects/' + id, 'DELETE'); route();
  },
  async saveKey() {
    const provider = $('#keyProvider').value;
    const key = $('#keyValue').value.trim();
    if (!key) { alert('Paste your key first.'); return; }
    try { await api('/api/keys', 'POST', { provider, key }); alert('Key saved. Your thinking now uses your own key.'); route(); }
    catch (e) { alert(e.message); }
  },
  async deleteKey(provider) {
    if (!confirm('Remove this key?')) return;
    await api('/api/keys/' + provider, 'DELETE'); route();
  },
  async deleteUser(id, name) {
    if (!confirm('Delete the account of ' + name + '? Their projects and keys go with it. This cannot be undone.')) return;
    try { await api('/api/admin/users/' + id, 'DELETE'); route(); } catch (e) { alert(e.message); }
  },
  async setFree(id, name, makeFree) {
    if (makeFree) {
      if (!confirm('Make it free forever for ' + name + '? They will never pay and never lock. You can choose up to 10 people.')) return;
    } else if (!confirm('Take free forever back from ' + name + '? Their 14-day trial rules will apply again.')) return;
    try {
      const r = await api('/api/admin/users/' + id + '/free', makeFree ? 'POST' : 'DELETE');
      alert(r.message || 'Done.');
      route();
    } catch (e) { alert(e.message); }
  },
  async withdraw() {
    if (!confirm('Withdraw HCI Studio? The server will stop. Start it again with npm start to bring it back.')) return;
    try { await api('/api/admin/withdraw', 'POST'); } catch (e) {}
    document.querySelector('#view').innerHTML = '<div class="card"><h2>HCI Studio is withdrawing.</h2><p>The server has stopped. Start it again with <b>npm start</b> to bring it back.</p></div>';
  },
};

boot();
