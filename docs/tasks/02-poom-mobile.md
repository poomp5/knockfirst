# KnockFirst: Task file for **Poom** (`poomp5`): Mobile app (React Native + Expo → Android APK) and all design assets

> **To Claude Code:** You are working with **Poom** on the U-Hackathon project **KnockFirst**. Read this **whole file** before writing any code. Part A is the shared contract, identical in all three teammates' files. Part B is **your** work. You may only create or edit files in `apps/mobile/**` and `brand/**`. Work through Part B **in order**. Commit after each task. After each milestone, give Poom a 3-line status: what works, what's next, what's blocked.
>
> **To Poom:** clone the repo, create branch `poom/app`, run `claude` and answer **"Poom"** when it asks who you are. `CLAUDE.md` loads this file and tracks your progress in `docs/progress/poom.md`. You'll get the Firebase config and `google-services.json` from Tete in the private chat.

**Why you:** you're the frontend developer with Figma, Photoshop and Canva. The app *is* what judges hold in their hands, and assets and UI belong together. The app runs on a **real Android phone** and ships as a **downloadable APK** through GitHub Releases. Tete's CI builds it from your folder.
---

# PART A: SHARED CONTRACT (identical in all 3 files, do not change on your own)

> Every teammate's Claude reads this same section. If you think something here is wrong, **stop and tell your human**. They tell Tete, who updates the contract for everyone. Never quietly diverge.

## A1. The product in one paragraph

**KnockFirst** is an AI call screener for elderly parents.

- Calls from trusted numbers ring the elderly person ("grandma") as normal.
- Calls from unknown numbers are answered by a polite Thai AI assistant (an ElevenLabs voice agent). It asks who is calling, who they want, and why, and never reveals anything about grandma.
- When the call ends, an LLM turns the transcript into a short summary plus a scam-risk score with evidence.
- The guardian (an adult child) gets a push notification in the **KnockFirst Android app** and taps **Accept**, which whitelists the number so the next call rings grandma, or **Block**, which blocks the number for this family and reports it to a shared blocklist.
- Obvious scams (risk ≥ 85) are blocked automatically, so the guardian isn't spammed.

**Hackathon facts that drive decisions**

- U-Hackathon, AI track. Submissions close **Fri 16 Oct 2026, 14:00 (Bangkok)**. Judges score exactly what we submit: a **public GitHub repo**, a **demo website that shows the real product** (not a landing page), and a pitch deck.
- Scoring:
  - 40% app execution: core features fully working, not mocked, no crashes.
  - 40% practicality.
  - 10% usability and design.
  - 5% innovation and ecosystem (ElevenLabs must be central).
  - 5% U-Bot integration.
- "A polished demo of a focused feature set beats an ambitious but broken one." **Finish the core loop before any extra feature.**
- Some stage judges are not Thai speakers. The web demo needs Thai **and** English. The AI agent should also handle English if a judge speaks English.

## A2. Team, roles, ownership

| Person | GitHub | Role | Owns (only this person's Claude edits these paths) |
|---|---|---|---|
| **Tete** | `teterw` | Backend and telephony lead, **owner of all API keys and accounts**, repo owner, CI/APK release, contract owner | `apps/server/**` **except** `apps/server/src/ai/**`; `.github/**`; `README.md`; `CLAUDE.md`; `.gitignore`; `docs/tasks/**` |
| **Poom** | `poomp5` | Mobile app (React Native + Expo → Android APK) and **all design assets** | `apps/mobile/**`; `brand/**` |
| **Sky** | `Skysosmart` | AI and safety: ElevenLabs agent, call analysis engine, eval, Firestore security rules, judges' web demo | `apps/server/src/ai/**`; `apps/web-demo/**`; `firebase/**` |
| PM | — | Pitch deck, validation interviews, demo script | `docs/pitch/**` (optional) |

**Collaboration rules (apply to every Claude)**

0. **Everyone also owns `docs/progress/<name>.md`** (`tete.md`, `poom.md`, `sky.md`). It's a checklist of Part B task IDs with ✅/🟡/❌ and one-line notes. Claude updates it after every task, so a new session (or a teammate) can see exactly where you are and resume from the next unchecked task.
1. **Never edit, move, or delete files outside your owned paths.** If you need a change elsewhere, write a short request for your human to send to the owner, e.g. "Tete: please add `zod` to `apps/server/package.json`".
2. **Branches:** `tete/<topic>`, `poom/<topic>`, `sky/<topic>`. Run `git pull --rebase origin main` before starting each task. Merge to `main` at least every 2 hours (PR or fast-forward). Ownership is by folder, so merges should never conflict. If a conflict appears in a path you don't own, take the other side's version.
3. **Commit prefixes:** `server:`, `mobile:`, `brand:`, `ai:`, `web:`, `rules:`, `ci:`, `docs:`. Small commits, often.
4. **Secrets never go in git.** `.env`, `google-services.json`, and service-account JSON stay local or in GitHub/Railway/Vercel secret settings. Keys are shared only in the private team chat. Every app keeps a `.env.example` with names and no values. Before every push, run `git diff --cached | grep -iE "key|secret|token|BEGIN PRIVATE"` and check nothing real leaks.
5. **`contract.ts` (section A5) is copied verbatim** into `apps/server/src/contract.ts` (Tete), `apps/mobile/src/lib/contract.ts` (Poom), and `apps/web-demo/src/lib/contract.ts` (Sky). Sky's AI code imports Tete's copy (`../contract`). Only Tete changes the contract. When he does, he bumps `CONTRACT_VERSION` and tells everyone, and each owner re-pastes it.
6. Prefer boring, well-documented tools. When an SDK call in this file doesn't match the current docs, **trust the docs**, adapt, and leave a one-line comment.
7. When unsure about scope, choose the option that makes the **demo loop** (A9) work sooner.

## A3. Repo layout

```
u-hackathon/                    public GitHub repo: github.com/poomp5/u-hackathon
├─ README.md                    Tete   (judge-facing: what it is, links, architecture, how to run)
├─ CLAUDE.md                    Tete   (auto-read by Claude Code: asks "who are you?" and routes to the task file)
├─ .gitignore                   Tete
├─ .github/workflows/
│   └─ android-release.yml      Tete   (builds the APK, attaches it to GitHub Releases)
├─ docs/tasks/                  Tete   (00-START-HERE, 01-tete, 02-poom, 03-sky, STARTER-PROMPT)
├─ docs/progress/<name>.md      each   (your own task checklist for resuming)
├─ brand/                       Poom   (logo, icon sources, colors, exported images for web + deck)
├─ firebase/                    Sky    (firestore.rules, firebase.json, .firebaserc)
└─ apps/
   ├─ server/                   Tete   (Node 20 + TypeScript + Express, deployed on Railway)
   │   └─ src/ai/               Sky    (analyzeCall engine, prompts, rules, agent config, eval)
   ├─ mobile/                   Poom   (Expo + React Native + expo-router → Android APK)
   └─ web-demo/                 Sky    (Vite + React + TypeScript, deployed on Vercel)
```

## A4. System flow

```
Caller (real phone, or browser call from web demo)
  │  dials the family's Twilio number (stands in for grandma's number in the demo)
  ▼
Twilio ──POST /twilio/voice──► Server (Tete)
                                 │ callerKey = toCallerKey(From); family = by To (fallback DEFAULT_FAMILY_ID)
                                 ├─ family-blocked OR global blocklist reportedBy.length ≥ threshold
                                 │     → <Reject/>                     call.status = "rejected"
                                 ├─ whitelisted
                                 │     → <Dial> family.ownerPhone       call.status = "forwarded"  (grandma's phone rings)
                                 └─ unknown
                                       → ElevenLabs register-call TwiML  call.status = "screening"
                                         (AI assistant talks to the caller in Thai/English)
Call ends ──► ElevenLabs post-call webhook ──POST /webhooks/elevenlabs──► Server
                                 │ call.status = "analyzing"
                                 │ analysis = analyzeCall(...)   ← Sky's engine in apps/server/src/ai
                                 ├─ no caller speech              → "no_message"   (no push)
                                 ├─ riskScore ≥ AUTO_BLOCK_SCORE  → "auto_blocked" (+ blocked entry + global report, no push)
                                 └─ otherwise                     → "needs_review" + FCM push to guardian phones
Guardian (Poom's app, or Sky's web demo) — live Firestore listener shows the card
                                 ├─ Accept → whitelist entry; next call rings grandma   ("accepted")
                                 └─ Block  → blocked entry + global report               ("blocked")
```

## A5. `contract.ts` (paste exactly; Tete owns changes)

```ts
// KnockFirst shared contract — identical copy in server, mobile, web-demo.
// Owner: Tete. Do not edit locally; ask Tete to bump the version.
export const CONTRACT_VERSION = 2;

export const DEFAULT_FAMILY_ID = "demo-family";
export const AUTO_BLOCK_SCORE = 85;          // server env AUTO_BLOCK_SCORE overrides
export const GLOBAL_BLOCK_THRESHOLD = 3;     // server env GLOBAL_BLOCK_THRESHOLD overrides
export const PUSH_CHANNEL_DEFAULT = "screened-calls";
export const PUSH_CHANNEL_URGENT = "urgent-calls";
export const PUSH_CHANNEL_LIVE = "live-calls";              // v2: "someone is calling now" (importance HIGH)
export const PUSH_CHANNEL_UPDATES = "call-updates";         // v2: silent result updates (importance LOW)
export const APK_ASSET_NAME = "knockfirst.apk";
export const ANDROID_PACKAGE = "com.knockfirst.guardian";

/** Works for both firebase (client) and firebase-admin Timestamps. */
export type Ts = { toDate(): Date };

// ---------- Firestore paths ----------
export const paths = {
  family: (f: string) => `families/${f}`,
  calls: (f: string) => `families/${f}/calls`,
  call: (f: string, callId: string) => `families/${f}/calls/${callId}`,
  whitelist: (f: string) => `families/${f}/whitelist`,
  whitelistEntry: (f: string, key: string) => `families/${f}/whitelist/${key}`,
  blocked: (f: string) => `families/${f}/blocked`,
  blockedEntry: (f: string, key: string) => `families/${f}/blocked/${key}`,
  globalBlocklist: () => `blocklist`,
  globalBlock: (key: string) => `blocklist/${key}`,
};

// ---------- Caller keys (document IDs for numbers) ----------
/** Normalize any caller id into the key used everywhere (whitelist/blocked/blocklist doc IDs). */
export function toCallerKey(raw: string): string {
  const s = (raw ?? "").trim();
  if (s.startsWith("client:")) return s;                 // browser caller from the web demo
  let d = s.replace(/[^\d+]/g, "");
  if (d.startsWith("00")) d = "+" + d.slice(2);
  else if (d.startsWith("0")) d = "+66" + d.slice(1);    // Thai local → E.164
  if (!d.startsWith("+")) d = "+" + d;
  return d;
}

/** +66812345678 → "081-234-5678"; client:judge-1 → "Web demo (judge-1)". */
export function formatCallerKey(key: string): string {
  if (key.startsWith("client:")) return `Web demo (${key.slice(7)})`;
  if (key.startsWith("+66") && key.length === 12) {
    const n = "0" + key.slice(3);
    return `${n.slice(0, 3)}-${n.slice(3, 6)}-${n.slice(6)}`;
  }
  return key;
}

// ---------- Documents ----------
export interface FamilyDoc {
  ownerName: string;             // shown in the guardian app only, e.g. "คุณยายสมศรี"
  ownerLabelForCallers: string;  // how the AI refers to her on the phone. Default "เจ้าของเบอร์นี้" (don't tell strangers her name)
  ownerPhone: string;            // E.164 real phone that rings for whitelisted callers
  guardianName: string;
  twilioNumber: string;          // E.164 number callers dial
  pushTokens: string[];          // FCM device tokens of guardian phones
  notifyOnIncoming?: boolean;    // v2: guardian setting; treat missing as true
  createdAt: Ts;
}

export type WhitelistSource = "seed" | "guardian" | "contacts";
export interface WhitelistEntry {
  callerKey: string;
  displayName: string;
  note?: string | null;
  addedBy: WhitelistSource;
  addedAt: Ts;
  sourceCallId?: string | null;
}

export interface BlockedEntry {
  callerKey: string;
  displayName?: string | null;
  reason: "guardian" | "auto";
  addedAt: Ts;
  sourceCallId?: string | null;
}

export interface GlobalBlockEntry {
  callerKey: string;
  reportedBy: string[];          // familyIds. Blocked for everyone when length >= GLOBAL_BLOCK_THRESHOLD
  lastReason?: string | null;
  updatedAt: Ts;
}

export type CallRoute = "whitelist" | "blocked" | "screened";
export type CallStatus =
  | "forwarded"     // whitelisted → rang the owner
  | "rejected"      // on a blocklist → server rejected it
  | "screening"     // AI assistant is talking to the caller right now
  | "analyzing"     // call ended, analysis running
  | "needs_review"  // waiting for the guardian (push sent)
  | "auto_blocked"  // risk >= AUTO_BLOCK_SCORE, blocked automatically, no push
  | "no_message"    // caller hung up without saying anything useful
  | "accepted"      // guardian accepted → whitelisted
  | "blocked";      // guardian blocked

export interface TranscriptTurn {
  role: "assistant" | "caller";
  text: string;
  t: number;                     // seconds since call start
}

export type RedFlag =
  | "authority_claim"            // claims police/DSI/AMLO/bank/government/courier authority
  | "accusation_threat"          // accuses of a crime, threatens arrest/legal action/account freeze
  | "money_request"              // asks to transfer/pay/deposit/"verify" money
  | "personal_info_request"      // asks for ID number, OTP, PIN, bank/account info, address
  | "secrecy_isolation"          // tells her not to tell family, to stay alone, not to hang up
  | "channel_switch"             // asks to add LINE/Telegram/WhatsApp, video call, install an app
  | "urgency_pressure"           // pressure to act right now
  | "story_pivot"                // changes story when challenged (case → scholarship, etc.)
  | "unknown_target"             // doesn't know who they are calling
  | "refused_identity";          // won't give a name or organisation

export type RiskLevel = "low" | "medium" | "high";

export interface CallAnalysis {
  callerName: string | null;
  organization: string | null;
  targetPerson: string | null;   // who they asked for
  knewOwner: boolean | null;     // did they know who they were calling
  reason: string;                // Thai, one short sentence
  reasonEn: string | null;       // English, one short sentence (for the web demo)
  summary: string;               // Thai, 2–3 sentences written for the guardian
  summaryEn: string | null;      // English version (web demo / judges)
  callbackNumber: string | null; // E.164 if given
  urgency: "normal" | "urgent";  // "urgent" only for legit time-critical calls (never when riskScore >= 70)
  riskScore: number;             // 0–100
  riskLevel: RiskLevel;          // riskLevelFromScore(riskScore)
  redFlags: RedFlag[];
  evidence: { flag: RedFlag; quote: string }[]; // quotes copied from caller turns
  recommendedAction: "accept" | "review" | "block";
  source: "llm" | "rules" | "llm+rules";
  analyzedAt: string;            // ISO timestamp
}

export interface CallDoc {
  id: string;                    // = Twilio CallSid (or "sim_..." for simulated calls)
  familyId: string;
  callerKey: string;
  from: string;                  // raw From
  to: string;                    // raw To
  route: CallRoute;
  status: CallStatus;
  startedAt: Ts;
  endedAt?: Ts | null;
  durationSec?: number | null;
  conversationId?: string | null;    // ElevenLabs conversation id
  transcript?: TranscriptTurn[];
  analysis?: CallAnalysis | null;
  decision?: "accepted" | "blocked" | null;
  decidedAt?: Ts | null;
  notified?: boolean;            // push sent
  incomingNotified?: boolean;    // v2: true once the "calling now" push was sent
  simulated?: boolean;           // created by /dev/simulate-call
}

export function riskLevelFromScore(score: number): RiskLevel {
  return score >= 70 ? "high" : score >= 40 ? "medium" : "low";
}

// ---------- Push (FCM data payload; all values are strings) ----------
export interface PushData {
  type: "incoming_call" | "screened_call" | "call_update";
  familyId: string;
  callId: string;
  urgent: "0" | "1";
}

// ---------- UI copy (same words in app and web) ----------
export const STATUS_LABEL_TH: Record<CallStatus, string> = {
  forwarded: "คนรู้จัก · ต่อสายแล้ว",
  rejected: "อยู่ในบัญชีบล็อก · ตัดสายแล้ว",
  screening: "AI กำลังรับสาย…",
  analyzing: "กำลังสรุปบทสนทนา…",
  needs_review: "รอคุณตัดสินใจ",
  auto_blocked: "บล็อกอัตโนมัติ (เสี่ยงสูง)",
  no_message: "วางสายโดยไม่ฝากข้อความ",
  accepted: "อนุญาตแล้ว",
  blocked: "บล็อกแล้ว",
};
export const STATUS_LABEL_EN: Record<CallStatus, string> = {
  forwarded: "Known caller · connected",
  rejected: "On blocklist · rejected",
  screening: "AI is answering…",
  analyzing: "Summarizing…",
  needs_review: "Waiting for your decision",
  auto_blocked: "Auto-blocked (high risk)",
  no_message: "Hung up without a message",
  accepted: "Accepted",
  blocked: "Blocked",
};
export const RED_FLAG_LABEL_TH: Record<RedFlag, string> = {
  authority_claim: "อ้างเป็นเจ้าหน้าที่/หน่วยงาน",
  accusation_threat: "กล่าวหาหรือข่มขู่",
  money_request: "ขอให้โอน/ชำระเงิน",
  personal_info_request: "ขอข้อมูลส่วนตัว/OTP",
  secrecy_isolation: "ห้ามบอกคนอื่น",
  channel_switch: "ให้ย้ายไปคุยทางแอปอื่น",
  urgency_pressure: "เร่งรัด กดดัน",
  story_pivot: "เปลี่ยนเรื่องไปมา",
  unknown_target: "ไม่รู้ว่าโทรหาใคร",
  refused_identity: "ไม่ยอมบอกชื่อ",
};
export const RED_FLAG_LABEL_EN: Record<RedFlag, string> = {
  authority_claim: "Claims authority",
  accusation_threat: "Accusation / threat",
  money_request: "Asks for money",
  personal_info_request: "Asks for personal info / OTP",
  secrecy_isolation: "Asks for secrecy",
  channel_switch: "Moves to another app",
  urgency_pressure: "Pressure / urgency",
  story_pivot: "Story keeps changing",
  unknown_target: "Didn't know who they called",
  refused_identity: "Refused to give name",
};
export const RISK_LABEL_TH: Record<RiskLevel, string> = { low: "เสี่ยงต่ำ", medium: "ควรตรวจสอบ", high: "เสี่ยงสูง" };
export const RISK_LABEL_EN: Record<RiskLevel, string> = { low: "Low risk", medium: "Check first", high: "High risk" };
export const RISK_COLOR: Record<RiskLevel, string> = { low: "#1E8E5A", medium: "#D98E04", high: "#D93025" };
```

## A6. Who writes what in Firestore

All clients (mobile app, web demo) sign in with **Firebase Anonymous Auth**. Security rules (Sky, `firebase/firestore.rules`) require a signed-in user and limit which fields clients may change. The server uses the Admin SDK, which bypasses rules.

| Path | Created by | Clients may change |
|---|---|---|
| `families/{f}` | server seed script | `ownerName`, `ownerLabelForCallers`, `ownerPhone`, `guardianName`, `pushTokens`, `notifyOnIncoming` |
| `families/{f}/calls/{callId}` | **server only** | only `decision`, `decidedAt`, `status` (via the recipes below) |
| `families/{f}/whitelist/{callerKey}` | seed script, clients | create/delete |
| `families/{f}/blocked/{callerKey}` | server (auto), clients | create/delete |
| `blocklist/{callerKey}` (global, shared by all families) | server, clients | `reportedBy` (arrayUnion/arrayRemove), `lastReason`, `updatedAt`, `callerKey` |

**Client write recipes (the app and the web demo do exactly this, in one `writeBatch`)**

```ts
// ACCEPT a screened call
batch.set(doc(db, paths.whitelistEntry(f, key)), {
  callerKey: key,
  displayName: call.analysis?.callerName ?? formatCallerKey(key),
  note: call.analysis?.reason ?? null,
  addedBy: "guardian", addedAt: serverTimestamp(), sourceCallId: call.id,
});
batch.delete(doc(db, paths.blockedEntry(f, key)));
batch.update(doc(db, paths.call(f, call.id)), { decision: "accepted", decidedAt: serverTimestamp(), status: "accepted" });

// BLOCK a screened call
batch.set(doc(db, paths.blockedEntry(f, key)), {
  callerKey: key, displayName: call.analysis?.callerName ?? null,
  reason: "guardian", addedAt: serverTimestamp(), sourceCallId: call.id,
});
batch.delete(doc(db, paths.whitelistEntry(f, key)));
batch.update(doc(db, paths.call(f, call.id)), { decision: "blocked", decidedAt: serverTimestamp(), status: "blocked" });
batch.set(doc(db, paths.globalBlock(key)), {
  callerKey: key, reportedBy: arrayUnion(f),
  lastReason: call.analysis?.reason ?? null, updatedAt: serverTimestamp(),
}, { merge: true });

// UNBLOCK a number
batch.delete(doc(db, paths.blockedEntry(f, key)));
batch.set(doc(db, paths.globalBlock(key)), { callerKey: key, reportedBy: arrayRemove(f), updatedAt: serverTimestamp() }, { merge: true });

// ADD to whitelist manually:    setDoc(whitelistEntry(f, toCallerKey(input)), { callerKey, displayName, note: null, addedBy: "guardian", addedAt: serverTimestamp(), sourceCallId: null })
// REMOVE from whitelist:        deleteDoc(whitelistEntry(f, key))
// REGISTER push token:          updateDoc(doc(db, paths.family(f)), { pushTokens: arrayUnion(token) })
// EDIT family info:             updateDoc(doc(db, paths.family(f)), { ownerName?, ownerLabelForCallers?, ownerPhone?, guardianName? })
```

Reading: list calls with `query(collection(db, paths.calls(f)), orderBy("startedAt", "desc"), limit(100))` and filter or sort on the client. **Don't add `where` + `orderBy` combinations**, because those need composite indexes.

## A7. Server HTTP API (Tete builds; others call)

Base URL: `PUBLIC_BASE_URL` (Railway), e.g. `https://knockfirst-server.up.railway.app`. JSON unless noted.

| Method | Path | Called by | Behavior |
|---|---|---|---|
| GET | `/health` | anyone | `{ ok: true, contractVersion }` |
| POST | `/twilio/voice` | Twilio (form-encoded `From`, `To`, `CallSid`) | Routing in A4. Returns TwiML (`text/xml`). Also used by the TwiML App for browser calls (`From = client:<identity>`). |
| POST | `/twilio/status` | Twilio status callback | Sets `endedAt`/`durationSec` on forwarded/rejected calls. |
| POST | `/webhooks/elevenlabs` | ElevenLabs post-call webhook | Verifies HMAC, replies 200 immediately, then runs the post-call pipeline. |
| GET | `/voice/token?identity=<id>` | web demo | `{ token, identity, to }`: a Twilio Voice SDK access token (1 h). `to` = the Twilio number to call. Rate-limited per IP. |
| POST | `/dev/simulate-call` | Sky's scripts, testing (header `x-admin-token: DEMO_ADMIN_TOKEN`) | Body `{ familyId?, from: string, transcript: TranscriptTurn[] }`. Creates a `sim_…` call doc and runs **the same** post-call pipeline (analysis, policy, push). Returns `{ callId, status, analysis }`. |
| POST | `/demo/reset` | Tete/PM before a demo (header `x-admin-token`) | Body `{ familyId? }`. Deletes calls and blocked entries, deletes whitelist entries with `addedBy != "seed"`, removes the family from `reportedBy` in the global blocklist. |

CORS allows `CORS_ORIGINS` (localhost plus the Vercel domain).

## A8. Environment variable names (fixed; values only in the team chat)

**`apps/server/.env`** (Tete; Railway has the same):
```
PORT=8080
PUBLIC_BASE_URL=
DEFAULT_FAMILY_ID=demo-family
CORS_ORIGINS=http://localhost:5173,http://localhost:8081
FIREBASE_SERVICE_ACCOUNT_BASE64=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
TWILIO_API_KEY_SID=
TWILIO_API_KEY_SECRET=
TWILIO_TWIML_APP_SID=
VALIDATE_TWILIO_SIGNATURE=false
ELEVENLABS_API_KEY=
ELEVENLABS_AGENT_ID=
ELEVENLABS_WEBHOOK_SECRET=
LLM_PROVIDER=anthropic            # anthropic | openai_compatible
LLM_API_KEY=
LLM_MODEL=claude-haiku-5-5
LLM_BASE_URL=                     # only for openai_compatible, e.g. https://api.openai.com/v1
AUTO_BLOCK_SCORE=85
GLOBAL_BLOCK_THRESHOLD=3
DEMO_ADMIN_TOKEN=
DEMO_OWNER_NAME=คุณยายสมศรี
DEMO_OWNER_PHONE=
SEED_WHITELIST=ลูกสาว|+66800000001;หลานชาย|+66800000002
```

**`apps/mobile/.env`** (Poom; the CI writes the same from GitHub secrets):
```
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_FAMILY_ID=demo-family
EXPO_PUBLIC_SERVER_URL=
EXPO_PUBLIC_WEB_DEMO_URL=
EXPO_PUBLIC_USE_MOCKS=false
```

**`apps/web-demo/.env`** (Sky; Vercel has the same):
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FAMILY_ID=demo-family
VITE_SERVER_URL=
VITE_APK_URL=https://github.com/poomp5/u-hackathon/releases/latest/download/knockfirst.apk
VITE_REPO_URL=https://github.com/poomp5/u-hackathon
```

## A9. Push notifications

- Sent by the server with `firebase-admin` (`messaging().sendEachForMulticast`) to `families/{f}.pushTokens`. Dead tokens are removed.
- Android channels, created by the app at startup: `screened-calls` (importance HIGH), `urgent-calls` (importance MAX), and since v2 `live-calls` (HIGH) and `call-updates` (LOW).
- Message: `notification { title, body }`, `data: PushData`, `android { priority: "high", notification: { channelId } }`.
  - Title: `"มีสายแปลกรอตรวจสอบ"`, or when urgent `"ด่วน: มีสายแปลกรอตรวจสอบ"`.
  - Body: `` `${analysis.callerName ?? formatCallerKey(callerKey)} · ${analysis.reason}` `` cut to 100 characters.
- Tapping the notification opens the call detail screen for `data.callId`.

**Push matrix (v2, update 04).** Every message sets Android `tag = callId`, so a later push for the same call **replaces** the earlier one.

| When | `data.type` | Channel | Title | Body |
|---|---|---|---|---|
| Unknown call hits `/twilio/voice` (if `notifyOnIncoming !== false`) | `incoming_call` | `live-calls` | `📞 สายแปลกกำลังโทรหา{ownerName}` | `{formatCallerKey} · AI กำลังรับสายแทน` (+ ` · ⚠️ ถูกรายงานแล้ว {n} ครั้ง` if `n > 0`) |
| Analysis → `needs_review` | `screened_call` | `screened-calls` / `urgent-calls` | as above | as above |
| Analysis → `auto_blocked` | `call_update` | `call-updates` | `AI บล็อกสายนี้แล้ว (เสี่ยงสูง)` | `{name or number} · {reason}` |
| Analysis → `no_message` | `call_update` | `call-updates` | `ผู้โทรวางสายโดยไม่ฝากข้อความ` | `{formatCallerKey}` |

`call_update` pushes are sent only if `incomingNotified === true` for that call.

## A10. The demo loop (this must work on stage; everything else is extra)

1. A judge opens the web demo and taps **"Call grandma / โทรหาคุณยาย"** (browser call). The AI assistant answers in Thai, or English if the judge speaks English.
2. **Within seconds the guardian phone on stage buzzes:** "📞 สายแปลกกำลังโทรหาคุณยายสมศรี" (hold it up while the AI is still talking). The judge plays a delivery rider or a clinic and hangs up. **Within about 15 s** a card appears live on the web demo **and** the same notification turns into the summary.
3. The guardian taps **Accept**. The judge calls again, and **grandma's phone** (a teammate's Android) **rings on stage**.
4. A teammate calls from a real phone playing a fake-police scammer. The card is red, auto-blocked, with evidence quotes.
5. Show the APK download link, the shared blocklist, and the eval accuracy numbers.

## A11. Milestones (Bangkok time)

| When | Milestone | Done means |
|---|---|---|
| Thu 17:30 | **M0 Setup** | Repo and folder skeletons on `main`; Firebase project live with config shared; Twilio number bought; ElevenLabs agent answers in Thai in the dashboard test; Expo app opens on a real phone |
| Thu 18:00 | Hall closes | Keep working from home on a team voice call |
| Thu 20:30 | **M1a Pipeline** | Server on Railway; `/dev/simulate-call` creates an analyzed call; the app and web demo show it live |
| Thu 22:30 | **M1 Real call** | A real phone call reaches the AI, the card appears in the app; **first CI APK (v0.1.0) installs on a real Android phone**; web demo deployed |
| Thu 23:59 | **M2 Full loop** | Accept → next call rings the owner's phone; Block → rejected; push arrives on the APK; browser call works; rules deployed |
| Fri 01:00 | Sleep | Tired teams break working code |
| Fri 10:00 | Hall opens | Re-test everything on venue Wi-Fi |
| Fri 11:00 | **M3 Release** | APK **v1.0.0** on GitHub Releases; web demo final; eval numbers in README |
| Fri 12:30 | **Code freeze** | Only bug fixes after this |
| Fri 13:30 | **Submit** | Public repo, demo URL, deck link (anyone with link) on hub.team1.network. Do not wait for 13:59 |

## A12. Fallbacks (decide fast, don't debate)

- **ElevenLabs Thai agent sounds bad or is slow:** try another Thai-capable voice or model. If it's still bad, keep it simple and short. Last resort: drive the demo with `/dev/simulate-call` using recorded transcripts. Analysis, app and push stay real.
- **Twilio problems** (caller ID missing, trial limits): use browser calls from the web demo, plus `/dev/simulate-call`.
- **Push fails:** the realtime inbox still updates. Keep going and fix push later.
- **CI APK build fails:** build locally with `npx expo prebuild -p android --clean && cd android && ./gradlew assembleRelease`, or use EAS (`eas build -p android --profile preview` with `buildType: "apk"`).
- **LLM API fails:** Sky's rule-based analyzer returns a valid `CallAnalysis` (`source: "rules"`), so the pipeline never breaks.
- **U-Bot (5% of the score)** is a stretch goal only after M2. If u-topia shares an API, add an "Ask U-Bot about this call" button in call detail (Poom), backed by a server proxy `/ubot/ask` (Tete).

---

# PART B: POOM'S WORK

**You deliver:**
1. A brand kit and every image asset (`brand/` plus `apps/mobile/assets/`).
2. The guardian app in `apps/mobile`: inbox, call detail with Accept/Block, whitelist, blocked list, settings, push notifications.
3. An app that builds into a working **release APK** and is tested on a real Android phone.

**You do NOT build:** the server, CI workflow, web demo, Firestore rules or AI analysis. You only **read** call docs, and you write exactly the client recipes in A6.

**Phone setup today:** one Android phone (Android 10+) with USB debugging on, "Install unknown apps" allowed for your browser or file manager, and **Expo Go** installed for fast UI work.

---

## B0. Brand kit first (17:00–18:30): CI and the web demo need it

Name: **KnockFirst**. Tagline (update 04): *"Strangers knock first. Family opens the door."* · Thai: *"คนแปลกหน้าต้องเคาะประตูก่อน ลูกหลานเป็นคนเปิด"*

**Direction:** warm, calm and trustworthy, like family, not a scary security product. Use one strong primary color plus neutrals. Keep **red/amber/green for risk only** (A5 `RISK_COLOR`), so don't use them as the brand color. Suggested primary: deep teal `#0F6E56` or indigo `#3C3489`; your call. Thai font: **Noto Sans Thai** or **IBM Plex Sans Thai** (Google Fonts, free).

Make these in Figma and export to exactly these paths (sizes matter: wrong sizes break the build or look blurry):

| File | Size / format | Used by |
|---|---|---|
| `brand/logo.svg`, `brand/logo.png` | vector + 1024 px PNG, transparent | web demo, deck, README |
| `brand/logo-mark.png` | 512×512 symbol only | web favicon source |
| `brand/og-image.png` | 1200×630 | web demo link preview |
| `brand/colors.md` | primary, secondary, neutrals, risk colors, font names | Sky, PM |
| `apps/mobile/assets/icon.png` | 1024×1024, **no transparency**, full-bleed | app icon |
| `apps/mobile/assets/adaptive-icon.png` | 1024×1024 transparent foreground; keep the mark inside the **center 66%** safe zone | Android adaptive icon |
| `apps/mobile/assets/splash-icon.png` | 1024×1024 transparent, the mark only | splash screen |
| `apps/mobile/assets/notification-icon.png` | **96×96, pure white silhouette on transparent** (Android tints it; color pixels show as a white square) | push notifications |
| `apps/mobile/assets/empty-inbox.png` | ~800 px wide illustration | empty inbox state |
| `apps/mobile/assets/shield.png` (optional) | ~512 px | "protected" header |

Commit `brand: initial kit` and **tell Sky and the PM it's there**. Target: icon + notification icon by 18:30; the rest tonight.

## B1. Create the Expo app (17:30)

```bash
# from repo root
npx create-expo-app@latest apps/mobile        # default template = TypeScript + expo-router
cd apps/mobile
npx expo install firebase expo-notifications expo-device expo-constants expo-font expo-haptics expo-clipboard
npx expo install @expo-google-fonts/noto-sans-thai     # or ibm-plex-sans-thai
npm i date-fns
npm run reset-project   # if the template offers it; removes example screens
```
Always use `npx expo install` for anything native, so versions match the Expo SDK.

### `app.json` (or `app.config.ts`): required values
```json
{
  "expo": {
    "name": "KnockFirst",
    "slug": "knockfirst",
    "scheme": "knockfirst",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "android": {
      "package": "com.knockfirst.guardian",
      "versionCode": 1,
      "googleServicesFile": "./google-services.json",
      "adaptiveIcon": { "foregroundImage": "./assets/adaptive-icon.png", "backgroundColor": "#FFFFFF" }
    },
    "plugins": [
      "expo-router",
      ["expo-splash-screen", { "image": "./assets/splash-icon.png", "imageWidth": 200, "backgroundColor": "#FFFFFF" }],
      ["expo-notifications", { "icon": "./assets/notification-icon.png", "color": "#0F6E56", "defaultChannel": "screened-calls" }]
    ]
  }
}
```
- **`android.package` must be exactly `com.knockfirst.guardian`.** It's in the contract and the Firebase Android app was registered with it.
- `google-services.json` comes from Tete. Put it in `apps/mobile/` (it's gitignored). CI writes its own copy.
- Copy `apps/mobile/.env.example` from A8. Put real values in `.env` (gitignored).
- Bump `android.versionCode` (+1) and `version` before every release tag.

### Folder layout
```
apps/mobile/
  app/                          (or src/app/ — follow what the template created)
    _layout.tsx                 fonts, auth, push setup, Stack
    (tabs)/_layout.tsx          tabs: สายเข้า (Inbox) · รายชื่อที่อนุญาต (Whitelist) · ตั้งค่า (Settings)
    (tabs)/index.tsx            Inbox
    (tabs)/whitelist.tsx
    (tabs)/settings.tsx
    call/[id].tsx               Call detail
    blocked.tsx                 Blocked numbers
  src/lib/contract.ts           A5 verbatim
  src/lib/firebase.ts
  src/lib/hooks.ts              useFamily, useCalls, useCall, useWhitelist, useBlocked
  src/lib/actions.ts            accept, block, unblock, addToWhitelist, removeFromWhitelist, updateFamily
  src/lib/push.ts
  src/lib/mocks.ts              fake data when EXPO_PUBLIC_USE_MOCKS=true
  src/lib/time.ts               "5 นาทีที่แล้ว" with date-fns th locale
  src/components/               CallCard, RiskBadge, RiskMeter, RedFlagChip, StatusPill, TranscriptView, SectionHeader, EmptyState, PrimaryButton
  src/theme.ts                  colors, spacing, radii, font families (from brand kit)
  assets/                       (B0)
```

## B2. Firebase client (`src/lib/firebase.ts`)

```ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore, getFirestore, Firestore } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";
import { DEFAULT_FAMILY_ID } from "./contract";

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};
export const app = getApps().length ? getApp() : initializeApp(config);

let _db: Firestore;
try { _db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true }); } // RN networking needs this
catch { _db = getFirestore(app); }                                                   // fast refresh re-init
export const db = _db;

export const auth = getAuth(app);   // memory persistence is fine: we re-sign-in anonymously on every launch
export async function ensureSignedIn() { if (!auth.currentUser) await signInAnonymously(auth); }
export const FAMILY_ID = process.env.EXPO_PUBLIC_FAMILY_ID || DEFAULT_FAMILY_ID;
export const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCKS === "true";
```
- Use the **Firebase JS SDK**, not `@react-native-firebase`. It works in Expo Go, needs no native setup, and the same code style works for Sky's web demo.
- If Metro errors on a Firebase import, follow Expo's "Using Firebase" guide (JS SDK section). It usually needs a one-line `metro.config.js` tweak.
- Rules (Sky) require sign-in, so call `ensureSignedIn()` in `_layout.tsx` **before** any listener starts. Show a splash or loader until it resolves.

## B3. Data hooks and actions (`src/lib/hooks.ts`, `src/lib/actions.ts`)

- `useFamily()` → `onSnapshot(doc(db, paths.family(FAMILY_ID)))`
- `useCalls()` → `onSnapshot(query(collection(db, paths.calls(FAMILY_ID)), orderBy("startedAt", "desc"), limit(100)))`. Map docs to `CallDoc` with `id` and return `{ calls, loading, error }`.
- `useCall(id)` → `onSnapshot(doc(...))`
- `useWhitelist()`, `useBlocked()` → collection listeners, sorted on the client by `addedAt` desc.
- **Mock mode:** when `USE_MOCKS`, hooks return data from `mocks.ts` (8 sample calls covering **every** `CallStatus`, three of them with rich analysis: fake police high risk, delivery rider low, clinic urgent). This lets you build all screens before the server exists.
- `actions.ts` implements **exactly** the A6 recipes with `writeBatch`. Every action: haptic on success; on error, an `Alert` with a Thai message and a console log.
- `startedAt` may be `null` for a split second (server timestamp pending). Treat `null` as "now" and never crash.

## B4. Screens (Thai-first UI, clean, big tap targets)

Global: Noto Sans Thai (Regular/Medium/SemiBold), base size 16, titles 22–28. Background off-white, cards white with radius 16 and a subtle border. Don't depend on dark mode (`userInterfaceStyle: light`).

### Inbox `(tabs)/index.tsx`
- **Header:** "ปกป้อง {ownerName} อยู่" with a shield icon, plus a small stat row computed from `calls`: *กรองแล้ว N สาย · บล็อก M สาย · วันนี้ K สาย*.
- **Sections**, in order (hide empty ones):
  1. **"กำลังรับสาย"**: status `screening`/`analyzing`. A pulsing dot and "AI กำลังคุยกับผู้โทร…". This live state looks great on stage; make it feel alive with a subtle animated pulse.
  2. **"รอคุณตัดสินใจ"**: `needs_review`, urgent first, then newest.
  3. **"ประวัติ"**: everything else, newest first.
- **CallCard:**
  - Left: a `RiskBadge` (color + score) when analysis exists.
  - Title: `analysis.callerName ?? formatCallerKey(callerKey)`.
  - Subtitle: `analysis.organization` · `analysis.reason`.
  - Up to 2 `RedFlagChip`s, a `StatusPill` (A5 `STATUS_LABEL_TH`), and the time-ago.
  - An urgent card gets a strong "ด่วน" tag.
  - Tap → `call/[id]`.
- Empty state: illustration + "ยังไม่มีสายแปลก ทุกอย่างปกติดี".
- No pull-to-refresh needed (realtime). On error, show a retry banner.

### Call detail `call/[id].tsx` (the most important screen; judges see it on stage)
1. **Top:** `RiskMeter`, a big semicircle or bar with the score 0–100 in risk color plus `RISK_LABEL_TH`. Show `STATUS_LABEL_TH` under it.
2. **"สรุปจาก AI"** card: `analysis.summary` (large text).
3. **Facts list:**
   - ผู้โทร: callerName
   - หน่วยงาน: organization
   - ต้องการติดต่อ: targetPerson
   - เรื่อง: reason
   - เบอร์ติดต่อกลับ: callbackNumber
   - เบอร์ที่โทรมา: formatCallerKey
   
   Hide null rows.
4. **"สัญญาณอันตราย"**: one row per `evidence` item: `RED_FLAG_LABEL_TH[flag]` plus the quote in quotation marks. If there are no red flags: "ไม่พบสัญญาณอันตราย".
5. **"บทสนทนา"**: `TranscriptView` chat bubbles. Assistant on the left, labeled "AI ผู้ช่วย", in neutral; caller on the right, labeled "ผู้โทร". Collapsed to 4 turns with "ดูทั้งหมด".
6. **Sticky bottom action bar** (visible when `status` is `needs_review`, `auto_blocked` or `no_message`):
   - **อนุญาตเบอร์นี้** (primary): confirm `Alert` "เบอร์นี้จะโทรถึง{ownerName}ได้ทันทีครั้งถัดไป" → accept recipe.
   - **บล็อกและรายงาน** (danger outline): confirm → block recipe.
   - **โทรกลับ** (ghost): `Linking.openURL("tel:" + (callbackNumber ?? callerKey))`, hidden for `client:` keys.
7. **After a decision:** show a result banner ("อนุญาตแล้ว ✓ ครั้งหน้าจะโทรเข้าได้เลย" / "บล็อกแล้ว"). Keep a small "เปลี่ยนใจ" link that runs the opposite action.
8. While `screening`/`analyzing`: show a skeleton plus "กำลังสรุป…". The doc updates live, so no refresh is needed.

### Whitelist `(tabs)/whitelist.tsx`
- List: displayName, `formatCallerKey(callerKey)`, a "ค่าเริ่มต้น" badge for `addedBy: "seed"`, and a "จากสายที่อนุญาต" badge for guardian entries with `sourceCallId`.
- "+ เพิ่มเบอร์" opens a modal with name and phone. Validate at least 9 digits, normalize with `toCallerKey`, then setDoc.
- Delete: long-press or a trailing button, with confirm.
- Footer link: "ดูเบอร์ที่ถูกบล็อก" → `blocked.tsx` (list with unblock using the recipe; label auto vs guardian).

### Settings `(tabs)/settings.tsx`
- **ข้อมูลผู้สูงอายุ:** `ownerName`, `ownerPhone` (the real phone that rings for trusted callers), and `ownerLabelForCallers`. Helper text for the last one: "AI จะเรียกชื่อนี้ตอนรับสาย ค่าเริ่มต้น 'เจ้าของเบอร์นี้' เพื่อไม่ให้คนแปลกหน้ารู้ชื่อจริง". Save → `updateDoc`.
- **ผู้ดูแล:** `guardianName`.
- **การแจ้งเตือน:** permission status, an "ขออนุญาตแจ้งเตือน" button if denied, and **"ทดสอบการแจ้งเตือน"**, which schedules a local notification in 2 s. This proves the channel and icon work without the server.
- **เกี่ยวกับ:** app version (`Constants.expoConfig?.version`), a "เปิดเว็บเดโม" link (`EXPO_PUBLIC_WEB_DEMO_URL`), and the GitHub repo link.
- Hidden dev section (tap version 7 times): show `FAMILY_ID`, the push token (copy button), the mock flag, and the server URL.

## B5. Push notifications (`src/lib/push.ts`), called from `_layout.tsx` after sign-in

```ts
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db, FAMILY_ID } from "./firebase";
import { paths, PUSH_CHANNEL_DEFAULT, PUSH_CHANNEL_URGENT } from "./contract";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export async function registerForPush(): Promise<string | null> {
  if (Platform.OS !== "android" || !Device.isDevice) return null;
  await Notifications.setNotificationChannelAsync(PUSH_CHANNEL_DEFAULT, { name: "สายแปลกรอตรวจสอบ", importance: Notifications.AndroidImportance.HIGH });
  await Notifications.setNotificationChannelAsync(PUSH_CHANNEL_URGENT, { name: "สายด่วน", importance: Notifications.AndroidImportance.MAX, vibrationPattern: [0, 300, 200, 300] });
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return null;
  try {
    const token = (await Notifications.getDevicePushTokenAsync()).data as string; // native FCM token (needs google-services.json)
    await updateDoc(doc(db, paths.family(FAMILY_ID)), { pushTokens: arrayUnion(token) });
    return token;
  } catch (e) { console.warn("push token failed", e); return null; }
}
```
- Tap handling: `Notifications.addNotificationResponseReceivedListener(r => router.push(\`/call/${r.notification.request.content.data.callId}\`))`. Also check `Notifications.getLastNotificationResponseAsync()` on cold start.
- The handler field names above match recent expo-notifications versions. If TypeScript complains, use whatever the installed version's types say (older versions used `shouldShowAlert`).
- **Push does not work in Expo Go on Android.** Test push only in the APK or a dev build (B6). Everything else can be built in Expo Go.
- We use the **native FCM token** (`getDevicePushTokenAsync`), not an Expo push token, because Tete's server sends through firebase-admin directly. No Expo account needed.

## B6. Running on a real Android phone

1. **Fast UI loop (most of the time):** `npx expo start` → scan the QR in **Expo Go**. Firestore, auth and UI all work; push doesn't.
2. **Native build on your phone over USB** (to test push before CI): install Android Studio (SDK + platform tools), JDK 17, enable USB debugging, then `npx expo run:android`. This installs a dev build with push working.
3. **The real thing:** install the **APK from GitHub Releases** (Tete's CI): open the release link on the phone → download → install → allow unknown apps.

## B7. Release checklist (every time you want a new APK)

- [ ] `npm run lint` (if present) and `npx tsc --noEmit` pass.
- [ ] `app.json`: bump `version` and `android.versionCode`.
- [ ] Mock mode off by default (`EXPO_PUBLIC_USE_MOCKS=false`).
- [ ] Commit and merge to `main` → tell Tete "tag vX.Y.Z", or ask him to run the workflow manually.
- [ ] Install the APK on the phone. Check: it opens with no red screen, the inbox shows live data, a test notification shows the right icon, and a real push from `/dev/simulate-call` arrives and opens the right call.
- **Target:** first APK (even if half-finished) by **Thu 22:00**. Final **v1.0.0 by Fri 11:00**.

## B8. Quality bar (judges score 40% execution + 10% usability)

- **No crashes.** Every screen handles: loading, empty, error, missing `analysis`, missing fields, `null` timestamps, and `client:` caller keys.
- **Every action gives feedback:** haptic, plus a pressed state or banner. Buttons are disabled while writing.
- **Thai copy is consistent** with `STATUS_LABEL_TH` and `RED_FLAG_LABEL_TH`. Never show raw enum strings.
- **Speed:** the inbox renders 100 calls smoothly. Use `FlatList`/`SectionList`, not a mapped `ScrollView`.
- **Accessibility:** tap targets at least 48 dp, sufficient contrast, risk shown as **color + text** (not color alone).
- **Demo polish:**
  - A new card slides or fades in.
  - A new `needs_review` card triggers a haptic tick if the app is open.
  - Urgent calls get a red "ด่วน" tag.

## B9. Stretch goals (only after M2 passes)

1. **Onboarding:** 3 swipe screens explaining how it works, with Poom illustrations.
2. **Import whitelist from contacts** (`expo-contacts`) → `addedBy: "contacts"`.
3. **"Ask U-Bot about this call"** button in call detail, if Tete adds `/ubot/ask`.
4. **Weekly digest card** on the inbox: "สัปดาห์นี้ AI กรองสายแปลกไป N สาย".
5. Export brand visuals for the PM's deck: app screenshots on a clean background, phone mockups.
