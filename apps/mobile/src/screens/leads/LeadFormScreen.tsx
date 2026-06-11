import { useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatLabel, LEAD_SOURCES, LEAD_STATUSES } from "@/lib/constants";
import { getApiErrorMessage } from "@/lib/errors";
import { useCreateLead, useLead, useUpdateLead } from "@/hooks/api/useLeads";
import { useStackTitle } from "@/hooks/useStackTitle";
import { useTranslation } from "@/i18n/LocaleProvider";
import type { LeadsStackParamList } from "@/navigation/types";
import type { LeadSource, LeadStatus } from "@/types/crm";
import { useTheme } from "@/theme/useTheme";

type CreateProps = NativeStackScreenProps<LeadsStackParamList, "LeadCreate">;
type EditProps = NativeStackScreenProps<LeadsStackParamList, "LeadEdit">;

export function LeadCreateScreen({ navigation }: CreateProps) {
  const { t } = useTranslation();
  const create = useCreateLead();

  useStackTitle(t("leads.create"));

  return (
    <LeadForm
      submitTitle={t("leads.create")}
      onSubmit={(payload) =>
        create.mutate(payload, {
          onSuccess: (lead) => {
            Alert.alert(t("common.created"), t("leads.savedMessage"));
            navigation.replace("LeadDetail", { id: lead.id });
          },
          onError: (e) => Alert.alert(t("common.error"), getApiErrorMessage(e)),
        })
      }
      loading={create.isPending}
    />
  );
}

export function LeadEditScreen({ navigation, route }: EditProps) {
  const { id } = route.params;
  const { t } = useTranslation();
  const { data: lead } = useLead(id);
  const update = useUpdateLead(id);

  useStackTitle(t("leads.edit"));

  if (!lead) return null;
  return (
    <LeadForm
      submitTitle={t("common.save")}
      initial={{
        full_name: lead.full_name,
        source: lead.source,
        email: lead.email ?? "",
        mobile: lead.mobile ?? "",
        whatsapp: lead.whatsapp ?? "",
        notes: lead.notes ?? "",
        status: lead.status,
      }}
      onSubmit={(payload) =>
        update.mutate(payload, {
          onSuccess: () => {
            Alert.alert(t("common.saved"), t("leads.updatedMessage"));
            navigation.goBack();
          },
          onError: (e) => Alert.alert(t("common.error"), getApiErrorMessage(e)),
        })
      }
      loading={update.isPending}
    />
  );
}

function LeadForm({
  submitTitle,
  initial,
  onSubmit,
  loading,
}: {
  submitTitle: string;
  initial?: {
    full_name: string;
    source: LeadSource;
    email: string;
    mobile: string;
    whatsapp: string;
    notes: string;
    status: LeadStatus;
  };
  onSubmit: (payload: {
    full_name: string;
    source: LeadSource;
    email?: string | null;
    mobile?: string | null;
    whatsapp?: string | null;
    notes?: string | null;
    status?: LeadStatus;
  }) => void;
  loading?: boolean;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [fullName, setFullName] = useState(initial?.full_name ?? "");
  const [source, setSource] = useState<LeadSource>(initial?.source ?? "whatsapp");
  const [status, setStatus] = useState<LeadStatus>(initial?.status ?? "new");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [mobile, setMobile] = useState(initial?.mobile ?? "");
  const [whatsapp, setWhatsapp] = useState(initial?.whatsapp ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Input label={t("leads.fullName")} value={fullName} onChangeText={setFullName} />
      <Select
        label={t("leads.source")}
        value={source}
        options={LEAD_SOURCES.map((s) => ({ value: s, label: formatLabel(s) }))}
        onChange={setSource}
      />
      {initial ? (
        <Select
          label={t("leads.status")}
          value={status}
          options={LEAD_STATUSES.map((s) => ({ value: s, label: formatLabel(s) }))}
          onChange={setStatus}
        />
      ) : null}
      <Input label={t("leads.email")} value={email} onChangeText={setEmail} autoCapitalize="none" />
      <Input label={t("leads.mobile")} value={mobile} onChangeText={setMobile} />
      <Input label={t("leads.whatsapp")} value={whatsapp} onChangeText={setWhatsapp} />
      <Input label={t("leads.notes")} value={notes} onChangeText={setNotes} multiline />
      <Button
        title={submitTitle}
        loading={loading}
        onPress={() => {
          if (!fullName.trim()) {
            Alert.alert(t("common.validation"), t("leads.fullNameRequired"));
            return;
          }
          onSubmit({
            full_name: fullName.trim(),
            source,
            status,
            email: email || null,
            mobile: mobile || null,
            whatsapp: whatsapp || null,
            notes: notes || null,
          });
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 32 },
});
