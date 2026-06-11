import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { linkingConfig } from "@/lib/linking";
import { useTranslation } from "@/i18n/LocaleProvider";
import { MainNavigator } from "@/navigation/MainNavigator";
import type { RootStackParamList } from "@/navigation/types";
import { BootstrapScreen } from "@/screens/BootstrapScreen";
import { LoginScreen } from "@/screens/LoginScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isRtl } = useTranslation();
  return (
    <NavigationContainer linking={linkingConfig} direction={isRtl ? "rtl" : "ltr"}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Bootstrap" component={BootstrapScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Main" component={MainNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
