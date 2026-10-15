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
| B2 | Server scaffold | 🟡 | Done: package.json (all scripts), tsconfig, .env.example, env.ts, contract.ts, firebase.ts, ai/index.ts stub. Typecheck passes. Left: routes/*, services/*, scripts/*. Adapted: TS 7 removed `moduleResolution: node`; firebase-admin v14 → modular API. |
| B3 | `src/index.ts` router mounting | 🟡 | Only `/health` so far. |
| B4 | Services (families, calls, policy, push, pipeline) | ❌ | |
| B5 | Twilio routing | ❌ | |
| B6 | ElevenLabs post-call webhook + signature | ❌ | |
| B7 | Browser-call token `/voice/token` | ❌ | |
| B8 | Dev/demo endpoints, seed, reset | ❌ | |
| B9 | APK release workflow | ❌ | |
| B10 | Deploy + end-to-end test matrix | ❌ | |
| B11 | README for judges | ❌ | |
| B12 | Extras (U-Bot, signature validation, /stats) | ❌ | Only after M2. |
