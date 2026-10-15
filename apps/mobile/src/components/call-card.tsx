import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import { formatCallerKey, RISK_LABEL_TH, riskLevelFromScore, STATUS_LABEL_TH, type CallDoc } from "@/lib/contract";
import { timeAgo } from "@/lib/time";
import { cardStyle, colors, radii, spacing, TAP } from "@/theme";
import { AppText } from "./app-text";
import { PulseDot } from "./pulse-dot";
import { RedFlagChip } from "./red-flag-chip";
import { clampScore, RiskBadge } from "./risk-badge";
import { StatusPill } from "./status-pill";
import { UrgentTag } from "./urgent-tag";

export interface CallCardProps {
  call: CallDoc;
  onPress: () => void;
}

const MAX_FLAGS = 2;

/** Inbox row (B4). Tolerates missing analysis, null timestamps and client: keys. */
export function CallCard({ call, onPress }: CallCardProps) {
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
    <Animated.View entering={FadeInDown.duration(350)} layout={LinearTransition.duration(250)}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={a11y}
        accessibilityHint="แตะเพื่อดูรายละเอียดสาย"
        style={({ pressed }) => [styles.card, urgent && styles.cardUrgent, pressed && styles.pressed]}
      >
        <View style={styles.left}>
          {live ? (
            <View style={styles.liveCircle}>
              <PulseDot color={colors.brand} size={12} />
            </View>
          ) : analysis ? (
            <RiskBadge score={analysis.riskScore} />
          ) : (
            <View style={styles.iconCircle}>
              <Ionicons name="call-outline" size={24} color={colors.textSubtle} />
            </View>
          )}
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <AppText variant="large" weight="semibold" numberOfLines={1} style={styles.title}>
              {title}
            </AppText>
            {urgent && <UrgentTag />}
          </View>

          {live ? (
            <AppText variant="small" weight="medium" color={colors.brandPressed} numberOfLines={1}>
              {call.status === "screening" ? "AI กำลังคุยกับผู้โทร…" : "AI กำลังสรุปบทสนทนา…"}
            </AppText>
          ) : subtitle ? (
            <AppText variant="small" color={colors.textMuted} numberOfLines={2}>
              {subtitle}
            </AppText>
          ) : null}

          {!live && flags.length > 0 && (
            <View style={styles.flags}>
              {flags.slice(0, MAX_FLAGS).map((f) => (
                <RedFlagChip key={f} flag={f} />
              ))}
              {extraFlags > 0 && (
                <AppText variant="caption" weight="medium" color={colors.danger} style={styles.more}>
                  +{extraFlags}
                </AppText>
              )}
            </View>
          )}

          <View style={styles.footer}>
            <StatusPill status={call.status} />
            <AppText variant="caption" color={colors.textSubtle} numberOfLines={1} style={styles.time}>
              {when}
            </AppText>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={20} color={colors.divider} style={styles.chevron} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...cardStyle,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    padding: spacing.lg,
    minHeight: TAP + spacing.xl,
  },
  cardUrgent: { borderColor: colors.danger, borderWidth: 1.5 },
  pressed: { backgroundColor: "#F2F0ED", transform: [{ scale: 0.985 }] },
  left: { paddingTop: 2 },
  liveCircle: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    backgroundColor: colors.bubbleAssistant,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, minWidth: 0, gap: spacing.xs },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { flexShrink: 1 },
  flags: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.xs + 2, marginTop: 2 },
  more: { marginLeft: 2 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  time: { flexShrink: 0 },
  chevron: { alignSelf: "center", marginRight: -spacing.xs },
});
