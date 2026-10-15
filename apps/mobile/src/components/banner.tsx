import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import { colors, radii, spacing, TAP } from "@/theme";
import { AppText } from "./app-text";

export type BannerTone = "success" | "danger" | "info" | "error";

export interface BannerProps {
  tone: BannerTone;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}

const TONE: Record<BannerTone, { bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  success: { bg: colors.successSoft, fg: colors.success, icon: "checkmark-circle" },
  danger: { bg: colors.dangerSoft, fg: colors.danger, icon: "ban" },
  info: { bg: colors.brandSoft, fg: colors.brandPressed, icon: "information-circle" },
  error: { bg: colors.dangerSoft, fg: colors.danger, icon: "alert-circle" },
};

export function Banner({ tone, text, actionLabel, onAction }: BannerProps) {
  const t = TONE[tone] ?? TONE.info;
  return (
    <View
      style={[styles.wrap, { backgroundColor: t.bg }]}
      accessibilityRole={tone === "error" ? "alert" : undefined}
      accessibilityLiveRegion="polite"
    >
      <Ionicons name={t.icon} size={22} color={t.fg} />
      <AppText variant="body" weight="medium" color={colors.text} style={styles.text}>
        {text}
      </AppText>
      {!!actionLabel && !!onAction && (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          hitSlop={8}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
        >
          <AppText variant="body" weight="semibold" color={t.fg}>
            {actionLabel}
          </AppText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm,
    minHeight: TAP + 8,
    borderRadius: radii.md,
  },
  text: { flex: 1, paddingVertical: spacing.xs },
  action: {
    minHeight: TAP,
    minWidth: TAP,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.sm,
  },
  actionPressed: { backgroundColor: "rgba(0,0,0,0.06)" },
});
