import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { colors } from "@/theme";

export interface PulseDotProps {
  color?: string;
  size?: number;
}

/** Solid dot with a soft ring that keeps expanding and fading: "live" indicator. */
export function PulseDot({ color = colors.brand, size = 10 }: PulseDotProps) {
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    t.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1, false);
    return () => cancelAnimation(t);
  }, [reduceMotion, t]);

  const ring = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - t.value),
    transform: [{ scale: 1 + t.value * 1.6 }],
  }));

  const box = size * 3;
  return (
    <View style={[styles.box, { width: box, height: box }]} accessibilityElementsHidden importantForAccessibility="no">
      <Animated.View
        style={[styles.abs, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }, ring]}
      />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: "center", justifyContent: "center" },
  abs: { position: "absolute" },
});
