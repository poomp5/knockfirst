# Sky progress (AI + safety + web demo)

Legend: ✅ done · 🟡 in progress · ❌ not started

| ID | Task | Status | Note |
|---|---|---|---|
| B0 | ElevenLabs agent (Thai + English), send key/agent ID/webhook secret to Tete, `agent/agent-config.md` | ❌ | |
| B1 | Analysis engine `apps/server/src/ai/` (llm, prompt, schema, rules, index) | 🟡 | code done, typechecks; rules + normalize smoke-tested. Live LLM test pending `LLM_API_KEY` in .env |
| B2 | Eval set (24 cases: 13 scam incl. 1 EN, 11 legit incl. 1 EN) + `eval/run.ts` + `eval/results.md` | 🟡 | rules-only baseline in results-rules.md: 10/13 scams, 0/11 false alarms, auto-block precision 7/7. LLM run pending `LLM_API_KEY` |
| B3 | `eval/simulate.ts` (`--case`, `--all`, `--demo`) | ❌ | |
| B4 | Firestore rules in `firebase/`, deployed + tested | ❌ | deploy after Poom's anon auth works |
| B5 | Web demo `apps/web-demo` on Vercel | ❌ | |
| B6 | Security checklist + README "Safety & privacy" text for Tete | ❌ | Fri 09:00–10:00 |
| B7 | Stretch goals | ❌ | only after M2 |
