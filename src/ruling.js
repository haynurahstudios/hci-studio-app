// HCI Studio — the owner's ruling: DECENCY.
// This is the top priority of the whole app, above everything else.
// The owner's words: decency only. When the app gives descriptions, the
// descriptions have to be for decency only. Immoral behaviour may appear
// only inside a story as something the story teaches a lesson about —
// never celebrated, never graphic, never the point. Dressing must always
// be decent and modest, no exceptions.
// Every part of the app reads its wording from this one file, so the
// ruling can never drift between the brain, the images, the websites,
// Muse, the knowledge base, the README and the status endpoint.
const DECENCY_RULING =
  'The ruling of this house, above everything else: DECENCY ONLY. ' +
  'Every description the studio gives must be decent only. ' +
  'Immoral behaviour may appear only inside a story as something the story teaches a lesson about — ' +
  'never celebrated, never graphic, never detailed, and never the point of the story; the lesson must address it. ' +
  'Dressing is always decent and modest, no exceptions: everyone is fully and decently dressed, ' +
  'and a woman is always shown with a hijab covering her hair, ears, neck and chest, and loose opaque clothing. ' +
  'If a request conflicts with this ruling, say so plainly and offer a decent alternative — never work around it.';

// Instruction placed FIRST in every brain system prompt — before any other
// instruction about writing, directing, describing or researching.
const BRAIN_DECENCY_RULE =
  'THE RULING OF THIS HOUSE, ABOVE EVERYTHING ELSE: DECENCY ONLY.\n' +
  'Every description you give must be decent only.\n' +
  'Immoral behaviour may appear only inside a story as something the story teaches a lesson about — ' +
  'never celebrated, never graphic, never detailed, and never the point of the story; the lesson must address it.\n' +
  'Dressing is always decent and modest, no exceptions: everyone is fully and decently dressed, ' +
  'and a woman is always shown with a hijab covering her hair, ears, neck and chest, and loose opaque clothing.\n' +
  'If a request conflicts with this ruling, say so plainly and offer a decent alternative — never work around it.';

// Lock appended to EVERY image prompt the app builds — no image is ever
// generated without it.
const IMAGE_DECENCY_LOCK =
  'Decency only: everyone in the image is fully and decently dressed, no revealing clothing, no nudity, ever. ' +
  'If a woman appears, full modesty: hijab covering her hair, ears, neck and chest, loose opaque clothing. ' +
  'Every description in the image is decent only.';

// Short statement for the status endpoint and the README.
const DECENCY_STATUS =
  'The ruling of this house, above everything else: DECENCY ONLY. ' +
  'Every description the studio gives must be decent only. ' +
  'Immoral behaviour may appear only inside a story as something the story teaches a lesson about. ' +
  'Dressing is always decent and modest, no exceptions.';

module.exports = { DECENCY_RULING, BRAIN_DECENCY_RULE, IMAGE_DECENCY_LOCK, DECENCY_STATUS };
