import type { Customer } from "@/types";

export function getCustomerDisplayName(customer: Pick<Customer, "type" | "first_name" | "last_name" | "company_name">): string {
  if (customer.type === "corporate" && customer.company_name?.trim()) {
    return customer.company_name.trim();
  }
  return [customer.first_name, customer.last_name].filter(Boolean).join(" ").trim() || "—";
}
