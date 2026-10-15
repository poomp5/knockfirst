// Grandma-mode home (update 05). Replaces the tabs when the device role is "grandma": calm, huge, high contrast.
// While this screen is mounted, useAutoRing() opens /ring/[callId] when a known caller rings.
import { useEffect, useState } from "react";
import { Alert, AppState, Pressable, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { USE_MOCKS } from "@/lib/firebase";
import { mockSimulateKnownCall } from "@/lib/mocks";
import { useAutoRing } from "@/lib/ring";
import { useDeviceRole } from "@/lib/role";
import { AppText, IconTile, PrimaryButton } from "@/components";
import { colors, radii, spacing, TAP } from "@/theme";

/** "วันพฤหัสบดีที่ 15 ตุลาคม" */
function thaiDate(d: Date): string {
  return `วัน${format(d, "EEEE", { locale: th })}ที่ ${format(d, "d MMMM", { locale: th })}`;
}

/** Now, refreshed every 15 s (so the clock never lags a minute) and when the app returns to the foreground. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = setInterval(refresh, 15_000);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") refresh();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);
  return now;
}

export default function GrandmaHome() {
  const insets = useSafeAreaInsets();
  const { role, setRole } = useDeviceRole();
  const now = useNow();

  useAutoRing(role === "grandma");

  function switchMode() {
    Alert.alert("เปลี่ยนโหมด", "เปลี่ยนเครื่องนี้เป็นโหมดลูกหลาน (ผู้ดูแล) ใช่ไหม?", [
      { text: "ยกเลิก", style: "cancel" },
      { text: "เปลี่ยน", onPress: () => void setRole("guardian") },
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

      {/* Lock Screen-style date + clock: the biggest, calmest thing on the screen. */}
      <View style={styles.clockBlock} accessible accessibilityLabel={`${thaiDate(now)} เวลา ${format(now, "HH:mm")} น.`}>
        <AppText variant="title" weight="semibold" color={colors.textMuted} style={styles.center}>
          {thaiDate(now)}
        </AppText>
        <AppText weight="bold" color={colors.ink} style={[styles.center, styles.clock]}>
          {format(now, "HH:mm")}
        </AppText>
      </View>

      <View style={styles.body}>
        <View style={styles.card}>
          <IconTile name="shield-checkmark" color={colors.brand} size={64} />
          <AppText variant="h1" weight="bold" style={styles.center}>
            KnockFirst{"\n"}ปกป้องคุณอยู่
          </AppText>
          <AppText variant="title" weight="medium" color={colors.textSubtle} style={styles.center}>
            สายจากคนแปลกหน้า AI จะรับแทน{"\n"}ลูกหลานจะเป็นคนตรวจสอบ
          </AppText>
        </View>
      </View>

      {USE_MOCKS ? (
        <PrimaryButton
          title="จำลองคนรู้จักโทรมา"
          variant="secondary"
          icon="flask"
          onPress={() => {
            mockSimulateKnownCall();
            Haptics.selectionAsync().catch(() => {});
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.lg },
  topBar: { flexDirection: "row", justifyContent: "flex-end" },
  switchLink: { minHeight: TAP, justifyContent: "center", paddingHorizontal: spacing.sm },
  pressed: { opacity: 0.4 },
  clockBlock: { alignItems: "center", marginTop: spacing.sm },
  clock: { fontSize: 96, lineHeight: 112, letterSpacing: -3 },
  body: { flex: 1, justifyContent: "center" },
  card: {
    alignItems: "center",
    gap: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radii.xxl,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  center: { textAlign: "center" },
});
