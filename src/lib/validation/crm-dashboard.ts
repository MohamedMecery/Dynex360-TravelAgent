import { z } from "zod";

export const crmDashboardQuerySchema = z.object({
  period: z.enum(["month", "quarter", "custom"]).optional().default("month"),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});

export type CrmDashboardQuery = z.infer<typeof crmDashboardQuerySchema>;

export function resolveCrmDashboardRange(query: CrmDashboardQuery): {
  from: Date;
  to: Date;
} {
  const now = new Date();
  if (query.period === "custom" && query.from && query.to) {
    return { from: new Date(query.from), to: new Date(query.to) };
  }

  const to = new Date(now);
  const from = new Date(now);

  if (query.period === "quarter") {
    const month = from.getUTCMonth();
    const quarterStartMonth = Math.floor(month / 3) * 3;
    from.setUTCMonth(quarterStartMonth, 1);
    from.setUTCHours(0, 0, 0, 0);
  } else {
    from.setUTCDate(1);
    from.setUTCHours(0, 0, 0, 0);
  }

  to.setUTCHours(23, 59, 59, 999);
  return { from, to };
}
