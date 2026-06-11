"use client";

import { useCallback, useMemo, useState } from "react";
import { useCreate, useDelete, useList, useUpdate } from "@refinedev/core";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError } from "@/components/forms/field-error";
import { useTenantId } from "@/lib/auth/use-tenant-id";
import { packageDaySchema, type PackageDayFormValues } from "@/lib/validation/package-form";
import { useTranslation } from "@/i18n/locale-provider";
import type { PackageDay } from "@/types";

interface PackageItineraryEditorProps {
  packageId: string;
  readOnly?: boolean;
}

const emptyDayForm: PackageDayFormValues = {
  day_number: 1,
  title: "",
  description: "",
};

export function PackageItineraryEditor({ packageId, readOnly = false }: PackageItineraryEditorProps) {
  const { t } = useTranslation();
  const tenantId = useTenantId();
  const [form, setForm] = useState<PackageDayFormValues>(emptyDayForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof PackageDayFormValues, string>>>({});

  const { data, isLoading, refetch } = useList<PackageDay>({
    resource: "package_days",
    filters: [{ field: "package_id", operator: "eq", value: packageId }],
    sorters: [{ field: "day_number", order: "asc" }],
    pagination: { pageSize: 100 },
  });

  const { mutate: createDay, isLoading: creating } = useCreate();
  const { mutate: updateDay, isLoading: updating } = useUpdate();
  const { mutate: deleteDay } = useDelete();

  const days = useMemo(() => data?.data ?? [], [data?.data]);

  const nextDayNumber = useMemo(() => {
    if (days.length === 0) return 1;
    return Math.max(...days.map((d) => d.day_number)) + 1;
  }, [days]);

  const resetForm = useCallback(() => {
    setForm({ ...emptyDayForm, day_number: nextDayNumber });
    setEditingId(null);
    setFormError(null);
    setFieldErrors({});
  }, [nextDayNumber]);

  const startAdd = () => {
    setEditingId(null);
    setForm({ ...emptyDayForm, day_number: nextDayNumber });
    setFormError(null);
    setFieldErrors({});
  };

  const startEdit = (day: PackageDay) => {
    setEditingId(day.id);
    setForm({
      day_number: day.day_number,
      title: day.title,
      description: day.description ?? "",
    });
    setFormError(null);
    setFieldErrors({});
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!tenantId || readOnly) return;

    const parsed = packageDaySchema.safeParse(form);
    if (!parsed.success) {
      const nextErrors: Partial<Record<keyof PackageDayFormValues, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string") {
          nextErrors[field as keyof PackageDayFormValues] = issue.message;
        }
      }
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});
    const values = parsed.data;

    if (editingId) {
      updateDay(
        {
          resource: "package_days",
          id: editingId,
          values: {
            day_number: values.day_number,
            title: values.title,
            description: values.description?.trim() || null,
          },
        },
        {
          onSuccess: () => {
            resetForm();
            void refetch();
          },
          onError: () => setFormError(t("packages.itinerarySaveError")),
        }
      );
      return;
    }

    createDay(
      {
        resource: "package_days",
        values: {
          package_id: packageId,
          tenant_id: tenantId,
          day_number: values.day_number,
          title: values.title,
          description: values.description?.trim() || null,
        },
      },
      {
        onSuccess: () => {
          resetForm();
          void refetch();
        },
        onError: () => setFormError(t("packages.itinerarySaveError")),
      }
    );
  };

  const handleDelete = (id: string) => {
    if (readOnly) return;
    if (!window.confirm(t("packages.confirmDeleteDay"))) return;
    deleteDay(
      { resource: "package_days", id },
      { onSuccess: () => void refetch() }
    );
  };

  const resolveFieldError = (key: keyof PackageDayFormValues): string | undefined => {
    const code = fieldErrors[key];
    if (!code) return undefined;
    if (code === "titleRequired") return t("packages.titleRequired");
    if (code === "titleTooLong") return t("packages.titleTooLong");
    if (code === "dayNumberInvalid") return t("packages.dayNumberInvalid");
    return code;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>{t("packages.itinerary")}</CardTitle>
        {!readOnly && (
          <Button type="button" variant="outline" size="sm" onClick={startAdd}>
            {t("packages.addDay")}
          </Button>
        )}
      </CardHeader>
      <div className="px-6 pb-6 space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : days.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("packages.noItinerary")}</p>
        ) : (
          <ol className="space-y-3">
            {days.map((day) => (
              <li key={day.id} className="rounded-md border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {t("packages.dayLabel")} {day.day_number}
                    </p>
                    <p className="font-medium">{day.title}</p>
                    {day.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{day.description}</p>
                    )}
                  </div>
                  {!readOnly && (
                    <div className="flex shrink-0 gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => startEdit(day)}>
                        {t("common.edit")}
                      </Button>
                      <Button type="button" variant="destructive" size="sm" onClick={() => handleDelete(day.id)}>
                        {t("common.delete")}
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}

        {!readOnly && (
          <form onSubmit={handleSubmit} className="space-y-3 rounded-md border border-dashed p-4">
            <p className="text-sm font-medium">
              {editingId ? t("packages.editDay") : t("packages.addDay")}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div>
                <Label>{t("packages.dayNumberLabel")}</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.day_number}
                  onChange={(e) => setForm((prev) => ({ ...prev, day_number: Number(e.target.value) }))}
                />
                <FieldError message={resolveFieldError("day_number")} />
              </div>
              <div className="sm:col-span-3">
                <Label>{t("fields.title")}</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                />
                <FieldError message={resolveFieldError("title")} />
              </div>
            </div>
            <div>
              <Label>{t("fields.description")}</Label>
              <Textarea
                rows={2}
                value={form.description ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={creating || updating || !tenantId}>
                {creating || updating ? t("common.saving") : editingId ? t("common.save") : t("common.create")}
              </Button>
              {(editingId || form.title) && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  {t("common.cancel")}
                </Button>
              )}
            </div>
          </form>
        )}
      </div>
    </Card>
  );
}
