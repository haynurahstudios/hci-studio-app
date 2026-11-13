# HCI Studio

> **IMAGINE WITHOUT LIMITS. RESEARCH WITH INTELLIGENCE. CREATE WITH DIRECTION.**

> Made by Haynurah, the founder of Haynurah Studios.

HCI Studio is an **independent web app** that helps people write production-ready AI video prompts, step by step. Its main aim is helping people write prompts. It is **not** a Muse artifact, **not** a Muse space, and it does not run on Muse. It is its own app, named HCI, with its own code, its own hosting, and its own AI access.

---

## The ruling — decency first

This is the top priority of the whole app, above everything else, in the owner's own words: **decency only.**

- Every description the studio gives must be **decent only**.
- Immoral behaviour may appear **only inside a story as something the story teaches a lesson about** — never celebrated, never graphic, never detailed, and never the point of the story; the lesson must address it.
- **Dressing is always decent and modest, no exceptions.** Everyone is fully and decently dressed, and a woman is always shown with a hijab covering her hair, ears, neck and chest, and loose opaque clothing.
- If a request conflicts with this ruling, the studio **says so plainly and offers a decent alternative** — it never works around it.

The ruling lives in `src/ruling.js` and is carried first into every brain system prompt, into every image prompt, into the knowledge base (it is the first rule there), into the Muse assistant, into the website builder, and into the status endpoint (`/api/status` → `ruling`).

---

## Sleep window — the app rests at night

Every day, the app **sleeps from 12:00 AM to 5:00 AM Nigeria time** (Africa/Lagos, WAT). During those hours it does not serve, think, research, create images, or build anything — it rests, and anyone who opens it sees a sleeping page: the HCI logo, "HCI is sleeping", and "Back at 5:00 AM Nigeria time". At 5:00 AM it wakes up and works normally again.

**The owner is exempt.** The owner can use the app anytime, including during the sleep hours. The sleep is for the students — the app relaxes, no pressure, no work for anyone else — but the owner passes straight through.

The window is computed in the Africa/Lagos timezone, never in the server's local timezone, so a server running in UTC still sleeps 00:00–05:00 Lagos time. The rule lives in `src/sleep.js` and is reported by the status endpoint (`/api/status` → `sleep`), which tells you the window, whether the app is asleep right now, and that the owner is exempt. Muse knows the rule too and says it plainly if anyone asks.

---

## What it does

1. **Thinks for itself.** When a student has no idea, the studio searches the live web for what is trending right now (live research with sources shown, Perplexity-style) and turns it into three fresh, original directions — with profile scores, a recommendation and a strongest alternative. No pre-written list of ideas.
2. **Asks which platform first.** Kling 4.0, Google Flow, Runway Gen-4.5, Pika 2.5, Luma Ray 3.2, Midjourney V8 Video, Seedance 2.5, CapCut, Creen AI, Meta AI (Vibes) — the studio asks which platform the person is making for, and shapes every prompt for that platform (clip length, audio or silent, what that tool can and cannot do). **And "Other":** if the platform is not in the list, the person picks Other and types any platform name — there is no limit. The prompt is shaped with general rules and tells them to verify clip length, audio and price on that platform before spending.
3. **Walks step by step, locked in order.** (1) Character — exact-word lock. (2) Props — prop lock in exact words. (3) The world — environment and the whole world of the story. (4) Scenes and action sequences — actions in order, visible and timed. (5) The video prompt — joining everything into one production-ready, copy-ready prompt: shot size, camera angle, camera movement, subject and action, lens and depth of field, lighting, composition, colour mood, visual style, behaviour, continuity lock. No drafts, no placeholders. No step is skipped.
4. **Teaches the full craft.** All twenty visual styles (when to use / when to avoid) plus the mixing rule (one style leads, one supports, the mix must have a reason) — and beyond the twenty: all shot sizes, camera angles, camera movements, lens and depth of field, lighting, composition, colour grading and mood, the twelve animation principles, directing, story structure, and human behaviour and emotion.
5. **Creates images.** The studio creates images on its own, in any visual style asked. **Video generation is PAUSED** — it needs a server or a heavy device. The studio hands over a production-ready prompt for Kling, Flow or Creen AI instead, and says so plainly. It never pretends a video was made.
6. **Accounts.** Users create accounts. The owner sees records of all accounts and can delete any account. The owner can also withdraw the whole app anytime.
7. **Learn.** The twelve animation principles, the cinematography formula, the director's formula, human light and skin, behaviour direction — plus online tutorials that were researched and verified (real, current, with sources).
8. **Tools.** Which tool for which job, from the November 2026 registry, with the honest limits.
9. **Get HCI.** The share packs as downloads, plus the install steps for Claude (Project), ChatGPT (Project, not a Custom GPT), Gemini (Gem) and Perplexity (Space). Never mix old and new HCI files.
10. **My Projects.** Each user's work is saved.
11. **Builds websites.** A student can ask the studio to build a website — a showcase site for their work, or a page for a project — and the studio builds the website's code: pages, design, text, images, ready to use. The template builder works with no key; the live brain writes a custom site when a key is set. Sites are static HTML + CSS, safe to open anywhere. This is in addition to prompts and images, not instead of them.

**Scope, confirmed:** image creation **YES** — the studio creates images on its own in any style. Video generation **NO** — paused; the studio hands over production-ready prompts instead.

**Availability:** the app is only for the owner's students — but it does not matter which country a student is in. **No region restriction, no country blocking.** Any student, anywhere, can use it.

## The brain

The app runs under **no single AI company**. It is HCI, the owner's own app, and it borrows thinking through provider keys, behind one provider layer:

- **Anthropic (Claude)** — the primary writing brain.
- **Perplexity** — research: live search with sources.
- **OpenAI (ChatGPT)** — an additional mind, and image creation.
- **Google (Gemini)** — an additional mind.
- **Groq** — an additional mind: fast open models (free tier, no card).
- **OpenRouter** — an additional mind: many free models behind one key (free tier, no card; sign in with Google, no email link).
- **Tavily** — live search, second option after Perplexity (free tier, no card).

Each user may add **their own key** (Settings → My own keys). Their thinking then uses their own key and their own free credits. Keys are stored encrypted on the server (AES-256-GCM) and never shown back in full. **If no key is set, the app still works** for prompt-building from its built-in HCI knowledge — and it says plainly that the live brain needs a key. It never pretends to think when it cannot.

**One bad key never stops the brain.** If a provider fails — wrong key, no credit left, busy — the brain tries the next provider instead of failing the whole call. The same goes for trending search: if Perplexity or Tavily fails, the app falls back to the public search, then to the live brain itself. (DuckDuckGo's public page blocks the app's server requests, so that middle step often finds nothing — the brain fallback is what actually saves it.)

## Muse, the in-app assistant

A version of Muse lives **inside** the app — the owner's own assistant, named **Muse**. She speaks and helps the way Muse does: warm, direct, plain words, encouraging, honest about what she does not know and what she cannot do, never pretending — and she teaches instead of just handing over answers.

- She **calls the owner "love"**, the way she does with him, and treats his students with the same warmth.
- She **guides the student through the step-by-step flow** — a Muse tip at every step of the Studio (built-in knowledge, needs no key).
- She **answers questions** (Ask Muse on the Home page and inside the Studio) and **helps with prompts**.
- When the live brain is on, she answers live. When no key is set, she says so plainly instead of pretending.

## Quick start (run it on your own computer)

Requirements: **Node.js 22 or newer**. Nothing else to install on the machine (the database is SQLite, a file — no database server).

```bash
cd hci_studio_app
npm install
cp .env.example .env
# Edit .env and add at least one provider key (see "Keys and free tiers" below).
# Also set a long random APP_SECRET in .env.
npm start
```

Open **http://127.0.0.1:3000** in the browser. Create the first account — **the first account ever created is the owner** (free forever, everything unlocked, sees all accounts). Share the link with students; they create their own accounts.

## Keys and free tiers (the free test)

The app itself charges nothing. The thinking uses provider free credits:

- **Google Gemini API (AI Studio) — the best place to start.** Google's Gemini API has a free tier: free input and output tokens on Flash and Flash-Lite models and Gemini 2.5 Pro, with no card and no billing account (checked October 2026; limits are per project and shown in AI Studio). You are only billed after you link a billing account. The app uses `gemini-2.5-flash` for Gemini.
- **Groq — free, no card.** Fast open models (the app uses `openai/gpt-oss-120b`). Free tier: about 30 requests a minute and 1,000 a day per model (checked 13 November 2026). Sign up at console.groq.com, no card.
- **OpenRouter — free, no card.** Many free models behind one key (the app uses `nvidia/nemotron-3-ultra-550b-a55b:free` first, then other free Nemotron models if it refuses with a 429). Free tier: 50 requests a day (checked 13 November 2026). Sign up at openrouter.ai with Google — no email link, no card.
- **Tavily — free, no card.** A second option for live search with sources: 1,000 API credits a month on the free Researcher plan (checked 13 November 2026). Sign up at tavily.com, no card.
- **Perplexity API** — needs a payment method (card) to create a key (checked 13 November 2026). Needed for full live research with sources if Tavily is not used.
- **Anthropic (Claude)** — no free trial credits: a key needs $10 of credits ($10.75 with tax) bought by card, a one-time purchase (checked 13 November 2026).
- **OpenAI** — the key is free to create, but new accounts show $0.00 credit (checked 13 November 2026), so image calls may need paid credits. OpenAI's key is also what image creation uses.

Free offers change. If a provider stops its free tier, the app still works from its built-in knowledge and says plainly which key is missing. Tight daily limits per person (below) keep free credits lasting.

### Free limits (per person, per day)

| Use | Limit |
|---|---|
| Thinking (directions, chatting with the brain) | 20 |
| Research | 10 |
| Trend search | 10 |
| Image creation | 5 |
| Simple chatting | 5 |

## The payment model

- **Owner: free forever, everything unlocked.** The owner never pays for his own use.
- **Chosen by the owner: up to 10 people, free forever, everything unlocked.** Anytime someone wins his heart, he makes it free for them — from the admin page, or by telling Muse. Never automatic, never first-come-first-served.
- **Other users: 14-day free trial, full access to everything.** The trial starts the day they register.
- **After the trial:** deep thinking tools lock — live research, trend search, image creation, and the full step-by-step prompt studio. Users who do not pay keep **basic access**: the learning pages and simple chatting with HCI.
- **Payments start after the test.** No payment provider is integrated now — the lock and the trial tracking are built, and the paywall is a clear placeholder. That comes after the test proves the app works.

### The money flow

When users pay, **the money goes to the owner's account**. He is the builder and creator, so he earns from it: user subscription payments come to him, the AI thinking costs are paid out of that revenue, and the remainder is his earnings. **The app must never take payments for itself or route them anywhere except the owner's account.**

- **Natural option: Selar.** He already sells his lessons through Selar, in Naira and dollars.
- **Alternatives: Stripe or Paystack.**
- The final provider choice is his, after the test. Do not wire payments before then.

## Deploying it (so students open it from a link)

The app is a normal Node.js web app. To share it with students, put it on a host that runs Node.js (a small server / VPS, or a Node hosting platform such as Render, Railway or Fly.io — any host that runs Node 22+ will do):

1. Copy the whole `hci_studio_app` folder to the host.
2. On the host: `npm install` (once).
3. Create `.env` on the host with `PORT`, `HOST=0.0.0.0`, `APP_SECRET` (a long random string), and the owner's provider keys.
4. Run `npm start`. Put it behind HTTPS (the host or a reverse proxy such as Nginx/Caddy usually does this).
5. Keep the `data/` folder — it holds the SQLite database (`hci-studio.db`), generated images, and the key-encryption secret. **Back it up.** Never commit `.env` or `data/` to git (both are in `.gitignore`).

**Accounts survive redeploys ONLY on persistent storage.** Hosts that deploy from git (Railway, Render) reset the app folder on every deploy — a database kept inside the app folder is wiped, and every account disappears with it (this happened on Railway on 13 Nov 2026: the owner's account was lost after a redeploy, and a test account became the first account — and therefore the owner). On such a host, attach a persistent volume and set `DATA_DIR` to it (on Railway: add a Volume mounted at `/data` and set `DATA_DIR=/data`). The knowledge base stays in the app's own `data/` folder; only the database, user keys, images and sites move to `DATA_DIR`. After the volume is attached, the first account to sign up becomes the owner — the owner must sign up first, before sharing the link.
6. Share the link with students. They open it in the browser on any phone — no install, no Play Store.

**Play Store: later, not now.** The app is built mobile-friendly and opened from a link in the browser. Native/mobile packaging is a later step.

**On-device thinking is out.** The owner's phone and computer are weak, so the thinking happens through provider APIs on the server, not on the device.

## Project layout

```
hci_studio_app/
├── server.js            # Express app: routes, auth, admin, downloads
├── package.json         # express only; everything else is Node built-ins
├── .env.example         # every setting, with notes (copy to .env)
├── README.md            # this file
├── src/
│   ├── db.js            # SQLite (node:sqlite) — users, sessions, projects, usage, images
│   ├── auth.js          # scrypt passwords, sessions, owner checks
│   ├── access.js        # trial / paywall / owner-free / owner-chosen-free logic
│   ├── limits.js        # free daily limits per person
│   ├── userKeys.js      # per-user provider keys, encrypted (AES-256-GCM)
│   ├── providers.js     # one brain layer: Claude / ChatGPT / Gemini / Groq / OpenRouter / Perplexity + images
│   ├── muse.js          # Muse, the in-app assistant (persona + step tips)
│   ├── search.js        # live trending search (Perplexity → Tavily → DuckDuckGo)
│   ├── platforms.js     # what each video platform can and cannot do (+ Other: any platform the student names)
│   ├── assemble.js      # prompt assembler — works with NO key
│   ├── website.js       # website builder (templates + brain-written HTML, sanitised)
│   └── knowledge.js     # loads data/knowledge.json + data/tutorials.json
├── data/
│   ├── knowledge.json   # 20 styles, 12 principles, tools, formulas, behaviour (from the HCI rebuild)
│   ├── tutorials.json   # 16 tutorials, each verified by opening the page (2026-11-13)
│   ├── hci-studio.db    # created on first run (gitignored)
│   └── images/          # generated images (gitignored)
├── downloads/
│   ├── HCI_New_Share_Pack_for_Claude.zip
│   └── HCI_New_Share_Pack_for_ChatGPT_and_Others.zip
└── public/
    ├── index.html  styles.css  app.js  logo.png
```

## Honest limits (read this before promising anything)

- **No test run has happened yet** on any platform. Never claim the app or HCI is tested or proven anywhere until a test is actually run.
- **Sora is discontinued** (web/app 26 April 2026; API 24 September 2026). Never recommend it. Any listing that still shows "Sora 2" is stale.
- **Runway Gen-4.5 native audio is UNVERIFIED.** Announced twice, not documented as shipped. Plan for silent clips plus a separate audio pass.
- **Video generation is paused.** It needs a server or a heavy device. The studio hands over prompts instead.
- **Free tiers change.** Provider free credits are short-lived (weeks to a few months). The free test is covered by bring-your-own-key plus the daily limits — not by any promise that a provider's free tier lasts forever.
- **The brain can be wrong.** It must show sources for research, and say plainly when it cannot verify something.

## Security notes

- Set a long random `APP_SECRET` in `.env` before anyone registers — it encrypts users' stored provider keys.
- Run behind HTTPS in production. The session cookie is `HttpOnly` and `SameSite=Lax`.
- Passwords are hashed with scrypt; they are never stored in plain text.
- The owner can withdraw the app anytime: Owner page → **Withdraw HCI Studio** (stops the server; `npm start` brings it back), or delete the folder for full removal.
- The first account created is the owner. If you need to change the owner later, do it directly in the database — there is no "transfer owner" button on purpose.

## Troubleshooting

- **"The live brain needs a key"** — no provider key is set (server `.env` or your own key in Settings). Add one, or use the studio from its built-in knowledge.
- **"Free limit reached for today"** — the daily per-person limit for that use. It resets tomorrow.
- **"Your 14-day free trial has ended"** — deep tools are locked. Basic access still works. Payments start after the test.
- **Server won't start** — check Node version (`node --version`, needs 22+), then `npm install`, then check `.env` has no broken lines.
- **Images fail** — image creation needs an OpenAI key. Check the key in Settings, and check the provider's own status page.

---

Made by Haynurah, the founder of Haynurah Studios.
