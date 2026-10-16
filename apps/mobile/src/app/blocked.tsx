import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBlocked } from "@/lib/hooks";
import { unblockNumber } from "@/lib/actions";
import { timeAgo } from "@/lib/time";
import { formatCallerKey, type BlockedEntry } from "@/lib/contract";
import { useLang, type StrKey } from "@/lib/i18n";
import { AppText, Banner, EmptyState, ListRow, ListSection, Skeleton } from "@/components";
import { colors, radii, SEPARATOR_INSET, spacing } from "@/theme";

const REASON_LABEL: Record<BlockedEntry["reason"], StrKey> = {
  auto: "blocked.reason.auto",
  guardian: "blocked.reason.guardian",
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
  const { t } = useLang();
  const isAuto = entry.reason === "auto";
  const title = entryTitle(entry);
  const meta = [
    entry.displayName ? formatCallerKey(entry.callerKey) : null,
    t(REASON_LABEL[entry.reason] ?? "blocked.reason.default"),
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
          accessibilityLabel={t("blocked.unblockA11y", { name: title })}
          style={({ pressed }) => [styles.capsule, pressed && styles.pressed, disabled && !busy && styles.dim]}
        >
          {busy ? (
            <ActivityIndicator size="small" color={colors.brand} />
          ) : (
            <AppText variant="small" weight="semibold" color={colors.brand}>
              {t("blocked.unblock")}
            </AppText>
          )}
        </Pressable>
      }
    />
  );
}

export default function BlockedScreen() {
  const { entries, loading, error } = useBlocked();
  const { t } = useLang();
  const insets = useSafeAreaInsets();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function confirmUnblock(entry: BlockedEntry) {
    if (busyKey) return;
    const title = entryTitle(entry);
    Alert.alert(
      t("blocked.confirmTitle"),
      t("blocked.confirmBody", { name: title }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("blocked.unblock"),
          onPress: async () => {
            setBusyKey(entry.callerKey);
            try {
              const ok = await unblockNumber(entry.callerKey);
              if (ok) setNotice(t("blocked.unblocked", { name: title }));
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
      {notice && <Banner tone="success" text={notice} actionLabel={t("blocked.close")} onAction={() => setNotice(null)} />}
      {error && <Banner tone="error" text={t("blocked.loadError")} />}

      {loading && entries.length === 0 ? (
        <View style={styles.skeletons}>
          <Skeleton height={64} />
          <Skeleton height={64} />
        </View>
      ) : entries.length === 0 ? (
        error ? null : (
          <EmptyState
            icon="hand-left"
            title={t("blocked.empty.title")}
            subtitle={t("blocked.empty.subtitle")}
          />
        )
      ) : (
        <ListSection
          header={t("blocked.count", { n: entries.length })}
          footer={t("blocked.footer")}
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
