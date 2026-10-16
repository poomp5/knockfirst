// iOS 26-style in-call screen (timer, name, six glass keys, keypad, "More" sheet). Used by grandma's ring
// screen and the stranger phone. The screen that hosts it draws CALL_GRADIENT behind it, edge to edge.
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useLang } from "@/lib/i18n";
import { spacing } from "@/theme";
import { AppText } from "./app-text";

export const CALL_GRADIENT = ["#5D5C54", "#4C3E39", "#443A45", "#2E2B34"] as const;

const FG = "#FFFFFF";
const FG_DIM = "#B4B2B5";
const GLASS = "rgba(255,255,255,0.16)";
const GLASS_EDGE = "rgba(255,255,255,0.28)";
const END_RED = "#D33A30";
const MUTE_RED = "#E5484D";
const KEY = 84;

const DIGITS: readonly (readonly [string, string])[] = [
  ["1", ""], ["2", "ABC"], ["3", "DEF"],
  ["4", "GHI"], ["5", "JKL"], ["6", "MNO"],
  ["7", "PQRS"], ["8", "TUV"], ["9", "WXYZ"],
  ["*", ""], ["0", "+"], ["#", ""],
];

function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

/** 12-key phone keypad (digits with letters), glass keys. */
export function KeypadGrid({ onKey }: { onKey: (digit: string) => void }) {
  return (
    <View style={styles.grid}>
      {DIGITS.map(([d, letters]) => (
        <View key={d} style={styles.keyCol}>
          <Pressable
            onPress={() => onKey(d)}
            accessibilityRole="button"
            accessibilityLabel={d}
            style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
          >
            <AppText style={styles.digit} color={FG}>
              {d}
            </AppText>
            {letters ? (
              <AppText style={styles.letters} color={FG}>
                {letters}
              </AppText>
            ) : null}
          </Pressable>
        </View>
      ))}
    </View>
  );
}

function CallKey({
  icon,
  rotate,
  label,
  active,
  activeColor = "#1C1C1E",
  danger,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  rotate?: string;
  label: string;
  active?: boolean;
  activeColor?: string;
  danger?: boolean;
  onPress?: () => void;
}) {
  return (
    <View style={styles.keyCol}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={active === undefined ? "button" : "switch"}
        accessibilityLabel={label}
        accessibilityState={{ disabled: !onPress, checked: active }}
        style={({ pressed }) => [
          styles.key,
          active && styles.keyActive,
          danger && styles.keyDanger,
          pressed && styles.keyPressed,
        ]}
      >
        <Ionicons
          name={icon}
          size={32}
          color={active ? activeColor : FG}
          style={rotate ? { transform: [{ rotate }] } : undefined}
        />
      </Pressable>
      <AppText variant="body" color={FG} style={styles.keyLabel}>
        {label}
      </AppText>
    </View>
  );
}

function MoreSheet({ th, onClose }: { th: boolean; onClose: () => void }) {
  const rows: { icon: keyof typeof Ionicons.glyphMap; tint: string; title: string; sub?: string }[] = [
    { icon: "person-add", tint: "#0A9DF0", title: th ? "เพิ่มผู้คน" : "Add People" },
    { icon: "person", tint: "#4B4A5A", title: th ? "บัตรรายชื่อ" : "Contact Card" },
    {
      icon: "radio-button-on",
      tint: "#FF3B30",
      title: th ? "บันทึกเสียงขณะโทร" : "Call Recording",
      sub: th ? "บันทึกเสียงและบันทึกสำหรับภายหลัง" : "Record audio and notes for later",
    },
  ];
  return (
    <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={th ? "ปิด" : "Close"}>
      <View style={styles.sheet}>
        {rows.map((r, i) => (
          <Pressable key={r.title} onPress={onClose} style={[styles.sheetRow, i === 2 && styles.sheetRowSep]}>
            <View style={[styles.sheetIcon, { backgroundColor: r.tint }]}>
              <Ionicons name={r.icon} size={24} color={FG} />
            </View>
            <View style={styles.flex1}>
              <AppText variant="large" weight="semibold" color={FG}>
                {r.title}
              </AppText>
              {r.sub ? (
                <AppText variant="small" color={FG_DIM}>
                  {r.sub}
                </AppText>
              ) : null}
            </View>
          </Pressable>
        ))}
      </View>
    </Pressable>
  );
}

export interface CallScreenProps {
  /** Who is on the other end (big white title). */
  name: string;
  /** Shown where the timer goes until the call is live ("Calling…", an error…). */
  status: string;
  /** When the call went live; null shows `status` instead of the timer. */
  since: number | null;
  subtitle?: string;
  speaker: boolean;
  muted: boolean;
  onSpeaker: () => void;
  onMute: () => void;
  onEnd: () => void;
}

export function CallScreen({ name, status, since, subtitle, speaker, muted, onSpeaker, onMute, onEnd }: CallScreenProps) {
  const { lang } = useLang();
  const th = lang !== "en";
  const [panel, setPanel] = useState<"keys" | "keypad">("keys");
  const [more, setMore] = useState(false);
  const [typed, setTyped] = useState("");
  const now = useNow(since != null);

  const secs = since == null ? 0 : Math.max(0, Math.floor((now - since) / 1000));
  const clock = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
  const title = panel === "keypad" && typed ? typed : name;

  return (
    <View style={styles.fill}>
      <View style={[styles.header, more && styles.faded]}>
        <AppText style={styles.status} weight="semibold" color={FG_DIM}>
          {since != null ? clock : status}
        </AppText>
        <AppText
          style={styles.name}
          weight="bold"
          color={FG}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
          accessibilityRole="header"
        >
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="body" color={FG_DIM} style={styles.center}>
            {subtitle}
          </AppText>
        ) : null}
      </View>

      <View style={styles.flex1} />

      {panel === "keypad" ? (
        <>
          <KeypadGrid onKey={(d) => setTyped((t) => (t + d).slice(-16))} />
          <View style={styles.endRow}>
            <View style={styles.keyCol} />
            <View style={styles.keyCol}>
              <Pressable
                onPress={onEnd}
                accessibilityRole="button"
                accessibilityLabel={th ? "วางสาย" : "End"}
                style={({ pressed }) => [styles.key, styles.keyDanger, pressed && styles.keyPressed]}
              >
                <Ionicons name="call" size={32} color={FG} style={styles.endIcon} />
              </Pressable>
            </View>
            <Pressable style={styles.keyCol} onPress={() => setPanel("keys")} accessibilityRole="button">
              <AppText variant="body" color={FG}>
                {th ? "ซ่อนแป้นตัวเลข" : "Hide"}
              </AppText>
            </Pressable>
          </View>
        </>
      ) : (
        <View style={[styles.grid, styles.gridBottom]}>
          <CallKey icon="volume-high" label={th ? "ลำโพง" : "Speaker"} active={speaker} onPress={onSpeaker} />
          <CallKey icon="videocam" label="FaceTime" />
          <CallKey icon="mic-off" label={th ? "ปิดเสียง" : "Mute"} active={muted} activeColor={MUTE_RED} onPress={onMute} />
          <CallKey icon="ellipsis-horizontal" label={th ? "เพิ่มเติม" : "More"} onPress={() => setMore(true)} />
          <CallKey icon="call" rotate="135deg" label={th ? "วางสาย" : "End"} danger onPress={onEnd} />
          <CallKey icon="keypad" label={th ? "แป้นตัวเลข" : "Keypad"} onPress={() => setPanel("keypad")} />
        </View>
      )}

      {more ? <MoreSheet th={th} onClose={() => setMore(false)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex1: { flex: 1 },
  center: { textAlign: "center" },
  header: { alignItems: "center", gap: spacing.xs, paddingTop: spacing.xxl, paddingHorizontal: spacing.lg },
  faded: { opacity: 0.45 },
  status: { fontSize: 24, lineHeight: 32, fontVariant: ["tabular-nums"] },
  name: { fontSize: 44, lineHeight: 54, textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: spacing.lg, paddingHorizontal: spacing.md },
  gridBottom: { paddingBottom: spacing.xl, rowGap: spacing.xl },
  keyCol: { width: "33.33%", alignItems: "center", gap: spacing.sm },
  key: {
    width: KEY,
    height: KEY,
    borderRadius: KEY / 2,
    backgroundColor: GLASS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_EDGE,
    alignItems: "center",
    justifyContent: "center",
  },
  keyPressed: { opacity: 0.6 },
  keyActive: { backgroundColor: "#FFFFFF" },
  keyDanger: { backgroundColor: END_RED, borderColor: END_RED },
  keyLabel: { textAlign: "center" },
  digit: { fontSize: 38, lineHeight: 44 },
  letters: { fontSize: 11, lineHeight: 14, letterSpacing: 2, fontWeight: "600" },
  endRow: { flexDirection: "row", alignItems: "center", paddingTop: spacing.lg, paddingBottom: spacing.xl, paddingHorizontal: spacing.md },
  endIcon: { transform: [{ rotate: "135deg" }] },
  sheet: {
    position: "absolute",
    left: spacing.sm,
    right: spacing.sm,
    bottom: spacing.sm,
    backgroundColor: "rgba(44,42,52,0.97)",
    borderRadius: 36,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  sheetRow: { flexDirection: "row", alignItems: "center", gap: spacing.lg, paddingVertical: spacing.md },
  sheetRowSep: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(255,255,255,0.18)", marginTop: spacing.sm, paddingTop: spacing.lg },
  sheetIcon: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
});
