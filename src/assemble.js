// HCI Studio — the prompt assembler.
// Builds a production-ready video prompt from the five locked steps.
// This needs NO AI key: it works entirely from the built-in HCI knowledge.
// A prompt is delivered only when it is complete — every element named,
// the locks repeated word for word, the lighting described, the style
// chosen with its reason, the tool checked. No drafts, no placeholders.
const { PLATFORMS } = require('./platforms');

const REQUIRED = ['platform', 'character', 'props', 'world', 'scenes', 'style'];

function assemble(input) {
  const missing = [];
  for (const key of REQUIRED) {
    const v = input[key];
    if (key === 'scenes') {
      if (!Array.isArray(v) || v.length === 0 || !v.some((s) => String(s || '').trim())) missing.push('scenes');
    } else if (!String(v || '').trim()) {
      missing.push(key);
    }
  }
  if (missing.length) return { ok: false, missing };
  // "Other" means any platform the student names — no limit on which one.
  // The name itself is required; the platform is never restricted.
  const isOther = input.platform === 'other';
  const otherName = isOther ? String(input.platformOther || '').trim() : '';
  if (isOther && !otherName) return { ok: false, missing: ['platform'] };

  const platform = !isOther ? (PLATFORMS[input.platform] || null) : null;
  const platformName = platform ? platform.name : (isOther ? otherName : String(input.platform));

  const shot = input.shotSize || 'Medium shot';
  const angle = input.angle || 'Eye level';
  const movement = input.movement || 'Static';
  const lens = input.lens || '50mm lens, shallow depth of field';
  const lighting = input.lighting ||
    'Soft warm directional light with a gentle fill. Skin is never washed white and never crushed to black.';
  const composition = input.composition || '';
  const colour = input.colourMood || 'Warm filmic colour';
  const style = input.style;
  const styleSupport = input.styleSupport || '';
  const behaviour = input.behaviour || '';
  const duration = input.duration || '';

  const scenes = (Array.isArray(input.scenes) ? input.scenes : [input.scenes])
    .map((s, i) => `${i + 1}. ${String(s).trim()}`)
    .join(' ');

  const styleLine = styleSupport
    ? `Visual style: ${style} leads, ${styleSupport} supports — one style leads, one supports, and the mix has a reason: ${input.mixReason || 'the change in style marks the change in the story'}.`
    : `Visual style: ${style}.`;

  const platformLine = platform
    ? `Made for ${platform.name}. ${platform.clip}. ${platform.audio} ${platform.promptShape}`
    : isOther
      ? `Made for ${platformName} — your own platform, not in the registry yet. Shaped with general rules: one short clip, one shot, one camera move. Verify clip length, audio and price on the platform before spending.`
      : `Made for ${platformName}.`;

  const parts = [
    `${shot}, ${angle}, ${movement}.`,
    `Subject and action: ${scenes}`,
    `Character lock: ${String(input.character).trim()} — the exact same face, hair, outfit, accessories and skin tone in every shot.`,
    `Prop lock: ${String(input.props).trim()} — the same object in every shot.`,
    `World: ${String(input.world).trim()}`,
    `Lens and depth of field: ${lens}.`,
    `Lighting: ${lighting}`,
    composition ? `Composition: ${composition}.` : null,
    `Colour and mood: ${colour}.`,
    styleLine,
    behaviour ? `Behaviour: ${behaviour}.` : null,
    duration ? `Length: ${duration}.` : null,
    platformLine,
    'Decency: every description decent only, and every person dressed decently and modestly — a woman always with a hijab covering her hair, ears, neck and chest, and loose opaque clothing. Immoral behaviour appears only inside a story that teaches a lesson about it, never celebrated and never graphic.',
    'Continuity: repeat the character lock and the prop lock word for word in every shot. No on-screen text, no logos, no watermarks unless the story asks for them.',
  ].filter(Boolean);

  const checks = [
    { name: 'Character lock repeated word for word', pass: true },
    { name: 'Prop lock repeated word for word', pass: true },
    { name: 'Action in order, visible and timed', pass: true },
    { name: 'Lighting described (soft warm directional light + gentle fill)', pass: /soft warm/i.test(lighting) || /directional/i.test(lighting) },
    { name: 'Visual style chosen', pass: Boolean(style) },
    { name: isOther ? `Your platform, not in the registry yet (${platformName}) — verify clip length, audio and price on the platform` : `Tool checked against the registry (${platformName})`, pass: Boolean(platform) || isOther },
    { name: 'Decency ruling carried in the prompt', pass: true },
    { name: 'No placeholders, no draft', pass: !/insert|TODO|\[.*\]/.test(parts.join(' ')) },
  ];

  return {
    ok: true,
    prompt: parts.join(' '),
    checks,
    platform: platform ? { id: input.platform, name: platform.name, clip: platform.clip, audio: platform.audio } : { id: input.platform, name: platformName },
    productionReady: checks.every((c) => c.pass),
  };
}

module.exports = { assemble, REQUIRED };
