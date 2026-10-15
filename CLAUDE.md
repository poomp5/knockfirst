# LukLan (ลูกหลาน): instructions for Claude Code (read automatically in every session)

This repo is a 3-developer hackathon project (U-Hackathon, AI track). Several people run Claude Code on it at the same time. Each person owns different folders. **Following ownership is what keeps us from breaking each other's work.**

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
3. Work out where this person is:
   - Run `git pull --rebase origin main`.
   - Read `docs/progress/<name>.md` (create it from the Part B task list if it's missing).
   - Look at `git log --oneline -20`.
4. Reply in **3 short lines**: their role, the paths they own, and the **next unfinished task ID** with its first concrete step. Then ask "Start?", unless they already told you what to do.

## Rules for the whole session

- **Only create, edit, move or delete files inside that person's owned paths.** If something outside them needs to change, stop and write a short request message the person can send to the owner (e.g. *"Tete: please add CORS origin https://… to Railway"*).
- **Part A (shared contract) is identical in every task file.** Code must match it: Firestore paths, field names, `toCallerKey`, env var names, endpoint shapes. If code and contract disagree, follow the contract and tell the human. Only Tete changes the contract.
- **Secrets never go in git:** `.env*` (except `.env.example`), `google-services.json`, service-account JSON. Before every push, run `git diff --cached | grep -iE "key|secret|token|BEGIN PRIVATE"` and look at the results.
- Branch per person (`tete/*`, `poom/*`, `sky/*`). Commit small with the prefix from Part A2. Merge to `main` at least every 2 hours.
- After each task: update `docs/progress/<name>.md`, commit, and give a 3-line status (done / next / blocked).
- When an SDK or API in the task file doesn't match the current docs, trust the docs, adapt, and leave a one-line comment.
- If scope is unclear, choose whatever makes the **demo loop (Part A10)** work soonest. A polished small feature set beats an ambitious broken one.
- Times are Bangkok (UTC+7). **Code freeze Fri 16 Oct 12:30. Submit by 13:30.**
