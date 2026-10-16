import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { RISK_COLOR, riskLevelFromScore } from "@/lib/contract";
import { useLang } from "@/lib/i18n";
import { colors, radii, spacing } from "@/theme";
import { AppText } from "./app-text";
import { clampScore, RISK_SOFT } from "./risk-badge";

const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface RiskMeterProps {
  score: number;
  /** Optional extra (not in spec): gauge width in px. Default 232. */
  width?: number;
}

const STROKE = 16;

/** Point on the semicircle for a value 0–100 (0 = left, 100 = right). */
function pointAt(v: number, cx: number, cy: number, r: number) {
  const a = Math.PI * (1 - v / 100);
  return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) };
}

function arc(from: number, to: number, cx: number, cy: number, r: number) {
  const p0 = pointAt(from, cx, cy, r);
  const p1 = pointAt(to, cx, cy, r);
  return `M ${p0.x} ${p0.y} A ${r} ${r} 0 0 1 ${p1.x} ${p1.y}`;
}

/** Semicircle gauge (Apple Watch style): grey track, rounded colored arc, big score + Thai level capsule. */
export function RiskMeter({ score, width = 232 }: RiskMeterProps) {
  const s = clampScore(score);
  const level = riskLevelFromScore(s);
  const color = RISK_COLOR[level];
  const reduceMotion = useReducedMotion();
  const { t, riskLabel } = useLang();

  const r = (width - STROKE) / 2;
  const cx = width / 2;
  const cy = r + STROKE / 2;
  const height = cy + STROKE / 2;
  const len = Math.PI * r;

  const progress = useSharedValue(reduceMotion ? s : 0);
  useEffect(() => {
    progress.value = reduceMotion ? s : withTiming(s, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [s, reduceMotion, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: len * (1 - progress.value / 100),
  }));

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t("comp.riskMeterA11y", { score: s, label: riskLabel[level] })}
    >
      <View style={{ width, height }}>
        <Svg width={width} height={height}>
          <Path d={arc(0, 100, cx, cy, r)} stroke={colors.fill} strokeWidth={STROKE} strokeLinecap="round" fill="none" />
          {s > 0 && (
            <AnimatedPath
              d={arc(0, 100, cx, cy, r)}
              stroke={color}
              strokeWidth={STROKE}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${len} ${len}`}
              animatedProps={animatedProps}
            />
          )}
        </Svg>
        <View style={styles.center} pointerEvents="none">
          <AppText variant="display" weight="bold" color={colors.ink} style={styles.score}>
            {s}
          </AppText>
          <AppText variant="caption" weight="medium" color={colors.textSubtle}>
            {t("comp.riskScore")}
          </AppText>
        </View>
      </View>
      <View style={[styles.label, { backgroundColor: RISK_SOFT[level] }]}>
        <View style={[styles.labelDot, { backgroundColor: color }]} />
        <AppText variant="small" weight="semibold" color={color}>
          {riskLabel[level]}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center" },
  center: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
  },
  score: { fontSize: 60, lineHeight: 68, letterSpacing: -1.5 },
  label: {
    marginTop: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  labelDot: { width: 8, height: 8, borderRadius: 4 },
});
