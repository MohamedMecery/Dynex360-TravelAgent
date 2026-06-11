import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "@/i18n/LocaleProvider";
import { useTheme } from "@/theme/useTheme";

export function LoadingState({ message }: { message?: string }) {
  const { t } = useTranslation();
  const label = message ?? t("common.loading");
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={{ color: colors.textMuted }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
});
