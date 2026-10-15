import { StyleSheet, View } from "react-native";
import { colors, spacing } from "@/theme";
import { AppText } from "./app-text";

export interface FactRowProps {
  label: string;
  value?: string | null;
}

/** Contacts-style field: small label above the value. Renders nothing when value is null/empty. */
export function FactRow({ label, value }: FactRowProps) {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v) return null;
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label} ${v}`}>
      <AppText variant="caption" weight="medium" color={colors.textSubtle}>
        {label}
      </AppText>
      <AppText variant="body" selectable>
        {v}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: spacing.lg, paddingVertical: 10, gap: 1, backgroundColor: colors.card },
});
