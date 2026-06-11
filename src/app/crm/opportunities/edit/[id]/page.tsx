"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigation, useOne } from "@refinedev/core";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { apiUpdateOpportunity } from "@/lib/crm/opportunities-api-client";
import { useTranslation } from "@/i18n/locale-provider";
import type { Opportunity, OpportunityStage } from "@/types";

interface OppForm {
  destination_text: string;
  estimated_revenue: string;
  probability: string;
  pax_count: string;
  stage: OpportunityStage;
}

export default function OpportunityEditPage() {
  const { t } = useTranslation();
  const { list } = useNavigation();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const { data, isLoading } = useOne<Opportunity>({ resource: "opportunities", id });
  const opportunity = data?.data;

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset } = useForm<OppForm>();

  useEffect(() => {
    if (opportunity) {
      reset({
        destination_text: opportunity.destination_text ?? "",
        estimated_revenue:
          opportunity.estimated_revenue != null ? String(opportunity.estimated_revenue) : "",
        probability: String(opportunity.probability ?? 25),
        pax_count: String(opportunity.pax_count),
        stage: opportunity.stage,
      });
    }
  }, [opportunity, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await apiUpdateOpportunity(id, {
        destination_text: values.destination_text || null,
        estimated_revenue: values.estimated_revenue
          ? Number(values.estimated_revenue)
          : null,
        probability: Number(values.probability),
        pax_count: Number(values.pax_count),
        stage: values.stage,
      });
      router.push(`/crm/opportunities/show/${updated.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("leads.updateError"));
    } finally {
      setSaving(false);
    }
  });

  if (isLoading || !opportunity) return <p>{t("common.loading")}</p>;

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold">{t("opportunities.editTitle")}</h2>
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
          <div>
            <label className="mb-1 block text-sm font-medium">{t("opportunities.pax")}</label>
            <Input type="number" min={1} {...register("pax_count")} />
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
              {saving ? t("common.saving") : t("common.save")}
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
