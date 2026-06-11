import type { Locale } from "@/i18n/config";
import { getCustomerDisplayName } from "@/lib/customers/display-name";
import { resolveInvoicePdfBranding } from "@/lib/invoices/pdf/branding";
import type { PortalQuotationDetail } from "@/lib/portal/portal-quotations-service";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Customer } from "@/types";

export interface QuotationPdfLineItem {
  description: string;
  itemType: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
}

export interface QuotationPdfViewModel {
  locale: Locale;
  quotationNumber: string;
  status: string;
  validUntil: string;
  customerName: string;
  currency: string;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  terms: string | null;
  branding: ReturnType<typeof resolveInvoicePdfBranding>;
  lineItems: QuotationPdfLineItem[];
  labels: {
    title: string;
    quotationNumber: string;
    validUntil: string;
    customer: string;
    description: string;
    qty: string;
    unitPrice: string;
    lineTotal: string;
    subtotal: string;
    discount: string;
    tax: string;
    total: string;
    terms: string;
  };
}

export class QuotationPdfNotFoundError extends Error {
  constructor() {
    super("Quotation not found");
    this.name = "QuotationPdfNotFoundError";
  }
}

function pdfLabels(locale: Locale) {
  const en = locale !== "ar";
  return {
    title: en ? "Quotation" : "عرض سعر",
    quotationNumber: en ? "Quotation #" : "رقم العرض",
    validUntil: en ? "Valid until" : "صالح حتى",
    customer: en ? "Customer" : "العميل",
    description: en ? "Description" : "الوصف",
    qty: en ? "Qty" : "الكمية",
    unitPrice: en ? "Unit price" : "سعر الوحدة",
    lineTotal: en ? "Total" : "الإجمالي",
    subtotal: en ? "Subtotal" : "المجموع الفرعي",
    discount: en ? "Discount" : "الخصم",
    tax: en ? "Tax" : "الضريبة",
    total: en ? "Grand total" : "الإجمالي الكلي",
    terms: en ? "Terms & conditions" : "الشروط والأحكام",
  };
}

export async function buildQuotationPdfViewModel(
  quotation: PortalQuotationDetail,
  customer: Customer,
  tenantName: string,
  settingsJson: Record<string, unknown> | null | undefined,
  locale: Locale
): Promise<QuotationPdfViewModel> {
  const labels = pdfLabels(locale);
  const currency = quotation.currency;

  return {
    locale,
    quotationNumber: quotation.quotation_number,
    status: quotation.status,
    validUntil: quotation.valid_until ? formatDate(quotation.valid_until, locale) : "—",
    customerName: getCustomerDisplayName(customer),
    currency,
    subtotal: formatCurrency(Number(quotation.subtotal), currency, locale),
    discount: formatCurrency(Number(quotation.discount_amount), currency, locale),
    tax: formatCurrency(Number(quotation.tax_amount), currency, locale),
    total: formatCurrency(Number(quotation.total_amount), currency, locale),
    terms: quotation.terms_and_conditions ?? null,
    branding: resolveInvoicePdfBranding(tenantName, settingsJson),
    lineItems: quotation.items.map((item) => ({
      description: item.description,
      itemType: item.item_type,
      quantity: item.quantity,
      unitPrice: formatCurrency(Number(item.unit_price), currency, locale),
      lineTotal: formatCurrency(Number(item.line_total), currency, locale),
    })),
    labels,
  };
}
