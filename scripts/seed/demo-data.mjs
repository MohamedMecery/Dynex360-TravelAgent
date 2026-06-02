/**
 * Deterministic demo seed data for TravelOS MVP.
 * All records use fixed UUIDs for idempotent upserts.
 */

export const SEED_VERSION = "travelos-demo-seed-v1";
export const SEED_EMAIL_DOMAIN = "demo.travelos.local";

/** @param {string} group 4-char hex group @param {number} seq sequence */
export function sid(group, seq) {
  const g = group.replace(/-/g, "").padStart(4, "0").slice(-4);
  const n = String(seq).padStart(12, "0");
  return `00000000-${g}-4000-8000-${n}`;
}

export const DESTINATIONS = [
  {
    id: sid("0001", 1),
    slug: "demo-dubai",
    name: "Dubai & UAE",
    countryIso: "AE",
    cityName: "Dubai",
    description: "Luxury desert safaris, iconic skylines, and world-class hospitality.",
  },
  {
    id: sid("0001", 2),
    slug: "demo-istanbul",
    name: "Istanbul & Turkey",
    countryIso: "TR",
    cityName: "Istanbul",
    description: "Where East meets West — bazaars, mosques, and Bosphorus cruises.",
  },
  {
    id: sid("0001", 3),
    slug: "demo-paris",
    name: "Paris & France",
    countryIso: "FR",
    cityName: "Paris",
    description: "Art, cuisine, and romance in the City of Light.",
  },
];

export const PACKAGES = [
  {
    id: sid("0002", 1),
    destinationIdx: 0,
    title: "Dubai Desert & City Escape",
    description: "Five days blending dune bashing, Old Dubai souks, and Marina dining.",
    durationDays: 5,
    status: "published",
    days: [
      { day: 1, title: "Arrival & Marina", description: "Airport transfer, check-in, evening dhow cruise." },
      { day: 2, title: "Old Dubai & Souks", description: "Al Fahidi district, gold and spice souks, abra ride." },
      { day: 3, title: "Desert Safari", description: "Dune bashing, camel ride, BBQ dinner under the stars." },
      { day: 4, title: "Modern Dubai", description: "Burj Khalifa, Dubai Mall, optional ski Dubai." },
      { day: 5, title: "Departure", description: "Leisure morning and airport transfer." },
    ],
    pricing: [
      { tier: "adult", amount: 1299, currency: "USD" },
      { tier: "child", amount: 899, currency: "USD" },
      { tier: "infant", amount: 199, currency: "USD" },
    ],
  },
  {
    id: sid("0002", 2),
    destinationIdx: 1,
    title: "Istanbul Heritage Tour",
    description: "Four days exploring Hagia Sophia, Grand Bazaar, and Bosphorus shores.",
    durationDays: 4,
    status: "published",
    days: [
      { day: 1, title: "Sultanahmet", description: "Hagia Sophia, Blue Mosque, Hippodrome." },
      { day: 2, title: "Bosphorus Day", description: "Morning cruise, Dolmabahçe Palace, Ortaköy." },
      { day: 3, title: "Asian Side", description: "Üsküdar, Maiden's Tower, local food tour." },
      { day: 4, title: "Departure", description: "Grand Bazaar shopping and transfer." },
    ],
    pricing: [
      { tier: "adult", amount: 899, currency: "USD" },
      { tier: "child", amount: 649, currency: "USD" },
      { tier: "infant", amount: 149, currency: "USD" },
    ],
  },
  {
    id: sid("0002", 3),
    destinationIdx: 2,
    title: "Paris Romantic Getaway",
    description: "Three nights of Seine views, patisseries, and Montmartre strolls.",
    durationDays: 3,
    status: "published",
    days: [
      { day: 1, title: "Left Bank", description: "Eiffel Tower, Seine walk, Latin Quarter dinner." },
      { day: 2, title: "Louvre & Marais", description: "Museum morning, Le Marais boutiques." },
      { day: 3, title: "Montmartre", description: "Sacré-Cœur, artists' square, farewell dinner." },
    ],
    pricing: [
      { tier: "adult", amount: 1499, currency: "USD" },
      { tier: "child", amount: 999, currency: "USD" },
      { tier: "infant", amount: 249, currency: "USD" },
    ],
  },
  {
    id: sid("0002", 4),
    destinationIdx: 0,
    title: "Dubai Luxury Weekend",
    description: "A premium two-night city break with spa and fine dining.",
    durationDays: 2,
    status: "published",
    days: [
      { day: 1, title: "Luxury Arrival", description: "VIP transfer, spa treatment, rooftop dinner." },
      { day: 2, title: "Leisure & Departure", description: "Pool day, last-minute shopping, transfer out." },
    ],
    pricing: [
      { tier: "adult", amount: 799, currency: "USD" },
      { tier: "child", amount: 599, currency: "USD" },
      { tier: "infant", amount: 99, currency: "USD" },
    ],
  },
  {
    id: sid("0002", 5),
    destinationIdx: 1,
    title: "Istanbul & Cappadocia Combo",
    description: "Seven days from Istanbul bazaars to Cappadocia balloon rides.",
    durationDays: 7,
    status: "published",
    days: [
      { day: 1, title: "Istanbul Arrival", description: "Welcome dinner in Sultanahmet." },
      { day: 2, title: "Historic Istanbul", description: "Topkapi Palace and Grand Bazaar." },
      { day: 3, title: "Fly to Cappadocia", description: "Domestic flight, cave hotel check-in." },
      { day: 4, title: "Balloon & Valleys", description: "Sunrise balloon, Göreme open-air museum." },
      { day: 5, title: "Underground Cities", description: "Kaymakli and pottery workshop." },
      { day: 6, title: "Return to Istanbul", description: "Flight back, Bosphorus dinner." },
      { day: 7, title: "Departure", description: "Free morning and airport transfer." },
    ],
    pricing: [
      { tier: "adult", amount: 1899, currency: "USD" },
      { tier: "child", amount: 1299, currency: "USD" },
      { tier: "infant", amount: 299, currency: "USD" },
    ],
  },
];

export const CUSTOMERS = [
  { id: sid("0005", 1), type: "individual", firstName: "Sarah", lastName: "Johnson", email: `sarah.j@${SEED_EMAIL_DOMAIN}`, phone: "+1-555-0101" },
  { id: sid("0005", 2), type: "individual", firstName: "Ahmed", lastName: "Hassan", email: `ahmed.h@${SEED_EMAIL_DOMAIN}`, phone: "+971-555-0102" },
  { id: sid("0005", 3), type: "individual", firstName: "Maria", lastName: "Garcia", email: `maria.g@${SEED_EMAIL_DOMAIN}`, phone: "+34-555-0103" },
  { id: sid("0005", 4), type: "individual", firstName: "James", lastName: "Wilson", email: `james.w@${SEED_EMAIL_DOMAIN}`, phone: "+44-555-0104" },
  { id: sid("0005", 5), type: "individual", firstName: "Fatima", lastName: "Al-Rashid", email: `fatima.a@${SEED_EMAIL_DOMAIN}`, phone: "+966-555-0105" },
  { id: sid("0005", 6), type: "individual", firstName: "Chen", lastName: "Wei", email: `chen.w@${SEED_EMAIL_DOMAIN}`, phone: "+86-555-0106" },
  { id: sid("0005", 7), type: "individual", firstName: "Emily", lastName: "Brown", email: `emily.b@${SEED_EMAIL_DOMAIN}`, phone: "+1-555-0107" },
  { id: sid("0005", 8), type: "individual", firstName: "Omar", lastName: "Khalil", email: `omar.k@${SEED_EMAIL_DOMAIN}`, phone: "+962-555-0108" },
  { id: sid("0005", 9), type: "corporate", companyName: "Atlas Corp Travel", email: `atlas-corp@${SEED_EMAIL_DOMAIN}`, phone: "+1-555-0109" },
  { id: sid("0005", 10), type: "corporate", companyName: "Horizon Travel LLC", email: `horizon-ops@${SEED_EMAIL_DOMAIN}`, phone: "+1-555-0110" },
];

/** Demo knowledge base — FTS-friendly chunks (embedding optional). */
export const KNOWLEDGE_DOCUMENTS = [
  {
    id: sid("000c", 1),
    title: "Booking Cancellation Policy",
    documentType: "policy",
    chunks: [
      "Customers may cancel a confirmed booking up to 14 days before travel for a full refund minus a 10% admin fee. Cancellations within 14 days receive a 50% credit toward a future package. Draft bookings can be cancelled without charge.",
      "Cancelled bookings cannot receive new payments. Existing deposits are retained per the cancellation tier and recorded in the booking payment status.",
    ],
  },
  {
    id: sid("000c", 2),
    title: "Dubai Package FAQ",
    documentType: "faq",
    chunks: [
      "Dubai Desert & City Escape is a 5-day published package including desert safari, Marina cruise, and Burj Khalifa visit. Adult pricing starts at 1299 USD. Child and infant tiers are available.",
      "Dubai Luxury Weekend is a 2-night premium city break with spa and fine dining. Ideal for short corporate incentives and weekend getaways.",
    ],
  },
  {
    id: sid("000c", 3),
    title: "Istanbul & Turkey Sales SOP",
    documentType: "sop",
    chunks: [
      "When a sales agent creates a booking, always select a published package, add at least one traveler, and save as draft. Confirm only after customer approval. Record payments against confirmed or completed bookings only.",
      "Istanbul Heritage Tour and Istanbul & Cappadocia Combo are top sellers. Mention Bosphorus cruise and balloon ride when recommending Cappadocia.",
    ],
  },
  {
    id: sid("000c", 4),
    title: "Payment & Invoice Guidelines",
    documentType: "policy",
    chunks: [
      "Record payments against active bookings using bank transfer, card, or cash. Partial payments update booking payment status to partial; full payment sets status to paid.",
      "Finance officers can view dashboard total revenue and outstanding balance. Outstanding equals non-cancelled booking totals minus payments received.",
    ],
  },
];

/** Two travelers per customer (20 total). */
export const TRAVELERS = CUSTOMERS.flatMap((customer, customerIdx) => {
  const base = customerIdx * 2;
  const pairs = [
    {
      firstName: customer.firstName ?? "Lead",
      lastName: customer.lastName ?? "Contact",
      gender: "unspecified",
    },
    {
      firstName: ["Michael", "Layla", "Carlos", "Emma", "Youssef", "Li", "David", "Nadia", "Alex", "Jordan"][customerIdx],
      lastName: customer.lastName ?? customer.companyName?.split(" ")[0] ?? "Guest",
      gender: customerIdx % 2 === 0 ? "male" : "female",
    },
  ];
  return pairs.map((t, i) => ({
    id: sid("0006", base + i + 1),
    customerId: customer.id,
    firstName: t.firstName,
    lastName: t.lastName,
    gender: t.gender,
    email: i === 0 ? customer.email : undefined,
    dateOfBirth: `198${customerIdx}-0${(i % 9) + 1}-15`,
    nationalityIso: ["US", "AE", "ES", "GB", "SA", "CN", "US", "JO", "US", "US"][customerIdx],
  }));
});

/**
 * Booking definitions — 20 bookings with realistic status mix.
 * travelerSlots: indices into TRAVELERS array (customer-linked).
 */
export const BOOKINGS = [
  { id: sid("0007", 1), ref: "DEMO-BK-001", customerIdx: 0, packageIdx: 0, status: "draft", travelDate: "2026-09-10", createdDaysAgo: 2, slots: [{ t: 0, tier: "adult", lead: true }] },
  { id: sid("0007", 2), ref: "DEMO-BK-002", customerIdx: 1, packageIdx: 1, status: "draft", travelDate: "2026-09-15", createdDaysAgo: 3, slots: [{ t: 2, tier: "adult", lead: true }, { t: 3, tier: "adult", lead: false }] },
  { id: sid("0007", 3), ref: "DEMO-BK-003", customerIdx: 2, packageIdx: 2, status: "draft", travelDate: "2026-10-01", createdDaysAgo: 4, slots: [{ t: 4, tier: "adult", lead: true }, { t: 5, tier: "child", lead: false }] },
  { id: sid("0007", 4), ref: "DEMO-BK-004", customerIdx: 3, packageIdx: 3, status: "draft", travelDate: "2026-08-20", createdDaysAgo: 5, slots: [{ t: 6, tier: "adult", lead: true }] },
  { id: sid("0007", 5), ref: "DEMO-BK-005", customerIdx: 4, packageIdx: 4, status: "confirmed", travelDate: "2026-11-05", createdDaysAgo: 14, slots: [{ t: 8, tier: "adult", lead: true }, { t: 9, tier: "adult", lead: false }] },
  { id: sid("0007", 6), ref: "DEMO-BK-006", customerIdx: 5, packageIdx: 0, status: "confirmed", travelDate: "2026-10-20", createdDaysAgo: 12, slots: [{ t: 10, tier: "adult", lead: true }, { t: 11, tier: "child", lead: false }] },
  { id: sid("0007", 7), ref: "DEMO-BK-007", customerIdx: 6, packageIdx: 1, status: "confirmed", travelDate: "2026-09-25", createdDaysAgo: 10, slots: [{ t: 12, tier: "adult", lead: true }, { t: 13, tier: "adult", lead: false }] },
  { id: sid("0007", 8), ref: "DEMO-BK-008", customerIdx: 7, packageIdx: 2, status: "confirmed", travelDate: "2026-10-12", createdDaysAgo: 9, slots: [{ t: 14, tier: "adult", lead: true }] },
  { id: sid("0007", 9), ref: "DEMO-BK-009", customerIdx: 8, packageIdx: 4, status: "confirmed", travelDate: "2026-12-01", createdDaysAgo: 8, slots: [{ t: 16, tier: "adult", lead: true }, { t: 17, tier: "child", lead: false }] },
  { id: sid("0007", 10), ref: "DEMO-BK-010", customerIdx: 9, packageIdx: 0, status: "confirmed", travelDate: "2026-11-18", createdDaysAgo: 7, slots: [{ t: 18, tier: "adult", lead: true }, { t: 19, tier: "adult", lead: false }] },
  { id: sid("0007", 11), ref: "DEMO-BK-011", customerIdx: 0, packageIdx: 3, status: "confirmed", travelDate: "2026-08-30", createdDaysAgo: 6, slots: [{ t: 0, tier: "adult", lead: true }] },
  { id: sid("0007", 12), ref: "DEMO-BK-012", customerIdx: 1, packageIdx: 1, status: "completed", travelDate: "2026-03-15", createdDaysAgo: 45, slots: [{ t: 2, tier: "adult", lead: true }, { t: 3, tier: "adult", lead: false }] },
  { id: sid("0007", 13), ref: "DEMO-BK-013", customerIdx: 2, packageIdx: 2, status: "completed", travelDate: "2026-02-10", createdDaysAgo: 60, slots: [{ t: 4, tier: "adult", lead: true }] },
  { id: sid("0007", 14), ref: "DEMO-BK-014", customerIdx: 3, packageIdx: 0, status: "completed", travelDate: "2026-01-20", createdDaysAgo: 75, slots: [{ t: 6, tier: "adult", lead: true }, { t: 7, tier: "child", lead: false }] },
  { id: sid("0007", 15), ref: "DEMO-BK-015", customerIdx: 4, packageIdx: 3, status: "completed", travelDate: "2026-04-05", createdDaysAgo: 30, slots: [{ t: 8, tier: "adult", lead: true }] },
  { id: sid("0007", 16), ref: "DEMO-BK-016", customerIdx: 5, packageIdx: 4, status: "completed", travelDate: "2026-05-12", createdDaysAgo: 20, slots: [{ t: 10, tier: "adult", lead: true }, { t: 11, tier: "adult", lead: false }] },
  { id: sid("0007", 17), ref: "DEMO-BK-017", customerIdx: 6, packageIdx: 1, status: "cancelled", travelDate: "2026-07-01", createdDaysAgo: 25, slots: [{ t: 12, tier: "adult", lead: true }] },
  { id: sid("0007", 18), ref: "DEMO-BK-018", customerIdx: 7, packageIdx: 0, status: "cancelled", travelDate: "2026-06-15", createdDaysAgo: 18, slots: [{ t: 14, tier: "adult", lead: true }, { t: 15, tier: "adult", lead: false }] },
  { id: sid("0007", 19), ref: "DEMO-BK-019", customerIdx: 8, packageIdx: 2, status: "cancelled", travelDate: "2026-07-20", createdDaysAgo: 15, slots: [{ t: 16, tier: "adult", lead: true }, { t: 17, tier: "child", lead: false }] },
  { id: sid("0007", 20), ref: "DEMO-BK-020", customerIdx: 9, packageIdx: 1, status: "cancelled", travelDate: "2026-08-01", createdDaysAgo: 11, slots: [{ t: 18, tier: "adult", lead: true }] },
];

/** 10 payments — amounts as fraction of booking total (resolved at runtime). */
export const PAYMENTS = [
  { id: sid("0009", 1), bookingIdx: 4, ref: "DEMO-PAY-001", method: "bank_transfer", fraction: 0.5, daysAgo: 10 },
  { id: sid("0009", 2), bookingIdx: 5, ref: "DEMO-PAY-002", method: "card", fraction: 0.4, daysAgo: 8 },
  { id: sid("0009", 3), bookingIdx: 6, ref: "DEMO-PAY-003", method: "card", fraction: 1, daysAgo: 7 },
  { id: sid("0009", 4), bookingIdx: 7, ref: "DEMO-PAY-004", method: "cash", fraction: 1, daysAgo: 6 },
  { id: sid("0009", 5), bookingIdx: 8, ref: "DEMO-PAY-005", method: "bank_transfer", fraction: 0.6, daysAgo: 5 },
  { id: sid("0009", 6), bookingIdx: 8, ref: "DEMO-PAY-006", method: "card", fraction: 0.4, daysAgo: 3 },
  { id: sid("0009", 7), bookingIdx: 9, ref: "DEMO-PAY-007", method: "bank_transfer", fraction: 0.35, daysAgo: 4 },
  { id: sid("0009", 8), bookingIdx: 10, ref: "DEMO-PAY-008", method: "card", fraction: 1, daysAgo: 2 },
  { id: sid("0009", 9), bookingIdx: 11, ref: "DEMO-PAY-009", method: "bank_transfer", fraction: 1, daysAgo: 40 },
  { id: sid("0009", 10), bookingIdx: 17, ref: "DEMO-PAY-010", method: "card", fraction: 0.2, daysAgo: 12 },
];

export function buildLineItems(packageDef, slots) {
  const tierCounts = slots.reduce((acc, s) => {
    acc[s.tier] = (acc[s.tier] ?? 0) + 1;
    return acc;
  }, /** @type {Record<string, number>} */ ({}));

  const items = [];
  let itemIdx = 0;
  for (const [tier, qty] of Object.entries(tierCounts)) {
    const priceRow =
      packageDef.pricing.find((p) => p.tier === tier) ??
      packageDef.pricing.find((p) => p.tier === "adult");
    if (!priceRow || qty === 0) continue;
    items.push({
      tier,
      description: `${packageDef.title} — ${tier}`,
      quantity: qty,
      unit_price: priceRow.amount,
      total_price: priceRow.amount * qty,
      currency: priceRow.currency,
    });
    itemIdx += 1;
  }
  return items;
}

export function statusHistoryForBooking(bookingIdx, bookingId, tenantId, status, createdAt) {
  const rows = [];
  const base = createdAt;
  if (status === "draft") return rows;

  rows.push({
    id: sid("000a", bookingIdx * 10 + 1),
    booking_id: bookingId,
    tenant_id: tenantId,
    from_status: "draft",
    to_status: "confirmed",
    notes: "Demo seed — confirmed by agent",
    created_at: isoDaysAfter(base, 1),
  });

  if (status === "completed") {
    rows.push({
      id: sid("000a", bookingIdx * 10 + 2),
      booking_id: bookingId,
      tenant_id: tenantId,
      from_status: "confirmed",
      to_status: "completed",
      notes: "Demo seed — trip completed",
      created_at: isoDaysAfter(base, 30),
    });
  }

  if (status === "cancelled") {
    rows.push({
      id: sid("000a", bookingIdx * 10 + 3),
      booking_id: bookingId,
      tenant_id: tenantId,
      from_status: "confirmed",
      to_status: "cancelled",
      notes: "Demo seed — cancelled by customer request",
      created_at: isoDaysAfter(base, 5),
    });
  }

  return rows;
}

function isoDaysAfter(isoDate, days) {
  const d = new Date(isoDate);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

export function isoDaysAgo(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

/** Expected booking counts after seed (for post-seed validation). */
export const BOOKING_STATUS_EXPECTED = {
  draft: 4,
  confirmed: 7,
  completed: 5,
  cancelled: 4,
};
