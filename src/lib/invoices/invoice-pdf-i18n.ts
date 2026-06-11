import type { Locale } from "@/i18n/config";
import { translateMessage } from "@/i18n/translate-utils";
import en from "../../../messages/en.json";

export interface InvoicePdfLabels {
  invoice: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  status: string;
  customer: string;
  email: string;
  phone: string;
  booking: string;
  bookingReference: string;
  packageName: string;
  destination: string;
  travelDate: string;
  description: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
  subtotal: string;
  tax: string;
  discount: string;
  grandTotal: string;
  thankYou: string;
  generatedBy: string;
  draftWatermark: string;
  notAvailable: string;
  notes: string;
}

export async function loadInvoicePdfLabels(locale: Locale): Promise<InvoicePdfLabels> {
  const messages = (await import(`../../../messages/${locale}.json`)).default as Record<
    string,
    unknown
  >;
  const t = (key: string): string =>
    translateMessage(messages, en as Record<string, unknown>, key);

  return {
    invoice: t("invoices.pdf.title"),
    invoiceNumber: t("fields.invoiceNumber"),
    issueDate: t("fields.issueDate"),
    dueDate: t("fields.dueDate"),
    status: t("fields.status"),
    customer: t("fields.customer"),
    email: t("fields.email"),
    phone: t("fields.phone"),
    booking: t("fields.booking"),
    bookingReference: t("invoices.pdf.bookingReference"),
    packageName: t("fields.package"),
    destination: t("fields.destination"),
    travelDate: t("fields.travelDate"),
    description: t("fields.description"),
    quantity: t("bookings.qty"),
    unitPrice: t("bookings.unitPrice"),
    lineTotal: t("bookings.lineTotal"),
    subtotal: t("fields.subtotal"),
    tax: t("fields.tax"),
    discount: t("invoices.pdf.discount"),
    grandTotal: t("bookings.total"),
    thankYou: t("invoices.pdf.thankYou"),
    generatedBy: t("invoices.pdf.generatedBy"),
    draftWatermark: t("invoices.pdf.draftWatermark"),
    notAvailable: t("invoices.pdf.notAvailable"),
    notes: t("common.notes"),
  };
}

export function translateInvoiceStatus(
  locale: Locale,
  status: string,
  messages: Record<string, unknown>
): string {
  return (
    translateMessage(messages, en as Record<string, unknown>, `invoiceStatus.${status}`) ||
    status
  );
}
