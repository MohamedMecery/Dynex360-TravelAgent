# TravelOS Landing Page Specification

**Version:** 1.1  
**Status:** Approved (D-009) — Trust & Scale Metrics implemented in `src/components/landing/trust-metrics-section.tsx`  
**Last Updated:** 2026-06-02  
**Routes:** `/` (guest marketing; authenticated users redirected to `/dashboard`), `/home` (marketing always visible)

---

## 1. Page Structure (order)

| # | Section | ID anchor | Implementation status |
|---|---------|-----------|------------------------|
| 1 | Sticky navigation | — | Implemented |
| 2 | Hero | — | Implemented |
| 3 | **Trust & Scale Metrics** | `#metrics` | **Implemented** |
| 4 | Product showcase (dashboard) | `#showcase` | Implemented |
| 5 | Features overview | `#features` | Implemented |
| 6 | Solution deep-dives | `#solutions`, `#booking`, `#packages`, `#customers`, `#ai` | Implemented |
| 7 | Pricing | `#pricing` | Implemented |
| 8 | Testimonials | — | Implemented |
| 9 | FAQ | `#faq` | Implemented |
| 10 | CTA band | — | Implemented |
| 11 | Footer | — | Implemented |

---

## 2. Trust & Scale Metrics — UX Specification

### 2.1 Purpose

Immediately after the Hero, establish **enterprise credibility** for travel agencies, tour operators, and DMCs evaluating TravelOS. Metrics are **marketing claims** (not live tenant data) unless later wired to analytics.

### 2.2 Placement

- **Position:** Directly below Hero, above Product Showcase.
- **Scroll:** Optional nav link “Why TravelOS” → `#metrics` (POST-MVP nav item).
- **Reading order (RTL):** Metrics flow right-to-left in Arabic; numbers use Western digits with locale-appropriate suffix labels.

### 2.3 Content

| Key | EN label | AR label | Value | Notes |
|-----|----------|----------|-------|-------|
| `metrics.bookings` | Bookings processed | حجوزات مُعالجة | +50,000 | Prefix “+”; animate from 0 |
| `metrics.agencies` | Travel agencies | وكالات سفر | +200 | |
| `metrics.countries` | Countries | دول | +20 | |
| `metrics.uptime` | Uptime | جاهزية المنصة | 99.9% | Decimal; suffix `%` |

Supporting line (optional): `metrics.eyebrow` — “Trusted at scale” / “ثقة على نطاق واسع”.

### 2.4 Behavior

- Counters animate once when section enters viewport (Intersection Observer), duration ~1.2s, ease-out.
- Respect `prefers-reduced-motion`: show final values immediately.
- No auto-refresh; static marketing numbers until analytics API exists (Phase 6).

### 2.5 Accessibility

- Section `aria-labelledby` pointing to heading.
- Each metric: `aria-label` with full phrase e.g. “More than 50,000 bookings processed”.
- Uptime metric not presented as a live SLA contract in legal copy (footer disclaimer optional).

---

## 3. Trust & Scale Metrics — UI Specification

### 3.1 Layout

- **Desktop (≥1024px):** 4 columns, equal width, centered in `max-w-7xl`.
- **Tablet (640–1023px):** 2×2 grid.
- **Mobile (<640px):** 2×2 or single column stack if cramped; minimum touch target N/A (non-interactive).

### 3.2 Visual design

- Background: `bg-landing-sand/60` or subtle gradient band contrasting Hero (`bg-landing-hero`) and Features (white).
- Top/bottom border: `border-y border-border/40`.
- Vertical padding: `py-12` mobile, `py-16` desktop.
- Metric value: `text-4xl sm:text-5xl font-bold text-landing-deep`.
- Metric label: `text-sm text-muted-foreground`.
- Optional icon per metric (Lucide): `CalendarCheck`, `Building2`, `Globe2`, `Activity` — 20px, `text-primary`.

### 3.3 RTL

- Grid uses logical properties (`gap`, `text-center`).
- Parent `dir` inherited from `LocaleProvider` / section wrapper.
- Prefix “+” remains leading in RTL (LTR mark for numbers); percent sign follows number.

### 3.4 Brand consistency

- Colors: `landing-deep`, `landing-teal`, `landing-gold` tokens from `globals.css`.
- Typography: Inter / Noto Sans Arabic per root layout.
- No stock photography in metrics band — typography-first SaaS pattern.

---

## 4. Component Specification

### 4.1 `TrustMetricsSection`

**Path (proposed):** `src/components/landing/trust-metrics-section.tsx`

**Props:** None (copy via `useTranslation()`).

**Children:**

- `MetricCounter` × 4 (internal or co-located).

### 4.2 `MetricCounter`

| Prop | Type | Description |
|------|------|-------------|
| `value` | number | Target numeric value (50000, 200, 20) |
| `suffix` | string | `""`, `"%"`, or translated unit |
| `prefix` | string | `"+"` optional |
| `decimals` | number | `0` or `1` for uptime |
| `labelKey` | string | i18n key |
| `icon` | LucideIcon | optional |

**State:** `displayValue` animated via `requestAnimationFrame` or lightweight hook.

### 4.3 i18n keys (proposed)

```
landing.metrics.eyebrow
landing.metrics.bookings.label
landing.metrics.agencies.label
landing.metrics.countries.label
landing.metrics.uptime.label
```

### 4.4 Integration point

Insert in `landing-page.tsx` after Hero `</section>` and before `#showcase`:

```tsx
<TrustMetricsSection />
```

---

## 5. Suggested Tailwind Implementation

```tsx
<section id="metrics" className="scroll-mt-24 border-y border-border/40 bg-landing-sand/60 py-12 sm:py-16">
  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <p className="text-center text-sm font-semibold uppercase tracking-wider text-primary">
      {t("landing.metrics.eyebrow")}
    </p>
    <div className="mt-8 grid grid-cols-2 gap-8 lg:grid-cols-4">
      {metrics.map((m) => (
        <div key={m.id} className="text-center">
          <p className="text-4xl font-bold tracking-tight text-landing-deep sm:text-5xl">
            {m.prefix}{formatAnimated(m.value)}{m.suffix}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{t(m.labelKey)}</p>
        </div>
      ))}
    </div>
  </div>
</section>
```

**Animation hook sketch:** `useCountUp(target, { duration: 1200, enabled: inView })` with `useInView` from a small hook or native `IntersectionObserver`.

---

## 6. Related Documents

- [PRD.md](./PRD.md) — marketing & AI scope
- [DECISIONS.md](./DECISIONS.md) — D-009
- Implementation: `src/components/landing/landing-page.tsx`, `src/i18n/locales/{en,ar}.json`
