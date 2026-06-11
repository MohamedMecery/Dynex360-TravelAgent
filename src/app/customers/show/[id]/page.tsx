"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { Customer360View } from "@/components/customers/customer-360-view";
import { useTranslation } from "@/i18n/locale-provider";

function CustomerShowContent({ customerId }: { customerId: string }) {
  return <Customer360View customerId={customerId} />;
}

export default function CustomerShowPage() {
  const { t } = useTranslation();
  const params = useParams();
  const customerId = typeof params.id === "string" ? params.id : "";

  if (!customerId) {
    return <p>{t("common.loading")}</p>;
  }

  return (
    <Suspense fallback={<p>{t("common.loading")}</p>}>
      <CustomerShowContent customerId={customerId} />
    </Suspense>
  );
}
