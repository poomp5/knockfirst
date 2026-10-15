// Grandma-mode home (update 05). Replaces the tabs when the device role is "grandma": calm, huge, high contrast.
// While this screen is mounted, useAutoRing() opens /ring/[callId] when a known caller rings.
import { useEffect, useState } from "react";
import { Alert, AppState, Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { USE_MOCKS } from "@/lib/firebase";
import { mockSimulateKnownCall } from "@/lib/mocks";
import { useAutoRing } from "@/lib/ring";
import { useDeviceRole } from "@/lib/role";
import { AppText } from "@/components";
import { colors, radii, spacing, TAP } from "@/theme";

/** "วันพฤหัสบดีที่ 15 ตุลาคม" */
function thaiDate(d: Date): string {
  return `วัน${format(d, "EEEE", { locale: th })}ที่ ${format(d, "d MMMM", { locale: th })}`;
}

/** Today's Thai date, refreshed every minute and when the app returns to the foreground. */
function useThaiToday(): string {
  const [label, setLabel] = useState(() => thaiDate(new Date()));
  useEffect(() => {
    const refresh = () => setLabel(thaiDate(new Date()));
    const timer = setInterval(refresh, 60_000);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") refresh();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);
  return label;
}

export default function GrandmaHome() {
  const insets = useSafeAreaInsets();
  const { role, setRole } = useDeviceRole();
  const today = useThaiToday();

  useAutoRing(role === "grandma");

  function switchMode() {
    Alert.alert("เปลี่ยนโหมด", "เปลี่ยนเครื่องนี้เป็นโหมดลูกหลาน (ผู้ดูแล) ใช่ไหม?", [
      { text: "ยกเลิก", style: "cancel" },
      { text: "เปลี่ยน", onPress: () => void setRole("guardian") },
    ]);
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.topBar}>
        <Pressable
          onPress={switchMode}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="เปลี่ยนโหมด"
          style={({ pressed }) => [styles.switchLink, pressed && styles.pressed]}
        >
          <Ionicons name="swap-horizontal" size={16} color={colors.textSubtle} />
          <AppText variant="small" color={colors.textSubtle}>
            เปลี่ยนโหมด
          </AppText>
        </Pressable>
      </View>

      <View style={styles.body}>
        <Image
          source={require("../../assets/shield.png")}
          style={styles.shield}
          contentFit="contain"
          accessibilityIgnoresInvertColors
        />
        <View style={styles.headline}>
          <AppText variant="display" weight="bold" color={colors.brand} style={styles.center}>
            KnockFirst
          </AppText>
          <AppText variant="display" weight="bold" color={colors.ink} style={styles.center}>
            ปกป้องคุณอยู่
          </AppText>
        </View>

        <View style={styles.datePill}>
          <Ionicons name="calendar" size={28} color={colors.ink} />
          <AppText variant="title" weight="semibold" color={colors.ink}>
            {today}
          </AppText>
        </View>

        <AppText variant="title" weight="medium" color={colors.textMuted} style={[styles.center, styles.note]}>
          สายจากคนแปลกหน้า AI จะรับแทน{"\n"}ลูกหลานจะเป็นคนตรวจสอบ
        </AppText>
      </View>

      {USE_MOCKS ? (
        <Pressable
          onPress={() => {
            mockSimulateKnownCall();
            Haptics.selectionAsync().catch(() => {});
          }}
          accessibilityRole="button"
          accessibilityLabel="จำลองคนรู้จักโทรมา (โหมดทดสอบ)"
          style={({ pressed }) => [styles.devButton, pressed && styles.pressed]}
        >
          <Ionicons name="flask-outline" size={18} color={colors.brandPressed} />
          <AppText variant="small" weight="semibold" color={colors.brandPressed}>
            จำลองคนรู้จักโทรมา
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.xl },
  topBar: { flexDirection: "row", justifyContent: "flex-end" },
  switchLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    minHeight: TAP,
    paddingHorizontal: spacing.sm,
  },
  pressed: { opacity: 0.6 },
  body: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.xl },
  shield: { width: 140, height: 140 },
  headline: { alignItems: "center" },
  center: { textAlign: "center" },
  datePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  note: { maxWidth: 360 },
  devButton: {
    minHeight: TAP,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
});
