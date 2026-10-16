// Grandma-mode ringing screen (update 05). Opened by an owner_ring push tap or by useAutoRing.
// Demo honesty: tapping รับสาย only records ownerResponse; there is no voice line on this phone.
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated as RNAnimated, PanResponder, Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
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

import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { setOwnerResponse } from "@/lib/actions";
import { formatCallerKey } from "@/lib/contract";
import { useCall, useWhitelist } from "@/lib/hooks";
import { useLang, type StrKey } from "@/lib/i18n";
import { RING_TIMEOUT_MS, useRingtone } from "@/lib/ring";
import { tsToDate } from "@/lib/time";
import { AppText } from "@/components";
import { CALL_GRADIENT, CallScreen } from "@/components/call-screen";
import { CALL_WEBVIEW_PROPS, muteJs, resetAudioRoute, setCallRoute, WEB_DEMO_URL, WEB_PRELOAD } from "@/lib/web-call";
import { colors, radii, spacing } from "@/theme";

type Response = "answered" | "declined";
const VOICE_URL = `${WEB_DEMO_URL}#voice/`;
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
// Realistic iOS call look: teal → navy for an incoming call, slate for a live call, frosted round keys.
const RING_GRADIENT = ["#1E5D5A", "#123C52", "#0B2238"] as const;
const GLASS = "rgba(255,255,255,0.16)";
const SKY = "#8FD3FF";
const KNOB = 68;
const TRACK_PAD = 6;
const KEY = 76;
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
  const [inVoice, setInVoice] = useState(false); // live voice page is open on top of this screen

  // Missed after 30 s of ringing (or immediately if the call is long over).
  const hasCall = call != null;
  const startedSec = call?.startedAt ? Math.floor(tsToDate(call.startedAt).getTime() / 1000) : null;
  useEffect(() => {
    if (!hasCall) return;
    const ageMs = startedSec == null ? 0 : Date.now() - startedSec * 1000;
    const timer = setTimeout(() => setTimedOut(true), ageMs > STALE_MS ? 0 : RING_TIMEOUT_MS);
    return () => clearTimeout(timer);
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
  // Not while the voice page is open: closing this modal would dismiss the browser presented on top of it.
  const autoCloseMs = inVoice
    ? null
    : phase === "answered" || phase === "declined" ? RESULT_CLOSE_MS : phase === "missed" ? MISSED_CLOSE_MS : null;
  useEffect(() => {
    if (autoCloseMs == null) return;
    const timer = setTimeout(close, autoCloseMs);
    return () => clearTimeout(timer);
  }, [autoCloseMs]);

  const respond = async (response: Response) => {
    if (!callId || tapped) return;
    setTapped(response); // stops ringing immediately
    if (response === "answered") setInVoice(true); // straight into the call screen
    const ok = await setOwnerResponse(callId, response);
    if (!ok) {
      setTapped(null); // actions already showed an error Alert → let her try again
      setInVoice(false);
    }
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
      {phase === "ringing" || inVoice ? (
        <LinearGradient colors={inVoice ? CALL_GRADIENT : RING_GRADIENT} style={StyleSheet.absoluteFill} />
      ) : null}

      {phase === "loading" ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={FG_MUTED} />
        </View>
      ) : phase === "notFound" ? (
        <NotFound />
      ) : inVoice && callId ? (
        <InCall
          name={callerName}
          callId={callId}
          onEnd={() => {
            setInVoice(false);
            close();
          }}
        />
      ) : phase === "ringing" ? (
        <Ringing name={callerName} onAnswer={() => respond("answered")} onDecline={() => respond("declined")} />
      ) : (
        <Result phase={phase} name={callerName} />
      )}
    </View>
  );
}

// ---------- In call (live voice with the web caller) ----------

// Runs inside the hidden voice page (web demo #voice/<callId>, WebRTC via PeerJS): taps its start button once,
// so grandma never taps twice, and reports the page's status line back to the app.
const VOICE_BRIDGE = `(function () {
  var started = false, last = null;
  setInterval(function () {
    var b = document.querySelector("button"), h = document.querySelector("h1");
    if (!started && b) { started = true; b.click(); }
    var t = h ? h.textContent : "";
    if (t !== last) { last = t; window.ReactNativeWebView.postMessage(t); }
  }, 300);
})(); true;`;
const VOICE_HANG_UP = `(function () { var b = document.querySelector("button"); if (b) b.click(); })(); true;`;

function InCall({ name, callId, onEnd }: { name: string; callId: string; onEnd: () => void }) {
  const { lang } = useLang();
  const th = lang !== "en";
  const web = useRef<WebView>(null);
  const [status, setStatus] = useState<"connecting" | "talking" | "error">("connecting");
  const [since, setSince] = useState<number | null>(null);
  const [speaker, setSpeaker] = useState(false);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setCallRoute(false); // before the page opens the mic
    return resetAudioRoute;
  }, []);

  function onMessage(e: WebViewMessageEvent) {
    const text = e.nativeEvent.data;
    if (text.includes("กำลังคุย")) {
      setStatus("talking");
      setSince((s) => s ?? Date.now());
    } else if (text.includes("วางสาย")) onEnd(); // the caller hung up
    else if (text.includes("ไม่ได้")) setStatus("error");
  }

  function hangUp() {
    web.current?.injectJavaScript(VOICE_HANG_UP); // closes the WebRTC call so the caller's page hears it end
    setTimeout(onEnd, 400);
  }

  return (
    <View style={styles.fill}>
      <WebView
        ref={web}
        source={{ uri: `${VOICE_URL}${callId}` }}
        style={styles.voiceWeb}
        containerStyle={StyleSheet.absoluteFill}
        injectedJavaScriptBeforeContentLoaded={WEB_PRELOAD}
        injectedJavaScript={VOICE_BRIDGE}
        onMessage={onMessage}
        onError={() => setStatus("error")}
        {...CALL_WEBVIEW_PROPS}
      />
      <CallScreen
        name={name}
        status={status === "error" ? (th ? "เชื่อมต่อเสียงไม่ได้" : "Couldn't connect audio") : th ? "กำลังเชื่อมต่อ…" : "Connecting…"}
        since={status === "talking" ? since : null}
        speaker={speaker}
        muted={muted}
        onSpeaker={() => {
          setCallRoute(!speaker);
          setSpeaker(!speaker);
        }}
        onMute={() => {
          web.current?.injectJavaScript(muteJs(!muted));
          setMuted(!muted);
        }}
        onEnd={hangUp}
      />
    </View>
  );
}

// ---------- Ringing ----------

function Ringing({ name, onAnswer, onDecline }: { name: string; onAnswer: () => void; onDecline: () => void }) {
  const { t, lang } = useLang();
  const th = lang !== "en";
  return (
    <View style={styles.fill}>
      <View style={styles.top}>
        <AppText variant="title" weight="medium" color={SKY} style={styles.center_text}>
          {t("ring.incoming")}
        </AppText>
        <AppText
          variant="display"
          weight="semibold"
          color={FG}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          style={styles.center_text}
          accessibilityRole="header"
        >
          {name}
        </AppText>
      </View>

      <View style={styles.flex1} />

      <View style={styles.smallRow}>
        <SmallAction icon="chatbubble" label={th ? "ข้อความ" : "Message"} />
        <SmallAction
          icon="call"
          rotate="135deg"
          label={t("ring.decline")}
          onPress={onDecline}
          a11y={t("ring.declineA11y", { name })}
        />
      </View>

      <SlideToAnswer label={th ? "เลื่อนเพื่อรับสาย" : "slide to answer"} onAnswer={onAnswer} a11y={t("ring.answerA11y", { name })} />
    </View>
  );
}

/** Small frosted action above the slider. No onPress = decorative (dimmed, like iOS). */
function SmallAction({
  icon,
  rotate,
  label,
  onPress,
  a11y,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  rotate?: string;
  label: string;
  onPress?: () => void;
  a11y?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y ?? label}
      accessibilityState={{ disabled: !onPress }}
      style={({ pressed }) => [styles.smallCol, !onPress && styles.dim, pressed && styles.pressedDim]}
    >
      <View style={styles.smallBtn}>
        <Ionicons name={icon} size={22} color={FG} style={rotate ? { transform: [{ rotate }] } : undefined} />
      </View>
      <AppText variant="small" color={FG}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** iOS "slide to answer": drag the white knob to the end. VoiceOver: double-tap answers. */
function SlideToAnswer({ label, onAnswer, a11y }: { label: string; onAnswer: () => void; a11y: string }) {
  const [width, setWidth] = useState(0);
  const max = Math.max(0, width - KNOB - TRACK_PAD * 2);
  const [x] = useState(() => new RNAnimated.Value(0));
  const latest = useRef({ max: 0, onAnswer, done: false });
  useEffect(() => {
    latest.current.max = max;
    latest.current.onAnswer = onAnswer;
  });

  // The handlers only read `latest` when a drag happens, never during render.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, g) => {
        const l = latest.current;
        if (!l.done) x.setValue(Math.min(Math.max(0, g.dx), l.max));
      },
      onPanResponderRelease: (_, g) => {
        const l = latest.current;
        if (l.done) return;
        if (l.max > 0 && g.dx >= l.max * 0.8) {
          l.done = true;
          RNAnimated.timing(x, { toValue: l.max, duration: 120, useNativeDriver: true }).start();
          l.onAnswer();
        } else {
          RNAnimated.spring(x, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    }),
  );

  const labelOpacity = x.interpolate({ inputRange: [0, Math.max(1, max * 0.6)], outputRange: [1, 0], extrapolate: "clamp" });

  return (
    <View
      style={styles.slideTrack}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onAccessibilityTap={onAnswer}
    >
      <RNAnimated.View style={[styles.slideLabel, { opacity: labelOpacity }]} pointerEvents="none">
        <AppText variant="title" weight="medium" color={FG}>
          {label}
        </AppText>
      </RNAnimated.View>
      <RNAnimated.View {...pan.panHandlers} style={[styles.knob, { transform: [{ translateX: x }] }]}>
        <Ionicons name="call" size={30} color={CALL_GREEN} />
      </RNAnimated.View>
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

const RESULT: Record<"answered" | "declined" | "missed", { title: StrKey; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  answered: { title: "ring.answered", icon: "checkmark", color: CALL_GREEN },
  declined: { title: "ring.declined", icon: "close", color: CALL_RED },
  missed: { title: "ring.missed", icon: "call", color: AVATAR_BG },
};

function Result({ phase, name }: { phase: "answered" | "declined" | "missed"; name: string }) {
  const { t } = useLang();
  const r = RESULT[phase];
  return (
    <View style={[styles.fill, styles.centerCol]}>
      <View style={[styles.resultIcon, { backgroundColor: r.color }]}>
        <Ionicons name={r.icon} size={72} color={FG} />
      </View>
      <AppText variant="display" weight="bold" color={FG} style={styles.center_text} accessibilityRole="header">
        {t(r.title)}
      </AppText>
      {name ? (
        <AppText variant="title" weight="medium" color={FG_MUTED} style={styles.center_text} numberOfLines={2}>
          {name}
        </AppText>
      ) : null}
      {phase !== "missed" ? (
        <AppText variant="body" color={FG_MUTED} style={[styles.center_text, styles.note]}>
          {t("ring.demoNote")}
        </AppText>
      ) : (
        <CloseButton />
      )}
    </View>
  );
}

function NotFound() {
  const { t } = useLang();
  return (
    <View style={[styles.fill, styles.centerCol]}>
      <Ionicons name="call" size={56} color={FG_MUTED} />
      <AppText variant="h1" weight="bold" color={FG} style={styles.center_text}>
        {t("ring.notFound")}
      </AppText>
      <AppText variant="large" color={FG_MUTED} style={styles.center_text}>
        {t("ring.notFoundHint")}
      </AppText>
      <CloseButton />
    </View>
  );
}

function CloseButton() {
  const { t } = useLang();
  return (
    <Pressable
      onPress={close}
      accessibilityRole="button"
      accessibilityLabel={t("ring.close")}
      style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
    >
      <AppText variant="title" weight="medium" color={FG}>
        {t("ring.close")}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG, paddingHorizontal: spacing.xl },
  fill: { flex: 1 },
  voiceWeb: { flex: 1, backgroundColor: "transparent" },
  flex1: { flex: 1 },
  dim: { opacity: 0.4 },
  pressedDim: { opacity: 0.6 },
  smallRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  smallCol: { alignItems: "center", gap: spacing.sm, width: 96 },
  smallBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: GLASS, alignItems: "center", justifyContent: "center" },
  slideTrack: {
    height: KNOB + TRACK_PAD * 2,
    borderRadius: (KNOB + TRACK_PAD * 2) / 2,
    backgroundColor: GLASS,
    justifyContent: "center",
    padding: TRACK_PAD,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  slideLabel: { position: "absolute", left: KNOB + TRACK_PAD, right: 0, alignItems: "center" },
  knob: { width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  timerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: CALL_GREEN },
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: spacing.xl, paddingHorizontal: spacing.sm, paddingBottom: spacing.xl },
  keyCol: { width: "33.33%", alignItems: "center", gap: spacing.sm },
  key: { width: KEY, height: KEY, borderRadius: KEY / 2, backgroundColor: GLASS, alignItems: "center", justifyContent: "center" },
  keyActive: { backgroundColor: "#FFFFFF" },
  keyDanger: { backgroundColor: CALL_RED },
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
