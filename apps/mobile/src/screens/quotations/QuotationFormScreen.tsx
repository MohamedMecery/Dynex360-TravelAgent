import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatLabel, formatMoney, QUOTATION_ITEM_TYPES } from "@/lib/constants";
import { getApiErrorMessage } from "@/lib/errors";
import {
  useCreateQuotation,
  useQuotation,
  useQuotationItems,
  useUpdateQuotation,
} from "@/hooks/api/useQuotations";
import { usePermission } from "@/hooks/usePermission";
import { useStackTitle } from "@/hooks/useStackTitle";
import { useTranslation } from "@/i18n/LocaleProvider";
import type { MoreStackParamList } from "@/navigation/types";
import type { QuotationItemInput, QuotationItemType } from "@/types/revenue";
import { useTheme } from "@/theme/useTheme";

type CreateProps = NativeStackScreenProps<MoreStackParamList, "QuotationCreate">;
type EditProps = NativeStackScreenProps<MoreStackParamList, "QuotationEdit">;

export function QuotationCreateScreen({ navigation, route }: CreateProps) {
  const { t } = useTranslation();
  const create = useCreateQuotation();
  const initialOppId = route.params?.opportunityId ?? "";
  const [opportunityId, setOpportunityId] = useState(initialOppId);

  useStackTitle(t("quotations.new"));

  return (
    <QuotationFormBody
      opportunityId={opportunityId}
      onOpportunityIdChange={setOpportunityId}
      onSave={(payload) =>
        create.mutate(payload, {
          onSuccess: (q) => {
            Alert.alert(t("common.created"), q.quotation_number);
            navigation.replace("QuotationDetail", { id: q.id });
          },
          onError: (e) => Alert.alert(t("common.error"), getApiErrorMessage(e)),
        })
      }
      loading={create.isPending}
    />
  );
}

export function QuotationEditScreen({ navigation, route }: EditProps) {
  const { id } = route.params;
  const { t } = useTranslation();
  const { data: q } = useQuotation(id);
  const update = useUpdateQuotation(id);
  const itemsApi = useQuotationItems(id);

  useStackTitle(t("quotations.edit"));

  if (!q) return null;
  return (
    <QuotationFormBody
      initial={q}
      opportunityId={q.opportunity_id}
      itemsApi={itemsApi}
      onSave={(payload) =>
        update.mutate(payload, {
          onSuccess: () => {
            Alert.alert(t("common.saved"));
            navigation.goBack();
          },
          onError: (e) => Alert.alert(t("common.error"), getApiErrorMessage(e)),
        })
      }
      loading={update.isPending}
    />
  );
}

function QuotationFormBody({
  initial,
  opportunityId,
  onOpportunityIdChange,
  itemsApi,
  onSave,
  loading,
}: {
  initial?: {
    notes?: string | null;
    valid_until?: string | null;
    discount_amount: number;
    tax_amount: number;
    items?: Array<{
      id: string;
      item_type: QuotationItemType;
      description: string;
      quantity: number;
      unit_price: number;
    }>;
  };
  opportunityId: string;
  onOpportunityIdChange?: (id: string) => void;
  itemsApi?: ReturnType<typeof useQuotationItems>;
  onSave: (payload: {
    opportunity_id: string;
    notes?: string | null;
    valid_until?: string | null;
    discount_amount?: number;
    tax_amount?: number;
  }) => void;
  loading: boolean;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const canWrite = usePermission("crm.quotations.write");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [validUntil, setValidUntil] = useState(initial?.valid_until ?? null);
  const [discount, setDiscount] = useState(String(initial?.discount_amount ?? 0));
  const [tax, setTax] = useState(String(initial?.tax_amount ?? 0));

  const [itemType, setItemType] = useState<QuotationItemType>("package");
  const [itemDesc, setItemDesc] = useState("");
  const [itemQty, setItemQty] = useState("1");
  const [itemPrice, setItemPrice] = useState("0");

  if (!canWrite) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: colors.textMuted }}>{t("permissions.quotationsWrite")}</Text>
      </View>
    );
  }

  const addItem = () => {
    if (!itemsApi) return;
    const input: QuotationItemInput = {
      item_type: itemType,
      description: itemDesc.trim(),
      quantity: Number(itemQty) || 1,
      unit_price: Number(itemPrice) || 0,
    };
    if (!input.description) {
      Alert.alert(t("common.error"), t("quotations.descriptionRequired"));
      return;
    }
    itemsApi.add.mutate(input, {
      onSuccess: () => {
        setItemDesc("");
        setItemQty("1");
        setItemPrice("0");
      },
      onError: (e) => Alert.alert(t("common.error"), getApiErrorMessage(e)),
    });
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      {!initial ? (
        <Input
          label={t("quotations.opportunityId")}
          value={opportunityId}
          onChangeText={onOpportunityIdChange ?? (() => {})}
          autoCapitalize="none"
        />
      ) : null}
      <DatePickerField label={t("quotations.validUntil")} value={validUntil} onChange={setValidUntil} />
      <Input label={t("quotations.notes")} value={notes} onChangeText={setNotes} multiline />
      <Input label={t("quotations.discount")} value={discount} onChangeText={setDiscount} keyboardType="decimal-pad" />
      <Input label={t("quotations.tax")} value={tax} onChangeText={setTax} keyboardType="decimal-pad" />

      {initial && itemsApi ? (
        <Card>
          <Text style={[styles.section, { color: colors.text }]}>{t("quotations.items")}</Text>
          {(initial.items ?? []).map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={{ color: colors.text }}>{item.description}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                {formatMoney(item.quantity * item.unit_price, "USD")}
              </Text>
              <Button
                title={t("common.remove")}
                variant="destructive"
                onPress={() =>
                  itemsApi.remove.mutate(item.id, {
                    onError: (e) => Alert.alert(t("common.error"), getApiErrorMessage(e)),
                  })
                }
              />
            </View>
          ))}
          <Select
            label={t("quotations.itemType")}
            value={itemType}
            options={QUOTATION_ITEM_TYPES.map((x) => ({
              value: x,
              label: formatLabel(x),
            }))}
            onChange={setItemType}
          />
          <Input label={t("quotations.itemDescription")} value={itemDesc} onChangeText={setItemDesc} />
          <Input label={t("quotations.itemQty")} value={itemQty} onChangeText={setItemQty} keyboardType="number-pad" />
          <Input
            label={t("quotations.itemUnitPrice")}
            value={itemPrice}
            onChangeText={setItemPrice}
            keyboardType="decimal-pad"
          />
          <Button title={t("common.add")} variant="secondary" onPress={addItem} />
        </Card>
      ) : null}

      <Button
        title={t("common.save")}
        loading={loading}
        onPress={() => {
          if (!opportunityId.trim()) {
            Alert.alert(t("common.validation"), t("quotations.opportunityRequired"));
            return;
          }
          onSave({
            opportunity_id: opportunityId.trim(),
            notes: notes || null,
            valid_until: validUntil,
            discount_amount: Number(discount) || 0,
            tax_amount: Number(tax) || 0,
          });
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  section: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  itemRow: { gap: 6, marginBottom: 12 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
});
