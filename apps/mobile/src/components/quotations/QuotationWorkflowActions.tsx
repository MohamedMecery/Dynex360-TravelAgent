import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { getApiErrorMessage } from "@/lib/errors";
import { useQuotationWorkflow } from "@/hooks/api/useQuotations";
import { usePermission } from "@/hooks/usePermission";
import { useTranslation } from "@/i18n/LocaleProvider";
import type { Quotation } from "@/types/revenue";
import { useTheme } from "@/theme/useTheme";

interface Props {
  quotation: Quotation;
  onConverted?: (bookingId: string, reference: string) => void;
  onOpenCustomer?: (customerId: string) => void;
  onOpenBooking?: (bookingId: string) => void;
}

export function QuotationWorkflowActions({
  quotation,
  onConverted,
  onOpenCustomer,
  onOpenBooking,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [rejectReason, setRejectReason] = useState("");
  const wf = useQuotationWorkflow(quotation.id);

  const canWrite = usePermission("crm.quotations.write");
  const canSend = usePermission("crm.quotations.send");
  const canApprove = usePermission("crm.quotations.approve");
  const canAccept = usePermission("crm.quotations.accept");
  const canConvert = usePermission("crm.quotations.convert");

  const status = quotation.status;
  const busy =
    wf.send.isPending ||
    wf.accept.isPending ||
    wf.reject.isPending ||
    wf.markViewed.isPending ||
    wf.submitApproval.isPending ||
    wf.approve.isPending ||
    wf.rejectApproval.isPending ||
    wf.convert.isPending;

  const run = (fn: () => void) => {
    try {
      fn();
    } catch (e) {
      Alert.alert("Error", getApiErrorMessage(e));
    }
  };

  return (
    <Card style={styles.card}>
      <Text style={[styles.title, { color: colors.text }]}>{t("quotations.workflow")}</Text>
      <View style={styles.actions}>
        {status === "draft" && canSend ? (
          <>
            <Button
              title={t("quotations.send")}
              disabled={busy}
              onPress={() =>
                wf.send.mutate(undefined, {
                  onError: (e) => Alert.alert("Error", getApiErrorMessage(e)),
                })
              }
            />
            {canApprove ? (
              <Button
                title={t("quotations.submitApproval")}
                variant="secondary"
                disabled={busy}
                onPress={() =>
                  wf.submitApproval.mutate(undefined, {
                    onError: (e) => Alert.alert("Error", getApiErrorMessage(e)),
                  })
                }
              />
            ) : null}
          </>
        ) : null}

        {status === "pending_approval" && canApprove ? (
          <>
            <Button
              title={t("quotations.approve")}
              disabled={busy}
              onPress={() =>
                wf.approve.mutate(undefined, {
                  onError: (e) => Alert.alert("Error", getApiErrorMessage(e)),
                })
              }
            />
            <Button
              title={t("quotations.rejectApproval")}
              variant="secondary"
              disabled={busy}
              onPress={() =>
                wf.rejectApproval.mutate(undefined, {
                  onError: (e) => Alert.alert("Error", getApiErrorMessage(e)),
                })
              }
            />
          </>
        ) : null}

        {status === "approved" && canSend ? (
          <Button
            title={t("quotations.send")}
            disabled={busy}
            onPress={() =>
              wf.send.mutate(undefined, {
                onError: (e) => Alert.alert("Error", getApiErrorMessage(e)),
              })
            }
          />
        ) : null}

        {(status === "sent" || status === "viewed") && (
          <>
            {status === "sent" && canWrite ? (
              <Button
                title={t("quotations.markViewed")}
                variant="secondary"
                disabled={busy}
                onPress={() =>
                  wf.markViewed.mutate(undefined, {
                    onError: (e) => Alert.alert("Error", getApiErrorMessage(e)),
                  })
                }
              />
            ) : null}
            {canAccept ? (
              <Button
                title={t("quotations.accept")}
                disabled={busy}
                onPress={() =>
                  wf.accept.mutate(undefined, {
                    onError: (e) => Alert.alert("Error", getApiErrorMessage(e)),
                  })
                }
              />
            ) : null}
            {canWrite ? (
              <>
                <Input
                  placeholder={t("quotations.rejectReason")}
                  value={rejectReason}
                  onChangeText={setRejectReason}
                />
                <Button
                  title={t("quotations.reject")}
                  variant="secondary"
                  disabled={busy}
                  onPress={() =>
                    wf.reject.mutate(rejectReason || undefined, {
                      onError: (e) => Alert.alert("Error", getApiErrorMessage(e)),
                    })
                  }
                />
              </>
            ) : null}
          </>
        )}

        {status === "accepted" && canConvert ? (
          <Button
            title={t("quotations.convert")}
            disabled={busy}
            onPress={() =>
              wf.convert.mutate(undefined, {
                onSuccess: (r) => {
                  Alert.alert("Converted", `Booking ${r.reference_number}`);
                  onConverted?.(r.booking_id, r.reference_number);
                },
                onError: (e) => Alert.alert("Error", getApiErrorMessage(e)),
              })
            }
          />
        ) : null}

        {quotation.booking_id && onOpenBooking ? (
          <Button
            title={t("quotations.viewBooking")}
            variant="secondary"
            onPress={() => onOpenBooking(quotation.booking_id!)}
          />
        ) : null}

        {quotation.customer_id && onOpenCustomer ? (
          <Button
            title={t("quotations.viewCustomer")}
            variant="secondary"
            onPress={() => onOpenCustomer(quotation.customer_id!)}
          />
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  title: { fontSize: 16, fontWeight: "600" },
  actions: { gap: 8 },
});
