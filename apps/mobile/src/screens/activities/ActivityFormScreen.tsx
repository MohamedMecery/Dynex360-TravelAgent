import { useState } from "react";
import { Alert, ScrollView, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Button } from "@/components/ui/Button";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { Input } from "@/components/ui/Input";
import { TimePickerField } from "@/components/ui/TimePickerField";
import { Select } from "@/components/ui/Select";
import { formatLabel } from "@/lib/constants";
import { getApiErrorMessage } from "@/lib/errors";
import { useAuth } from "@/hooks/useAuth";
import {
  useActivity,
  useCreateActivity,
  useUpdateActivity,
} from "@/hooks/api/useActivities";
import { useStackTitle } from "@/hooks/useStackTitle";
import { useTranslation } from "@/i18n/LocaleProvider";
import type { ActivitiesStackParamList } from "@/navigation/types";
import type { ActivityType } from "@/types/crm";
import { useTheme } from "@/theme/useTheme";

type CreateProps = NativeStackScreenProps<ActivitiesStackParamList, "ActivityCreate">;
type EditProps = NativeStackScreenProps<ActivitiesStackParamList, "ActivityEdit">;

const TYPES: ActivityType[] = ["call", "whatsapp", "email", "meeting", "task"];

export function ActivityCreateScreen({ navigation, route }: CreateProps) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const create = useCreateActivity();
  const { leadId, opportunityId } = route.params;

  useStackTitle(t("activities.create"));

  return (
    <ActivityForm
      submitTitle={t("activities.create")}
      onSubmit={(payload) =>
        create.mutate(
          {
            ...payload,
            assigned_to: profile?.id,
            related_lead_id: leadId ?? null,
            related_opportunity_id: opportunityId ?? null,
          },
          {
            onSuccess: (a) => {
              Alert.alert(t("common.created"), t("activities.saved"));
              navigation.replace("ActivityDetail", { id: a.id });
            },
            onError: (e) => Alert.alert(t("common.error"), getApiErrorMessage(e)),
          }
        )
      }
      loading={create.isPending}
    />
  );
}

export function ActivityEditScreen({ navigation, route }: EditProps) {
  const { id } = route.params;
  const { t } = useTranslation();
  const { data: activity } = useActivity(id);
  const update = useUpdateActivity(id);

  useStackTitle(t("activities.edit"));

  if (!activity) return null;
  return (
    <ActivityForm
      initial={activity}
      submitTitle={t("common.save")}
      onSubmit={(payload) =>
        update.mutate(payload, {
          onSuccess: () => {
            Alert.alert(t("common.saved"), t("activities.updated"));
            navigation.goBack();
          },
          onError: (e) => Alert.alert(t("common.error"), getApiErrorMessage(e)),
        })
      }
      loading={update.isPending}
    />
  );
}

function ActivityForm({
  initial,
  submitTitle,
  onSubmit,
  loading,
}: {
  initial?: { subject: string; activity_type: ActivityType; description?: string | null };
  submitTitle: string;
  onSubmit: (payload: {
    subject: string;
    activity_type: ActivityType;
    description?: string | null;
    due_date?: string | null;
    direction?: "outgoing" | null;
  }) => void;
  loading?: boolean;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [type, setType] = useState<ActivityType>(initial?.activity_type ?? "task");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [dueTime, setDueTime] = useState<string | null>(null);

  const needsDirection = type === "call" || type === "whatsapp" || type === "email";

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Input label={t("activities.subject")} value={subject} onChangeText={setSubject} />
      <Select
        label={t("activities.type")}
        value={type}
        options={TYPES.map((activityType) => ({ value: activityType, label: formatLabel(activityType) }))}
        onChange={setType}
      />
      <DatePickerField label={t("activities.dueDate")} value={dueDate} onChange={setDueDate} />
      <TimePickerField label={t("activities.dueTime")} value={dueTime} onChange={setDueTime} />
      <Input label={t("activities.description")} value={description} onChangeText={setDescription} multiline />
      <Button
        title={submitTitle}
        loading={loading}
        onPress={() => {
          if (!subject.trim()) {
            Alert.alert(t("common.validation"), t("activities.subjectRequired"));
            return;
          }
          onSubmit({
            subject: subject.trim(),
            activity_type: type,
            description: description || null,
            due_date:
              dueDate && dueTime
                ? `${dueDate}T${dueTime}:00`
                : dueDate
                  ? `${dueDate}T12:00:00`
                  : null,
            direction: needsDirection ? "outgoing" : null,
          });
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 32 },
});
