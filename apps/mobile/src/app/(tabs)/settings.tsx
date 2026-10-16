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
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFamily } from "@/lib/hooks";
import { updateFamily } from "@/lib/actions";
import { FAMILY_ID, USE_MOCKS } from "@/lib/firebase";
import { useDeviceRole } from "@/lib/role";
import { t as tNow, useLang, type StrKey } from "@/lib/i18n";
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

const REPO_URL = "https://github.com/poomp5/knockfirst";
const WEB_DEMO_URL = "https://knockfirst.pranakorn.co.th/";
const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL ?? "";
const DEV_TAPS = 7;
const DEFAULT_OWNER_LABEL = "เจ้าของเบอร์นี้";

const PERM_LABEL: Record<PermStatus, StrKey> = {
  granted: "settings.perm.granted",
  denied: "settings.perm.denied",
  undetermined: "settings.perm.undetermined",
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
    Alert.alert(tNow("settings.openLinkFailed"), url);
  }
}

export default function SettingsScreen() {
  const { family, loading, error } = useFamily();
  const { t, lang, setLang } = useLang();
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
      t("settings.toGrandma.title"),
      t("settings.toGrandma.body"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("settings.switch"), onPress: () => void setRole("grandma") },
      ],
    );
  }
  function switchToCaller() {
    Alert.alert(t("settings.toCaller.title"), t("settings.toCaller.body"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("settings.switch"), onPress: () => void setRole("caller") },
    ]);
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
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
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
      Alert.alert(t("settings.ownerNameRequired"));
      return;
    }
    if (patch.ownerLabelForCallers === "") patch.ownerLabelForCallers = DEFAULT_OWNER_LABEL; // data the Thai AI speaks, not UI
    setSaving(true);
    try {
      const ok = await updateFamily(patch);
      if (ok) {
        setDraft({});
        setNotice({ tone: "success", text: t("settings.saved") });
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
        setNotice({ tone: "success", text: t("settings.notifEnabled") });
      } else {
        Alert.alert(
          t("settings.notAllowed.title"),
          t("settings.notAllowed.body"),
          [
            { text: t("settings.later"), style: "cancel" },
            { text: t("settings.openSettings"), onPress: () => Linking.openSettings().catch(() => {}) },
          ],
        );
      }
    } catch (e) {
      console.error("request push permission failed", e);
      setNotice({ tone: "error", text: t("settings.askFailed") });
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
    if (ok) setNotice({ tone: "success", text: next ? t("settings.liveOnNotice") : t("settings.liveOffNotice") });
  }

  async function testNotification() {
    if (testBusy) return;
    setTestBusy(true);
    try {
      await scheduleTestNotification();
      setNotice({ tone: "info", text: t("settings.testScheduled") });
    } catch (e) {
      console.error("test notification failed", e);
      setNotice({ tone: "error", text: t("settings.testFailed") });
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
      setNotice({ tone: "info", text: t("settings.devOn") });
    }
  }

  async function copyToken() {
    const tok = token ?? getLastPushToken();
    if (!tok) return;
    try {
      await Clipboard.setStringAsync(tok);
      setNotice({ tone: "success", text: t("settings.tokenCopied") });
    } catch (e) {
      console.error("copy failed", e);
      setNotice({ tone: "error", text: t("settings.copyFailed") });
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
        <LargeTitle title={t("settings.title")} />
        {notice && <Banner tone={notice.tone} text={notice.text} />}

        {/* ---------- Language ---------- */}
        <ListSection header={t("settings.lang.header")} separatorInset={SEPARATOR_INSET}>
          {(["th", "en"] as const).map((l) => (
            <ListRow
              key={l}
              icon="language"
              iconColor={colors.blue}
              title={l === "th" ? "ไทย" : "English"}
              onPress={() => void setLang(l)}
              trailing={lang === l ? <Ionicons name="checkmark" size={22} color={colors.brand} /> : undefined}
              chevron={false}
              accessibilityLabel={l === "th" ? "ไทย" : "English"}
            />
          ))}
        </ListSection>

        {/* ---------- Family info ---------- */}
        {error && <Banner tone="error" text={t("settings.familyLoadError")} />}
        {loading && !family ? (
          <View style={styles.skeletons}>
            <Skeleton height={TAP + 20} />
            <Skeleton height={TAP + 20} />
            <Skeleton height={TAP + 20} />
          </View>
        ) : (
          <>
            <ListSection header={t("settings.elder.header")}>
              <Field
                label={t("settings.elder.name")}
                value={value("ownerName")}
                onChangeText={setField("ownerName")}
                placeholder={t("settings.elder.namePlaceholder")}
                editable={!saving && !!family}
                maxLength={60}
              />
              <Field
                label={t("settings.elder.phone")}
                helper={t("settings.elder.phoneHelper")}
                value={value("ownerPhone")}
                onChangeText={setField("ownerPhone")}
                placeholder="+66812345678"
                keyboardType="phone-pad"
                editable={!saving && !!family}
                maxLength={20}
              />
              <Field
                label={t("settings.elder.label")}
                helper={t("settings.elder.labelHelper")}
                value={value("ownerLabelForCallers")}
                onChangeText={setField("ownerLabelForCallers")}
                placeholder={t("settings.elder.labelPlaceholder")}
                editable={!saving && !!family}
                maxLength={60}
              />
            </ListSection>

            <ListSection header={t("settings.guardian.header")}>
              <Field
                label={t("settings.guardian.name")}
                value={value("guardianName")}
                onChangeText={setField("guardianName")}
                placeholder={t("settings.guardian.namePlaceholder")}
                editable={!saving && !!family}
                maxLength={60}
              />
            </ListSection>

            <PrimaryButton
              title={dirty ? t("settings.saveChanges") : t("settings.saved")}
              onPress={save}
              loading={saving}
              disabled={!dirty || saving}
            />
          </>
        )}

        {/* ---------- Notifications ---------- */}
        <ListSection
          header={t("settings.notif.header")}
          footer={t("settings.notif.footer")}
          separatorInset={SEPARATOR_INSET}
        >
          <ListRow
            icon="notifications"
            iconColor={colors.danger}
            title={t("settings.notif.status")}
            value={perm ? t(PERM_LABEL[perm]) : t("settings.perm.checking")}
            valueColor={perm === "granted" ? colors.success : perm ? colors.warning : colors.textSubtle}
          />
          <ListRow
            icon="call"
            iconColor={colors.switchOn}
            title={t("settings.notif.live")}
            subtitle={t("settings.notif.liveSub")}
            trailing={
              <Switch
                value={notifyLive}
                onValueChange={toggleLive}
                disabled={liveBusy || !family}
                trackColor={{ true: colors.switchOn, false: colors.fill }}
                thumbColor={colors.white}
                ios_backgroundColor={colors.fill}
                accessibilityLabel={t("settings.notif.liveA11y")}
              />
            }
          />
          {perm && perm !== "granted" ? (
            <ListRow
              icon="notifications-outline"
              iconColor={colors.brand}
              title={permBusy ? t("settings.asking") : t("settings.askPermission")}
              titleColor={colors.brand}
              onPress={askPermission}
              disabled={permBusy}
              chevron={false}
            />
          ) : null}
          <ListRow
            icon="paper-plane"
            iconColor={colors.blue}
            title={testBusy ? t("settings.sending") : t("settings.testNotification")}
            onPress={testNotification}
            disabled={testBusy}
          />
        </ListSection>

        {/* ---------- Device role (update 05) ---------- */}
        <ListSection
          header={t("settings.role.header")}
          footer={t("settings.role.footer")}
          separatorInset={SEPARATOR_INSET}
        >
          <ListRow
            icon="phone-portrait"
            iconColor={colors.indigo}
            title={t("settings.role.owner")}
            value={role === "grandma" ? t("settings.roleGrandma") : t("settings.roleGuardian")}
          />
          <ListRow
            icon="swap-horizontal"
            iconColor={colors.brand}
            title={t("settings.role.toGrandma")}
            titleColor={colors.brand}
            onPress={switchToGrandma}
            chevron={false}
          />
          <ListRow
            icon="call"
            iconColor={colors.blue}
            title={t("settings.role.toCaller")}
            titleColor={colors.brand}
            onPress={switchToCaller}
            chevron={false}
          />
        </ListSection>

        {/* ---------- About ---------- */}
        <ListSection header={t("settings.about.header")} separatorInset={SEPARATOR_INSET}>
          <ListRow
            icon="information"
            iconColor={colors.gray}
            title={t("settings.about.version")}
            value={version}
            onPress={tapVersion}
            chevron={false}
            accessibilityLabel={t("settings.versionA11y", { version })}
          />
          {WEB_DEMO_URL ? (
            <ListRow icon="globe" iconColor={colors.blue} title={t("settings.about.webDemo")} onPress={() => openUrl(WEB_DEMO_URL)} />
          ) : null}
          <ListRow icon="logo-github" iconColor={colors.ink} title={t("settings.about.github")} onPress={() => openUrl(REPO_URL)} />
        </ListSection>

        {/* ---------- Hidden dev section ---------- */}
        {devOpen && (
          <ListSection header={t("settings.dev.header")} separatorInset={SEPARATOR_INSET}>
            <DevRow label="FAMILY_ID" value={FAMILY_ID} />
            <DevRow label="USE_MOCKS" value={String(USE_MOCKS)} />
            <DevRow label="EXPO_PUBLIC_SERVER_URL" value={SERVER_URL} />
            <DevRow label="Push token (FCM)" value={token ?? t("settings.dev.noToken")} />
            <ListRow
              icon="copy"
              iconColor={colors.blue}
              title={t("settings.dev.copy")}
              onPress={copyToken}
              disabled={!token}
              chevron={false}
            />
            <ListRow
              icon="refresh"
              iconColor={colors.gray}
              title={t("settings.dev.refresh")}
              onPress={() => setToken(getLastPushToken())}
              chevron={false}
            />
            <ListRow title={t("settings.dev.hide")} titleColor={colors.brand} onPress={() => setVersionTaps(0)} chevron={false} />
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
