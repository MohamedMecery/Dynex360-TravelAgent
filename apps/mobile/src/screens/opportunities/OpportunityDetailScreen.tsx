import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Select } from "@/components/ui/Select";
import { formatLabel, OPPORTUNITY_STAGES } from "@/lib/constants";
import { getApiErrorMessage } from "@/lib/errors";
import {
  useCreateBookingFromOpportunity,
  useOpportunity,
  useUpdateOpportunity,
} from "@/hooks/api/useOpportunities";
import { usePermission } from "@/hooks/usePermission";
import { useStackTitle } from "@/hooks/useStackTitle";
import { useTranslation } from "@/i18n/LocaleProvider";
import type { PipelineStackParamList } from "@/navigation/types";
import type { OpportunityStage } from "@/types/crm";
import { useTheme } from "@/theme/useTheme";

type Props = NativeStackScreenProps<PipelineStackParamList, "OpportunityDetail">;

export function OpportunityDetailScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const { colors } = useTheme();
  const { t } = useTranslation();
  const canWrite = usePermission("crm.opportunities.write");
  const canQuotationWrite = usePermission("crm.quotations.write");
  const { data: opp, isLoading, isError, error, refetch } = useOpportunity(id);
  const update = useUpdateOpportunity(id);
  const createBooking = useCreateBookingFromOpportunity(id);

  useStackTitle(t("opportunities.detail"));

  if (isLoading) return <LoadingState />;
  if (isError || !opp) return <ErrorState error={error} onRetry={() => void refetch()} />;

  const onStageChange = (stage: OpportunityStage) => {
    update.mutate(
      { stage },
      {
        onSuccess: () =>
          Alert.alert(t("common.updated"), t("opportunities.stageUpdated", { stage: formatLabel(stage) })),
        onError: (e) => Alert.alert(t("common.error"), getApiErrorMessage(e)),
      }
    );
  };

  const onCreateBooking = () => {
    const amount = opp.estimated_revenue ?? opp.expected_budget ?? 0;
    createBooking.mutate(
      {
        notes: t("opportunities.bookingNotes"),
        line_items: [
          {
            description: `Booking for ${opp.opportunity_number}`,
            quantity: 1,
            unit_price: amount,
          },
        ],
      },
      {
        onSuccess: (r) =>
          Alert.alert(t("opportunities.bookingCreated"), t("opportunities.reference", { ref: r.reference_number })),
        onError: (e) => Alert.alert(t("common.error"), getApiErrorMessage(e)),
      }
    );
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{opp.opportunity_number}</Text>
        <Badge label={formatLabel(opp.stage)} />
      </View>
      <Card>
        <Text style={{ color: colors.textMuted }}>{t("opportunities.estimatedRevenue")}</Text>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "600" }}>
          {opp.estimated_revenue != null
            ? opp.estimated_revenue.toLocaleString(undefined, {
                style: "currency",
                currency: opp.currency,
              })
            : t("common.dash")}
        </Text>
        <Text style={{ color: colors.textMuted, marginTop: 8 }}>{t("opportunities.probability")}</Text>
        <Text style={{ color: colors.text }}>{opp.probability ?? 0}%</Text>
        {opp.destination_text ? (
          <>
            <Text style={{ color: colors.textMuted, marginTop: 8 }}>{t("opportunities.destination")}</Text>
            <Text style={{ color: colors.text }}>{opp.destination_text}</Text>
          </>
        ) : null}
      </Card>

      {canWrite ? (
        <Card>
          <Select
            label={t("opportunities.updateStage")}
            value={opp.stage}
            options={OPPORTUNITY_STAGES.map((s) => ({ value: s, label: formatLabel(s) }))}
            onChange={onStageChange}
          />
        </Card>
      ) : null}

      <View style={styles.actions}>
        {canWrite ? (
          <Button title={t("common.edit")} variant="secondary" onPress={() => navigation.navigate("OpportunityEdit", { id })} />
        ) : null}
        {canWrite ? (
          <Button title={t("opportunities.createBooking")} onPress={onCreateBooking} loading={createBooking.isPending} />
        ) : null}
        {canQuotationWrite ? (
          <Button
            title={t("opportunities.newQuotation")}
            variant="secondary"
            onPress={() =>
              navigation.getParent()?.navigate("More", {
                screen: "QuotationCreate",
                params: { opportunityId: id },
              })
            }
          />
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 20, fontWeight: "700", flex: 1 },
  actions: { gap: 10 },
});
