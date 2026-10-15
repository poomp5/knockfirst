# Update 05: **No Twilio.** Calls happen in the browser (free), grandma's phone rings through the app

> **This file overrides older task files wherever they disagree** (`CLAUDE.md` v2 says updates win). Twilio is **removed** from the hackathon build.
>
> **Tete, paste this into Claude Code:**
> ```
> I'm Tete. Read "<path to 05-no-twilio.md>" completely (it's in my Downloads folder whose name contains "hackathon").
> Copy it to docs/tasks/05-no-twilio.md, apply contract v3 to apps/server/src/contract.ts, then do the Tete section.
> Commit after each step, push, and tell me what to post in the team chat.
> ```
> **Poom / Sky, after Tete says "update 05 is pushed":** `git pull --rebase origin main`, then tell Claude:
> *"Re-read CLAUDE.md and docs/tasks/05-no-twilio.md, apply contract v3 to my copy, then do my section."*

---

## Why (for the team and the pitch)

- **We only call inside Thailand.** A Thai Twilio number needs ID/address documents and approval, so it won't be ready by tomorrow. A US number makes every test call international (cost, blocked on some SIMs, caller ID not guaranteed). The Twilio trial is limited to verified numbers and blocks some features.
- **Free replacement:** the ElevenLabs JavaScript SDK runs a live voice conversation with our agent **in the browser** (WebRTC). It uses only the hackathon ElevenLabs credits. Our server keeps the API key and hands out a one-time token.
- **Everything that matters stays real:** the AI conversation, the transcript, the LLM analysis, push notifications, Accept/Block, whitelist and blocklist routing, and grandma's phone ringing. Only the phone network is simulated.
- **Pitch line:** *"KnockFirst's screening engine doesn't care where a call comes from. In the demo, calls come through our web phone. In production the same engine plugs into the carrier network or Android's call-screening API."* Show it as a "phone-line adapters" box on the architecture slide.

## New flow

```
Caller page (web demo; looks like a phone dialer)
  │ "call as" a Thai number, e.g. 081-111-2222  → POST /call/start
  ▼
Server routing (same rules as before)
  ├─ blocked     → { route: "blocked" }    page shows "เบอร์นี้ถูกบล็อก" and hangs up      status "rejected"
  ├─ whitelisted → { route: "whitelist" }  push "owner_ring" → GRANDMA'S PHONE RINGS (app)  status "forwarded"
  │                                        grandma taps รับสาย / ไม่รับ → caller page shows it live
  └─ unknown     → { route: "screened", conversationToken, dynamicVariables }
                   + instant guardian alert (update 04)
                   page starts the ElevenLabs session in the browser → AI talks
Hang up → page calls POST /call/end { callId, conversationId }
ElevenLabs post-call webhook → same pipeline as before → analysis → guardian push → Accept/Block
(fallback: if no webhook within 25 s, the server fetches the conversation from the ElevenLabs API itself)
```

## Contract v3 (Tete pastes into `apps/server/src/contract.ts`; Poom and Sky paste into their copies)

```ts
export const CONTRACT_VERSION = 3;
export const PUSH_CHANNEL_RING = "grandma-ring";      // NEW: grandma's phone ringing (importance MAX, ringtone)

// FamilyDoc: ADD
  ownerPushTokens?: string[];   // FCM tokens of phones in "grandma mode"

// CallDoc: ADD
  channel?: "web" | "phone";                       // which phone-line adapter the call came from (demo = "web")
  callerLabel?: string | null;                     // optional name typed on the caller page (demo only)
  ownerResponse?: "answered" | "declined" | null;  // grandma's tap on a whitelisted call

// PushData: REPLACE type union
export interface PushData {
  type: "incoming_call" | "screened_call" | "call_update" | "owner_ring";
  familyId: string;
  callId: string;
  urgent: "0" | "1";
}
```

- **Call IDs:** `web_<base36 time><4 random chars>`, made by the server.
- **ElevenLabs dynamic variable `call_sid` is renamed to `call_id`.** The others stay: `family_id`, `caller_key`, `owner_label`.
- **Firestore client permissions (A6) add:**
  - `ownerPushTokens` on `families/{f}`.
  - `ownerResponse` on `calls/{id}`, only while `status == "forwarded"`.
- **Env (A8):** delete every `TWILIO_*` var and `VALIDATE_TWILIO_SIGNATURE`. Nothing new is needed.

## New and removed server endpoints (A7)

| Method | Path | Body → Response |
|---|---|---|
| POST | `/call/start` | `{ callerNumber: string, callerLabel?: string, familyId?: string }` → `{ callId, route: "blocked" \| "whitelist" \| "screened", callerKey, displayName, ownerName, conversationToken?, dynamicVariables? }` |
| POST | `/call/end` | `{ callId, conversationId?: string }` → `{ ok: true }` |
| removed | `/twilio/voice`, `/twilio/status`, `/voice/token` | — |

`/dev/simulate-call` and `/demo/reset` stay unchanged.

---

## Tete: server (about 1–1.5 h; less than the Twilio work it replaces)

1. **Remove Twilio.**
   - Drop the `twilio` package, the Twilio routes, `voiceToken.ts`, and the `TWILIO_*` env vars.
   - If you already wrote the Twilio route, move it to `src/adapters/twilio.ts`, don't mount it, and add a comment "production phone adapter (not deployed)". That's useful for the pitch. If you didn't write it, don't.
   - Remove the Twilio steps from `docs/progress/tete.md`.
2. **`POST /call/start`** (`routes/call.ts`):
   - Rate limit: 10 requests per minute per IP.
   - Validate that `callerNumber` has at least 9 digits. `callerKey = toCallerKey(callerNumber)`.
   - Family: `familyId ?? DEFAULT_FAMILY_ID`. Check blocked and whitelisted in parallel (reuse `services/families.ts`).
   - **blocked** → `createCall({ route: "blocked", status: "rejected", channel: "web", ... })` → respond.
   - **whitelisted** → `createCall({ route: "whitelist", status: "forwarded", ownerResponse: null, ... })`, then send an `owner_ring` push to `ownerPushTokens`:
     - channel `grandma-ring`, priority high, `tag = callId`
     - title `📞 {displayName} กำลังโทรหาคุณ`, body `แตะเพื่อรับสาย`
   - **unknown** → `createCall({ route: "screened", status: "screening", channel: "web", callerLabel })`, then `void notifyIncoming(...)` (update 04). Then get a WebRTC conversation token:
     ```ts
     const r = await fetch(`https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${env.ELEVENLABS_AGENT_ID}`,
       { headers: { "xi-api-key": env.ELEVENLABS_API_KEY } });
     const { token } = await r.json();   // check the field name against the ElevenLabs docs on first run
     ```
     Respond with `conversationToken: token`, and `dynamicVariables: { call_id, family_id, caller_key, owner_label }`.
   - `displayName` = the whitelist entry's `displayName`, else `formatCallerKey(callerKey)`.
3. **`POST /call/end`:**
   - If `conversationId` is given: save it on the call doc, and write the mapping doc `conversations/{conversationId} = { familyId, callId }` (add `conversations` to Sky's rules as server-only).
   - For `forwarded` calls with no `ownerResponse` yet: set `endedAt`.
   - **Fallback timer (screened calls):** 25 s later, if the call is still `screening` (no webhook arrived), fetch `GET https://api.elevenlabs.io/v1/convai/conversations/{conversationId}` with `xi-api-key`. Map its `transcript` the same way as the webhook and run `processCompletedCall`. Retry every 5 s, up to 60 s, until the conversation status is done.
4. **Webhook (`routes/elevenlabs.ts`):** read `vars.call_id`. If it's missing, look up `conversations/{conversation_id}` for `{ familyId, callId }`. Everything else is unchanged. It's the same pipeline, so analysis, policy, pushes and the decision guard all work as before.
5. **Push helpers:** add `notifyOwnerRing(familyId, callId, displayName)` (tokens from `ownerPushTokens`, dead-token cleanup on that array).
6. **Seed:** keep the whitelist seeds. Add a seed entry `หลานชาย (demo)` for **`0811112222`**, so the "known caller" demo works before any Accept.
7. **First test, right after deploy:** do one browser call through Sky's page (or a local HTML test page) and confirm the **ElevenLabs post-call webhook arrives for a browser conversation**. If it doesn't, the fallback timer in step 3 covers it. Note the result in `docs/progress/tete.md`.

## Sky: web demo caller page, agent, rules (about 1–1.5 h)

1. **ElevenLabs agent:**
   - In the agent's security settings, turn on **authentication** (private agent), so only tokens from our server work and nobody can burn our credits.
   - Make sure the dynamic variables `call_id`, `family_id`, `caller_key` and `owner_label` exist; give `owner_label` a default.
   - Keep the post-call webhook as configured.
2. **Web demo "Try it" becomes a phone:** remove `@twilio/voice-sdk` and install `@elevenlabs/client` (or `@elevenlabs/react` with `useConversation`).
   - **Phone-style UI:**
     - "โทรในนาม / Call as" input, prefilled with a random Thai mobile `08x-xxx-xxxx`.
     - Buttons: **"เบอร์ใหม่ / New number"** and **"ใช้เบอร์เดิม / Same number again"** (remember the last number in localStorage inside try/catch).
     - Optional "ชื่อ / Name" field.
     - Persona chips (rider / fake police / clinic).
     - A big green call button.
   - **On call:** `POST /call/start`, then by `route`:
     - **blocked:** show "📵 เบอร์นี้ถูกบล็อก สายถูกตัดทันที / This number is blocked" with a short busy tone.
     - **whitelist:** show "📞 กำลังเรียกสายคุณยาย… / Ringing grandma… (known caller, no AI)" with a ringing animation and ringback sound. Listen to the call doc. Show "✅ คุณยายรับสายแล้ว" or "คุณยายไม่รับสาย" from `ownerResponse`, or give up after 30 s.
     - **screened:** start the conversation:
       ```ts
       const conversation = await Conversation.startSession({
         conversationToken, connectionType: "webrtc", dynamicVariables,
         onConnect: () => setState("talking"),
         onMessage: (m) => appendLiveTranscript(m),     // show live captions — great on stage
         onDisconnect: () => endCall(),
         onError: (e) => showError(e),
       });
       // hang-up button: await conversation.endSession();
       // endCall(): POST /call/end { callId, conversationId: conversation.getId() }
       ```
       Check option names (`dynamicVariables`, `connectionType`) against the current SDK docs.
   - Show **live captions** during the call, a call timer, and after hang-up: "ดูผลด้านล่าง ⬇". The guardian-view card for this call is highlighted as "สายของคุณ / Your call" (match on `callerKey`).
   - **Echo tip on the page:** "ใช้หูฟังเพื่อเสียงที่ชัดที่สุด / Use earphones for best results."
3. **Firestore rules:**
   - Family `onlyChanges` adds `'ownerPushTokens'`.
   - Calls `update` adds a second allowed case: only `ownerResponse` changes, its value is in `['answered','declined']`, and `resource.data.status == 'forwarded'`.
   - Add `match /conversations/{id} { allow read, write: if false; }` (server only).
   - Deploy and tell the team.
4. **Eval and simulate:** unchanged (they use `/dev/simulate-call`).

## Poom: "grandma mode" in the app (about 1 h)

1. **Device role**, stored with `@react-native-async-storage/async-storage` (`npx expo install`). In Settings: **"เครื่องนี้เป็นของ: ลูกหลาน (ผู้ดูแล) / คุณยาย"**. Show a one-time chooser on first launch; default to guardian.
   - **guardian** → the push token goes in `pushTokens` (as now) and is removed from `ownerPushTokens`.
   - **grandma** → the token goes in `ownerPushTokens` and is removed from `pushTokens`.
2. **Grandma-mode home** (replaces the tabs when role = grandma):
   - Huge text "KnockFirst ปกป้องคุณอยู่ 🛡️", today's date, and "สายจากคนแปลกหน้า AI จะรับแทน ลูกหลานจะเป็นคนตรวจสอบ".
   - No inbox and no settings clutter. A small corner link for "เปลี่ยนโหมด" (switch mode).
3. **Ringing screen** (`ring/[callId].tsx`):
   - Opens when an `owner_ring` push is tapped, **or automatically** when a realtime listener sees a call with `status == "forwarded"` and `ownerResponse == null` from the last 30 s. On stage the grandma app stays open in the foreground, so the listener path is what you'll see.
   - Full screen: caller `displayName`, big "📞 กำลังโทรหาคุณ", a pulsing avatar, **รับสาย** (green) and **ไม่รับ** (red) buttons.
   - Loop a ringtone (`expo-audio`; add a short royalty-free ring sound to `assets/ring.mp3`) and vibrate. Stop after 30 s or on a tap.
   - A tap writes `ownerResponse` with `updateDoc`, then shows "รับสายแล้ว" for 3 s. Be honest in the UI: the demo has no voice line here.
4. **Channel** `grandma-ring`: importance **MAX**, sound on, long vibration pattern.
5. **Guardian app:** a `forwarded` call in the inbox shows "คนรู้จัก · ต่อสายถึงคุณยายแล้ว", plus "คุณยายรับสาย" / "ไม่รับสาย" when `ownerResponse` is set. Paste contract v3.
6. Bump the version and ask Tete to tag a new APK. **Install the same APK on both Android phones**; one is set to the grandma role.

---

## The call test (everyone runs it after M2; it's also the stage demo)

**Devices:** **caller** = web demo on a phone browser (with earphones) or a laptop · **guardian** = Android with KnockFirst (guardian role) · **grandma** = second Android with KnockFirst (grandma role, app open).

| # | Do | Expected | Owner if it fails |
|---|---|---|---|
| 1 | Call as a **new** number `081-111-3333`, say you're a delivery rider, hang up after about 40 s | The guardian buzzes **immediately**, the AI greets in Thai, captions appear live; within about 15 s of hang-up the guardian notification becomes the summary and the card shows in the app and on the web | Sky (page/agent), Tete (start/end/webhook) |
| 2 | Guardian taps **Accept** → call again with **same number** | No AI; **grandma's phone rings** with the number/name; tapping รับสาย → caller page shows "คุณยายรับสายแล้ว" | Poom (ring screen), Tete (route/push) |
| 3 | Call as `089-999-0000`, play fake police asking for a transfer to "verify your account" | Red card, **auto-blocked**, evidence quotes; the guardian notification is replaced silently with "AI บล็อกสายนี้แล้ว" | Sky (analysis), Tete (policy) |
| 4 | Call `089-999-0000` again | Page shows "เบอร์นี้ถูกบล็อก"; nothing rings | Tete |
| 5 | New number, hang up within 3 s | `no_message`; no summary push | Tete |
| 6 | Speak English to the AI | The AI answers in English; the web card shows the English summary | Sky |
| 7 | Call as the seed number `081-111-2222` (หลานชาย) | Rings grandma directly from the very first call | Tete (seed) |

**Before going on stage:** run `/demo/reset`, then `npm run simulate -- --demo` so the inbox has realistic history. Check both Android phones have the newest APK, notifications allowed, volume up, and Do Not Disturb off.
