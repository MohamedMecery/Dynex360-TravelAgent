/** @jsxRuntime classic */
/** @jsx ExternalReact.createElement */
import fs from "node:fs";
import ExternalReact from "@travelos/external-react";
import {
  Document,
  Image as PdfImage,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { isRtlLocale } from "@/i18n/config";
import type { QuotationPdfViewModel } from "@/lib/portal/quotation-pdf-types";
import { invoicePdfFontFamily, ensureInvoicePdfFontsRegistered } from "@/lib/invoices/pdf/register-fonts";

const BRAND = "#0f766e";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";

function styles(locale: "en" | "ar", rtl: boolean) {
  const font = invoicePdfFontFamily(locale);
  return StyleSheet.create({
    page: { fontFamily: font, fontSize: 10, padding: 40, color: "#0f172a" },
    header: {
      flexDirection: rtl ? "row-reverse" : "row",
      justifyContent: "space-between",
      marginBottom: 24,
    },
    title: { fontSize: 20, fontWeight: 700, color: BRAND },
    company: { fontSize: 12, fontWeight: 600 },
    meta: { marginBottom: 16, fontSize: 10, color: MUTED },
    tableHeader: {
      flexDirection: rtl ? "row-reverse" : "row",
      borderBottomWidth: 1,
      borderBottomColor: BORDER,
      paddingVertical: 6,
      fontWeight: 600,
    },
    tableRow: {
      flexDirection: rtl ? "row-reverse" : "row",
      borderBottomWidth: 1,
      borderBottomColor: BORDER,
      paddingVertical: 6,
    },
    colDesc: { width: "40%" },
    colQty: { width: "12%", textAlign: "center" },
    colUnit: { width: "24%", textAlign: rtl ? "left" : "right" },
    colTotal: { width: "24%", textAlign: rtl ? "left" : "right" },
    totals: { marginTop: 16, alignSelf: rtl ? "flex-start" : "flex-end", width: "45%" },
    totalRow: {
      flexDirection: rtl ? "row-reverse" : "row",
      justifyContent: "space-between",
      paddingVertical: 3,
    },
    grandTotal: { fontWeight: 700, fontSize: 12, marginTop: 4 },
    terms: { marginTop: 24, fontSize: 9, color: MUTED },
    logo: { width: 40, height: 40, objectFit: "contain" },
  });
}

export function QuotationPdfDocument({ model }: { model: QuotationPdfViewModel }) {
  const rtl = isRtlLocale(model.locale);
  const s = styles(model.locale, rtl);
  const logoExists = model.branding.logoPath && fs.existsSync(model.branding.logoPath);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.title}>{model.labels.title}</Text>
            <Text style={s.company}>{model.branding.companyName}</Text>
          </View>
          {logoExists && model.branding.logoPath ? (
            <PdfImage style={s.logo} src={model.branding.logoPath} />
          ) : null}
        </View>

        <View style={s.meta}>
          <Text>
            {model.labels.quotationNumber}: {model.quotationNumber}
          </Text>
          <Text>
            {model.labels.customer}: {model.customerName}
          </Text>
          <Text>
            {model.labels.validUntil}: {model.validUntil}
          </Text>
        </View>

        <View style={s.tableHeader}>
          <Text style={s.colDesc}>{model.labels.description}</Text>
          <Text style={s.colQty}>{model.labels.qty}</Text>
          <Text style={s.colUnit}>{model.labels.unitPrice}</Text>
          <Text style={s.colTotal}>{model.labels.lineTotal}</Text>
        </View>

        {model.lineItems.map((item, i) => (
          <View key={i} style={s.tableRow}>
            <Text style={s.colDesc}>{item.description}</Text>
            <Text style={s.colQty}>{item.quantity}</Text>
            <Text style={s.colUnit}>{item.unitPrice}</Text>
            <Text style={s.colTotal}>{item.lineTotal}</Text>
          </View>
        ))}

        <View style={s.totals}>
          <View style={s.totalRow}>
            <Text>{model.labels.subtotal}</Text>
            <Text>{model.subtotal}</Text>
          </View>
          <View style={s.totalRow}>
            <Text>{model.labels.discount}</Text>
            <Text>{model.discount}</Text>
          </View>
          <View style={s.totalRow}>
            <Text>{model.labels.tax}</Text>
            <Text>{model.tax}</Text>
          </View>
          <View style={[s.totalRow, s.grandTotal]}>
            <Text>{model.labels.total}</Text>
            <Text>{model.total}</Text>
          </View>
        </View>

        {model.terms ? (
          <View style={s.terms}>
            <Text style={{ fontWeight: 600, marginBottom: 4 }}>{model.labels.terms}</Text>
            <Text>{model.terms}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}

export async function renderQuotationPdfBuffer(model: QuotationPdfViewModel): Promise<Buffer> {
  // Static import keeps a single @react-pdf/renderer instance — a dynamic
  // import resolved a second copy under the Next build and the renderer
  // rejected elements created by the other copy (React error #31).
  ensureInvoicePdfFontsRegistered();
  return renderToBuffer(<QuotationPdfDocument model={model} />);
}

export function buildQuotationPdfFilename(quotationNumber: string): string {
  const safe = quotationNumber.replace(/[^\w.-]+/g, "_");
  return `quotation-${safe}.pdf`;
}
