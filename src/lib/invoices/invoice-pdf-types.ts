import type { Locale } from "@/i18n/config";
import type { InvoicePdfBranding } from "@/lib/invoices/pdf/branding";
import type { InvoicePdfLabels } from "@/lib/invoices/invoice-pdf-i18n";
import type { InvoiceLineItemSnapshot, InvoiceStatus } from "@/types";

export interface InvoicePdfViewModel {
  locale: Locale;
  isDraft: boolean;
  showDraftWatermark: boolean;
  branding: InvoicePdfBranding;
  labels: InvoicePdfLabels;
  statusLabel: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: string | null;
  dueDate: string | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  bookingReference: string | null;
  packageTitle: string | null;
  destinationName: string | null;
  travelDate: string | null;
  lineItems: InvoiceLineItemSnapshot[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number | null;
  totalAmount: number;
  currency: string;
  notes: string | null;
  formatted: {
    issueDate: string;
    dueDate: string;
    travelDate: string;
    subtotal: string;
    tax: string;
    discount: string | null;
    total: string;
    lineItems: { unitPrice: string; lineTotal: string }[];
  };
}
