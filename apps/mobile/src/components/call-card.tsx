import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";
import { formatCallerKey, RISK_LABEL_TH, riskLevelFromScore, STATUS_LABEL_TH, type CallDoc } from "@/lib/contract";
import { timeAgo } from "@/lib/time";
import { colors, radii, spacing, TAP } from "@/theme";
import { AppText } from "./app-text";
import { PulseDot } from "./pulse-dot";
import { RedFlagChip } from "./red-flag-chip";
import { clampScore, RiskBadge } from "./risk-badge";
import { StatusPill } from "./status-pill";
import { UrgentTag } from "./urgent-tag";

export interface CallCardProps {
  call: CallDoc;
  onPress: () => void;
  /** Position inside an inset-grouped section: rounds the outer corners and draws the separator. */
  first?: boolean;
  last?: boolean;
}

const MAX_FLAGS = 2;
const LEAD = 52;

/** Inbox row (B4), Apple Phone/Mail style. Tolerates missing analysis, null timestamps and client: keys. */
export function CallCard({ call, onPress, first = true, last = true }: CallCardProps) {
  const analysis = call.analysis ?? null;
  const live = call.status === "screening" || call.status === "analyzing";
  const urgent = analysis?.urgency === "urgent";

  const title = analysis?.callerName?.trim() || formatCallerKey(call.callerKey ?? call.from ?? "") || "ไม่ทราบเบอร์";
  const subtitle = [analysis?.organization, analysis?.reason]
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean)
    .join(" · ");
  const flags = Array.isArray(analysis?.redFlags) ? analysis.redFlags : [];
  const extraFlags = Math.max(0, flags.length - MAX_FLAGS);
  const when = timeAgo(call.startedAt);

  const score = analysis ? clampScore(analysis.riskScore) : null;
  const a11y = [
    title,
    score !== null && !live ? `ความเสี่ยง ${score} ${RISK_LABEL_TH[riskLevelFromScore(score)]}` : null,
    urgent ? "ด่วน" : null,
    STATUS_LABEL_TH[call.status],
    when,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      layout={LinearTransition.duration(250)}
      style={[styles.shell, first && styles.first, last && styles.last]}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={a11y}
        accessibilityHint="แตะเพื่อดูรายละเอียดสาย"
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <View style={styles.lead}>
          {live ? (
            <View style={[styles.circle, { backgroundColor: colors.brandSoft }]}>
              <PulseDot color={colors.brand} size={10} />
            </View>
          ) : analysis ? (
            <RiskBadge score={analysis.riskScore} />
          ) : (
            <View style={[styles.circle, { backgroundColor: colors.fill }]}>
              <Ionicons name="call" size={22} color={colors.textSubtle} />
            </View>
          )}
        </View>

        <View style={[styles.body, !last && styles.separator]}>
          <View style={styles.titleRow}>
            <AppText variant="body" weight="semibold" numberOfLines={1} style={styles.title}>
              {title}
            </AppText>
            {urgent && <UrgentTag />}
            <AppText variant="small" color={colors.textSubtle} numberOfLines={1} style={styles.time}>
              {when}
            </AppText>
            <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
          </View>

          {live ? (
            <AppText variant="small" color={colors.brand} numberOfLines={1}>
              {call.status === "screening" ? "AI กำลังคุยกับผู้โทร…" : "AI กำลังสรุปบทสนทนา…"}
            </AppText>
          ) : subtitle ? (
            <AppText variant="small" color={colors.textSubtle} numberOfLines={2}>
              {subtitle}
            </AppText>
          ) : null}

          {!live && flags.length > 0 && (
            <View style={styles.flags}>
              {flags.slice(0, MAX_FLAGS).map((f) => (
                <RedFlagChip key={f} flag={f} />
              ))}
              {extraFlags > 0 && (
                <AppText variant="caption" weight="medium" color={colors.danger}>
                  +{extraFlags}
                </AppText>
              )}
            </View>
          )}

          <View style={styles.footer}>
            <StatusPill status={call.status} ownerResponse={call.ownerResponse} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: { backgroundColor: colors.card, overflow: "hidden" },
  first: { borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg },
  last: { borderBottomLeftRadius: radii.lg, borderBottomRightRadius: radii.lg },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingLeft: spacing.lg,
    minHeight: TAP + spacing.xl,
  },
  pressed: { backgroundColor: colors.fillPressed },
  lead: { paddingTop: spacing.md },
  circle: { width: LEAD, height: LEAD, borderRadius: LEAD / 2, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, minWidth: 0, gap: 3, paddingVertical: spacing.md, paddingRight: spacing.md },
  separator: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  title: { flexShrink: 1 },
  time: { marginLeft: "auto", flexShrink: 0 },
  flags: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 2 },
  footer: { flexDirection: "row", marginTop: 3 },
});
