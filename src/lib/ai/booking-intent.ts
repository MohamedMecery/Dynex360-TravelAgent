export type BookingIntent =
  | "search_packages"
  | "lookup_booking"
  | "search_customers"
  | "create_draft"
  | "update_draft"
  | "propose_cancellation"
  | "general";

const CANCEL_KEYWORDS = [
  "cancel",
  "cancellation",
  "refund booking",
  "إلغاء",
  "الغاء",
  "إلغاء الحجز",
  "الغاء الحجز",
  "استرداد",
  "طلب إلغاء",
];
const LOOKUP_KEYWORDS = [
  "status",
  "lookup",
  "find booking",
  "reference",
  "booking ref",
  "حالة الحجز",
  "مرجع",
  "رقم الحجز",
  "استعلام",
  "ابحث عن حجز",
  "البحث عن حجز",
];
const CREATE_KEYWORDS = [
  "draft",
  "create booking",
  "new booking",
  "book ",
  "reserve",
  "مسودة",
  "حجز جديد",
  "إنشاء حجز",
  "انشاء حجز",
  "احجز",
  "حجز ",
];
const UPDATE_KEYWORDS = [
  "update booking",
  "change date",
  "modify booking",
  "add traveler",
  "تحديث",
  "تعديل",
  "تغيير تاريخ",
  "إضافة مسافر",
  "تعديل الحجز",
];
const SEARCH_KEYWORDS = [
  "package",
  "trip",
  "tour",
  "destination",
  "search",
  "find package",
  "باقة",
  "باقات",
  "رحلة",
  "رحلات",
  "برنامج",
  "وجهة",
  "ابحث",
  "بحث",
  "اعثر",
  "اعثروا",
  "سياحة",
];
const CUSTOMER_KEYWORDS = ["customer", "client", "عميل", "زبون", "العميل", "العملاء"];

function includesKeyword(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((keyword) => {
    const keyLower = keyword.toLowerCase();
    return lower.includes(keyLower) || text.includes(keyword);
  });
}

export function parseBookingIntent(message: string): BookingIntent {
  if (includesKeyword(message, CANCEL_KEYWORDS)) {
    return "propose_cancellation";
  }
  if (/\b(bk-|bkg-)/i.test(message) && includesKeyword(message, LOOKUP_KEYWORDS)) {
    return "lookup_booking";
  }
  if (/\b(bk-\d{4}-\d+)/i.test(message) && !includesKeyword(message, CREATE_KEYWORDS)) {
    return "lookup_booking";
  }
  if (includesKeyword(message, UPDATE_KEYWORDS)) {
    return "update_draft";
  }
  if (includesKeyword(message, CREATE_KEYWORDS)) {
    return "create_draft";
  }
  if (includesKeyword(message, SEARCH_KEYWORDS)) {
    return "search_packages";
  }
  if (includesKeyword(message, CUSTOMER_KEYWORDS)) {
    return "search_customers";
  }
  if (includesKeyword(message, LOOKUP_KEYWORDS)) {
    return "lookup_booking";
  }

  return "general";
}

export function extractBookingReference(message: string): string | null {
  const match = message.match(/\b(BK-\d{4}-\d+|BKG[-\w]+)\b/i);
  return match?.[1]?.toUpperCase() ?? null;
}

export function extractTravelDate(message: string): string | null {
  const iso = message.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];

  const slash = message.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](20\d{2})\b/);
  if (slash) {
    const [, d, m, y] = slash;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  return null;
}

export function extractPriceRange(message: string): { min?: number; max?: number } {
  const under = message.match(/(?:under|below|less than|أقل\s+من|تحت|بحد\s+أقصى|بحد\s+اقصى)\s+\$?(\d+)/i);
  if (under) return { max: Number(under[1]) };

  const between = message.match(
    /(?:between|من)\s+\$?(\d+)\s+(?:and|to|و|إلى|الى)\s+\$?(\d+)/i
  );
  if (between) return { min: Number(between[1]), max: Number(between[2]) };

  const maxOnly = message.match(/(?:max|maximum|حد\s+أقصى|حد\s+اقصى)\s+\$?(\d+)/i);
  if (maxOnly) return { max: Number(maxOnly[1]) };

  return {};
}

const DESTINATION_SUFFIX =
  /\s+(?:trip|package|tour|days?|رحلة|باقة|برنامج|أيام|ايام)$/iu;

export function extractDestinationHint(message: string): string | null {
  const latin = message.match(/\b(?:to|in|for)\s+([A-Za-z][A-Za-z\s]{2,30})/i);
  if (latin) {
    const hint = latin[1].trim().replace(DESTINATION_SUFFIX, "");
    return hint.length >= 3 ? hint : null;
  }

  const arabic = message.match(
    /(?:إلى|الى|في|لـ|ل)\s+([\u0600-\u06FFa-zA-Z][\u0600-\u06FFa-zA-Z\s]{1,40})/u
  );
  if (arabic) {
    const hint = arabic[1].trim().replace(DESTINATION_SUFFIX, "");
    return hint.length >= 2 ? hint : null;
  }

  return null;
}

/** Strip Arabic diacritics and tatweel for fuzzy destination matching. */
export function normalizeSearchText(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[\u0640\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .toLowerCase()
    .trim();
}

export function textMatchesHint(haystack: string | undefined, hint: string): boolean {
  if (!haystack) return false;
  const normalizedHay = normalizeSearchText(haystack);
  const normalizedHint = normalizeSearchText(hint);
  return normalizedHay.includes(normalizedHint) || haystack.includes(hint);
}
