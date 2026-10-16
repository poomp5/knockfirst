import { StyleSheet, View } from "react-native";
import { colors, radii } from "@/theme";
import { AppText } from "./app-text";
import { useLang } from "@/lib/i18n";

/** Solid red "ด่วน" capsule for urgent (legit, time-critical) calls. */
export function UrgentTag() {
  const { t } = useLang();
  return (
    <View style={styles.tag} accessible accessibilityLabel={t("comp.urgentA11y")}>
      <AppText variant="caption" weight="bold" color={colors.white}>
        {t("comp.urgent")}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: radii.pill,
    backgroundColor: colors.danger,
  },
});
