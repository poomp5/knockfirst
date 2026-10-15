import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { STATUS_LABEL_TH, type CallStatus } from "@/lib/contract";
import { colors, radii, spacing } from "@/theme";
import { AppText } from "./app-text";

export interface StatusPillProps {
  status: CallStatus;
}

type Tone = { bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap };

const NEUTRAL: Tone = { bg: colors.bubbleAssistant, fg: colors.textMuted, icon: "ellipse-outline" };

const TONE: Record<CallStatus, Tone> = {
  forwarded: { bg: colors.successSoft, fg: colors.success, icon: "call" },
  accepted: { bg: colors.successSoft, fg: colors.success, icon: "checkmark-circle" },
  rejected: { bg: colors.dangerSoft, fg: colors.danger, icon: "ban" },
  auto_blocked: { bg: colors.dangerSoft, fg: colors.danger, icon: "shield" },
  blocked: { bg: colors.dangerSoft, fg: colors.danger, icon: "ban" },
  needs_review: { bg: colors.brandSoft, fg: colors.brandPressed, icon: "hand-left" },
  screening: { bg: colors.bubbleAssistant, fg: colors.textMuted, icon: "mic" },
  analyzing: { bg: colors.bubbleAssistant, fg: colors.textMuted, icon: "sparkles" },
  no_message: { bg: colors.bubbleAssistant, fg: colors.textMuted, icon: "call-outline" },
};

export function StatusPill({ status }: StatusPillProps) {
  const tone = TONE[status] ?? NEUTRAL;
  const label = STATUS_LABEL_TH[status] ?? "ไม่ทราบสถานะ";
  return (
    <View style={[styles.pill, { backgroundColor: tone.bg }]} accessible accessibilityLabel={`สถานะ: ${label}`}>
      <Ionicons name={tone.icon} size={13} color={tone.fg} />
      <AppText variant="caption" weight="semibold" color={tone.fg} numberOfLines={1} style={styles.text}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    flexShrink: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  text: { flexShrink: 1 },
});
