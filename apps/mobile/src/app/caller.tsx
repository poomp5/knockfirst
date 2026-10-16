// Stranger mode (demo): this phone plays the unknown caller. The voice call itself runs on the web caller page
// (ElevenLabs WebRTC needs native modules Expo Go doesn't ship), opened in the in-app browser.
import { Alert, Linking, Pressable, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDeviceRole } from "@/lib/role";
import { AppText, IconTile, PrimaryButton } from "@/components";
import { colors, radii, spacing, TAP } from "@/theme";

const CALLER_URL = "https://knockfirst.pranakorn.co.th/#caller-h";

const TIPS: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
  { icon: "headset", text: "ใช้หูฟังเพื่อเสียงที่ชัดที่สุด" },
  { icon: "mic", text: "กดอนุญาตไมโครโฟนเมื่อเบราว์เซอร์ถาม" },
  { icon: "notifications", text: "วางสายแล้ว ลูกหลานจะเห็นสรุปในแอปภายในราว 15 วินาที" },
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

  function switchMode() {
    Alert.alert("เปลี่ยนโหมด", "เปลี่ยนเครื่องนี้เป็นโหมดไหน?", [
      { text: "ลูกหลาน (ผู้ดูแล)", onPress: () => void setRole("guardian") },
      { text: "คุณยาย (เจ้าของเบอร์)", onPress: () => void setRole("grandma") },
      { text: "ยกเลิก", style: "cancel" },
    ]);
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.topBar}>
        <Pressable
          onPress={switchMode}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="เปลี่ยนโหมด"
          style={({ pressed }) => [styles.switchLink, pressed && styles.pressed]}
        >
          <AppText variant="body" color={colors.brand}>
            เปลี่ยนโหมด
          </AppText>
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={styles.card}>
          <IconTile name="call" color={colors.blue} size={64} />
          <AppText variant="h1" weight="bold" style={styles.center}>
            คุณคือคนแปลกหน้า
          </AppText>
          <AppText variant="title" weight="medium" color={colors.textSubtle} style={styles.center}>
            โทรหาเบอร์ของคุณยายในนามเบอร์ที่ไม่รู้จัก{"\n"}ผู้ช่วย AI จะรับสายแทน พูดไทยหรืออังกฤษก็ได้
          </AppText>
        </View>

        <View style={styles.tips}>
          {TIPS.map((t) => (
            <View key={t.icon} style={styles.tip}>
              <Ionicons name={t.icon} size={20} color={colors.textSubtle} />
              <AppText variant="body" color={colors.textSubtle} style={styles.flex}>
                {t.text}
              </AppText>
            </View>
          ))}
        </View>
      </View>

      <PrimaryButton title="โทรหาคุณยาย" icon="call" onPress={() => void openCaller()} />
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
