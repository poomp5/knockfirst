import { useState, type ReactNode } from "react";
import { Alert, Linking, Platform, ScrollView, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useCall, useFamily } from "@/lib/hooks";
import { acceptCall, blockCall } from "@/lib/actions";
import { formatClock, timeAgo } from "@/lib/time";
import {
  formatCallerKey,
  RED_FLAG_LABEL_TH,
  type CallAnalysis,
  type CallDoc,
  type CallStatus,
  type RedFlag,
} from "@/lib/contract";
import {
  AppText,
  Banner,
  Card,
  EmptyState,
  FactRow,
  PrimaryButton,
  PulseDot,
  RedFlagChip,
  RiskMeter,
  Skeleton,
  StatusPill,
  TranscriptView,
  UrgentTag,
} from "@/components";
import { colors, radii, spacing } from "@/theme";

type Decision = "accepted" | "blocked";

const ACTIONABLE = new Set<CallStatus>(["needs_review", "auto_blocked", "no_message"]);
const PENDING = new Set<CallStatus>(["screening", "analyzing"]);

const RECOMMENDATION_TH: Record<CallAnalysis["recommendedAction"], { text: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  accept: { text: "AI แนะนำ: รับสายได้", color: colors.success, icon: "checkmark-circle" },
  review: { text: "AI แนะนำ: ตรวจสอบก่อนตัดสินใจ", color: colors.warning, icon: "help-circle" },
  block: { text: "AI แนะนำ: ควรบล็อก", color: colors.danger, icon: "alert-circle" },
};

function decisionOf(call: CallDoc): Decision | null {
  if (call.decision) return call.decision;
  if (call.status === "accepted") return "accepted";
  if (call.status === "blocked") return "blocked";
  return null;
}

function formatDuration(sec: number | null | undefined): string | null {
  if (sec == null || !Number.isFinite(sec) || sec <= 0) return null;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m} นาที ${s} วินาที` : `${s} วินาที`;
}

/** Native confirm dialog; RN-web's Alert has no buttons, so fall back to window.confirm there. */
function confirm(title: string, message: string, okText: string, destructive: boolean, onOk: () => void) {
  if (Platform.OS === "web") {
    if ((globalThis as { confirm?: (m: string) => boolean }).confirm?.(`${title}\n\n${message}`)) onOk();
    return;
  }
  Alert.alert(title, message, [
    { text: "ยกเลิก", style: "cancel" },
    { text: okText, style: destructive ? "destructive" : "default", onPress: onOk },
  ]);
}

export default function CallDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { call, loading, error } = useCall(id);
  const { family } = useFamily();
  const insets = useSafeAreaInsets();

  const [busy, setBusy] = useState<Decision | null>(null);
  const [localDecision, setLocalDecision] = useState<Decision | null>(null);
  const [barHeight, setBarHeight] = useState(0);

  if (!call) {
    if (loading) return <LoadingState />;
    return (
      <View style={styles.centerWrap}>
        <EmptyState
          title={error ? "โหลดข้อมูลสายไม่สำเร็จ" : "ไม่พบสายนี้"}
          subtitle={error ? "ตรวจสอบอินเทอร์เน็ต แล้วลองใหม่อีกครั้ง" : "สายนี้อาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง"}
        />
        <View style={styles.centerButton}>
          <PrimaryButton
            title="กลับไปหน้าสายเข้า"
            variant="secondary"
            icon="arrow-back"
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          />
        </View>
      </View>
    );
  }

  const ownerName = family?.ownerName?.trim() || "ผู้สูงอายุ";
  const analysis = call.analysis ?? null;
  const pending = PENDING.has(call.status);
  const decision = localDecision ?? decisionOf(call);
  const showActionBar = ACTIONABLE.has(call.status) && !decision;
  const callbackTarget = analysis?.callbackNumber || call.callerKey;
  const canCallBack = !!callbackTarget && !callbackTarget.startsWith("client:");
  // High-risk calls: Block is the main action, Accept is demoted so nobody whitelists a scammer by reflex.
  const risky = analysis?.recommendedAction === "block" || (analysis?.riskScore ?? 0) >= 70;
  const title = analysis?.callerName || formatCallerKey(call.callerKey);
  const duration = formatDuration(call.durationSec);

  const runAccept = async () => {
    setBusy("accepted");
    try {
      if (await acceptCall(call)) setLocalDecision("accepted");
    } finally {
      setBusy(null);
    }
  };
  const runBlock = async () => {
    setBusy("blocked");
    try {
      if (await blockCall(call)) setLocalDecision("blocked");
    } finally {
      setBusy(null);
    }
  };
  const askAccept = () =>
    confirm("อนุญาตเบอร์นี้?", `เบอร์นี้จะโทรถึง${ownerName}ได้ทันทีครั้งถัดไป`, "อนุญาต", false, runAccept);
  const askBlock = () =>
    confirm(
      "บล็อกและรายงานเบอร์นี้?",
      "ครั้งหน้าเบอร์นี้จะถูกตัดสายทันที และจะถูกรายงานเข้าบัญชีบล็อกกลางเพื่อเตือนครอบครัวอื่น",
      "บล็อก",
      true,
      runBlock,
    );
  const callBack = () => {
    Linking.openURL(`tel:${callbackTarget}`).catch(() =>
      Alert.alert("โทรออกไม่ได้", "อุปกรณ์นี้ไม่รองรับการโทรออก"),
    );
  };

  const evidence = analysis?.evidence ?? [];
  const flagsWithoutQuote: RedFlag[] = (analysis?.redFlags ?? []).filter(
    (f) => !evidence.some((e) => e.flag === f),
  );
  const noRedFlags = evidence.length === 0 && flagsWithoutQuote.length === 0;
  const transcript = call.transcript ?? [];
  // Measured height of the sticky bar (already includes the bottom inset) so content never hides under it.
  const actionBarSpace = showActionBar ? Math.max(barHeight, 140 + insets.bottom) + spacing.lg : spacing.xxl + insets.bottom;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: actionBarSpace }]}>
        {/* ---------- Hero ---------- */}
        <Card style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.flex}>
              <AppText variant="title" weight="bold" numberOfLines={2}>
                {title}
              </AppText>
              <AppText variant="small" color={colors.textMuted}>
                {formatCallerKey(call.callerKey)} · {formatClock(call.startedAt)} ({timeAgo(call.startedAt)})
              </AppText>
            </View>
            {analysis?.urgency === "urgent" ? <UrgentTag /> : null}
          </View>

          {analysis ? (
            <View style={styles.meterWrap}>
              <RiskMeter score={analysis.riskScore} />
            </View>
          ) : pending ? (
            <View style={styles.pendingHero}>
              <View style={styles.pendingRow}>
                <PulseDot color={colors.brand} size={12} />
                <AppText variant="large" weight="semibold" color={colors.brand}>
                  {call.status === "screening" ? "AI กำลังคุยกับผู้โทร…" : "กำลังสรุป…"}
                </AppText>
              </View>
              <Skeleton height={120} width="70%" />
            </View>
          ) : (
            <StatusIcon status={call.status} />
          )}

          <View style={styles.statusRow}>
            <StatusPill status={call.status} ownerResponse={call.ownerResponse} />
            {duration ? (
              <AppText variant="small" color={colors.textSubtle}>
                ความยาวสาย {duration}
              </AppText>
            ) : null}
          </View>
        </Card>

        {/* ---------- Decision result ---------- */}
        {decision ? (
          <Banner
            tone={decision === "accepted" ? "success" : "danger"}
            text={decision === "accepted" ? "อนุญาตแล้ว ✓ ครั้งหน้าจะโทรเข้าได้เลย" : "บล็อกแล้ว เบอร์นี้จะถูกตัดสายอัตโนมัติ"}
            actionLabel={busy ? undefined : "เปลี่ยนใจ"}
            onAction={busy ? undefined : decision === "accepted" ? askBlock : askAccept}
          />
        ) : null}

        {/* ---------- AI summary ---------- */}
        <Section title="สรุปจาก AI" icon="sparkles-outline">
          <Card style={styles.cardPad}>
            {analysis ? (
              <>
                <AppText variant="large" style={styles.summary}>
                  {analysis.summary || analysis.reason || "ไม่มีบทสรุป"}
                </AppText>
                <Recommendation action={analysis.recommendedAction} />
              </>
            ) : pending ? (
              <View style={styles.skeletonStack}>
                <AppText variant="small" color={colors.textMuted}>
                  กำลังสรุป…
                </AppText>
                <Skeleton height={18} />
                <Skeleton height={18} />
                <Skeleton height={18} width="60%" />
              </View>
            ) : (
              <AppText variant="body" color={colors.textMuted}>
                {noAnalysisText(call.status)}
              </AppText>
            )}
          </Card>
        </Section>

        {/* ---------- Facts ---------- */}
        <Section title="ข้อมูลผู้โทร" icon="person-circle-outline">
          <Card style={styles.cardPad}>
            <FactRow label="ผู้โทร" value={analysis?.callerName} />
            <FactRow label="หน่วยงาน" value={analysis?.organization} />
            <FactRow label="ต้องการติดต่อ" value={analysis?.targetPerson} />
            <FactRow label="เรื่อง" value={analysis?.reason} />
            <FactRow
              label="เบอร์ติดต่อกลับ"
              value={analysis?.callbackNumber ? formatCallerKey(analysis.callbackNumber) : null}
            />
            <FactRow label="เบอร์ที่โทรมา" value={formatCallerKey(call.callerKey)} />
            <FactRow label="เวลา" value={`${formatClock(call.startedAt)} · ${timeAgo(call.startedAt)}`} />
          </Card>
        </Section>

        {/* ---------- Red flags ---------- */}
        {analysis ? (
          <Section title="สัญญาณอันตราย" icon="warning-outline">
            <Card style={styles.cardPad}>
              {noRedFlags ? (
                <View style={styles.safeRow}>
                  <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                  <AppText variant="body" weight="medium" color={colors.success}>
                    ไม่พบสัญญาณอันตราย
                  </AppText>
                </View>
              ) : (
                <View style={styles.evidenceList}>
                  {evidence.map((e, i) => (
                    <View key={`${e.flag}-${i}`} style={styles.evidenceRow}>
                      <View style={styles.evidenceHead}>
                        <Ionicons name="alert-circle" size={18} color={colors.danger} />
                        <AppText variant="body" weight="semibold" color={colors.danger} style={styles.flex}>
                          {RED_FLAG_LABEL_TH[e.flag] ?? "สัญญาณผิดปกติ"}
                        </AppText>
                      </View>
                      {e.quote ? (
                        <AppText variant="body" color={colors.textMuted} style={styles.quote}>
                          “{e.quote}”
                        </AppText>
                      ) : null}
                    </View>
                  ))}
                  {flagsWithoutQuote.length > 0 ? (
                    <View style={styles.chips}>
                      {flagsWithoutQuote.map((f) => (
                        <RedFlagChip key={f} flag={f} />
                      ))}
                    </View>
                  ) : null}
                </View>
              )}
            </Card>
          </Section>
        ) : null}

        {/* ---------- Transcript ---------- */}
        <Section title="บทสนทนา" icon="chatbubbles-outline">
          {transcript.length > 0 ? (
            <TranscriptView turns={transcript} collapsedCount={4} />
          ) : (
            <Card style={styles.cardPad}>
              {call.status === "screening" ? (
                <View style={styles.pendingRow}>
                  <PulseDot color={colors.brand} size={10} />
                  <AppText variant="body" color={colors.textMuted}>
                    AI กำลังคุยกับผู้โทร บทสนทนาจะแสดงเมื่อวางสาย
                  </AppText>
                </View>
              ) : (
                <AppText variant="body" color={colors.textMuted}>
                  ไม่มีบทสนทนาสำหรับสายนี้
                </AppText>
              )}
            </Card>
          )}
        </Section>
      </ScrollView>

      {/* ---------- Sticky action bar ---------- */}
      {showActionBar ? (
        <View
          style={[styles.actionBar, { paddingBottom: spacing.md + insets.bottom }]}
          onLayout={(e) => setBarHeight(e.nativeEvent.layout.height)}
        >
          <PrimaryButton
            title={risky ? "บล็อกและรายงาน" : "อนุญาตเบอร์นี้"}
            icon={risky ? "ban" : "checkmark-circle"}
            variant={risky ? "danger" : "primary"}
            onPress={risky ? askBlock : askAccept}
            loading={busy === (risky ? "blocked" : "accepted")}
            disabled={busy !== null}
          />
          <View style={styles.actionRow}>
            <View style={styles.flex}>
              <PrimaryButton
                title={risky ? "อนุญาตเบอร์นี้" : "บล็อกและรายงาน"}
                icon={risky ? "checkmark-circle-outline" : "ban"}
                variant={risky ? "secondary" : "danger"}
                onPress={risky ? askAccept : askBlock}
                loading={busy === (risky ? "accepted" : "blocked")}
                disabled={busy !== null}
              />
            </View>
            {canCallBack ? (
              <View style={styles.flex}>
                <PrimaryButton
                  title="โทรกลับ"
                  icon="call-outline"
                  variant="ghost"
                  onPress={callBack}
                  disabled={busy !== null}
                />
              </View>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function noAnalysisText(status: CallStatus): string {
  switch (status) {
    case "forwarded":
      return "เบอร์นี้อยู่ในรายชื่อที่อนุญาต ระบบจึงต่อสายให้ทันทีโดยไม่ผ่าน AI";
    case "rejected":
      return "เบอร์นี้อยู่ในบัญชีบล็อก ระบบจึงตัดสายอัตโนมัติ";
    case "no_message":
      return "ผู้โทรวางสายก่อนฝากข้อความ จึงไม่มีบทสรุป";
    default:
      return "ยังไม่มีบทสรุปสำหรับสายนี้";
  }
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Ionicons name={icon} size={18} color={colors.textMuted} />
        <AppText variant="body" weight="semibold" color={colors.textMuted}>
          {title}
        </AppText>
      </View>
      {children}
    </View>
  );
}

function Recommendation({ action }: { action: CallAnalysis["recommendedAction"] }) {
  const rec = RECOMMENDATION_TH[action];
  if (!rec) return null;
  return (
    <View style={styles.recRow}>
      <Ionicons name={rec.icon} size={18} color={rec.color} />
      <AppText variant="small" weight="semibold" color={rec.color}>
        {rec.text}
      </AppText>
    </View>
  );
}

function StatusIcon({ status }: { status: CallStatus }) {
  const map: Partial<Record<CallStatus, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }>> = {
    forwarded: { icon: "call", color: colors.success, bg: colors.successSoft },
    accepted: { icon: "checkmark-circle", color: colors.success, bg: colors.successSoft },
    rejected: { icon: "ban", color: colors.danger, bg: colors.dangerSoft },
    blocked: { icon: "ban", color: colors.danger, bg: colors.dangerSoft },
    auto_blocked: { icon: "shield", color: colors.danger, bg: colors.dangerSoft },
  };
  const s = map[status] ?? { icon: "call-outline" as const, color: colors.textMuted, bg: colors.bubbleAssistant };
  return (
    <View style={[styles.statusIcon, { backgroundColor: s.bg }]}>
      <Ionicons name={s.icon} size={44} color={s.color} />
    </View>
  );
}

function LoadingState() {
  return (
    <View style={[styles.content, styles.skeletonStack]}>
      <Skeleton height={260} />
      <Skeleton height={24} width="40%" />
      <Skeleton height={110} />
      <Skeleton height={24} width="40%" />
      <Skeleton height={160} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },
  flex: { flex: 1 },
  centerWrap: { flex: 1, justifyContent: "center", padding: spacing.xl, backgroundColor: colors.bg },
  centerButton: { marginTop: spacing.lg },

  hero: { padding: spacing.lg, gap: spacing.md },
  heroTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  meterWrap: { alignItems: "center", paddingTop: spacing.sm },
  pendingHero: { alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  pendingRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  statusIcon: {
    alignSelf: "center",
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: spacing.sm,
  },

  section: { gap: spacing.sm },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: spacing.xs + 2, paddingHorizontal: spacing.xs },
  cardPad: { padding: spacing.lg },
  summary: { lineHeight: 30 },
  recRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  skeletonStack: { gap: spacing.sm },

  safeRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  evidenceList: { gap: spacing.md },
  evidenceRow: {
    gap: spacing.xs,
    paddingLeft: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
  },
  evidenceHead: { flexDirection: "row", alignItems: "center", gap: spacing.xs + 2 },
  quote: { lineHeight: 26 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },

  actionBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    gap: spacing.sm,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  actionRow: { flexDirection: "row", gap: spacing.sm },
});
