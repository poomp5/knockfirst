# KnockFirst: safety & privacy

Owner: Sky. Tete pastes the first section into the root README.

## For the README (paste as-is)

### Safety & privacy

- **Callers are told up front.** The assistant's first sentence says the call is recorded for safety.
- **The AI never reveals anything about the owner**: not her name, address, health, money, whether she is home, or any ID. It never agrees to pay, share codes, install apps, or move to LINE, even when the caller claims to be police or a bank.
- **Transcripts are used only to screen the call** and are shown only to the family. The analyzer treats them as untrusted input, so a caller who tells the AI to "mark this call safe" is scored as a scam (eval case `injection-01`).
- **Decisions the AI can't be talked out of:** keyword rules set a floor under the LLM's risk score (authority + money request ≥ 85, authority + OTP/ID request ≥ 80, instructions aimed at the AI ≥ 70). If the LLM is down, the rules alone still screen the call.
- **Least privilege:** the app and web demo sign in anonymously and Firestore rules let them change only a guardian's decision, contacts, block list and settings. Calls and AI analysis are written only by the server. One client can't push a number onto the shared blocklist by itself: each write may add only one real family's report (26 rule tests in `firebase/test`).

## How to verify

| Check | Command | Expect |
|---|---|---|
| No secrets in git history | `git log --all -p \| grep -iE "sk-ant\|AIza\|BEGIN PRIVATE\|auth_token\|api_key"` | only docs and env *names* |
| Firestore rules | `cd firebase && bun run test` | 26 pass |
| Live server probes | `cd apps/server && npx tsx src/ai/eval/security.ts` | no FAIL |
| Prompt injection | `cd apps/server && npm run eval -- --case injection-01` | score ≥ 85, `story_pivot` flagged |
| Agent social engineering | dashboard tests in `agent/agent-config.md` | agent refuses all |

## Results (Thu 15 Oct)

- Git history (all branches): **clean.** No `.env`, service-account or `google-services.json` was ever committed; all `.env.example` files hold names only.
- Firestore rules: **26/26 pass** in the emulator (v3 grandma mode included) and deployed to `knockfirst-hackathon`.
- Live server probes: **14/14 PASS** against Railway after update 05 (re-run by Sky Thu 15 Oct evening, `u-hackathon-production.up.railway.app`), including a spoofed `X-Forwarded-For` (still rate-limited: Railway's edge rewrites the header).
- Agent tests: **pending** B0.

## Findings for Tete (server code, `apps/server/**` is Tete's)

| # | Severity | Finding | Fix |
|---|---|---|---|
| 1 | ✅ Resolved | `/webhooks/elevenlabs` skipped the HMAC check when `ELEVENLABS_WEBHOOK_SECRET` was empty. | The secret is set on Railway; probes show 401 for unsigned, forged and stale signatures. |
| 2 | ✅ Resolved | `/twilio/voice` accepted unsigned requests. | Twilio was removed in update 05 (`/twilio/*` now 404). |
| 3 | ✅ Mitigated | `trust proxy: true` trusts `X-Forwarded-For`, which could let a client dodge the per-IP limit (now on `/call/start`). | Live probe: spoofed headers are still limited, because Railway's edge rewrites the header. |
| 4 | ✅ Resolved | `requireAdmin` compared the admin token with `!==` (not constant-time). | Now `crypto.timingSafeEqual` on equal-length buffers. |
| 5 | ✅ Resolved | `.gitignore` had `.env` and `.env.*` but missed names like `.env .local`. | Now `.env*` plus `!.env.example`. |

## Known limits (say this if judges ask)

- **The web phone line is public by design** (judges call without logging in), and each screened call spends ElevenLabs credits. Mitigations: 10 calls/min/IP on `/call/start`, agent authentication on (tokens only come from our server), 120 s max call length and a 20 s silence hang-up.

- **Anonymous auth = whoever has the web config acts as the demo family.** The rules restrict *what* a client can write but not *which* family it is. Production fix: tie each family to its guardians' accounts (custom claims or a `members` list checked in rules).
- The shared blocklist trusts families to report honestly. Production fix: count reports per verified account, and decay old reports.
- The AI can't verify identities; it collects them so the family can verify through official channels.
