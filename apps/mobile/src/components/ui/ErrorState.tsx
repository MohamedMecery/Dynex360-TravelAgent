import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { getApiErrorMessage } from "@/lib/errors";
import { useRtl } from "@/hooks/useRtl";
import { useTranslation } from "@/i18n/LocaleProvider";
import { useTheme } from "@/theme/useTheme";

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { textAlign } = useRtl();
  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: colors.destructive, textAlign }]}>
        {t("common.somethingWrong")}
      </Text>
      <Text style={[styles.message, { color: colors.textMuted, textAlign }]}>
        {getApiErrorMessage(error)}
      </Text>
      {onRetry ? (
        <Button title={t("common.retry")} onPress={onRetry} style={styles.btn} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 24, alignItems: "center", gap: 8 },
  title: { fontSize: 17, fontWeight: "600" },
  message: { fontSize: 14, textAlign: "center" },
  btn: { marginTop: 12, alignSelf: "stretch" },
});
