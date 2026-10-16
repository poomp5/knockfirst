import { StyleSheet, View } from "react-native";
import type { CallStatus } from "@/lib/contract";
import { useLang } from "@/lib/i18n";
import { colors, radii, spacing } from "@/theme";
import { AppText } from "./app-text";

export interface StatusPillProps {
  status: CallStatus;
  /** v3: grandma's tap on a forwarded (known-caller) call. */
  ownerResponse?: "answered" | "declined" | null;
}

/** Update 05: forwarded calls ring grandma's phone through the app, so say whether she picked up. */
function forwardedLabel(r: StatusPillProps["ownerResponse"], t: ReturnType<typeof useLang>["t"]): string {
  if (r === "answered") return t("comp.fwdAnswered");
  if (r === "declined") return t("comp.fwdDeclined");
  return t("comp.fwdRinging");
}

type Tone = { bg: string; fg: string };

const NEUTRAL: Tone = { bg: colors.fill, fg: colors.textMuted };
const GOOD: Tone = { bg: colors.successSoft, fg: colors.success };
const BAD: Tone = { bg: colors.dangerSoft, fg: colors.danger };

const TONE: Record<CallStatus, Tone> = {
  forwarded: GOOD,
  accepted: GOOD,
  rejected: BAD,
  auto_blocked: BAD,
  blocked: BAD,
  needs_review: { bg: colors.brandSoft, fg: colors.brandPressed },
  screening: NEUTRAL,
  analyzing: NEUTRAL,
  no_message: NEUTRAL,
};

/** Tinted capsule with a status dot (color + text). */
export function StatusPill({ status, ownerResponse }: StatusPillProps) {
  const { t, statusLabel } = useLang();
  const declined = status === "forwarded" && ownerResponse === "declined";
  const tone = declined ? NEUTRAL : (TONE[status] ?? NEUTRAL);
  const label = status === "forwarded" ? forwardedLabel(ownerResponse, t) : (statusLabel[status] ?? t("comp.statusUnknown"));
  return (
    <View style={[styles.pill, { backgroundColor: tone.bg }]} accessible accessibilityLabel={t("comp.statusA11y", { label })}>
      <View style={[styles.dot, { backgroundColor: tone.fg }]} />
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
    gap: 5,
    flexShrink: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { flexShrink: 1 },
});
