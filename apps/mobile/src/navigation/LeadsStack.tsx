import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LeadCreateScreen, LeadEditScreen } from "@/screens/leads/LeadFormScreen";
import { LeadDetailScreen } from "@/screens/leads/LeadDetailScreen";
import { LeadListScreen } from "@/screens/leads/LeadListScreen";
import type { LeadsStackParamList } from "@/navigation/types";
import { useTheme } from "@/theme/useTheme";

const Stack = createNativeStackNavigator<LeadsStackParamList>();

export function LeadsStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="LeadList" component={LeadListScreen} options={{ title: "Leads" }} />
      <Stack.Screen name="LeadDetail" component={LeadDetailScreen} options={{ title: "Lead" }} />
      <Stack.Screen name="LeadCreate" component={LeadCreateScreen} options={{ title: "New lead" }} />
      <Stack.Screen name="LeadEdit" component={LeadEditScreen} options={{ title: "Edit lead" }} />
    </Stack.Navigator>
  );
}
