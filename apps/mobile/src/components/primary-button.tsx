import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { colors, radii, spacing, TAP } from "@/theme";
import { AppText } from "./app-text";

export type PrimaryButtonVariant = "primary" | "danger" | "ghost" | "secondary";

export interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  variant?: PrimaryButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}

type Look = { bg: string; bgPressed: string; fg: string; border: string };

const LOOK: Record<PrimaryButtonVariant, Look> = {
  primary: { bg: colors.brand, bgPressed: colors.brandPressed, fg: colors.white, border: colors.brand },
  danger: { bg: colors.card, bgPressed: colors.dangerSoft, fg: colors.danger, border: colors.danger },
  secondary: { bg: colors.card, bgPressed: colors.bubbleAssistant, fg: colors.text, border: colors.divider },
  ghost: { bg: "transparent", bgPressed: colors.brandSoft, fg: colors.brandPressed, border: "transparent" },
};

/** Full-width button, ≥48dp tall, with pressed / loading / disabled states. */
export function PrimaryButton({ title, onPress, variant = "primary", loading = false, disabled = false, icon }: PrimaryButtonProps) {
  const look = LOOK[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: pressed && !inactive ? look.bgPressed : look.bg, borderColor: look.border },
        variant === "danger" && styles.thick,
        disabled && !loading && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={look.fg} />
      ) : (
        <View style={styles.content}>
          {icon && <Ionicons name={icon} size={20} color={look.fg} />}
          <AppText variant="large" weight="semibold" color={look.fg} numberOfLines={1}>
            {title}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: TAP + 4,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md + 2,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  thick: { borderWidth: 1.5 },
  content: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  disabled: { opacity: 0.45 },
});
