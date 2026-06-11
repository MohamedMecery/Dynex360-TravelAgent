"use client";

import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigation } from "@refinedev/core";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DuplicateLeadAlert } from "@/components/crm/duplicate-lead-alert";
import { LeadFormFields, type LeadFormValues } from "@/components/crm/lead-form-fields";
import type { DuplicateLeadMatch } from "@/lib/crm/duplicate-leads";
import {
  apiCheckDuplicateLeads,
  apiCreateLead,
  LeadApiError,
} from "@/lib/crm/leads-api-client";
import {
  formValuesToLeadInput,
  leadFormDefaultValues,
} from "@/lib/crm/lead-form-utils";
import { useTranslation } from "@/i18n/locale-provider";

export default function LeadCreatePage() {
  const { t } = useTranslation();
  const { list } = useNavigation();
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [exactDuplicates, setExactDuplicates] = useState<DuplicateLeadMatch[]>([]);
  const [possibleDuplicates, setPossibleDuplicates] = useState<DuplicateLeadMatch[]>([]);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<LeadFormValues>({ defaultValues: leadFormDefaultValues });

  const email = watch("email");
  const mobile = watch("mobile");
  const whatsapp = watch("whatsapp");

  const checkDuplicates = useCallback(async () => {
    if (!email?.trim() && !mobile?.trim() && !whatsapp?.trim()) {
      setExactDuplicates([]);
      setPossibleDuplicates([]);
      return;
    }
    try {
      const { exact, possible } = await apiCheckDuplicateLeads({
        email: email?.trim() || undefined,
        mobile: mobile?.trim() || undefined,
        whatsapp: whatsapp?.trim() || undefined,
      });
      setExactDuplicates(exact);
      setPossibleDuplicates(possible);
    } catch {
      setExactDuplicates([]);
      setPossibleDuplicates([]);
    }
  }, [email, mobile, whatsapp]);

  const submit = async (values: LeadFormValues, allowDuplicates: boolean) => {
    setSubmitError(null);
    setSaving(true);
    try {
      const input = formValuesToLeadInput(values);
      const { data } = await apiCreateLead(input, { allow_duplicates: allowDuplicates });
      router.push(`/crm/leads/show/${data.id}`);
    } catch (err: unknown) {
      if (
        err instanceof LeadApiError &&
        (err.code === "EXACT_DUPLICATE_LEAD" || err.code === "DUPLICATE_LEAD")
      ) {
        setExactDuplicates((err.details as DuplicateLeadMatch[]) ?? []);
        setSubmitError(t("leads.duplicateBlocked"));
        return;
      }
      if (err instanceof Error && err.message.includes("Validation")) {
        setError("full_name", { type: "manual", message: err.message });
      }
      setSubmitError(t("leads.createError"));
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = handleSubmit((values) => submit(values, false));
  const onProceedDespiteDuplicates = () => {
    handleSubmit((values) => submit(values, true))();
  };

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold">{t("leads.createTitle")}</h2>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{t("leads.details")}</CardTitle>
        </CardHeader>
        <form
          onSubmit={onSubmit}
          className="space-y-4 px-6 pb-6"
          onBlur={checkDuplicates}
        >
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
          <LeadFormFields register={register} errors={errors} />
          {submitError && <p className="text-sm text-destructive">{submitError}</p>}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? t("common.saving") : t("common.create")}
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
