interface CustomerNameFields {
  first_name?: string | null;
  last_name?: string | null;
}

export function formatCustomerDisplayName(
  customer: CustomerNameFields | null | undefined
): string | null {
  if (!customer) return null;

  const parts = [customer.first_name, customer.last_name]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(" ") : null;
}
