// KnockFirst theme — values from brand/colors.md.
// Brand orange is close to the risk colors, so risk is always shown as color + text label.

export const colors = {
  brand: "#F2611C",
  brandPressed: "#D9500F",
  brandSoft: "#FDEDE4",
  ink: "#111111",
  text: "#111111",
  textMuted: "#4A4A4A",
  textSubtle: "#7A7A7A",
  border: "#E6E4E1",
  divider: "#D9D9D9",
  bg: "#F7F6F4",
  card: "#FFFFFF",
  white: "#FFFFFF",
  // risk / feedback (same hexes as contract RISK_COLOR)
  success: "#1E8E5A",
  successSoft: "#E3F3EB",
  warning: "#D98E04",
  warningSoft: "#FBF0D9",
  danger: "#D93025",
  dangerSoft: "#FBE4E2",
  // transcript bubbles
  bubbleAssistant: "#EFEDEA",
  bubbleCaller: "#FDEDE4",
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radii = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

/** Font family names registered in src/app/_layout.tsx via useFonts. */
export const fonts = {
  regular: "NotoSansThai_400Regular",
  medium: "NotoSansThai_500Medium",
  semibold: "NotoSansThai_600SemiBold",
  bold: "NotoSansThai_700Bold",
} as const;

export const fontSize = { caption: 12, small: 14, body: 16, large: 18, title: 22, h1: 28, display: 44 } as const;

/** Minimum tap target (B8 accessibility). */
export const TAP = 48;

export const cardStyle = {
  backgroundColor: colors.card,
  borderRadius: radii.lg,
  borderWidth: 1,
  borderColor: colors.border,
} as const;
