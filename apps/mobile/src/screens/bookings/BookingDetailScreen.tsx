import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { BOOKING_STATUSES, formatLabel, formatMoney } from "@/lib/constants";
import { getApiErrorMessage } from "@/lib/errors";
import { useBooking, useUpdateBookingStatus } from "@/hooks/api/useBookings";
import { usePermission } from "@/hooks/usePermission";
import { useStackTitle } from "@/hooks/useStackTitle";
import { useTranslation } from "@/i18n/LocaleProvider";
import type { MoreStackParamList } from "@/navigation/types";
import type { BookingStatus } from "@/types/revenue";
import { useTheme } from "@/theme/useTheme";

type Props = NativeStackScreenProps<MoreStackParamList, "BookingDetail">;

const STATUS_PERMISSION: Record<BookingStatus, string> = {
  draft: "bookings.update",
  confirmed: "bookings.confirm",
  completed: "bookings.complete",
  cancelled: "bookings.cancel",
};

export function BookingDetailScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { data: b, isLoading, isError, error, refetch } = useBooking(id);
  const updateStatus = useUpdateBookingStatus(id);

  useStackTitle(t("bookings.detail"));

  if (isLoading) return <LoadingState />;
  if (isError || !b) return <ErrorState error={error} onRetry={() => void refetch()} />;

  const customerName = b.customers
    ? `${b.customers.first_name} ${b.customers.last_name}`
    : b.customer_id;

  const onStatusChange = (status: BookingStatus) => {
    updateStatus.mutate(status, {
      onSuccess: () =>
        Alert.alert(t("common.updated"), t("bookings.statusUpdated", { status: formatLabel(status) })),
      onError: (e) => Alert.alert(t("common.error"), getApiErrorMessage(e)),
    });
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{b.reference_number}</Text>
        <Badge label={formatLabel(b.status)} />
      </View>

      <Card>
        <Text style={{ color: colors.textMuted }}>{t("bookings.customer")}</Text>
        <Text style={{ color: colors.text }}>{customerName}</Text>
        {b.customers?.id || b.customer_id ? (
          <Button
            title={t("quotations.viewCustomer")}
            variant="secondary"
            onPress={() =>
              navigation.navigate("Customer360", {
                id: b.customers?.id ?? b.customer_id,
              })
            }
          />
        ) : null}
        <Text style={[styles.mt, { color: colors.textMuted }]}>{t("bookings.package")}</Text>
        <Text style={{ color: colors.text }}>{b.packages?.title ?? b.package_id}</Text>
        <Text style={[styles.mt, { color: colors.textMuted }]}>{t("quotations.total")}</Text>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "600" }}>
          {formatMoney(b.total_amount, b.currency)}
        </Text>
        {b.travel_date ? (
          <Text style={{ color: colors.textMuted, marginTop: 8 }}>
            {t("bookings.travel", { date: b.travel_date })}
          </Text>
        ) : null}
      </Card>

      {b.quotation_id ? (
        <Card>
          <Text style={{ color: colors.textMuted }}>{t("bookings.relatedQuotation")}</Text>
          <Button
            title={t("bookings.openQuotation")}
            variant="secondary"
            onPress={() => navigation.navigate("QuotationDetail", { id: b.quotation_id! })}
          />
        </Card>
      ) : null}

      <Card>
        <Text style={[styles.section, { color: colors.text }]}>{t("bookings.travelers")}</Text>
        {b.booking_travelers.map((tr) => (
          <Text key={tr.id} style={{ color: colors.text, marginBottom: 4 }}>
            {tr.first_name} {tr.last_name}
          </Text>
        ))}
        {b.booking_travelers.length === 0 ? (
          <Text style={{ color: colors.textMuted }}>{t("common.dash")}</Text>
        ) : null}
      </Card>

      <Card>
        <Text style={[styles.section, { color: colors.text }]}>{t("bookings.history")}</Text>
        {b.booking_status_history.map((h) => (
          <Text key={h.id} style={{ color: colors.textMuted, marginBottom: 4 }}>
            {h.from_status ? formatLabel(h.from_status) : t("common.dash")} → {formatLabel(h.to_status)} ·{" "}
            {new Date(h.changed_at).toLocaleString()}
          </Text>
        ))}
      </Card>

      <BookingStatusActions current={b.status} onSelect={onStatusChange} pending={updateStatus.isPending} />
    </ScrollView>
  );
}

function BookingStatusActions({
  current,
  onSelect,
  pending,
}: {
  current: BookingStatus;
  onSelect: (s: BookingStatus) => void;
  pending: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const canDraft = usePermission("bookings.update");
  const canConfirm = usePermission("bookings.confirm");
  const canComplete = usePermission("bookings.complete");
  const canCancel = usePermission("bookings.cancel");
  const canWildcard = usePermission("bookings.*");

  const allowed = (status: BookingStatus): boolean => {
    if (canWildcard) return true;
    if (status === "draft") return canDraft;
    if (status === "confirmed") return canConfirm;
    if (status === "completed") return canComplete;
    if (status === "cancelled") return canCancel;
    return false;
  };

  const targets = BOOKING_STATUSES.filter((s) => s !== current && allowed(s));
  if (targets.length === 0) return null;

  return (
    <Card>
      <Text style={{ color: colors.text, fontWeight: "600", marginBottom: 8 }}>
        {t("bookings.updateStatus")}
      </Text>
      {targets.map((status) => (
        <Button
          key={status}
          title={formatLabel(status)}
          variant="secondary"
          disabled={pending}
          onPress={() => onSelect(status)}
        />
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  header: { gap: 8 },
  title: { fontSize: 22, fontWeight: "700" },
  section: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  mt: { marginTop: 8 },
});
