import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  OpportunityCreateScreen,
  OpportunityEditScreen,
} from "@/screens/opportunities/OpportunityFormScreen";
import { OpportunityDetailScreen } from "@/screens/opportunities/OpportunityDetailScreen";
import { OpportunityListScreen } from "@/screens/opportunities/OpportunityListScreen";
import type { PipelineStackParamList } from "@/navigation/types";
import { useTheme } from "@/theme/useTheme";

const Stack = createNativeStackNavigator<PipelineStackParamList>();

export function PipelineStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="OpportunityList" component={OpportunityListScreen} options={{ title: "Pipeline" }} />
      <Stack.Screen name="OpportunityDetail" component={OpportunityDetailScreen} options={{ title: "Opportunity" }} />
      <Stack.Screen name="OpportunityCreate" component={OpportunityCreateScreen} options={{ title: "New opportunity" }} />
      <Stack.Screen name="OpportunityEdit" component={OpportunityEditScreen} options={{ title: "Edit opportunity" }} />
    </Stack.Navigator>
  );
}
