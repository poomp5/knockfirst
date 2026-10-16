# Update 04: rename to **KnockFirst** + new CLAUDE.md + instant "someone is calling grandma" alert

> **Applied by Tete (Thu 15 Oct).** Team decisions on top of this file: the repo **stays `poomp5/knockfirst`** (it was never `teterw/luklan`), so nobody renames it or changes their remote; the APK is `knockfirst.apk`; the tagline is *"Strangers knock first. Family opens the door."* Poom's KnockFirst brand kit is already in `brand/`.

> **This is the only file you need for this update.** Tete applies Part 0 first and pushes. Then everyone pulls and does their own section of Part 1.
>
> **Tete, paste this into Claude Code** (in the project folder):
> ```
> I'm Tete. Read "<path to this file>" completely (it's in my Downloads folder whose name contains "hackathon").
> Do Part 0 step by step (it includes replacing CLAUDE.md), then do the Tete section of Part 1.
> Commit after each step and push. At the end tell me what to post in the team chat.
> ```
> **Poom / Sky, after Tete says "update 04 is pushed":** run `git pull --rebase origin main`, then either start a new `claude` session (the new CLAUDE.md routes you here), or tell your running session:
> *"Re-read CLAUDE.md and docs/tasks/04-knockfirst-update.md, apply contract v2 to my copy, then do my section of Part 1."*

---

# PART 0: TETE ONLY (do in order; about 25 min)

## 0.1 Put this file in the repo
Copy this file to `docs/tasks/04-knockfirst-update.md`.

## 0.2 Replace `CLAUDE.md` (repo root) with exactly this

````markdown
# KnockFirst: instructions for Claude Code (read automatically in every session)

KnockFirst is a 3-developer hackathon project (U-Hackathon, AI track): an AI call screener for elderly parents.
Strangers have to "knock first": unknown callers talk to an AI assistant, and the family decides who gets through.
Several people run Claude Code on this repo at the same time, and each owns different folders.
**Following ownership is what keeps us from breaking each other's work.**

## At the start of EVERY new session, before any other action

1. **Ask exactly this and wait for the answer** (don't guess from git config, the OS username, or the branch):
   > "Who are you? **Tete** (teterw), **Poom** (poomp5), **Sky** (Skysosmart), or **PM**?"
2. Read the matching file **completely**:
   | Answer | Read | Owns (may edit) |
   |---|---|---|
   | Tete | `docs/tasks/01-tete-backend.md` | `apps/server/**` except `apps/server/src/ai/**`, `.github/**`, `README.md`, `CLAUDE.md`, `.gitignore`, `docs/tasks/**`, `docs/progress/tete.md` |
   | Poom | `docs/tasks/02-poom-mobile.md` | `apps/mobile/**`, `brand/**`, `docs/progress/poom.md` |
   | Sky | `docs/tasks/03-sky-ai-web.md` | `apps/server/src/ai/**`, `apps/web-demo/**`, `firebase/**`, `docs/progress/sky.md` |
   | PM / not sure | `docs/tasks/00-START-HERE.md` | `docs/pitch/**` only (no app code) |
3. **Then read every update file `docs/tasks/04-*.md`, `05-*.md`, … in number order.** Updates override older task files where they disagree (e.g. the name is **KnockFirst**, contract version **2**). Do that person's section of each update once their main milestone allows it.
4. Work out where this person is:
   - Run `git pull --rebase origin main`.
   - Read `docs/progress/<name>.md` (create it from the Part B task list if it's missing).
   - Look at `git log --oneline -20`.
5. Reply in **3 short lines**: their role, the paths they own, and the **next unfinished task ID** (main file or update) with its first concrete step. Then ask "Start?", unless they already told you what to do.

## Rules for the whole session

- **Only create, edit, move or delete files inside that person's owned paths.** If something outside them needs to change, stop and write a short request message the person can send to the owner (e.g. *"Tete: please add CORS origin https://… to Railway"*).
- **Part A (shared contract) plus the contract changes in update files** define the data model, endpoints and env names. Code must match them. If code and contract disagree, follow the contract and tell the human. Only Tete changes the contract.
- **Secrets never go in git:** `.env*` (except `.env.example`), `google-services.json`, service-account JSON. Before every push, run `git diff --cached | grep -iE "key|secret|token|BEGIN PRIVATE"` and look at the results.
- Branch per person (`tete/*`, `poom/*`, `sky/*`). Commit small with the prefix from Part A2. Merge to `main` at least every 2 hours.
- After each task: update `docs/progress/<name>.md`, commit, and give a 3-line status (done / next / blocked).
- When an SDK or API in a task file doesn't match the current docs, trust the docs, adapt, and leave a one-line comment.
- If scope is unclear, choose whatever makes the **demo loop (Part A10)** work soonest. A polished small feature set beats an ambitious broken one.
- Times are Bangkok (UTC+7). **Code freeze Fri 16 Oct 12:30. Submit by 13:30.**
````

## 0.3 Rename LukLan → KnockFirst in the task files (Tete owns `docs/tasks/**`)

Run these replacements **in this order** on `docs/tasks/00-START-HERE.md`, `01-tete-backend.md`, `02-poom-mobile.md`, `03-sky-ai-web.md`, `STARTER-PROMPT.md`:

| # | Find | Replace with |
|---|---|---|
| 1 | `LukLan (ลูกหลาน)` | `KnockFirst` |
| 2 | `LukLan / ลูกหลาน` | `KnockFirst` |
| 3 | `com.luklan.guardian` | `com.knockfirst.guardian` |
| 4 | `luklan-guardian.apk` | `knockfirst.apk` |
| 5 | `luklan-guardian` | `knockfirst` |
| 6 | `teterw/luklan` | `poomp5/knockfirst` |
| 7 | `LukLan` | `KnockFirst` |
| 8 | `luklan` | `knockfirst` |

**Do NOT replace the Thai word `ลูกหลาน` on its own.** It means "the family/children" and is used in UI copy such as `guardianName: "ลูกหลาน"` and "แจ้งเตือนลูกหลาน". Only rows 1–2 touch it, as part of the old name. After replacing, run `grep -rn -i "luklan" docs/ CLAUDE.md`; it should return nothing.

Also update A5 in all three task files to **contract v2** (0.5), so Part A stays identical across files.

## 0.4 Rename everything outside the docs (Tete's checklist)

| Where | Change |
|---|---|
| GitHub repo | **No rename.** The repo stays `poomp5/knockfirst`; nobody changes their remote |
| Railway / Vercel | Check that auto-deploy still triggers after the rename. Reconnect the repo if not. Rename the services to `knockfirst-server` / `knockfirst` if you like (domains can stay) |
| Firebase | **If the Android app was already registered as `com.luklan.guardian`:** Project settings → Add app → Android → **`com.knockfirst.guardian`** → download the new `google-services.json` → send it to Poom → update the GitHub secret `GOOGLE_SERVICES_JSON_BASE64`. You can delete the old Android app. The project display name can become "KnockFirst" (the project ID can't change, and that's fine) |
| `.github/workflows/android-release.yml` | `luklan-guardian.apk` → `knockfirst.apk`; artifact name `knockfirst`; workflow name "KnockFirst APK release" |
| `README.md` | Title **KnockFirst**, tagline, links to `poomp5/knockfirst`, APK link below |
| Server | Startup log "KnockFirst server on :PORT", any user-facing strings. **Firestore paths and `demo-family` don't change** |
| Twilio | TwiML App name "KnockFirst Web Demo" (cosmetic) |
| Env values (team chat) | `VITE_APK_URL=https://github.com/poomp5/knockfirst/releases/latest/download/knockfirst.apk`, `VITE_REPO_URL=https://github.com/poomp5/knockfirst` |

**Name and tagline for everyone (README, app, web, deck):**
- **KnockFirst**: *"Strangers knock first. Family opens the door."*
- Thai: *"คนแปลกหน้าต้องเคาะประตูก่อน ลูกหลานเป็นคนเปิด"*

## 0.5 Contract v2 (apply to `apps/server/src/contract.ts` and A5 in all task files)

```ts
// KnockFirst shared contract — identical copy in server, mobile, web-demo.
export const CONTRACT_VERSION = 2;

export const APK_ASSET_NAME = "knockfirst.apk";             // CHANGED (was luklan-guardian.apk)
export const ANDROID_PACKAGE = "com.knockfirst.guardian";   // CHANGED (was com.luklan.guardian)
export const PUSH_CHANNEL_LIVE = "live-calls";              // NEW: "someone is calling now" (importance HIGH)
export const PUSH_CHANNEL_UPDATES = "call-updates";         // NEW: silent result updates (importance LOW)

// FamilyDoc: ADD
  notifyOnIncoming?: boolean;   // guardian setting; treat missing as true

// CallDoc: ADD
  incomingNotified?: boolean;   // true once the "calling now" push was sent

// PushData: REPLACE the whole interface
export interface PushData {
  type: "incoming_call" | "screened_call" | "call_update";
  familyId: string;
  callId: string;
  urgent: "0" | "1";
}
```
Everything else in A5 stays the same (paths, `toCallerKey`, labels, colors, `demo-family`).

Part A text edits in the task files:
- **A6:** clients may also change `notifyOnIncoming` on `families/{f}`.
- **A9:** add the push matrix from Part 1.

## 0.6 Push and announce
Commit `docs: KnockFirst rename + CLAUDE.md v2 + update 04`, then commit `server: contract v2`, and push to `main`. Post in the team chat:
> **Update 04 is pushed. We're now KnockFirst.** Pull (the repo URL doesn't change), then open `claude` and it'll route you to `docs/tasks/04-knockfirst-update.md`. Poom: the new `google-services.json` is in your DMs (only if the package changed).

---

# PART 1: INSTANT "SOMEONE IS CALLING GRANDMA" ALERT

**Build it after M1 (a real call reaches the AI); finish by M2 (Thu 23:59).** Effort: Tete about 30 min, Poom 30–45 min, Sky about 15 min.

## What it does
1. An unknown (non-whitelisted, non-blocked) number calls grandma.
2. **The moment the call reaches our server, before the AI even says hello**, the guardian's phone buzzes:
   **"📞 สายแปลกกำลังโทรหาคุณยายสมศรี"**, with body *"081-234-5678 · AI กำลังรับสายแทน"*. If other families already reported the number, it adds *"⚠️ ถูกรายงานแล้ว 2 ครั้ง"*.
3. Tapping it opens the call screen with live **"AI กำลังคุยกับผู้โทร…"** and a running timer.
4. When the call ends, **the same notification is replaced** (not stacked) by the result: the summary for review, *"AI บล็อกสายนี้แล้ว (เสี่ยงสูง)"* (silent) for auto-blocked, or *"ผู้โทรวางสายโดยไม่ฝากข้อความ"* (silent) for a hang-up.

Whitelisted calls don't notify (grandma answers). Blocked calls are rejected silently. Guardians can switch the instant alert off in Settings.

**Why it matters:** on stage the guardian phone buzzes **within seconds, while the AI is still talking**. That shows the family is in the loop in real time and answers "what if it's urgent?" before a judge asks.

**Not in scope:** holding the call until the guardian decides. With ElevenLabs register-call, calls can't be transferred mid-conversation. The guardian's decision applies to the **next** call.

## Who does what

| Person | Work | Files |
|---|---|---|
| **Tete** | Instant push from `/twilio/voice` without slowing the call; replace it with the result push; a guard so the pipeline never overwrites a guardian decision | `apps/server/src/{routes/twilio.ts, services/push.ts, services/pipeline.ts}` |
| **Poom** | KnockFirst rename in the app and brand; two new Android channels; handle the new push types; live "calling now" screen with timer; Settings toggle | `apps/mobile/**`, `brand/**` |
| **Sky** | KnockFirst rename in the web demo and agent; allow the new field in rules; "guardian alerted" badge on the web demo | `firebase/**`, `apps/web-demo/**`, `apps/server/src/ai/**` |

## Push matrix (v2; also goes into A9)

| When | `data.type` | Channel | Title | Body | Android `tag` |
|---|---|---|---|---|---|
| Unknown call hits `/twilio/voice` (if `notifyOnIncoming !== false`) | `incoming_call` | `live-calls` | `📞 สายแปลกกำลังโทรหา{ownerName}` | `{formatCallerKey} · AI กำลังรับสายแทน` (+ ` · ⚠️ ถูกรายงานแล้ว {n} ครั้ง` if `n > 0`) | `callId` |
| Analysis → `needs_review` | `screened_call` | `screened-calls` / `urgent-calls` | as A9 | as A9 | `callId` |
| Analysis → `auto_blocked` | `call_update` | `call-updates` | `AI บล็อกสายนี้แล้ว (เสี่ยงสูง)` | `{name or number} · {reason}` | `callId` |
| Analysis → `no_message` | `call_update` | `call-updates` | `ผู้โทรวางสายโดยไม่ฝากข้อความ` | `{formatCallerKey}` | `callId` |

The same `tag` (= callId) makes Android **replace** the earlier notification. `call_update` pushes are sent only if `incomingNotified === true` for that call.

## Tete: server

1. **`services/push.ts`:** refactor into `sendToGuardians(familyId, { title, body, data, channelId, tag, priority })`, keeping the dead-token cleanup. Every message sets `android.notification.tag = callId`.
   - `notifyIncoming(familyId, callId, callerKey)`:
     - Return early if the family has `notifyOnIncoming === false`.
     - Read `blocklist/{callerKey}` for `n` (reports from other families).
     - Send on `live-calls`, priority high.
     - Set `incomingNotified: true` on the call doc.
   - `notifyGuardians(...)` (existing `needs_review` push): now with `tag`.
   - `notifyUpdate(familyId, callId, kind: "auto_blocked" | "no_message", ...)`: only when the call has `incomingNotified === true`. Channel `call-updates`, priority normal.
2. **`routes/twilio.ts`:** fire it **without awaiting** (Twilio's webhook timeout is 15 s; the call must not wait for FCM):
   ```ts
   // in the "unknown → AI assistant" branch, right after createCall(...status "screening"):
   void notifyIncoming(familyId, CallSid, callerKey).catch(e => console.warn("incoming push failed", e));
   // then register-call and return TwiML exactly as before
   ```
3. **`services/pipeline.ts`:** after computing `status`:
   - `needs_review` → `notifyGuardians`
   - `auto_blocked` → `notifyUpdate(..., "auto_blocked")`
   - `no_message` → `notifyUpdate(..., "no_message")`
   
   **Guard (mandatory):** re-read the call before writing `status`. If `decision` is already `"accepted"` or `"blocked"`, still save `transcript` and `analysis`, but keep `status = decision` and **skip** auto-block and pushes.
4. **Test**, and note the results in `docs/progress/tete.md`:
   - (a) A browser call → the guardian APK buzzes **before** the AI's greeting ends. Write down the delay.
   - (b) After hang-up, the same notification is replaced by the summary.
   - (c) An auto-blocked scam → replaced silently by "AI บล็อกสายนี้แล้ว".
   - (d) `notifyOnIncoming: false` → no instant push, but the result push still arrives.
   - (e) A whitelisted caller → no push.

## Poom: app

1. **Rename** in `app.json`:
   - `name: "KnockFirst"`, `slug: "knockfirst"`, `scheme: "knockfirst"`, `android.package: "com.knockfirst.guardian"`.
   - Bump `version` and `versionCode`.
   - Swap in the new `google-services.json` from Tete if the package changed.
   - Paste **contract v2** (0.5) into `src/lib/contract.ts`.
   - Replace any "LukLan" text in the UI.
   - **Brand:** redo the logo, icon and splash for **KnockFirst**. A door with a knock motif works well with the tagline "Strangers knock first. Family opens the door." Re-export every file in the B0 asset table (same paths and sizes) and tell Sky and the PM. *(✅ Already done: KnockFirst kit in `brand/`.)*
2. **Channels** (in `registerForPush`, next to the existing two):
   - `live-calls`: name "สายแปลกกำลังโทรเข้า", importance **HIGH**, vibration `[0, 150, 100, 150]`.
   - `call-updates`: name "ผลการกรองสาย", importance **LOW**.
3. **Tap handling:** all three types (`incoming_call`, `screened_call`, `call_update`) open `/call/{callId}`.
4. **Call detail while `screening` / `analyzing`:**
   - Header "📞 กำลังโทรเข้าตอนนี้", the caller (`formatCallerKey`), and a **live mm:ss timer** from `startedAt`.
   - A pulsing "AI กำลังคุยกับผู้โทร…" indicator, which changes to "กำลังสรุปบทสนทนา…" when `analyzing`.
   - The warning chip "⚠️ ถูกรายงานแล้ว {n} ครั้ง" if `blocklist/{callerKey}` exists (read once).
   - **No Accept/Block yet.** When the doc flips to `needs_review`/`auto_blocked`, animate into the normal result layout in place.
5. **Settings toggle** under การแจ้งเตือน:
   - "แจ้งเตือนทันทีเมื่อมีสายแปลกโทรเข้า", default on, bound to `families/{f}.notifyOnIncoming` (missing means true).
   - Helper text: "ปิดได้ถ้ารู้สึกว่าแจ้งเตือนบ่อยเกินไป คุณยังได้รับสรุปหลังวางสายเหมือนเดิม".
6. **Foreground:** when an `incoming_call` arrives while the app is open, show the banner plus a light haptic.
7. Ask Tete to tag a new APK and run Tete's test list on the real phone.

*Stretch (only if everything else works):* show "รู้จักเบอร์นี้ อนุญาตเลย" / "บล็อก" during `screening`, using the normal A6 recipes. Tete's guard protects the decision. Add a note: "สายนี้ AI จะรับต่อจนจบ ครั้งหน้าจะโทรเข้าได้เลย".

## Sky: rules, web demo, agent

1. **Rename:**
   - Web demo `<title>`, hero and footer → **KnockFirst** with the tagline.
   - Copy the new brand files from `brand/` into `public/brand/`.
   - Paste **contract v2** into `src/lib/contract.ts`.
   - Update `VITE_APK_URL`/`VITE_REPO_URL` on Vercel (values in 0.4).
   - Rename the ElevenLabs agent to "KnockFirst Screener" and update `src/ai/agent/agent-config.md`. The agent's spoken greeting doesn't mention the app name, so leave it.
2. **`firebase/firestore.rules`:** add `'notifyOnIncoming'` to the family `onlyChanges([...])` list. Deploy and tell the team.
3. **Web demo guardian view:**
   - When `incomingNotified === true`, show the badge **"📲 แจ้งเตือนลูกหลานแล้วระหว่างสาย / Guardian alerted during the call"**.
   - While the judge's own call is `screening`, the "Try it" panel says: **"ตอนนี้มือถือของลูกหลานได้รับแจ้งเตือนแล้ว / The guardian's phone has just been alerted"**. Judges don't hold the guardian phone, so they need to *see* it.
   - Hide Accept/Block in the drawer while `screening`/`analyzing` (same as the app), unless Poom ships the stretch version. Keep both in sync.

## Demo script change (A10, step 2)
> The judge dials from the web demo. **Within seconds the guardian phone on stage buzzes:** "📞 สายแปลกกำลังโทรหาคุณยายสมศรี". Hold it up while the AI is still talking. After hang-up, the same notification turns into the summary, and the guardian taps Accept.
