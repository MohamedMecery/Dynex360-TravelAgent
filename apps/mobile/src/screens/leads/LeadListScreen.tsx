import { useMemo, useState } from "react";
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
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/ui/LoadingState";
import { Select } from "@/components/ui/Select";
import { formatLabel, LEAD_SOURCES, LEAD_STATUSES } from "@/lib/constants";
import { useLeads, type LeadListFilters } from "@/hooks/api/useLeads";
import { useSalesSnapshots } from "@/hooks/api/useSalesAi";
import { usePermission } from "@/hooks/usePermission";
import { useStackTitle } from "@/hooks/useStackTitle";
import { useTranslation } from "@/i18n/LocaleProvider";
import type { LeadsStackParamList } from "@/navigation/types";
import type { Lead } from "@/types/crm";
import { useTheme } from "@/theme/useTheme";

type Props = NativeStackScreenProps<LeadsStackParamList, "LeadList">;

export function LeadListScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const canWrite = usePermission("crm.leads.write");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const filters: LeadListFilters = useMemo(
    () => ({ search: search.trim() || undefined, status: status || undefined }),
    [search, status]
  );
  const { data, isLoading, isError, error, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useLeads(filters);

  useStackTitle(t("leads.title"));

  const leads = data?.pages.flatMap((p) => p.data) ?? [];
  const leadIds = useMemo(() => leads.map((l) => l.id), [leads]);
  const { data: snapshots } = useSalesSnapshots("lead", leadIds);
  const snapshotMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of snapshots ?? []) {
      if (s.priority_tier) map.set(s.entity_id, s.priority_tier);
    }
    return map;
  }, [snapshots]);

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.toolbar}>
        <Input
          placeholder={t("leads.search")}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
        <Select
          label={t("leads.status")}
          value={status}
          options={[
            { value: "", label: t("leads.allStatuses") },
            ...LEAD_STATUSES.map((s) => ({ value: s, label: formatLabel(s) })),
          ]}
          onChange={setStatus}
        />
        {canWrite ? (
          <Button title={t("leads.new")} onPress={() => navigation.navigate("LeadCreate")} />
        ) : null}
      </View>
      <FlatList
        data={leads}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
        }}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <EmptyState title={t("leads.empty")} message={t("leads.emptyMessage")} />
        }
        renderItem={({ item }) => (
          <LeadRow
            lead={item}
            priorityTier={snapshotMap.get(item.id)}
            onPress={() => navigation.navigate("LeadDetail", { id: item.id })}
          />
        )}
      />
    </View>
  );
}

function LeadRow({
  lead,
  priorityTier,
  onPress,
}: {
  lead: Lead;
  priorityTier?: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress}>
      <Card style={styles.row}>
        <View style={styles.rowTop}>
          <Text style={[styles.name, { color: colors.text }]}>{lead.full_name}</Text>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {priorityTier ? (
              <Badge label={priorityTier.toUpperCase()} tone={priorityTier === "hot" ? "destructive" : "warning"} />
            ) : null}
            <Badge label={formatLabel(lead.status)} />
          </View>
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>
          {lead.lead_number} · {formatLabel(lead.source)}
        </Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  toolbar: { padding: 16, gap: 10 },
  row: { marginHorizontal: 16, marginBottom: 10 },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  name: { fontSize: 16, fontWeight: "600", flex: 1 },
});
