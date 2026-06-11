/** Normalize customer mobile to E.164-ish digits for Meta API (default Egypt +20). */
export function normalizePhoneToE164(
  raw: string | null | undefined,
  defaultCountryCode = "20"
): string | null {
  if (!raw?.trim()) return null;
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith(defaultCountryCode)) return digits;
  if (digits.startsWith("0")) digits = `${defaultCountryCode}${digits.slice(1)}`;
  else if (digits.length <= 11) digits = `${defaultCountryCode}${digits}`;
  return digits;
}
