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
import { formatLabel, OPPORTUNITY_STAGES } from "@/lib/constants";
import { useOpportunities, type OpportunityListFilters } from "@/hooks/api/useOpportunities";
import { useSalesSnapshots } from "@/hooks/api/useSalesAi";
import { usePermission } from "@/hooks/usePermission";
import { useStackTitle } from "@/hooks/useStackTitle";
import { useTranslation } from "@/i18n/LocaleProvider";
import type { PipelineStackParamList } from "@/navigation/types";
import type { Opportunity } from "@/types/crm";
import { useTheme } from "@/theme/useTheme";

type Props = NativeStackScreenProps<PipelineStackParamList, "OpportunityList">;

export function OpportunityListScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const canWrite = usePermission("crm.opportunities.write");
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("");
  const filters: OpportunityListFilters = useMemo(
    () => ({ search: search.trim() || undefined, stage: stage || undefined }),
    [search, stage]
  );
  const query = useOpportunities(filters);
  const items = query.data?.pages.flatMap((p) => p.data) ?? [];
  const oppIds = useMemo(() => items.map((o) => o.id), [items]);
  const { data: snapshots } = useSalesSnapshots("opportunity", oppIds);
  const healthMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of snapshots ?? []) {
      if (s.health_score != null) map.set(s.entity_id, s.health_score);
    }
    return map;
  }, [snapshots]);

  useStackTitle(t("opportunities.pipelineTitle"));

  if (query.isLoading) return <LoadingState />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.toolbar}>
        <Input placeholder={t("opportunities.search")} value={search} onChangeText={setSearch} />
        <Select
          label={t("opportunities.stage")}
          value={stage}
          options={[
            { value: "", label: t("opportunities.allStages") },
            ...OPPORTUNITY_STAGES.map((s) => ({ value: s, label: formatLabel(s) })),
          ]}
          onChange={setStage}
        />
        {canWrite ? (
          <Button title={t("opportunities.new")} onPress={() => navigation.navigate("OpportunityCreate", {})} />
        ) : null}
      </View>
      <FlatList
        data={items}
        keyExtractor={(o) => o.id}
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
        }
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        ListEmptyComponent={<EmptyState title={t("opportunities.empty")} />}
        renderItem={({ item }) => (
          <OppRow
            opp={item}
            healthScore={healthMap.get(item.id)}
            onPress={() => navigation.navigate("OpportunityDetail", { id: item.id })}
          />
        )}
      />
    </View>
  );
}

function OppRow({
  opp,
  healthScore,
  onPress,
}: {
  opp: Opportunity;
  healthScore?: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <Pressable onPress={onPress}>
      <Card style={styles.row}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: colors.text, fontWeight: "600" }}>{opp.opportunity_number}</Text>
          {healthScore != null && healthScore < 50 ? (
            <Badge label={`H${healthScore}`} tone="destructive" />
          ) : healthScore != null ? (
            <Badge label={`H${healthScore}`} tone="success" />
          ) : null}
        </View>
        <Badge label={formatLabel(opp.stage)} />
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>
          {opp.estimated_revenue != null
            ? opp.estimated_revenue.toLocaleString(undefined, {
                style: "currency",
                currency: opp.currency ?? "USD",
              })
            : t("common.dash")}{" "}
          · {opp.probability ?? 0}%
        </Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  toolbar: { padding: 16, gap: 10 },
  row: { marginHorizontal: 16, marginBottom: 10, gap: 6 },
});
