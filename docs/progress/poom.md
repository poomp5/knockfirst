# Poom: progress (Part B of docs/tasks/02-poom-mobile.md)

✅ done · 🟡 in progress / partial · ❌ not started

| ID | Task | Status | Notes |
|---|---|---|---|
| B0 | Brand kit | ✅ | Renamed to **KnockFirst**. Logo SVG, icons, wordmark, OG image, `brand/colors.md`, illustrations (`brand/illustrations/`: empty-inbox, shield). |
| B1 | Expo app | ✅ | Expo **SDK 57**, routes in `src/app/`. `app.json` per spec, package `com.knockfirst.guardian`. `.env` has `USE_MOCKS=true` locally until Firebase config arrives. |
| B2 | Firebase client | ✅ | JS SDK v13, no Metro tweak needed. Falls back to mock mode if env vars are empty (no crash). Not yet tested against real Firebase. |
| B3 | Hooks, actions, mocks | ✅ | A6 recipes via writeBatch. Mock store with 10 calls (all statuses) + "จำลองสายเข้า" button that walks screening → analyzing → result. |
| B4 | Screens (inbox, call detail, whitelist, blocked, settings) | ✅ | All screens done, checked visually on web in mock mode. High-risk calls put Block as the main action. |
| B5 | Push notifications | 🟡 | Code done incl. contract v2 channels + notifyOnIncoming toggle; (channels, token → pushTokens, tap → call detail, test notification). Needs APK + google-services.json to test. |
| B6 | Run on real Android phone | ❌ | Needs `google-services.json` + Firebase config from Tete |
| B7 | First APK via CI | ❌ | Target Thu 22:00 |
| B8 | Quality pass | 🟡 | tsc + expo lint clean, Android bundle exports. Needs on-device pass. |
| B9 | Stretch | ❌ | After M2 |

## Waiting on others
- **Tete:** Firebase Android app must be registered with `com.knockfirst.guardian`; send `google-services.json` + web config values.
- **Sky:** use `brand/` assets and the KnockFirst name in the web demo.
