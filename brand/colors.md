# KnockFirst brand kit.

**Name:** KnockFirst
**Tagline (EN):** "Strangers knock first. Family opens the door."
**Tagline (TH):** "คนแปลกหน้าต้องเคาะประตูก่อน ลูกหลานเป็นคนเปิด"
**Alt taglines for the deck:** "Unknown calls knock first. Family decides." · "Strangers knock. Family answers."

The mark is a "K": a solid bar (the door) plus a ringing handset (the caller knocking).

## Colors

| Role | Hex | Use |
|---|---|---|
| Primary / brand orange | `#F2611C` | logo handset, "First" in wordmark, primary buttons, links, notification accent |
| Ink | `#111111` | logo bar (light mode), headings, body text |
| White | `#FFFFFF` | backgrounds, logo bar + waves (dark mode) |
| Neutral 700 | `#4A4A4A` | secondary text |
| Neutral 300 | `#D9D9D9` | dividers, borders |
| Neutral 100 | `#F5F5F5` | cards, screen background |
| Dark background | `#1A1A1A` | dark-mode surfaces |

### Risk colors (contract A5 `RISK_COLOR`, never change)

| Level | Hex |
|---|---|
| low | `#1E8E5A` |
| medium | `#D98E04` |
| high | `#D93025` |

Brand orange sits between amber and red, so **risk chips must always show a text label** (ต่ำ / กลาง / สูง) and never sit on an orange background. Don't use orange alone to mean "risk".

## Fonts

- **Wordmark / Latin display:** Poppins Bold (Google Fonts, OFL)
- **App UI (Thai + Latin):** Noto Sans Thai (`@expo-google-fonts/noto-sans-thai`)

## Files

| File | What |
|---|---|
| `logo.svg` / `logo-dark.svg` | vector mark (traced from `source/`), light / dark background |
| `logo.png` / `logo-dark.png` | 1024×1024 transparent mark |
| `logo-mark.png` | 512×512 mark (favicon source) |
| `logo-wordmark.png` / `logo-wordmark-dark.png` | mark + "KnockFirst" |
| `og-image.png` | 1200×630 link preview |
| `mobile/icon.png` | 1024×1024 opaque app icon |
| `mobile/adaptive-icon.png` | 1024×1024 transparent, mark in center 66% |
| `mobile/splash-icon.png` | 1024×1024 transparent mark |
| `mobile/notification-icon.png` | 96×96 white silhouette |
| `source/` | original logo PNGs from the designer |

`mobile/*` gets copied into `apps/mobile/assets/` once the Expo app exists (B1).
