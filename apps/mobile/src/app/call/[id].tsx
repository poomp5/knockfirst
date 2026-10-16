import { useState } from "react";
import { Alert, Linking, Platform, ScrollView, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useCall, useFamily } from "@/lib/hooks";
import { acceptCall, blockCall } from "@/lib/actions";
import { formatClock, timeAgo } from "@/lib/time";
import { useLang, type StrKey } from "@/lib/i18n";
import {
  formatCallerKey,
  type CallAnalysis,
  type CallDoc,
  type CallStatus,
  type RedFlag,
} from "@/lib/contract";
import {
  AppText,
  Banner,
  EmptyState,
  FactRow,
  IconTile,
  ListRow,
  ListSection,
  PrimaryButton,
  PulseDot,
  RedFlagChip,
  RiskMeter,
  Skeleton,
  StatusPill,
  TranscriptView,
  UrgentTag,
} from "@/components";
import { colors, SEPARATOR_INSET, spacing } from "@/theme";

type Decision = "accepted" | "blocked";

const ACTIONABLE = new Set<CallStatus>(["needs_review", "auto_blocked", "no_message"]);
const PENDING = new Set<CallStatus>(["screening", "analyzing"]);

const RECOMMENDATION: Record<CallAnalysis["recommendedAction"], { text: StrKey; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  accept: { text: "call.recAccept", color: colors.success, icon: "checkmark" },
  review: { text: "call.recReview", color: colors.warning, icon: "help" },
  block: { text: "call.recBlock", color: colors.danger, icon: "hand-left" },
};

function decisionOf(call: CallDoc): Decision | null {
  if (call.decision) return call.decision;
  if (call.status === "accepted") return "accepted";
  if (call.status === "blocked") return "blocked";
  return null;
}

function formatDuration(sec: number | null | undefined, t: ReturnType<typeof useLang>["t"]): string | null {
  if (sec == null || !Number.isFinite(sec) || sec <= 0) return null;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? t("call.durMinSec", { m, s }) : t("call.durSec", { s });
}

/** Native confirm dialog; RN-web's Alert has no buttons, so fall back to window.confirm there. */
function confirm(title: string, message: string, okText: string, cancelText: string, destructive: boolean, onOk: () => void) {
  if (Platform.OS === "web") {
    if ((globalThis as { confirm?: (m: string) => boolean }).confirm?.(`${title}\n\n${message}`)) onOk();
    return;
  }
  Alert.alert(title, message, [
    { text: cancelText, style: "cancel" },
    { text: okText, style: destructive ? "destructive" : "default", onPress: onOk },
  ]);
}

export default function CallDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { call, loading, error } = useCall(id);
  const { family } = useFamily();
  const insets = useSafeAreaInsets();
  const { t, lang, redFlagLabel } = useLang();

  const [busy, setBusy] = useState<Decision | null>(null);
  const [localDecision, setLocalDecision] = useState<Decision | null>(null);
  const [barHeight, setBarHeight] = useState(0);

  if (!call) {
    if (loading) return <LoadingState />;
    return (
      <View style={styles.centerWrap}>
        <EmptyState
          icon={error ? "cloud-offline" : "call"}
          title={error ? t("call.loadError") : t("call.notFound")}
          subtitle={error ? t("call.loadErrorHint") : t("call.notFoundHint")}
        />
        <View style={styles.centerButton}>
          <PrimaryButton
            title={t("call.backToInbox")}
            variant="secondary"
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          />
        </View>
      </View>
    );
  }

  const ownerName = family?.ownerName?.trim() || t("call.ownerFallback");
  const analysis = call.analysis ?? null;
  const pending = PENDING.has(call.status);
  const decision = localDecision ?? decisionOf(call);
  const showActionBar = ACTIONABLE.has(call.status) && !decision;
  const callbackTarget = analysis?.callbackNumber || call.callerKey;
  const canCallBack = !!callbackTarget && !callbackTarget.startsWith("client:");
  // High-risk calls: Block is the main action, Accept is demoted so nobody whitelists a scammer by reflex.
  const risky = analysis?.recommendedAction === "block" || (analysis?.riskScore ?? 0) >= 70;
  const title = analysis?.callerName || formatCallerKey(call.callerKey);
  // English UI shows the English summary/reason when the analysis has one.
  const reason = (lang === "en" && analysis?.reasonEn) || analysis?.reason;
  const summary = (lang === "en" && analysis?.summaryEn) || analysis?.summary;
  const duration = formatDuration(call.durationSec, t);

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
    confirm(t("call.acceptConfirmTitle"), t("call.acceptConfirmMsg", { ownerName }), t("call.acceptOk"), t("common.cancel"), false, runAccept);
  const askBlock = () =>
    confirm(
      t("call.blockConfirmTitle"),
      t("call.blockConfirmMsg"),
      t("call.blockOk"),
      t("common.cancel"),
      true,
      runBlock,
    );
  const callBack = () => {
    Linking.openURL(`tel:${callbackTarget}`).catch(() =>
      Alert.alert(t("call.cantCallTitle"), t("call.cantCallMsg")),
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

  const facts: { label: string; value?: string | null }[] = [
    { label: t("call.factCaller"), value: analysis?.callerName },
    { label: t("call.factOrg"), value: analysis?.organization },
    { label: t("call.factTarget"), value: analysis?.targetPerson },
    { label: t("call.factReason"), value: reason },
    { label: t("call.factCallback"), value: analysis?.callbackNumber ? formatCallerKey(analysis.callbackNumber) : null },
    { label: t("call.factNumber"), value: formatCallerKey(call.callerKey) },
    { label: t("call.factTime"), value: `${formatClock(call.startedAt)} · ${timeAgo(call.startedAt)}` },
  ].filter((f) => typeof f.value === "string" && f.value.trim());

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: actionBarSpace }]}>
        {/* ---------- Hero (Contacts-style, on the grouped background) ---------- */}
        <View style={styles.hero}>
          <AppText variant="h1" weight="bold" numberOfLines={2} style={styles.centerText}>
            {title}
          </AppText>
          <View style={styles.heroMeta}>
            {analysis?.urgency === "urgent" ? <UrgentTag /> : null}
            <AppText variant="small" color={colors.textSubtle} style={styles.centerText}>
              {formatCallerKey(call.callerKey)} · {formatClock(call.startedAt)}
            </AppText>
          </View>

          {analysis ? (
            <View style={styles.meterWrap}>
              <RiskMeter score={analysis.riskScore} />
            </View>
          ) : pending ? (
            <View style={styles.pendingHero}>
              <View style={styles.pendingRow}>
                <PulseDot color={colors.brand} size={10} />
                <AppText variant="body" weight="semibold" color={colors.brand}>
                  {call.status === "screening" ? t("call.aiTalking") : t("call.summarizing")}
                </AppText>
              </View>
              <Skeleton height={110} width="65%" />
            </View>
          ) : (
            <StatusIcon status={call.status} />
          )}

          <View style={styles.statusRow}>
            <StatusPill status={call.status} ownerResponse={call.ownerResponse} />
            {duration ? (
              <AppText variant="caption" color={colors.textSubtle}>
                {t("call.duration", { duration })}
              </AppText>
            ) : null}
          </View>
        </View>

        {/* ---------- Decision result ---------- */}
        {decision ? (
          <Banner
            tone={decision === "accepted" ? "success" : "danger"}
            text={decision === "accepted" ? t("call.acceptedBanner") : t("call.blockedBanner")}
            actionLabel={busy ? undefined : t("call.changeMind")}
            onAction={busy ? undefined : decision === "accepted" ? askBlock : askAccept}
          />
        ) : null}

        {/* ---------- AI summary ---------- */}
        <ListSection header={t("call.aiSummary")}>
          {analysis ? (
            <View style={styles.cellPad}>
              <AppText variant="body" style={styles.summary}>
                {summary || reason || t("call.noSummary")}
              </AppText>
            </View>
          ) : pending ? (
            <View style={[styles.cellPad, styles.skeletonStack]}>
              <Skeleton height={18} />
              <Skeleton height={18} />
              <Skeleton height={18} width="60%" />
            </View>
          ) : (
            <View style={styles.cellPad}>
              <AppText variant="body" color={colors.textMuted}>
                {noAnalysisText(call.status, t)}
              </AppText>
            </View>
          )}
          {analysis ? <Recommendation action={analysis.recommendedAction} /> : null}
        </ListSection>

        {/* ---------- Facts ---------- */}
        <ListSection header={t("call.callerInfo")}>
          {facts.map((f) => (
            <FactRow key={f.label} label={f.label} value={f.value} />
          ))}
        </ListSection>

        {/* ---------- Red flags ---------- */}
        {analysis ? (
          <ListSection header={t("call.redFlags")} separatorInset={SEPARATOR_INSET - 4}>
            {noRedFlags ? (
              <ListRow
                icon="checkmark"
                iconColor={colors.success}
                title={t("call.noRedFlags")}
                titleColor={colors.success}
              />
            ) : null}
            {evidence.map((e, i) => (
              <View key={`${e.flag}-${i}`} style={styles.evidenceRow}>
                <IconTile name="alert" color={colors.danger} size={26} />
                <View style={styles.flex}>
                  <AppText variant="body" weight="semibold" color={colors.danger}>
                    {redFlagLabel[e.flag] ?? t("comp.flagUnknown")}
                  </AppText>
                  {e.quote ? (
                    <AppText variant="small" color={colors.textMuted} style={styles.quote}>
                      “{e.quote}”
                    </AppText>
                  ) : null}
                </View>
              </View>
            ))}
            {flagsWithoutQuote.length > 0 ? (
              <View style={[styles.cellPad, styles.chips]}>
                {flagsWithoutQuote.map((f) => (
                  <RedFlagChip key={f} flag={f} />
                ))}
              </View>
            ) : null}
          </ListSection>
        ) : null}

        {/* ---------- Transcript ---------- */}
        <ListSection header={t("call.transcript")}>
          <View style={styles.cellPad}>
            {transcript.length > 0 ? (
              <TranscriptView turns={transcript} collapsedCount={4} />
            ) : call.status === "screening" ? (
              <View style={styles.pendingRow}>
                <PulseDot color={colors.brand} size={8} />
                <AppText variant="body" color={colors.textMuted} style={styles.flex}>
                  {t("call.transcriptPending")}
                </AppText>
              </View>
            ) : (
              <AppText variant="body" color={colors.textMuted}>
                {t("call.transcriptNone")}
              </AppText>
            )}
          </View>
        </ListSection>
      </ScrollView>

      {/* ---------- Sticky action bar (iOS toolbar material) ---------- */}
      {showActionBar ? (
        <View
          style={[styles.actionBar, { paddingBottom: spacing.md + insets.bottom }]}
          onLayout={(e) => setBarHeight(e.nativeEvent.layout.height)}
        >
          <PrimaryButton
            title={risky ? t("call.blockReport") : t("call.acceptNumber")}
            icon={risky ? "hand-left" : "checkmark"}
            variant={risky ? "danger" : "primary"}
            onPress={risky ? askBlock : askAccept}
            loading={busy === (risky ? "blocked" : "accepted")}
            disabled={busy !== null}
          />
          <View style={styles.actionRow}>
            <View style={styles.flex}>
              <PrimaryButton
                title={risky ? t("call.acceptOk") : t("call.blockOk")}
                variant={risky ? "secondary" : "dangerTinted"}
                onPress={risky ? askAccept : askBlock}
                loading={busy === (risky ? "accepted" : "blocked")}
                disabled={busy !== null}
              />
            </View>
            {canCallBack ? (
              <View style={styles.flex}>
                <PrimaryButton
                  title={t("call.callBack")}
                  icon="call"
                  variant="secondary"
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

function noAnalysisText(status: CallStatus, t: ReturnType<typeof useLang>["t"]): string {
  switch (status) {
    case "forwarded":
      return t("call.noAnalysisForwarded");
    case "rejected":
      return t("call.noAnalysisRejected");
    case "no_message":
      return t("call.noAnalysisNoMessage");
    default:
      return t("call.noAnalysisDefault");
  }
}

function Recommendation({ action }: { action: CallAnalysis["recommendedAction"] }) {
  const { t } = useLang();
  const rec = RECOMMENDATION[action];
  if (!rec) return null;
  return <ListRow icon={rec.icon} iconColor={rec.color} title={t(rec.text)} titleColor={rec.color} />;
}

function StatusIcon({ status }: { status: CallStatus }) {
  const map: Partial<Record<CallStatus, { icon: keyof typeof Ionicons.glyphMap; color: string }>> = {
    forwarded: { icon: "call", color: colors.success },
    accepted: { icon: "checkmark", color: colors.success },
    rejected: { icon: "hand-left", color: colors.danger },
    blocked: { icon: "hand-left", color: colors.danger },
    auto_blocked: { icon: "shield", color: colors.danger },
  };
  const s = map[status] ?? { icon: "call" as const, color: colors.gray };
  return (
    <View style={[styles.statusIcon, { backgroundColor: s.color }]}>
      <Ionicons name={s.icon} size={40} color={colors.white} />
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
  content: { padding: spacing.lg, gap: spacing.xl },
  flex: { flex: 1 },
  centerText: { textAlign: "center" },
  centerWrap: { flex: 1, justifyContent: "center", padding: spacing.xl, backgroundColor: colors.bg },
  centerButton: { marginTop: spacing.lg },

  hero: { alignItems: "center", gap: spacing.sm, paddingTop: spacing.sm },
  heroMeta: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  meterWrap: { alignItems: "center", paddingTop: spacing.lg },
  pendingHero: { alignSelf: "stretch", alignItems: "center", gap: spacing.md, paddingVertical: spacing.lg },
  pendingRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  statusIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: spacing.md,
  },

  cellPad: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.card },
  summary: { lineHeight: 27 },
  skeletonStack: { gap: spacing.sm },

  evidenceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
  },
  quote: { marginTop: 2, lineHeight: 22 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },

  actionBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    gap: spacing.sm,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.bar,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.separator,
  },
  actionRow: { flexDirection: "row", gap: spacing.sm },
});
