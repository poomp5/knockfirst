# KnockFirst

> ## ⚠️ IMPORTANT NOTICE: project renamed LukLan → **KnockFirst** (Thu 15 Oct, Poom)
> **เปลี่ยนชื่อโปรเจกต์จาก LukLan เป็น KnockFirst แล้ว ห้ามใช้ชื่อเก่าในโค้ด UI เอกสาร หรือ pitch**
>
> - The project and app are now called **KnockFirst**. Don't use "LukLan" anywhere in code, UI, docs or the deck.
> - **Contract (Part A) changed:** `ANDROID_PACKAGE = "com.knockfirst.guardian"`, `APK_ASSET_NAME = "knockfirst-guardian.apk"`. Register the Firebase Android app with the **new** package (Tete).
> - Other renames: server package `knockfirst-server`, Railway example `knockfirst-server.up.railway.app`, Firebase project id e.g. `knockfirst-hackathon`, Expo slug/scheme `knockfirst`, ElevenLabs agent "KnockFirst Screener". Repo links now point at the real repo `github.com/poomp5/u-hackathon`.
> - Logo, app icons, OG image, colors (brand orange `#F2611C`, ink `#111111`): see `brand/` and `brand/colors.md`.
> - Have local work that still says LukLan? `git pull --rebase origin main`, then `grep -rni luklan .` and rename what's left.

AI call screener for elderly parents: trusted numbers ring grandma as normal, unknown callers talk to a polite Thai AI assistant first, and the family approves or blocks them from the KnockFirst Android app.

> 🚧 U-Hackathon 2026 (AI track), work in progress. The full README for judges lands Fri 16 Oct.

## Team: start here

1. Read [`docs/tasks/00-START-HERE.md`](docs/tasks/00-START-HERE.md) (5 min).
2. Clone, make your branch, run Claude Code:
   ```bash
   git clone https://github.com/poomp5/u-hackathon.git
   cd u-hackathon
   git checkout -b <yourname>/<topic>   # tete/server · poom/app · sky/ai
   claude
   ```
3. Answer when Claude asks who you are. It loads your task file from `docs/tasks/` and tells you your next step.

| Person | GitHub | Task file |
|---|---|---|
| Tete | [@teterw](https://github.com/teterw) | [`docs/tasks/01-tete-backend.md`](docs/tasks/01-tete-backend.md) |
| Poom | [@poomp5](https://github.com/poomp5) | [`docs/tasks/02-poom-mobile.md`](docs/tasks/02-poom-mobile.md) |
| Sky | [@Skysosmart](https://github.com/Skysosmart) | [`docs/tasks/03-sky-ai-web.md`](docs/tasks/03-sky-ai-web.md) |
