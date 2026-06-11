import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Select } from "@/components/ui/Select";
import { formatLabel } from "@/lib/constants";
import { getApiErrorMessage, isForbiddenError } from "@/lib/errors";
import { useAssignees } from "@/hooks/api/useAssignees";
import {
  useAssignLead,
  useConvertLeadToOpportunity,
  useLead,
} from "@/hooks/api/useLeads";
import { usePermission } from "@/hooks/usePermission";
import { useStackTitle } from "@/hooks/useStackTitle";
import { useTranslation } from "@/i18n/LocaleProvider";
import type { LeadsStackParamList } from "@/navigation/types";
import { useTheme } from "@/theme/useTheme";

type Props = NativeStackScreenProps<LeadsStackParamList, "LeadDetail">;

export function LeadDetailScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const { colors } = useTheme();
  const { t } = useTranslation();
  const canWrite = usePermission("crm.leads.write");
  const canConvert = usePermission("crm.opportunities.write");
  const { data: lead, isLoading, isError, error, refetch } = useLead(id);
  const assign = useAssignLead();
  const convert = useConvertLeadToOpportunity();
  const { data: assignees } = useAssignees();
  const [assigneeId, setAssigneeId] = useState("");

  useStackTitle(t("leads.detail"));

  if (isLoading) return <LoadingState />;
  if (isError || !lead) return <ErrorState error={error} onRetry={() => void refetch()} />;

  const onAssign = () => {
    if (!assigneeId) {
      Alert.alert(t("leads.selectAssignee"), t("leads.selectAssigneeFirst"));
      return;
    }
    assign.mutate(
      { id, ownerId: assigneeId },
      {
        onSuccess: () => Alert.alert(t("common.assigned"), t("leads.assignedMessage")),
        onError: (e) =>
          Alert.alert(
            t("common.error"),
            isForbiddenError(e) ? t("common.forbidden") : getApiErrorMessage(e)
          ),
      }
    );
  };

  const onConvert = () => {
    convert.mutate(id, {
      onSuccess: (result) => {
        Alert.alert(
          t("common.converted"),
          t("leads.convertedMessage", { number: result.opportunity.opportunity_number })
        );
        navigation.getParent()?.navigate("Pipeline", {
          screen: "OpportunityDetail",
          params: { id: result.opportunity_id },
        });
      },
      onError: (e) => Alert.alert(t("common.error"), getApiErrorMessage(e)),
    });
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{lead.full_name}</Text>
        <Badge label={formatLabel(lead.status)} />
      </View>
      <Card>
        <Field label={t("leads.number")} value={lead.lead_number} />
        <Field label={t("leads.source")} value={formatLabel(lead.source)} />
        <Field label={t("leads.email")} value={lead.email ?? t("common.dash")} />
        <Field label={t("leads.mobile")} value={lead.mobile ?? t("common.dash")} />
        <Field label={t("leads.whatsapp")} value={lead.whatsapp ?? t("common.dash")} />
        {lead.notes ? <Field label={t("leads.notes")} value={lead.notes} /> : null}
      </Card>

      {canWrite ? (
        <Card>
          <Select
            label={t("leads.assignTo")}
            value={assigneeId}
            options={[
              { value: "", label: t("leads.selectAssignee") },
              ...(assignees ?? []).map((u) => ({
                value: u.id,
                label: u.full_name ?? u.email,
              })),
            ]}
            onChange={setAssigneeId}
          />
          <Button title={t("leads.assign")} onPress={onAssign} loading={assign.isPending} />
        </Card>
      ) : null}

      <View style={styles.actions}>
        {canWrite ? (
          <Button title={t("common.edit")} variant="secondary" onPress={() => navigation.navigate("LeadEdit", { id })} />
        ) : null}
        {canConvert ? (
          <Button title={t("leads.convert")} onPress={onConvert} loading={convert.isPending} />
        ) : null}
      </View>
    </ScrollView>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={{ color: colors.textMuted, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: colors.text }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "700", flex: 1 },
  field: { marginBottom: 10 },
  actions: { gap: 10 },
});
