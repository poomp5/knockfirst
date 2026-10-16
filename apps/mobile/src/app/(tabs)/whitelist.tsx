import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useWhitelist } from "@/lib/hooks";
import { addToWhitelist, removeFromWhitelist } from "@/lib/actions";
import { formatCallerKey, toCallerKey, type WhitelistEntry } from "@/lib/contract";
import { useLang, type StrKey } from "@/lib/i18n";
import { AppText, Banner, EmptyState, LargeTitle, ListRow, ListSection, Skeleton } from "@/components";
import { colors, fonts, fontSize, radii, spacing, TAP } from "@/theme";

const MIN_DIGITS = 9;

function digitCount(s: string): number {
  return (s.match(/\d/g) ?? []).length;
}

/** First Thai consonant / Latin letter of a name, for the Contacts-style monogram (skips leading vowels เ แ โ ใ ไ). */
function monogram(name: string): string {
  const ch = name.replace(/^[\sเแโใไ]+/, "").charAt(0);
  return /\d|\+/.test(ch) || !ch ? "" : ch.toUpperCase();
}

function Avatar({ name }: { name: string }) {
  const m = monogram(name);
  return (
    <View style={styles.avatar}>
      {m ? (
        <AppText variant="body" weight="semibold" color={colors.white}>
          {m}
        </AppText>
      ) : (
        <Ionicons name="person" size={20} color={colors.white} />
      )}
    </View>
  );
}

function sourceLabel(entry: WhitelistEntry): StrKey | null {
  if (entry.addedBy === "seed") return "whitelist.source.seed";
  if (entry.addedBy === "contacts") return "whitelist.source.contacts";
  if (entry.addedBy === "guardian" && entry.sourceCallId) return "whitelist.source.call";
  return null;
}

function EntryRow({
  entry,
  removing,
  onRemove,
}: {
  entry: WhitelistEntry;
  removing: boolean;
  onRemove: (e: WhitelistEntry) => void;
}) {
  const { t } = useLang();
  const name = entry.displayName || formatCallerKey(entry.callerKey);
  const sourceKey = sourceLabel(entry);
  const source = sourceKey ? t(sourceKey) : null;
  return (
    <ListRow
      leading={<Avatar name={entry.displayName ?? ""} />}
      title={name}
      subtitle={[formatCallerKey(entry.callerKey), source].filter(Boolean).join(" · ")}
      onLongPress={() => onRemove(entry)}
      disabled={removing}
      accessibilityHint={t("whitelist.removeHint")}
      trailing={
        <Pressable
          onPress={() => onRemove(entry)}
          disabled={removing}
          hitSlop={8}
          style={({ pressed }) => [styles.trash, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={t("whitelist.removeA11y", { name })}
        >
          <Ionicons name="remove-circle" size={24} color={removing ? colors.textFaint : colors.danger} />
        </Pressable>
      }
    />
  );
}

export default function WhitelistScreen() {
  const { entries, loading, error } = useWhitelist();
  const { t } = useLang();
  const insets = useSafeAreaInsets();
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function openModal() {
    setName("");
    setPhone("");
    setFormError(null);
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
  }

  async function submit() {
    if (saving) return;
    const raw = phone.trim();
    if (digitCount(raw) < MIN_DIGITS) {
      setFormError(t("whitelist.minDigits", { n: MIN_DIGITS }));
      return;
    }
    setFormError(null);
    const displayName = name.trim() || formatCallerKey(toCallerKey(raw));
    setSaving(true);
    try {
      const ok = await addToWhitelist(displayName, raw);
      if (ok) {
        setModalOpen(false);
        setNotice(t("whitelist.added", { name: displayName }));
      }
    } finally {
      setSaving(false);
    }
  }

  function confirmRemove(entry: WhitelistEntry) {
    if (removingKey) return;
    const label = entry.displayName || formatCallerKey(entry.callerKey);
    Alert.alert(
      t("whitelist.removeTitle"),
      t("whitelist.removeBody", { name: label, number: formatCallerKey(entry.callerKey) }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("whitelist.remove"),
          style: "destructive",
          onPress: async () => {
            setRemovingKey(entry.callerKey);
            try {
              const ok = await removeFromWhitelist(entry.callerKey);
              if (ok) setNotice(t("whitelist.removed", { name: label }));
            } finally {
              setRemovingKey(null);
            }
          },
        },
      ],
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.list, { paddingTop: insets.top, paddingBottom: spacing.xxl + insets.bottom }]}>
        <LargeTitle
          title={t("whitelist.title")}
          right={
            <Pressable
              onPress={openModal}
              hitSlop={8}
              style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={t("whitelist.addNumber")}
            >
              <Ionicons name="add" size={24} color={colors.white} />
            </Pressable>
          }
        />

        {notice && <Banner tone="success" text={notice} actionLabel={t("whitelist.close")} onAction={() => setNotice(null)} />}
        {error && <Banner tone="error" text={t("whitelist.loadError")} />}

        {loading && entries.length === 0 ? (
          <View style={styles.skeletons}>
            <Skeleton height={60} />
            <Skeleton height={60} />
            <Skeleton height={60} />
          </View>
        ) : entries.length === 0 ? (
          error ? null : (
            <EmptyState
              icon="people"
              title={t("whitelist.empty.title")}
              subtitle={t("whitelist.empty.subtitle")}
            />
          )
        ) : (
          <ListSection
            header={t("whitelist.count", { n: entries.length })}
            footer={t("whitelist.footer")}
            separatorInset={spacing.lg + 40 + spacing.md}
          >
            {entries.map((item) => (
              <EntryRow
                key={item.callerKey}
                entry={item}
                removing={removingKey === item.callerKey}
                onRemove={confirmRemove}
              />
            ))}
          </ListSection>
        )}

        <ListSection>
          <ListRow
            icon="hand-left"
            iconColor={colors.danger}
            title={t("whitelist.blockedLink")}
            onPress={() => router.push("/blocked")}
          />
        </ListSection>
      </ScrollView>

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={closeModal}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeModal} accessibilityLabel={t("whitelist.close")} />
          <Animated.View
            entering={SlideInDown.duration(300)}
            style={[styles.sheet, { paddingBottom: spacing.xl + insets.bottom }]}
          >
            <View style={styles.grabber} />
            <View style={styles.sheetBar}>
              <Pressable onPress={closeModal} disabled={saving} hitSlop={8} style={styles.barButton} accessibilityRole="button">
                <AppText variant="body" color={colors.brand}>
                  {t("common.cancel")}
                </AppText>
              </Pressable>
              <AppText variant="body" weight="semibold" style={styles.sheetTitle} numberOfLines={1}>
                {t("whitelist.sheetTitle")}
              </AppText>
              <Pressable
                onPress={submit}
                disabled={saving}
                hitSlop={8}
                style={[styles.barButton, styles.barButtonRight]}
                accessibilityRole="button"
              >
                {saving ? (
                  <ActivityIndicator color={colors.brand} />
                ) : (
                  <AppText variant="body" weight="semibold" color={colors.brand}>
                    {t("whitelist.add")}
                  </AppText>
                )}
              </Pressable>
            </View>

            <ListSection footer={formError ?? t("whitelist.sheetFooter")}>
              <View style={styles.inputRow}>
                <AppText variant="body" style={styles.inputLabel}>
                  {t("whitelist.nameLabel")}
                </AppText>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder={t("whitelist.namePlaceholder")}
                  placeholderTextColor={colors.textFaint}
                  style={styles.input}
                  returnKeyType="next"
                  editable={!saving}
                  maxLength={60}
                />
              </View>
              <View style={styles.inputRow}>
                <AppText variant="body" style={styles.inputLabel} color={formError ? colors.danger : colors.text}>
                  {t("whitelist.phoneLabel")}
                </AppText>
                <TextInput
                  value={phone}
                  onChangeText={(v) => {
                    setPhone(v);
                    if (formError) setFormError(null);
                  }}
                  placeholder="08x-xxx-xxxx"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                  autoComplete="tel"
                  style={styles.input}
                  editable={!saving}
                  maxLength={20}
                  onSubmitEditing={submit}
                />
              </View>
            </ListSection>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { paddingHorizontal: spacing.lg, gap: spacing.xl, flexGrow: 1 },
  skeletons: { gap: spacing.sm },
  pressed: { opacity: 0.5 },
  addButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginBottom: spacing.sm,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray,
    alignItems: "center",
    justifyContent: "center",
  },
  trash: { width: TAP, height: TAP, alignItems: "center", justifyContent: "center", marginRight: -spacing.sm },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  grabber: {
    alignSelf: "center",
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.textFaint,
    marginTop: spacing.sm,
  },
  sheetBar: { flexDirection: "row", alignItems: "center", minHeight: TAP },
  sheetTitle: { flex: 1, textAlign: "center" },
  barButton: { minWidth: 72, minHeight: TAP, justifyContent: "center" },
  barButtonRight: { alignItems: "flex-end" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: TAP + 4,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.card,
  },
  inputLabel: { width: 72 },
  input: {
    flex: 1,
    minHeight: TAP,
    fontFamily: fonts.regular,
    fontSize: fontSize.body,
    color: colors.text,
  },
});
