import { UserRole, UserStatus } from "@/types";

export interface TenantUserListItem {
  id: string;
  email: string;
  full_name: string | null;
  status: UserStatus;
  role: UserRole | null;
  created_at: string;
}

export interface InviteUserResult {
  user: TenantUserListItem;
  /** Manual fallback when Supabase did not send invite email (copy to invitee). */
  onboarding_link?: string;
  email_sent: boolean;
}
