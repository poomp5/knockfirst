# Deploy walkthrough: Firestore, Railway, Vercel

| Part | Who |
|---|---|
| 1. Firestore console + seed | **Tete** |
| 1. Firestore security rules | **Sky** |
| 2. Railway (server) | **Poom** sets it up · **Tete** pastes the secret variables |
| 3. Vercel (web demo) | **Poom** |
| 4. Wire-up (CORS, webhook, APK secrets) | Poom · Sky · Tete (see each step) |

Do them in this order: each step needs the URL from the one before.

---

## 1. Firestore (Tete, about 5 min)

console.firebase.google.com → project **knockfirst-hackathon**:

1. **Build → Firestore Database → Create database**: ID `(default)`, location **`asia-southeast1` (Singapore)**, **Start in production mode** → Create. The location can't be changed later.
2. **Build → Authentication → Get started → Sign-in method → Anonymous → Enable → Save.**
3. **Project settings → Cloud Messaging:** "Firebase Cloud Messaging API (V1)" must say **Enabled**.
4. **Project settings → Users and permissions:** add Poom and Sky as **Editor**. Poom needs it in step 4, Sky for the rules.
5. **Seed the demo family** (needs `apps/server/.env`):
   ```bash
   cd apps/server && npm run seed
   ```
   Expect `seeded families/demo-family (new) + 7 whitelist entries`.

**Rules (Sky):**
```bash
cd firebase
npx firebase-tools@latest login
npx firebase-tools@latest deploy --only firestore:rules --project knockfirst-hackathon
```
`--project` is needed because `firebase/.firebaserc` still has the placeholder. The rules still need update 05's parts (`ownerPushTokens`, `ownerResponse`, `conversations`). Until they're deployed, **grandma mode in the app is denied**. The server isn't affected.

---

## 2. Railway: the server (Poom, about 10 min)

1. **railway.com → Login with GitHub.** The repo is yours, so it shows up directly.
2. **New Project → Deploy from GitHub repo → `poomp5/u-hackathon`.** The first build fails; that's expected.
3. Open the service → **Settings**:
   - **Source → Root Directory:** `/apps/server`
   - **Source → Branch:** `main`. Every push to `main` now redeploys.
   - **Build → Custom Build Command:** `npm ci && npm run build`
   - **Deploy → Custom Start Command:** `npm start`
   - **Deploy → Healthcheck Path:** `/health`
   - *(optional)* **Watch Paths:** `/apps/server/**`, so app or web-only pushes don't redeploy the server
4. **Project Settings → Members → invite Tete.**
5. **Tete → Variables → Raw Editor:** paste the server `.env` (Tete keeps the keys; don't send them around). Leave `PUBLIC_BASE_URL` empty for now and **don't add `PORT`** (Railway sets it). Update Variables → Deploy.
6. **Poom → Settings → Networking → Generate Domain.** If it asks for a port, use the one in the deploy log line `KnockFirst server on :XXXX`.
7. **Variables:** set `PUBLIC_BASE_URL=https://YOUR-APP.up.railway.app` (no trailing slash). Railway redeploys.
8. **Test:**
   ```bash
   curl https://YOUR-APP.up.railway.app/health
   # {"ok":true,"contractVersion":3}
   ```
   Tete, with the admin token:
   ```bash
   curl -X POST https://YOUR-APP.up.railway.app/dev/simulate-call \
     -H "x-admin-token: DEMO_ADMIN_TOKEN" -H "content-type: application/json" \
     -d '{"from":"0891112222","transcript":[{"role":"caller","text":"ไรเดอร์ส่งของครับ","t":3}]}'
   ```
   It should return `needs_review` (`source: "llm"` if the Anthropic key works), and a doc appears in `families/demo-family/calls`.
9. **Post the Railway URL in the team chat.**

---

## 3. Vercel: the web demo (Poom, about 5 min)

1. **vercel.com → Continue with GitHub → Add New → Project → Import `poomp5/u-hackathon`.**
2. **Configure:**
   - **Root Directory:** Edit → `apps/web-demo`
   - **Framework Preset:** Vite (auto). Leave Build/Output on defaults; Vercel sees `bun.lock` and builds with bun.
3. **Environment Variables:** paste this whole block into the first key field. The six Firebase values are the web config Tete posted in the team chat (values stay out of git, per A8).
   ```
   VITE_FIREBASE_API_KEY=…
   VITE_FIREBASE_AUTH_DOMAIN=…
   VITE_FIREBASE_PROJECT_ID=…
   VITE_FIREBASE_STORAGE_BUCKET=…
   VITE_FIREBASE_MESSAGING_SENDER_ID=…
   VITE_FIREBASE_APP_ID=…
   VITE_FAMILY_ID=demo-family
   VITE_SERVER_URL=https://YOUR-APP.up.railway.app
   VITE_APK_URL=https://github.com/poomp5/u-hackathon/releases/latest/download/knockfirst.apk
   VITE_REPO_URL=https://github.com/poomp5/u-hackathon
   ```
   `VITE_` values are baked in at build time. After changing one: Deployments → ⋯ → **Redeploy**.
4. **Deploy** → you get `https://YOUR-SITE.vercel.app`. Post it in the team chat.
5. If a later deployment says it was **blocked because the commit author isn't a member**, that's Vercel's free plan with a private repo. Make the repo public (needed for judging anyway), or click Redeploy yourself.

The web demo's **Call** button needs Sky's update 05 (it still uses the old Twilio SDK). Until then the inbox and Accept/Block work, but calls don't.

---

## 4. Wire-up (after both URLs exist)

| Who | Do |
|---|---|
| Poom or Tete | Railway Variables: `CORS_ORIGINS=http://localhost:5173,http://localhost:8081,https://YOUR-SITE.vercel.app` (no trailing slash). Without it the browser blocks the web demo's calls to the server. |
| Poom | Firebase → Authentication → Settings → **Authorized domains** → add `YOUR-SITE.vercel.app` |
| Sky | ElevenLabs agent → post-call webhook `https://YOUR-APP.up.railway.app/webhooks/elevenlabs` → send the webhook secret to Tete in private chat. Turn on agent authentication. |
| Tete | Railway Variables: `ELEVENLABS_WEBHOOK_SECRET=…` |
| Poom | GitHub repo → Settings → Secrets and variables → Actions (owner only): `GOOGLE_SERVICES_JSON_BASE64`, the six `EXPO_PUBLIC_FIREBASE_*` (same values as above), `EXPO_PUBLIC_FAMILY_ID=demo-family`, `EXPO_PUBLIC_SERVER_URL` (Railway), `EXPO_PUBLIC_WEB_DEMO_URL` (Vercel) |
| Tete | Tag the first APK: `git tag v0.1.0 && git push origin v0.1.0` |

**Final check:** open the Vercel URL in an incognito window. The inbox shows the simulated card from step 2.8.
