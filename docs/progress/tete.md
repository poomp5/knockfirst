# Tete: progress (Part B of docs/tasks/01-tete-backend.md)

✅ done · 🟡 in progress / partial · ❌ not started

| ID | Task | Status | Notes |
|---|---|---|---|
| B0.1 | GitHub repo + collaborators | ✅ | Using `poomp5/u-hackathon` (the planned separate repo was never created); teterw, poomp5, Skysosmart, mil3rd already have access. Repo is **private**: must go public before submission. Actions secrets still to add (B9). |
| B0.2 | Firebase project, Firestore, Anonymous Auth, Android + Web apps, service account | ❌ | |
| B0.3 | Twilio upgrade, US number, Geo permissions, API key, TwiML App | ❌ | |
| B0.4 | ElevenLabs API key + agent id from Sky | ❌ | |
| B0.5 | LLM key | ❌ | |
| B0.6 | Railway project (root `apps/server`) | ❌ | |
| B0.7 | `DEMO_ADMIN_TOKEN` | ❌ | |
| B1 | Repo skeleton (README placeholder, CLAUDE.md, .gitignore, docs/tasks) | ✅ | Task files copied byte-for-byte. |
| B2 | Server scaffold | ✅ | All files from the B2 layout. Adapted: TS 7 removed `moduleResolution: node`; firebase-admin v14 → modular API. |
| B3 | `src/index.ts` router mounting | ✅ | elevenlabs (raw) → urlencoded + twilio → json + voiceToken/dev → /health. |
| B4 | Services (families, calls, policy, push, pipeline) | ✅ | Pipeline also creates the inbox fields if the webhook arrives without a call doc. |
| B5 | Twilio routing | ✅ | Emulator-tested: whitelist → `<Dial>` owner, blocked → `<Reject>`, unknown → screening. Real call + caller-ID check happen in B10. |
| B6 | ElevenLabs post-call webhook + signature | ✅ | Emulator-tested with signed payload (bad sig → 401). After the first real call, compare `debug/elevenlabs_last` with the mapping. |
| B7 | Browser-call token `/voice/token` | ✅ | Returns 503 until the 4 Twilio values are set. |
| B8 | Dev/demo endpoints, seed, reset | ✅ | Emulator-tested: simulate (needs_review / no_message / auto_blocked), /demo/reset, `npm run seed`, `npm run reset`. |
| B9 | APK release workflow | 🟡 | Workflow committed. Needs Actions secrets (B0.1) and Poom's `apps/mobile` + `package-lock.json` before the first `v0.1.0` tag. |
| B10 | Deploy + end-to-end test matrix | ❌ | |
| B11 | README for judges | ❌ | |
| B12 | Extras (U-Bot, signature validation, /stats) | ❌ | Only after M2. |
