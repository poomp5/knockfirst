import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { colors, radii } from "@/theme";
import { AppText } from "./app-text";

/** Strong red "ด่วน" tag for urgent (legit, time-critical) calls. */
export function UrgentTag() {
  return (
    <View style={styles.tag} accessible accessibilityLabel="สายด่วน">
      <Ionicons name="flash" size={12} color={colors.white} />
      <AppText variant="caption" weight="bold" color={colors.white}>
        ด่วน
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.sm,
    backgroundColor: colors.danger,
  },
});
