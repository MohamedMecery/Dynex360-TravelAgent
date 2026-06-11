import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { QuotationWorkflowActions } from "@/components/quotations/QuotationWorkflowActions";
import { formatLabel, formatMoney } from "@/lib/constants";
import { useQuotation } from "@/hooks/api/useQuotations";
import { usePermission } from "@/hooks/usePermission";
import { useStackTitle } from "@/hooks/useStackTitle";
import { useTranslation } from "@/i18n/LocaleProvider";
import type { MoreStackParamList } from "@/navigation/types";
import { useTheme } from "@/theme/useTheme";

type Props = NativeStackScreenProps<MoreStackParamList, "QuotationDetail">;

export function QuotationDetailScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const { colors } = useTheme();
  const { t } = useTranslation();
  const canWrite = usePermission("crm.quotations.write");
  const { data: q, isLoading, isError, error, refetch } = useQuotation(id);

  useStackTitle(t("quotations.detail"));

  if (isLoading) return <LoadingState />;
  if (isError || !q) return <ErrorState error={error} onRetry={() => void refetch()} />;

  const editable = canWrite && (q.status === "draft" || q.status === "pending_approval");

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{q.quotation_number}</Text>
        <Badge label={formatLabel(q.status)} />
      </View>

      <Card>
        <Text style={{ color: colors.textMuted }}>{t("quotations.opportunity")}</Text>
        <Text style={{ color: colors.text }}>{q.opportunity_id}</Text>
        {q.customer_id ? (
          <>
            <Text style={[styles.mt, { color: colors.textMuted }]}>{t("quotations.customer")}</Text>
            <Button
              title={t("quotations.viewCustomer")}
              variant="secondary"
              onPress={() =>
                navigation.navigate("Customer360", { id: q.customer_id! })
              }
            />
          </>
        ) : null}
      </Card>

      <Card>
        <Text style={{ color: colors.textMuted }}>{t("quotations.total")}</Text>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}>
          {formatMoney(q.total_amount, q.currency)}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>
          {t("quotations.subtotal")} {formatMoney(q.subtotal, q.currency)} · {t("quotations.tax")}{" "}
          {formatMoney(q.tax_amount, q.currency)} · {t("quotations.discount")}{" "}
          {formatMoney(q.discount_amount, q.currency)}
        </Text>
        {q.valid_until ? (
          <Text style={{ color: colors.textMuted, marginTop: 8 }}>
            {t("quotations.validUntilDate", { date: q.valid_until })}
          </Text>
        ) : null}
      </Card>

      <Card>
        <Text style={[styles.section, { color: colors.text }]}>{t("quotations.items")}</Text>
        {(q.items ?? []).map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <Text style={{ color: colors.text, fontWeight: "500" }}>{item.description}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>
              {formatLabel(item.item_type)} · {item.quantity} ×{" "}
              {formatMoney(item.unit_price, q.currency)} ={" "}
              {formatMoney(item.line_total, q.currency)}
            </Text>
          </View>
        ))}
        {(q.items ?? []).length === 0 ? (
          <Text style={{ color: colors.textMuted }}>{t("quotations.noItems")}</Text>
        ) : null}
        {editable ? (
          <Button
            title={t("quotations.manageItems")}
            variant="secondary"
            onPress={() => navigation.navigate("QuotationEdit", { id: q.id })}
          />
        ) : null}
      </Card>

      {(q.sent_at || q.viewed_at || q.accepted_at) && (
        <Card>
          <Text style={[styles.section, { color: colors.text }]}>{t("quotations.timeline")}</Text>
          {q.sent_at ? (
            <Text style={{ color: colors.textMuted }}>
              {t("quotations.sentAt", { date: new Date(q.sent_at).toLocaleString() })}
            </Text>
          ) : null}
          {q.viewed_at ? (
            <Text style={{ color: colors.textMuted }}>
              {t("quotations.viewedAt", { date: new Date(q.viewed_at).toLocaleString() })}
            </Text>
          ) : null}
          {q.accepted_at ? (
            <Text style={{ color: colors.textMuted }}>
              {t("quotations.acceptedAt", { date: new Date(q.accepted_at).toLocaleString() })}
            </Text>
          ) : null}
        </Card>
      )}

      <QuotationWorkflowActions
        quotation={q}
        onOpenCustomer={(cid) => navigation.navigate("Customer360", { id: cid })}
        onOpenBooking={(bid) => navigation.navigate("BookingDetail", { id: bid })}
        onConverted={(bid) => navigation.navigate("BookingDetail", { id: bid })}
      />

      {editable ? (
        <Button title={t("common.edit")} onPress={() => navigation.navigate("QuotationEdit", { id })} />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  header: { gap: 8 },
  title: { fontSize: 22, fontWeight: "700" },
  section: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  itemRow: { marginBottom: 10, gap: 4 },
  mt: { marginTop: 8 },
});
