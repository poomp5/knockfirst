// First-launch chooser (update 05): which person is this phone for? Shown while the device role is null.
// Choosing a role flips the Stack.Protected guards in the root layout, which moves to (tabs) or grandma.
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDeviceRole, type DeviceRole } from "@/lib/role";
import { AppText } from "@/components";
import { colors, radii, spacing } from "@/theme";

type Option = {
  role: DeviceRole;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  tint: string;
  soft: string;
};

const OPTIONS: Option[] = [
  {
    role: "guardian",
    icon: "people",
    title: "ลูกหลาน (ผู้ดูแล)",
    body: "รับแจ้งเตือน ตรวจสอบสายแปลก อนุญาต/บล็อก",
    tint: colors.brand,
    soft: colors.brandSoft,
  },
  {
    role: "grandma",
    icon: "heart",
    title: "คุณยาย (เจ้าของเบอร์)",
    body: "รับสายจากคนรู้จัก หน้าจอเรียบง่าย ตัวใหญ่",
    tint: colors.success,
    soft: colors.successSoft,
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
        { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xxl },
      ]}
    >
      <View style={styles.hero}>
        <Image
          source={require("../../assets/shield.png")}
          style={styles.shield}
          contentFit="contain"
          accessibilityIgnoresInvertColors
        />
        <AppText variant="small" weight="semibold" color={colors.brandPressed}>
          ยินดีต้อนรับสู่ KnockFirst
        </AppText>
        <AppText variant="h1" weight="bold" style={styles.center}>
          เครื่องนี้เป็นของใคร?
        </AppText>
        <AppText color={colors.textMuted} style={styles.center}>
          เลือกครั้งเดียว เปลี่ยนได้ภายหลังในการตั้งค่า
        </AppText>
      </View>

      <View style={styles.options}>
        {OPTIONS.map((o) => (
          <Pressable
            key={o.role}
            onPress={() => choose(o.role)}
            disabled={busy !== null}
            accessibilityRole="button"
            accessibilityLabel={`${o.title}. ${o.body}`}
            style={({ pressed }) => [
              styles.option,
              { borderColor: pressed || busy === o.role ? o.tint : colors.border },
              pressed && { backgroundColor: o.soft },
            ]}
          >
            <View style={[styles.optionIcon, { backgroundColor: o.soft }]}>
              <Ionicons name={o.icon} size={40} color={o.tint} />
            </View>
            <View style={styles.optionText}>
              <AppText variant="title" weight="bold">
                {o.title}
              </AppText>
              <AppText variant="large" color={colors.textMuted}>
                {o.body}
              </AppText>
            </View>
            {busy === o.role ? (
              <ActivityIndicator color={o.tint} />
            ) : (
              <Ionicons name="chevron-forward" size={28} color={colors.textSubtle} />
            )}
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, justifyContent: "center", paddingHorizontal: spacing.xl, gap: spacing.xxl },
  hero: { alignItems: "center", gap: spacing.sm },
  shield: { width: 96, height: 96, marginBottom: spacing.sm },
  center: { textAlign: "center" },
  options: { gap: spacing.lg },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    minHeight: 140,
    padding: spacing.xl,
    borderRadius: radii.lg,
    borderWidth: 2,
    backgroundColor: colors.card,
  },
  optionIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  optionText: { flex: 1, gap: spacing.xs },
});
