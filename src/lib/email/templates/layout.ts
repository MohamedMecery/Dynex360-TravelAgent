import type { EmailBrandingContext } from "@/lib/email/types";
import type { EmailLocale } from "@/lib/email/messages";
import { emailT } from "@/lib/email/messages";

export interface EmailLayoutContent {
  locale: EmailLocale;
  branding: EmailBrandingContext;
  title: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderEmailLayout(content: EmailLayoutContent): { html: string; text: string } {
  const { locale, branding, title, bodyHtml, ctaLabel, ctaUrl } = content;
  const dir = locale === "ar" ? "rtl" : "ltr";
  const align = locale === "ar" ? "right" : "left";
  const fontFamily =
    locale === "ar"
      ? "'Noto Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif"
      : "'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  const logoBlock = branding.logoUrl
    ? `<img src="${escapeHtml(branding.logoUrl)}" alt="${escapeHtml(branding.companyName)}" width="140" style="display:block;max-width:140px;height:auto;" />`
    : `<p style="margin:0;font-size:20px;font-weight:700;color:#0f766e;">${escapeHtml(branding.companyName)}</p>`;

  const ctaBlock =
    ctaLabel && ctaUrl
      ? `<p style="margin:28px 0 0;">
          <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;">${escapeHtml(ctaLabel)}</a>
        </p>`
      : "";

  const supportLine = branding.supportEmail
    ? emailT(locale, "common.supportContact", { email: branding.supportEmail })
    : emailT(locale, "common.supportFallback");

  const html = `<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:${fontFamily};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e4e4e7;">
          <tr>
            <td style="padding:24px 28px;background:#f8fafc;border-bottom:1px solid #e4e4e7;text-align:${align};">
              ${logoBlock}
              <p style="margin:12px 0 0;font-size:14px;color:#52525b;">${escapeHtml(branding.companyName)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;text-align:${align};color:#18181b;font-size:15px;line-height:1.6;">
              <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:#18181b;">${escapeHtml(title)}</h1>
              ${bodyHtml}
              ${ctaBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px;background:#fafafa;border-top:1px solid #e4e4e7;text-align:${align};font-size:12px;color:#71717a;line-height:1.5;">
              <p style="margin:0 0 8px;">${escapeHtml(supportLine)}</p>
              <p style="margin:0;">${escapeHtml(emailT(locale, "common.poweredBy"))}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `${title}\n\n${bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}${
    ctaLabel && ctaUrl ? `\n\n${ctaLabel}: ${ctaUrl}` : ""
  }\n\n${supportLine}\n${emailT(locale, "common.poweredBy")}`;

  return { html, text };
}
