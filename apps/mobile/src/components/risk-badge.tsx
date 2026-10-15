import { StyleSheet, View } from "react-native";
import { RISK_COLOR, RISK_LABEL_TH, riskLevelFromScore, type RiskLevel } from "@/lib/contract";
import { colors, radii } from "@/theme";
import { AppText } from "./app-text";

export interface RiskBadgeProps {
  score: number;
  size?: "sm" | "md";
}

/** Short label so it fits inside the square; full RISK_LABEL_TH is in the accessibility label. */
const SHORT_LABEL: Record<RiskLevel, string> = { low: "ต่ำ", medium: "กลาง", high: "สูง" };
export const RISK_SOFT: Record<RiskLevel, string> = {
  low: colors.successSoft,
  medium: colors.warningSoft,
  high: colors.dangerSoft,
};

export function clampScore(score: number): number {
  if (typeof score !== "number" || !Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/** Colored rounded square: score + level word (color + text, never color alone). */
export function RiskBadge({ score, size = "md" }: RiskBadgeProps) {
  const s = clampScore(score);
  const level = riskLevelFromScore(s);
  const color = RISK_COLOR[level];
  const dim = size === "sm" ? 44 : 56;
  return (
    <View
      accessible
      accessibilityLabel={`คะแนนความเสี่ยง ${s} ${RISK_LABEL_TH[level]}`}
      style={[styles.box, { width: dim, height: dim, backgroundColor: RISK_SOFT[level], borderColor: color }]}
    >
      <AppText variant={size === "sm" ? "body" : "large"} weight="bold" color={color} style={styles.score}>
        {s}
      </AppText>
      <AppText variant="caption" weight="semibold" color={color} style={size === "sm" ? styles.labelSm : undefined}>
        {SHORT_LABEL[level]}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radii.md,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  score: { marginBottom: -2 },
  labelSm: { fontSize: 11, lineHeight: 15 },
});
