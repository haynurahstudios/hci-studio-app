// HCI Studio — the brain: one provider layer over several AI providers.
// The app runs under NO single AI company. It is HCI, the owner's own app,
// and it borrows thinking through provider keys:
//   - Anthropic (Claude): the primary writing brain.
//   - Perplexity: research — live search with sources.
//   - OpenAI (ChatGPT) and Google (Gemini): additional minds.
//   - Groq: an additional mind — fast open models (free tier, no card).
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
};

const PROVIDER_META = {
  anthropic: { name: 'Claude (Anthropic)', role: 'Primary writing brain' },
  openai: { name: 'ChatGPT (OpenAI)', role: 'Additional mind · images' },
  gemini: { name: 'Gemini (Google)', role: 'Additional mind' },
  perplexity: { name: 'Perplexity', role: 'Research — live search with sources' },
  tavily: { name: 'Tavily', role: 'Live search (second option)' },
  groq: { name: 'Groq', role: 'Additional mind · fast open models' },
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
  for (const id of ['anthropic', 'openai', 'gemini', 'groq', 'perplexity']) {
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
    imageReady: Boolean(keyFor('openai', userKeys)),
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
// Returns { provider, model, text }.
async function think(messages, { system, temperature = 0.7, maxTokens = 2000 } = {}, userKeys = null) {
  // The decency ruling goes first, before any other instruction.
  const sys = BRAIN_DECENCY_RULE + '\n' + (system || 'You are HCI, Haynurah Creative Intelligence. Think in plain words. Never invent evidence. Never present an unverified claim as fact.');
  if (keyFor('anthropic', userKeys)) {
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
  }
  if (keyFor('openai', userKeys)) {
    const data = await fetchJson('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + keyFor('openai', userKeys) },
      body: JSON.stringify({ model: 'gpt-4o-mini', temperature, max_tokens: maxTokens, messages: [{ role: 'system', content: sys }, ...messages] }),
    });
    return { provider: 'openai', model: 'gpt-4o-mini', text: data.choices?.[0]?.message?.content || '' };
  }
  if (keyFor('gemini', userKeys)) {
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
  }
  // Groq: fast open models on an OpenAI-compatible endpoint.
  // Free tier, no card. Model gpt-oss-120b (OpenAI's open-weight model).
  if (keyFor('groq', userKeys)) {
    const data = await fetchJson('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + keyFor('groq', userKeys) },
      body: JSON.stringify({ model: 'openai/gpt-oss-120b', temperature, max_tokens: maxTokens, messages: [{ role: 'system', content: sys }, ...messages] }),
    });
    return { provider: 'groq', model: 'openai/gpt-oss-120b', text: data.choices?.[0]?.message?.content || '' };
  }
  if (keyFor('perplexity', userKeys)) {
    const data = await fetchJson('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + keyFor('perplexity', userKeys) },
      body: JSON.stringify({ model: 'sonar', temperature, max_tokens: maxTokens, messages: [{ role: 'system', content: sys }, ...messages] }),
    });
    return { provider: 'perplexity', model: 'sonar', text: data.choices?.[0]?.message?.content || '' };
  }
  throw new Error('NO_BRAIN');
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

// Image generation (OpenAI Images API). Returns { provider, model, base64, mime }.
// The decency lock is appended to EVERY image prompt the app builds —
// no image is ever generated without it.
async function createImage(prompt, style, userKeys = null) {
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

module.exports = { availableProviders, hasBrain, brainStatus, think, research, createImage, keyFor, PROVIDER_META, logUsage };
