export type UserRole =
  | "super_admin"
  | "tenant_admin"
  | "sales_agent"
  | "finance_officer";

export type AccountStatus = "pending" | "active" | "inactive";

export interface AuthProfile {
  id: string;
  email: string;
  full_name: string | null;
  tenant_id: string;
  role: UserRole;
  account_status: AccountStatus;
  permissions?: string[];
}
