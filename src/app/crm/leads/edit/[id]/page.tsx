"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigation, useOne } from "@refinedev/core";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DuplicateLeadAlert } from "@/components/crm/duplicate-lead-alert";
import { LeadFormFields, type LeadFormValues } from "@/components/crm/lead-form-fields";
import type { DuplicateLeadMatch } from "@/lib/crm/duplicate-leads";
import {
  apiCheckDuplicateLeads,
  apiUpdateLead,
  LeadApiError,
} from "@/lib/crm/leads-api-client";
import {
  formValuesToLeadUpdateInput,
  leadToFormValues,
} from "@/lib/crm/lead-form-utils";
import { useTranslation } from "@/i18n/locale-provider";
import type { Lead } from "@/types";

export default function LeadEditPage() {
  const { t } = useTranslation();
  const { list } = useNavigation();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const { data, isLoading } = useOne<Lead>({ resource: "leads", id });
  const lead = data?.data;

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [exactDuplicates, setExactDuplicates] = useState<DuplicateLeadMatch[]>([]);
  const [possibleDuplicates, setPossibleDuplicates] = useState<DuplicateLeadMatch[]>([]);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors },
  } = useForm<LeadFormValues>();

  useEffect(() => {
    if (lead) reset(leadToFormValues(lead));
  }, [lead, reset]);

  const email = watch("email");
  const mobile = watch("mobile");
  const whatsapp = watch("whatsapp");

  const checkDuplicates = useCallback(async () => {
    if (!id || (!email?.trim() && !mobile?.trim() && !whatsapp?.trim())) {
      setExactDuplicates([]);
      setPossibleDuplicates([]);
      return;
    }
    try {
      const { exact, possible } = await apiCheckDuplicateLeads({
        email: email?.trim() || undefined,
        mobile: mobile?.trim() || undefined,
        whatsapp: whatsapp?.trim() || undefined,
        exclude_id: id,
      });
      setExactDuplicates(exact);
      setPossibleDuplicates(possible);
    } catch {
      setExactDuplicates([]);
      setPossibleDuplicates([]);
    }
  }, [id, email, mobile, whatsapp]);

  const submit = async (values: LeadFormValues, allowDuplicates: boolean) => {
    if (!id) return;
    setSubmitError(null);
    setSaving(true);
    try {
      const input = formValuesToLeadUpdateInput(values);
      const { data: updated } = await apiUpdateLead(id, input, {
        allow_duplicates: allowDuplicates,
      });
      router.push(`/crm/leads/show/${updated.id}`);
    } catch (err: unknown) {
      if (
        err instanceof LeadApiError &&
        (err.code === "EXACT_DUPLICATE_LEAD" || err.code === "DUPLICATE_LEAD")
      ) {
        setExactDuplicates((err.details as DuplicateLeadMatch[]) ?? []);
        setSubmitError(t("leads.duplicateBlocked"));
        return;
      }
      setSubmitError(t("leads.updateError"));
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = handleSubmit((values) => submit(values, false));
  const onProceedDespiteDuplicates = () => {
    handleSubmit((values) => submit(values, true))();
  };

  if (isLoading || !lead) return <p>{t("common.loading")}</p>;

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold">{t("leads.editTitle")}</h2>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{t("leads.details")}</CardTitle>
        </CardHeader>
        <form onSubmit={onSubmit} className="space-y-4 px-6 pb-6" onBlur={checkDuplicates}>
          <DuplicateLeadAlert
            exact={exactDuplicates}
            possible={possibleDuplicates}
            onProceed={
              exactDuplicates.length === 0 && possibleDuplicates.length > 0
                ? onProceedDespiteDuplicates
                : undefined
            }
            proceeding={saving}
          />
          <LeadFormFields register={register} errors={errors} showStatus />
          {submitError && <p className="text-sm text-destructive">{submitError}</p>}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? t("common.saving") : t("common.save")}
            </Button>
            <Button type="button" variant="outline" onClick={() => list("leads")}>
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
