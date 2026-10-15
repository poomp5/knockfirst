// First-launch chooser (update 05): which person is this phone for? Shown while the device role is null.
// Choosing a role flips the Stack.Protected guards in the root layout, which moves to (tabs) or grandma.
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDeviceRole, type DeviceRole } from "@/lib/role";
import { AppText, IconTile } from "@/components";
import { colors, radii, spacing } from "@/theme";

type Option = {
  role: DeviceRole;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  tint: string;
};

const OPTIONS: Option[] = [
  {
    role: "guardian",
    icon: "people",
    title: "ลูกหลาน (ผู้ดูแล)",
    body: "รับแจ้งเตือน ตรวจสอบสายแปลก อนุญาต/บล็อก",
    tint: colors.brand,
  },
  {
    role: "grandma",
    icon: "heart",
    title: "คุณยาย (เจ้าของเบอร์)",
    body: "รับสายจากคนรู้จัก หน้าจอเรียบง่าย ตัวใหญ่",
    tint: colors.switchOn,
  },
];

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { setRole } = useDeviceRole();
  const [busy, setBusy] = useState<DeviceRole | null>(null);

  async function choose(role: DeviceRole) {
    if (busy) return;
    setBusy(role);
    Haptics.selectionAsync().catch(() => {});
    await setRole(role); // guards in the root layout redirect from here
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.xxl * 1.5, paddingBottom: insets.bottom + spacing.xxl },
      ]}
    >
      <View style={styles.hero}>
        <Image
          source={require("../../assets/shield.png")}
          style={styles.shield}
          contentFit="contain"
          accessibilityIgnoresInvertColors
        />
        <AppText variant="h1" weight="bold" style={styles.center}>
          ยินดีต้อนรับสู่{"\n"}KnockFirst
        </AppText>
        <AppText variant="body" color={colors.textSubtle} style={styles.center}>
          เครื่องนี้เป็นของใคร? เลือกครั้งเดียว เปลี่ยนได้ภายหลังในการตั้งค่า
        </AppText>
      </View>

      <View style={styles.group}>
        {OPTIONS.map((o, i) => (
          <Pressable
            key={o.role}
            onPress={() => choose(o.role)}
            disabled={busy !== null}
            accessibilityRole="button"
            accessibilityLabel={`${o.title}. ${o.body}`}
            style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
          >
            <IconTile name={o.icon} color={o.tint} size={52} />
            <View style={[styles.optionText, i > 0 && styles.optionTextDivider]}>
              <View style={styles.flex}>
                <AppText variant="title" weight="bold">
                  {o.title}
                </AppText>
                <AppText variant="body" color={colors.textSubtle}>
                  {o.body}
                </AppText>
              </View>
              {busy === o.role ? (
                <ActivityIndicator color={colors.textSubtle} />
              ) : (
                <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
              )}
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, justifyContent: "center", paddingHorizontal: spacing.lg, gap: spacing.xxl + spacing.sm },
  hero: { alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg },
  shield: { width: 88, height: 88, marginBottom: spacing.sm },
  center: { textAlign: "center" },
  flex: { flex: 1 },
  group: { backgroundColor: colors.card, borderRadius: radii.xl, overflow: "hidden" },
  option: { flexDirection: "row", alignItems: "center", gap: spacing.lg, paddingLeft: spacing.lg, minHeight: 112 },
  optionPressed: { backgroundColor: colors.fillPressed },
  optionText: {
    flex: 1,
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingRight: spacing.lg,
  },
  // the hairline sits above the text column only (inset like iOS lists)
  optionTextDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
});
