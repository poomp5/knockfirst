import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBlocked } from "@/lib/hooks";
import { unblockNumber } from "@/lib/actions";
import { timeAgo } from "@/lib/time";
import { formatCallerKey, type BlockedEntry } from "@/lib/contract";
import { AppText, Banner, EmptyState, ListRow, ListSection, Skeleton } from "@/components";
import { colors, radii, SEPARATOR_INSET, spacing } from "@/theme";

const REASON_LABEL: Record<BlockedEntry["reason"], string> = {
  auto: "บล็อกอัตโนมัติ",
  guardian: "คุณบล็อกเอง",
};

function entryTitle(e: BlockedEntry): string {
  return e.displayName || formatCallerKey(e.callerKey);
}

function BlockedRow({
  entry,
  busy,
  disabled,
  onUnblock,
}: {
  entry: BlockedEntry;
  busy: boolean;
  disabled: boolean;
  onUnblock: (e: BlockedEntry) => void;
}) {
  const isAuto = entry.reason === "auto";
  const title = entryTitle(entry);
  const meta = [
    entry.displayName ? formatCallerKey(entry.callerKey) : null,
    REASON_LABEL[entry.reason] ?? "บล็อกแล้ว",
    timeAgo(entry.addedAt),
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <ListRow
      icon={isAuto ? "shield-checkmark" : "hand-left"}
      iconColor={isAuto ? colors.danger : colors.gray}
      title={title}
      subtitle={meta}
      trailing={
        // App Store-style capsule action
        <Pressable
          onPress={() => onUnblock(entry)}
          disabled={disabled}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`ปลดบล็อก ${title}`}
          style={({ pressed }) => [styles.capsule, pressed && styles.pressed, disabled && !busy && styles.dim]}
        >
          {busy ? (
            <ActivityIndicator size="small" color={colors.brand} />
          ) : (
            <AppText variant="small" weight="semibold" color={colors.brand}>
              ปลดบล็อก
            </AppText>
          )}
        </Pressable>
      }
    />
  );
}

export default function BlockedScreen() {
  const { entries, loading, error } = useBlocked();
  const insets = useSafeAreaInsets();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function confirmUnblock(entry: BlockedEntry) {
    if (busyKey) return;
    const title = entryTitle(entry);
    Alert.alert(
      "ปลดบล็อกเบอร์นี้?",
      `${title} จะโทรเข้ามาได้อีกครั้ง โดย AI จะรับสายและสรุปให้คุณตรวจสอบก่อน`,
      [
        { text: "ยกเลิก", style: "cancel" },
        {
          text: "ปลดบล็อก",
          onPress: async () => {
            setBusyKey(entry.callerKey);
            try {
              const ok = await unblockNumber(entry.callerKey);
              if (ok) setNotice(`ปลดบล็อก ${title} แล้ว`);
            } finally {
              setBusyKey(null);
            }
          },
        },
      ],
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.list, { paddingBottom: spacing.xxl + insets.bottom }]}>
      {notice && <Banner tone="success" text={notice} actionLabel="ปิด" onAction={() => setNotice(null)} />}
      {error && <Banner tone="error" text="โหลดรายการเบอร์ที่บล็อกไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่" />}

      {loading && entries.length === 0 ? (
        <View style={styles.skeletons}>
          <Skeleton height={64} />
          <Skeleton height={64} />
        </View>
      ) : entries.length === 0 ? (
        error ? null : (
          <EmptyState
            icon="hand-left"
            title="ยังไม่มีเบอร์ที่ถูกบล็อก"
            subtitle="เมื่อคุณบล็อกสายแปลก หรือ AI บล็อกสายเสี่ยงสูง จะแสดงที่นี่"
          />
        )
      ) : (
        <ListSection
          header={`${entries.length} เบอร์`}
          footer="เบอร์เหล่านี้จะถูกตัดสายทันที ไม่ถึงผู้สูงอายุ"
          separatorInset={SEPARATOR_INSET}
        >
          {entries.map((item) => (
            <BlockedRow
              key={item.callerKey}
              entry={item}
              busy={busyKey === item.callerKey}
              disabled={busyKey !== null}
              onUnblock={confirmUnblock}
            />
          ))}
        </ListSection>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, gap: spacing.lg, flexGrow: 1 },
  skeletons: { gap: spacing.sm },
  capsule: {
    minWidth: 84,
    minHeight: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.fill,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.5 },
  dim: { opacity: 0.4 },
});
