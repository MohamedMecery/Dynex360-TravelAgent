import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { formatLabel, formatMoney, QUOTATION_TIMELINE_TYPES } from "@/lib/constants";
import { useCustomer360 } from "@/hooks/api/useCustomer360";
import { usePermission } from "@/hooks/usePermission";
import { useStackTitle } from "@/hooks/useStackTitle";
import { useTranslation } from "@/i18n/LocaleProvider";
import type { MoreStackParamList } from "@/navigation/types";
import { useTheme } from "@/theme/useTheme";

type Props = NativeStackScreenProps<MoreStackParamList, "Customer360">;

export function Customer360Screen({ navigation, route }: Props) {
  const { id } = route.params;
  const { colors } = useTheme();
  const { t } = useTranslation();
  const canRead = usePermission("customers.read");
  const { data, isLoading, isError, error, refetch, isRefetching } = useCustomer360(id);

  useStackTitle(t("customer360.title"));

  if (!canRead) return <EmptyState title={t("permissions.customersRead")} />;
  if (isLoading) return <LoadingState />;
  if (isError || !data) {
    return <ErrorState error={error} onRetry={() => void refetch()} />;
  }

  const c = data.customer;
  const s = data.summary;
  const quotationEvents = data.timeline_preview.filter((e) =>
    (QUOTATION_TIMELINE_TYPES as readonly string[]).includes(e.event_type)
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
      }
    >
      <Text style={[styles.name, { color: colors.text }]}>
        {c.first_name} {c.last_name}
      </Text>
      {c.email ? <Text style={{ color: colors.textMuted }}>{c.email}</Text> : null}
      {c.phone ? <Text style={{ color: colors.textMuted }}>{c.phone}</Text> : null}

      <Card>
        <Text style={[styles.section, { color: colors.text }]}>{t("customer360.summary")}</Text>
        <Text style={{ color: colors.textMuted }}>
          {t("customer360.bookingsCount", {
            total: s.booking_count,
            confirmed: s.confirmed_booking_count,
          })}
        </Text>
        <Text style={{ color: colors.textMuted }}>
          {t("customer360.openOpps", { count: s.open_opportunity_count })}
        </Text>
        <Text style={{ color: colors.textMuted }}>
          {t("customer360.activitiesCount", { count: s.activity_count })}
        </Text>
        {data.meta.permissions.financial && s.lifetime_customer_value != null ? (
          <Text style={{ color: colors.text, marginTop: 8, fontWeight: "600" }}>
            {t("customer360.revenue")}:{" "}
            {formatMoney(s.lifetime_customer_value, s.currency)}
          </Text>
        ) : null}
      </Card>

      <Card>
        <Text style={[styles.section, { color: colors.text }]}>{t("customer360.opportunities")}</Text>
        {data.tabs.opportunities.slice(0, 5).map((o) => (
          <Text key={o.id} style={{ color: colors.textMuted, marginBottom: 4 }}>
            {o.opportunity_number} · {formatLabel(o.stage)}
          </Text>
        ))}
        {data.tabs.opportunities.length === 0 ? (
          <Text style={{ color: colors.textMuted }}>{t("customer360.emptySection")}</Text>
        ) : null}
      </Card>

      <Card>
        <Text style={[styles.section, { color: colors.text }]}>{t("customer360.bookings")}</Text>
        {data.tabs.bookings.slice(0, 5).map((b) => (
          <Pressable
            key={b.id}
            onPress={() => navigation.navigate("BookingDetail", { id: b.id })}
          >
            <Text style={{ color: colors.primary, marginBottom: 4 }}>
              {b.reference_number} · {formatLabel(b.status)}
            </Text>
          </Pressable>
        ))}
      </Card>

      <Card>
        <Text style={[styles.section, { color: colors.text }]}>{t("customer360.quotations")}</Text>
        {quotationEvents.slice(0, 6).map((e) => (
          <Text key={e.id} style={{ color: colors.textMuted, marginBottom: 4 }}>
            {formatLabel(e.event_type)} — {e.title}
          </Text>
        ))}
        {quotationEvents.length === 0 ? (
          <Text style={{ color: colors.textMuted }}>{t("customer360.emptySection")}</Text>
        ) : null}
      </Card>

      <Button
        title={t("customer360.timeline")}
        onPress={() => navigation.navigate("CustomerTimeline", { id })}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  name: { fontSize: 22, fontWeight: "700" },
  section: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
});
