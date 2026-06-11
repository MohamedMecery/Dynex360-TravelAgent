import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { BookingDetailScreen } from "@/screens/bookings/BookingDetailScreen";
import { BookingListScreen } from "@/screens/bookings/BookingListScreen";
import { Customer360Screen } from "@/screens/customer360/Customer360Screen";
import { CustomerTimelineScreen } from "@/screens/customer360/CustomerTimelineScreen";
import { MoreMenuScreen } from "@/screens/more/MoreMenuScreen";
import { ProfileScreen } from "@/screens/more/ProfileScreen";
import {
  QuotationCreateScreen,
  QuotationEditScreen,
} from "@/screens/quotations/QuotationFormScreen";
import { QuotationDetailScreen } from "@/screens/quotations/QuotationDetailScreen";
import { QuotationListScreen } from "@/screens/quotations/QuotationListScreen";
import type { MoreStackParamList } from "@/navigation/types";
import { useTheme } from "@/theme/useTheme";

const Stack = createNativeStackNavigator<MoreStackParamList>();

export function MoreStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      initialRouteName="MoreMenu"
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="MoreMenu" component={MoreMenuScreen} options={{ title: "More" }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "Profile" }} />
      <Stack.Screen
        name="QuotationList"
        component={QuotationListScreen}
        options={{ title: "Quotations" }}
      />
      <Stack.Screen
        name="QuotationDetail"
        component={QuotationDetailScreen}
        options={{ title: "Quotation" }}
      />
      <Stack.Screen
        name="QuotationCreate"
        component={QuotationCreateScreen}
        options={{ title: "New quotation" }}
      />
      <Stack.Screen
        name="QuotationEdit"
        component={QuotationEditScreen}
        options={{ title: "Edit quotation" }}
      />
      <Stack.Screen
        name="BookingList"
        component={BookingListScreen}
        options={{ title: "Bookings" }}
      />
      <Stack.Screen
        name="BookingDetail"
        component={BookingDetailScreen}
        options={{ title: "Booking" }}
      />
      <Stack.Screen
        name="Customer360"
        component={Customer360Screen}
        options={{ title: "Customer 360" }}
      />
      <Stack.Screen
        name="CustomerTimeline"
        component={CustomerTimelineScreen}
        options={{ title: "Timeline" }}
      />
    </Stack.Navigator>
  );
}
