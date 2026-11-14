// HCI Studio — the brain: one provider layer over several AI providers.
// The app runs under NO single AI company. It is HCI, the owner's own app,
// and it borrows thinking through provider keys:
//   - Anthropic (Claude): the primary writing brain.
//   - Perplexity: research — live search with sources.
//   - OpenAI (ChatGPT) and Google (Gemini): additional minds.
//   - Groq: an additional mind — fast open models (free tier, no card).
//   - OpenRouter: an additional mind — many free models behind one key
//     (free tier, no card; sign in with Google, no email link).
//   - Tavily: live search, second option after Perplexity.
// Keys come from env vars (the owner's keys) or from the user's own stored
// keys (bring your own key — each user's thinking uses their own key and
// their own free credits; the app itself charges nothing).
// If NO key is available, there is no live brain — and the app says so
// plainly instead of pretending to think. Prompt-building from the built-in
// HCI knowledge always works without a key.
//
// THE RULING, FIRST, BEFORE ANYTHING ELSE: every brain call in this file
// carries the decency ruling at the top of its system prompt — decency
// only, always. See src/ruling.js.
const { logUsage } = require('./db');
const { BRAIN_DECENCY_RULE, IMAGE_DECENCY_LOCK } = require('./ruling');

const TIMEOUT_MS = 60000;

const KEY_ENV = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  gemini: 'GEMINI_API_KEY',
  perplexity: 'PERPLEXITY_API_KEY',
  tavily: 'TAVILY_API_KEY',
  groq: 'GROQ_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
};

const PROVIDER_META = {
  anthropic: { name: 'Claude (Anthropic)', role: 'Primary writing brain' },
  openai: { name: 'ChatGPT (OpenAI)', role: 'Additional mind · images' },
  gemini: { name: 'Gemini (Google)', role: 'Additional mind' },
  perplexity: { name: 'Perplexity', role: 'Research — live search with sources' },
  tavily: { name: 'Tavily', role: 'Live search (second option)' },
  groq: { name: 'Groq', role: 'Additional mind · fast open models' },
  openrouter: { name: 'OpenRouter', role: 'Additional mind · free open models' },
};

function env(name) {
  const v = (process.env[name] || '').trim();
  return v || null;
}

// Effective key for a provider: the user's own key first, then the server key.
function keyFor(provider, userKeys) {
  if (userKeys && userKeys[provider]) return userKeys[provider];
  return env(KEY_ENV[provider]);
}

function availableProviders(userKeys) {
  const list = [];
  for (const id of ['anthropic', 'openai', 'gemini', 'groq', 'openrouter', 'perplexity']) {
    if (keyFor(id, userKeys)) {
      list.push({ id, name: PROVIDER_META[id].name, role: PROVIDER_META[id].role, mine: Boolean(userKeys && userKeys[id]) });
    }
  }
  return list;
}

function hasBrain(userKeys) {
  return availableProviders(userKeys).length > 0;
}

function brainStatus(userKeys) {
  const providers = availableProviders(userKeys);
  const searchReady = Boolean(keyFor('perplexity', userKeys) || keyFor('tavily', userKeys));
  return {
    liveBrain: providers.length > 0,
    providers,
    imageReady: Boolean(keyFor('openai', userKeys) || (process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID)),
    searchReady,
    note: providers.length === 0
      ? 'No AI key is set. The studio still works for prompt-building from its built-in HCI knowledge, but the live brain (thinking, trending ideas, image creation) needs a key. Add your own key in Settings — your key stays yours and your thinking uses your own free credits.'
      : 'Live brain is on.',
  };
}

async function fetchJson(url, options, timeoutMs = TIMEOUT_MS) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch (_) { /* non-JSON error body */ }
    if (!res.ok) {
      const msg = (data && (data.error?.message || data.error || data.message)) || text.slice(0, 300) || ('HTTP ' + res.status);
      throw new Error('Provider error (' + res.status + '): ' + String(msg).slice(0, 300));
    }
    return data;
  } finally {
    clearTimeout(t);
  }
}

// One chat call, routed to the first available provider.
// Preference order: Claude (writes best) -> ChatGPT -> Gemini -> Perplexity.
// If a provider fails (wrong key, no credit, busy), the next provider is
// tried instead of failing the whole call — one bad key must never stop
// the brain while another good key is set.
// Returns { provider, model, text }.
// Pictures: the last user message carries the picture, in the
// OpenAI-compatible vision format (text + image_url). Earlier messages
// stay plain text — the brain sees the picture in front of it now, not
// earlier ones.
function buildVisionMessages(messages, image) {
  const out = messages.map((m) => ({ role: m.role, content: m.content }));
  for (let i = out.length - 1; i >= 0; i--) {
    if (out[i].role === 'user') {
      out[i] = { role: 'user', content: [{ type: 'text', text: out[i].content || 'What is in this picture?' }, { type: 'image_url', image_url: { url: image } }] };
      break;
    }
  }
  return out;
}

async function think(messages, { system, temperature = 0.7, maxTokens = 2000, image = null } = {}, userKeys = null) {
  // The decency ruling goes first, before any other instruction.
  const sys = BRAIN_DECENCY_RULE + '\n' + (system || 'You are HCI, Haynurah Creative Intelligence. Think in plain words. Never invent evidence. Never present an unverified claim as fact.');
  let lastProviderErr = null;
  // PICTURES: when a message carries a picture, only the models that can
  // SEE are asked. OpenAI (gpt-4o-mini) first, then the free OpenRouter
  // vision models — Super VL first, then Nano Omni. The text-only models
  // are skipped, because sending them a picture would fail. A picture
  // costs the same as one chat for the limits (it is one brain call).
  if (image) {
    const visionMessages = buildVisionMessages(messages, image);
    if (keyFor('openai', userKeys)) {
      try {
        const data = await fetchJson('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: 'Bearer ' + keyFor('openai', userKeys) },
          body: JSON.stringify({ model: 'gpt-4o-mini', temperature, max_tokens: maxTokens, messages: [{ role: 'system', content: sys }, ...visionMessages] }),
        });
        return { provider: 'openai', model: 'gpt-4o-mini', text: data.choices?.[0]?.message?.content || '' };
      } catch (e) { lastProviderErr = e; }
    }
    if (keyFor('openrouter', userKeys)) {
      const visionTeam = ['nvidia/nemotron-3.5-super-vl:free', 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free'];
      for (const model of visionTeam) {
        try {
          const data = await fetchJson('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              authorization: 'Bearer ' + keyFor('openrouter', userKeys),
              'HTTP-Referer': 'https://hci-studio-app-production.up.railway.app/',
              'X-Title': 'HCI Studio',
            },
            body: JSON.stringify({ model, temperature, max_tokens: Math.max(maxTokens, 4000), messages: [{ role: 'system', content: sys }, ...visionMessages] }),
          });
          const text = data.choices?.[0]?.message?.content || '';
          if (text) return { provider: 'openrouter', model, text };
        } catch (e) { lastProviderErr = e; }
      }
    }
    throw lastProviderErr || new Error('No picture-reading model could be reached right now. Please try again.');
  }
  if (keyFor('anthropic', userKeys)) {
    try {
    const data = await fetchJson('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': keyFor('anthropic', userKeys),
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: maxTokens, temperature, system: sys, messages }),
    });
    const text = (data.content || []).map((b) => b.text || '').join('');
    return { provider: 'anthropic', model: 'claude-sonnet-4-5', text };
    } catch (e) { lastProviderErr = e; }
  }
  if (keyFor('openai', userKeys)) {
    try {
    const data = await fetchJson('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + keyFor('openai', userKeys) },
      body: JSON.stringify({ model: 'gpt-4o-mini', temperature, max_tokens: maxTokens, messages: [{ role: 'system', content: sys }, ...messages] }),
    });
    return { provider: 'openai', model: 'gpt-4o-mini', text: data.choices?.[0]?.message?.content || '' };
    } catch (e) { lastProviderErr = e; }
  }
  if (keyFor('gemini', userKeys)) {
    try {
    const data = await fetchJson(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + keyFor('gemini', userKeys),
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: sys }] },
          contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
          generationConfig: { temperature, maxOutputTokens: maxTokens },
        }),
      }
    );
    const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
    return { provider: 'gemini', model: 'gemini-2.5-flash', text };
    } catch (e) { lastProviderErr = e; }
  }
  // Groq: fast open models on an OpenAI-compatible endpoint.
  // Free tier, no card. Model gpt-oss-120b (OpenAI's open-weight model).
  if (keyFor('groq', userKeys)) {
    try {
    const data = await fetchJson('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + keyFor('groq', userKeys) },
      body: JSON.stringify({ model: 'openai/gpt-oss-120b', temperature, max_tokens: maxTokens, messages: [{ role: 'system', content: sys }, ...messages] }),
    });
    return { provider: 'groq', model: 'openai/gpt-oss-120b', text: data.choices?.[0]?.message?.content || '' };
    } catch (e) { lastProviderErr = e; }
  }
  // OpenRouter: the three free Nemotron models work as a TEAM, one at a
  // time. Ultra is asked first; if it is down or slow, Super VL is
  // asked; if that is down, Nano. Only ONE of them answers a chat, so
  // one chat costs ONE free call — not three. (They used to be asked all
  // at once, which was fast but burned 3 calls per chat, and the free
  // 50-a-day limit finished after only about 16 chats. One at a time
  // gives 50 chats a day.) If all three are down, the openrouter/free
  // router is tried once as a last resort. Free tier, no card, sign in
  // with Google (no email link). Free models also reason before
  // answering, so the token budget gets generous headroom. Each model
  // gets 30 seconds: a slow one fails fast instead of holding the chat up.
  if (keyFor('openrouter', userKeys)) {
    try {
    const team = [
      'nvidia/nemotron-3-ultra-550b-a55b:free',
      'nvidia/nemotron-3.5-super-vl:free',
      'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
    ];
    const budget = Math.max(maxTokens, 4000);
    const callModel = (model) => fetchJson('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer ' + keyFor('openrouter', userKeys),
        'HTTP-Referer': 'https://hci-studio-app-production.up.railway.app/',
        'X-Title': 'HCI Studio',
      },
      body: JSON.stringify({ model, temperature, max_tokens: budget, messages: [{ role: 'system', content: sys }, ...messages] }),
    }, 30000).then((data) => {
      const text = data.choices?.[0]?.message?.content || '';
      if (!text) throw new Error('Empty answer from ' + model);
      return { model, text };
    });
    // One at a time, in order: the first model that answers is used, and
    // the others are never even asked. One chat costs one free call.
    var lastErr = null;
    for (const model of team) {
      try {
        const done = await callModel(model);
        return { provider: 'openrouter', model: done.model, text: done.text };
      } catch (e) { lastErr = e; }
    }
    // Last resort: the router picks any free model that is up.
    try {
      const data = await fetchJson('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer ' + keyFor('openrouter', userKeys),
          'HTTP-Referer': 'https://hci-studio-app-production.up.railway.app/',
          'X-Title': 'HCI Studio',
        },
        body: JSON.stringify({ model: 'openrouter/free', temperature, max_tokens: budget, messages: [{ role: 'system', content: sys }, ...messages] }),
      });
      return { provider: 'openrouter', model: 'openrouter/free', text: data.choices?.[0]?.message?.content || '' };
    } catch (e) { throw lastErr || e; }
    } catch (e) { lastProviderErr = e; }
  }
  if (keyFor('perplexity', userKeys)) {
    try {
    const data = await fetchJson('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + keyFor('perplexity', userKeys) },
      body: JSON.stringify({ model: 'sonar', temperature, max_tokens: maxTokens, messages: [{ role: 'system', content: sys }, ...messages] }),
    });
    return { provider: 'perplexity', model: 'sonar', text: data.choices?.[0]?.message?.content || '' };
    } catch (e) { lastProviderErr = e; }
  }
  throw lastProviderErr || new Error('NO_BRAIN');
}

// Research with sources (Perplexity-style). Uses Perplexity when a key is
// set; otherwise the think provider is asked to answer with named sources
// it can actually cite, and to say plainly when it cannot verify something.
async function research(query, userKeys = null) {
  if (keyFor('perplexity', userKeys)) {
    const data = await fetchJson('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + keyFor('perplexity', userKeys) },
      body: JSON.stringify({
        model: 'sonar',
        temperature: 0.3,
        messages: [
          { role: 'system', content: BRAIN_DECENCY_RULE + '\nAnswer with facts and name your sources. If you cannot verify something, say so plainly.' },
          { role: 'user', content: query },
        ],
      }),
    });
    return {
      provider: 'perplexity', model: 'sonar',
      text: data.choices?.[0]?.message?.content || '',
      sources: data.citations || [],
    };
  }
  const r = await think(
    [{ role: 'user', content: query + '\n\nName the sources for every fact. If you cannot verify a fact, say so plainly instead of guessing.' }],
    { system: 'You are HCI, a researcher. Answer with facts and named sources only. Never invent a source. If you cannot verify something, say so.', temperature: 0.3 },
    userKeys
  );
  return { ...r, sources: [] };
}

// Image generation — FREE first, paid as a fallback. Returns
// { provider, model, base64, mime }.
// Cloudflare Workers AI (FLUX.1 [schnell]) is FREE: a free Cloudflare
// account, no card, about 200 images a day. OpenAI (gpt-image-1) is the
// paid fallback and needs credits. The decency lock is appended to EVERY
// image prompt the app builds — no image is ever generated without it.
async function createImageCloudflare(prompt, style) {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !accountId) throw new Error('NO_IMAGE_KEY');
  const fullPrompt =
    'Image in the style of ' + (style || 'cinematic realism') + '. ' + prompt + ' ' + IMAGE_DECENCY_LOCK +
    ' No legible text, no logos, no watermarks.';
  const res = await fetch(
    'https://api.cloudflare.com/client/v4/accounts/' + accountId + '/ai/run/@cf/black-forest-labs/flux-1-schnell',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
      body: JSON.stringify({ prompt: fullPrompt, steps: 4 }),
      signal: AbortSignal.timeout(120000),
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error('Cloudflare image error (' + res.status + '): ' + text.slice(0, 200));
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    // Workers AI answers with JSON, not a raw image file:
    // {"result":{"image":"<base64 JPEG>"}, "success": true, ...}.
    // The picture is inside the JSON — read it out of there.
    const j = await res.json().catch(() => null);
    const b64 = j && j.result && typeof j.result.image === 'string' ? j.result.image : '';
    if (!b64) throw new Error('Cloudflare image error: no image in the answer.');
    return { provider: 'cloudflare', model: 'flux-1-schnell', base64: b64, mime: 'image/jpeg' };
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.length) throw new Error('The image provider returned no image.');
  return { provider: 'cloudflare', model: 'flux-1-schnell', base64: buf.toString('base64'), mime: 'image/png' };
}

async function createImage(prompt, style, userKeys = null) {
  // Free first: Cloudflare. If it is not set up, or it refuses, fall
  // through to OpenAI (paid, needs credits).
  if (process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID) {
    try {
      return await createImageCloudflare(prompt, style);
    } catch (e) {
      console.error('cloudflare image failed, trying OpenAI:', e.message);
    }
  }
  const key = keyFor('openai', userKeys);
  if (!key) throw new Error('NO_IMAGE_KEY');
  const fullPrompt =
    'Image in the style of ' + (style || 'cinematic realism') + '. ' + prompt + ' ' + IMAGE_DECENCY_LOCK +
    ' No legible text, no logos, no watermarks.';
  const headers = { 'content-type': 'application/json', authorization: 'Bearer ' + key };
  let data;
  try {
    data = await fetchJson('https://api.openai.com/v1/images/generations', {
      method: 'POST', headers,
      body: JSON.stringify({ model: 'gpt-image-1', prompt: fullPrompt, size: '1024x1024', n: 1 }),
    }, 120000);
  } catch (e) {
    if (!/404|model/i.test(String(e.message || ''))) throw e;
    data = await fetchJson('https://api.openai.com/v1/images/generations', {
      method: 'POST', headers,
      body: JSON.stringify({ model: 'dall-e-3', prompt: fullPrompt, size: '1024x1024', n: 1 }),
    }, 120000);
  }
  const item = data.data?.[0];
  if (!item) throw new Error('The image provider returned no image.');
  if (item.b64_json) return { provider: 'openai', model: 'gpt-image-1', base64: item.b64_json, mime: 'image/png' };
  if (item.url) {
    const res = await fetch(item.url);
    const buf = Buffer.from(await res.arrayBuffer());
    return { provider: 'openai', model: 'dall-e-3', base64: buf.toString('base64'), mime: 'image/png' };
  }
  throw new Error('The image provider returned no image.');
}

module.exports = { availableProviders, hasBrain, brainStatus, think, research, createImage, keyFor, PROVIDER_META, logUsage, buildVisionMessages };
