"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useList, type CrudFilters } from "@refinedev/core";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card } from "@/components/ui/card";
import { BookingStatusActions } from "@/components/bookings/booking-status-actions";
import { formatCustomerDisplayName } from "@/lib/customers/format-customer-name";
import {
  bookingListFiltersToSearchParams,
  EMPTY_BOOKING_LIST_FILTERS,
  hasActiveBookingListFilters,
  parseBookingListFilters,
  type BookingListFilters,
} from "@/lib/bookings/list-filters";
import { isTerminalBookingStatus } from "@/lib/bookings/status-transitions";
import { useTranslation } from "@/i18n/locale-provider";
import { useFormat } from "@/i18n/use-format";
import { Booking, BookingStatus, Customer, PaymentStatus } from "@/types";

function BookingListContent() {
  const { t, dir } = useTranslation();
  const { formatCurrency, formatDate } = useFormat();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<BookingListFilters>(EMPTY_BOOKING_LIST_FILTERS);

  useEffect(() => {
    setFilters(parseBookingListFilters(searchParams));
  }, [searchParams]);

  const applyFilters = (next: BookingListFilters) => {
    setFilters(next);
    const qs = bookingListFiltersToSearchParams(next).toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const clearFilters = () => {
    applyFilters(EMPTY_BOOKING_LIST_FILTERS);
  };

  const crudFilters = useMemo((): CrudFilters => {
    const next: CrudFilters = [{ field: "deleted_at", operator: "null", value: null }];
    if (filters.status) {
      next.push({ field: "status", operator: "eq", value: filters.status });
    }
    if (filters.paymentStatus) {
      next.push({ field: "payment_status", operator: "eq", value: filters.paymentStatus });
    }
    if (filters.customerId) {
      next.push({ field: "customer_id", operator: "eq", value: filters.customerId });
    }
    if (filters.reference.trim()) {
      next.push({
        field: "reference_number",
        operator: "contains",
        value: filters.reference.trim(),
      });
    }
    if (filters.travelDateFrom) {
      next.push({ field: "travel_date", operator: "gte", value: filters.travelDateFrom });
    }
    if (filters.travelDateTo) {
      next.push({ field: "travel_date", operator: "lte", value: filters.travelDateTo });
    }
    return next;
  }, [filters]);

  const { data: customersData } = useList<Customer>({
    resource: "customers",
    filters: [{ field: "deleted_at", operator: "null", value: null }],
    sorters: [{ field: "last_name", order: "asc" }],
    pagination: { pageSize: 200 },
    meta: { select: "id, first_name, last_name" },
  });

  const { data, isLoading, refetch } = useList<Booking>({
    resource: "bookings",
    filters: crudFilters,
    sorters: [{ field: "created_at", order: "desc" }],
    meta: { select: "*, customers(first_name, last_name), packages(title)" },
  });

  const bookings = data?.data ?? [];
  const customers = customersData?.data ?? [];
  const filtersActive = hasActiveBookingListFilters(filters);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">{t("bookings.title")}</h2>
        <Link href="/bookings/create">
          <Button>{t("bookings.create")}</Button>
        </Link>
      </div>

      <Card className="mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium">{t("bookings.searchReference")}</label>
            <Input
              value={filters.reference}
              onChange={(e) => applyFilters({ ...filters, reference: e.target.value })}
              placeholder={t("bookings.searchReferencePlaceholder")}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t("fields.status")}</label>
            <Select
              value={filters.status}
              onChange={(e) =>
                applyFilters({ ...filters, status: e.target.value as BookingStatus | "" })
              }
            >
              <option value="">{t("bookings.allStatuses")}</option>
              <option value="draft">{t("bookingStatus.draft")}</option>
              <option value="confirmed">{t("bookingStatus.confirmed")}</option>
              <option value="completed">{t("bookingStatus.completed")}</option>
              <option value="cancelled">{t("bookingStatus.cancelled")}</option>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t("bookings.filterPayment")}</label>
            <Select
              value={filters.paymentStatus}
              onChange={(e) =>
                applyFilters({ ...filters, paymentStatus: e.target.value as PaymentStatus | "" })
              }
            >
              <option value="">{t("bookings.allPaymentStatuses")}</option>
              <option value="unpaid">{t("paymentStatus.unpaid")}</option>
              <option value="partial">{t("paymentStatus.partial")}</option>
              <option value="paid">{t("paymentStatus.paid")}</option>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t("bookings.filterCustomer")}</label>
            <Select
              value={filters.customerId}
              onChange={(e) => applyFilters({ ...filters, customerId: e.target.value })}
            >
              <option value="">{t("bookings.allCustomers")}</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {formatCustomerDisplayName(customer) ?? customer.id}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t("bookings.travelDateFrom")}</label>
            <Input
              type="date"
              value={filters.travelDateFrom}
              onChange={(e) => applyFilters({ ...filters, travelDateFrom: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t("bookings.travelDateTo")}</label>
            <Input
              type="date"
              value={filters.travelDateTo}
              onChange={(e) => applyFilters({ ...filters, travelDateTo: e.target.value })}
            />
          </div>
        </div>
        {filtersActive && (
          <div className="mt-3 flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
              {t("common.clearFilters")}
            </Button>
          </div>
        )}
      </Card>

      <Card>
        {isLoading ? (
          <p className="p-4">{t("common.loading")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" dir={dir}>
              <thead>
                <tr className="border-b text-start">
                  <th className="px-4 pb-2 pt-4">{t("dashboard.reference")}</th>
                  <th className="px-4 pb-2 pt-4">{t("bookings.customer")}</th>
                  <th className="px-4 pb-2 pt-4">{t("fields.package")}</th>
                  <th className="px-4 pb-2 pt-4">{t("fields.status")}</th>
                  <th className="px-4 pb-2 pt-4">{t("dashboard.payment")}</th>
                  <th className="px-4 pb-2 pt-4">{t("bookings.total")}</th>
                  <th className="px-4 pb-2 pt-4">{t("fields.travelDate")}</th>
                  <th className="px-4 pb-2 pt-4">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => {
                  const terminal = isTerminalBookingStatus(b.status);
                  const customerName = formatCustomerDisplayName(b.customers);

                  return (
                    <tr key={b.id} className="border-b">
                      <td className="px-4 py-2 font-mono text-xs">
                        <Link
                          href={`/bookings/show/${b.id}`}
                          className="text-primary hover:underline"
                        >
                          {b.reference_number}
                        </Link>
                      </td>
                      <td className="px-4 py-2">{customerName ?? "—"}</td>
                      <td className="px-4 py-2">{b.packages?.title ?? "—"}</td>
                      <td className="px-4 py-2">
                        <StatusBadge namespace="bookingStatus" value={b.status} />
                      </td>
                      <td className="px-4 py-2">
                        <StatusBadge namespace="paymentStatus" value={b.payment_status} />
                      </td>
                      <td className="px-4 py-2">
                        {formatCurrency(Number(b.total_amount), b.currency)}
                      </td>
                      <td className="px-4 py-2">
                        {b.travel_date ? formatDate(b.travel_date) : "—"}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link href={`/bookings/show/${b.id}`}>
                            <Button variant="outline" size="sm">
                              {t("common.view")}
                            </Button>
                          </Link>
                          {!terminal && b.status === "draft" && (
                            <Link href={`/bookings/edit/${b.id}`}>
                              <Button variant="outline" size="sm">
                                {t("common.edit")}
                              </Button>
                            </Link>
                          )}
                          {!terminal && b.status === "confirmed" && b.payment_status !== "paid" && (
                            <Link href={`/payments/create?booking_id=${b.id}`}>
                              <Button size="sm">{t("bookings.recordPayment")}</Button>
                            </Link>
                          )}
                          {!terminal && (
                            <BookingStatusActions
                              bookingId={b.id}
                              status={b.status}
                              size="sm"
                              variant="inline"
                              onStatusChange={() => void refetch()}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {bookings.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center">
                      <p className="text-muted-foreground">
                        {filtersActive ? t("bookings.noBookingsFiltered") : t("bookings.noBookings")}
                      </p>
                      {!filtersActive && (
                        <Link href="/bookings/create" className="mt-3 inline-block">
                          <Button size="sm">{t("bookings.createFirst")}</Button>
                        </Link>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function BookingListPage() {
  const { t } = useTranslation();

  return (
    <Suspense fallback={<p className="p-4 text-muted-foreground">{t("common.loading")}</p>}>
      <BookingListContent />
    </Suspense>
  );
}
