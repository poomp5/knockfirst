// Grandma-mode home (update 05). Replaces the tabs when the device role is "grandma": calm, huge, high contrast.
// While this screen is mounted, useAutoRing() opens /ring/[callId] when a known caller rings.
import { useEffect, useState } from "react";
import { Alert, AppState, Pressable, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { format, type Locale } from "date-fns";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { USE_MOCKS } from "@/lib/firebase";
import { translate, useLang, type Lang } from "@/lib/i18n";
import { mockSimulateKnownCall } from "@/lib/mocks";
import { useAutoRing } from "@/lib/ring";
import { useDeviceRole } from "@/lib/role";
import { AppText, IconTile, PrimaryButton } from "@/components";
import { colors, radii, spacing, TAP } from "@/theme";

/** th: "วันพฤหัสบดีที่ 15 ตุลาคม" · en: "Thursday, 15 October" */
function longDate(d: Date, lang: Lang, locale: Locale): string {
  return translate(lang, "grandma.date", { weekday: format(d, "EEEE", { locale }), date: format(d, "d MMMM", { locale }) });
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
  const { t, lang, dateLocale } = useLang();
  const dateText = longDate(now, lang, dateLocale);

  useAutoRing(role === "grandma");

  function switchMode() {
    Alert.alert(t("common.switchMode"), t("grandma.switchQuestion"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("grandma.switchConfirm"), onPress: () => void setRole("guardian") },
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

      {/* Lock Screen-style date + clock: the biggest, calmest thing on the screen. */}
      <View style={styles.clockBlock} accessible accessibilityLabel={t("grandma.clockA11y", { date: dateText, time: format(now, "HH:mm") })}>
        <AppText variant="title" weight="semibold" color={colors.textMuted} style={styles.center}>
          {dateText}
        </AppText>
        <AppText weight="bold" color={colors.ink} style={[styles.center, styles.clock]}>
          {format(now, "HH:mm")}
        </AppText>
      </View>

      <View style={styles.body}>
        <View style={styles.card}>
          <IconTile name="shield-checkmark" color={colors.brand} size={64} />
          <AppText variant="h1" weight="bold" style={styles.center}>
            {t("grandma.title")}
          </AppText>
          <AppText variant="title" weight="medium" color={colors.textSubtle} style={styles.center}>
            {t("grandma.subtitle")}
          </AppText>
        </View>
      </View>

      {USE_MOCKS ? (
        <PrimaryButton
          title={t("grandma.mockKnownCall")}
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
