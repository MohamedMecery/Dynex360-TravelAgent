import { SupabaseClient } from "@supabase/supabase-js";
import { getSiteUrl } from "@/lib/auth/site-url";
import { resolveEmailLocale, type EmailLocale } from "@/lib/email/messages";
import { resolveInvoicePdfBranding } from "@/lib/invoices/pdf/branding";
import type { EmailBrandingContext } from "@/lib/email/types";

const DEFAULT_LOGO_PATH = "/branding/travelos-logo.png";

export interface TenantBrandingSource {
  tenantName: string;
  settingsJson?: Record<string, unknown> | null;
}

export function resolveEmailBranding(source: TenantBrandingSource): EmailBrandingContext {
  const pdfBranding = resolveInvoicePdfBranding(source.tenantName, source.settingsJson);
  const siteUrl = getSiteUrl();

  const logoSetting = source.settingsJson?.company_logo;
  let logoUrl: string | null = `${siteUrl}${DEFAULT_LOGO_PATH}`;
  if (typeof logoSetting === "string" && logoSetting.trim()) {
    const path = logoSetting.trim();
    logoUrl = path.startsWith("http") ? path : `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
  }

  return {
    companyName: pdfBranding.companyName,
    logoUrl,
    supportEmail: pdfBranding.email,
    supportPhone: pdfBranding.phone,
    siteUrl,
  };
}

export async function loadTenantBranding(
  supabase: SupabaseClient,
  tenantId: string
): Promise<EmailBrandingContext> {
  const [{ data: tenant }, { data: settingsRow }] = await Promise.all([
    supabase.from("tenants").select("name").eq("id", tenantId).maybeSingle(),
    supabase.from("tenant_settings").select("settings").eq("tenant_id", tenantId).maybeSingle(),
  ]);

  return resolveEmailBranding({
    tenantName: tenant?.name ?? "TravelOS",
    settingsJson: (settingsRow?.settings as Record<string, unknown> | null) ?? null,
  });
}

export async function loadTenantEmailLocale(
  supabase: SupabaseClient,
  tenantId: string
): Promise<EmailLocale> {
  const { data } = await supabase
    .from("tenant_settings")
    .select("locale")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  return resolveEmailLocale(data?.locale);
}
