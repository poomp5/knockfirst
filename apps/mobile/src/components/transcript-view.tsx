import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { TranscriptTurn } from "@/lib/contract";
import { colors, radii, spacing, TAP } from "@/theme";
import { AppText } from "./app-text";
import { useLang } from "@/lib/i18n";

export interface TranscriptViewProps {
  turns: TranscriptTurn[];
  collapsedCount?: number;
}

/** iMessage-style thread: the AI (our side) on the right in the tint color, the caller on the left in grey. */
export function TranscriptView({ turns, collapsedCount = 4 }: TranscriptViewProps) {
  const [expanded, setExpanded] = useState(false);
  const { t: tr } = useLang();
  const list = (Array.isArray(turns) ? turns : []).filter((t) => t && typeof t.text === "string" && t.text.trim());

  if (list.length === 0) {
    return (
      <AppText variant="body" color={colors.textSubtle}>
        {tr("comp.transcriptEmpty")}
      </AppText>
    );
  }

  const canCollapse = list.length > collapsedCount;
  const visible = expanded || !canCollapse ? list : list.slice(0, collapsedCount);

  return (
    <View style={styles.wrap}>
      {visible.map((turn, i) => {
        const isCaller = turn.role === "caller";
        const prev = visible[i - 1];
        const next = visible[i + 1];
        const firstOfGroup = !prev || prev.role !== turn.role;
        const lastOfGroup = !next || next.role !== turn.role;
        return (
          <View
            key={`${i}-${turn.t}`}
            style={[styles.row, isCaller ? styles.rowLeft : styles.rowRight, firstOfGroup && i > 0 && styles.groupGap]}
          >
            {firstOfGroup && (
              <AppText variant="caption" color={colors.textSubtle} style={styles.who}>
                {isCaller ? tr("comp.caller") : tr("comp.aiAssistant")}
              </AppText>
            )}
            <View
              style={[
                styles.bubble,
                isCaller ? styles.bubbleCaller : styles.bubbleAssistant,
                lastOfGroup && (isCaller ? styles.tailLeft : styles.tailRight),
              ]}
            >
              <AppText variant="body" color={isCaller ? colors.text : colors.white} selectable>
                {turn.text.trim()}
              </AppText>
            </View>
          </View>
        );
      })}

      {canCollapse && (
        <Pressable
          onPress={() => setExpanded((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          style={({ pressed }) => [styles.toggle, pressed && styles.togglePressed]}
        >
          <AppText variant="small" weight="semibold" color={colors.brand}>
            {expanded ? tr("comp.collapse") : tr("comp.showAll", { n: list.length })}
          </AppText>
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color={colors.brand} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 3 },
  row: { maxWidth: "80%", gap: 2 },
  rowLeft: { alignSelf: "flex-start" },
  rowRight: { alignSelf: "flex-end", alignItems: "flex-end" },
  groupGap: { marginTop: spacing.sm },
  who: { paddingHorizontal: spacing.md, fontSize: 11, lineHeight: 15 },
  bubble: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.xxl - 4 },
  bubbleAssistant: { backgroundColor: colors.bubbleAssistant },
  bubbleCaller: { backgroundColor: colors.bubbleCaller },
  tailLeft: { borderBottomLeftRadius: 5 },
  tailRight: { borderBottomRightRadius: 5 },
  toggle: {
    minHeight: TAP,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  togglePressed: { opacity: 0.4 },
});
