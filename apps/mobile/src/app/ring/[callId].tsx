// Grandma-mode ringing screen (update 05). Opened by an owner_ring push tap or by useAutoRing.
// Demo honesty: tapping รับสาย only records ownerResponse; there is no voice line on this phone.
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { setOwnerResponse } from "@/lib/actions";
import { formatCallerKey } from "@/lib/contract";
import { useCall, useWhitelist } from "@/lib/hooks";
import { RING_TIMEOUT_MS, useRingtone } from "@/lib/ring";
import { tsToDate } from "@/lib/time";
import { AppText } from "@/components";
import { colors, radii, spacing } from "@/theme";

type Response = "answered" | "declined";
type Phase = "loading" | "notFound" | "ringing" | Response | "missed";

/** Older than this when opened (e.g. a stale notification tap) → shown as missed right away. */
const STALE_MS = 2 * 60_000;
const RESULT_CLOSE_MS = 3_000;
const MISSED_CLOSE_MS = 6_000;

// iOS incoming-call palette (dark system grays, Apple call red/green).
const BG = "#1C1C1E";
const FG = colors.white;
const FG_MUTED = "#AEAEB2";
const AVATAR_BG = "#636366";
const CALL_RED = "#FF3B30";
const CALL_GREEN = "#34C759";
const AVATAR = 144;
const ROUND_BTN = 84;

function close() {
  if (router.canGoBack()) router.back();
  else router.replace("/");
}

export default function RingScreen() {
  const params = useLocalSearchParams<{ callId?: string | string[] }>();
  const callId = Array.isArray(params.callId) ? params.callId[0] : params.callId;
  const { call, loading } = useCall(callId);
  const { entries: whitelist } = useWhitelist();
  const insets = useSafeAreaInsets();

  const [tapped, setTapped] = useState<Response | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  // Missed after 30 s of ringing (or immediately if the call is long over).
  const hasCall = call != null;
  const startedSec = call?.startedAt ? Math.floor(tsToDate(call.startedAt).getTime() / 1000) : null;
  useEffect(() => {
    if (!hasCall) return;
    const ageMs = startedSec == null ? 0 : Date.now() - startedSec * 1000;
    const t = setTimeout(() => setTimedOut(true), ageMs > STALE_MS ? 0 : RING_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [hasCall, startedSec]);

  let phase: Phase;
  if (tapped) phase = tapped;
  else if (!callId || (!call && !loading)) phase = "notFound";
  else if (!call) phase = "loading";
  else if (call.ownerResponse === "answered") phase = "answered"; // answered earlier / on another phone
  else if (call.ownerResponse === "declined" || call.status !== "forwarded" || call.endedAt || timedOut)
    phase = "missed"; // declined earlier, caller hung up, or nobody tapped in 30 s
  else phase = "ringing";

  useRingtone(phase === "ringing");

  // Result screens close by themselves; "not found" waits for a tap.
  const autoCloseMs =
    phase === "answered" || phase === "declined" ? RESULT_CLOSE_MS : phase === "missed" ? MISSED_CLOSE_MS : null;
  useEffect(() => {
    if (autoCloseMs == null) return;
    const t = setTimeout(close, autoCloseMs);
    return () => clearTimeout(t);
  }, [autoCloseMs]);

  const respond = async (response: Response) => {
    if (!callId || tapped) return;
    setTapped(response); // stops ringing immediately
    const ok = await setOwnerResponse(callId, response);
    if (!ok) setTapped(null); // actions already showed an error Alert → let her try again
  };

  const callerName = (() => {
    if (!call) return "";
    const entry = whitelist.find((w) => w.callerKey === call.callerKey);
    return entry?.displayName || call.callerLabel || formatCallerKey(call.callerKey);
  })();

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: "fullScreenModal",
          animation: "fade",
          gestureEnabled: false,
          contentStyle: { backgroundColor: BG },
        }}
      />
      <StatusBar style="light" />

      {phase === "loading" ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={FG_MUTED} />
        </View>
      ) : phase === "notFound" ? (
        <NotFound />
      ) : phase === "ringing" ? (
        <Ringing name={callerName} onAnswer={() => respond("answered")} onDecline={() => respond("declined")} />
      ) : (
        <Result phase={phase} name={callerName} />
      )}
    </View>
  );
}

// ---------- Ringing ----------

function Ringing({ name, onAnswer, onDecline }: { name: string; onAnswer: () => void; onDecline: () => void }) {
  return (
    <View style={styles.fill}>
      <View style={styles.top}>
        <AppText variant="title" weight="medium" color={FG_MUTED} style={styles.center_text}>
          สายเข้า · KnockFirst
        </AppText>
        <AppText
          variant="display"
          weight="semibold"
          color={FG}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          style={[styles.center_text, styles.name]}
          accessibilityRole="header"
        >
          {name}
        </AppText>
      </View>

      <PulsingAvatar />

      <View style={styles.buttons}>
        <RoundButton
          label="ไม่รับ"
          color={CALL_RED}
          icon="call"
          iconRotate="135deg"
          onPress={onDecline}
          a11y={`ไม่รับสายจาก ${name}`}
        />
        <RoundButton label="รับสาย" color={CALL_GREEN} icon="call" onPress={onAnswer} a11y={`รับสายจาก ${name}`} />
      </View>
    </View>
  );
}

function PulsingAvatar() {
  const reduceMotion = useReducedMotion();
  const ringA = useSharedValue(0);
  const ringB = useSharedValue(0);
  const bob = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    const wave = () => withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1, false);
    ringA.value = wave();
    ringB.value = withDelay(900, wave());
    bob.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 450, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 450, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(ringA);
      cancelAnimation(ringB);
      cancelAnimation(bob);
    };
  }, [reduceMotion, ringA, ringB, bob]);

  const core = useAnimatedStyle(() => ({ transform: [{ scale: 1 + bob.value * 0.06 }] }));

  return (
    <View style={styles.avatarBox} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Wave t={ringA} />
      <Wave t={ringB} />
      <Animated.View style={[styles.avatar, core]}>
        <Ionicons name="person" size={72} color={FG} />
      </Animated.View>
    </View>
  );
}

function Wave({ t }: { t: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({
    opacity: 0.18 * (1 - t.value), // white ripple on the dark background
    transform: [{ scale: 1 + t.value * 0.75 }],
  }));
  return <Animated.View style={[styles.wave, style]} />;
}

function RoundButton({
  label,
  color,
  icon,
  iconRotate,
  onPress,
  a11y,
}: {
  label: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconRotate?: string;
  onPress: () => void;
  a11y: string;
}) {
  return (
    <View style={styles.btnCol}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={a11y}
        hitSlop={12}
        style={({ pressed }) => [styles.roundBtn, { backgroundColor: color }, pressed && styles.pressed]}
      >
        <Ionicons name={icon} size={40} color={FG} style={iconRotate ? { transform: [{ rotate: iconRotate }] } : null} />
      </Pressable>
      <AppText variant="title" weight="medium" color={FG}>
        {label}
      </AppText>
    </View>
  );
}

// ---------- After the call ----------

const RESULT: Record<"answered" | "declined" | "missed", { title: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  answered: { title: "รับสายแล้ว", icon: "checkmark", color: CALL_GREEN },
  declined: { title: "ไม่รับสาย", icon: "close", color: CALL_RED },
  missed: { title: "สายที่ไม่ได้รับ", icon: "call", color: AVATAR_BG },
};

function Result({ phase, name }: { phase: "answered" | "declined" | "missed"; name: string }) {
  const r = RESULT[phase];
  return (
    <View style={[styles.fill, styles.centerCol]}>
      <View style={[styles.resultIcon, { backgroundColor: r.color }]}>
        <Ionicons name={r.icon} size={72} color={FG} />
      </View>
      <AppText variant="display" weight="bold" color={FG} style={styles.center_text} accessibilityRole="header">
        {r.title}
      </AppText>
      {name ? (
        <AppText variant="title" weight="medium" color={FG_MUTED} style={styles.center_text} numberOfLines={2}>
          {name}
        </AppText>
      ) : null}
      {phase !== "missed" ? (
        <AppText variant="body" color={FG_MUTED} style={[styles.center_text, styles.note]}>
          (เดโม: ไม่มีเสียงสนทนาในสายนี้)
        </AppText>
      ) : (
        <CloseButton />
      )}
    </View>
  );
}

function NotFound() {
  return (
    <View style={[styles.fill, styles.centerCol]}>
      <Ionicons name="call" size={56} color={FG_MUTED} />
      <AppText variant="h1" weight="bold" color={FG} style={styles.center_text}>
        ไม่พบสายนี้
      </AppText>
      <AppText variant="large" color={FG_MUTED} style={styles.center_text}>
        สายอาจจบไปแล้ว
      </AppText>
      <CloseButton />
    </View>
  );
}

function CloseButton() {
  return (
    <Pressable
      onPress={close}
      accessibilityRole="button"
      accessibilityLabel="ปิด"
      style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
    >
      <AppText variant="title" weight="medium" color={FG}>
        ปิด
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG, paddingHorizontal: spacing.xl },
  fill: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  centerCol: { alignItems: "center", justifyContent: "center", gap: spacing.lg },
  center_text: { textAlign: "center" },
  top: { alignItems: "center", gap: spacing.md, paddingTop: spacing.xl },
  name: { marginTop: spacing.sm },
  avatarBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: AVATAR_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  wave: {
    position: "absolute",
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: FG,
  },
  buttons: { flexDirection: "row", justifyContent: "space-around", paddingBottom: spacing.xl },
  btnCol: { alignItems: "center", gap: spacing.md },
  roundBtn: {
    width: ROUND_BTN,
    height: ROUND_BTN,
    borderRadius: ROUND_BTN / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.7 },
  resultIcon: {
    width: 128,
    height: 128,
    borderRadius: 64,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  note: { marginTop: spacing.sm },
  closeBtn: {
    marginTop: spacing.xl,
    minWidth: 200,
    minHeight: 64,
    paddingHorizontal: spacing.xxl,
    borderRadius: radii.pill,
    backgroundColor: "#3A3A3C",
    alignItems: "center",
    justifyContent: "center",
  },
});
