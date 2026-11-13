// HCI Studio — live trending search (Perplexity-style research with sources).
// Order: Perplexity API -> Tavily API -> DuckDuckGo HTML (no key, best effort).
// Keys come from the user's own key first, then the server key.
// If nothing is available, it says so plainly instead of pretending.
const { research, keyFor } = require('./providers');

async function fetchWithTimeout(url, options = {}, ms = 10000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function searchDuckDuckGo(query) {
  const url = 'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(query);
  const res = await fetchWithTimeout(url, {
    headers: { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36' },
  }, 10000);
  if (!res.ok) throw new Error('DuckDuckGo returned HTTP ' + res.status);
  const html = await res.text();
  const out = [];
  const re = /<a[^>]+class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gs;
  let m;
  while ((m = re.exec(html)) && out.length < 8) {
    const title = m[2].replace(/<[^>]+>/g, '').trim();
    let href = m[1];
    const uddg = href.match(/uddg=([^&]+)/);
    if (uddg) { try { href = decodeURIComponent(uddg[1]); } catch (_) {} }
    if (title && href.startsWith('http')) out.push({ title, url: href });
  }
  if (!out.length) throw new Error('DuckDuckGo returned no usable results.');
  return out;
}

// Find what is trending right now, for creative work.
// Returns { source, trends: [{title, url, why}], note } or { available:false, reason }.
async function trending(topic, userKeys = null) {
  const q = 'What is trending right now, today, in ' + (topic || 'film, AI video, music, internet culture and everyday life') +
    '? List the biggest trending topics, stories, songs, memes and conversations people are talking about today, with a one-line note on each.';

  if (keyFor('perplexity', userKeys)) {
    const r = await research(q, userKeys);
    return { source: 'perplexity', trends: parseTrends(r.text, r.sources), note: 'Live research via Perplexity.' };
  }
  if (keyFor('tavily', userKeys)) {
    const res = await fetchWithTimeout('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ api_key: keyFor('tavily', userKeys), query: q, search_depth: 'advanced', max_results: 8, include_answer: true }),
    }, 15000);
    const data = await res.json();
    if (!res.ok) throw new Error('Tavily error: ' + JSON.stringify(data).slice(0, 200));
    const trends = (data.results || []).map((r) => ({ title: r.title || r.url, url: r.url, why: (r.content || '').slice(0, 200) }));
    if (data.answer) trends.unshift({ title: 'What the search found', url: '', why: data.answer.slice(0, 400) });
    return { source: 'tavily', trends, note: 'Live research via Tavily.' };
  }
  // No key: best-effort public search. If it fails, say so plainly.
  try {
    const results = await searchDuckDuckGo('trending today ' + (topic || 'film AI video music'));
    return {
      source: 'duckduckgo',
      trends: results.map((r) => ({ title: r.title, url: r.url, why: 'A page people are reading right now.' })),
      note: 'Best-effort public search (no key set). For full live research with sources, add your own Perplexity key in Settings.',
    };
  } catch (e) {
    return {
      available: false,
      reason: 'Live trending search needs a key. Add your own Perplexity or Tavily key in Settings (see README), or ask the owner to set one. Without a key the studio still works: type your own idea and walk the steps.',
    };
  }
}

function parseTrends(text, sources) {
  const trends = [];
  const lines = String(text || '').split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const m = line.match(/^[-*\d.)\s]+(.{10,160})$/);
    if (m && trends.length < 8) trends.push({ title: m[1], url: '', why: '' });
  }
  (sources || []).slice(0, 8).forEach((url, i) => {
    if (trends[i]) trends[i].url = url;
    else trends.push({ title: url, url, why: '' });
  });
  return trends;
}

module.exports = { trending };
