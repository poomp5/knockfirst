import { StyleSheet, View } from "react-native";
import { colors, spacing } from "@/theme";
import { AppText } from "./app-text";

export interface FactRowProps {
  label: string;
  value?: string | null;
}

/** "label: value" row; renders nothing when value is null/empty. */
export function FactRow({ label, value }: FactRowProps) {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v) return null;
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label} ${v}`}>
      <AppText variant="body" color={colors.textSubtle} style={styles.label}>
        {label}
      </AppText>
      <AppText variant="body" weight="medium" style={styles.value} selectable>
        {v}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  label: { width: 128 },
  value: { flex: 1 },
});
