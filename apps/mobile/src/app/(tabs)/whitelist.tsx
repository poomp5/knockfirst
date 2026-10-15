import { useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useWhitelist } from "@/lib/hooks";
import { addToWhitelist, removeFromWhitelist } from "@/lib/actions";
import { formatCallerKey, toCallerKey, type WhitelistEntry } from "@/lib/contract";
import { AppText, Banner, Card, EmptyState, PrimaryButton, Skeleton } from "@/components";
import { colors, fonts, fontSize, radii, spacing, TAP, cardStyle } from "@/theme";

const MIN_DIGITS = 9;

function digitCount(s: string): number {
  return (s.match(/\d/g) ?? []).length;
}

function Badge({ text, tone }: { text: string; tone: "neutral" | "success" }) {
  const bg = tone === "success" ? colors.successSoft : colors.bubbleAssistant;
  const fg = tone === "success" ? colors.success : colors.textMuted;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <AppText variant="caption" weight="medium" color={fg}>
        {text}
      </AppText>
    </View>
  );
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
  const fromCall = entry.addedBy === "guardian" && !!entry.sourceCallId;
  return (
    <Pressable
      onLongPress={() => onRemove(entry)}
      delayLongPress={400}
      disabled={removing}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed, removing && styles.rowDisabled]}
      accessibilityRole="button"
      accessibilityHint="กดค้างเพื่อลบออกจากรายชื่อ"
    >
      <View style={styles.avatar}>
        <Ionicons name="person" size={22} color={colors.brand} />
      </View>
      <View style={styles.rowBody}>
        <AppText variant="large" weight="semibold" numberOfLines={1}>
          {entry.displayName || formatCallerKey(entry.callerKey)}
        </AppText>
        <AppText variant="small" color={colors.textMuted} numberOfLines={1}>
          {formatCallerKey(entry.callerKey)}
        </AppText>
        {(entry.addedBy === "seed" || fromCall || entry.addedBy === "contacts") && (
          <View style={styles.badgeRow}>
            {entry.addedBy === "seed" && <Badge text="ค่าเริ่มต้น" tone="neutral" />}
            {fromCall && <Badge text="จากสายที่อนุญาต" tone="success" />}
            {entry.addedBy === "contacts" && <Badge text="จากรายชื่อติดต่อ" tone="neutral" />}
          </View>
        )}
      </View>
      <Pressable
        onPress={() => onRemove(entry)}
        disabled={removing}
        hitSlop={8}
        style={({ pressed }) => [styles.trash, pressed && { backgroundColor: colors.dangerSoft }]}
        accessibilityRole="button"
        accessibilityLabel={`ลบ ${entry.displayName} ออกจากรายชื่อ`}
      >
        <Ionicons name="trash-outline" size={22} color={removing ? colors.textSubtle : colors.danger} />
      </Pressable>
    </Pressable>
  );
}

export default function WhitelistScreen() {
  const { entries, loading, error } = useWhitelist();
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
      setFormError(`กรุณากรอกเบอร์โทรอย่างน้อย ${MIN_DIGITS} หลัก`);
      return;
    }
    setFormError(null);
    const displayName = name.trim() || formatCallerKey(toCallerKey(raw));
    setSaving(true);
    try {
      const ok = await addToWhitelist(displayName, raw);
      if (ok) {
        setModalOpen(false);
        setNotice(`เพิ่ม ${displayName} แล้ว โทรเข้ามาจะต่อสายถึงทันที`);
      }
    } finally {
      setSaving(false);
    }
  }

  function confirmRemove(entry: WhitelistEntry) {
    if (removingKey) return;
    const label = entry.displayName || formatCallerKey(entry.callerKey);
    Alert.alert(
      "ลบออกจากรายชื่อที่อนุญาต?",
      `${label} (${formatCallerKey(entry.callerKey)}) จะต้องผ่าน AI รับสายก่อนในครั้งถัดไป`,
      [
        { text: "ยกเลิก", style: "cancel" },
        {
          text: "ลบ",
          style: "destructive",
          onPress: async () => {
            setRemovingKey(entry.callerKey);
            try {
              const ok = await removeFromWhitelist(entry.callerKey);
              if (ok) setNotice(`ลบ ${label} ออกแล้ว`);
            } finally {
              setRemovingKey(null);
            }
          },
        },
      ],
    );
  }

  const header = (
    <View style={styles.header}>
      <AppText variant="body" color={colors.textMuted}>
        เบอร์ในรายชื่อนี้จะต่อสายถึงผู้สูงอายุทันที ไม่ต้องผ่าน AI
      </AppText>
      <PrimaryButton title="+ เพิ่มเบอร์" onPress={openModal} />
      {notice && <Banner tone="success" text={notice} actionLabel="ปิด" onAction={() => setNotice(null)} />}
      {error && <Banner tone="error" text="โหลดรายชื่อไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่" />}
    </View>
  );

  const footer = (
    <Pressable
      onPress={() => router.push("/blocked")}
      style={({ pressed }) => [styles.footerLink, pressed && styles.rowPressed]}
      accessibilityRole="link"
    >
      <Ionicons name="ban-outline" size={20} color={colors.textMuted} />
      <AppText variant="body" weight="medium" color={colors.textMuted} style={styles.footerText}>
        ดูเบอร์ที่ถูกบล็อก
      </AppText>
      <Ionicons name="chevron-forward" size={20} color={colors.textSubtle} />
    </Pressable>
  );

  return (
    <View style={styles.screen}>
      {loading && entries.length === 0 ? (
        <View style={styles.list}>
          {header}
          <Card style={styles.skeletonCard}>
            <Skeleton height={56} />
            <Skeleton height={56} />
            <Skeleton height={56} />
          </Card>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e) => e.callerKey}
          contentContainerStyle={styles.list}
          ListHeaderComponent={header}
          ListFooterComponent={footer}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListEmptyComponent={
            error ? null : (
              <EmptyState
                title="ยังไม่มีเบอร์ที่อนุญาต"
                subtitle="เพิ่มเบอร์ลูกหลานหรือคนที่ไว้ใจ เพื่อให้โทรถึงได้ทันที"
              />
            )
          }
          renderItem={({ item }) => (
            <EntryRow entry={item} removing={removingKey === item.callerKey} onRemove={confirmRemove} />
          )}
        />
      )}

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={closeModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.backdrop}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={closeModal} accessibilityLabel="ปิด" />
          <View style={styles.sheet}>
            <AppText variant="title" weight="bold">
              เพิ่มเบอร์ที่อนุญาต
            </AppText>

            <View style={styles.field}>
              <AppText variant="small" weight="medium" color={colors.textMuted}>
                ชื่อ
              </AppText>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="เช่น ลูกสาว, หลานชาย"
                placeholderTextColor={colors.textSubtle}
                style={styles.input}
                returnKeyType="next"
                editable={!saving}
                maxLength={60}
              />
            </View>

            <View style={styles.field}>
              <AppText variant="small" weight="medium" color={colors.textMuted}>
                เบอร์โทร
              </AppText>
              <TextInput
                value={phone}
                onChangeText={(t) => {
                  setPhone(t);
                  if (formError) setFormError(null);
                }}
                placeholder="08x-xxx-xxxx"
                placeholderTextColor={colors.textSubtle}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                style={[styles.input, formError && styles.inputError]}
                editable={!saving}
                maxLength={20}
                onSubmitEditing={submit}
              />
              {formError && (
                <AppText variant="small" color={colors.danger}>
                  {formError}
                </AppText>
              )}
            </View>

            <View style={styles.sheetActions}>
              <View style={styles.flex1}>
                <PrimaryButton title="ยกเลิก" variant="ghost" onPress={closeModal} disabled={saving} />
              </View>
              <View style={styles.flex1}>
                <PrimaryButton title="บันทึก" onPress={submit} loading={saving} disabled={saving} />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl, flexGrow: 1 },
  header: { gap: spacing.md, marginBottom: spacing.lg },
  skeletonCard: { padding: spacing.lg, gap: spacing.md },
  row: {
    ...cardStyle,
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    paddingLeft: spacing.lg,
    gap: spacing.md,
    minHeight: 72,
  },
  rowPressed: { opacity: 0.7 },
  rowDisabled: { opacity: 0.5 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  rowBody: { flex: 1, gap: 2 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.xs },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.pill },
  trash: {
    width: TAP,
    height: TAP,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  footerLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: TAP,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
  },
  footerText: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(17,17,17,0.45)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  field: { gap: spacing.xs },
  input: {
    minHeight: TAP,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.regular,
    fontSize: fontSize.large,
    color: colors.text,
    backgroundColor: colors.bg,
  },
  inputError: { borderColor: colors.danger },
  sheetActions: { flexDirection: "row", gap: spacing.md },
  flex1: { flex: 1 },
});
