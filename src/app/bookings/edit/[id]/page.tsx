"use client";

import { useEffect, useState } from "react";
import { useList, useNavigation, useShow, useGetIdentity } from "@refinedev/core";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingPricingPreview } from "@/components/bookings/booking-pricing-preview";
import { BookingTravelerForm } from "@/components/bookings/booking-traveler-form";
import { executeUpdateDraft } from "@/lib/ai/booking-tools";
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
import { Booking, Package, BookingTravelerRow } from "@/types";

export default function BookingEditPage() {
  const { t } = useTranslation();
  const { list, show } = useNavigation();
  const router = useRouter();
  const tenantId = useTenantId();
  const { data: identity } = useGetIdentity<{ id?: string }>();

  const { queryResult } = useShow<Booking>({
    resource: "bookings",
    meta: { select: "*, packages(title)" },
  });
  const booking = queryResult?.data?.data;

  const [customerId, setCustomerId] = useState("");
  const [packageId, setPackageId] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [notes, setNotes] = useState("");
  const [travelers, setTravelers] = useState<BookingTravelerRowValues[]>([defaultTravelerRow()]);
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: packagesData } = useList<Package>({
    resource: "packages",
    filters: [
      { field: "status", operator: "eq", value: "published" },
      { field: "deleted_at", operator: "null", value: null },
    ],
    pagination: { pageSize: 200 },
  });
  const packages = packagesData?.data ?? [];

  const { data: travelerRowsData } = useList<BookingTravelerRow>({
    resource: "booking_travelers",
    filters: booking?.id ? [{ field: "booking_id", operator: "eq", value: booking.id }] : [],
    pagination: { pageSize: 50 },
    meta: { select: "*, travelers(first_name, last_name)" },
    queryOptions: { enabled: !!booking?.id },
  });

  useEffect(() => {
    if (!booking || loaded) return;

    setCustomerId(booking.customer_id);
    setPackageId(booking.package_id);
    setTravelDate(booking.travel_date ?? "");
    setNotes(booking.notes ?? "");
    setLoaded(true);
  }, [booking, loaded]);

  useEffect(() => {
    if (!loaded || !travelerRowsData?.data) return;
    const rows = travelerRowsData.data;
    if (rows.length === 0) return;

    setTravelers(
      rows.map((row) => ({
        first_name: row.travelers?.first_name ?? "",
        last_name: row.travelers?.last_name ?? "",
        tier: row.price_tier,
      }))
    );
  }, [loaded, travelerRowsData?.data]);

  if (!booking) return <p>{t("common.loading")}</p>;

  if (booking.status !== "draft") {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">{t("bookings.editDraftOnly")}</p>
        <Button onClick={() => show("bookings", booking.id)}>{t("common.view")}</Button>
      </div>
    );
  }

  const selectedPackage =
    packages.find((p) => p.id === packageId) ??
    (booking.packages ? ({ id: booking.package_id, title: booking.packages.title } as Package) : undefined);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

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
      setError(t("bookings.validationError"));
      return;
    }

    setSubmitting(true);
    try {
      await executeUpdateDraft(supabaseClient, tenantId, identity.id, {
        booking_id: booking.id,
        travel_date: parsed.data.travel_date,
        package_id: parsed.data.package_id,
        travelers: toTravelerInputs(parsed.data.travelers),
        notes: parsed.data.notes,
      });

      router.push(`/bookings/show/${booking.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("bookings.updateError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumbs
        items={[
          { label: t("nav.bookings"), href: "/bookings" },
          { label: booking.reference_number, href: `/bookings/show/${booking.id}` },
          { label: t("common.edit") },
        ]}
      />
      <h2 className="text-2xl font-bold">{t("bookings.editTitle")}</h2>
      <p className="font-mono text-sm text-muted-foreground">{booking.reference_number}</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>{t("bookings.bookingDetails")}</CardTitle>
          </CardHeader>
          <div className="space-y-4 px-6 pb-6">
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
            </div>
            <div>
              <Label>{t("fields.travelDate")}</Label>
              <Input
                type="date"
                value={travelDate}
                onChange={(e) => setTravelDate(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>{t("common.notes")}</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>
        </Card>

        <Card className="max-w-3xl">
          <div className="px-6 py-6">
            <BookingTravelerForm rows={travelers} onChange={setTravelers} />
          </div>
        </Card>

        <BookingPricingPreview
          packageId={packageId}
          packageTitle={selectedPackage?.title ?? t("fields.package")}
          travelers={travelers}
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? t("common.saving") : t("common.save")}
          </Button>
          <Button type="button" variant="outline" onClick={() => list("bookings")}>
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </div>
  );
}
