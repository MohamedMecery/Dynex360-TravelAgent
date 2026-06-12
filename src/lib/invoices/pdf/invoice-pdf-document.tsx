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
} from "@react-pdf/renderer";
import { isRtlLocale } from "@/i18n/config";
import type { InvoicePdfViewModel } from "@/lib/invoices/invoice-pdf-types";
import { invoicePdfFontFamily } from "@/lib/invoices/pdf/register-fonts";

const BRAND_PRIMARY = "#0f766e";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";

function createStyles(locale: "en" | "ar", rtl: boolean) {
  const fontFamily = invoicePdfFontFamily(locale);
  const alignStart = rtl ? "right" : "left";
  const alignEnd = rtl ? "left" : "right";

  return StyleSheet.create({
    page: {
      fontFamily,
      fontSize: 10,
      color: "#0f172a",
      padding: 40,
      position: "relative",
    },
    watermark: {
      position: "absolute",
      top: "42%",
      left: "12%",
      fontSize: 72,
      color: "#e2e8f0",
      opacity: 0.45,
      transform: "rotate(-35deg)",
      fontWeight: 700,
    },
    headerRow: {
      flexDirection: rtl ? "row-reverse" : "row",
      justifyContent: "space-between",
      marginBottom: 24,
    },
    logoRow: {
      flexDirection: rtl ? "row-reverse" : "row",
      alignItems: "center",
      gap: 10,
    },
    logoImage: {
      width: 48,
      height: 48,
      objectFit: "contain",
    },
    logoFallback: {
      backgroundColor: BRAND_PRIMARY,
      borderRadius: 6,
      paddingVertical: 8,
      paddingHorizontal: 10,
    },
    logoFallbackText: {
      color: "#ffffff",
      fontSize: 11,
      fontWeight: 700,
    },
    companyName: {
      fontSize: 16,
      fontWeight: 700,
      textAlign: alignStart,
    },
    companyMeta: {
      fontSize: 9,
      color: MUTED,
      marginTop: 2,
      textAlign: alignStart,
    },
    invoiceTitle: {
      fontSize: 20,
      fontWeight: 700,
      textAlign: alignEnd,
    },
    section: {
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: 700,
      marginBottom: 8,
      color: BRAND_PRIMARY,
      textAlign: alignStart,
    },
    twoCol: {
      flexDirection: rtl ? "row-reverse" : "row",
      gap: 24,
    },
    col: {
      flex: 1,
    },
    labelRow: {
      flexDirection: rtl ? "row-reverse" : "row",
      justifyContent: "space-between",
      marginBottom: 4,
      gap: 8,
    },
    label: {
      color: MUTED,
      fontSize: 9,
      textAlign: alignStart,
    },
    value: {
      fontSize: 10,
      textAlign: alignEnd,
      flex: 1,
    },
    table: {
      borderWidth: 1,
      borderColor: BORDER,
      borderRadius: 4,
      marginTop: 4,
    },
    tableHeader: {
      flexDirection: rtl ? "row-reverse" : "row",
      backgroundColor: "#f8fafc",
      borderBottomWidth: 1,
      borderBottomColor: BORDER,
      paddingVertical: 6,
      paddingHorizontal: 8,
    },
    tableRow: {
      flexDirection: rtl ? "row-reverse" : "row",
      borderBottomWidth: 1,
      borderBottomColor: BORDER,
      paddingVertical: 6,
      paddingHorizontal: 8,
    },
    colDesc: { flex: 3, textAlign: alignStart },
    colQty: { flex: 1, textAlign: alignEnd },
    colUnit: { flex: 1.5, textAlign: alignEnd },
    colTotal: { flex: 1.5, textAlign: alignEnd },
    th: { fontSize: 9, fontWeight: 700, color: MUTED },
    td: { fontSize: 9 },
    totalsBox: {
      marginTop: 12,
      alignSelf: rtl ? "flex-start" : "flex-end",
      width: "48%",
    },
    totalRow: {
      flexDirection: rtl ? "row-reverse" : "row",
      justifyContent: "space-between",
      marginBottom: 4,
    },
    grandTotal: {
      flexDirection: rtl ? "row-reverse" : "row",
      justifyContent: "space-between",
      marginTop: 6,
      paddingTop: 6,
      borderTopWidth: 1,
      borderTopColor: BORDER,
      fontWeight: 700,
      fontSize: 11,
    },
    notes: {
      marginTop: 16,
      fontSize: 9,
      color: MUTED,
      textAlign: alignStart,
    },
    footer: {
      position: "absolute",
      bottom: 32,
      left: 40,
      right: 40,
      textAlign: "center",
      fontSize: 9,
      color: MUTED,
    },
  });
}

function LogoBlock({
  branding,
  styles,
}: {
  branding: InvoicePdfViewModel["branding"];
  styles: ReturnType<typeof createStyles>;
}): React.ReactElement {
  const logoPath = branding.logoPath;
  if (logoPath && fs.existsSync(logoPath)) {
    return <PdfImage src={logoPath} style={styles.logoImage} />;
  }
  return (
    <View style={styles.logoFallback}>
      <Text style={styles.logoFallbackText}>TravelOS</Text>
    </View>
  );
}

function FieldRow({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}): React.ReactElement {
  return (
    <View style={styles.labelRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

interface InvoicePdfDocumentProps {
  model: InvoicePdfViewModel;
}

export function InvoicePdfDocument({ model }: InvoicePdfDocumentProps): React.ReactElement {
  const rtl = isRtlLocale(model.locale);
  const styles = createStyles(model.locale, rtl);

  const { labels, branding, formatted } = model;
  const companyLines = [branding.address, branding.phone, branding.email].filter(
    (line): line is string => Boolean(line)
  );

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        {model.showDraftWatermark ? (
          <Text style={styles.watermark}>{labels.draftWatermark}</Text>
        ) : null}

        <View style={styles.headerRow}>
          <View>
            <View style={styles.logoRow}>
              <LogoBlock branding={branding} styles={styles} />
              <View>
                <Text style={styles.companyName}>{branding.companyName}</Text>
                {companyLines.map((line) => (
                  <Text key={line} style={styles.companyMeta}>
                    {line}
                  </Text>
                ))}
              </View>
            </View>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>{labels.invoice}</Text>
            <Text style={[styles.companyMeta, { textAlign: rtl ? "left" : "right" }]}>
              {model.invoiceNumber}
            </Text>
          </View>
        </View>

        <View style={[styles.section, styles.twoCol]}>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>{labels.invoice}</Text>
            <FieldRow label={labels.invoiceNumber} value={model.invoiceNumber} styles={styles} />
            <FieldRow label={labels.issueDate} value={formatted.issueDate} styles={styles} />
            <FieldRow label={labels.dueDate} value={formatted.dueDate} styles={styles} />
            <FieldRow label={labels.status} value={model.statusLabel} styles={styles} />
          </View>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>{labels.customer}</Text>
            <FieldRow label={labels.customer} value={model.customerName} styles={styles} />
            {model.customerEmail ? (
              <FieldRow label={labels.email} value={model.customerEmail} styles={styles} />
            ) : null}
            {model.customerPhone ? (
              <FieldRow label={labels.phone} value={model.customerPhone} styles={styles} />
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{labels.booking}</Text>
          <View style={styles.twoCol}>
            <View style={styles.col}>
              <FieldRow
                label={labels.bookingReference}
                value={model.bookingReference ?? labels.notAvailable}
                styles={styles}
              />
              <FieldRow
                label={labels.packageName}
                value={model.packageTitle ?? labels.notAvailable}
                styles={styles}
              />
            </View>
            <View style={styles.col}>
              <FieldRow
                label={labels.destination}
                value={model.destinationName ?? labels.notAvailable}
                styles={styles}
              />
              <FieldRow label={labels.travelDate} value={formatted.travelDate} styles={styles} />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{labels.description}</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.colDesc, styles.th]}>{labels.description}</Text>
              <Text style={[styles.colQty, styles.th]}>{labels.quantity}</Text>
              <Text style={[styles.colUnit, styles.th]}>{labels.unitPrice}</Text>
              <Text style={[styles.colTotal, styles.th]}>{labels.lineTotal}</Text>
            </View>
            {model.lineItems.map((item, index) => (
              <View key={item.id} style={styles.tableRow}>
                <Text style={[styles.colDesc, styles.td]}>{item.description}</Text>
                <Text style={[styles.colQty, styles.td]}>{String(item.quantity)}</Text>
                <Text style={[styles.colUnit, styles.td]}>
                  {formatted.lineItems[index]?.unitPrice ?? ""}
                </Text>
                <Text style={[styles.colTotal, styles.td]}>
                  {formatted.lineItems[index]?.lineTotal ?? ""}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.label}>{labels.subtotal}</Text>
              <Text>{formatted.subtotal}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.label}>{labels.tax}</Text>
              <Text>{formatted.tax}</Text>
            </View>
            {formatted.discount ? (
              <View style={styles.totalRow}>
                <Text style={styles.label}>{labels.discount}</Text>
                <Text>{formatted.discount}</Text>
              </View>
            ) : null}
            <View style={styles.grandTotal}>
              <Text>{labels.grandTotal}</Text>
              <Text>{formatted.total}</Text>
            </View>
          </View>
        </View>

        {model.notes ? (
          <Text style={styles.notes}>
            {labels.notes}: {model.notes}
          </Text>
        ) : null}

        <View style={styles.footer} fixed>
          <Text>{labels.thankYou}</Text>
          <Text>{labels.generatedBy}</Text>
        </View>
      </Page>
    </Document>
  );
}
