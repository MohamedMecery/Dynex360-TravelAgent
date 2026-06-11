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
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/ui/LoadingState";
import { Select } from "@/components/ui/Select";
import { BOOKING_STATUSES, formatLabel, formatMoney } from "@/lib/constants";
import { useBookings, type BookingListFilters } from "@/hooks/api/useBookings";
import { useOpsSnapshots } from "@/hooks/api/useOperationsAi";
import { usePermission } from "@/hooks/usePermission";
import { useStackTitle } from "@/hooks/useStackTitle";
import { useTranslation } from "@/i18n/LocaleProvider";
import type { MoreStackParamList } from "@/navigation/types";
import type { BookingListItem } from "@/types/revenue";
import { useTheme } from "@/theme/useTheme";

type Props = NativeStackScreenProps<MoreStackParamList, "BookingList">;

export function BookingListScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const canRead = usePermission("bookings.read");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const filters: BookingListFilters = useMemo(
    () => ({
      status: status || undefined,
      search: search.trim() || undefined,
    }),
    [search, status]
  );
  const query = useBookings(filters);
  const items = query.data?.pages.flatMap((p) => p.data) ?? [];
  const bookingIds = useMemo(() => items.map((b) => b.id), [items]);
  const { data: opsSnapshots } = useOpsSnapshots(bookingIds);
  const opsMap = useMemo(() => {
    const map = new Map<string, { health?: number; readiness?: number; status?: string }>();
    for (const s of opsSnapshots ?? []) {
      map.set(s.entity_id, {
        health: s.health_score ?? undefined,
        readiness: s.readiness_score ?? undefined,
        status: s.operational_status ?? undefined,
      });
    }
    return map;
  }, [opsSnapshots]);

  useStackTitle(t("bookings.title"));

  if (!canRead) return <EmptyState title={t("permissions.bookingsRead")} />;
  if (query.isLoading) return <LoadingState />;
  if (query.isError) {
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.toolbar}>
        <Input placeholder={t("common.search")} value={search} onChangeText={setSearch} />
        <Select
          label={t("bookings.status")}
          value={status}
          options={[
            { value: "", label: t("common.all") },
            ...BOOKING_STATUSES.map((s) => ({ value: s, label: formatLabel(s) })),
          ]}
          onChange={setStatus}
        />
      </View>
      <FlatList
        data={items}
        keyExtractor={(b) => b.id}
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
        }
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        ListEmptyComponent={<EmptyState title={t("bookings.empty")} />}
        renderItem={({ item }) => (
          <BookingRow
            b={item}
            ops={opsMap.get(item.id)}
            onPress={() => navigation.navigate("BookingDetail", { id: item.id })}
          />
        )}
      />
    </View>
  );
}

function BookingRow({
  b,
  ops,
  onPress,
}: {
  b: BookingListItem;
  ops?: { health?: number; readiness?: number; status?: string };
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const name = b.customers
    ? `${b.customers.first_name} ${b.customers.last_name}`
    : t("bookings.customer");

  const opsTone =
    ops?.status === "critical" || ops?.status === "at_risk"
      ? "destructive"
      : ops?.status === "attention_required"
        ? "warning"
        : ops?.status === "healthy"
          ? "success"
          : "default";

  return (
    <Pressable onPress={onPress}>
      <Card style={styles.row}>
        <Text style={{ color: colors.text, fontWeight: "600" }}>{b.reference_number}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          <Badge label={formatLabel(b.status)} />
          {ops?.health != null && (
            <Badge label={`${t("mobile.ops.health")} ${ops.health}`} tone={opsTone} />
          )}
          {ops?.readiness != null && (
            <Badge label={`${t("mobile.ops.readiness")} ${ops.readiness}%`} tone={opsTone} />
          )}
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>
          {name} · {formatMoney(b.total_amount, b.currency)}
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
