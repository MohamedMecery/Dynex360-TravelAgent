import type { AnalyticsPeriod, AnalyticsPreset } from "@/lib/ai/analytics/types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface ResolvedPeriod {
  from: Date;
  to: Date;
  preset: AnalyticsPreset;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

/**
 * Returns [from, to) in UTC — `to` is exclusive (start of next boundary).
 */
export function resolveAnalyticsPeriod(
  preset: AnalyticsPreset,
  customFrom?: string,
  customTo?: string
): ResolvedPeriod {
  const now = new Date();
  const end = addUtcDays(startOfUtcDay(now), 1);

  if (preset === "custom") {
    const fromParsed = customFrom ? new Date(customFrom) : null;
    const toParsed = customTo ? new Date(customTo) : null;
    if (!fromParsed || !toParsed || Number.isNaN(fromParsed.getTime()) || Number.isNaN(toParsed.getTime())) {
      throw new Error("Invalid custom date range");
    }
    const from = startOfUtcDay(fromParsed);
    const to = addUtcDays(startOfUtcDay(toParsed), 1);
    if (from >= to) {
      throw new Error("Invalid custom date range");
    }
    return { from, to, preset };
  }

  const dayCount =
    preset === "today" ? 1 : preset === "7d" ? 7 : preset === "30d" ? 30 : 90;

  const from = addUtcDays(end, -dayCount);
  return { from, to: end, preset };
}

export function periodToIso(period: ResolvedPeriod): AnalyticsPeriod {
  return {
    from: period.from.toISOString(),
    to: period.to.toISOString(),
  };
}
