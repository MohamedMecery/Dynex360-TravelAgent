"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigation } from "@refinedev/core";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { apiCreateOpportunity } from "@/lib/crm/opportunities-api-client";
import { useTranslation } from "@/i18n/locale-provider";
import type { OpportunityStage } from "@/types";

interface OppForm {
  destination_text: string;
  estimated_revenue: string;
  probability: string;
  pax_count: string;
  currency: string;
  stage: OpportunityStage;
}

export default function OpportunityCreatePage() {
  const { t } = useTranslation();
  const { list } = useNavigation();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit } = useForm<OppForm>({
    defaultValues: {
      destination_text: "",
      estimated_revenue: "",
      probability: "25",
      pax_count: "1",
      currency: "USD",
      stage: "discovery",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSaving(true);
    setError(null);
    try {
      const opp = await apiCreateOpportunity({
        destination_text: values.destination_text || null,
        estimated_revenue: values.estimated_revenue
          ? Number(values.estimated_revenue)
          : null,
        expected_budget: values.estimated_revenue
          ? Number(values.estimated_revenue)
          : null,
        probability: Number(values.probability),
        pax_count: Number(values.pax_count),
        currency: values.currency,
        stage: values.stage,
      });
      router.push(`/crm/opportunities/show/${opp.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("leads.createError"));
    } finally {
      setSaving(false);
    }
  });

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold">{t("opportunities.createTitle")}</h2>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>{t("opportunities.details")}</CardTitle>
        </CardHeader>
        <form onSubmit={onSubmit} className="space-y-4 px-6 pb-6">
          <div>
            <label className="mb-1 block text-sm font-medium">
              {t("leads.destination")}
            </label>
            <Input {...register("destination_text")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">
                {t("opportunities.revenue")}
              </label>
              <Input type="number" min={0} {...register("estimated_revenue")} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                {t("opportunities.probability")}
              </label>
              <Input type="number" min={0} max={100} {...register("probability")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">{t("opportunities.pax")}</label>
              <Input type="number" min={1} {...register("pax_count")} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("leads.currency")}</label>
              <Input maxLength={3} {...register("currency")} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              {t("opportunities.stageLabel")}
            </label>
            <Select {...register("stage")}>
              {(
                [
                  "discovery",
                  "proposal",
                  "negotiation",
                  "verbal_approval",
                  "closed_won",
                  "closed_lost",
                ] as OpportunityStage[]
              ).map((s) => (
                <option key={s} value={s}>
                  {t(`opportunities.stage.${s}`)}
                </option>
              ))}
            </Select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? t("common.saving") : t("common.create")}
            </Button>
            <Button type="button" variant="outline" onClick={() => list("opportunities")}>
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
