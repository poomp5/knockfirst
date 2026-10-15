# LukLan: Task file for **Tete** (`teterw`): Backend, telephony, API keys, repo, APK release

> **To Claude Code:** You are working with **Tete** on the U-Hackathon project **LukLan**. Read this **whole file** before writing any code. Part A is the shared contract, identical in all three teammates' files. Part B is **your** work. You may only create or edit files in Tete's owned paths (A2). Work through Part B **in order**. Commit after each task. After each milestone, give Tete a 3-line status: what works, what's next, what's blocked.
>
> **To Tete:** run `STARTER-PROMPT.md` once. It creates the repo, copies these files, and pushes the skeleton (that's B1). After that, just open `claude` in the repo and answer **"Tete"** when asked. `CLAUDE.md` loads this file and resumes from `docs/progress/tete.md`.

**Why you own the API:** you've built a webhook API with load testing before (Doodee Move) and designed a system architecture (Doodee Future). Keys, telephony and the server belong in one pair of hands, so nobody is blocked waiting on a secret. Poom already owns the biggest UI surface plus all the assets.
---

# PART A: SHARED CONTRACT (identical in all 3 files, do not change on your own)

> Every teammate's Claude reads this same section. If you think something here is wrong, **stop and tell your human**. They tell Tete, who updates the contract for everyone. Never quietly diverge.

## A1. The product in one paragraph

**LukLan (ลูกหลาน)** is an AI call screener for elderly parents.

- Calls from trusted numbers ring the elderly person ("grandma") as normal.
- Calls from unknown numbers are answered by a polite Thai AI assistant (an ElevenLabs voice agent). It asks who is calling, who they want, and why, and never reveals anything about grandma.
- When the call ends, an LLM turns the transcript into a short summary plus a scam-risk score with evidence.
- The guardian (an adult child) gets a push notification in the **LukLan Android app** and taps **Accept**, which whitelists the number so the next call rings grandma, or **Block**, which blocks the number for this family and reports it to a shared blocklist.
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
luklan/                         public GitHub repo: github.com/teterw/luklan
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
// LukLan shared contract — identical copy in server, mobile, web-demo.
// Owner: Tete. Do not edit locally; ask Tete to bump the version.
export const CONTRACT_VERSION = 1;

export const DEFAULT_FAMILY_ID = "demo-family";
export const AUTO_BLOCK_SCORE = 85;          // server env AUTO_BLOCK_SCORE overrides
export const GLOBAL_BLOCK_THRESHOLD = 3;     // server env GLOBAL_BLOCK_THRESHOLD overrides
export const PUSH_CHANNEL_DEFAULT = "screened-calls";
export const PUSH_CHANNEL_URGENT = "urgent-calls";
export const APK_ASSET_NAME = "luklan-guardian.apk";
export const ANDROID_PACKAGE = "com.luklan.guardian";

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
  simulated?: boolean;           // created by /dev/simulate-call
}

export function riskLevelFromScore(score: number): RiskLevel {
  return score >= 70 ? "high" : score >= 40 ? "medium" : "low";
}

// ---------- Push (FCM data payload; all values are strings) ----------
export interface PushData {
  type: "screened_call";
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
| `families/{f}` | server seed script | `ownerName`, `ownerLabelForCallers`, `ownerPhone`, `guardianName`, `pushTokens` |
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

Base URL: `PUBLIC_BASE_URL` (Railway), e.g. `https://luklan-server.up.railway.app`. JSON unless noted.

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
VITE_APK_URL=https://github.com/teterw/luklan/releases/latest/download/luklan-guardian.apk
VITE_REPO_URL=https://github.com/teterw/luklan
```

## A9. Push notifications

- Sent by the server with `firebase-admin` (`messaging().sendEachForMulticast`) to `families/{f}.pushTokens`. Dead tokens are removed.
- Android channels, created by the app at startup: `screened-calls` (importance HIGH) and `urgent-calls` (importance MAX).
- Message: `notification { title, body }`, `data: PushData`, `android { priority: "high", notification: { channelId } }`.
  - Title: `"มีสายแปลกรอตรวจสอบ"`, or when urgent `"ด่วน: มีสายแปลกรอตรวจสอบ"`.
  - Body: `` `${analysis.callerName ?? formatCallerKey(callerKey)} · ${analysis.reason}` `` cut to 100 characters.
- Tapping the notification opens the call detail screen for `data.callId`.

## A10. The demo loop (this must work on stage; everything else is extra)

1. A judge opens the web demo and taps **"Call grandma / โทรหาคุณยาย"** (browser call). The AI assistant answers in Thai, or English if the judge speaks English.
2. The judge plays a delivery rider or a clinic and hangs up. **Within about 15 s** a card appears live on the web demo **and** a push arrives on the guardian's Android phone (APK).
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

# PART B: TETE'S WORK

**You deliver:** every account and key; the repo skeleton; the server (`apps/server`, except `src/ai/**`) deployed on Railway; Twilio routing; the ElevenLabs register-call and post-call pipeline; push sending; browser-call tokens; dev and demo endpoints; the seed and reset scripts; the GitHub Actions workflow that publishes the APK; the judge-facing README.

**You do NOT build:** the analysis engine (Sky, `src/ai/**`), the mobile app (Poom), the web demo (Sky), or Firestore rules (Sky). You create a **stub** `src/ai/index.ts` in your first commit so the server compiles. After that, Sky owns it and you never edit `src/ai/**` again.

---

## B0. Accounts and keys (16:45–17:30, browser work; Claude gives Tete checklists, Tete clicks)

Keep a private note called **"LukLan secrets"** and paste each value there as you get it. Share it with the team **only in the private chat**.

### B0.1 GitHub
- [ ] Create **public** repo `teterw/luklan`, with no template. Add collaborators **poomp5** and **Skysosmart** (write access).
- [ ] Later, in Settings → Secrets and variables → Actions, add the secrets listed in B9.

### B0.2 Firebase (project id e.g. `luklan-hackathon`)
- [ ] Create the project. Analytics is not needed.
- [ ] **Firestore**: create the database in **production mode**, location **`asia-southeast1` (Singapore)**. Sky deploys the rules.
- [ ] **Authentication** → Sign-in method → enable **Anonymous**.
- [ ] Project settings → **Add app → Android**, package **`com.luklan.guardian`** → download **`google-services.json`**.
  - Send the file to Poom in private chat.
  - Base64 it for CI: `base64 -w0 google-services.json` (macOS: `base64 -i google-services.json`).
- [ ] **Add app → Web** → copy the `firebaseConfig` six values and send them to Poom and Sky.
- [ ] Project settings → **Service accounts → Generate new private key**. Base64 the JSON, store it as `FIREBASE_SERVICE_ACCOUNT_BASE64`, and **never commit it**.
- [ ] Cloud Messaging: the FCM HTTP v1 API should be enabled by default. If it says disabled, enable it.
- [ ] Users and permissions → add Poom and Sky as **Editor**. Sky deploys rules; both can see data.

### B0.3 Twilio
- [ ] Create an account. **Upgrade it (add about US$20)**. Trial accounts play a trial notice to callers and can only dial verified numbers, which will break the demo. If you can't upgrade, verify DEMO_OWNER_PHONE under Verified Caller IDs.
- [ ] Buy a **US local number with Voice** → `TWILIO_PHONE_NUMBER` (E.164). Thai numbers need regulatory documents and won't be ready in time.
- [ ] Voice → Settings → **Geo permissions** → enable **Thailand** for outbound calls. `<Dial>` to the owner's Thai phone fails without this.
- [ ] Account → API keys → **Create API key** (Standard) → `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET`.
- [ ] Voice → **TwiML Apps** → create "LukLan Web Demo" with Voice Request URL `${PUBLIC_BASE_URL}/twilio/voice` (POST). Fill this in after the B10 deploy → `TWILIO_TWIML_APP_SID`.
- [ ] Phone number config → "A call comes in" → Webhook `${PUBLIC_BASE_URL}/twilio/voice` (POST). Also set after deploy; use an ngrok URL for local testing.

### B0.4 ElevenLabs (Sky owns the agent; you need two values from him)
- [ ] Get `ELEVENLABS_API_KEY` (an API key with Agents/Conversational AI access) and `ELEVENLABS_AGENT_ID` from Sky.
- [ ] After deploy, give Sky the webhook URL `${PUBLIC_BASE_URL}/webhooks/elevenlabs`. He sets it as the post-call webhook and sends back `ELEVENLABS_WEBHOOK_SECRET`.

### B0.5 LLM key (used by Sky's analysis code on your server)
- [ ] Get one key: Anthropic (`LLM_PROVIDER=anthropic`, `LLM_MODEL=claude-haiku-5-5`) **or** any OpenAI-compatible API (`LLM_PROVIDER=openai_compatible`, plus `LLM_BASE_URL`, `LLM_MODEL`). Ask organisers whether the participant AI credits cover a specific provider.

### B0.6 Railway (server hosting; no sleeping, so Twilio webhooks don't time out)
- [ ] New project → Deploy from GitHub repo `teterw/luklan` → service **root directory `apps/server`**.
- [ ] Build `npm ci && npm run build`, start `npm start`. Add all `apps/server/.env` vars.
- [ ] Settings → Networking → **Generate domain** → `PUBLIC_BASE_URL`. Share it with Poom and Sky.
- [ ] Do **not** use Render's free tier: it sleeps, and the first Twilio webhook after sleep times out.

### B0.7 Generate a random admin token
- [ ] `openssl rand -hex 24` → `DEMO_ADMIN_TOKEN`. Share with Sky (his simulate script uses it) and the PM.

---

## B1. Repo skeleton (first commit; target 17:15 so others can pull)

Create the following and push to `main` directly (just this once):

```
README.md                      (placeholder, finished in B11)
CLAUDE.md                      (router: copied byte-for-byte from the starter folder)
.gitignore
docs/tasks/00-START-HERE.md, 01-tete-backend.md, 02-poom-mobile.md, 03-sky-ai-web.md, STARTER-PROMPT.md
docs/progress/tete.md          (your Part B checklist)
apps/server/                   (B2)
```
`STARTER-PROMPT.md` automates this step.

**Don't create `apps/mobile`, `apps/web-demo`, `brand`, or `firebase`.** Their owners create them, which avoids add/add conflicts.

`.gitignore`:
```
node_modules/
dist/
.env
.env.*
!.env.example
*.log
.DS_Store
# Firebase / Google secrets
google-services.json
service-account*.json
*-firebase-adminsdk-*.json
# Expo / RN (continuous native generation: android/ is generated in CI)
.expo/
apps/mobile/android/
apps/mobile/ios/
*.apk
*.aab
*.keystore
!debug.keystore
# Vite / Vercel
apps/web-demo/dist/
.vercel/
```

## B2. Server scaffold (`apps/server`, Node 20, TypeScript, CommonJS)

```bash
cd apps/server
npm init -y
npm i express cors dotenv zod twilio firebase-admin @elevenlabs/elevenlabs-js
npm i -D typescript tsx @types/express @types/cors @types/node
npx tsc --init
```

`tsconfig.json` essentials: `"target": "ES2022"`, `"module": "commonjs"`, `"moduleResolution": "node"`, `"outDir": "dist"`, `"rootDir": "."`, `"esModuleInterop": true`, `"strict": true`, `"skipLibCheck": true`, `"resolveJsonModule": true`, include `["src", "scripts"]`.

`package.json` scripts (**include Sky's scripts now**, so he never has to touch this file):
```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/src/index.js",
    "seed": "tsx scripts/seed.ts",
    "reset": "tsx scripts/reset.ts",
    "eval": "tsx src/ai/eval/run.ts",
    "simulate": "tsx src/ai/eval/simulate.ts",
    "typecheck": "tsc --noEmit"
  },
  "engines": { "node": ">=20" }
}
```
(With `rootDir "."`, the entry compiles to `dist/src/index.js`. Make sure `start` matches what `tsc` actually emits.)

File layout (you own everything except `src/ai/**`):
```
apps/server/
  .env.example                  (exact names from A8)
  src/
    index.ts                    express app, route mounting order matters (B3)
    env.ts                      zod-validated env
    contract.ts                 A5 verbatim
    firebase.ts                 admin init
    routes/twilio.ts            /twilio/voice, /twilio/status
    routes/elevenlabs.ts        /webhooks/elevenlabs
    routes/voiceToken.ts        /voice/token
    routes/dev.ts               /dev/simulate-call, /demo/reset
    services/families.ts        family lookup, whitelist/blocked checks
    services/calls.ts           create/update call docs
    services/pipeline.ts        processCompletedCall (shared by webhook + simulate)
    services/policy.ts          auto-block / needs_review decision
    services/push.ts            FCM sending
    services/elevenlabsSignature.ts
    ai/index.ts                 STUB in first commit → Sky owns afterwards
  scripts/seed.ts
  scripts/reset.ts
```

### `src/env.ts`
```ts
import "dotenv/config";
import { z } from "zod";

const Env = z.object({
  PORT: z.coerce.number().default(8080),
  PUBLIC_BASE_URL: z.string().default("http://localhost:8080"),
  DEFAULT_FAMILY_ID: z.string().default("demo-family"),
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
  FIREBASE_SERVICE_ACCOUNT_BASE64: z.string().min(10),
  TWILIO_ACCOUNT_SID: z.string().default(""),
  TWILIO_AUTH_TOKEN: z.string().default(""),
  TWILIO_PHONE_NUMBER: z.string().default(""),
  TWILIO_API_KEY_SID: z.string().default(""),
  TWILIO_API_KEY_SECRET: z.string().default(""),
  TWILIO_TWIML_APP_SID: z.string().default(""),
  VALIDATE_TWILIO_SIGNATURE: z.string().default("false").transform(v => v === "true"),
  ELEVENLABS_API_KEY: z.string().default(""),
  ELEVENLABS_AGENT_ID: z.string().default(""),
  ELEVENLABS_WEBHOOK_SECRET: z.string().default(""),
  AUTO_BLOCK_SCORE: z.coerce.number().default(85),
  GLOBAL_BLOCK_THRESHOLD: z.coerce.number().default(3),
  DEMO_ADMIN_TOKEN: z.string().min(16),
  DEMO_OWNER_NAME: z.string().default("คุณยายสมศรี"),
  DEMO_OWNER_PHONE: z.string().default(""),
  SEED_WHITELIST: z.string().default(""),
});
export const env = Env.parse(process.env);
// LLM_* vars are read by Sky's src/ai code directly from process.env.
```

### `src/firebase.ts`
```ts
import admin from "firebase-admin";
import { env } from "./env";
const sa = JSON.parse(Buffer.from(env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf8"));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
export const db = admin.firestore();
export const messaging = admin.messaging();
export const FieldValue = admin.firestore.FieldValue;
export const Timestamp = admin.firestore.Timestamp;
```

### `src/ai/index.ts` (STUB: commit once, then hand to Sky)
```ts
// OWNER: Sky. Tete wrote this stub so the server compiles. Do not edit after the first commit.
import type { CallAnalysis, TranscriptTurn } from "../contract";
import { riskLevelFromScore } from "../contract";

export interface AnalyzeInput {
  transcript: TranscriptTurn[];
  callerKey: string;
  ownerLabel: string;
  agentDataCollection?: Record<string, unknown> | null;
}

export async function analyzeCall(input: AnalyzeInput): Promise<CallAnalysis> {
  const said = input.transcript.filter(t => t.role === "caller").map(t => t.text).join(" ");
  const score = 50;
  return {
    callerName: null, organization: null, targetPerson: null, knewOwner: null,
    reason: said.slice(0, 80) || "ไม่ทราบ", reasonEn: null,
    summary: said.slice(0, 200) || "ผู้โทรไม่ได้ให้ข้อมูล", summaryEn: null,
    callbackNumber: null, urgency: "normal",
    riskScore: score, riskLevel: riskLevelFromScore(score),
    redFlags: [], evidence: [], recommendedAction: "review",
    source: "rules", analyzedAt: new Date().toISOString(),
  };
}
```
**The contract between you and Sky:** `analyzeCall(input: AnalyzeInput): Promise<CallAnalysis>`. It **never throws** (Sky guarantees this, but wrap it in try/catch anyway). Keep the `AnalyzeInput` shape exactly as above.

## B3. `src/index.ts` (mount order matters)

```ts
import express from "express";
import cors from "cors";
import { env } from "./env";
import { CONTRACT_VERSION } from "./contract";
import { elevenlabsRouter } from "./routes/elevenlabs";
import { twilioRouter } from "./routes/twilio";
import { voiceTokenRouter } from "./routes/voiceToken";
import { devRouter } from "./routes/dev";

const app = express();
app.set("trust proxy", true);
app.use(cors({ origin: env.CORS_ORIGINS.split(",").map(s => s.trim()) }));

// 1) raw body FIRST for the ElevenLabs HMAC check (before any json parser)
app.use(elevenlabsRouter);
// 2) Twilio sends application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }));
app.use(twilioRouter);
// 3) JSON for everything else
app.use(express.json({ limit: "1mb" }));
app.use(voiceTokenRouter);
app.use(devRouter);

app.get("/health", (_req, res) => res.json({ ok: true, contractVersion: CONTRACT_VERSION }));
app.use((err: any, _req: any, res: any, _next: any) => { console.error(err); res.status(500).json({ error: "internal" }); });
app.listen(env.PORT, () => console.log(`LukLan server on :${env.PORT}`));
```

## B4. Services

### `services/families.ts`
```ts
import { db } from "../firebase";
import { env } from "../env";
import { paths, FamilyDoc, GlobalBlockEntry } from "../contract";

export async function findFamilyIdByTwilioNumber(to: string): Promise<string> {
  if (to) {
    const q = await db.collection("families").where("twilioNumber", "==", to).limit(1).get();
    if (!q.empty) return q.docs[0].id;
  }
  return env.DEFAULT_FAMILY_ID;
}
export async function getFamily(familyId: string): Promise<FamilyDoc | null> {
  const s = await db.doc(paths.family(familyId)).get();
  return s.exists ? (s.data() as FamilyDoc) : null;
}
export async function isWhitelisted(f: string, key: string) {
  return (await db.doc(paths.whitelistEntry(f, key)).get()).exists;
}
export async function isBlocked(f: string, key: string) {
  if ((await db.doc(paths.blockedEntry(f, key)).get()).exists) return true;
  const g = await db.doc(paths.globalBlock(key)).get();
  return g.exists && ((g.data() as GlobalBlockEntry).reportedBy?.length ?? 0) >= env.GLOBAL_BLOCK_THRESHOLD;
}
```
Run the three lookups **in parallel** (`Promise.all`). Twilio's webhook timeout is 15 s, so stay well under it.

### `services/calls.ts`
- `createCall({ id, familyId, callerKey, from, to, route, status, simulated? })` → `set` with `startedAt: FieldValue.serverTimestamp()`, `transcript: []`, `analysis: null`, `decision: null`, `notified: false`.
- `updateCall(familyId, id, patch)` → `set(patch, { merge: true })`. Use merge so a webhook arriving first doesn't fail.

### `services/policy.ts` (thresholds are yours; the score is Sky's)
```ts
import { CallAnalysis, CallStatus } from "../contract";
import { env } from "../env";
export function decideStatus(a: CallAnalysis): Extract<CallStatus, "auto_blocked" | "needs_review"> {
  return a.riskScore >= env.AUTO_BLOCK_SCORE ? "auto_blocked" : "needs_review";
}
```

### `services/push.ts`
```ts
import { messaging, db, FieldValue } from "../firebase";
import { paths, PUSH_CHANNEL_DEFAULT, PUSH_CHANNEL_URGENT, formatCallerKey, CallAnalysis, PushData } from "../contract";
import { getFamily } from "./families";

export async function notifyGuardians(familyId: string, callId: string, callerKey: string, a: CallAnalysis): Promise<boolean> {
  const fam = await getFamily(familyId);
  const tokens = fam?.pushTokens ?? [];
  if (!tokens.length) return false;
  const urgent = a.urgency === "urgent";
  const title = urgent ? "ด่วน: มีสายแปลกรอตรวจสอบ" : "มีสายแปลกรอตรวจสอบ";
  const body = `${a.callerName ?? formatCallerKey(callerKey)} · ${a.reason}`.slice(0, 100);
  const data: PushData = { type: "screened_call", familyId, callId, urgent: urgent ? "1" : "0" };
  const res = await messaging.sendEachForMulticast({
    tokens,
    notification: { title, body },
    data: data as unknown as Record<string, string>,
    android: { priority: "high", notification: { channelId: urgent ? PUSH_CHANNEL_URGENT : PUSH_CHANNEL_DEFAULT } },
  });
  const dead = res.responses
    .map((r, i) => (!r.success && /registration-token-not-registered|invalid-argument/.test(r.error?.code ?? "") ? tokens[i] : null))
    .filter(Boolean) as string[];
  if (dead.length) await db.doc(paths.family(familyId)).update({ pushTokens: FieldValue.arrayRemove(...dead) });
  return res.successCount > 0;
}
```

### `services/pipeline.ts` (one function; webhook and simulate both call it)
```ts
export async function processCompletedCall(p: {
  familyId: string; callId: string; callerKey: string;
  conversationId?: string | null; transcript: TranscriptTurn[];
  agentData?: Record<string, unknown> | null; durationSec?: number | null;
}): Promise<{ status: CallStatus; analysis: CallAnalysis | null }> {
  // 1. merge: status "analyzing", transcript, conversationId, endedAt, durationSec
  // 2. if no caller turn with text.trim().length > 1 → status "no_message", analysis null, return
  // 3. analysis = await analyzeCall({ transcript, callerKey, ownerLabel: family.ownerLabelForCallers ?? "เจ้าของเบอร์นี้", agentDataCollection: agentData })
  //    (try/catch → minimal fallback analysis with recommendedAction "review")
  // 4. status = decideStatus(analysis)
  // 5. if auto_blocked: set blockedEntry {reason:"auto"} + globalBlock merge {reportedBy: arrayUnion(familyId), lastReason, updatedAt}
  // 6. save {analysis, status}
  // 7. if needs_review: notified = await notifyGuardians(...) → save {notified}
  // 8. console.log one line: callId, status, riskScore, ms elapsed
}
```

## B5. Twilio routing (`routes/twilio.ts`): the heart of the product

```ts
import { Router } from "express";
import twilio from "twilio";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { env } from "../env";
import { toCallerKey } from "../contract";
import { findFamilyIdByTwilioNumber, getFamily, isBlocked, isWhitelisted } from "../services/families";
import { createCall, updateCall } from "../services/calls";

const elevenlabs = new ElevenLabsClient({ apiKey: env.ELEVENLABS_API_KEY });
export const twilioRouter = Router();

twilioRouter.post("/twilio/voice", async (req, res) => {
  const { From = "", To = "", CallSid = "" } = req.body ?? {};
  const to = To || env.TWILIO_PHONE_NUMBER;
  const callerKey = toCallerKey(From);
  const vr = new twilio.twiml.VoiceResponse();
  try {
    const familyId = await findFamilyIdByTwilioNumber(to);
    const [family, blocked, whitelisted] = await Promise.all([
      getFamily(familyId), isBlocked(familyId, callerKey), isWhitelisted(familyId, callerKey),
    ]);
    const base = { id: CallSid, familyId, callerKey, from: From, to };

    if (blocked) {
      await createCall({ ...base, route: "blocked", status: "rejected" });
      vr.reject({ reason: "busy" });
      return res.type("text/xml").send(vr.toString());
    }
    if (whitelisted && family?.ownerPhone) {
      await createCall({ ...base, route: "whitelist", status: "forwarded" });
      const dial = vr.dial({ callerId: env.TWILIO_PHONE_NUMBER, timeout: 25 });
      dial.number({ statusCallback: `${env.PUBLIC_BASE_URL}/twilio/status`, statusCallbackEvent: ["completed"] }, family.ownerPhone);
      return res.type("text/xml").send(vr.toString());
    }

    // unknown → AI assistant
    await createCall({ ...base, route: "screened", status: "screening" });
    const twiml = await elevenlabs.conversationalAi.twilio.registerCall({
      agentId: env.ELEVENLABS_AGENT_ID,
      fromNumber: From.startsWith("client:") ? env.TWILIO_PHONE_NUMBER : From, // browser callers have no phone number
      toNumber: to,
      direction: "inbound",
      conversationInitiationClientData: {
        dynamicVariables: {
          call_sid: CallSid,
          family_id: familyId,
          caller_key: callerKey,
          owner_label: family?.ownerLabelForCallers || "เจ้าของเบอร์นี้",
        },
      },
    });
    return res.type("text/xml").send(typeof twiml === "string" ? twiml : String(twiml));
  } catch (e) {
    console.error("voice route failed", e);
    vr.say({ language: "th-TH" }, "ขออภัยค่ะ ระบบขัดข้อง กรุณาโทรใหม่อีกครั้ง");
    return res.type("text/xml").send(vr.toString());
  }
});

twilioRouter.post("/twilio/status", async (req, res) => {
  // Twilio sends ParentCallSid for the dialed leg; fall back to CallSid
  const id = req.body.ParentCallSid || req.body.CallSid;
  // updateCall(...) with endedAt + durationSec (CallDuration) — find family via DEFAULT_FAMILY_ID for the demo
  res.sendStatus(204);
});
```

**Notes and gotchas:**
- **Check the SDK shape on first run.** The ElevenLabs "register Twilio call" endpoint is documented. The JS SDK method name and casing above follow that doc's examples, but if TypeScript complains, look at the SDK types and adjust. Log `typeof twiml` once.
- With register-call, **ElevenLabs cannot transfer the call**. That's fine: the agent says the family will get back to them.
- If `VALIDATE_TWILIO_SIGNATURE=true`, validate with `twilio.validateRequest(env.TWILIO_AUTH_TOKEN, req.header("X-Twilio-Signature")!, env.PUBLIC_BASE_URL + req.originalUrl, req.body)`. It's off by default so a proxy URL mismatch can't break the demo. Turn it on Friday morning if all tests pass.
- **Caller ID check** (first thing after deploy): call the US number from a Thai SIM and log `From`. If `From` is empty or "anonymous", whitelisting can't work for real phones. In that case the demo relies on browser calls, where identity is guaranteed, and real phones are only used for the scam call (which doesn't need whitelisting).
- Use `<Dial callerId=TWILIO_PHONE_NUMBER>`. Twilio doesn't allow verified Thai caller IDs for calls to Thailand.

## B6. ElevenLabs post-call webhook (`routes/elevenlabs.ts`)

```ts
import { Router, raw } from "express";
import { env } from "../env";
import { verifyElevenLabsSignature } from "../services/elevenlabsSignature";
import { processCompletedCall } from "../services/pipeline";
import { db } from "../firebase";
import { toCallerKey, TranscriptTurn } from "../contract";

export const elevenlabsRouter = Router();
elevenlabsRouter.post("/webhooks/elevenlabs", raw({ type: "*/*", limit: "5mb" }), async (req, res) => {
  const body = (req.body as Buffer).toString("utf8");
  if (env.ELEVENLABS_WEBHOOK_SECRET && !verifyElevenLabsSignature(body, req.header("elevenlabs-signature"), env.ELEVENLABS_WEBHOOK_SECRET)) {
    console.warn("bad elevenlabs signature"); return res.sendStatus(401);
  }
  res.sendStatus(200);                       // reply fast, process after
  try {
    const evt = JSON.parse(body);
    await db.collection("debug").doc("elevenlabs_last").set({ at: new Date().toISOString(), type: evt.type ?? null, body: body.slice(0, 200000) });
    if (evt.type !== "post_call_transcription") return;
    const d = evt.data ?? {};
    const vars = d.conversation_initiation_client_data?.dynamic_variables ?? {};
    const transcript: TranscriptTurn[] = (d.transcript ?? [])
      .filter((t: any) => typeof t.message === "string" && t.message.trim())
      .map((t: any) => ({ role: t.role === "agent" ? "assistant" : "caller", text: t.message.trim(), t: Number(t.time_in_call_secs ?? 0) }));
    await processCompletedCall({
      familyId: vars.family_id || env.DEFAULT_FAMILY_ID,
      callId: vars.call_sid || `el_${d.conversation_id}`,
      callerKey: vars.caller_key || toCallerKey(vars.system__caller_id ?? ""),
      conversationId: d.conversation_id ?? null,
      transcript,
      agentData: d.analysis?.data_collection_results ?? null,
      durationSec: d.metadata?.call_duration_secs ?? null,
    });
  } catch (e) { console.error("post-call processing failed", e); }
});
```

`services/elevenlabsSignature.ts` uses the header `ElevenLabs-Signature: t=<unix>,v0=<hex>`, where hex = HMAC-SHA256(secret, `${t}.${rawBody}`). Confirm the format in the ElevenLabs webhook docs.
```ts
import crypto from "crypto";
export function verifyElevenLabsSignature(raw: string, header: string | undefined, secret: string): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map(p => { const i = p.indexOf("="); return [p.slice(0, i).trim(), p.slice(i + 1).trim()]; }));
  const t = parts["t"], v0 = parts["v0"];
  if (!t || !v0 || Math.abs(Date.now() / 1000 - Number(t)) > 30 * 60) return false;
  const mac = crypto.createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex");
  return mac.length === v0.length && crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(v0));
}
```
**If the payload shape differs from the code above**, read the real payload in Firestore `debug/elevenlabs_last` and adapt the mapping. That's exactly why we save it. If signatures keep failing at 23:00, unset the secret, log a warning, and keep going.

## B7. Browser calls (`routes/voiceToken.ts`) for the judges' web demo

```ts
import { Router } from "express";
import twilio from "twilio";
import { env } from "../env";
export const voiceTokenRouter = Router();
const hits = new Map<string, number[]>();      // naive rate limit: 10 tokens / minute / IP
voiceTokenRouter.get("/voice/token", (req, res) => {
  const ip = req.ip ?? "x"; const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter(t => now - t < 60_000); arr.push(now); hits.set(ip, arr);
  if (arr.length > 10) return res.status(429).json({ error: "slow down" });
  const raw = String(req.query.identity ?? "");
  const identity = (raw || `judge-${Math.random().toString(36).slice(2, 8)}`).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "judge";
  const { AccessToken } = twilio.jwt; const { VoiceGrant } = AccessToken;
  const token = new AccessToken(env.TWILIO_ACCOUNT_SID, env.TWILIO_API_KEY_SID, env.TWILIO_API_KEY_SECRET, { identity, ttl: 3600 });
  token.addGrant(new VoiceGrant({ outgoingApplicationSid: env.TWILIO_TWIML_APP_SID, incomingAllow: false }));
  res.json({ token: token.toJwt(), identity, to: env.TWILIO_PHONE_NUMBER });
});
```
The web demo connects with `params: { To: <to> }`. The TwiML App posts to `/twilio/voice` with `From=client:<identity>`. Same routing, same pipeline.

## B8. Dev and demo endpoints, seed and reset

### `routes/dev.ts`
- Middleware: `if (req.header("x-admin-token") !== env.DEMO_ADMIN_TOKEN) return res.sendStatus(401)`.
- `POST /dev/simulate-call`: validate the body with zod (`from` string, `transcript` array of `{role, text, t}`, max 60 turns). Then:
  - `callId = "sim_" + Date.now().toString(36)`, `callerKey = toCallerKey(from)`.
  - `createCall({ route: "screened", status: "analyzing", simulated: true, ... })`.
  - `await processCompletedCall(...)`, then respond `{ callId, status, analysis }`.
- `POST /demo/reset`: delete all docs in `calls` and `blocked`; delete whitelist docs where `addedBy != "seed"`; for `blocklist` docs `where("reportedBy","array-contains",familyId)`, run `arrayRemove(familyId)`. Use batched deletes of up to 400 per batch.

### `scripts/seed.ts` (`npm run seed`; safe to re-run, never wipes `pushTokens`)
```ts
// families/demo-family (merge):
//   ownerName: DEMO_OWNER_NAME, ownerLabelForCallers: "เจ้าของเบอร์นี้", ownerPhone: DEMO_OWNER_PHONE,
//   guardianName: "ลูกหลาน", twilioNumber: TWILIO_PHONE_NUMBER, createdAt: serverTimestamp() (only if new)
// whitelist seeds from SEED_WHITELIST "Name|+66...;Name2|+66..." → addedBy "seed"
// plus emergency numbers 191, 1669, 199, 1155 → displayName "เบอร์ฉุกเฉิน 191" etc., addedBy "seed"
// IMPORTANT: compute every doc id with toCallerKey().
```
`scripts/reset.ts` calls the same logic as `/demo/reset` locally. Factor it into `services/reset.ts`.

## B9. APK release workflow (`.github/workflows/android-release.yml`)

You own CI; Poom owns the app. The workflow builds `apps/mobile` exactly as committed. Expo uses **continuous native generation**: `android/` is generated in CI by `expo prebuild` and is never committed.

**GitHub Actions secrets to add:** `GOOGLE_SERVICES_JSON_BASE64`, the six `EXPO_PUBLIC_FIREBASE_*`, `EXPO_PUBLIC_FAMILY_ID`, `EXPO_PUBLIC_SERVER_URL`, `EXPO_PUBLIC_WEB_DEMO_URL`.

```yaml
name: Android APK release
on:
  workflow_dispatch:
  push:
    tags: ["v*"]
permissions:
  contents: write
jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 45
    defaults:
      run:
        working-directory: apps/mobile
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: apps/mobile/package-lock.json
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: "17"
          cache: gradle
      - run: npm ci
      - name: Write google-services.json
        run: echo "$GSJ" | base64 -d > google-services.json
        env:
          GSJ: ${{ secrets.GOOGLE_SERVICES_JSON_BASE64 }}
      - name: Write .env
        run: |
          cat > .env <<EOF
          EXPO_PUBLIC_FIREBASE_API_KEY=${{ secrets.EXPO_PUBLIC_FIREBASE_API_KEY }}
          EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=${{ secrets.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN }}
          EXPO_PUBLIC_FIREBASE_PROJECT_ID=${{ secrets.EXPO_PUBLIC_FIREBASE_PROJECT_ID }}
          EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=${{ secrets.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET }}
          EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${{ secrets.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID }}
          EXPO_PUBLIC_FIREBASE_APP_ID=${{ secrets.EXPO_PUBLIC_FIREBASE_APP_ID }}
          EXPO_PUBLIC_FAMILY_ID=${{ secrets.EXPO_PUBLIC_FAMILY_ID }}
          EXPO_PUBLIC_SERVER_URL=${{ secrets.EXPO_PUBLIC_SERVER_URL }}
          EXPO_PUBLIC_WEB_DEMO_URL=${{ secrets.EXPO_PUBLIC_WEB_DEMO_URL }}
          EXPO_PUBLIC_USE_MOCKS=false
          EOF
      - name: Generate native Android project
        run: npx expo prebuild --platform android --clean --no-install
      - name: Build release APK
        working-directory: apps/mobile/android
        run: ./gradlew assembleRelease --no-daemon
      - name: Rename APK
        run: cp android/app/build/outputs/apk/release/app-release.apk luklan-guardian.apk
      - uses: actions/upload-artifact@v4
        with:
          name: luklan-guardian
          path: apps/mobile/luklan-guardian.apk
      - name: Publish GitHub Release
        if: startsWith(github.ref, 'refs/tags/')
        uses: softprops/action-gh-release@v2
        with:
          files: apps/mobile/luklan-guardian.apk
          generate_release_notes: true
```

- The Expo prebuild template signs `release` with the debug keystore, so the APK installs on any phone with "install unknown apps" allowed. That's fine for a demo. Store publishing would need a real keystore, which we skip.
- The stable download link is `https://github.com/teterw/luklan/releases/latest/download/luklan-guardian.apk`. The web demo and README point to it.
- **Release cadence:** tag `v0.1.0` as soon as Poom's app opens (target Thu 22:00) to prove the pipeline works. Then tag again whenever Poom says "ready": `v0.2.x` tonight, **`v1.0.0` by Fri 11:00**. Only Tete pushes tags: `git tag v1.0.0 && git push origin v1.0.0`.
- If the build fails, read the log. Common causes are a Java version mismatch (try 17, or whatever the Expo SDK docs say), a missing `google-services.json`, or Gradle running out of memory (add `org.gradle.jvmargs=-Xmx4g` through an Expo config plugin, which is Poom's area). If CI is still red at 23:30, Poom builds locally (fallback in A12) and you upload the APK to a GitHub Release by hand.

## B10. Deploy, wire up, end-to-end test

1. Push → Railway deploys → `GET /health` returns ok.
2. Set the Twilio number webhook and the TwiML App URL to `${PUBLIC_BASE_URL}/twilio/voice`.
3. `npm run seed` (locally, with production env) → check `families/demo-family` in the Firestore console.
4. Ask Sky to set the ElevenLabs post-call webhook to `${PUBLIC_BASE_URL}/webhooks/elevenlabs`.
5. **Test matrix**. Run every row and tick it:

| # | Test | Expected |
|---|---|---|
| 1 | `curl -X POST /dev/simulate-call` with a scam transcript | call doc `auto_blocked` or `needs_review`, analysis present |
| 2 | Same with a delivery-rider transcript | `needs_review`, push on Poom's APK |
| 3 | Real phone → Twilio number (unknown) | AI answers in Thai; after hang-up a card appears within ~15 s |
| 4 | Accept in app → call again from same phone | the owner's phone rings (`forwarded`) |
| 5 | Block in app → call again | rejected (`rejected`) |
| 6 | Browser call from web demo | same as 3, with callerKey `client:<identity>` |
| 7 | Caller hangs up immediately | `no_message`, no push |
| 8 | `/demo/reset` | clean demo state; seeds remain |
| 9 | Server restart mid-demo | Railway restarts; nothing lost (all state in Firestore) |

## B11. README for judges (Fri morning, finish by 11:00)

Sections:
1. One-line pitch plus a screenshot or GIF.
2. **Links:** web demo, APK download, pitch deck.
3. Problem, with the numbers the PM provides.
4. How it works (copy the A4 flow as a diagram).
5. Tech stack: Expo/React Native, Node/Express, Twilio, **ElevenLabs Agents** (central), LLM, Firebase.
6. Eval results table (from Sky).
7. How to run locally.
8. Team table with GitHub handles.
9. Limitations and roadmap:
   - Production path: an Android call-screening app on grandma's phone, with carrier forwarding to the AI line, or a telco network service.
   - A Thai Twilio number after regulatory approval.

## B12. If you finish early (only after M2 passes)
- U-Bot: ask u-topia mentors whether there's an API. If yes, add `POST /ubot/ask` `{ callId, question }` that forwards the call summary and transcript to U-Bot and returns the answer. Tell Poom so he can add the button.
- Turn on `VALIDATE_TWILIO_SIGNATURE`.
- Add a `GET /stats` endpoint `{ screened, autoBlocked, accepted, blocked }` for the web demo (tell Sky).
