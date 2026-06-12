import type { ReactElement } from "react";
import ExternalReact from "@travelos/external-react";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePdfDocument } from "@/lib/invoices/pdf/invoice-pdf-document";
import { ensureInvoicePdfFontsRegistered } from "@/lib/invoices/pdf/register-fonts";
import type { InvoicePdfViewModel } from "@/lib/invoices/invoice-pdf-types";

export function buildInvoicePdfFilename(invoiceNumber: string): string {
  const safe = invoiceNumber.replace(/[^\w.-]+/g, "_");
  return `invoice-${safe}.pdf`;
}

/** On-demand PDF generation (reusable for future email attachments). */
export async function renderInvoicePdfBuffer(model: InvoicePdfViewModel): Promise<Buffer> {
  ensureInvoicePdfFontsRegistered();
  // Element must come from the same React instance the PDF reconciler uses
  // (see serverExternalPackages note in next.config.ts).
  const element = ExternalReact.createElement(InvoicePdfDocument, { model }) as ReactElement;
  const buffer = await renderToBuffer(element);
  return Buffer.from(buffer);
}
