import { Ionicons } from "@expo/vector-icons";
import { Image, StyleSheet, View, type ImageSourcePropType } from "react-native";
import { colors, spacing } from "@/theme";
import { AppText } from "./app-text";

export interface EmptyStateProps {
  title: string;
  subtitle?: string;
  image?: ImageSourcePropType;
}

/** Centered illustration + message. Falls back to a shield icon when no image is given. */
export function EmptyState({ title, subtitle, image }: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      {image ? (
        <Image source={image} style={styles.image} resizeMode="contain" accessibilityIgnoresInvertColors />
      ) : (
        <View style={styles.iconCircle}>
          <Ionicons name="shield-checkmark" size={48} color={colors.brand} />
        </View>
      )}
      <AppText variant="title" weight="semibold" style={styles.center}>
        {title}
      </AppText>
      {!!subtitle && (
        <AppText variant="body" color={colors.textMuted} style={styles.center}>
          {subtitle}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  image: { width: 240, height: 180, marginBottom: spacing.md },
  iconCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  center: { textAlign: "center" },
});
