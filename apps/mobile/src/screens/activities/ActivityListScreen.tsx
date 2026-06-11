import { useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { formatLabel } from "@/lib/constants";
import { useActivities, type ActivityFilterTab } from "@/hooks/api/useActivities";
import { usePermission } from "@/hooks/usePermission";
import { useStackTitle } from "@/hooks/useStackTitle";
import { useTranslation } from "@/i18n/LocaleProvider";
import type { ActivitiesStackParamList } from "@/navigation/types";
import type { CrmActivity } from "@/types/crm";
import { useTheme } from "@/theme/useTheme";

type Props = NativeStackScreenProps<ActivitiesStackParamList, "ActivityList">;

export function ActivityListScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const canWrite = usePermission("crm.activities.write");
  const [tab, setTab] = useState<ActivityFilterTab>("open");
  const query = useActivities(tab);
  const items = query.data?.pages.flatMap((p) => p.data) ?? [];

  const tabs: { key: ActivityFilterTab; label: string }[] = [
    { key: "open", label: t("activities.open") },
    { key: "overdue", label: t("activities.overdue") },
    { key: "completed", label: t("activities.completed") },
  ];

  useStackTitle(t("activities.title"));

  if (query.isLoading) return <LoadingState />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.tabs}>
        {tabs.map((tabItem) => (
          <Pressable
            key={tabItem.key}
            onPress={() => setTab(tabItem.key)}
            style={[
              styles.tab,
              { backgroundColor: tab === tabItem.key ? colors.primary : colors.surfaceMuted },
            ]}
          >
            <Text
              style={{
                color: tab === tabItem.key ? colors.primaryForeground : colors.text,
                fontWeight: "600",
                fontSize: 13,
              }}
            >
              {tabItem.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {canWrite ? (
        <View style={styles.toolbar}>
          <Button title={t("activities.new")} onPress={() => navigation.navigate("ActivityCreate", {})} />
        </View>
      ) : null}
      <FlatList
        data={items}
        keyExtractor={(a) => a.id}
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
        }
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        ListEmptyComponent={<EmptyState title={t("activities.empty")} />}
        renderItem={({ item }) => (
          <ActivityRow
            activity={item}
            onPress={() => navigation.navigate("ActivityDetail", { id: item.id })}
          />
        )}
      />
    </View>
  );
}

function ActivityRow({
  activity,
  onPress,
}: {
  activity: CrmActivity;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const due = activity.due_date
    ? new Date(activity.due_date).toLocaleString()
    : t("activities.noDueDate");
  const overdue =
    activity.due_date &&
    activity.status !== "completed" &&
    new Date(activity.due_date) < new Date();

  return (
    <Pressable onPress={onPress}>
      <Card style={styles.row}>
        <Text style={{ color: colors.text, fontWeight: "600" }}>{activity.subject}</Text>
        <View style={styles.meta}>
          <Badge label={formatLabel(activity.activity_type)} />
          <Badge
            label={formatLabel(activity.status)}
            tone={overdue ? "destructive" : activity.status === "completed" ? "success" : "default"}
          />
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>
          {t("activities.dueLabel", { date: due })}
        </Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabs: { flexDirection: "row", gap: 8, padding: 16, paddingBottom: 0 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  toolbar: { padding: 16 },
  row: { marginHorizontal: 16, marginBottom: 10, gap: 6 },
  meta: { flexDirection: "row", gap: 8 },
});
