import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { TranscriptTurn } from "@/lib/contract";
import { colors, radii, spacing, TAP } from "@/theme";
import { AppText } from "./app-text";

export interface TranscriptViewProps {
  turns: TranscriptTurn[];
  collapsedCount?: number;
}

/** Chat bubbles: AI assistant on the left (neutral), caller on the right (brand-soft). */
export function TranscriptView({ turns, collapsedCount = 4 }: TranscriptViewProps) {
  const [expanded, setExpanded] = useState(false);
  const list = (Array.isArray(turns) ? turns : []).filter((t) => t && typeof t.text === "string" && t.text.trim());

  if (list.length === 0) {
    return (
      <AppText variant="body" color={colors.textSubtle}>
        ไม่มีบทสนทนา
      </AppText>
    );
  }

  const canCollapse = list.length > collapsedCount;
  const visible = expanded || !canCollapse ? list : list.slice(0, collapsedCount);

  return (
    <View style={styles.wrap}>
      {visible.map((turn, i) => {
        const isCaller = turn.role === "caller";
        return (
          <View key={`${i}-${turn.t}`} style={[styles.row, isCaller ? styles.rowRight : styles.rowLeft]}>
            <View style={[styles.who, isCaller && styles.whoRight]}>
              <Ionicons
                name={isCaller ? "person" : "sparkles"}
                size={12}
                color={isCaller ? colors.brandPressed : colors.textSubtle}
              />
              <AppText variant="caption" weight="medium" color={isCaller ? colors.brandPressed : colors.textSubtle}>
                {isCaller ? "ผู้โทร" : "AI ผู้ช่วย"}
              </AppText>
            </View>
            <View style={[styles.bubble, isCaller ? styles.bubbleCaller : styles.bubbleAssistant]}>
              <AppText variant="body" selectable>
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
          <AppText variant="body" weight="semibold" color={colors.brand}>
            {expanded ? "ย่อ" : `ดูทั้งหมด (${list.length})`}
          </AppText>
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={colors.brand} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  row: { maxWidth: "85%", gap: 2 },
  rowLeft: { alignSelf: "flex-start" },
  rowRight: { alignSelf: "flex-end", alignItems: "flex-end" },
  who: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: spacing.xs },
  whoRight: { flexDirection: "row-reverse" },
  bubble: { paddingHorizontal: spacing.md + 2, paddingVertical: spacing.sm + 2, borderRadius: radii.lg },
  bubbleAssistant: { backgroundColor: colors.bubbleAssistant, borderTopLeftRadius: 4 },
  bubbleCaller: { backgroundColor: colors.bubbleCaller, borderTopRightRadius: 4 },
  toggle: {
    minHeight: TAP,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderRadius: radii.md,
  },
  togglePressed: { backgroundColor: colors.brandSoft },
});
