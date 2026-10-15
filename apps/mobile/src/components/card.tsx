import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { cardStyle, spacing } from "@/theme";

export interface CardProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** White inset-grouped surface (theme.cardStyle) with default padding. */
export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: { ...cardStyle, padding: spacing.lg },
});
