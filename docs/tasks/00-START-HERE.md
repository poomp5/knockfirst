# KnockFirst: START HERE (everyone reads this first, about 5 minutes)

> **Update 04 (Thu 15 Oct): we're now KnockFirst, contract v2.** *"Strangers knock first. Family opens the door."* After this file, read `docs/tasks/04-knockfirst-update.md`.

**What we're building:** an AI call screener for elderly parents. Calls from trusted numbers ring grandma as normal. Unknown callers get a polite Thai AI assistant (ElevenLabs) that asks who they are and why. The family gets a summary plus a scam-risk score in the **KnockFirst Android app** and taps **Accept** (whitelist; next time it rings grandma) or **Block** (blocked and reported).

**Deadline:** submit by **Fri 16 Oct, 13:30**. The hub closes at 14:00, and we don't cut it close. Judges open the **public repo**, the **demo website**, and the **pitch deck**.

| Person | GitHub | Your file | You own |
|---|---|---|---|
| **Tete** | `teterw` | `docs/tasks/01-tete-backend.md` | server, phone calls, **all API keys/accounts**, repo, APK releases, README |
| **Poom** | `poomp5` | `docs/tasks/02-poom-mobile.md` | React Native app (Android APK) + **all design assets** |
| **Sky** | `Skysosmart` | `docs/tasks/03-sky-ai-web.md` | ElevenLabs agent, AI analysis, eval, security rules, judges' web demo |
| **PM** | — | this file, section 6 | pitch deck, validation interviews, demo script, submission |

**Files in this pack:**
- `00-START-HERE.md` (this file)
- `STARTER-PROMPT.md` (Tete runs it once to create the repo)
- `CLAUDE.md` (goes in the repo root; makes Claude ask who you are)
- `01-tete-backend.md`, `02-poom-mobile.md`, `03-sky-ai-web.md`

All three task files share an identical **Part A: Shared contract** (data model, API, env names, milestones). If two files ever seem to disagree, **Part A wins**, and Tete decides.

---

## 1. Locked decisions (change NOW or never)

- App name **KnockFirst**, Android package **`com.knockfirst.guardian`**, repo **`github.com/poomp5/u-hackathon`** (private now; Poom makes it **public** before submission). The Firebase Android app is registered with this package name, so renaming later costs time.
- Stack:
  - Expo + React Native → **Android APK**.
  - Node/Express server on **Railway**.
  - **Twilio** phone number.
  - **ElevenLabs Agents** voice assistant.
  - LLM for analysis.
  - **Firebase** (Firestore + Anonymous Auth + FCM push).
  - Vite/React web demo on **Vercel**.
- The demo uses a **US Twilio number** as "grandma's number". Thai numbers need documents we can't get in time. Real phone forwarding goes on the roadmap slide.

## 2. Install today (each person, about 15 min)

| Who | Install |
|---|---|
| Everyone | Node **20+**, git, Claude Code, a GitHub account with access to the repo |
| Tete | GitHub CLI `gh` (logged in; the starter prompt uses it), ngrok (local webhook testing), Railway account, Twilio account (+ ~US$20 upgrade), Firebase/Google account |
| Poom | **Expo Go** on an Android phone (Android 10+); Figma; *optional but recommended:* Android Studio + JDK 17 (local APK builds and push testing over USB) |
| Sky | ElevenLabs account, Vercel account, `npm i -g firebase-tools` |

## 3. The first 30 minutes (run in parallel)

**Tete (unblocks everyone, go first):**
1–2. ✅ Done: the repo `poomp5/u-hackathon` (Poom's; everyone has write access) has all task files, `CLAUDE.md` and the server. Post **"skeleton is up"**.
3. Firebase project → send the **web config** to Poom and Sky, and **`google-services.json`** to Poom.
4. Twilio: upgrade, buy a US voice number, enable Thailand in Geo permissions.
5. **Register the team on hub.team1.network** if not done yet. Organisers must approve the team before we can submit.

**Poom:**
1. Figma: logo + **app icon (1024×1024)** + **notification icon (96×96, white silhouette)**. CI needs these.
2. After "skeleton is up": clone, branch `poom/app`, start Claude Code with your file (section 4).

**Sky:**
1. ElevenLabs: create the account, create an API key, create the agent, and **test it speaking Thai in the dashboard**. This is our biggest technical risk; know the answer by 18:00.
2. Send Tete `ELEVENLABS_API_KEY` and `ELEVENLABS_AGENT_ID`.
3. After "skeleton is up": clone, branch `sky/ai`, start Claude Code with your file.

**PM:**
1. Make the private chat's pinned **"KnockFirst secrets"** note (Tete fills it in).
2. Start **validation interviews** at the venue now (section 6).
3. Book a mentor slot (mentors are available until 18:00). Ask a **u-topia** mentor: *"How do we integrate U-Bot? Is there an API or embeddable widget?"* That's worth 5%.

## 4. How each dev starts Claude Code

```bash
git clone https://github.com/poomp5/u-hackathon.git
cd u-hackathon
git checkout -b <yourname>/<topic>        # tete/server · poom/app · sky/ai
claude
```
That's it. The repo's **`CLAUDE.md`** makes Claude ask **"Who are you? Tete / Poom / Sky / PM"**. Answer with your name. It then:
- reads your task file,
- checks `docs/progress/<you>.md` and `git log`,
- tells you your next task.

Do the same every time you open a new session; it resumes where you left off.

**Working rules:**
- `git pull --rebase origin main` before each task.
- Commit small and often.
- Merge to `main` at least every 2 hours.
- **Never edit another person's folder.** Ask them in chat instead.
- **Never commit a secret.** `.env` files and `google-services.json` are gitignored for a reason.

## 5. Handoffs: who gives what to whom (the only things that can block us)

| By (Bangkok time) | From → To | What |
|---|---|---|
| Thu 17:15 | Tete → all | "skeleton is up" (repo + docs/tasks + server stub) |
| Thu 17:20 | Tete → Poom, Sky | Firebase web config (6 values) |
| Thu 17:20 | Tete → Poom | `google-services.json` |
| Thu 17:30 | Tete → Sky, PM | `DEMO_ADMIN_TOKEN` |
| Thu 17:45 | Sky → Tete | `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID` |
| Thu 18:30 | Tete → all | Server URL (`PUBLIC_BASE_URL`) |
| Thu 18:30 | Poom → Sky, PM | Brand kit in `brand/` (logo, colors, og-image) |
| Thu 19:00 | Sky → Tete | `ELEVENLABS_WEBHOOK_SECRET` (after Sky sets the webhook to Tete's URL) |
| Thu 20:00 | Sky → Tete, Poom | Web demo URL (CORS + app link) |
| Thu 22:00 | Tete → all | First APK link (`v0.1.0`) |
| Fri 09:00 | Sky → Tete, PM | Eval numbers (scam detection %, false alarm %, auto-block precision) |
| Fri 11:00 | Tete → all | **APK `v1.0.0`** link; README final |

## 6. PM track

**Validation (Thu evening, about 15–20 people; real numbers beat any statistic on a slide):**
1. "Has a parent or grandparent of yours received a scam call in the last year?" (yes/no)
2. "Did they almost believe it, or lose money?"
3. "Would you set up an app that screens unknown calls for them and lets *you* approve new numbers?" (yes / maybe / no)
4. "What would stop you?" (open)

Put the counts on one slide, e.g. "14/18 said yes".

**Deck (about 8 slides, Google Slides, "anyone with the link can view"):**
1. Hook: the Thai PBS Sept 2026 case (22-year-old, 1.78M baht, isolated from family).
2. Problem numbers.
3. Who we protect: the elderly, plus the guardian who decides.
4. How it works: the flow diagram.
5. **Live demo.**
6. Why it's better: iPhone's call screening doesn't support Thai; blacklists only know reported numbers; we put the family in the loop.
7. Business: banks and telcos share scam-loss liability since 2025.
8. Eval results, roadmap, and team.

**Demo script (stage, Fri 20:00, if we're a finalist):** see Part A section A10 in any task file. Rehearse it twice on Friday afternoon.

## 7. Check-ins (1 minute per person: done / next / blocked)

Thu **18:00** (hall closes, move home and keep the voice call open) · **20:30** · **22:30** · **23:59** · Fri **10:00** (hall reopens, test on venue Wi-Fi) · **11:00** · **12:30** (code freeze) · **13:30** (submit).

## 8. Submission checklist (Fri, PM + Tete)

- [ ] Repo **public**; README has the pitch, links, architecture, eval numbers, team, and how to run
- [ ] **Demo website** URL works in an incognito window, on desktop and phone
- [ ] **APK** downloads from `https://github.com/poomp5/u-hackathon/releases/latest/download/knockfirst.apk` and installs
- [ ] Pitch deck link set to **"Anyone with the link can view"**
- [ ] `/demo/reset` run, then `npm run simulate -- --demo`, so judges see clean, realistic cards
- [ ] Submitted on **hub.team1.network** by **13:30**

## 9. If we fall behind

Protect the demo loop in this order:
1. Unknown call → AI answers → card appears.
2. Accept → next call rings grandma.
3. Push on the APK.
4. Web demo browser call.
5. Everything else.

Cut features before cutting sleep after 01:00.
