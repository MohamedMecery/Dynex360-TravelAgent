import { useState } from "react";
import { Alert, ScrollView, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatLabel, OPPORTUNITY_STAGES } from "@/lib/constants";
import { getApiErrorMessage } from "@/lib/errors";
import {
  useCreateOpportunity,
  useOpportunity,
  useUpdateOpportunity,
} from "@/hooks/api/useOpportunities";
import { useStackTitle } from "@/hooks/useStackTitle";
import { useTranslation } from "@/i18n/LocaleProvider";
import type { PipelineStackParamList } from "@/navigation/types";
import type { OpportunityStage } from "@/types/crm";
import { useTheme } from "@/theme/useTheme";

type CreateProps = NativeStackScreenProps<PipelineStackParamList, "OpportunityCreate">;
type EditProps = NativeStackScreenProps<PipelineStackParamList, "OpportunityEdit">;

export function OpportunityCreateScreen({ navigation, route }: CreateProps) {
  const { t } = useTranslation();
  const create = useCreateOpportunity();

  useStackTitle(t("opportunities.create"));

  return (
    <OppForm
      leadId={route.params.leadId}
      submitTitle={t("opportunities.createButton")}
      onSubmit={(payload) =>
        create.mutate(payload, {
          onSuccess: (o) => {
            Alert.alert(t("common.created"), t("opportunities.savedMessage"));
            navigation.replace("OpportunityDetail", { id: o.id });
          },
          onError: (e) => Alert.alert(t("common.error"), getApiErrorMessage(e)),
        })
      }
      loading={create.isPending}
    />
  );
}

export function OpportunityEditScreen({ navigation, route }: EditProps) {
  const { id } = route.params;
  const { t } = useTranslation();
  const { data: opp } = useOpportunity(id);
  const update = useUpdateOpportunity(id);

  useStackTitle(t("opportunities.edit"));

  if (!opp) return null;
  return (
    <OppForm
      initial={opp}
      submitTitle={t("common.save")}
      onSubmit={(payload) =>
        update.mutate(payload, {
          onSuccess: () => {
            Alert.alert(t("common.saved"), t("opportunities.updatedMessage"));
            navigation.goBack();
          },
          onError: (e) => Alert.alert(t("common.error"), getApiErrorMessage(e)),
        })
      }
      loading={update.isPending}
    />
  );
}

function OppForm({
  leadId,
  initial,
  submitTitle,
  onSubmit,
  loading,
}: {
  leadId?: string;
  initial?: {
    destination_text?: string | null;
    estimated_revenue?: number | null;
    probability?: number | null;
    stage: OpportunityStage;
    notes?: string | null;
    currency: string;
  };
  submitTitle: string;
  onSubmit: (payload: {
    lead_id?: string | null;
    destination_text?: string | null;
    estimated_revenue?: number | null;
    probability?: number | null;
    stage?: OpportunityStage;
    notes?: string | null;
    currency?: string;
  }) => void;
  loading?: boolean;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [destination, setDestination] = useState(initial?.destination_text ?? "");
  const [revenue, setRevenue] = useState(
    initial?.estimated_revenue != null ? String(initial.estimated_revenue) : ""
  );
  const [probability, setProbability] = useState(
    initial?.probability != null ? String(initial.probability) : "50"
  );
  const [stage, setStage] = useState<OpportunityStage>(initial?.stage ?? "discovery");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Input label={t("opportunities.destination")} value={destination} onChangeText={setDestination} />
      <Input label={t("opportunities.estimatedRevenue")} value={revenue} onChangeText={setRevenue} keyboardType="decimal-pad" />
      <Input label={t("opportunities.probabilityPercent")} value={probability} onChangeText={setProbability} keyboardType="number-pad" />
      <Select
        label={t("opportunities.stage")}
        value={stage}
        options={OPPORTUNITY_STAGES.map((s) => ({ value: s, label: formatLabel(s) }))}
        onChange={setStage}
      />
      <Input label={t("opportunities.notes")} value={notes} onChangeText={setNotes} multiline />
      <Button
        title={submitTitle}
        loading={loading}
        onPress={() =>
          onSubmit({
            lead_id: leadId ?? null,
            destination_text: destination || null,
            estimated_revenue: revenue ? Number(revenue) : null,
            probability: probability ? Number(probability) : null,
            stage,
            notes: notes || null,
            currency: initial?.currency ?? "USD",
          })
        }
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 32 },
});
