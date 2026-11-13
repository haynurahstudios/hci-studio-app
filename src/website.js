// HCI Studio — website builder.
// A student can ask the studio to build a website (a showcase site for
// their work, or a page for a project), and the studio builds the website's
// code — pages, design, text, images — ready to use.
// Two paths:
//   1. Templates (no key needed): the studio assembles a complete,
//      self-contained HTML file from the student's own words.
//   2. Live brain (needs a key): the brain writes custom HTML for the site.
// Generated sites are static HTML + CSS only — no JavaScript — so they are
// safe to open anywhere. Images are embedded as data URIs when the student
// made one in the studio. Video generation is NOT part of this: video stays
// paused; the studio hands over prompts instead.
//
// THE RULING APPLIES TO GENERATED SITES TOO: the live brain writes every
// site under the decency ruling (the ruling is the first instruction in
// every brain system prompt — see src/ruling.js), so the text it writes is
// decent only and any imagery is modest. Template sites are built from the
// student's own words, and the Websites page states the house rule plainly
// before the student builds. The credit line is always kept.
const fs = require('node:fs');
const path = require('node:path');

const PALETTES = {
  'navy-gold': { name: 'Navy & Gold (HCI house)', bg: '#0E101C', bg2: '#161A2E', ink: '#F2EFE6', muted: '#A9AEC4', accent: '#D9B36A', line: '#2A3052' },
  'teal-gold': { name: 'Teal & Gold', bg: '#0B1F22', bg2: '#102E33', ink: '#EAF6F2', muted: '#9DB8B2', accent: '#D9B36A', line: '#1E4046' },
  'warm-cream': { name: 'Warm Cream', bg: '#FBF6EC', bg2: '#FFFDF7', ink: '#2B2118', muted: '#7A6A58', accent: '#B98A2F', line: '#E4D9C4' },
  'midnight-violet': { name: 'Midnight Violet', bg: '#150F24', bg2: '#1E1533', ink: '#F0EAFB', muted: '#A89CC4', accent: '#C9A7F5', line: '#33254F' },
};

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function css(p) {
  return `*{box-sizing:border-box}body{margin:0;background:${p.bg};color:${p.ink};font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;line-height:1.6}
header{padding:56px 20px 40px;text-align:center;background:${p.bg2};border-bottom:1px solid ${p.line}}
h1{color:${p.accent};font-size:2.1rem;margin:.2em 0;line-height:1.2}h2{color:${p.accent};margin-top:0}
.tag{color:${p.accent};letter-spacing:.12em;font-weight:700;font-size:.85rem}
main{max-width:820px;margin:0 auto;padding:24px 20px 60px}
section{background:${p.bg2};border:1px solid ${p.line};border-radius:14px;padding:20px;margin:18px 0}
.hero-img{width:100%;border-radius:14px;display:block;margin:18px 0}
footer{border-top:1px solid ${p.line};text-align:center;color:${p.muted};padding:22px 16px 34px;font-size:.9rem}
a{color:${p.accent}}`;
}

function buildFromTemplate(input) {
  const kind = ['showcase', 'project', 'landing'].includes(input.kind) ? input.kind : 'showcase';
  const p = PALETTES[input.palette] || PALETTES['navy-gold'];
  const title = String(input.title || 'My Work').trim();
  const tagline = String(input.tagline || '').trim();
  const about = String(input.about || '').trim();
  const sections = Array.isArray(input.sections) ? input.sections.filter((s) => s && (s.heading || s.text)) : [];
  const image = input.imageDataUri || '';

  let sectionsHtml = '';
  if (kind === 'landing') {
    sectionsHtml = sections.map((s) => `<section><h2>${esc(s.heading || '')}</h2><p>${esc(s.text || '')}</p></section>`).join('\n');
    sectionsHtml += `<section style="text-align:center"><h2>${esc(input.ctaHeading || 'See the work')}</h2><p>${esc(input.ctaText || '')}</p></section>`;
  } else if (kind === 'project') {
    sectionsHtml = (about ? `<section><h2>About this project</h2><p>${esc(about)}</p></section>` : '') +
      sections.map((s) => `<section><h2>${esc(s.heading || '')}</h2><p>${esc(s.text || '')}</p></section>`).join('\n');
  } else {
    sectionsHtml = (about ? `<section><h2>About me</h2><p>${esc(about)}</p></section>` : '') +
      sections.map((s) => `<section><h2>${esc(s.heading || '')}</h2><p>${esc(s.text || '')}</p></section>`).join('\n');
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>${css(p)}</style>
</head>
<body>
<header>
<div class="tag">${esc(tagline)}</div>
<h1>${esc(title)}</h1>
${image ? `<img class="hero-img" src="${image}" alt="">` : ''}
</header>
<main>
${sectionsHtml || '<section><p>Your work goes here.</p></section>'}
</main>
<footer>Made with HCI Studio.<br>Made by Haynurah, the founder of Haynurah Studios.</footer>
</body>
</html>`;
  return { html, kind, palette: p.name };
}

// Safety pass for brain-written HTML: static HTML + CSS only.
// Strips scripts, iframes, objects, embeds, forms and event handlers.
function sanitizeBrainHtml(html) {
  let out = String(html || '');
  out = out.replace(/<script[\s\S]*?<\/script>/gi, '');
  out = out.replace(/<iframe[\s\S]*?(<\/iframe>|>)/gi, '');
  out = out.replace(/<\/(iframe|object|embed|script)>/gi, '');
  out = out.replace(/<(object|embed|form|link|meta|base)[^>]*>/gi, '');
  out = out.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  out = out.replace(/(href|src)\s*=\s*("javascript:[^"]*"|'javascript:[^']*')/gi, '$1="#"');
  if (!/<html[\s>]/.test(out)) {
    out = '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>My website</title>\n</head>\n<body>\n' + out + '\n<footer>Made with HCI Studio.<br>Made by Haynurah, the founder of Haynurah Studios.</footer>\n</body>\n</html>';
  }
  if (!/Made by Haynurah/.test(out)) {
    out = out.replace('</body>', '<footer style="text-align:center;padding:20px;color:#888">Made with HCI Studio.<br>Made by Haynurah, the founder of Haynurah Studios.</footer>\n</body>');
  }
  return out;
}

function sitesDir(dataDir) {
  const dir = path.join(dataDir, 'sites');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

module.exports = { PALETTES, buildFromTemplate, sanitizeBrainHtml, sitesDir, esc };
