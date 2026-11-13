// HCI Studio — built-in knowledge loader.
// Loads data/knowledge.json and data/tutorials.json when present.
// The app works without them (prompt-building falls back to the formulas
// hard-coded in the prompt assembler), but with them it teaches the full
// twenty styles, the principles, the registry and the tutorials.
const fs = require('node:fs');
const path = require('node:path');
const { DECENCY_RULING } = require('./ruling');

const DATA_DIR = path.join(__dirname, '..', 'data');

function loadJson(name, fallback) {
  try {
    const raw = fs.readFileSync(path.join(DATA_DIR, name), 'utf8');
    return JSON.parse(raw);
  } catch (_) {
    return fallback;
  }
}

function knowledge() {
  // The ruling is the top rule of the whole knowledge base, and it is
  // always first in what the API serves — before the styles, the
  // principles, the registry and everything else.
  const loaded = loadJson('knowledge.json', {
    tagline: 'IMAGINE WITHOUT LIMITS. RESEARCH WITH INTELLIGENCE. CREATE WITH DIRECTION.',
    styles: [], animationPrinciples: [], tools: [], disciplines: [],
    cinematographyFormula: '[Shot size] + [Camera angle] + [Camera movement] + [Subject/action] + [Lens and depth of field] + [Lighting] + [Composition] + [Colour mood] + [Visual style]',
    directorsFormula: '[Subject] + [Appearance] + [Position] + [Action in order] + [Environment] + [Interaction] + [Emotion] + [Timing] + [Result] + [Continuity]',
    unverified: ['Runway Gen-4.5 native audio is UNVERIFIED — plan for silent clips plus a separate audio pass.', 'Sora is discontinued — never recommend it.'],
  });
  return { ruling: DECENCY_RULING, ...loaded };
}

function tutorials() {
  return loadJson('tutorials.json', []);
}

module.exports = { knowledge, tutorials };
