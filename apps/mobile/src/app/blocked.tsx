import { useState } from "react";
import { Alert, FlatList, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useBlocked } from "@/lib/hooks";
import { unblockNumber } from "@/lib/actions";
import { timeAgo } from "@/lib/time";
import { formatCallerKey, type BlockedEntry } from "@/lib/contract";
import { AppText, Banner, Card, EmptyState, PrimaryButton, Skeleton } from "@/components";
import { colors, radii, spacing, cardStyle } from "@/theme";

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
  const showNumber = !!entry.displayName;
  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <View style={[styles.icon, { backgroundColor: isAuto ? colors.dangerSoft : colors.bubbleAssistant }]}>
          <Ionicons name={isAuto ? "shield-checkmark" : "ban"} size={22} color={isAuto ? colors.danger : colors.textMuted} />
        </View>
        <View style={styles.rowBody}>
          <AppText variant="large" weight="semibold" numberOfLines={1}>
            {title}
          </AppText>
          {showNumber && (
            <AppText variant="small" color={colors.textMuted} numberOfLines={1}>
              {formatCallerKey(entry.callerKey)}
            </AppText>
          )}
          <View style={styles.metaRow}>
            <View style={[styles.badge, { backgroundColor: isAuto ? colors.dangerSoft : colors.bubbleAssistant }]}>
              <AppText variant="caption" weight="medium" color={isAuto ? colors.danger : colors.textMuted}>
                {REASON_LABEL[entry.reason] ?? "บล็อกแล้ว"}
              </AppText>
            </View>
            <AppText variant="caption" color={colors.textSubtle}>
              {timeAgo(entry.addedAt)}
            </AppText>
          </View>
        </View>
      </View>
      <PrimaryButton
        title="ปลดบล็อก"
        variant="secondary"
        icon="lock-open-outline"
        onPress={() => onUnblock(entry)}
        loading={busy}
        disabled={disabled}
      />
    </View>
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

  const header = (
    <View style={styles.header}>
      <AppText variant="body" color={colors.textMuted}>
        เบอร์เหล่านี้จะถูกตัดสายทันที ไม่ถึงผู้สูงอายุ
      </AppText>
      {notice && <Banner tone="success" text={notice} actionLabel="ปิด" onAction={() => setNotice(null)} />}
      {error && <Banner tone="error" text="โหลดรายการเบอร์ที่บล็อกไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่" />}
    </View>
  );

  const contentStyle = [styles.list, { paddingBottom: spacing.xxl + insets.bottom }];

  if (loading && entries.length === 0) {
    return (
      <View style={[styles.screen, ...contentStyle]}>
        {header}
        <Card style={styles.skeletonCard}>
          <Skeleton height={64} />
          <Skeleton height={64} />
        </Card>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.screen}
      data={entries}
      keyExtractor={(e) => e.callerKey}
      contentContainerStyle={contentStyle}
      ListHeaderComponent={header}
      ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      ListEmptyComponent={
        error ? null : (
          <EmptyState title="ยังไม่มีเบอร์ที่ถูกบล็อก" subtitle="เมื่อคุณบล็อกสายแปลก หรือ AI บล็อกสายเสี่ยงสูง จะแสดงที่นี่" />
        )
      }
      renderItem={({ item }) => (
        <BlockedRow
          entry={item}
          busy={busyKey === item.callerKey}
          disabled={busyKey !== null}
          onUnblock={confirmUnblock}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, flexGrow: 1 },
  header: { gap: spacing.md, marginBottom: spacing.lg },
  skeletonCard: { padding: spacing.lg, gap: spacing.md },
  row: { ...cardStyle, padding: spacing.lg, gap: spacing.md },
  rowTop: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  rowBody: { flex: 1, gap: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.xs, flexWrap: "wrap" },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.pill },
});
