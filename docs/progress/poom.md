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

## Update 05 (no Twilio): grandma mode
| ID | Task | Status | Notes |
|---|---|---|---|
| U5.1 | Device role (guardian / grandma) + first-launch chooser | ✅ | AsyncStorage; token goes to `pushTokens` or `ownerPushTokens` by role |
| U5.2 | Grandma home | ✅ | Big text, Thai date, mode switch; mock "จำลองคนรู้จักโทรมา" |
| U5.3 | Ring screen `ring/[callId]` | ✅ | Opens from `owner_ring` push or auto-listener; synthesized `assets/ring.mp3` + vibration; writes `ownerResponse` |
| U5.4 | Channel `grandma-ring` | ✅ | MAX, long vibration, bypass DND |
| U5.5 | Guardian inbox labels for forwarded calls | ✅ | ต่อสายถึงคุณยายแล้ว / คุณยายรับสาย / ไม่รับสาย |
| U5.6 | Contract v3 + version 0.2.0 (versionCode 2) | ✅ | Needs Tete to tag `v0.2.0` |

## UI redesign (iOS / Apple HIG style)
| ID | Task | Status | Notes |
|---|---|---|---|
| R1 | Apple-style redesign, no emoji in the UI | ✅ | iOS grouped lists (`components/list.tsx`: ListSection/ListRow/IconTile/LargeTitle), large titles on tabs, ring risk badge, rounded gauge, iMessage transcript, Settings-style settings, bottom-sheet add form, lock-screen clock on grandma home, iOS incoming-call ring screen. Removed 📞 and ✓. Checked on web (mock mode); needs an on-device pass. Server push titles still contain 📞/⚠️ (Tete's `services/push.ts`). |

## Thai / English
| ID | Task | Status | Notes |
|---|---|---|---|
| L1 | i18n (`src/lib/i18n.ts`, `useLang`, AsyncStorage, default Thai) + ภาษา / Language switch in Settings | ✅ | All UI strings in `src/app/**` + `src/components/**` go through `t()`; Thai wording unchanged. Contract labels via `statusLabel/redFlagLabel/riskLabel`; English mode shows `summaryEn`/`reasonEn` when present. Checked on web (mock) in both languages: inbox, call detail, settings, grandma, ring. Version 0.3.0 (versionCode 3) → needs Tete to tag `v0.3.0`. |
