import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export type PortalAuditEventName = "quotation_accepted" | "quotation_rejected";

export interface LogPortalCustomerAuditInput {
  tenantId: string;
  customerId: string;
  portalAccountId: string;
  tableName: string;
  recordId: string;
  eventName: PortalAuditEventName;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
}

/** Records a customer-initiated action in audit_logs (service role). */
export async function logPortalCustomerAudit(
  input: LogPortalCustomerAuditInput,
  admin?: SupabaseClient
): Promise<string | null> {
  const client = admin ?? createAdminClient();
  const { data, error } = await client.rpc("log_portal_customer_audit", {
    p_tenant_id: input.tenantId,
    p_customer_id: input.customerId,
    p_portal_account_id: input.portalAccountId,
    p_table_name: input.tableName,
    p_record_id: input.recordId,
    p_event_name: input.eventName,
    p_old_data: input.oldData ?? null,
    p_new_data: input.newData ?? null,
  });

  if (error) {
    console.error("log_portal_customer_audit failed:", error.message);
    return null;
  }

  return data as string | null;
}
