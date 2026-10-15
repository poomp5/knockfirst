# KnockFirst: instructions for Claude Code (read automatically in every session)

KnockFirst is a 3-developer hackathon project (U-Hackathon, AI track): an AI call screener for elderly parents.
Strangers have to "knock first": unknown callers talk to an AI assistant, and the family decides who gets through.
Several people run Claude Code on this repo at the same time, and each owns different folders.
**Following ownership is what keeps us from breaking each other's work.**

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
3. **Then read every update file `docs/tasks/04-*.md`, `05-*.md`, … in number order.** Updates override older task files where they disagree (e.g. the name is **KnockFirst**, contract version **2**). Do that person's section of each update once their main milestone allows it.
4. Work out where this person is:
   - Run `git pull --rebase origin main`.
   - Read `docs/progress/<name>.md` (create it from the Part B task list if it's missing).
   - Look at `git log --oneline -20`.
5. Reply in **3 short lines**: their role, the paths they own, and the **next unfinished task ID** (main file or update) with its first concrete step. Then ask "Start?", unless they already told you what to do.

## Rules for the whole session

- **Only create, edit, move or delete files inside that person's owned paths.** If something outside them needs to change, stop and write a short request message the person can send to the owner (e.g. *"Tete: please add CORS origin https://… to Railway"*).
- **Part A (shared contract) plus the contract changes in update files** define the data model, endpoints and env names. Code must match them. If code and contract disagree, follow the contract and tell the human. Only Tete changes the contract.
- **Secrets never go in git:** `.env*` (except `.env.example`), `google-services.json`, service-account JSON. Before every push, run `git diff --cached | grep -iE "key|secret|token|BEGIN PRIVATE"` and look at the results.
- Branch per person (`tete/*`, `poom/*`, `sky/*`). Commit small with the prefix from Part A2. Merge to `main` at least every 2 hours.
- After each task: update `docs/progress/<name>.md`, commit, and give a 3-line status (done / next / blocked).
- When an SDK or API in a task file doesn't match the current docs, trust the docs, adapt, and leave a one-line comment.
- If scope is unclear, choose whatever makes the **demo loop (Part A10)** work soonest. A polished small feature set beats an ambitious broken one.
- Times are Bangkok (UTC+7). **Code freeze Fri 16 Oct 12:30. Submit by 13:30.**
