# Sky progress (AI + safety + web demo)

Legend: ✅ done · 🟡 in progress · ❌ not started

| ID | Task | Status | Note |
|---|---|---|---|
| B0 | ElevenLabs agent (Thai + English), send key/agent ID/webhook secret to Tete, `agent/agent-config.md` | 🟡 | agent-config.md drafted (prompt, first message, data collection, test table); Sky fills voice/model/latency + test results |
| B1 | Analysis engine `apps/server/src/ai/` (llm, prompt, schema, rules, index) | 🟡 | code done, typechecks; rules + normalize smoke-tested. Live LLM test pending `LLM_API_KEY` in .env |
| B2 | Eval set (24 cases: 13 scam incl. 1 EN, 11 legit incl. 1 EN) + `eval/run.ts` + `eval/results.md` | 🟡 | rules-only baseline in results-rules.md: 10/13 scams, 0/11 false alarms, auto-block precision 7/7. LLM run pending `LLM_API_KEY` |
| B3 | `eval/simulate.ts` (`--case`, `--all`, `--demo`) | 🟡 | done + tested against a local mock; live run needs SERVER_URL + DEMO_ADMIN_TOKEN from Tete |
| B4 | Firestore rules in `firebase/` + emulator tests | 🟡 | rules + 21 passing emulator tests (`cd firebase && bun run test`); v2 `notifyOnIncoming` included. Deploy pending: project id in .firebaserc + Poom's anon auth |
| B5 | Web demo `apps/web-demo` on Vercel | 🟡 | built: browser call, live inbox + drawer with Accept/Block (A6 recipes), how it works, results, QR, team, TH/EN; checked in preview mode at desktop + 390px, no console errors. Pending: Firebase web config + server URL, live call test, Vercel deploy |
| B6 | Security checklist + README "Safety & privacy" text for Tete | 🟡 | history scan clean; SAFETY.md (README text + 5 findings for Tete); live probe script `src/ai/eval/security.ts` (needs server URL); agent tests listed in agent-config.md (needs B0) |
| U04 | Update 04: rename, rules field, web badges | 🟡 | eval renamed to KnockFirst; rules allow notifyOnIncoming; web badges done (incomingNotified tag, 'guardian alerted now' note, no Accept/Block while screening/analyzing); agent rename with B0 |
| B7 | Stretch goals | ❌ | only after M2 |
| U05 | Update 05: no Twilio (done by Tete covering for Sky, Thu evening) | ✅ | see rows below |
| U05-1 | Agent: authentication on, 4 dynamic variables, post-call webhook | ✅ | applied via API; prompt/first message now use `{{owner_label}}`; max call 120 s, silence hang-up 20 s; workspace webhook "KnockFirst server" (HMAC). **TODO:** add English as an additional language in the dashboard |
| U05-2 | Web demo caller page = phone line | ✅ | `@twilio/voice-sdk` → `@elevenlabs/client` (WebRTC). "Call as" number (random Thai mobile, new/same number), optional name, persona chips, live captions, timer; blocked → busy tone; whitelisted → ringback + live `ownerResponse`, 30 s timeout; `/call/end` with the conversation id. Contract v3. Needs a real browser test with a mic |
| U05-3 | Firestore rules v3 | ✅ | `ownerPushTokens`, `ownerResponse` (forwarded calls only), `conversations/` server-only; 26/26 emulator tests; deployed |
| U05-4 | Eval/simulate unchanged; security probes updated | ✅ | `security.ts` now probes `/call/start` + `/call/end`; 14/14 PASS against Railway |
