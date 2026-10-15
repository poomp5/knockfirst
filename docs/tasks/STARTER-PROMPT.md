# STARTER PROMPT (Tete runs this ONCE to set up the project)

## Before you paste
1. Put all 6 files in one folder in your Downloads, e.g. `~/Downloads/U-hackathon prompt/`:
   `00-START-HERE.md`, `01-tete-backend.md`, `02-poom-mobile.md`, `03-sky-ai-web.md`, `CLAUDE.md`, `STARTER-PROMPT.md`
2. Make sure `git` works and you're logged into GitHub. `gh` (the GitHub CLI) makes it fully automatic: `gh auth login`.
3. Open a terminal in the folder where you keep projects (e.g. `~/Projects`) and run `claude`.

## Paste this into Claude Code

```
I'm Tete (GitHub: teterw). Bootstrap our hackathon project "KnockFirst".

1. Find the folder in my Downloads whose name contains "hackathon" (e.g. "U-hackathon prompt") and that contains 00-START-HERE.md. Read 00-START-HERE.md, 01-tete-backend.md and CLAUDE.md from it completely before doing anything else.
2. Create the PUBLIC GitHub repo poomp5/u-hackathon and clone it here.
   - If `gh` is installed and logged in: `gh repo create poomp5/u-hackathon --public --clone`, then add collaborators with
     `gh api -X PUT repos/poomp5/u-hackathon/collaborators/poomp5 -f permission=push` and the same for Skysosmart.
   - If not, tell me exactly what to click on github.com, wait for me, then clone.
3. Copy into the repo:
   - CLAUDE.md → repo root (CLAUDE.md)
   - 00-START-HERE.md, 01-tete-backend.md, 02-poom-mobile.md, 03-sky-ai-web.md, STARTER-PROMPT.md → docs/tasks/
   Copy them byte-for-byte. Don't edit them.
4. Do Part B1 of 01-tete-backend.md (README placeholder, .gitignore exactly as given) and the minimal part of B2 so the server compiles:
   apps/server/package.json with all scripts listed in B2, tsconfig.json, .env.example (names from A8), src/contract.ts (Part A5 verbatim),
   src/ai/index.ts (the stub from B2), src/env.ts, src/firebase.ts, and src/index.ts with only /health for now. Run npm install and npm run typecheck.
   Do NOT create apps/mobile, apps/web-demo, brand or firebase — their owners create those.
5. Create docs/progress/tete.md listing every Part B task ID from 01-tete-backend.md, with B1 marked done.
6. Run the secret check from CLAUDE.md, commit "chore: project skeleton + task files", and push to main.
7. Tell me in 3 lines: the repo URL, what to post in the team chat ("skeleton is up" + clone command), and the next step (B0 accounts checklists).
```

## After it finishes, post this in the team chat

> **Skeleton is up.**
> `git clone https://github.com/poomp5/u-hackathon.git && cd u-hackathon`
> Make your branch (`poom/app` or `sky/ai`), run `claude`, and answer when it asks who you are. It will read your task file from `docs/tasks/` and tell you your first step.
> Everyone: read `docs/tasks/00-START-HERE.md` (5 min).

From then on, **anyone** can open `claude` in the repo. `CLAUDE.md` makes it ask "Who are you?", load the right file, check `docs/progress/<name>.md`, and continue from the next unfinished task.
