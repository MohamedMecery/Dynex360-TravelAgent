import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { DashboardScreen } from "@/screens/dashboard/DashboardScreen";
import type { DashboardStackParamList } from "@/navigation/types";
import { useTheme } from "@/theme/useTheme";

const Stack = createNativeStackNavigator<DashboardStackParamList>();

export function DashboardStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: "CRM Dashboard" }} />
    </Stack.Navigator>
  );
}
