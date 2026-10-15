// KnockFirst theme: iOS-style (Human Interface Guidelines) grouped UI, KnockFirst orange as the tint.
// Neutrals follow iOS system colors; risk is always shown as color + text label (contract RISK_COLOR).

export const colors = {
  // tint
  brand: "#F2611C",
  brandPressed: "#D9500F",
  brandSoft: "rgba(242,97,28,0.12)",
  // labels (iOS label / secondaryLabel / tertiaryLabel, flattened for Android)
  ink: "#000000",
  text: "#000000",
  textMuted: "#6C6C70",
  textSubtle: "#8E8E93",
  textFaint: "#C7C7CC",
  // surfaces
  bg: "#F2F2F7", // systemGroupedBackground
  card: "#FFFFFF", // secondarySystemGroupedBackground
  fill: "#E9E9EB", // tertiarySystemFill-ish (bubbles, chips)
  fillPressed: "#E5E5EA",
  bar: "#F9F9F9", // tab / toolbar material (opaque: RN has no blur here, and tinted buttons sit on it)
  separator: "#C6C6C8",
  border: "#E5E5EA",
  divider: "#C6C6C8",
  white: "#FFFFFF",
  // system accents
  blue: "#007AFF",
  indigo: "#5856D6",
  gray: "#8E8E93",
  // risk / feedback (same hexes as contract RISK_COLOR)
  success: "#1E8E5A",
  successSoft: "rgba(30,142,90,0.12)",
  warning: "#D98E04",
  warningSoft: "rgba(217,142,4,0.14)",
  danger: "#D93025",
  dangerSoft: "rgba(217,48,37,0.10)",
  // iOS switch on-color
  switchOn: "#34C759",
  // transcript bubbles (iMessage-like: AI is "our side")
  bubbleAssistant: "#D9500F", // brandPressed: white text stays readable (~4.1:1, like iMessage blue)
  bubbleCaller: "#E9E9EB",
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 32 } as const;

export const radii = { sm: 8, md: 10, lg: 12, xl: 16, xxl: 22, pill: 999 } as const;

/** Font family names registered in src/app/_layout.tsx via useFonts. */
export const fonts = {
  regular: "NotoSansThai_400Regular",
  medium: "NotoSansThai_500Medium",
  semibold: "NotoSansThai_600SemiBold",
  bold: "NotoSansThai_700Bold",
} as const;

/** iOS text styles: caption2/footnote, subheadline, body, headline, title2, largeTitle, display. */
export const fontSize = { caption: 12, small: 15, body: 17, large: 17, title: 22, h1: 34, display: 44 } as const;

/** Minimum tap target (B8 accessibility). */
export const TAP = 48;

/** Inset grouped row/card surface: no border, rounded like iOS 17 grouped lists. */
export const cardStyle = {
  backgroundColor: colors.card,
  borderRadius: radii.lg,
} as const;

/** Left inset for row separators when a row has a 30pt icon tile (16 + 30 + 12). */
export const SEPARATOR_INSET = 58;
