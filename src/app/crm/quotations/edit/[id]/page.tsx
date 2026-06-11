"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiGetQuotation, apiUpdateQuotation } from "@/lib/crm/quotations-api-client";
import { useTranslation } from "@/i18n/locale-provider";

interface EditForm {
  valid_until: string;
  notes: string;
  discount_amount: string;
  tax_amount: string;
}

export default function QuotationEditPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const id = String(params.id);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const { register, handleSubmit, reset } = useForm<EditForm>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = await apiGetQuotation(id);
      if (!["draft", "pending_approval"].includes(q.status)) {
        router.replace(`/crm/quotations/show/${id}`);
        return;
      }
      reset({
        valid_until: q.valid_until ?? "",
        notes: q.notes ?? "",
        discount_amount: String(q.discount_amount ?? 0),
        tax_amount: String(q.tax_amount ?? 0),
      });
    } catch {
      setError(t("quotations.notFound"));
    } finally {
      setLoading(false);
    }
  }, [id, reset, router, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSubmit = handleSubmit(async (values) => {
    setSaving(true);
    setError(null);
    try {
      await apiUpdateQuotation(id, {
        valid_until: values.valid_until || null,
        notes: values.notes || null,
        discount_amount: Number(values.discount_amount) || 0,
        tax_amount: Number(values.tax_amount) || 0,
      });
      router.push(`/crm/quotations/show/${id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("leads.actionError"));
    } finally {
      setSaving(false);
    }
  });

  if (loading) return <p>{t("common.loading")}</p>;

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold">{t("quotations.editTitle")}</h2>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>{t("quotations.details")}</CardTitle>
        </CardHeader>
        <form onSubmit={onSubmit} className="space-y-4 px-6 pb-6">
          <div>
            <label className="mb-1 block text-sm font-medium">
              {t("quotations.validUntil")}
            </label>
            <Input type="date" {...register("valid_until")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">
                {t("quotations.discount")}
              </label>
              <Input type="number" min={0} step="0.01" {...register("discount_amount")} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("quotations.tax")}</label>
              <Input type="number" min={0} step="0.01" {...register("tax_amount")} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t("common.notes")}</label>
            <Input {...register("notes")} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? t("common.saving") : t("common.save")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/crm/quotations/show/${id}`)}
            >
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
