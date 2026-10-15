import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { colors, radii, spacing, TAP } from "@/theme";
import { AppText } from "./app-text";

export type BannerTone = "success" | "danger" | "info" | "error";

export interface BannerProps {
  tone: BannerTone;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}

const TONE: Record<BannerTone, { fg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  success: { fg: colors.success, icon: "checkmark-circle" },
  danger: { fg: colors.danger, icon: "hand-left" },
  info: { fg: colors.brand, icon: "information-circle" },
  error: { fg: colors.danger, icon: "alert-circle" },
};

/** Inline notice: white rounded card, tinted glyph, optional plain-text action (iOS style). */
export function Banner({ tone, text, actionLabel, onAction }: BannerProps) {
  const t = TONE[tone] ?? TONE.info;
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={styles.wrap}
      accessibilityRole={tone === "error" ? "alert" : undefined}
      accessibilityLiveRegion="polite"
    >
      <Ionicons name={t.icon} size={22} color={t.fg} />
      <AppText variant="small" weight="medium" color={colors.text} style={styles.text}>
        {text}
      </AppText>
      {!!actionLabel && !!onAction && (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          hitSlop={8}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
        >
          <AppText variant="small" weight="semibold" color={colors.brand}>
            {actionLabel}
          </AppText>
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    minHeight: TAP + 4,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
  },
  text: { flex: 1, paddingVertical: spacing.sm },
  action: {
    minHeight: TAP,
    minWidth: TAP,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  actionPressed: { opacity: 0.4 },
});
