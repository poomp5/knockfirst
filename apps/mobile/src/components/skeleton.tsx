import { useEffect } from "react";
import type { DimensionValue } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { colors, radii } from "@/theme";

export interface SkeletonProps {
  height?: number;
  width?: number | string;
}

/** Gently pulsing placeholder block. */
export function Skeleton({ height = 16, width = "100%" }: SkeletonProps) {
  const reduceMotion = useReducedMotion();
  const o = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    o.value = withRepeat(withTiming(0.45, { duration: 800, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => cancelAnimation(o);
  }, [reduceMotion, o]);

  const anim = useAnimatedStyle(() => ({ opacity: o.value }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        // spec allows any string; RN only accepts numbers / "auto" / percentages
        { height, width: width as DimensionValue, borderRadius: radii.md, backgroundColor: colors.fill },
        anim,
      ]}
    />
  );
}
