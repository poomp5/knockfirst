import { Ionicons } from "@expo/vector-icons";
import { Children, Fragment, isValidElement, type ReactNode } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, radii, spacing, TAP } from "@/theme";
import { AppText } from "./app-text";

type IconName = keyof typeof Ionicons.glyphMap;

export interface ListSectionProps {
  header?: string;
  footer?: string;
  /** Left inset of the hairline between rows. 16 for plain rows, 58 when rows start with an icon tile. */
  separatorInset?: number;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** iOS inset-grouped section: grey header, white rounded group with hairline separators, grey footer. */
export function ListSection({ header, footer, separatorInset = spacing.lg, children, style }: ListSectionProps) {
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={[styles.section, style]}>
      {!!header && (
        <AppText variant="caption" weight="medium" color={colors.textMuted} style={styles.header} accessibilityRole="header">
          {header}
        </AppText>
      )}
      {rows.length > 0 && (
        <View style={styles.group}>
          {rows.map((row, i) => (
            <Fragment key={row.key ?? i}>
              {i > 0 && <Separator inset={separatorInset} />}
              {row}
            </Fragment>
          ))}
        </View>
      )}
      {!!footer && (
        <AppText variant="caption" color={colors.textSubtle} style={styles.footer}>
          {footer}
        </AppText>
      )}
    </View>
  );
}

export function Separator({ inset = spacing.lg }: { inset?: number }) {
  return <View style={[styles.separator, { marginLeft: inset }]} />;
}

/** Settings-style rounded square with a white glyph. */
export function IconTile({ name, color, size = 30 }: { name: IconName; color: string; size?: number }) {
  return (
    <View style={[styles.tile, { width: size, height: size, borderRadius: size * 0.23, backgroundColor: color }]}>
      <Ionicons name={name} size={size * 0.6} color={colors.white} />
    </View>
  );
}

export interface ListRowProps {
  title: string;
  subtitle?: string;
  value?: string;
  valueColor?: string;
  icon?: IconName;
  iconColor?: string;
  /** Custom leading view (avatar etc.); wins over `icon`. */
  leading?: ReactNode;
  /** Custom trailing view (Switch etc.); replaces value + chevron. */
  trailing?: ReactNode;
  titleColor?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  chevron?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

/** One row of a ListSection: [icon] title/subtitle ··· value ›. */
export function ListRow({
  title,
  subtitle,
  value,
  valueColor = colors.textSubtle,
  icon,
  iconColor = colors.brand,
  leading,
  trailing,
  titleColor = colors.text,
  onPress,
  onLongPress,
  chevron,
  disabled,
  accessibilityLabel,
  accessibilityHint,
}: ListRowProps) {
  const interactive = !!onPress || !!onLongPress;
  const showChevron = chevron ?? (!!onPress && !trailing);
  const content = (
    <>
      {leading ?? (icon ? <IconTile name={icon} color={iconColor} /> : null)}
      <View style={styles.rowBody}>
        <AppText variant="body" color={titleColor} numberOfLines={2}>
          {title}
        </AppText>
        {!!subtitle && (
          <AppText variant="small" color={colors.textSubtle} numberOfLines={3}>
            {subtitle}
          </AppText>
        )}
      </View>
      {trailing ?? (
        <>
          {!!value && (
            <AppText variant="body" color={valueColor} numberOfLines={1} style={styles.value}>
              {value}
            </AppText>
          )}
          {showChevron && <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />}
        </>
      )}
    </>
  );

  if (!interactive) {
    return (
      <View style={styles.row} accessible accessibilityLabel={accessibilityLabel ?? [title, subtitle, value].filter(Boolean).join(", ")}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? [title, value].filter(Boolean).join(", ")}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed, disabled && styles.rowDisabled]}
    >
      {content}
    </Pressable>
  );
}

export interface LargeTitleProps {
  title: string;
  /** Small line above the title (like the date in Apple News / Fitness). */
  eyebrow?: string;
  right?: ReactNode;
}

/** iOS large title (34 bold) for screens that draw their own header. */
export function LargeTitle({ title, eyebrow, right }: LargeTitleProps) {
  return (
    <View style={styles.largeTitle}>
      <View style={styles.flex}>
        {!!eyebrow && (
          <AppText variant="caption" weight="semibold" color={colors.textSubtle} numberOfLines={1}>
            {eyebrow}
          </AppText>
        )}
        <AppText variant="h1" weight="bold" numberOfLines={2} accessibilityRole="header">
          {title}
        </AppText>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { gap: 6 },
  header: { paddingHorizontal: spacing.lg, fontSize: 13 },
  footer: { paddingHorizontal: spacing.lg, fontSize: 13, lineHeight: 18 },
  group: { backgroundColor: colors.card, borderRadius: radii.lg, overflow: "hidden" },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator },
  tile: { alignItems: "center", justifyContent: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: TAP,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    backgroundColor: colors.card,
  },
  rowPressed: { backgroundColor: colors.fillPressed },
  rowDisabled: { opacity: 0.5 },
  rowBody: { flex: 1, minWidth: 0 },
  value: { flexShrink: 1, maxWidth: "55%", textAlign: "right" },
  largeTitle: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
});
