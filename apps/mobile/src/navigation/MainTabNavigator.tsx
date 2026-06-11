import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";
import { ActivitiesStack } from "@/navigation/ActivitiesStack";
import { DashboardStack } from "@/navigation/DashboardStack";
import { LeadsStack } from "@/navigation/LeadsStack";
import { MoreStack } from "@/navigation/MoreStack";
import { PipelineStack } from "@/navigation/PipelineStack";
import type { MainTabParamList } from "@/navigation/types";
import { useTranslation } from "@/i18n/LocaleProvider";
import { useTheme } from "@/theme/useTheme";

const Tab = createBottomTabNavigator<MainTabParamList>();

function TabLabel({ label, focused, color }: { label: string; focused: boolean; color: string }) {
  return (
    <Text style={{ fontSize: 11, fontWeight: focused ? "700" : "500", color }}>{label}</Text>
  );
}

export function MainTabNavigator() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tab.Screen
        name="Home"
        component={DashboardStack}
        options={{
          tabBarLabel: ({ focused, color }) => (
            <TabLabel label={t("tabs.home")} focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Leads"
        component={LeadsStack}
        options={{
          tabBarLabel: ({ focused, color }) => (
            <TabLabel label={t("tabs.leads")} focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Pipeline"
        component={PipelineStack}
        options={{
          tabBarLabel: ({ focused, color }) => (
            <TabLabel label={t("tabs.pipeline")} focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Activities"
        component={ActivitiesStack}
        options={{
          tabBarLabel: ({ focused, color }) => (
            <TabLabel label={t("tabs.activities")} focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreStack}
        options={{
          tabBarLabel: ({ focused, color }) => (
            <TabLabel label={t("tabs.more")} focused={focused} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
