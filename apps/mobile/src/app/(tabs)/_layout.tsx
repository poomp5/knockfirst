import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet } from "react-native";
// SDK 57: `Tabs` from "expo-router" is deprecated in favour of "expo-router/js-tabs".
import { Tabs } from "expo-router/js-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCalls } from "@/lib/hooks";
import { colors, fonts } from "@/theme";

type IconName = keyof typeof Ionicons.glyphMap;

// iOS tab bars use filled glyphs in both states; the tint color marks the selected tab.
function tabIcon(name: IconName) {
  function TabIcon({ color }: { focused: boolean; color: unknown; size: number }) {
    return <Ionicons name={name} size={25} color={color as string} />;
  }
  return TabIcon;
}

// The incoming-call glyph says "calls waiting" better than a plain handset; sized down to sit level with the Ionicons.
function IncomingIcon({ color }: { focused: boolean; color: unknown; size: number }) {
  return <MaterialCommunityIcons name="phone-incoming" size={24} color={color as string} />;
}

export default function TabsLayout() {
  const { calls } = useCalls();
  const pending = calls.filter((c) => c.status === "needs_review").length;
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false, // every tab draws its own iOS large title
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.gray,
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 10, lineHeight: 16 },
        tabBarStyle: {
          backgroundColor: colors.bar,
          borderTopColor: colors.separator,
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: 0,
          // a little taller than the default so Thai marks below the line (ญ ุ ู) aren't clipped
          height: 62 + insets.bottom,
          paddingTop: 8,
        },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "สายเข้า",
          tabBarIcon: IncomingIcon,
          tabBarBadge: pending > 0 ? pending : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.danger, fontFamily: fonts.semibold, fontSize: 11 },
        }}
      />
      <Tabs.Screen
        name="whitelist"
        options={{
          title: "รายชื่อที่อนุญาต",
          tabBarIcon: tabIcon("people"),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "ตั้งค่า",
          tabBarIcon: tabIcon("settings"),
        }}
      />
    </Tabs>
  );
}
