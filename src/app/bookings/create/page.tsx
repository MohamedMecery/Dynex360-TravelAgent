"use client";

import { useState } from "react";
import { useList, useNavigation, useGetIdentity } from "@refinedev/core";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingPricingPreview } from "@/components/bookings/booking-pricing-preview";
import { BookingTravelerForm } from "@/components/bookings/booking-traveler-form";
import { buildDraftPreview, executeCreateDraft } from "@/lib/ai/booking-tools";
import { supabaseClient } from "@/lib/supabase/client";
import { useTenantId } from "@/lib/auth/use-tenant-id";
import {
  bookingFormSchema,
  defaultTravelerRow,
  toTravelerInputs,
  type BookingTravelerRowValues,
} from "@/lib/validation/booking-form";
import { useTranslation } from "@/i18n/locale-provider";
import { PageBreadcrumbs } from "@/components/layout/page-breadcrumbs";
import { useToast } from "@/providers/toast-provider";
import { Customer, Package } from "@/types";

export default function BookingCreatePage() {
  const { t } = useTranslation();
  const { success, error: toastError } = useToast();
  const { list } = useNavigation();
  const router = useRouter();
  const tenantId = useTenantId();
  const { data: identity } = useGetIdentity<{ id?: string }>();

  const [customerId, setCustomerId] = useState("");
  const [packageId, setPackageId] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [notes, setNotes] = useState("");
  const [travelers, setTravelers] = useState<BookingTravelerRowValues[]>([defaultTravelerRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { data: customersData } = useList<Customer>({
    resource: "customers",
    filters: [{ field: "deleted_at", operator: "null", value: null }],
    pagination: { pageSize: 200 },
  });
  const { data: packagesData } = useList<Package>({
    resource: "packages",
    filters: [
      { field: "status", operator: "eq", value: "published" },
      { field: "deleted_at", operator: "null", value: null },
    ],
    pagination: { pageSize: 200 },
  });

  const customers = customersData?.data ?? [];
  const packages = packagesData?.data ?? [];
  const selectedPackage = packages.find((p) => p.id === packageId);

  const resolveError = (code: string): string => {
    if (code === "customerRequired") return t("bookings.customerRequired");
    if (code === "packageRequired") return t("bookings.packageRequired");
    if (code === "travelDateRequired") return t("bookings.travelDateRequired");
    if (code === "travelersRequired") return t("bookings.travelersRequired");
    if (code === "firstNameRequired") return t("bookings.firstNameRequired");
    if (code === "lastNameRequired") return t("bookings.lastNameRequired");
    return code;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!tenantId || !identity?.id) {
      setError(t("bookings.tenantRequired"));
      return;
    }

    const parsed = bookingFormSchema.safeParse({
      customer_id: customerId,
      package_id: packageId,
      travel_date: travelDate,
      notes,
      travelers,
    });

    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".");
        next[key] = resolveError(String(issue.message));
      }
      setFieldErrors(next);
      return;
    }

    setSubmitting(true);
    try {
      const preview = await buildDraftPreview(supabaseClient, {
        customer_id: parsed.data.customer_id,
        package_id: parsed.data.package_id,
        travel_date: parsed.data.travel_date,
        travelers: toTravelerInputs(parsed.data.travelers),
        notes: parsed.data.notes,
      });

      const result = await executeCreateDraft(
        supabaseClient,
        tenantId,
        identity.id,
        preview
      );

      router.push(`/bookings/show/${result.booking_id}`);
      success(t("bookings.createSuccess"));
    } catch (err) {
      const message = err instanceof Error ? err.message : t("bookings.createError");
      setError(message);
      toastError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumbs
        items={[
          { label: t("nav.bookings"), href: "/bookings" },
          { label: t("bookings.createTitle") },
        ]}
      />
      <h2 className="text-2xl font-bold">{t("bookings.createTitle")}</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>{t("bookings.bookingDetails")}</CardTitle>
          </CardHeader>
          <div className="space-y-4 px-6 pb-6">
            <div>
              <Label>{t("fields.customer")}</Label>
              <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
                <option value="">{t("common.select")}</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}
                    {c.company_name ? ` (${c.company_name})` : ""}
                  </option>
                ))}
              </Select>
              {fieldErrors.customer_id && (
                <p className="mt-1 text-sm text-destructive">{fieldErrors.customer_id}</p>
              )}
            </div>
            <div>
              <Label>{t("fields.package")}</Label>
              <Select value={packageId} onChange={(e) => setPackageId(e.target.value)} required>
                <option value="">{t("common.select")}</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </Select>
              {fieldErrors.package_id && (
                <p className="mt-1 text-sm text-destructive">{fieldErrors.package_id}</p>
              )}
            </div>
            <div>
              <Label>{t("fields.travelDate")}</Label>
              <Input
                type="date"
                value={travelDate}
                onChange={(e) => setTravelDate(e.target.value)}
                required
              />
              {fieldErrors.travel_date && (
                <p className="mt-1 text-sm text-destructive">{fieldErrors.travel_date}</p>
              )}
            </div>
            <div>
              <Label>{t("common.notes")}</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>
        </Card>

        <Card className="max-w-3xl">
          <div className="px-6 py-6">
            <BookingTravelerForm
              rows={travelers}
              onChange={setTravelers}
              errors={fieldErrors.travelers ?? fieldErrors["travelers.0.first_name"]}
            />
          </div>
        </Card>

        <BookingPricingPreview
          packageId={packageId}
          packageTitle={selectedPackage?.title ?? t("fields.package")}
          travelers={travelers}
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-2">
          <Button type="submit" disabled={submitting || !tenantId}>
            {submitting ? t("common.creating") : t("bookings.create")}
          </Button>
          <Button type="button" variant="outline" onClick={() => list("bookings")}>
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </div>
  );
}
