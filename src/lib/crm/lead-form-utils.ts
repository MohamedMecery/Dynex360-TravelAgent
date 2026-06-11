import {
  leadCreateSchema,
  leadUpdateSchema,
  type LeadCreateInput,
  type LeadUpdateInput,
} from "@/lib/validation/lead";
import type { Lead } from "@/types";
import type { LeadFormValues } from "@/components/crm/lead-form-fields";

export const leadFormDefaultValues: LeadFormValues = {
  full_name: "",
  mobile: "",
  whatsapp: "",
  email: "",
  preferred_contact_channel: "whatsapp",
  source: "whatsapp",
  destination_text: "",
  expected_budget: "",
  currency: "EGP",
  travel_date: "",
  pax_count: "1",
  notes: "",
  status: "new",
  lost_reason: "",
};

export function leadToFormValues(lead: Lead): LeadFormValues {
  return {
    full_name: lead.full_name,
    mobile: lead.mobile ?? "",
    whatsapp: lead.whatsapp ?? "",
    email: lead.email ?? "",
    preferred_contact_channel: lead.preferred_contact_channel ?? "whatsapp",
    source: lead.source,
    destination_text: lead.destination_text ?? "",
    expected_budget:
      lead.expected_budget != null ? String(lead.expected_budget) : "",
    currency: lead.currency ?? "EGP",
    travel_date: lead.travel_date ?? "",
    pax_count: lead.pax_count != null ? String(lead.pax_count) : "1",
    notes: lead.notes ?? "",
    status: lead.status,
    lost_reason: lead.lost_reason ?? "",
  };
}

export function formValuesToLeadInput(values: LeadFormValues): LeadCreateInput {
  const raw = {
    full_name: values.full_name.trim(),
    mobile: values.mobile.trim() || null,
    whatsapp: values.whatsapp.trim() || null,
    email: values.email.trim() || null,
    preferred_contact_channel: values.preferred_contact_channel as LeadCreateInput["preferred_contact_channel"],
    source: values.source,
    destination_text: values.destination_text.trim() || null,
    expected_budget: values.expected_budget ? Number(values.expected_budget) : null,
    currency: values.currency.trim() || "EGP",
    travel_date: values.travel_date || null,
    pax_count: values.pax_count ? Number(values.pax_count) : undefined,
    notes: values.notes.trim() || null,
    status: values.status as LeadCreateInput["status"],
  };
  const parsed = leadCreateSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Validation failed");
  }
  return parsed.data;
}

export function formValuesToLeadUpdateInput(values: LeadFormValues): LeadUpdateInput {
  const raw = {
    full_name: values.full_name.trim(),
    mobile: values.mobile.trim() || null,
    whatsapp: values.whatsapp.trim() || null,
    email: values.email.trim() || null,
    preferred_contact_channel: values.preferred_contact_channel,
    source: values.source,
    destination_text: values.destination_text.trim() || null,
    expected_budget: values.expected_budget ? Number(values.expected_budget) : null,
    currency: values.currency.trim() || "EGP",
    travel_date: values.travel_date || null,
    pax_count: values.pax_count ? Number(values.pax_count) : undefined,
    notes: values.notes.trim() || null,
    status: values.status,
    lost_reason: values.lost_reason.trim() || null,
  };
  const parsed = leadUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Validation failed");
  }
  return parsed.data;
}
