import { useEffect, useMemo, useRef } from "react";
import { Pressable, SectionList, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

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
  PulseDot,
  SectionHeader,
  Skeleton,
} from "@/components";
import { colors, radii, spacing, TAP } from "@/theme";

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
      <View style={styles.titleRow}>
        <Image
          source={require("../../../assets/shield.png")}
          style={styles.shield}
          contentFit="contain"
          accessibilityIgnoresInvertColors
        />
        <View style={styles.titleText}>
          <AppText variant="small" color={colors.textMuted}>
            KnockFirst กำลังทำงาน
          </AppText>
          <AppText variant="title" weight="bold" numberOfLines={2}>
            ปกป้อง {ownerName} อยู่
          </AppText>
        </View>
      </View>

      <View style={styles.statRow}>
        <Stat icon="shield-checkmark-outline" label="กรองแล้ว" value={stats.screened} color={colors.brand} />
        <Stat icon="ban-outline" label="บล็อก" value={stats.blocked} color={colors.danger} />
        <Stat icon="today-outline" label="วันนี้" value={stats.today} color={colors.textMuted} />
      </View>

      {error ? (
        <View style={styles.banner}>
          <Banner
            tone="error"
            text="โหลดรายการสายไม่สำเร็จ ตรวจสอบอินเทอร์เน็ต"
            actionLabel="ลองใหม่"
            onAction={retry}
          />
        </View>
      ) : null}

      {USE_MOCKS ? <MockSimulateButton /> : null}
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
              <PulseDot color={colors.brand} size={10} />
              <View style={styles.flex}>
                <SectionHeader title={section.title} count={section.data.length} />
              </View>
            </View>
          ) : (
            <SectionHeader title={section.title} count={section.data.length} />
          )
        }
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <CallCard call={item} onPress={() => openCall(item.id)} />
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <View style={styles.skeletons}>
              <Skeleton height={96} />
              <Skeleton height={96} />
              <Skeleton height={96} />
            </View>
          ) : error ? null : (
            <EmptyState
              title="ยังไม่มีสายแปลก ทุกอย่างปกติดี"
              subtitle="เมื่อมีเบอร์ที่ไม่รู้จักโทรเข้า AI จะรับสายแทนและสรุปให้คุณที่นี่"
              image={require("../../../assets/empty-inbox.png")}
            />
          )
        }
        initialNumToRender={12}
        windowSize={11}
      />
    </View>
  );
}

function Stat({
  icon,
  label,
  value,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label} ${value} สาย`}>
      <Ionicons name={icon} size={16} color={color} />
      <AppText variant="small" color={colors.textMuted}>
        {label}{" "}
        <AppText variant="small" weight="bold" color={colors.ink}>
          {value}
        </AppText>{" "}
        สาย
      </AppText>
    </View>
  );
}

/** Dev-only helper in mock mode so the "new call arrives" moment can be rehearsed offline. */
function MockSimulateButton() {
  return (
    <Pressable
      onPress={() => {
        mockSimulateIncomingCall();
        Haptics.selectionAsync().catch(() => {});
      }}
      style={({ pressed }) => [styles.mockButton, pressed && styles.mockButtonPressed]}
      accessibilityRole="button"
      accessibilityLabel="จำลองสายเข้า (โหมดทดสอบ)"
    >
      <Ionicons name="flask-outline" size={18} color={colors.brandPressed} />
      <AppText variant="small" weight="semibold" color={colors.brandPressed}>
        จำลองสายเข้า (โหมดทดสอบ)
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg },
  flex: { flex: 1 },
  header: { paddingTop: spacing.lg, paddingBottom: spacing.sm, gap: spacing.md },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  shield: { width: 56, height: 56 },
  titleText: { flex: 1 },
  statRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  banner: { marginTop: spacing.xs },
  liveHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  cardWrap: { marginBottom: spacing.md },
  skeletons: { gap: spacing.md, marginTop: spacing.lg },
  mockButton: {
    minHeight: TAP,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  mockButtonPressed: { opacity: 0.7 },
});
