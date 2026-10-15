import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { RED_FLAG_LABEL_TH, type RedFlag } from "@/lib/contract";
import { colors, radii, spacing } from "@/theme";
import { AppText } from "./app-text";

export interface RedFlagChipProps {
  flag: RedFlag;
}

export function RedFlagChip({ flag }: RedFlagChipProps) {
  const label = RED_FLAG_LABEL_TH[flag] ?? "สัญญาณผิดปกติ";
  return (
    <View style={styles.chip} accessible accessibilityLabel={`สัญญาณอันตราย: ${label}`}>
      <Ionicons name="warning" size={13} color={colors.danger} />
      <AppText variant="caption" weight="medium" color={colors.danger} numberOfLines={1} style={styles.text}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    maxWidth: "100%",
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.dangerSoft,
  },
  text: { flexShrink: 1 },
});
