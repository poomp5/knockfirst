// Stranger mode (demo): this phone plays the caller, entirely in the app. An iOS-style keypad dials grandma's
// number; the call itself runs on the web demo's caller page in a hidden web view (ElevenLabs for unknown
// numbers, live voice to grandma's phone for known ones), driven from here and reporting its state back.
import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { useDeviceRole } from "@/lib/role";
import { useLang } from "@/lib/i18n";
import { CALL_WEBVIEW_PROPS, muteJs, resetAudioRoute, setCallRoute, WEB_DEMO_URL, WEB_PRELOAD } from "@/lib/web-call";
import { AppText } from "@/components";
import { CALL_GRADIENT, CallScreen, KeypadGrid } from "@/components/call-screen";
import { spacing, TAP } from "@/theme";

const FG = "#FFFFFF";
const FG_DIM = "#B4B2B5";
const GLASS = "rgba(255,255,255,0.16)";
const CALL_GREEN = "#34C759";
const KNOWN_CALLER = "0811112222"; // seeded on grandma's known-callers list

type Role = "family" | "rider" | "police" | "clinic";
const ROLES: { id: Role; th: string; en: string; hintTh: string; hintEn: string }[] = [
  {
    id: "family",
    th: "หลานชาย (คนรู้จัก)",
    en: "Grandson (known)",
    hintTh: "เบอร์นี้อยู่ในรายชื่อคนรู้จัก เครื่องคุณยายจะดัง แล้วคุยกันได้จริง",
    hintEn: "On grandma's known list: her phone rings and you really talk.",
  },
  {
    id: "rider",
    th: "ไรเดอร์",
    en: "Rider",
    hintTh: "ลองพูด: “สวัสดีครับ ไรเดอร์ Flash มาส่งพัสดุ อยู่หน้าบ้านแล้วครับ”",
    hintEn: "Try: “Hi, I'm a Flash rider with a parcel. I'm at the gate.”",
  },
  {
    id: "police",
    th: "ตำรวจปลอม",
    en: "Fake police",
    hintTh: "ลองพูด: “ผมเป็นเจ้าหน้าที่ตำรวจไซเบอร์ มีคดีเกี่ยวกับหลานของคุณครับ”",
    hintEn: "Try: “This is the cyber police. There's a case about your grandson.”",
  },
  {
    id: "clinic",
    th: "คลินิก",
    en: "Clinic",
    hintTh: "ลองพูด: “คลินิกทันตกรรมโทรมาเลื่อนนัดค่ะ”",
    hintEn: "Try: “The dental clinic calling to move an appointment.”",
  },
];

/** "0812345678" → "081-234-5678" (partial input too). */
function formatNumber(d: string): string {
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}

function randomStranger(): string {
  const second = ["6", "8", "9"][Math.floor(Math.random() * 3)];
  let rest = "";
  for (let i = 0; i < 8; i++) rest += Math.floor(Math.random() * 10);
  return `0${second}${rest}`;
}

// Reports the caller page's state (dial-state--<phase>, its status line, any error) whenever it changes.
const CALLER_BRIDGE = `(function () {
  var last = "";
  setInterval(function () {
    var st = document.querySelector(".dial-state");
    var m = st ? /dial-state--(\\w+)/.exec(st.className) : null;
    var err = document.querySelector(".note--error p");
    var msg = JSON.stringify({ ready: !!document.querySelector(".dial-btn"), phase: m ? m[1] : "", error: err ? err.textContent : "" });
    if (msg !== last) { last = msg; window.ReactNativeWebView.postMessage(msg); }
  }, 250);
})(); true;`;

/** Types the number into the caller page (React-controlled input) and presses "Call grandma". */
const dialJs = (number: string) => `(function () {
  var i = document.querySelector(".field--number input");
  if (i) {
    var set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    set.call(i, ${JSON.stringify(number)});
    i.dispatchEvent(new Event("input", { bubbles: true }));
  }
  setTimeout(function () {
    var b = document.querySelector(".dial-btn");
    if (b && !b.classList.contains("dial-btn--hang")) b.click();
  }, 150);
})(); true;`;
const HANG_UP_JS = `(function () { var b = document.querySelector(".dial-btn--hang"); if (b) b.click(); })(); true;`;

type PagePhase =
  | "" | "idle" | "dialing" | "connecting" | "talking" | "ended"
  | "ringing" | "answered" | "declined" | "noAnswer" | "blocked";
type PageState = { ready: boolean; phase: PagePhase; error: string };

const LIVE: PagePhase[] = ["talking", "answered"];
const FINAL: PagePhase[] = ["ended", "declined", "noAnswer", "blocked"];

export default function CallerHome() {
  const insets = useSafeAreaInsets();
  const { setRole } = useDeviceRole();
  const { lang } = useLang();
  const th = lang !== "en";
  const web = useRef<WebView>(null);

  const [role, setRoleId] = useState<Role>("family");
  const [digits, setDigits] = useState(KNOWN_CALLER);
  const [page, setPage] = useState<PageState>({ ready: false, phase: "", error: "" });
  const [inCall, setInCall] = useState(false);
  const [started, setStarted] = useState(false); // the page has left "idle" for this call
  const [since, setSince] = useState<number | null>(null);
  const [speaker, setSpeaker] = useState(false);
  const [muted, setMuted] = useState(false);

  const live = LIVE.includes(page.phase);
  const final = FINAL.includes(page.phase) || (started && page.phase === "idle") || (inCall && !!page.error && !live);

  // Final → show the outcome for a moment, then back to the keypad.
  useEffect(() => {
    if (!inCall || !final) return;
    const id = setTimeout(() => {
      setInCall(false);
      setStarted(false);
      setSince(null);
      setMuted(false);
      setSpeaker(false);
      resetAudioRoute();
    }, 1800);
    return () => clearTimeout(id);
  }, [inCall, final]);

  function onMessage(e: WebViewMessageEvent) {
    try {
      const next = JSON.parse(e.nativeEvent.data) as PageState;
      setPage(next);
      if (next.phase && next.phase !== "idle") setStarted(true);
      if (LIVE.includes(next.phase)) setSince((t) => t ?? Date.now()); // the clock starts when the line goes live
    } catch {
      /* not ours */
    }
  }

  function pickRole(r: Role) {
    setRoleId(r);
    if (r === "family") setDigits(KNOWN_CALLER);
    else if (digits === KNOWN_CALLER || digits.length < 9) setDigits(randomStranger());
    Haptics.selectionAsync().catch(() => {});
  }

  function press(d: string) {
    if (!/[0-9]/.test(d)) return;
    setDigits((v) => (v + d).slice(0, 10));
  }

  function call() {
    if (!page.ready || digits.length < 9) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setCallRoute(false); // earpiece, set before the page opens the mic
    setStarted(false);
    setSince(null);
    setInCall(true);
    web.current?.injectJavaScript(dialJs(formatNumber(digits)));
  }

  function hangUp() {
    web.current?.injectJavaScript(HANG_UP_JS);
  }

  function switchMode() {
    Alert.alert(th ? "เปลี่ยนโหมด" : "Switch mode", th ? "เปลี่ยนเครื่องนี้เป็นโหมดไหน?" : "Which mode for this phone?", [
      { text: th ? "ลูกหลาน (ผู้ดูแล)" : "Guardian", onPress: () => void setRole("guardian") },
      { text: th ? "คุณยาย (เจ้าของเบอร์)" : "Grandma", onPress: () => void setRole("grandma") },
      { text: th ? "ยกเลิก" : "Cancel", style: "cancel" },
    ]);
  }

  const status = (() => {
    if (page.error && !live) return page.error;
    switch (page.phase) {
      case "ringing":
        return th ? "กำลังเรียก…" : "Ringing…";
      case "connecting":
        return th ? "กำลังต่อสาย…" : "Connecting…";
      case "blocked":
        return th ? "เบอร์นี้ถูกบล็อก" : "This number is blocked";
      case "declined":
        return th ? "คุณยายไม่รับสาย" : "Grandma declined";
      case "noAnswer":
        return th ? "ไม่มีผู้รับสาย" : "No answer";
      case "ended":
        return th ? "วางสายแล้ว" : "Call ended";
      default:
        return th ? "กำลังโทร…" : "Calling…";
    }
  })();
  const subtitle =
    page.phase === "talking" ? (th ? "ผู้ช่วย AI ของ KnockFirst รับสายแทนคุณยาย" : "KnockFirst's AI answered for grandma") : undefined;
  const hint = ROLES.find((r) => r.id === role)!;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <LinearGradient colors={CALL_GRADIENT} style={StyleSheet.absoluteFill} />
      {/* The caller page, preloaded, invisible, behind the UI (it must stay "visible" to iOS to keep the mic). */}
      <WebView
        ref={web}
        source={{ uri: WEB_DEMO_URL }}
        style={styles.web}
        containerStyle={StyleSheet.absoluteFill}
        injectedJavaScriptBeforeContentLoaded={WEB_PRELOAD}
        injectedJavaScript={CALLER_BRIDGE}
        onMessage={onMessage}
        {...CALL_WEBVIEW_PROPS}
      />

      <View style={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.sm }]}>
        {inCall ? (
          <CallScreen
            name={th ? "คุณยาย" : "Grandma"}
            status={status}
            since={live ? since : null}
            subtitle={subtitle}
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
        ) : (
          <View style={styles.fill}>
            <View style={styles.topBar}>
              <Pressable onPress={switchMode} hitSlop={12} accessibilityRole="button" style={styles.switchLink}>
                <AppText variant="body" color={FG}>
                  {th ? "เปลี่ยนโหมด" : "Switch mode"}
                </AppText>
              </Pressable>
            </View>

            <View style={styles.header}>
              <AppText variant="body" color={FG_DIM}>
                {th ? "คุณคือคนแปลกหน้า · โทรหาคุณยาย" : "You're the stranger · calling grandma"}
              </AppText>
              <AppText style={styles.number} weight="semibold" color={FG} numberOfLines={1} adjustsFontSizeToFit>
                {formatNumber(digits) || " "}
              </AppText>
            </View>

            <View style={styles.roles}>
              {ROLES.map((r) => {
                const on = r.id === role;
                return (
                  <Pressable
                    key={r.id}
                    onPress={() => pickRole(r.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    style={[styles.chip, on && styles.chipOn]}
                  >
                    <AppText variant="small" weight="semibold" color={on ? "#1C1C1E" : FG}>
                      {th ? r.th : r.en}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
            <AppText variant="small" color={FG_DIM} style={styles.hint}>
              {th ? hint.hintTh : hint.hintEn}
            </AppText>

            <View style={styles.fill} />
            <KeypadGrid onKey={press} />

            <View style={styles.dialRow}>
              <View style={styles.dialSide} />
              <Pressable
                onPress={call}
                disabled={!page.ready || digits.length < 9}
                accessibilityRole="button"
                accessibilityLabel={th ? "โทรหาคุณยาย" : "Call grandma"}
                style={({ pressed }) => [styles.callBtn, (!page.ready || digits.length < 9) && styles.dim, pressed && styles.pressed]}
              >
                <Ionicons name="call" size={36} color={FG} />
              </Pressable>
              <View style={styles.dialSide}>
                {digits ? (
                  <Pressable
                    onPress={() => setDigits((v) => v.slice(0, -1))}
                    onLongPress={() => setDigits("")}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel={th ? "ลบ" : "Delete"}
                  >
                    <Ionicons name="backspace" size={30} color={FG} />
                  </Pressable>
                ) : null}
              </View>
            </View>
            {!page.ready ? (
              <AppText variant="small" color={FG_DIM} style={styles.hint}>
                {th ? "กำลังเตรียมสาย…" : "Getting the line ready…"}
              </AppText>
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: CALL_GRADIENT[3] },
  web: { flex: 1, backgroundColor: "transparent" },
  content: { flex: 1 },
  fill: { flex: 1 },
  topBar: { flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: spacing.lg },
  switchLink: { minHeight: TAP, justifyContent: "center", paddingHorizontal: spacing.sm },
  header: { alignItems: "center", gap: spacing.xs, paddingTop: spacing.lg, paddingHorizontal: spacing.lg },
  number: { fontSize: 40, lineHeight: 50, fontVariant: ["tabular-nums"] },
  roles: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  chip: { backgroundColor: GLASS, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  chipOn: { backgroundColor: "#FFFFFF" },
  hint: { textAlign: "center", paddingHorizontal: spacing.xl, marginTop: spacing.sm },
  dialRow: { flexDirection: "row", alignItems: "center", paddingTop: spacing.lg, paddingBottom: spacing.md },
  dialSide: { flex: 1, alignItems: "center" },
  callBtn: { width: 84, height: 84, borderRadius: 42, backgroundColor: CALL_GREEN, alignItems: "center", justifyContent: "center" },
  dim: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
});
