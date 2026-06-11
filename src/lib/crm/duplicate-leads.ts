import type { SupabaseClient } from "@supabase/supabase-js";

export type DuplicateMatchTier = "exact" | "possible";

export interface DuplicateLeadMatch {
  id: string;
  lead_number: string;
  full_name: string;
  email: string | null;
  mobile: string | null;
  whatsapp: string | null;
  status: string;
  match_reason: "email" | "mobile" | "whatsapp";
  match_tier: DuplicateMatchTier;
}

export interface LeadDuplicateCheckResult {
  exact: DuplicateLeadMatch[];
  possible: DuplicateLeadMatch[];
}

function normalizePhoneFull(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 ? digits : null;
}

function phoneLast10(full: string): string {
  return full.slice(-10);
}

function phonesExactMatch(
  inputMobile: string | null | undefined,
  inputWhatsapp: string | null | undefined,
  rowMobile: string | null,
  rowWhatsapp: string | null
): boolean {
  const inPhones = [normalizePhoneFull(inputMobile), normalizePhoneFull(inputWhatsapp)].filter(
    Boolean
  ) as string[];
  const rowPhones = [normalizePhoneFull(rowMobile), normalizePhoneFull(rowWhatsapp)].filter(
    Boolean
  ) as string[];
  if (inPhones.length === 0 || rowPhones.length === 0) return false;
  return inPhones.some((a) => rowPhones.some((b) => a === b));
}

function phonesPossibleMatch(
  inputMobile: string | null | undefined,
  inputWhatsapp: string | null | undefined,
  rowMobile: string | null,
  rowWhatsapp: string | null
): boolean {
  if (phonesExactMatch(inputMobile, inputWhatsapp, rowMobile, rowWhatsapp)) {
    return false;
  }
  const inLast = [
    normalizePhoneFull(inputMobile),
    normalizePhoneFull(inputWhatsapp),
  ]
    .filter(Boolean)
    .map((d) => phoneLast10(d as string));
  const rowLast = [normalizePhoneFull(rowMobile), normalizePhoneFull(rowWhatsapp)]
    .filter(Boolean)
    .map((d) => phoneLast10(d as string));
  if (inLast.length === 0 || rowLast.length === 0) return false;
  return inLast.some((a) => rowLast.some((b) => a === b));
}

function tierForRow(
  email: string | null | undefined,
  input: { email?: string | null; mobile?: string | null; whatsapp?: string | null },
  row: { email: string | null; mobile: string | null; whatsapp: string | null }
): { tier: DuplicateMatchTier; reason: DuplicateLeadMatch["match_reason"] } | null {
  const normalizedEmail = email?.trim().toLowerCase();
  if (normalizedEmail && row.email?.trim().toLowerCase() === normalizedEmail) {
    return { tier: "exact", reason: "email" };
  }
  if (phonesExactMatch(input.mobile, input.whatsapp, row.mobile, row.whatsapp)) {
    const inM = normalizePhoneFull(input.mobile);
    const inW = normalizePhoneFull(input.whatsapp);
    const rowM = normalizePhoneFull(row.mobile);
    const rowW = normalizePhoneFull(row.whatsapp);
    if (inM && (inM === rowM || inM === rowW)) return { tier: "exact", reason: "mobile" };
    if (inW && (inW === rowW || inW === rowM)) return { tier: "exact", reason: "whatsapp" };
    return { tier: "exact", reason: "mobile" };
  }
  if (phonesPossibleMatch(input.mobile, input.whatsapp, row.mobile, row.whatsapp)) {
    return { tier: "possible", reason: "mobile" };
  }
  return null;
}

export async function classifyLeadDuplicates(
  supabase: SupabaseClient,
  tenantId: string,
  input: {
    email?: string | null;
    mobile?: string | null;
    whatsapp?: string | null;
    exclude_id?: string;
  }
): Promise<LeadDuplicateCheckResult> {
  const exact = new Map<string, DuplicateLeadMatch>();
  const possible = new Map<string, DuplicateLeadMatch>();

  const add = (
    row: {
      id: string;
      lead_number: string;
      full_name: string;
      email: string | null;
      mobile: string | null;
      whatsapp: string | null;
      status: string;
    },
    match: {
      tier: DuplicateMatchTier;
      reason: DuplicateLeadMatch["match_reason"];
    }
  ) => {
    const entry: DuplicateLeadMatch = {
      id: row.id,
      lead_number: row.lead_number,
      full_name: row.full_name,
      email: row.email,
      mobile: row.mobile,
      whatsapp: row.whatsapp,
      status: row.status,
      match_tier: match.tier,
      match_reason: match.reason,
    };
    if (match.tier === "exact") {
      exact.set(row.id, entry);
      possible.delete(row.id);
    } else if (!exact.has(row.id)) {
      possible.set(row.id, entry);
    }
  };

  const email = input.email?.trim().toLowerCase();
  const hasPhone = Boolean(input.mobile?.trim() || input.whatsapp?.trim());

  if (email) {
    let q = supabase
      .from("leads")
      .select("id, lead_number, full_name, email, mobile, whatsapp, status")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .ilike("email", email);
    if (input.exclude_id) q = q.neq("id", input.exclude_id);
    const { data, error } = await q.limit(5);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      const match = tierForRow(email ?? null, input, row);
      if (match) add(row, match);
    }
  }

  if (hasPhone) {
    let q = supabase
      .from("leads")
      .select("id, lead_number, full_name, email, mobile, whatsapp, status")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null);
    if (input.exclude_id) q = q.neq("id", input.exclude_id);
    const { data, error } = await q.limit(200);
    if (error) throw new Error(error.message);

    for (const row of data ?? []) {
      const match = tierForRow(email ?? null, input, row);
      if (match) add(row, match);
    }
  }

  return { exact: Array.from(exact.values()), possible: Array.from(possible.values()) };
}

/** @deprecated Use classifyLeadDuplicates */
export async function findDuplicateLeads(
  supabase: SupabaseClient,
  tenantId: string,
  input: Parameters<typeof classifyLeadDuplicates>[2]
): Promise<DuplicateLeadMatch[]> {
  const { exact, possible } = await classifyLeadDuplicates(supabase, tenantId, input);
  return [...exact, ...possible];
}

export function isDuplicateLeadError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const message =
    "message" in error && typeof error.message === "string"
      ? error.message.toLowerCase()
      : "";
  return (
    message.includes("idx_leads_tenant_email_unique") ||
    message.includes("duplicate") ||
    ("code" in error && error.code === "23505")
  );
}
