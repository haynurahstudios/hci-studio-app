// HCI Studio — frontend (no build step, plain JS).
// Made by Haynurah, the founder of Haynurah Studios.
const S = {
  status: null, knowledge: null, tutorials: [], platforms: [],
  user: null, access: null,
  studio: { step: 0, platform: '', idea: '', character: '', props: '', world: '', scenes: [''], style: '', styleSupport: '', mixReason: '', shotSize: 'Medium shot', angle: 'Eye level', movement: 'Static', lens: '', lighting: '', composition: '', colourMood: '', behaviour: '', duration: '', prompt: null, imageUrl: null },
  trends: null, directions: null, chatLog: [], museChat: [], greeting: '', sites: [], websiteDraft: null, websiteSections: [{ heading: '', text: '' }],
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
  return `<div class="card"><h2>Log in first</h2><p>Create a free account or log in. New accounts get a <b>14-day free trial</b> with full access to everything. The owner is free forever.</p><p><a class="btn" href="#/auth">Log in / Sign up</a></p></div>`;
}

function route() {
  const page = (location.hash || '#/home').replace('#/', '').split('?')[0] || 'home';
  setNav(page);
  const view = $('#view');
  const pages = { home: vHome, studio: vStudio, styles: vStyles, tools: vTools, learn: vLearn, projects: vProjects, websites: vWebsites, 'get-hci': vGetHci, settings: vSettings, admin: vAdmin, auth: vAuth };
  const fn = pages[page] || vHome;
  Promise.resolve(fn()).then((html) => { view.innerHTML = html; afterRender(page); }).catch((e) => { view.innerHTML = `<div class="notice warn">Something went wrong: ${esc(e.message)}</div>`; });
}

function afterRender(page) { if (page === 'studio') { renderStudioStep(); loadMuseTip(S.studio.step); } }

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
  else if (a.tier === 'trial') inner = `<p><b>Free trial — ${a.daysLeft} day${a.daysLeft === 1 ? '' : 's'} of full access left.</b></p><p class="muted">After the trial, deep thinking tools need a paid plan. ${esc(pay?.afterTrial || '')}</p>`;
  else inner = `<p><b>Basic access.</b> Your trial has ended. Deep tools are locked. ${esc(pay?.afterTrial || '')}</p>`;
  return `<div class="card"><h3>Your access</h3>${inner}</div>`;
}

async function vHome() {
  const k = S.knowledge;
  return `
  <div class="hero"><img src="/logo.png" alt="HCI logo">
    <h1>Haynurah Creative Intelligence</h1>
    <div class="tag">IMAGINE WITHOUT LIMITS.<br>RESEARCH WITH INTELLIGENCE.<br>CREATE WITH DIRECTION.</div>
    <p style="margin-top:14px">HCI exists for the students of Haynurah Studios Academy, who will not read everything. It teaches in plain words — it explains, answers, directs and writes your prompts for you.</p>
    <p><b>The ruling of this house, above everything else: decency only.</b> Every description decent, every person dressed decently and modestly — always.</p>
    <p><a class="btn" href="#/studio">Open the Studio</a> <a class="btn ghost" href="#/learn">Learn cinematography</a></p>
  </div>
  ${accessCard()}
  ${brainCard()}
  ${S.greeting ? `<div class="card gold"><h3>Muse says</h3><p>${esc(S.greeting)}</p></div>` : ''}
  <div class="card"><h3>Ask Muse — your assistant (free for everyone)</h3>
    <p class="muted">Muse lives inside the studio with you. She guides you step by step, answers questions, and helps with prompts — warm, direct, plain words, honest about what she does not know.</p>
    <div id="chatLog">${S.chatLog.map((m) => `<p><b>${m.who === 'you' ? 'You' : 'Muse'}:</b> ${esc(m.text)}</p>`).join('')}</div>
    <input id="chatInput" placeholder="Ask anything about video, prompts, cinematography…" onkeydown="if(event.key==='Enter')App.chat()">
    <button class="btn" onclick="App.chat()">Ask</button>
    <p class="muted">Simple chatting stays free. Deep tools — live research, trend search, image creation and the full studio — need the trial or a plan.</p>
  </div>
  <div class="card"><h3>What the Studio does</h3>
    <p>1. It thinks for itself — it searches what is trending right now and turns it into fresh directions.<br>
    2. It asks which platform you are making for, and shapes every prompt for that platform.<br>
    3. It walks you step by step: character, then props, then the world, then scenes, then the video prompt — each step locked before the next.<br>
    4. It teaches you everything for cinematography and AI video creation — styles, angles, light, colour, behaviour, directing.</p>
    <p class="muted">Video generation is paused — it needs a server or a heavy device. The studio hands you a production-ready prompt for Kling, Flow or Creen AI instead, and says so plainly.</p>
  </div>
  ${k ? `<div class="card"><h3>The craft, in one line each</h3><p><b>Cinematography formula:</b> ${esc(k.cinematographyFormula || '')}</p><p><b>Director's formula:</b> ${esc(k.directorsFormula || '')}</p></div>` : ''}`;
}

// ---------------- Studio ----------------
const STEP_NAMES = ['Platform', 'Idea', 'Character', 'Props', 'World', 'Scenes', 'Prompt'];
function stepDone(i) {
  const d = S.studio;
  if (i === 0) return !!d.platform;
  if (i === 1) return !!d.idea.trim();
  if (i === 2) return !!d.character.trim();
  if (i === 3) return !!d.props.trim();
  if (i === 4) return !!d.world.trim();
  if (i === 5) return d.scenes.some((s) => s.trim());
  return !!d.prompt;
}
function renderStudioStep() {
  const holder = $('#studioSteps');
  if (!holder) return;
  const d = S.studio;
  holder.innerHTML = `<div class="steps">${STEP_NAMES.map((n, i) => `<span class="${i === d.step ? 'on' : stepDone(i) ? 'done' : ''}">${i + 1}. ${n}</span>`).join('')}</div>`;
  const body = $('#studioBody');
  if (!body) return;
  let html = '';
  if (d.step === 0) {
    html = `<h3>Step 1 — Which platform are you making for?</h3>
    <p class="muted">The app asks first, because a Kling prompt is not a Runway prompt. Pick one.</p>
    <div>${S.platforms.map((p) => `<button class="pill ${d.platform === p.id ? 'on' : ''}" onclick="App.setPlatform('${p.id}')">${esc(p.name)}</button>`).join('')}</div>
    ${d.platform ? `<div class="card">${(() => { const p = S.platforms.find((x) => x.id === d.platform); return p ? `<b>${esc(p.name)}</b><br>Clips: ${esc(p.clip)}<br>Audio: ${esc(p.audio)}` : ''; })()}</div>` : ''}`;
  } else if (d.step === 1) {
    html = `<h3>Step 2 — Your idea</h3>
    <p class="muted">Type your own idea — or let the studio think for itself and search what is trending right now.</p>
    <label>Your idea</label><textarea id="fIdea" placeholder="e.g. A market woman sells lamps that show memories…">${esc(d.idea)}</textarea>
    <button class="btn" onclick="App.saveIdea()">Use this idea</button>
    <button class="btn ghost" onclick="App.trending()">Search what's trending now</button>
    <div id="trendBox">${S.trends ? renderTrends() : ''}</div>
    <div id="dirBox">${S.directions ? renderDirections() : ''}</div>`;
  } else if (d.step === 2) {
    html = `<h3>Step 3 — Character (locked in exact words)</h3>
    <p class="muted">Describe the character exactly — face, hair, outfit, accessories, skin tone. The exact same face, hair, outfit, accessories and skin tone in every shot.</p>
    <label>Character lock</label><textarea id="fCharacter" placeholder="e.g. Amina, a market woman in her forties, warm medium-brown skin, dark brown eyes, a deep teal hijab covering her hair, ears, neck and chest, a loose long charcoal-grey dress with thin gold trim at the cuffs, a small brass key on a cord around her neck">${esc(d.character)}</textarea>
    <button class="btn" onclick="App.nextStep(2,'character','fCharacter')">Lock character →</button>`;
  } else if (d.step === 3) {
    html = `<h3>Step 4 — Props (locked in exact words)</h3>
    <p class="muted">A prop lock gets the same treatment as a character: the same object in every shot.</p>
    <label>Prop lock</label><textarea id="fProps" placeholder="e.g. A small brass oil lamp with a cloth-wrapped handle, warm amber glass, the same lamp in every shot">${esc(d.props)}</textarea>
    <button class="btn" onclick="App.nextStep(3,'props','fProps')">Lock props →</button>`;
  } else if (d.step === 4) {
    html = `<h3>Step 5 — The world</h3>
    <p class="muted">The environment and the whole world of the story.</p>
    <label>The world</label><textarea id="fWorld" placeholder="e.g. A busy night market at dusk, stalls lit by warm lamps, smoke and spice in the air, crowds moving slowly">${esc(d.world)}</textarea>
    <button class="btn" onclick="App.nextStep(4,'world','fWorld')">Lock the world →</button>`;
  } else if (d.step === 5) {
    html = `<h3>Step 6 — Scenes and action sequences</h3>
    <p class="muted">The actions in order — visible and timed. One line per action.</p>
    ${d.scenes.map((s, i) => `<label>Action ${i + 1}</label><textarea id="fScene${i}" placeholder="e.g. She lifts the lamp and its light falls across the boy's face">${esc(s)}</textarea>`).join('')}
    <button class="btn ghost" onclick="App.addScene()">+ Add another action</button>
    <button class="btn" onclick="App.saveScenes()">Lock scenes →</button>`;
  } else {
    html = `<h3>Step 7 — The video prompt</h3>
    <div class="grid two">
      <div><label>Shot size</label><select id="fShot">${['Extreme wide shot', 'Wide shot', 'Full shot', 'Medium wide shot', 'Medium shot', 'Medium close-up', 'Close-up', 'Extreme close-up'].map((o) => `<option ${d.shotSize === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
      <div><label>Camera angle</label><select id="fAngle">${['Eye level', 'Low angle', 'High angle', "Bird's-eye view", 'Dutch angle', 'Over-the-shoulder'].map((o) => `<option ${d.angle === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
      <div><label>Camera movement</label><select id="fMove">${['Static', 'Pan', 'Tilt', 'Tracking shot', 'Dolly in', 'Dolly out', 'Crane shot', 'Handheld', 'Slow push-in'].map((o) => `<option ${d.movement === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
      <div><label>Visual style (leads)</label><select id="fStyle">${(S.knowledge?.styles || []).map((s) => `<option value="${esc(s.name)}" ${d.style === s.name ? 'selected' : ''}>${esc(s.name)}</option>`).join('') || '<option>Cinematic realism</option>'}</select></div>
      <div><label>Supporting style (optional)</label><select id="fStyleSup"><option value="">— none —</option>${(S.knowledge?.styles || []).map((s) => `<option value="${esc(s.name)}" ${d.styleSupport === s.name ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
      <div><label>Length</label><select id="fDur">${['10 seconds', '8 seconds', '15 seconds', '30 seconds', '60 seconds'].map((o) => `<option ${d.duration === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
    </div>
    <label>Lighting</label><textarea id="fLight" placeholder="Soft warm directional light with a gentle fill…">${esc(d.lighting)}</textarea>
    <label>Colour and mood</label><input id="fColour" value="${esc(d.colourMood)}" placeholder="e.g. Warm filmic colour">
    <label>Behaviour (how feelings show)</label><textarea id="fBehav" placeholder="e.g. Her hands stop in the air; her smile arrives a beat late">${esc(d.behaviour)}</textarea>
    <button class="btn" onclick="App.assemble()">Build my production-ready prompt</button>
    <div id="promptBox">${d.prompt ? renderPrompt() : ''}</div>`;
  }
  body.innerHTML = html;
  loadMuseTip(d.step);
}

function renderTrends() {
  if (!S.trends) return '';
  if (S.trends.available === false) return `<div class="notice warn">${esc(S.trends.reason)}</div>`;
  return `<div class="card"><h3>Trending right now <span class="muted">(${esc(S.trends.source || '')})</span></h3>
  ${S.trends.trends.map((t) => `<p><b>${esc(t.title)}</b>${t.url ? ` — <a href="${esc(t.url)}" target="_blank" rel="noopener">source</a>` : ''}<br><span class="muted">${esc(t.why || '')}</span></p>`).join('')}
  <p class="muted">${esc(S.trends.note || '')}</p>
  <button class="btn" onclick="App.directions()">Turn this into three directions</button></div>`;
}
function renderDirections() {
  const r = S.directions;
  if (!r) return '';
  if (r.raw) return `<div class="card"><h3>Three directions</h3><pre class="prompt">${esc(r.raw)}</pre></div>`;
  return `<div class="card"><h3>Three directions</h3>
  ${(r.directions || []).map((d, i) => `<div style="border-top:1px solid var(--line);padding-top:10px">
    <h3>${i + 1}. ${esc(d.title)}</h3><p>${esc(d.story || '')}</p>
    <p><b>Style mix:</b> ${esc(d.styleLead || '')} leads, ${esc(d.styleSupport || '')} supports — ${esc(d.mixWhy || '')}</p>
    <p>${Object.entries(d.scores || {}).map(([k, v]) => `<span class="score ${v}">${esc(k)}: ${esc(v)}</span>`).join(' ')}</p>
    <button class="btn small" onclick="App.useDirection(${i})">Use this direction</button></div>`).join('')}
  <p><b>Recommended:</b> ${esc(r.recommendation || '')} &nbsp;·&nbsp; <b>Strongest alternative:</b> ${esc(r.alternative || '')}</p></div>`;
}
function renderPrompt() {
  const p = S.studio.prompt;
  if (!p) return '';
  return `<div class="card gold"><h3>Your production-ready prompt</h3>
  <pre class="prompt">${esc(p.prompt)}</pre>
  <p>${(p.checks || []).map((c) => `<span class="${c.pass ? 'ok' : 'bad'}">${c.pass ? '✓' : '✗'} ${esc(c.name)}</span><br>`).join('')}</p>
  <p><b>${p.productionReady ? 'Production-ready.' : 'Not production-ready yet — fix the failed checks above.'}</b></p>
  <button class="btn" onclick="App.copyPrompt()">Copy prompt</button>
  <button class="btn ghost" onclick="App.saveProject()">Save to My Projects</button>
  <button class="btn ghost" onclick="App.makeImage()">Create an image of this scene</button>
  <button class="btn ghost" onclick="App.websiteForProject()">Build a website for this project</button>
  <div id="imgBox">${S.studio.imageUrl ? `<p><img src="${esc(S.studio.imageUrl)}" style="width:100%;border-radius:12px" alt="Generated scene image"></p>` : ''}</div>
  <p class="muted">Video generation is paused — it needs a server or a heavy device. Take this prompt to ${esc(p.platform?.name || 'your platform')} and generate the clip there.</p></div>`;
}

async function vStudio() {
  if (!S.user) return needLogin();
  if (S.access && !S.access.deepAllowed) {
    return `<h1>Studio</h1>` + paywallCard({ data: { message: S.access.message } }) + `<p><a class="btn" href="#/learn">Keep learning for free</a></p>`;
  }
  return `<h1>Studio — write your prompt, step by step</h1>
  <p class="muted">No step is skipped. Each step locks before the next begins. The main aim is helping you write prompts.</p>
  <div class="card gold" id="museBox"><p class="muted">Muse is with you…</p></div>
  <div id="studioSteps"></div><div id="studioBody"></div>
  <div class="card"><h3>Ask Muse about this step</h3>
    <div id="museChatLog">${S.museChat.map((m) => `<p><b>${m.who === 'you' ? 'You' : 'Muse'}:</b> ${esc(m.text)}</p>`).join('')}</div>
    <input id="museChatInput" placeholder="Ask Muse anything about this step…" onkeydown="if(event.key==='Enter')App.askMuse()">
    <button class="btn" onclick="App.askMuse()">Ask Muse</button>
  </div>
  <p><button class="btn ghost" onclick="App.prevStep()">← Back</button></p>`;
}

async function loadMuseTip(step) {
  const box = $('#museBox');
  if (!box) return;
  try {
    const tip = await api('/api/muse/tip?step=' + step);
    box.innerHTML = `<h3>${esc(tip.title)}</h3><p>${esc(tip.text)}</p>`;
  } catch (e) { box.innerHTML = `<h3>Muse says</h3><p>Take it one step at a time, love. Write this step in exact words, then lock it.</p>`; }
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
  <div class="card"><h3>Platforms the Studio writes for</h3>
  <table><tr><th>Platform</th><th>Clips</th><th>Audio</th></tr>
  ${S.platforms.map((p) => `<tr><td>${esc(p.name)}</td><td>${esc(p.clip)}</td><td>${esc(p.audio)}</td></tr>`).join('')}</table></div>
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
  <button class="btn small" onclick="App.openProject(${r.id})">Open in Studio</button>
  <button class="btn small danger" onclick="App.deleteProject(${r.id})">Delete</button></div>`).join('') : '<p class="muted">No projects yet. Build one in the Studio and save it.</p>'}`;
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
  <label>Provider</label><select id="keyProvider"><option value="anthropic">Claude (Anthropic) — primary writing brain</option><option value="perplexity">Perplexity — research</option><option value="openai">ChatGPT (OpenAI) — also images</option><option value="gemini">Gemini (Google)</option><option value="tavily">Tavily — live search</option></select>
  <label>Key</label><input id="keyValue" type="password" placeholder="Paste your key here" autocomplete="off">
  <button class="btn" onclick="App.saveKey()">Save my key</button></div>
  <div class="card"><h3>My usage today (free limits)</h3>
  ${usage ? Object.entries(usage).map(([k, v]) => `<p><b>${esc(k)}:</b> ${v.used} of ${v.limit} used — ${v.remaining} left today</p>`).join('') : '<p class="muted">Could not load usage.</p>'}
  <p class="muted">Tight daily limits per person keep the free credits lasting. The app itself charges nothing.</p></div>
  <div class="card"><h3>About</h3><p>${CREDIT}</p><p class="muted">HCI Studio is an independent app. It runs under no single AI company — it borrows thinking through provider keys.</p></div>`;
}

async function vAdmin() {
  if (!S.user) return needLogin();
  if (S.user.role !== 'owner') return `<div class="notice warn">Only the owner can open this page.</div>`;
  let users = [], usage = null;
  try { users = await api('/api/admin/users'); } catch (e) { return `<div class="notice warn">${esc(e.message)}</div>`; }
  try { usage = await api('/api/usage'); } catch (e) {}
  return `<h1>Owner — accounts</h1>
  <p class="muted">You are the owner — free forever, everything unlocked. You can delete any account. The money from paying users comes to you: it pays the AI costs first, and the remainder is your earnings. Payments start after the test (natural option: Selar; alternatives: Stripe or Paystack).</p>
  <div class="card"><h3>All accounts (${users.length})</h3>
  <table><tr><th>Name</th><th>Email</th><th>Access</th><th>Trial ends</th><th></th></tr>
  ${users.map((u) => `<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.access?.tier || u.role)}${u.access?.tier === 'trial' ? ` (${u.access.daysLeft}d left)` : ''}</td><td>${esc(u.trial_ends_at || '—')}</td><td>${u.id !== S.user.id ? `<button class="btn small danger" onclick="App.deleteUser(${u.id}, '${esc(u.name)}')">Delete</button>` : '<span class="muted">you</span>'}</td></tr>`).join('')}</table></div>
  <div class="card"><h3>Usage today</h3><p>${usage ? usage.today.map((t) => `<span class="chip">${esc(t.kind)}: ${t.n}</span>`).join(' ') : '—'}</p></div>
  <div class="card"><h3>Withdraw the app</h3><p class="muted">Stops the server. Start it again with <b>npm start</b> to bring it back. Full removal is deleting the app folder.</p>
  <button class="btn danger" onclick="App.withdraw()">Withdraw HCI Studio</button></div>`;
}

async function vAuth() {
  if (S.user) return `<div class="card"><h2>You are logged in as ${esc(S.user.name)}</h2><p><a class="btn" href="#/studio">Open the Studio</a></p></div>`;
  return `<h1>Log in / Sign up</h1>
  <div class="card"><h3>Create a free account</h3>
  <p class="muted">New accounts get a <b>14-day free trial</b> with full access to everything. After that, deep tools need a paid plan; basic access stays free. The first account ever created is the owner.</p>
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
    S.chatLog.push({ who: 'you', text }); input.value = '';
    S.chatLog.push({ who: 'hci', text: 'Thinking…' });
    route();
    try {
      const r = await api('/api/chat', 'POST', { message: text });
      S.chatLog[S.chatLog.length - 1] = { who: 'hci', text: r.reply };
    } catch (e) { S.chatLog[S.chatLog.length - 1] = { who: 'hci', text: e.message }; }
    route();
  },
  setPlatform(id) { S.studio.platform = id; S.studio.step = 1; renderStudioStep(); },
  saveIdea() { const v = $('#fIdea').value.trim(); if (!v) { alert('Write your idea first, or search what is trending.'); return; } S.studio.idea = v; S.studio.step = 2; renderStudioStep(); },
  async trending() {
    const box = $('#trendBox');
    if (box) box.innerHTML = '<p class="muted">Searching what is trending right now…</p>';
    try { S.trends = await api('/api/idea/trending', 'POST', { topic: '' }); }
    catch (e) { S.trends = e.paywall ? { available: false, reason: e.data?.message || e.message } : { available: false, reason: e.message }; }
    renderStudioStep();
  },
  async directions() {
    const box = $('#dirBox');
    if (box) box.innerHTML = '<p class="muted">The brain is thinking up three directions…</p>';
    try { S.directions = await api('/api/idea/directions', 'POST', { topic: S.trends ? 'trending topics people are talking about right now' : S.studio.idea, platform: S.studio.platform }); }
    catch (e) { S.directions = { raw: e.message }; }
    renderStudioStep();
  },
  useDirection(i) {
    const d = S.directions?.directions?.[i];
    if (!d) return;
    S.studio.idea = d.title + ' — ' + (d.story || '');
    if (d.styleLead) S.studio.style = d.styleLead;
    if (d.styleSupport) S.studio.styleSupport = d.styleSupport;
    S.studio.step = 2; renderStudioStep();
  },
  nextStep(step, field, inputId) {
    const v = document.getElementById(inputId).value.trim();
    if (!v) { alert('Write this step first. No step is skipped.'); return; }
    S.studio[field] = v; S.studio.step = step + 1; renderStudioStep();
  },
  addScene() { S.studio.scenes.push(''); renderStudioStep(); },
  saveScenes() {
    const vals = S.studio.scenes.map((_, i) => (document.getElementById('fScene' + i)?.value || '').trim());
    if (!vals.some(Boolean)) { alert('Write at least one action.'); return; }
    S.studio.scenes = vals; S.studio.step = 6; renderStudioStep();
  },
  prevStep() { if (S.studio.step > 0) { S.studio.step--; renderStudioStep(); } },
  async assemble() {
    const d = S.studio;
    const scenes = d.scenes.filter(Boolean);
    const payload = {
      platform: d.platform, character: d.character, props: d.props, world: d.world, scenes,
      style: $('#fStyle').value, styleSupport: $('#fStyleSup').value, mixReason: '',
      shotSize: $('#fShot').value, angle: $('#fAngle').value, movement: $('#fMove').value,
      lens: d.lens, lighting: $('#fLight').value.trim() || undefined, composition: d.composition,
      colourMood: $('#fColour').value.trim(), behaviour: $('#fBehav').value.trim(), duration: $('#fDur').value,
    };
    try {
      const r = await api('/api/studio/prompt', 'POST', payload);
      S.studio.prompt = r; S.studio.imageUrl = null; renderStudioStep();
    } catch (e) {
      const box = $('#promptBox');
      if (box) box.innerHTML = e.paywall ? paywallCard(e) : `<div class="notice warn">${esc(e.message)}</div>`;
    }
  },
  copyPrompt() {
    const t = S.studio.prompt?.prompt || '';
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => alert('Prompt copied.'));
    else { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); alert('Prompt copied.'); }
  },
  async askMuse() {
    const input = $('#museChatInput');
    const text = input.value.trim();
    if (!text) return;
    const stepName = STEP_NAMES[S.studio.step];
    S.museChat.push({ who: 'you', text }); input.value = '';
    S.museChat.push({ who: 'muse', text: 'Thinking…' });
    renderStudioStep(); loadMuseTip(S.studio.step);
    try {
      const r = await api('/api/chat', 'POST', { message: `We are on step ${S.studio.step + 1} (${stepName}) of the prompt studio. My project so far: idea "${S.studio.idea}", character "${S.studio.character}", props "${S.studio.props}", world "${S.studio.world}", platform "${S.studio.platform}". My question: ${text}` });
      S.museChat[S.museChat.length - 1] = { who: 'muse', text: r.reply };
    } catch (e) { S.museChat[S.museChat.length - 1] = { who: 'muse', text: e.message }; }
    renderStudioStep(); loadMuseTip(S.studio.step);
  },
  websiteForProject() {
    const d = S.studio;
    S.websiteDraft = { kind: 'project', title: d.idea.slice(0, 60) || 'My Project', tagline: '', about: d.world || '' };
    S.websiteSections = [{ heading: 'The story', text: d.idea || '' }, { heading: 'The character', text: d.character || '' }];
    location.hash = '#/websites'; route();
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
  async saveProject() {
    const d = S.studio;
    const title = prompt('Name this project:', d.idea.slice(0, 60) || 'Untitled project');
    if (title === null) return;
    try {
      await api('/api/projects', 'POST', { title: title || 'Untitled project', platform: d.platform, data: { ...d, prompt: undefined }, prompt: d.prompt?.prompt || '' });
      alert('Saved to My Projects.');
    } catch (e) { alert(e.message); }
  },
  async makeImage() {
    const box = $('#imgBox');
    if (box) box.innerHTML = '<p class="muted">Creating your image…</p>';
    try {
      const r = await api('/api/studio/image', 'POST', { prompt: S.studio.world + ' ' + S.studio.character, style: S.studio.style || 'cinematic realism' });
      S.studio.imageUrl = r.url; renderStudioStep();
    } catch (e) {
      if (box) box.innerHTML = e.paywall ? paywallCard(e) : `<div class="notice warn">${esc(e.message)}</div>`;
    }
  },
  async openProject(id) {
    try {
      const p = await api('/api/projects/' + id);
      const d = p.data || {};
      S.studio = { ...S.studio, ...d, step: 6, prompt: p.prompt_text ? { prompt: p.prompt_text, checks: [], productionReady: true } : null };
      location.hash = '#/studio'; route();
    } catch (e) { alert(e.message); }
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
  async withdraw() {
    if (!confirm('Withdraw HCI Studio? The server will stop. Start it again with npm start to bring it back.')) return;
    try { await api('/api/admin/withdraw', 'POST'); } catch (e) {}
    document.querySelector('#view').innerHTML = '<div class="card"><h2>HCI Studio is withdrawing.</h2><p>The server has stopped. Start it again with <b>npm start</b> to bring it back.</p></div>';
  },
};

boot();
