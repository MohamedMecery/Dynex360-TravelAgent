import type { AiLocale } from "@/lib/ai/locale";
import type {
  BookingDetailResult,
  CustomerSearchResult,
} from "@/lib/ai/booking-tools";
import type { PackageSearchResult } from "@/lib/ai/booking-tools";
import type { DraftPreview } from "@/lib/ai/booking-tools";

type SearchFilters = {
  destination?: string;
  minPrice?: number;
  maxPrice?: number;
  travelDate?: string;
};

export function cancellationRulesText(
  locale: AiLocale,
  status: string,
  paymentStatus: string
): string {
  if (status === "draft") {
    return locale === "ar"
      ? "يمكن إلغاء أو حذف مسودات الحجز دون تأثير على المدفوعات."
      : "Draft bookings can be discarded or cancelled without payment impact.";
  }
  if (status === "confirmed" && paymentStatus === "unpaid") {
    return locale === "ar"
      ? "حجز مؤكد وغير مدفوع — الإلغاء مسموح عادةً؛ تحقق من سياسة الوكالة."
      : "Confirmed but unpaid — cancellation typically allowed; verify agency policy.";
  }
  if (paymentStatus === "partial" || paymentStatus === "paid") {
    return locale === "ar"
      ? "توجد مدفوعات — قد يتطلب الإلغاء معالجة استرداد من قسم المالية."
      : "Payments recorded — cancellation may require refund processing by Finance.";
  }
  return locale === "ar"
    ? "راجع سياسة الإلغاء قبل التأكيد."
    : "Review agency cancellation policy before confirming.";
}

export function buildSearchResponse(
  locale: AiLocale,
  packages: PackageSearchResult[],
  filters: SearchFilters
): string {
  if (packages.length === 0) {
    return locale === "ar"
      ? "لا توجد باقات منشورة تطابق معاييرك. جرّب توسيع الوجهة أو نطاق السعر."
      : "No published packages match your criteria. Try broadening destination or price filters.";
  }

  const header =
    locale === "ar"
      ? `تم العثور على ${packages.length} باقة منشورة`
      : `Found ${packages.length} published package(s)`;
  let reply = header;
  if (filters.destination) {
    reply += locale === "ar" ? ` لـ «${filters.destination}»` : ` for "${filters.destination}"`;
  }
  reply += ":\n\n";

  packages.forEach((p, i) => {
    reply += `${i + 1}. **${p.title}**`;
    if (p.destination_name) reply += ` — ${p.destination_name}`;
    if (p.duration_days) {
      reply += locale === "ar" ? ` (${p.duration_days} أيام)` : ` (${p.duration_days} days)`;
    }
    if (p.adult_price !== undefined) {
      reply +=
        locale === "ar"
          ? ` — من ${p.adult_price} ${p.currency}`
          : ` — from ${p.currency} ${p.adult_price}`;
    }
    reply += `\n   ID: ${p.id}\n`;
  });

  reply +=
    locale === "ar"
      ? "\nلإنشاء مسودة حجز، أرسل confirm_action مع customer_id و package_id و travel_date والمسافرين."
      : "\nTo draft a booking, send confirm_action with customer_id, package_id, travel_date, and travelers.";

  return reply;
}

export function buildLookupResponse(locale: AiLocale, booking: BookingDetailResult): string {
  const travelerLines =
    booking.travelers.length > 0
      ? booking.travelers.map((t) => `  • ${t.name} (${t.tier})`).join("\n")
      : locale === "ar"
        ? "  • لا يوجد"
        : "  • None linked";

  if (locale === "ar") {
    return (
      `**${booking.reference_number}**\n` +
      `- الحالة: ${booking.status}\n` +
      `- الدفع: ${booking.payment_status}\n` +
      `- تاريخ السفر: ${booking.travel_date ?? "غير محدد"}\n` +
      `- العميل: ${booking.customer_name ?? "—"}\n` +
      `- الباقة: ${booking.package_title ?? "—"}\n` +
      `- الإجمالي: ${booking.total_amount} ${booking.currency}\n` +
      `- المسافرون:\n${travelerLines}`
    );
  }

  return (
    `**${booking.reference_number}**\n` +
    `- Status: ${booking.status}\n` +
    `- Payment: ${booking.payment_status}\n` +
    `- Travel date: ${booking.travel_date ?? "TBD"}\n` +
    `- Customer: ${booking.customer_name ?? "—"}\n` +
    `- Package: ${booking.package_title ?? "—"}\n` +
    `- Total: ${booking.currency} ${booking.total_amount}\n` +
    `- Travelers:\n${travelerLines}`
  );
}

export function buildCustomerResponse(
  locale: AiLocale,
  customers: CustomerSearchResult[]
): string {
  if (customers.length === 0) {
    return locale === "ar"
      ? "لم يتم العثور على عملاء مطابقين. أنشئ العميل في CRM أولاً."
      : "No customers matched. Create the customer in CRM first.";
  }

  let reply = locale === "ar" ? "العملاء المطابقون:\n\n" : "Matching customers:\n\n";
  customers.forEach((c, i) => {
    reply += `${i + 1}. ${c.label}${c.email ? ` (${c.email})` : ""}\n   ID: ${c.id}\n`;
  });
  return reply;
}

export function formatDraftPreviewReply(
  locale: AiLocale,
  preview: DraftPreview,
  forConfirm: boolean
): string {
  const lines = preview.line_items
    .map((i) => `  • ${i.description} ×${i.quantity} = ${preview.currency} ${i.total_price}`)
    .join("\n");

  if (locale === "ar") {
    return (
      `${forConfirm ? "**معاينة المسودة** (أكّد للحفظ)\n\n" : ""}` +
      `العميل: ${preview.customer_name}\n` +
      `الباقة: ${preview.package_title}\n` +
      `تاريخ السفر: ${preview.travel_date}\n` +
      `المسافرون: ${preview.travelers.map((t) => `${t.first_name} ${t.last_name} (${t.tier})`).join(", ")}\n\n` +
      `البنود:\n${lines}\n\n` +
      `**الإجمالي: ${preview.total_amount} ${preview.currency}**\n\n` +
      "ستبقى الحالة **مسودة** حتى يؤكدها موظف المبيعات في الحجوزات."
    );
  }

  return (
    `${forConfirm ? "**Draft preview** (confirm to save)\n\n" : ""}` +
    `Customer: ${preview.customer_name}\n` +
    `Package: ${preview.package_title}\n` +
    `Travel date: ${preview.travel_date}\n` +
    `Travelers: ${preview.travelers.map((t) => `${t.first_name} ${t.last_name} (${t.tier})`).join(", ")}\n\n` +
    `Line items:\n${lines}\n\n` +
    `**Total: ${preview.currency} ${preview.total_amount}**\n\n` +
    "Status will remain **draft** until a sales agent confirms in Bookings."
  );
}

export const bookingAgentMessages = {
  lookupRefRequired: (locale: AiLocale) =>
    locale === "ar"
      ? "يرجى تقديم مرجع الحجز (مثل BK-2026-000001) للاستعلام عن الحالة."
      : "Please provide a booking reference (e.g. BK-2026-000001) to look up status.",

  bookingNotFound: (locale: AiLocale, ref: string) =>
    locale === "ar" ? `لم يُعثر على حجز بالمرجع ${ref}.` : `No booking found for reference ${ref}.`,

  createDraftHelp: (locale: AiLocale) =>
    locale === "ar"
      ? "لإنشاء مسودة حجز، أكّد الإجراء مع: customer_id و package_id و travel_date (YYYY-MM-DD) ومسافر واحد على الأقل (first_name, last_name, tier). " +
        "استخدم نتائج البحث عن الباقات لـ package_id. سأعرض معاينة للموافقة — لا يمكنني تأكيد الحجز تلقائياً."
      : "To create a booking draft, confirm the action with: customer_id, package_id, travel_date (YYYY-MM-DD), and at least one traveler (first_name, last_name, tier). " +
        "Use package search results for package_id. I will prepare a preview for your approval — I cannot confirm bookings autonomously.",

  createDraftQuestions: (locale: AiLocale): string[] =>
    locale === "ar"
      ? [
          "أي عميل؟ (الاسم أو customer_id)",
          "أي باقة منشورة؟ (من نتائج البحث)",
          "تاريخ السفر (YYYY-MM-DD)؟",
          "أسماء المسافرين والفئة (adult/child/infant)؟",
        ]
      : [
          "Which customer? (name or customer_id)",
          "Which published package? (from search results)",
          "Travel date (YYYY-MM-DD)?",
          "Traveler names and tiers (adult/child/infant)?",
        ],

  updateDraftHelp: (locale: AiLocale) =>
    locale === "ar"
      ? "لتحديث مسودة حجز، قدّم booking_id (أو المرجع) والحقول المراد تغييرها. " +
        "يمكن تعديل الحجوزات ذات حالة مسودة فقط. يتطلب التأكيد قبل التطبيق."
      : "To update a draft booking, provide booking_id (or reference) and the fields to change. " +
        "Only draft status bookings can be modified. Confirmation required before applying changes.",

  cancelRefRequired: (locale: AiLocale) =>
    locale === "ar"
      ? "قدّم مرجع الحجز لطلب الإلغاء."
      : "Provide the booking reference to request cancellation.",

  cancelReview: (
    locale: AiLocale,
    ref: string,
    status: string,
    paymentStatus: string,
    rules: string
  ) =>
    locale === "ar"
      ? `مراجعة إلغاء ${ref} (${status}, ${paymentStatus}).\n` +
        `القواعد: ${rules}\n\n` +
        "أكّد أدناه لتسجيل طلب الإلغاء — يجب على الموظف الموافقة في واجهة الحجوزات."
      : `Cancellation review for ${ref} (${status}, ${paymentStatus}).\n` +
        `Rules: ${rules}\n\n` +
        "Confirm below to record a cancellation request — staff must approve in Bookings UI.",

  bookingNotFoundGeneric: (locale: AiLocale) =>
    locale === "ar" ? "الحجز غير موجود." : "Booking not found.",

  onlyDraftUpdatable: (locale: AiLocale) =>
    locale === "ar"
      ? "يمكن تحديث مسودات الحجز فقط عبر الوكيل."
      : "Only draft bookings can be updated via the agent.",

  reviewDraftUpdate: (locale: AiLocale, ref: string) =>
    locale === "ar"
      ? `راجع تحديث المسودة ${ref}. أكّد لتطبيق التغييرات.`
      : `Review draft update for ${ref}. Confirm to apply changes.`,

  cancelReviewShort: (locale: AiLocale, ref: string, rules: string) =>
    locale === "ar"
      ? `مراجعة إلغاء ${ref}.\nالقواعد: ${rules}\nأكّد لتسجيل الطلب.`
      : `Cancellation review for ${ref}.\nRules: ${rules}\nConfirm to record the request.`,

  unknownAction: (locale: AiLocale) =>
    locale === "ar" ? "إجراء غير معروف." : "Unknown action.",

  generalHelp: (locale: AiLocale) =>
    locale === "ar"
      ? "أنا مساعد الحجوزات. يمكنني:\n" +
        "• البحث عن الباقات المنشورة (الوجهة، السعر، التواريخ)\n" +
        "• الاستعلام عن الحجوزات بالمرجع (BK-YYYY-######)\n" +
        "• إعداد **مسودات** حجز (تؤكد أنت قبل الحفظ)\n" +
        "• اقتراح طلبات إلغاء (يؤكدها الموظف)\n\n" +
        "لا أؤكد الحجوزات ولا أعالج المدفوعات تلقائياً."
      : "I'm the Booking Assistant. I can:\n" +
        "• Search published packages (destination, price, dates)\n" +
        "• Look up bookings by reference (BK-YYYY-######)\n" +
        "• Prepare **draft** bookings (you confirm before save)\n" +
        "• Propose cancellation requests (staff confirms)\n\n" +
        "I never confirm bookings or process payments autonomously.",

  generalWithPackages: (locale: AiLocale, packageReply: string) =>
    locale === "ar"
      ? "يمكنني مساعدتك في البحث عن الباقات، الاستعلام عن الحجوزات، إنشاء المسودات، التحديثات، وطلبات الإلغاء.\n\n" +
        packageReply
      : "I can help with package search, booking lookup, draft creation, draft updates, and cancellation requests.\n\n" +
        packageReply,

  applyDraftCreated: (locale: AiLocale, ref: string) =>
    locale === "ar"
      ? `تم إنشاء مسودة الحجز: **${ref}**. راجعها وأكّدها في الحجوزات عند الجاهزية.`
      : `Draft booking created: **${ref}**. Review and confirm in Bookings when ready.`,

  applyDraftUpdated: (locale: AiLocale, ref: string) =>
    locale === "ar" ? `تم تحديث المسودة **${ref}**.` : `Draft **${ref}** updated.`,

  applyCancelRecorded: (locale: AiLocale, ref: string) =>
    locale === "ar"
      ? `تم تسجيل طلب الإلغاء للحجز **${ref}**. يجب على الموظف التأكيد في واجهة الحجوزات.`
      : `Cancellation request recorded for **${ref}**. Staff must confirm in Bookings UI.`,
} as const;
