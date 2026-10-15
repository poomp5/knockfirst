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
import { useDeviceRole, type DeviceRole } from "@/lib/role";
import { AppText, PrimaryButton } from "@/components";
import { colors, fonts, fontSize, spacing } from "@/theme";

// Keep the native splash up until fonts are loaded, anonymous sign-in has resolved and the device role is read.
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
  const { role, loaded: roleLoaded } = useDeviceRole();

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

  // Push registration runs in the background; never blocks the UI. Re-runs when the role changes so the token
  // moves between pushTokens (guardian) and ownerPushTokens (grandma). No role yet → registerForPush is a no-op.
  useEffect(() => {
    if (authState !== "ok" || !role) return;
    registerForPush().catch((e: unknown) => console.warn("registerForPush failed", e));
  }, [authState, role]);

  const ready = fontsReady && authState !== "pending" && roleLoaded;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (fontError) console.warn("font load failed, falling back to system font", fontError);

  // Text components need the fonts; the native splash is still covering the screen here (role read is ~instant).
  if (!fontsReady || !roleLoaded) return null;

  return (
    <View style={styles.root}>
      {/* Light UI → dark status-bar icons. */}
      <StatusBar style="dark" />
      {authState === "ok" ? (
        <AppStack role={role} />
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

/**
 * Mounted only after sign-in, so notification taps (incl. cold start) navigate into a live navigator.
 * Routing by device role uses guards: when a guard turns false the router moves to the first available
 * screen, so null → welcome (chooser), "guardian" → (tabs), "grandma" → grandma home.
 * call/[id] and ring/[callId] are unguarded so deep links / notification taps work in every role.
 */
function AppStack({ role }: { role: DeviceRole | null }) {
  useNotificationRouting();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTintColor: colors.brand, // iOS: back chevron and bar buttons take the tint
        headerTitleStyle: { fontFamily: fonts.semibold, fontSize: fontSize.body, color: colors.ink },
        headerTitleAlign: "center",
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Protected guard={role === "guardian"}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="blocked" options={{ title: "เบอร์ที่ถูกบล็อก" }} />
      </Stack.Protected>
      <Stack.Protected guard={role === "grandma"}>
        <Stack.Screen name="grandma" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={role === null}>
        <Stack.Screen name="welcome" options={{ headerShown: false, gestureEnabled: false }} />
      </Stack.Protected>
      <Stack.Screen name="call/[id]" options={{ title: "รายละเอียดสาย" }} />
      <Stack.Screen
        name="ring/[callId]"
        options={{ headerShown: false, presentation: "fullScreenModal", gestureEnabled: false }}
      />
    </Stack>
  );
}

function SignInError({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={[styles.center, styles.errorWrap]}>
      <Ionicons name="cloud-offline" size={56} color={colors.textFaint} style={styles.errorIcon} />
      <AppText variant="title" weight="bold" style={styles.textCenter}>
        เชื่อมต่อไม่สำเร็จ
      </AppText>
      <AppText variant="small" color={colors.textSubtle} style={styles.textCenter}>
        ตรวจสอบอินเทอร์เน็ตของโทรศัพท์ แล้วลองใหม่อีกครั้ง
      </AppText>
      <View style={styles.errorButton}>
        <PrimaryButton title="ลองใหม่" onPress={onRetry} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  errorWrap: { paddingHorizontal: spacing.xxl, gap: spacing.md },
  errorIcon: { marginBottom: spacing.sm },
  textCenter: { textAlign: "center" },
  errorButton: { alignSelf: "stretch", marginTop: spacing.lg },
});
