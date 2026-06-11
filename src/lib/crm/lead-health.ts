import type { Lead, LeadStatus } from "@/types";

/** API + UI health bands */
export type LeadHealthLevel = "healthy" | "needs_follow_up" | "critical";

export interface LeadHealthResult {
  level: LeadHealthLevel;
  score: number;
  factors: string[];
  days_since_contact: number | null;
  has_contact_channel: boolean;
}

const TERMINAL: LeadStatus[] = ["won", "lost"];

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function computeLeadHealth(
  lead: Lead,
  options?: { overdue_activity_count?: number }
): LeadHealthResult {
  const factors: string[] = [];
  const overdue = options?.overdue_activity_count ?? 0;
  const days = daysSince(lead.last_contacted_at);
  const hasChannel = Boolean(lead.whatsapp?.trim() || lead.mobile?.trim());

  if (TERMINAL.includes(lead.status)) {
    return {
      level: "healthy",
      score: 100,
      factors: ["terminal_status"],
      days_since_contact: days,
      has_contact_channel: hasChannel,
    };
  }

  let score = 85;

  if (!hasChannel) {
    score -= 25;
    factors.push("missing_phone");
  }

  if (days === null) {
    score -= 20;
    factors.push("never_contacted");
  } else if (days > 7) {
    score -= 35;
    factors.push("stale_7d");
  } else if (days > 3) {
    score -= 15;
    factors.push("stale_3d");
  }

  if (overdue > 0) {
    score -= 20;
    factors.push("overdue_activities");
  }

  if (lead.status === "new" && days !== null && days > 1) {
    score -= 10;
    factors.push("new_not_followed_up");
  }

  score = Math.max(0, Math.min(100, score));

  let level: LeadHealthLevel = "healthy";
  if (score < 50 || factors.includes("stale_7d") || overdue > 0) {
    level = "critical";
  } else if (score < 75 || factors.includes("stale_3d") || factors.includes("missing_phone")) {
    level = "needs_follow_up";
  }

  return {
    level,
    score,
    factors,
    days_since_contact: days,
    has_contact_channel: hasChannel,
  };
}
