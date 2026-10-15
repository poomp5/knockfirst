# KnockFirst: safety & privacy

Owner: Sky. Tete pastes the first section into the root README.

## For the README (paste as-is)

### Safety & privacy

- **Callers are told up front.** The assistant's first sentence says the call is recorded for safety.
- **The AI never reveals anything about the owner**: not her name, address, health, money, whether she is home, or any ID. It never agrees to pay, share codes, install apps, or move to LINE, even when the caller claims to be police or a bank.
- **Transcripts are used only to screen the call** and are shown only to the family. The analyzer treats them as untrusted input, so a caller who tells the AI to "mark this call safe" is scored as a scam (eval case `injection-01`).
- **Decisions the AI can't be talked out of:** keyword rules set a floor under the LLM's risk score (authority + money request ≥ 85, authority + OTP/ID request ≥ 80, instructions aimed at the AI ≥ 70). If the LLM is down, the rules alone still screen the call.
- **Least privilege:** the app and web demo sign in anonymously and Firestore rules let them change only a guardian's decision, contacts, block list and settings. Calls and AI analysis are written only by the server. One client can't push a number onto the shared blocklist by itself: each write may add only one real family's report (21 rule tests in `firebase/test`).

## How to verify

| Check | Command | Expect |
|---|---|---|
| No secrets in git history | `git log --all -p \| grep -iE "sk-ant\|AIza\|BEGIN PRIVATE\|auth_token\|api_key"` | only docs and env *names* |
| Firestore rules | `cd firebase && bun run test` | 21 pass |
| Live server probes | `cd apps/server && npx tsx src/ai/eval/security.ts` | no FAIL |
| Prompt injection | `cd apps/server && npm run eval -- --case injection-01` | score ≥ 85, `story_pivot` flagged |
| Agent social engineering | dashboard tests in `agent/agent-config.md` | agent refuses all |

## Results (Thu 15 Oct)

- Git history (all branches): **clean.** No `.env`, service-account or `google-services.json` was ever committed; all `.env.example` files hold names only.
- Firestore rules: **21/21 pass** in the emulator. Not deployed yet (needs project id + Editor access).
- Live server probes: **pending** server URL. The script was checked against a local mock.
- Agent tests: **pending** B0.

## Findings for Tete (server code, `apps/server/**` is Tete's)

| # | Severity | Finding | Fix |
|---|---|---|---|
| 1 | High (if the secret is unset) | `/webhooks/elevenlabs` skips the HMAC check when `ELEVENLABS_WEBHOOK_SECRET` is empty. Anyone could then post fake transcripts, and because `family_id` comes from the payload, a forged "scam" could auto-block any number and add reports for made-up families until it is blocked for everyone. | Set the secret on Railway (the `security.ts` probe confirms). Optionally fail closed when `NODE_ENV=production` and the secret is empty, and ignore a `family_id` that has no family doc. |
| 2 | Medium | `VALIDATE_TWILIO_SIGNATURE=false` by default: anyone can POST `/twilio/voice` and create screened calls, each pushing "calling now" to the guardian. | Set `VALIDATE_TWILIO_SIGNATURE=true` on Railway once `PUBLIC_BASE_URL` is final. |
| 3 | Low | `app.set("trust proxy", true)` trusts any `X-Forwarded-For`, so the `/voice/token` limit (10/min/IP) can be bypassed by spoofing the header. | `app.set("trust proxy", 1)` (Railway is one proxy hop). |
| 4 | Low | `requireAdmin` compares the admin token with `!==` (not constant-time). Risk is small with a ≥16-char random token. | `crypto.timingSafeEqual` on equal-length buffers. |
| 5 | Low | `.gitignore` has `.env` and `.env.*` but not names like `.env .local` (one such file exists locally right now). | Use `.env*` plus `!.env.example`. |

## Known limits (say this if judges ask)

- **Anonymous auth = whoever has the web config acts as the demo family.** The rules restrict *what* a client can write but not *which* family it is. Production fix: tie each family to its guardians' accounts (custom claims or a `members` list checked in rules).
- The shared blocklist trusts families to report honestly. Production fix: count reports per verified account, and decay old reports.
- The AI can't verify identities; it collects them so the family can verify through official channels.
