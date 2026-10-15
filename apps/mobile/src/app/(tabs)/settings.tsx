import { useEffect, useState } from "react";
import {
  Alert,
  AppState,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import Constants from "expo-constants";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFamily } from "@/lib/hooks";
import { updateFamily } from "@/lib/actions";
import { FAMILY_ID, USE_MOCKS } from "@/lib/firebase";
import { useDeviceRole } from "@/lib/role";
import {
  getLastPushToken,
  getPushPermission,
  requestPushPermission,
  scheduleTestNotification,
} from "@/lib/push";
import { AppText, Banner, LargeTitle, ListRow, ListSection, PrimaryButton, Skeleton } from "@/components";
import { colors, fonts, fontSize, SEPARATOR_INSET, spacing, TAP } from "@/theme";

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

/** Grouped-list text field: small grey label above a borderless input (Contacts edit style). */
function Field({
  label,
  helper,
  ...input
}: { label: string; helper?: string } & TextInputProps) {
  return (
    <View style={styles.field}>
      <AppText variant="caption" weight="medium" color={colors.textSubtle}>
        {label}
      </AppText>
      <TextInput placeholderTextColor={colors.textFaint} style={styles.input} {...input} />
      {helper && (
        <AppText variant="caption" color={colors.textSubtle}>
          {helper}
        </AppText>
      )}
    </View>
  );
}

function DevRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.devRow}>
      <AppText variant="caption" color={colors.textSubtle}>
        {label}
      </AppText>
      <AppText variant="small" style={styles.mono} numberOfLines={3} selectable>
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
  const insets = useSafeAreaInsets();

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

  const { role, setRole } = useDeviceRole();
  function switchToGrandma() {
    Alert.alert(
      "เปลี่ยนเป็นโหมดคุณยาย?",
      "เครื่องนี้จะแสดงหน้าจอเรียบง่ายสำหรับคุณยาย และดังเมื่อคนรู้จักโทรมา จะไม่ได้รับแจ้งเตือนสายแปลกอีก",
      [
        { text: "ยกเลิก", style: "cancel" },
        { text: "เปลี่ยน", onPress: () => void setRole("grandma") },
      ],
    );
  }

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
        contentContainerStyle={[styles.content, { paddingTop: insets.top }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <LargeTitle title="ตั้งค่า" />
        {notice && <Banner tone={notice.tone} text={notice.text} />}

        {/* ---------- Family info ---------- */}
        {error && <Banner tone="error" text="โหลดข้อมูลครอบครัวไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่" />}
        {loading && !family ? (
          <View style={styles.skeletons}>
            <Skeleton height={TAP + 20} />
            <Skeleton height={TAP + 20} />
            <Skeleton height={TAP + 20} />
          </View>
        ) : (
          <>
            <ListSection header="ข้อมูลผู้สูงอายุ">
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
                helper="ค่าเริ่มต้น 'เจ้าของเบอร์นี้' เพื่อไม่ให้คนแปลกหน้ารู้ชื่อจริง"
                value={value("ownerLabelForCallers")}
                onChangeText={setField("ownerLabelForCallers")}
                placeholder="เจ้าของเบอร์นี้"
                editable={!saving && !!family}
                maxLength={60}
              />
            </ListSection>

            <ListSection header="ผู้ดูแล">
              <Field
                label="ชื่อผู้ดูแล"
                value={value("guardianName")}
                onChangeText={setField("guardianName")}
                placeholder="เช่น ภูมิ"
                editable={!saving && !!family}
                maxLength={60}
              />
            </ListSection>

            <PrimaryButton
              title={dirty ? "บันทึกการเปลี่ยนแปลง" : "บันทึกแล้ว"}
              onPress={save}
              loading={saving}
              disabled={!dirty || saving}
            />
          </>
        )}

        {/* ---------- Notifications ---------- */}
        <ListSection
          header="การแจ้งเตือน"
          footer="การแจ้งเตือนจริงจากเซิร์ฟเวอร์ใช้ได้ในแอปที่ติดตั้งจาก APK เท่านั้น (ไม่ใช่ Expo Go)"
          separatorInset={SEPARATOR_INSET}
        >
          <ListRow
            icon="notifications"
            iconColor={colors.danger}
            title="สถานะการแจ้งเตือน"
            value={perm ? PERM_LABEL[perm] : "กำลังตรวจสอบ…"}
            valueColor={perm === "granted" ? colors.success : perm ? colors.warning : colors.textSubtle}
          />
          <ListRow
            icon="call"
            iconColor={colors.switchOn}
            title="แจ้งเตือนทันทีเมื่อมีสายแปลก"
            subtitle="เด้งเตือนระหว่างที่ AI รับสาย แล้วเปลี่ยนเป็นสรุปเมื่อวางสาย"
            trailing={
              <Switch
                value={notifyLive}
                onValueChange={toggleLive}
                disabled={liveBusy || !family}
                trackColor={{ true: colors.switchOn, false: colors.fill }}
                thumbColor={colors.white}
                ios_backgroundColor={colors.fill}
                accessibilityLabel="แจ้งเตือนทันทีเมื่อมีสายแปลกโทรเข้า"
              />
            }
          />
          {perm && perm !== "granted" ? (
            <ListRow
              icon="notifications-outline"
              iconColor={colors.brand}
              title={permBusy ? "กำลังขออนุญาต…" : "ขออนุญาตแจ้งเตือน"}
              titleColor={colors.brand}
              onPress={askPermission}
              disabled={permBusy}
              chevron={false}
            />
          ) : null}
          <ListRow
            icon="paper-plane"
            iconColor={colors.blue}
            title={testBusy ? "กำลังส่ง…" : "ทดสอบการแจ้งเตือน"}
            onPress={testNotification}
            disabled={testBusy}
          />
        </ListSection>

        {/* ---------- Device role (update 05) ---------- */}
        <ListSection
          header="โหมดของเครื่องนี้"
          footer="เครื่องของคุณยายจะดังเมื่อคนในรายชื่อที่อนุญาตโทรมา ส่วนสายแปลก AI จะรับแทนและแจ้งเครื่องลูกหลาน"
          separatorInset={SEPARATOR_INSET}
        >
          <ListRow
            icon="phone-portrait"
            iconColor={colors.indigo}
            title="เครื่องนี้เป็นของ"
            value={role === "grandma" ? "คุณยาย" : "ลูกหลาน (ผู้ดูแล)"}
          />
          <ListRow
            icon="swap-horizontal"
            iconColor={colors.brand}
            title="เปลี่ยนเป็นเครื่องของคุณยาย"
            titleColor={colors.brand}
            onPress={switchToGrandma}
            chevron={false}
          />
        </ListSection>

        {/* ---------- About ---------- */}
        <ListSection header="เกี่ยวกับ" separatorInset={SEPARATOR_INSET}>
          <ListRow
            icon="information"
            iconColor={colors.gray}
            title="เวอร์ชันแอป"
            value={version}
            onPress={tapVersion}
            chevron={false}
            accessibilityLabel={`เวอร์ชัน ${version}`}
          />
          {WEB_DEMO_URL ? (
            <ListRow icon="globe" iconColor={colors.blue} title="เปิดเว็บเดโม" onPress={() => openUrl(WEB_DEMO_URL)} />
          ) : null}
          <ListRow icon="logo-github" iconColor={colors.ink} title="ซอร์สโค้ดบน GitHub" onPress={() => openUrl(REPO_URL)} />
        </ListSection>

        {/* ---------- Hidden dev section ---------- */}
        {devOpen && (
          <ListSection header="สำหรับนักพัฒนา" separatorInset={SEPARATOR_INSET}>
            <DevRow label="FAMILY_ID" value={FAMILY_ID} />
            <DevRow label="USE_MOCKS" value={String(USE_MOCKS)} />
            <DevRow label="EXPO_PUBLIC_SERVER_URL" value={SERVER_URL} />
            <DevRow label="Push token (FCM)" value={token ?? "ยังไม่มี (Expo Go / ไม่ได้อนุญาต / ไม่ใช่ Android)"} />
            <ListRow
              icon="copy"
              iconColor={colors.blue}
              title="คัดลอก token"
              onPress={copyToken}
              disabled={!token}
              chevron={false}
            />
            <ListRow
              icon="refresh"
              iconColor={colors.gray}
              title="รีเฟรช token"
              onPress={() => setToken(getLastPushToken())}
              chevron={false}
            />
            <ListRow title="ซ่อนส่วนนี้" titleColor={colors.brand} onPress={() => setVersionTaps(0)} chevron={false} />
          </ListSection>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl * 2, gap: spacing.xl },
  skeletons: { gap: spacing.sm },
  field: { paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: spacing.sm, backgroundColor: colors.card },
  input: {
    minHeight: 36,
    paddingVertical: 4,
    paddingHorizontal: 0,
    fontFamily: fonts.regular,
    fontSize: fontSize.body,
    color: colors.text,
  },
  devRow: { gap: 2, paddingHorizontal: spacing.lg, paddingVertical: 10, backgroundColor: colors.card },
  mono: { fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }) },
});
