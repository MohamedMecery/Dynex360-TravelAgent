import path from "node:path";
import { Font } from "@react-pdf/renderer";

let fontsRegistered = false;

/** Register Arabic font once per server process (Noto Sans Arabic via fontsource). */
export function ensureInvoicePdfFontsRegistered(): void {
  if (fontsRegistered) return;

  const arabicFontPath = path.join(
    process.cwd(),
    "node_modules",
    "@fontsource",
    "noto-sans-arabic",
    "files",
    "noto-sans-arabic-arabic-400-normal.woff"
  );

  Font.register({
    family: "NotoSansArabic",
    src: arabicFontPath,
  });

  fontsRegistered = true;
}

export function invoicePdfFontFamily(locale: "en" | "ar"): string {
  return locale === "ar" ? "NotoSansArabic" : "Helvetica";
}
