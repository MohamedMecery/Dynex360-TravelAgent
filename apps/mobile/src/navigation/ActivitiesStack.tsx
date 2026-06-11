import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  ActivityCreateScreen,
  ActivityEditScreen,
} from "@/screens/activities/ActivityFormScreen";
import { ActivityDetailScreen } from "@/screens/activities/ActivityDetailScreen";
import { ActivityListScreen } from "@/screens/activities/ActivityListScreen";
import type { ActivitiesStackParamList } from "@/navigation/types";
import { useTheme } from "@/theme/useTheme";

const Stack = createNativeStackNavigator<ActivitiesStackParamList>();

export function ActivitiesStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="ActivityList" component={ActivityListScreen} options={{ title: "Activities" }} />
      <Stack.Screen name="ActivityDetail" component={ActivityDetailScreen} options={{ title: "Activity" }} />
      <Stack.Screen name="ActivityCreate" component={ActivityCreateScreen} options={{ title: "New activity" }} />
      <Stack.Screen name="ActivityEdit" component={ActivityEditScreen} options={{ title: "Edit activity" }} />
    </Stack.Navigator>
  );
}
