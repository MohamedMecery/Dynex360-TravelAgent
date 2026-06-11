import type { ActivityListView } from "@/types/crm";

export const queryKeys = {
  dashboard: (period: string) => ["dashboard", period] as const,
  leads: {
    all: ["leads"] as const,
    list: (filters: object) => ["leads", "list", filters] as const,
  },
  lead: (id: string) => ["lead", id] as const,
  opportunities: {
    all: ["opportunities"] as const,
    list: (filters: object) => ["opportunities", "list", filters] as const,
  },
  opportunity: (id: string) => ["opportunity", id] as const,
  activities: {
    all: ["activities"] as const,
    list: (filters: { view?: ActivityListView; tab?: string }) =>
      ["activities", "list", filters] as const,
  },
  activity: (id: string) => ["activity", id] as const,
  assignees: (search?: string) => ["assignees", search ?? ""] as const,
  quotations: {
    all: ["quotations"] as const,
    list: (filters: object) => ["quotations", "list", filters] as const,
  },
  quotation: (id: string) => ["quotation", id] as const,
  customer360: (id: string) => ["customer360", id] as const,
  customerTimeline: (id: string, bucket: string) =>
    ["customerTimeline", id, bucket] as const,
  bookings: {
    all: ["bookings"] as const,
    list: (filters: object) => ["bookings", "list", filters] as const,
  },
  booking: (id: string) => ["booking", id] as const,
};
