import { StyleSheet, View } from "react-native";
import { colors, spacing } from "@/theme";
import { AppText } from "./app-text";

export interface SectionHeaderProps {
  title: string;
  count?: number;
}

/** Bold title3-style section heading (Apple Mail / Phone style), optional grey count. */
export function SectionHeader({ title, count }: SectionHeaderProps) {
  return (
    <View style={styles.row} accessibilityRole="header">
      <AppText variant="title" weight="bold" style={styles.title}>
        {title}
      </AppText>
      {typeof count === "number" && (
        <AppText variant="title" weight="medium" color={colors.textSubtle} style={styles.title}>
          {count}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.sm,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  title: { fontSize: 20, lineHeight: 28 },
});
