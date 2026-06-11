import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n/LocaleProvider";
import type { RootStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Bootstrap">;

export function BootstrapScreen({ navigation }: Props) {
  const { status } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    if (status === "loading") {
      return;
    }
    if (status === "authenticated") {
      navigation.replace("Main", { screen: "Home" });
    } else {
      navigation.replace("Login", undefined);
    }
  }, [status, navigation]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
      <Text style={styles.label}>{t("app.name")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  label: {
    fontSize: 18,
    fontWeight: "600",
  },
});
