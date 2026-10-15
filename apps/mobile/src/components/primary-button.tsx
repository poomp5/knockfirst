import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { colors, radii, spacing, TAP } from "@/theme";
import { AppText } from "./app-text";

/**
 * iOS button styles: primary = filled tint, danger = filled red,
 * secondary = tinted (grey fill, tint label), ghost = plain text.
 */
export type PrimaryButtonVariant = "primary" | "danger" | "ghost" | "secondary" | "dangerTinted";

export interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  variant?: PrimaryButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}

type Look = { bg: string; fg: string };

const LOOK: Record<PrimaryButtonVariant, Look> = {
  primary: { bg: colors.brand, fg: colors.white },
  danger: { bg: colors.danger, fg: colors.white },
  dangerTinted: { bg: colors.dangerSoft, fg: colors.danger },
  secondary: { bg: colors.fill, fg: colors.brand },
  ghost: { bg: "transparent", fg: colors.brand },
};

const DISABLED: Look = { bg: colors.fill, fg: colors.textSubtle };

/** Full-width button, 50pt tall, with pressed (dim) / loading / disabled states. */
export function PrimaryButton({ title, onPress, variant = "primary", loading = false, disabled = false, icon }: PrimaryButtonProps) {
  const inactive = disabled || loading;
  // iOS disabled buttons go neutral grey rather than a faded tint
  const look = disabled && !loading && variant !== "ghost" ? DISABLED : LOOK[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: look.bg },
        pressed && !inactive && styles.pressed,
        disabled && !loading && variant === "ghost" && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={look.fg} />
      ) : (
        <View style={styles.content}>
          {icon && <Ionicons name={icon} size={19} color={look.fg} />}
          <AppText variant="body" weight="semibold" color={look.fg} numberOfLines={1}>
            {title}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: TAP + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.xl - 2,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.7 },
  content: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  disabled: { opacity: 0.4 },
});
