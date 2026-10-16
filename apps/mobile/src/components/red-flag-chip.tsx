import { StyleSheet, View } from "react-native";
import type { RedFlag } from "@/lib/contract";
import { useLang } from "@/lib/i18n";
import { colors, radii, spacing } from "@/theme";
import { AppText } from "./app-text";

export interface RedFlagChipProps {
  flag: RedFlag;
}

/** Tinted red capsule with the Thai red-flag label. */
export function RedFlagChip({ flag }: RedFlagChipProps) {
  const { t, redFlagLabel } = useLang();
  const label = redFlagLabel[flag] ?? t("comp.flagUnknown");
  return (
    <View style={styles.chip} accessible accessibilityLabel={t("comp.flagA11y", { label })}>
      <AppText variant="caption" weight="medium" color={colors.danger} numberOfLines={1} style={styles.text}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: "flex-start",
    maxWidth: "100%",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: colors.dangerSoft,
  },
  text: { flexShrink: 1 },
});
