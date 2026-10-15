import { StyleSheet, View } from "react-native";
import { colors, radii, spacing } from "@/theme";
import { AppText } from "./app-text";

export interface SectionHeaderProps {
  title: string;
  count?: number;
}

export function SectionHeader({ title, count }: SectionHeaderProps) {
  return (
    <View style={styles.row} accessibilityRole="header">
      <AppText variant="large" weight="semibold">
        {title}
      </AppText>
      {typeof count === "number" && (
        <View style={styles.count}>
          <AppText variant="caption" weight="semibold" color={colors.textMuted}>
            {count}
          </AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  count: {
    minWidth: 24,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: radii.pill,
    backgroundColor: colors.bubbleAssistant,
    alignItems: "center",
  },
});
