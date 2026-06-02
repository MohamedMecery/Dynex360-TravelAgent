import type { Metadata } from "next";
import { Inter, Noto_Sans_Arabic } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import RefineContext from "./refine-context";
import { isRtlLocale } from "@/i18n/config";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const notoArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-noto-arabic",
});

export const metadata: Metadata = {
  title: "TravelOS — Travel Management Platform for Agencies & DMCs",
  description:
    "Enterprise SaaS for travel agencies, tour operators, and DMCs. Customers, packages, bookings, payments, and AI-assisted drafts in one secure workspace.",
  openGraph: {
    title: "TravelOS — Travel Management Platform",
    description: "The operating system for modern travel agencies.",
    type: "website",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  const dir = isRtlLocale(locale) ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body className={`${inter.variable} ${notoArabic.variable} font-sans antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <RefineContext>{children}</RefineContext>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
