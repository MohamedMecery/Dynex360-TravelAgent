import path from "node:path";

/** Extensible tenant branding for PDF (Phase 3: load from tenant_settings.settings). */
export interface InvoicePdfBranding {
  companyName: string;
  logoPath: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
}

const TRAVELOS_DEFAULT_LOGO = path.join(
  process.cwd(),
  "public",
  "branding",
  "travelos-logo.png"
);

const SETTINGS_BRANDING_KEYS = {
  companyName: "company_name",
  logoUrl: "company_logo",
  address: "company_address",
  phone: "company_phone",
  email: "company_email",
} as const;

function readOptionalString(settings: Record<string, unknown>, key: string): string | null {
  const value = settings[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Resolve PDF header branding. Uses tenant name today; optional overrides from
 * tenant_settings.settings JSONB when the Settings module populates them.
 */
export function resolveInvoicePdfBranding(
  tenantName: string,
  settingsJson?: Record<string, unknown> | null
): InvoicePdfBranding {
  const settings = settingsJson ?? {};
  const companyName =
    readOptionalString(settings, SETTINGS_BRANDING_KEYS.companyName) ??
    (tenantName.trim() || "TravelOS");

  const logoFromSettings = readOptionalString(settings, SETTINGS_BRANDING_KEYS.logoUrl);
  const logoPath = logoFromSettings?.startsWith("/")
    ? path.join(process.cwd(), "public", logoFromSettings.replace(/^\//, ""))
    : TRAVELOS_DEFAULT_LOGO;

  return {
    companyName,
    logoPath,
    address: readOptionalString(settings, SETTINGS_BRANDING_KEYS.address),
    phone: readOptionalString(settings, SETTINGS_BRANDING_KEYS.phone),
    email: readOptionalString(settings, SETTINGS_BRANDING_KEYS.email),
  };
}

export function getDefaultTravelOsLogoPath(): string {
  return TRAVELOS_DEFAULT_LOGO;
}
