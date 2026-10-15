import { useEffect, useMemo, useRef } from "react";
import { SectionList, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCalls, useFamily } from "@/lib/hooks";
import { isToday, tsToDate } from "@/lib/time";
import { USE_MOCKS } from "@/lib/firebase";
import { mockSimulateIncomingCall } from "@/lib/mocks";
import type { CallDoc } from "@/lib/contract";
import {
  AppText,
  Banner,
  CallCard,
  EmptyState,
  IconTile,
  LargeTitle,
  PrimaryButton,
  PulseDot,
  SectionHeader,
  Skeleton,
} from "@/components";
import { cardStyle, colors, spacing } from "@/theme";

type SectionKey = "live" | "review" | "history";
type InboxSection = { key: SectionKey; title: string; data: CallDoc[] };

const LIVE = new Set<CallDoc["status"]>(["screening", "analyzing"]);
const BLOCKED = new Set<CallDoc["status"]>(["rejected", "auto_blocked", "blocked"]);

const startedMs = (c: CallDoc) => tsToDate(c.startedAt).getTime();
const newestFirst = (a: CallDoc, b: CallDoc) => startedMs(b) - startedMs(a);
const isUrgent = (c: CallDoc) => c.analysis?.urgency === "urgent";

function buildSections(calls: CallDoc[]): InboxSection[] {
  const live: CallDoc[] = [];
  const review: CallDoc[] = [];
  const history: CallDoc[] = [];
  for (const c of calls) {
    if (LIVE.has(c.status)) live.push(c);
    else if (c.status === "needs_review") review.push(c);
    else history.push(c);
  }
  live.sort(newestFirst);
  review.sort((a, b) => Number(isUrgent(b)) - Number(isUrgent(a)) || newestFirst(a, b));
  history.sort(newestFirst);
  const sections: InboxSection[] = [
    { key: "live", title: "กำลังรับสาย", data: live },
    { key: "review", title: "รอคุณตัดสินใจ", data: review },
    { key: "history", title: "ประวัติ", data: history },
  ];
  return sections.filter((s) => s.data.length > 0);
}

function computeStats(calls: CallDoc[]) {
  let screened = 0;
  let blocked = 0;
  let today = 0;
  for (const c of calls) {
    if (c.route === "screened") screened++;
    if (BLOCKED.has(c.status)) blocked++;
    if (isToday(c.startedAt)) today++;
  }
  return { screened, blocked, today };
}

export default function InboxScreen() {
  const insets = useSafeAreaInsets();
  const { family } = useFamily();
  const { calls, loading, error, retry } = useCalls();

  const sections = useMemo(() => buildSections(calls), [calls]);
  const stats = useMemo(() => computeStats(calls), [calls]);
  const ownerName = family?.ownerName?.trim() || "คนที่คุณรัก";

  // Haptic tick when a NEW needs_review call shows up while the app is open (not on first load).
  const seenReview = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (loading) return;
    const ids = calls.filter((c) => c.status === "needs_review").map((c) => c.id);
    if (seenReview.current === null) {
      seenReview.current = new Set(ids);
      return;
    }
    const seen = seenReview.current;
    const fresh = ids.filter((id) => !seen.has(id));
    fresh.forEach((id) => seen.add(id));
    if (fresh.length > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }
  }, [calls, loading]);

  const openCall = (id: string) => router.push({ pathname: "/call/[id]", params: { id } });

  const header = (
    <View style={styles.header}>
      <LargeTitle title="สายเข้า" eyebrow={todayLabel()} />

      <View style={styles.summary} accessible accessibilityLabel={`KnockFirst กำลังปกป้อง ${ownerName}`}>
        <View style={styles.summaryTop}>
          <IconTile name="shield-checkmark" color={colors.brand} size={40} />
          <View style={styles.flex}>
            <AppText variant="body" weight="semibold" numberOfLines={2}>
              กำลังปกป้อง {ownerName}
            </AppText>
            <AppText variant="small" color={colors.textSubtle}>
              KnockFirst ทำงานอยู่
            </AppText>
          </View>
          <PulseDot color={colors.switchOn} size={8} />
        </View>
        <View style={styles.statRow}>
          <Stat label="กรองแล้ว" value={stats.screened} color={colors.brand} />
          <View style={styles.statDivider} />
          <Stat label="บล็อก" value={stats.blocked} color={colors.danger} />
          <View style={styles.statDivider} />
          <Stat label="วันนี้" value={stats.today} color={colors.ink} />
        </View>
      </View>

      {error ? (
        <Banner tone="error" text="โหลดรายการสายไม่สำเร็จ ตรวจสอบอินเทอร์เน็ต" actionLabel="ลองใหม่" onAction={retry} />
      ) : null}

      {USE_MOCKS ? (
        <PrimaryButton
          title="จำลองสายเข้า (โหมดทดสอบ)"
          variant="secondary"
          icon="flask"
          onPress={() => {
            mockSimulateIncomingCall();
            Haptics.selectionAsync().catch(() => {});
          }}
        />
      ) : null}
    </View>
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <SectionList<CallDoc, InboxSection>
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={header}
        contentContainerStyle={[styles.content, { paddingBottom: spacing.xxl + insets.bottom }]}
        renderSectionHeader={({ section }) =>
          section.key === "live" ? (
            <View style={styles.liveHeader}>
              <PulseDot color={colors.brand} size={8} />
              <View style={styles.flex}>
                <SectionHeader title={section.title} count={section.data.length} />
              </View>
            </View>
          ) : (
            <SectionHeader title={section.title} count={section.data.length} />
          )
        }
        renderItem={({ item, index, section }) => (
          <CallCard
            call={item}
            first={index === 0}
            last={index === section.data.length - 1}
            onPress={() => openCall(item.id)}
          />
        )}
        ListEmptyComponent={
          loading ? (
            <View style={styles.skeletons}>
              <Skeleton height={88} />
              <Skeleton height={88} />
              <Skeleton height={88} />
            </View>
          ) : error ? null : (
            <EmptyState
              icon="shield-checkmark"
              title="ยังไม่มีสายแปลก"
              subtitle="เมื่อมีเบอร์ที่ไม่รู้จักโทรเข้า AI จะรับสายแทนและสรุปให้คุณที่นี่"
            />
          )
        }
        initialNumToRender={12}
        windowSize={11}
      />
    </View>
  );
}

/** "วันพฤหัสบดี 15 ตุลาคม" (Apple News-style eyebrow above the large title). */
function todayLabel(): string {
  const d = new Date();
  return `วัน${format(d, "EEEE", { locale: th })} ${format(d, "d MMMM", { locale: th })}`;
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label} ${value} สาย`}>
      <AppText variant="h1" weight="bold" color={color} style={styles.statValue}>
        {value}
      </AppText>
      <AppText variant="caption" weight="medium" color={colors.textSubtle}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg },
  flex: { flex: 1 },
  header: { paddingTop: spacing.sm, paddingBottom: spacing.xs, gap: spacing.md },
  summary: { ...cardStyle, padding: spacing.lg, gap: spacing.lg },
  summaryTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  statRow: { flexDirection: "row", alignItems: "stretch" },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 28, lineHeight: 36 },
  statDivider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginVertical: spacing.xs },
  liveHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingLeft: spacing.xs },
  skeletons: { gap: spacing.md, marginTop: spacing.lg },
});
