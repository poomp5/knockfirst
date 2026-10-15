import { Ionicons } from "@expo/vector-icons";
// SDK 57: `Tabs` from "expo-router" is deprecated in favour of "expo-router/js-tabs".
import { Tabs } from "expo-router/js-tabs";

import { useCalls } from "@/lib/hooks";
import { colors, fonts, fontSize } from "@/theme";

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(active: IconName, inactive: IconName) {
  function TabIcon({ focused, color, size }: { focused: boolean; color: unknown; size: number }) {
    return <Ionicons name={focused ? active : inactive} size={size} color={color as string} />;
  }
  return TabIcon;
}

export default function TabsLayout() {
  const { calls } = useCalls();
  const pending = calls.filter((c) => c.status === "needs_review").length;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: fontSize.caption },
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTintColor: colors.ink,
        headerTitleStyle: { fontFamily: fonts.semibold, fontSize: fontSize.large },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "สายเข้า",
          headerShown: false, // Inbox draws its own "ปกป้อง…" header
          tabBarIcon: tabIcon("call", "call-outline"),
          tabBarBadge: pending > 0 ? pending : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.danger, fontFamily: fonts.semibold },
        }}
      />
      <Tabs.Screen
        name="whitelist"
        options={{
          title: "รายชื่อที่อนุญาต",
          tabBarIcon: tabIcon("people", "people-outline"),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "ตั้งค่า",
          tabBarIcon: tabIcon("settings", "settings-outline"),
        }}
      />
    </Tabs>
  );
}
