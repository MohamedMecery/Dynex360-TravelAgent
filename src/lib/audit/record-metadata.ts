export interface AuditUserRef {
  full_name?: string | null;
  email?: string;
}

export interface RecordAuditFields {
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
  updated_by?: string | null;
  created_by_user?: AuditUserRef | null;
  updated_by_user?: AuditUserRef | null;
}

/** PostgREST select fragment for created_by / updated_by user joins. */
export function auditUserSelect(table: string): string {
  return [
    `created_by_user:users!${table}_created_by_fkey(full_name, email)`,
    `updated_by_user:users!${table}_updated_by_fkey(full_name, email)`,
  ].join(", ");
}

export function withAuditUserSelect(table: string, select: string): string {
  return `${select}, ${auditUserSelect(table)}`;
}

export function getAuditUserLabel(user?: AuditUserRef | null): string | null {
  if (!user) return null;
  const name = user.full_name?.trim();
  if (name) return name;
  if (user.email) return user.email;
  return null;
}
