import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/auth/AuthContext";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { RootNavigator } from "@/navigation/RootNavigator";
import { QueryProvider } from "@/providers/QueryProvider";

export default function App() {
  return (
    <SafeAreaProvider>
      <LocaleProvider>
        <AuthProvider>
          <QueryProvider>
            <RootNavigator />
            <StatusBar style="auto" />
          </QueryProvider>
        </AuthProvider>
      </LocaleProvider>
    </SafeAreaProvider>
  );
}
