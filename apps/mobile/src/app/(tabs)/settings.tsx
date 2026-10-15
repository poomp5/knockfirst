import { useEffect, useState } from "react";
import {
  Alert,
  AppState,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import Constants from "expo-constants";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { useFamily } from "@/lib/hooks";
import { updateFamily } from "@/lib/actions";
import { FAMILY_ID, USE_MOCKS } from "@/lib/firebase";
import {
  getLastPushToken,
  getPushPermission,
  requestPushPermission,
  scheduleTestNotification,
} from "@/lib/push";
import { AppText, Banner, Card, PrimaryButton, SectionHeader, Skeleton } from "@/components";
import { colors, fonts, fontSize, radii, spacing, TAP } from "@/theme";

type FormKey = "ownerName" | "ownerPhone" | "ownerLabelForCallers" | "guardianName";
type Draft = Partial<Record<FormKey, string>>;
type PermStatus = "granted" | "denied" | "undetermined";

const REPO_URL = "https://github.com/poomp5/u-hackathon";
const WEB_DEMO_URL = process.env.EXPO_PUBLIC_WEB_DEMO_URL ?? "";
const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL ?? "";
const DEV_TAPS = 7;

const PERM_LABEL: Record<PermStatus, string> = {
  granted: "เปิดอยู่",
  denied: "ถูกปิดไว้",
  undetermined: "ยังไม่ได้ขออนุญาต",
};

function Field({
  label,
  helper,
  ...input
}: { label: string; helper?: string } & TextInputProps) {
  return (
    <View style={styles.field}>
      <AppText variant="small" weight="medium" color={colors.textMuted}>
        {label}
      </AppText>
      <TextInput placeholderTextColor={colors.textSubtle} style={styles.input} {...input} />
      {helper && (
        <AppText variant="caption" color={colors.textSubtle}>
          {helper}
        </AppText>
      )}
    </View>
  );
}

function LinkRow({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
      accessibilityRole="link"
    >
      <Ionicons name={icon} size={22} color={colors.brand} />
      <AppText variant="body" weight="medium" style={styles.flex1}>
        {label}
      </AppText>
      <Ionicons name="open-outline" size={18} color={colors.textSubtle} />
    </Pressable>
  );
}

function DevRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.devRow}>
      <AppText variant="caption" color={colors.textSubtle}>
        {label}
      </AppText>
      <AppText variant="small" style={styles.mono} numberOfLines={3}>
        {value || "—"}
      </AppText>
    </View>
  );
}

async function openUrl(url: string) {
  try {
    await Linking.openURL(url);
  } catch (e) {
    console.error("open url failed", e);
    Alert.alert("เปิดลิงก์ไม่สำเร็จ", url);
  }
}

export default function SettingsScreen() {
  const { family, loading, error } = useFamily();

  // Form: drafts override the live family doc; untouched fields always show the latest value.
  const [draft, setDraft] = useState<Draft>({});
  const [saving, setSaving] = useState(false);

  const [perm, setPerm] = useState<PermStatus | null>(null);
  const [permBusy, setPermBusy] = useState(false);
  const [testBusy, setTestBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "info" | "error"; text: string } | null>(null);

  const [versionTaps, setVersionTaps] = useState(0);
  const devOpen = versionTaps >= DEV_TAPS;
  const [token, setToken] = useState<string | null>(null);

  const version = Constants.expoConfig?.version ?? "—";

  // Permission status: on mount and whenever the app returns to foreground (user may change it in system settings).
  useEffect(() => {
    let alive = true;
    const refresh = () => {
      getPushPermission()
        .then((s) => alive && setPerm(s))
        .catch(() => alive && setPerm("undetermined"));
    };
    refresh();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") refresh();
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  // Auto-hide the feedback banner.
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const value = (k: FormKey): string => draft[k] ?? family?.[k] ?? "";
  const setField = (k: FormKey) => (text: string) => setDraft((d) => ({ ...d, [k]: text }));

  const changedPatch: Draft = {};
  for (const k of Object.keys(draft) as FormKey[]) {
    const v = draft[k]?.trim();
    if (v !== undefined && v !== (family?.[k] ?? "")) changedPatch[k] = v;
  }
  const dirty = Object.keys(changedPatch).length > 0;

  async function save() {
    if (!dirty || saving) return;
    const patch: Draft = { ...changedPatch };
    if (patch.ownerName === "") {
      Alert.alert("กรุณากรอกชื่อผู้สูงอายุ");
      return;
    }
    if (patch.ownerLabelForCallers === "") patch.ownerLabelForCallers = "เจ้าของเบอร์นี้";
    setSaving(true);
    try {
      const ok = await updateFamily(patch);
      if (ok) {
        setDraft({});
        setNotice({ tone: "success", text: "บันทึกแล้ว" });
      }
    } finally {
      setSaving(false);
    }
  }

  async function askPermission() {
    if (permBusy) return;
    setPermBusy(true);
    try {
      const granted = await requestPushPermission();
      const s = await getPushPermission().catch(() => (granted ? "granted" : "denied") as PermStatus);
      setPerm(s);
      if (granted) {
        setNotice({ tone: "success", text: "เปิดการแจ้งเตือนแล้ว" });
      } else {
        Alert.alert(
          "ยังไม่ได้รับอนุญาต",
          "เปิดการแจ้งเตือนของ KnockFirst ในการตั้งค่าเครื่อง เพื่อรับแจ้งเมื่อมีสายแปลก",
          [
            { text: "ไว้ทีหลัง", style: "cancel" },
            { text: "เปิดการตั้งค่า", onPress: () => Linking.openSettings().catch(() => {}) },
          ],
        );
      }
    } catch (e) {
      console.error("request push permission failed", e);
      setNotice({ tone: "error", text: "ขออนุญาตแจ้งเตือนไม่สำเร็จ" });
    } finally {
      setPermBusy(false);
    }
  }

  // contract v2: missing notifyOnIncoming means "on"
  const [liveBusy, setLiveBusy] = useState(false);
  const notifyLive = family?.notifyOnIncoming !== false;
  async function toggleLive(next: boolean) {
    if (liveBusy || !family) return;
    setLiveBusy(true);
    const ok = await updateFamily({ notifyOnIncoming: next });
    setLiveBusy(false);
    if (ok) setNotice({ tone: "success", text: next ? "จะแจ้งเตือนทันทีเมื่อมีสายแปลกโทรเข้า" : "ปิดการแจ้งเตือนระหว่างสายแล้ว" });
  }

  async function testNotification() {
    if (testBusy) return;
    setTestBusy(true);
    try {
      await scheduleTestNotification();
      setNotice({ tone: "info", text: "จะมีการแจ้งเตือนทดสอบเด้งขึ้นใน 2 วินาที" });
    } catch (e) {
      console.error("test notification failed", e);
      setNotice({ tone: "error", text: "ส่งการแจ้งเตือนทดสอบไม่สำเร็จ" });
    } finally {
      setTestBusy(false);
    }
  }

  function tapVersion() {
    if (devOpen) return;
    const next = versionTaps + 1;
    setVersionTaps(next);
    if (next === DEV_TAPS) {
      setToken(getLastPushToken());
      setNotice({ tone: "info", text: "เปิดโหมดนักพัฒนาแล้ว" });
    }
  }

  async function copyToken() {
    const t = token ?? getLastPushToken();
    if (!t) return;
    try {
      await Clipboard.setStringAsync(t);
      setNotice({ tone: "success", text: "คัดลอก push token แล้ว" });
    } catch (e) {
      console.error("copy failed", e);
      setNotice({ tone: "error", text: "คัดลอกไม่สำเร็จ" });
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {notice && <Banner tone={notice.tone} text={notice.text} />}

        {/* ---------- Family info ---------- */}
        <SectionHeader title="ข้อมูลผู้สูงอายุ" />
        {error && <Banner tone="error" text="โหลดข้อมูลครอบครัวไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่" />}
        {loading && !family ? (
          <Card style={styles.card}>
            <Skeleton height={TAP} />
            <Skeleton height={TAP} />
            <Skeleton height={TAP} />
          </Card>
        ) : (
          <>
            <Card style={styles.card}>
              <Field
                label="ชื่อผู้สูงอายุ"
                value={value("ownerName")}
                onChangeText={setField("ownerName")}
                placeholder="เช่น คุณยายสมศรี"
                editable={!saving && !!family}
                maxLength={60}
              />
              <Field
                label="เบอร์โทรจริงของผู้สูงอายุ"
                helper="เบอร์นี้จะดังเมื่อคนที่อนุญาตไว้โทรเข้ามา"
                value={value("ownerPhone")}
                onChangeText={setField("ownerPhone")}
                placeholder="+66812345678"
                keyboardType="phone-pad"
                editable={!saving && !!family}
                maxLength={20}
              />
              <Field
                label="ชื่อที่ AI ใช้เรียกตอนรับสาย"
                helper="AI จะเรียกชื่อนี้ตอนรับสาย ค่าเริ่มต้น 'เจ้าของเบอร์นี้' เพื่อไม่ให้คนแปลกหน้ารู้ชื่อจริง"
                value={value("ownerLabelForCallers")}
                onChangeText={setField("ownerLabelForCallers")}
                placeholder="เจ้าของเบอร์นี้"
                editable={!saving && !!family}
                maxLength={60}
              />
            </Card>

            <SectionHeader title="ผู้ดูแล" />
            <Card style={styles.card}>
              <Field
                label="ชื่อผู้ดูแล"
                value={value("guardianName")}
                onChangeText={setField("guardianName")}
                placeholder="เช่น ภูมิ"
                editable={!saving && !!family}
                maxLength={60}
              />
            </Card>

            <PrimaryButton
              title={dirty ? "บันทึกการเปลี่ยนแปลง" : "บันทึกแล้ว"}
              icon="save-outline"
              onPress={save}
              loading={saving}
              disabled={!dirty || saving}
            />
          </>
        )}

        {/* ---------- Notifications ---------- */}
        <SectionHeader title="การแจ้งเตือน" />
        <Card style={styles.card}>
          <View style={styles.statusRow}>
            <Ionicons
              name={perm === "granted" ? "notifications" : "notifications-off-outline"}
              size={22}
              color={perm === "granted" ? colors.success : colors.warning}
            />
            <AppText variant="body" style={styles.flex1}>
              สถานะการแจ้งเตือน
            </AppText>
            <AppText
              variant="body"
              weight="semibold"
              color={perm === "granted" ? colors.success : perm ? colors.warning : colors.textSubtle}
            >
              {perm ? PERM_LABEL[perm] : "กำลังตรวจสอบ…"}
            </AppText>
          </View>
          <View style={styles.statusRow}>
            <Ionicons name="call-outline" size={22} color={colors.brand} />
            <View style={styles.flex1}>
              <AppText variant="body">แจ้งเตือนทันทีเมื่อมีสายแปลกโทรเข้า</AppText>
              <AppText variant="caption" color={colors.textSubtle}>
                เด้งเตือนระหว่างที่ AI กำลังรับสาย แล้วเปลี่ยนเป็นสรุปเมื่อวางสาย
              </AppText>
            </View>
            <Switch
              value={notifyLive}
              onValueChange={toggleLive}
              disabled={liveBusy || !family}
              trackColor={{ true: colors.brand, false: colors.divider }}
              thumbColor={colors.white}
              accessibilityLabel="แจ้งเตือนทันทีเมื่อมีสายแปลกโทรเข้า"
            />
          </View>
          {perm && perm !== "granted" && (
            <PrimaryButton
              title="ขออนุญาตแจ้งเตือน"
              icon="notifications-outline"
              onPress={askPermission}
              loading={permBusy}
              disabled={permBusy}
            />
          )}
          <PrimaryButton
            title="ทดสอบการแจ้งเตือน"
            variant="secondary"
            icon="paper-plane-outline"
            onPress={testNotification}
            loading={testBusy}
            disabled={testBusy}
          />
          <AppText variant="caption" color={colors.textSubtle}>
            การแจ้งเตือนจริงจากเซิร์ฟเวอร์ใช้ได้ในแอปที่ติดตั้งจาก APK เท่านั้น (ไม่ใช่ Expo Go)
          </AppText>
        </Card>

        {/* ---------- About ---------- */}
        <SectionHeader title="เกี่ยวกับ" />
        <Card style={styles.cardTight}>
          <Pressable
            onPress={tapVersion}
            style={styles.linkRow}
            accessibilityRole="text"
            accessibilityLabel={`เวอร์ชัน ${version}`}
          >
            <Ionicons name="information-circle-outline" size={22} color={colors.textMuted} />
            <AppText variant="body" style={styles.flex1}>
              เวอร์ชันแอป
            </AppText>
            <AppText variant="body" weight="medium" color={colors.textMuted}>
              {version}
            </AppText>
          </Pressable>
          {!!WEB_DEMO_URL && (
            <>
              <View style={styles.divider} />
              <LinkRow icon="globe-outline" label="เปิดเว็บเดโม" onPress={() => openUrl(WEB_DEMO_URL)} />
            </>
          )}
          <View style={styles.divider} />
          <LinkRow icon="logo-github" label="ซอร์สโค้ดบน GitHub" onPress={() => openUrl(REPO_URL)} />
        </Card>

        {/* ---------- Hidden dev section ---------- */}
        {devOpen && (
          <>
            <SectionHeader title="สำหรับนักพัฒนา" />
            <Card style={styles.card}>
              <DevRow label="FAMILY_ID" value={FAMILY_ID} />
              <DevRow label="USE_MOCKS" value={String(USE_MOCKS)} />
              <DevRow label="EXPO_PUBLIC_SERVER_URL" value={SERVER_URL} />
              <DevRow label="Push token (FCM)" value={token ?? "ยังไม่มี (Expo Go / ไม่ได้อนุญาต / ไม่ใช่ Android)"} />
              <View style={styles.devActions}>
                <View style={styles.flex1}>
                  <PrimaryButton
                    title="คัดลอก token"
                    variant="secondary"
                    icon="copy-outline"
                    onPress={copyToken}
                    disabled={!token}
                  />
                </View>
                <View style={styles.flex1}>
                  <PrimaryButton
                    title="รีเฟรช"
                    variant="ghost"
                    icon="refresh"
                    onPress={() => setToken(getLastPushToken())}
                  />
                </View>
              </View>
              <PrimaryButton title="ซ่อนส่วนนี้" variant="ghost" onPress={() => setVersionTaps(0)} />
            </Card>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl * 2, gap: spacing.md },
  card: { padding: spacing.lg, gap: spacing.lg },
  cardTight: { paddingVertical: spacing.xs, paddingHorizontal: spacing.lg },
  field: { gap: spacing.xs },
  input: {
    minHeight: TAP,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.regular,
    fontSize: fontSize.body,
    color: colors.text,
    backgroundColor: colors.bg,
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: TAP },
  linkRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: TAP + 4 },
  pressed: { opacity: 0.6 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.divider },
  devRow: { gap: 2 },
  mono: { fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }) },
  devActions: { flexDirection: "row", gap: spacing.md },
  flex1: { flex: 1 },
});
