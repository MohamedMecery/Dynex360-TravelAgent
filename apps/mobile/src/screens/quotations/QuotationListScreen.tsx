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
import { formatLabel, formatMoney, QUOTATION_STATUSES } from "@/lib/constants";
import { useQuotations, type QuotationListFilters } from "@/hooks/api/useQuotations";
import { usePermission } from "@/hooks/usePermission";
import { useStackTitle } from "@/hooks/useStackTitle";
import { useTranslation } from "@/i18n/LocaleProvider";
import type { MoreStackParamList } from "@/navigation/types";
import type { Quotation } from "@/types/revenue";
import { useTheme } from "@/theme/useTheme";

type Props = NativeStackScreenProps<MoreStackParamList, "QuotationList">;

export function QuotationListScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const canRead = usePermission("crm.quotations.read");
  const canWrite = usePermission("crm.quotations.write");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const filters: QuotationListFilters = useMemo(
    () => ({
      status: status || undefined,
      search: search.trim() || undefined,
    }),
    [search, status]
  );
  const query = useQuotations(filters);
  const items = query.data?.pages.flatMap((p) => p.data) ?? [];

  useStackTitle(t("quotations.title"));

  if (!canRead) {
    return (
      <EmptyState title={t("permissions.quotationsRead")} />
    );
  }
  if (query.isLoading) return <LoadingState />;
  if (query.isError) {
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.toolbar}>
        <Input placeholder={t("common.search")} value={search} onChangeText={setSearch} />
        <Select
          label={t("quotations.status")}
          value={status}
          options={[
            { value: "", label: t("common.all") },
            ...QUOTATION_STATUSES.map((s) => ({ value: s, label: formatLabel(s) })),
          ]}
          onChange={setStatus}
        />
        {canWrite ? (
          <Button
            title={t("quotations.new")}
            onPress={() => navigation.navigate("QuotationCreate", {})}
          />
        ) : null}
      </View>
      <FlatList
        data={items}
        keyExtractor={(q) => q.id}
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
        }
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        ListEmptyComponent={<EmptyState title={t("quotations.empty")} />}
        renderItem={({ item }) => (
          <QuotationRow
            q={item}
            onPress={() => navigation.navigate("QuotationDetail", { id: item.id })}
          />
        )}
      />
    </View>
  );
}

function QuotationRow({ q, onPress }: { q: Quotation; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress}>
      <Card style={styles.row}>
        <Text style={{ color: colors.text, fontWeight: "600" }}>{q.quotation_number}</Text>
        <Badge label={formatLabel(q.status)} />
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>
          {formatMoney(q.total_amount, q.currency)}
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
