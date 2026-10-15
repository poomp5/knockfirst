import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  NotoSansThai_400Regular,
  NotoSansThai_500Medium,
  NotoSansThai_600SemiBold,
  NotoSansThai_700Bold,
} from "@expo-google-fonts/noto-sans-thai";
import { Ionicons } from "@expo/vector-icons";

import { ensureSignedIn, USE_MOCKS } from "@/lib/firebase";
import { registerForPush, useNotificationRouting } from "@/lib/push";
import { AppText, PrimaryButton } from "@/components";
import { colors, fonts, fontSize, spacing } from "@/theme";

// Keep the native splash up until fonts are loaded and anonymous sign-in has resolved.
SplashScreen.preventAutoHideAsync().catch(() => {});

type AuthState = "pending" | "ok" | "error";

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    NotoSansThai_400Regular,
    NotoSansThai_500Medium,
    NotoSansThai_600SemiBold,
    NotoSansThai_700Bold,
  });
  const fontsReady = fontsLoaded || !!fontError;

  const [authState, setAuthState] = useState<AuthState>(USE_MOCKS ? "ok" : "pending");
  const [attempt, setAttempt] = useState(0);

  // Rules require sign-in before any Firestore listener starts (B2). Mock mode skips it.
  useEffect(() => {
    if (USE_MOCKS) return;
    let cancelled = false;
    ensureSignedIn()
      .then(() => {
        if (!cancelled) setAuthState("ok");
      })
      .catch((e: unknown) => {
        console.error("ensureSignedIn failed", e);
        if (!cancelled) setAuthState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  // Push registration runs in the background; never blocks the UI.
  useEffect(() => {
    if (authState !== "ok") return;
    registerForPush().catch((e: unknown) => console.warn("registerForPush failed", e));
  }, [authState]);

  const ready = fontsReady && authState !== "pending";
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (fontError) console.warn("font load failed, falling back to system font", fontError);

  // Text components need the fonts; the native splash is still covering the screen here.
  if (!fontsReady) return null;

  return (
    <View style={styles.root}>
      {/* Light UI → dark status-bar icons. */}
      <StatusBar style="dark" />
      {authState === "ok" ? (
        <AppStack />
      ) : authState === "pending" ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : (
        <SignInError
          onRetry={() => {
            setAuthState("pending");
            setAttempt((n) => n + 1);
          }}
        />
      )}
    </View>
  );
}

/** Mounted only after sign-in, so notification taps (incl. cold start) navigate into a live navigator. */
function AppStack() {
  useNotificationRouting();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTintColor: colors.ink,
        headerTitleStyle: { fontFamily: fonts.semibold, fontSize: fontSize.large },
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="call/[id]" options={{ title: "รายละเอียดสาย" }} />
      <Stack.Screen name="blocked" options={{ title: "เบอร์ที่ถูกบล็อก" }} />
    </Stack>
  );
}

function SignInError({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={[styles.center, styles.errorWrap]}>
      <View style={styles.errorIcon}>
        <Ionicons name="cloud-offline-outline" size={40} color={colors.danger} />
      </View>
      <AppText variant="title" weight="bold" style={styles.textCenter}>
        เชื่อมต่อไม่สำเร็จ
      </AppText>
      <AppText color={colors.textMuted} style={styles.textCenter}>
        ตรวจสอบอินเทอร์เน็ตของโทรศัพท์ แล้วลองใหม่อีกครั้ง
      </AppText>
      <View style={styles.errorButton}>
        <PrimaryButton title="ลองใหม่" icon="refresh" onPress={onRetry} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  errorWrap: { paddingHorizontal: spacing.xxl, gap: spacing.md },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  textCenter: { textAlign: "center" },
  errorButton: { alignSelf: "stretch", marginTop: spacing.lg },
});
