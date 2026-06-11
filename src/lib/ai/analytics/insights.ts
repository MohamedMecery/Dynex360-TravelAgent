import type { AiAnalyticsData } from "@/lib/ai/analytics/types";
import type { AiAgentKey } from "@/types";

const AGENT_LABELS: Record<AiAgentKey, string> = {
  knowledge: "Knowledge",
  booking: "Booking",
  support: "Support",
  sales: "Sales",
  operations: "Operations",
};

/**
 * Deterministic insights from measured KPIs only (no proxy metrics).
 */
export function buildAnalyticsInsights(
  data: AiAnalyticsData,
  locale: "en" | "ar" = "en"
): string[] {
  const insights: string[] = [];
  const { executive, agent_usage, support } = data;
  const total = executive.total_conversations;

  if (total > 0 && agent_usage.length > 0) {
    const top = [...agent_usage].sort((a, b) => b.count - a.count)[0];
    const share = Math.round((top.count / total) * 100);
    const agentName = AGENT_LABELS[top.agent_key] ?? top.agent_key;
    insights.push(
      locale === "ar"
        ? `وكيل ${agentName} يمثل ${share}% من المحادثات في هذه الفترة.`
        : `${agentName} Agent accounts for ${share}% of conversations in this period.`
    );
  }

  if (executive.feedback_rate != null) {
    insights.push(
      locale === "ar"
        ? `معدل التقييم الإيجابي ${executive.feedback_rate}% من التقييمات المسجلة.`
        : `Helpful feedback rate is ${executive.feedback_rate}% among recorded ratings.`
    );
  }

  if (support.tickets_created > 0) {
    const resolvedShare = Math.round(
      (support.tickets_resolved / support.tickets_created) * 100
    );
    insights.push(
      locale === "ar"
        ? `${support.tickets_created} تذكرة دعم أُنشئت؛ ${support.tickets_resolved} أُغلقت أو حُلّت (${resolvedShare}%).`
        : `${support.tickets_created} support tickets were created; ${support.tickets_resolved} were resolved or closed (${resolvedShare}%).`
    );
  }

  if (data.top_documents.length > 0) {
    const doc = data.top_documents[0];
    insights.push(
      locale === "ar"
        ? `أكثر مستند معرفة استشهاداً: «${doc.document_title}» (${doc.reference_count} مرجع).`
        : `Most cited knowledge document: "${doc.document_title}" (${doc.reference_count} references).`
    );
  }

  if (data.top_destinations.length > 0) {
    const dest = data.top_destinations[0];
    insights.push(
      locale === "ar"
        ? `أعلى وجهة في مسودات وكيل الحجز: ${dest.destination_name} (${dest.booking_count} حجز).`
        : `Top destination in Booking Agent drafts: ${dest.destination_name} (${dest.booking_count} bookings).`
    );
  }

  return insights;
}
