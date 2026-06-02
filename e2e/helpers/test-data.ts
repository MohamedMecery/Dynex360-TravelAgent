/** Unique suffix for isolated E2E records (safe to re-run). */
export function e2eRunId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** ISO date string N days in the future (for travel_date validation). */
export function futureTravelDate(daysAhead = 90): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}
