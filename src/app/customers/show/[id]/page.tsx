"use client";

import { useShow } from "@refinedev/core";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerAddressesEditor } from "@/components/customers/customer-addresses-editor";
import { CustomerBookingsSection } from "@/components/customers/customer-bookings-section";
import { CustomerContactsEditor } from "@/components/customers/customer-contacts-editor";
import { getCustomerDisplayName } from "@/lib/customers/display-name";
import { useTranslation } from "@/i18n/locale-provider";
import { Customer } from "@/types";

export default function CustomerShowPage() {
  const { t } = useTranslation();
  const { queryResult } = useShow<Customer>({ resource: "customers" });
  const customer = queryResult?.data?.data;

  if (!customer) return <p>{t("common.loading")}</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{getCustomerDisplayName(customer)}</h2>
          <div className="mt-2">
            <StatusBadge namespace="customerType" value={customer.type} />
          </div>
        </div>
        <Link href={`/customers/edit/${customer.id}`}>
          <Button>{t("common.edit")}</Button>
        </Link>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>{t("customers.details")}</CardTitle>
        </CardHeader>
        <dl className="space-y-2 px-6 pb-6 text-sm">
          {customer.type === "individual" ? (
            <>
              <div className="flex gap-2">
                <dt className="w-32 font-medium">{t("fields.firstName")}:</dt>
                <dd>{customer.first_name ?? "—"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-32 font-medium">{t("fields.lastName")}:</dt>
                <dd>{customer.last_name ?? "—"}</dd>
              </div>
            </>
          ) : (
            <div className="flex gap-2">
              <dt className="w-32 font-medium">{t("fields.companyName")}:</dt>
              <dd>{customer.company_name ?? "—"}</dd>
            </div>
          )}
          <div className="flex gap-2">
            <dt className="w-32 font-medium">{t("fields.email")}:</dt>
            <dd>{customer.email ?? "—"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-32 font-medium">{t("fields.phone")}:</dt>
            <dd>{customer.phone ?? "—"}</dd>
          </div>
          {customer.notes && (
            <div>
              <dt className="mb-1 font-medium">{t("common.notes")}:</dt>
              <dd className="text-muted-foreground">{customer.notes}</dd>
            </div>
          )}
        </dl>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <CustomerContactsEditor customerId={customer.id} />
        <CustomerAddressesEditor customerId={customer.id} />
      </div>

      <CustomerBookingsSection customerId={customer.id} />
    </div>
  );
}
