import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { colors, spacing } from "@/theme";
import { AppText } from "./app-text";

export interface EmptyStateProps {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

/** iOS "content unavailable" view: large grey glyph, bold title, secondary description. */
export function EmptyState({ title, subtitle, icon = "shield-checkmark" }: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <Ionicons name={icon} size={56} color={colors.textFaint} style={styles.icon} />
      <AppText variant="title" weight="bold" style={styles.center}>
        {title}
      </AppText>
      {!!subtitle && (
        <AppText variant="small" color={colors.textSubtle} style={styles.center}>
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
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxl * 1.5,
  },
  icon: { marginBottom: spacing.sm },
  center: { textAlign: "center" },
});
