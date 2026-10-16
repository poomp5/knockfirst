// Stranger mode (demo): this phone plays the unknown caller. The voice call itself runs on the web caller page
// (ElevenLabs WebRTC needs native modules Expo Go doesn't ship), opened in the in-app browser.
import { Alert, Linking, Pressable, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLang, type StrKey } from "@/lib/i18n";
import { useDeviceRole } from "@/lib/role";
import { AppText, IconTile, PrimaryButton } from "@/components";
import { colors, radii, spacing, TAP } from "@/theme";

const CALLER_URL = "https://knockfirst.pranakorn.co.th/#caller-h";

const TIPS: { icon: keyof typeof Ionicons.glyphMap; text: StrKey }[] = [
  { icon: "headset", text: "caller.tipHeadset" },
  { icon: "mic", text: "caller.tipMic" },
  { icon: "notifications", text: "caller.tipSummary" },
];

async function openCaller() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  try {
    await WebBrowser.openBrowserAsync(CALLER_URL, { controlsColor: colors.brand });
  } catch {
    await Linking.openURL(CALLER_URL).catch(() => {});
  }
}

export default function CallerHome() {
  const insets = useSafeAreaInsets();
  const { setRole } = useDeviceRole();
  const { t } = useLang();

  function switchMode() {
    Alert.alert(t("common.switchMode"), t("caller.switchQuestion"), [
      { text: t("caller.roleGuardian"), onPress: () => void setRole("guardian") },
      { text: t("caller.roleGrandma"), onPress: () => void setRole("grandma") },
      { text: t("common.cancel"), style: "cancel" },
    ]);
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.topBar}>
        <Pressable
          onPress={switchMode}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t("common.switchMode")}
          style={({ pressed }) => [styles.switchLink, pressed && styles.pressed]}
        >
          <AppText variant="body" color={colors.brand}>
            {t("common.switchMode")}
          </AppText>
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={styles.card}>
          <IconTile name="call" color={colors.blue} size={64} />
          <AppText variant="h1" weight="bold" style={styles.center}>
            {t("caller.title")}
          </AppText>
          <AppText variant="title" weight="medium" color={colors.textSubtle} style={styles.center}>
            {t("caller.subtitle")}
          </AppText>
        </View>

        <View style={styles.tips}>
          {TIPS.map((tip) => (
            <View key={tip.icon} style={styles.tip}>
              <Ionicons name={tip.icon} size={20} color={colors.textSubtle} />
              <AppText variant="body" color={colors.textSubtle} style={styles.flex}>
                {t(tip.text)}
              </AppText>
            </View>
          ))}
        </View>
      </View>

      <PrimaryButton title={t("caller.callGrandma")} icon="call" onPress={() => void openCaller()} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.lg },
  topBar: { flexDirection: "row", justifyContent: "flex-end" },
  switchLink: { minHeight: TAP, justifyContent: "center", paddingHorizontal: spacing.sm },
  pressed: { opacity: 0.4 },
  body: { flex: 1, justifyContent: "center", gap: spacing.xl },
  card: {
    alignItems: "center",
    gap: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radii.xxl,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  tips: { gap: spacing.md, paddingHorizontal: spacing.sm },
  tip: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  flex: { flex: 1 },
  center: { textAlign: "center" },
});
