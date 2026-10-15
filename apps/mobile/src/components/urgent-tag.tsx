import { StyleSheet, View } from "react-native";
import { colors, radii } from "@/theme";
import { AppText } from "./app-text";

/** Solid red "ด่วน" capsule for urgent (legit, time-critical) calls. */
export function UrgentTag() {
  return (
    <View style={styles.tag} accessible accessibilityLabel="สายด่วน">
      <AppText variant="caption" weight="bold" color={colors.white}>
        ด่วน
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
