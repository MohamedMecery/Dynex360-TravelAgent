import { useMemo } from "react";
import {
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { formatLabel } from "@/lib/constants";
import { useCustomerTimeline } from "@/hooks/api/useCustomer360";
import { usePermission } from "@/hooks/usePermission";
import { useStackTitle } from "@/hooks/useStackTitle";
import { useTranslation } from "@/i18n/LocaleProvider";
import type { MoreStackParamList } from "@/navigation/types";
import type { TimelineEvent } from "@/types/revenue";
import { useTheme } from "@/theme/useTheme";

type Props = NativeStackScreenProps<MoreStackParamList, "CustomerTimeline">;

function groupByDate(events: TimelineEvent[]): { title: string; data: TimelineEvent[] }[] {
  const map = new Map<string, TimelineEvent[]>();
  for (const e of events) {
    const day = e.occurred_at.slice(0, 10);
    const list = map.get(day) ?? [];
    list.push(e);
    map.set(day, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([title, data]) => ({ title, data }));
}

export function CustomerTimelineScreen({ route }: Props) {
  const { id } = route.params;
  const { colors } = useTheme();
  const { t } = useTranslation();
  const canRead = usePermission("customers.read");
  const query = useCustomerTimeline(id);
  const events = query.data?.pages.flatMap((p) => p.data) ?? [];
  const sections = useMemo(() => groupByDate(events), [events]);

  useStackTitle(t("customer360.timelineTitle"));

  if (!canRead) return <EmptyState title={t("permissions.customersRead")} />;
  if (query.isLoading) return <LoadingState />;
  if (query.isError) {
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  }

  return (
    <SectionList
      style={{ flex: 1, backgroundColor: colors.background }}
      sections={sections}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
      }
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
      }}
      ListEmptyComponent={<EmptyState title={t("customer360.emptyTimeline")} />}
      renderSectionHeader={({ section: { title } }) => (
        <Text style={[styles.day, { color: colors.textMuted, backgroundColor: colors.background }]}>
          {title}
        </Text>
      )}
      renderItem={({ item }) => (
        <View style={[styles.row, { borderColor: colors.border }]}>
          <Text style={{ color: colors.text, fontWeight: "500" }}>{item.title}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>
            {formatLabel(item.event_type)}
          </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  day: { paddingHorizontal: 16, paddingVertical: 8, fontWeight: "600" },
  row: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderWidth: 1,
    borderRadius: 10,
    gap: 4,
  },
});
