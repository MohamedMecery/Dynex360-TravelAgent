# TravelOS MVP — 15-Minute Demo Script

**Version:** `travelos-demo-seed-v1`  
**Prerequisites:** `npm run admin:create` → `npm run db:push` → `npm run db:seed`  
**Login:** Tenant admin from `admin:create` (default slug `dynex360-travel`)  
**Full guide:** [AI-Agents-Guide.md](./AI-Agents-Guide.md) — detailed use & test steps for all three agents  
**Production pilot:** [Production-Deploy-Checklist.md](./Production-Deploy-Checklist.md) — Vercel, Supabase Auth, SMTP

---

## Setup (before the meeting — 2 min)

```bash
npm run admin:create
npm run db:push
npm run db:seed
npm run dev
```

Sign in at `/login`. Confirm `/dashboard` shows non-zero booking status cards and revenue (tenant admin / finance role).

---

## 1. Customers (2 min)

| Step | Action | Talking point |
|------|--------|---------------|
| 1.1 | Go to **Customers** | CRM for individuals and corporate accounts |
| 1.2 | Search `demo.travelos.local` | Ten demo customers seeded |
| 1.3 | Open **Sarah Johnson** (or any individual) | Profile with contact details |
| 1.4 | Open **Atlas Corp Travel** (corporate) | B2B account pattern |

---

## 2. Packages (2 min)

| Step | Action | Talking point |
|------|--------|---------------|
| 2.1 | Go to **Packages** | Published catalog ready for sales |
| 2.2 | Open **Dubai Desert & City Escape** | Itinerary days + adult/child/infant pricing |
| 2.3 | Note status **Published** | Only published packages are bookable |
| 2.4 | Mention **Istanbul & Cappadocia Combo** | Multi-destination upsell |

---

## 3. Bookings (3 min)

| Step | Action | Talking point |
|------|--------|---------------|
| 3.1 | Go to **Bookings** | Full lifecycle: draft → confirmed → completed / cancelled |
| 3.2 | Filter **Draft** | Four draft bookings (e.g. DEMO-BK-001) |
| 3.3 | Open a **Confirmed** booking | Travelers, line items, status history |
| 3.4 | Click **Confirm** on a draft (optional live) | Human-in-the-loop workflow |
| 3.5 | Open a **Cancelled** booking | Cancel from details; no new payments |

**Seeded mix:** 4 draft · 7 confirmed · 5 completed · 4 cancelled

---

## 4. Invoices (1 min)

| Step | Action | Talking point |
|------|--------|---------------|
| 4.1 | Go to **Invoices → Create** | Billing header per booking (D-005: multiple invoices allowed) |
| 4.2 | Select a confirmed booking (e.g. `DEMO-BK-005`) | Subtotal prefilled from **booking line items** |
| 4.3 | Add tax if needed; save as **draft** or **issued** | No `invoice_items` in MVP — lines stay on the booking |

---

## 5. Payments (2 min)

| Step | Action | Talking point |
|------|--------|---------------|
| 5.1 | Go to **Payments** | Ten demo payments linked to bookings |
| 5.2 | Open a booking with **Partial** payment status | Deposit + balance pattern |
| 5.3 | Open a **Paid** completed booking | Full settlement |
| 5.4 | Try **Record Payment** on cancelled booking | Blocked in UI and database (BR-009) |

---

## 6. Dashboard (2 min)

| Step | Action | Talking point |
|------|--------|---------------|
| 6.1 | Go to **Dashboard** | Operations command center |
| 6.2 | Point to status cards | Draft / confirmed / completed / cancelled counts |
| 6.3 | Show **Total revenue** & **Outstanding** | Finance visibility (admin / finance role) |
| 6.4 | Scroll **Recent bookings** | Live pipeline view |

---

## 7. Knowledge Agent (2 min)

| Step | Action | Talking point |
|------|--------|---------------|
| 7.1 | Open **Knowledge Agent** | Internal Q&A over tenant documents |
| 7.2 | Ask: *What is the cancellation policy for confirmed bookings?* | Citations from seeded policy doc |
| 7.3 | Ask: *Tell me about Dubai packages* | FAQ / package knowledge |
| 7.4 | Click 👍 on the answer | Feedback recorded (`ai_feedback`) |
| 7.5 | Optional: **Settings → Knowledge Base** | Four demo documents indexed for FTS |

---

## 8. Support Agent (1 min)

| Step | Action | Talking point |
|------|--------|---------------|
| 8.1 | Open **Support Agent** | FAQ + booking context |
| 8.2 | Ask: *What is booking DEMO-BK-005 status?* | Lookup by reference |
| 8.3 | Enable **Create ticket** if unresolved | Ticket routed to `/ai/support/tickets` |
| 8.4 | Open ticket → assign or escalate | Status + assignee updated in UI |

---

## 9. Booking Agent (1 min)

| Step | Action | Talking point |
|------|--------|---------------|
| 9.1 | Open **Booking Agent** | AI-assisted sales, human confirms |
| 9.2 | Ask: *Show Dubai packages under $1500* | Published package recommendations |
| 9.3 | Describe a family trip → **draft booking** | Draft only — staff confirms in Bookings UI |
| 9.4 | Emphasize | Agent never auto-confirms |

---

## Closing (30 sec)

TravelOS delivers multi-tenant CRM, packages, bookings, payments, dashboard KPIs, and three AI agents on one stack — with tenant isolation and audit-friendly status history.

**Reset demo data:** `npm run db:seed` (idempotent).
