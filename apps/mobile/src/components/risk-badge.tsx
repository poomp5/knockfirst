import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { RISK_COLOR, riskLevelFromScore, type RiskLevel } from "@/lib/contract";
import { useLang, type StrKey } from "@/lib/i18n";
import { colors } from "@/theme";
import { AppText } from "./app-text";

export interface RiskBadgeProps {
  score: number;
  size?: "sm" | "md";
}

/** Short label so it fits inside the ring; full RISK_LABEL_TH is in the accessibility label. */
const SHORT_LABEL: Record<RiskLevel, StrKey> = { low: "comp.riskShortLow", medium: "comp.riskShortMedium", high: "comp.riskShortHigh" };
export const RISK_SOFT: Record<RiskLevel, string> = {
  low: colors.successSoft,
  medium: colors.warningSoft,
  high: colors.dangerSoft,
};

export function clampScore(score: number): number {
  if (typeof score !== "number" || !Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/** Activity-ring style badge: progress ring in the risk color, score + level word inside (color + text). */
export function RiskBadge({ score, size = "md" }: RiskBadgeProps) {
  const { t, riskLabel } = useLang();
  const s = clampScore(score);
  const level = riskLevelFromScore(s);
  const color = RISK_COLOR[level];
  const dim = size === "sm" ? 44 : 52;
  const stroke = 4;
  const r = (dim - stroke) / 2;
  const len = 2 * Math.PI * r;
  return (
    <View
      accessible
      accessibilityLabel={t("comp.riskBadgeA11y", { score: s, label: riskLabel[level] })}
      style={{ width: dim, height: dim }}
    >
      <Svg width={dim} height={dim} style={StyleSheet.absoluteFill}>
        <Circle cx={dim / 2} cy={dim / 2} r={r} stroke={RISK_SOFT[level]} strokeWidth={stroke} fill="none" />
        {s > 0 && (
          <Circle
            cx={dim / 2}
            cy={dim / 2}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${len} ${len}`}
            strokeDashoffset={len * (1 - s / 100)}
            transform={`rotate(-90 ${dim / 2} ${dim / 2})`}
          />
        )}
      </Svg>
      <View style={styles.center}>
        <AppText variant="body" weight="bold" color={color} style={size === "sm" ? styles.scoreSm : styles.score}>
          {s}
        </AppText>
        <AppText variant="caption" weight="semibold" color={color} style={styles.label}>
          {t(SHORT_LABEL[level])}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  score: { fontSize: 17, lineHeight: 20, marginTop: 2 },
  scoreSm: { fontSize: 15, lineHeight: 17 },
  label: { fontSize: 10, lineHeight: 15 },
});
