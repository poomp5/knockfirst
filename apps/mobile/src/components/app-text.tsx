import { StyleSheet, Text, type StyleProp, type TextProps, type TextStyle } from "react-native";
import type { ReactNode } from "react";
import { colors, fontSize, fonts } from "@/theme";

export type AppTextVariant = "caption" | "small" | "body" | "large" | "title" | "h1" | "display";
export type AppTextWeight = "regular" | "medium" | "semibold" | "bold";

export interface AppTextProps extends Omit<TextProps, "style" | "children"> {
  variant?: AppTextVariant;
  weight?: AppTextWeight;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  children?: ReactNode;
}

// Thai glyphs have tall marks above/below, so line heights are generous (~1.5x) to avoid clipping.
const LINE_HEIGHT: Record<AppTextVariant, number> = {
  caption: 18,
  small: 21,
  body: 24,
  large: 27,
  title: 32,
  h1: 40,
  display: 56,
};

/** All text in the app goes through this (Noto Sans Thai). Never set fontWeight: Android needs the per-weight family. */
export function AppText({
  variant = "body",
  weight = "regular",
  color = colors.text,
  style,
  numberOfLines,
  children,
  ...rest
}: AppTextProps) {
  return (
    <Text
      {...rest}
      numberOfLines={numberOfLines}
      style={[
        styles.base,
        { fontFamily: fonts[weight], fontSize: fontSize[variant], lineHeight: LINE_HEIGHT[variant], color },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: { includeFontPadding: false },
});
