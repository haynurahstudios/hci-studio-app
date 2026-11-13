// HCI Studio — platform rules for prompt shaping.
// What each tool can and cannot do, from the November 2026 tool registry.
// Sora is discontinued — it is never listed as an option.
// Runway Gen-4.5 native audio is UNVERIFIED — plan for silent clips.
const PLATFORMS = {
  'kling-4.0': {
    name: 'Kling 4.0', kind: 'video',
    clip: '3–30 seconds in one pass',
    audio: 'Two-channel stereo audio on every clip. Speech in nine languages.',
    notes: '720p / 1080p / 4K. Up to 15 reference assets. May add subtitles and background music by default — say "no subtitles, no background music" unless you want them.',
    promptShape: 'Write for a 10-second clip with native audio. Keep dialogue short — lip-sync is the fragile part.',
  },
  'google-flow': {
    name: 'Google Flow (Veo 3.1 / Gemini Omni)', kind: 'video',
    clip: 'Veo 3.1: 4 / 6 / 8 seconds. Gemini Omni: 3–15 seconds.',
    audio: 'Native audio on Veo 3.1 and Omni.',
    notes: 'Flow generates new clips; it does not grade existing footage. Omni can reportedly edit an existing video.',
    promptShape: 'Write for an 8-second clip with native audio. One shot, one camera move.',
  },
  'runway-gen-4.5': {
    name: 'Runway Gen-4.5', kind: 'video',
    clip: '2–10 seconds at 720p',
    audio: 'UNVERIFIED whether native audio has shipped — plan for a SILENT clip plus a separate audio pass.',
    notes: '12 credits per second. Requires the Standard plan or higher.',
    promptShape: 'Write for a silent 10-second clip. Describe no dialogue or sound in the shot; sound is added separately.',
  },
  'pika-2.5': {
    name: 'Pika 2.5', kind: 'video',
    clip: '10–15 seconds native (25 seconds via Pikaframes)',
    audio: 'No native audio in the core model. Pikaformance adds audio-driven lip-sync up to 30 seconds as a separate feature.',
    notes: 'Max 1080p. Free tier 80 credits a month; paid from $8 a month.',
    promptShape: 'Write for a silent 10–15 second clip. No dialogue in the shot unless using Pikaformance.',
  },
  'luma-ray-3.2': {
    name: 'Luma Ray 3.2', kind: 'video',
    clip: '5 or 10 seconds native; Modify Video up to 20 seconds at 1080p',
    audio: 'No native audio for text/image-to-video.',
    notes: 'Native 16-bit HDR with EXR export. Up to 16 keyframes.',
    promptShape: 'Write for a silent 10-second clip. Use keyframes to describe the change across the shot.',
  },
  'midjourney-v8': {
    name: 'Midjourney V8 Video', kind: 'video',
    clip: 'Up to 10 seconds at 60fps',
    audio: 'Every Midjourney video clip is silent.',
    notes: 'Pro / Mega plans only. A live copyright suit (Disney / NBCUniversal / DreamWorks) is an overhang on commercial use — check before selling work made with it.',
    promptShape: 'Write for a silent 10-second clip. Style-first: name the look before the action.',
  },
  'seedance-2.5': {
    name: 'Seedance 2.5 (ByteDance)', kind: 'video',
    clip: 'Verify clip length on the platform before spending.',
    audio: 'Verify on the platform before spending.',
    notes: 'Seedance is ByteDance’s video model. Seedance 1.0 is integrated into CapCut as Video Studio for paid users in some countries; US availability inside CapCut is unresolved — do not state a US position. Verify everything about Seedance 2.5 on the platform itself before building a workflow on it.',
    promptShape: 'Write a short clip prompt and verify length, audio and price on the platform before spending.',
  },
  'capcut': {
    name: 'CapCut', kind: 'editor',
    clip: 'Editor, not a generator. Full basic editor free, 1080p export.',
    audio: 'Edit and add audio in the timeline; Seedance video generation inside CapCut is for paid users in some countries.',
    notes: 'Pro $19.99 a month after the May 2025 restructure (Standard about $9.99 a month). AI colour: basic features free per CapCut’s own page; advanced AI features are Pro per independent reviews — the exact boundary is unclear.',
    promptShape: 'CapCut edits video; it does not write a generation prompt. Use it to cut, grade and finish a clip made elsewhere.',
  },
  'creen-ai': {
    name: 'Creen AI', kind: 'studio',
    clip: 'Video up to 10 seconds at 1080p; images up to 4K',
    audio: 'Depends on the model chosen inside Creen.',
    notes: 'A browser studio putting 40+ third-party models behind one interface and one credit pool. It resells other makers’ models — it is not a model maker. Pro $29 a month (8,000 credits). Its roster lists "Sora 2" but Sora was discontinued in 2026 — recorded as unverified; never build a workflow on it until checked on Creen itself.',
    promptShape: 'Write for a 10-second clip at 1080p, and name the model inside Creen the prompt is written for.',
  },
  'meta-ai-vibes': {
    name: 'Meta AI (Vibes)', kind: 'video',
    clip: 'Short clips in the Meta AI app; uploaded video for editing capped at 10 seconds',
    audio: 'Verify on the platform before spending.',
    notes: 'Video generation is free inside the Meta AI app / meta.ai, mainly through Vibes. Daily allowance is unpublished. Movie Gen is a research model, not a product.',
    promptShape: 'Write for a short vertical clip made in the Meta AI app.',
  },
};

function platformList() {
  return Object.entries(PLATFORMS).map(([id, p]) => ({ id, name: p.name, kind: p.kind, clip: p.clip, audio: p.audio }));
}

module.exports = { PLATFORMS, platformList };
