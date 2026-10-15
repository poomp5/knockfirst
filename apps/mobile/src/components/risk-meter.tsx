import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { RISK_COLOR, RISK_LABEL_TH, riskLevelFromScore } from "@/lib/contract";
import { colors, radii, spacing } from "@/theme";
import { AppText } from "./app-text";
import { clampScore, RISK_SOFT } from "./risk-badge";

const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface RiskMeterProps {
  score: number;
  /** Optional extra (not in spec): gauge width in px. Default 240. */
  width?: number;
}

const STROKE = 20;

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

/** Big semicircle gauge: soft risk zones as the track, colored arc for the score, score number + Thai label. */
export function RiskMeter({ score, width = 240 }: RiskMeterProps) {
  const s = clampScore(score);
  const level = riskLevelFromScore(s);
  const color = RISK_COLOR[level];
  const reduceMotion = useReducedMotion();

  const r = (width - STROKE) / 2;
  const cx = width / 2;
  const cy = r + STROKE / 2;
  const height = cy + 2;
  const len = Math.PI * r;

  const progress = useSharedValue(reduceMotion ? s : 0);
  useEffect(() => {
    progress.value = reduceMotion
      ? s
      : withTiming(s, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [s, reduceMotion, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: len * (1 - progress.value / 100),
  }));

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`คะแนนความเสี่ยง ${s} จาก 100 ${RISK_LABEL_TH[level]}`}
    >
      <View style={{ width, height }}>
        <Svg width={width} height={height}>
          {/* track: three soft zones matching riskLevelFromScore thresholds */}
          <Path d={arc(0, 40, cx, cy, r)} stroke={RISK_SOFT.low} strokeWidth={STROKE} fill="none" />
          <Path d={arc(40, 70, cx, cy, r)} stroke={RISK_SOFT.medium} strokeWidth={STROKE} fill="none" />
          <Path d={arc(70, 100, cx, cy, r)} stroke={RISK_SOFT.high} strokeWidth={STROKE} fill="none" />
          {s > 0 && (
            <AnimatedPath
              d={arc(0, 100, cx, cy, r)}
              stroke={color}
              strokeWidth={STROKE}
              fill="none"
              strokeDasharray={`${len} ${len}`}
              animatedProps={animatedProps}
            />
          )}
        </Svg>
        <View style={styles.center} pointerEvents="none">
          <AppText variant="display" weight="bold" color={color} style={styles.score}>
            {s}
          </AppText>
          <AppText variant="caption" color={colors.textSubtle}>
            คะแนนความเสี่ยง / 100
          </AppText>
        </View>
      </View>
      <View style={[styles.label, { backgroundColor: RISK_SOFT[level] }]}>
        <View style={[styles.labelDot, { backgroundColor: color }]} />
        <AppText variant="large" weight="bold" color={color}>
          {RISK_LABEL_TH[level]}
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
  score: { fontSize: 56, lineHeight: 64 },
  label: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
  },
  labelDot: { width: 10, height: 10, borderRadius: 5 },
});
