import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TenantPaymentSettings } from "@/lib/payments/types";

const DEFAULT_SETTINGS: Omit<TenantPaymentSettings, "tenant_id"> = {
  payments_enabled: false,
  default_provider: "paymob",
  deposit_percent: 30,
  booking_automation_mode: "auto_on_deposit",
  confirm_on_deposit: false,
  paymob_integration_id: null,
  paymob_iframe_id: null,
  currency_default: "EGP",
};

export async function getTenantPaymentSettings(
  tenantId: string,
  admin: SupabaseClient = createAdminClient()
): Promise<TenantPaymentSettings> {
  const { data, error } = await admin
    .from("tenant_payment_settings")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (!data) {
    return { tenant_id: tenantId, ...DEFAULT_SETTINGS };
  }

  return {
    tenant_id: data.tenant_id as string,
    payments_enabled: Boolean(data.payments_enabled),
    default_provider: (data.default_provider as TenantPaymentSettings["default_provider"]) ?? "paymob",
    deposit_percent: Number(data.deposit_percent ?? DEFAULT_SETTINGS.deposit_percent),
    booking_automation_mode:
      (data.booking_automation_mode as TenantPaymentSettings["booking_automation_mode"]) ??
      "auto_on_deposit",
    confirm_on_deposit: Boolean(data.confirm_on_deposit),
    paymob_integration_id: (data.paymob_integration_id as string) ?? null,
    paymob_iframe_id: (data.paymob_iframe_id as string) ?? null,
    currency_default: (data.currency_default as string) ?? "EGP",
  };
}

export function calculateCheckoutAmount(
  totalAmount: number,
  settings: TenantPaymentSettings
): { amount: number; orderType: "quotation_deposit" | "quotation_full" } {
  if (settings.booking_automation_mode === "auto_on_full") {
    return { amount: totalAmount, orderType: "quotation_full" };
  }
  const deposit = Math.round(totalAmount * (settings.deposit_percent / 100) * 100) / 100;
  const amount = Math.min(Math.max(deposit, 0.01), totalAmount);
  return { amount, orderType: "quotation_deposit" };
}
