import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { formatLabel } from "@/lib/constants";
import { getApiErrorMessage } from "@/lib/errors";
import { useActivity, useCompleteActivity } from "@/hooks/api/useActivities";
import { usePermission } from "@/hooks/usePermission";
import { useStackTitle } from "@/hooks/useStackTitle";
import { useTranslation } from "@/i18n/LocaleProvider";
import type { ActivitiesStackParamList } from "@/navigation/types";
import { useTheme } from "@/theme/useTheme";

type Props = NativeStackScreenProps<ActivitiesStackParamList, "ActivityDetail">;

export function ActivityDetailScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const { colors } = useTheme();
  const { t } = useTranslation();
  const canWrite = usePermission("crm.activities.write");
  const { data: activity, isLoading, isError, error, refetch } = useActivity(id);
  const complete = useCompleteActivity();

  useStackTitle(t("activities.detail"));

  if (isLoading) return <LoadingState />;
  if (isError || !activity) return <ErrorState error={error} onRetry={() => void refetch()} />;

  const onComplete = () => {
    complete.mutate(activity, {
      onSuccess: () => Alert.alert(t("common.done"), t("activities.completedMessage")),
      onError: (e) => Alert.alert(t("common.error"), getApiErrorMessage(e)),
    });
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text }]}>{activity.subject}</Text>
      <View style={styles.badges}>
        <Badge label={formatLabel(activity.activity_type)} />
        <Badge label={formatLabel(activity.status)} />
      </View>
      <Card>
        {activity.due_date ? (
          <Text style={{ color: colors.text }}>
            {t("activities.dueLabel", { date: new Date(activity.due_date).toLocaleString() })}
          </Text>
        ) : null}
        {activity.description ? (
          <Text style={{ color: colors.textMuted, marginTop: 8 }}>{activity.description}</Text>
        ) : null}
      </Card>
      {canWrite && activity.status !== "completed" ? (
        <View style={styles.actions}>
          <Button title={t("activities.markComplete")} onPress={onComplete} loading={complete.isPending} />
          <Button
            title={t("common.edit")}
            variant="secondary"
            onPress={() => navigation.navigate("ActivityEdit", { id })}
          />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: "700" },
  badges: { flexDirection: "row", gap: 8 },
  actions: { gap: 10 },
});
