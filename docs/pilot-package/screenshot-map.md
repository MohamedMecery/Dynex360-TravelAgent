# TravelOS Screenshot Map

**Audience:** Technical writers creating user manuals  
**Purpose:** Every UI screen — route, purpose, role, and whether to capture a screenshot  
**Last verified:** 2026-06-04 against `src/app/**/page.tsx` (83 pages) and `apps/mobile/src/navigation/*`

---

## How to use

| Column | Description |
|--------|-------------|
| **Screen Name** | Title for the manual |
| **Route** | URL (web) or navigation path (mobile); `{id}` = replace with real record ID |
| **Purpose** | What the user does here |
| **User Role** | Who may access |
| **Screenshot Required** | **Yes** = include in pilot manual · **No** = skip (loader, redirect, no UI) |

**Roles:** **Public** · **Staff** (any agency user) · **Tenant Admin** (`tenant_admin`, `super_admin`) · **Sales** (`sales_agent` + admins) · **Finance** (`finance_officer`, read-heavy) · **Customer** (portal account)

**Writer tips:** Capture portal and mobile in **English and Arabic**. Use seeded demo data. Filename example: `crm-quotation-detail-sent.png`.

---

## CRM

Staff CRM under `/crm/*`, Customer 360 under `/customers/show/{id}`, AI assistants at `/ai/sales` and `/ai/operations`, WhatsApp at `/crm/whatsapp/templates`.

| Screen Name | Route | Purpose | User Role | Screenshot Required |
|-------------|-------|---------|-----------|:-------------------:|
| CRM Dashboard | `/crm/dashboard` | Pipeline KPIs, charts, and action lists | Sales, Finance (read), Tenant Admin | Yes |
| Operations Dashboard | `/crm/operations` | Email/WhatsApp/queue metrics and dispatch health | Tenant Admin | Yes |
| Sales Insights | `/crm/sales-insights` | Sales funnel and rep metrics (manager view) | Tenant Admin | Yes |
| Operations Insights | `/crm/operations-insights` | Operations analytics (manager view) | Tenant Admin | Yes |
| Leads List | `/crm/leads` | Search and manage leads | Sales (own), Finance (all read), Tenant Admin | Yes |
| Lead Create | `/crm/leads/create` | Create a new lead | Sales, Tenant Admin | Yes |
| Lead Edit | `/crm/leads/edit/{id}` | Update lead information and status | Sales (own), Tenant Admin | Yes |
| Lead Detail | `/crm/leads/show/{id}` | View lead; convert to customer/opportunity | Sales (own), Finance (read), Tenant Admin | Yes |
| Opportunities List | `/crm/opportunities` | View sales pipeline | Sales, Finance (read), Tenant Admin | Yes |
| Opportunity Create | `/crm/opportunities/create` | Create a deal | Sales, Tenant Admin | Yes |
| Opportunity Edit | `/crm/opportunities/edit/{id}` | Update stage, budget, and dates | Sales (own), Tenant Admin | Yes |
| Opportunity Detail | `/crm/opportunities/show/{id}` | Deal detail; linked quotations; create booking | Sales, Finance (read), Tenant Admin | Yes |
| Activities List | `/crm/activities` | List calls, tasks, meetings, WhatsApp logs | Sales, Finance (read), Tenant Admin | Yes |
| Activity Create | `/crm/activities/create` | Log a new activity | Sales, Tenant Admin | Yes |
| Activity Edit | `/crm/activities/edit/{id}` | Update activity | Sales (own), Tenant Admin | Yes |
| Activity Detail | `/crm/activities/show/{id}` | View activity record | Sales, Finance (read), Tenant Admin | Yes |
| Quotations List | `/crm/quotations` | Browse quotations by status | Sales, Finance (read), Tenant Admin | Yes |
| Quotation Create | `/crm/quotations/create` | Create draft quotation and line items | Sales, Tenant Admin | Yes |
| Quotation Edit | `/crm/quotations/edit/{id}` | Edit quotation before send | Sales (own), Tenant Admin | Yes |
| Quotation Detail | `/crm/quotations/show/{id}` | View quotation; send, approve, accept, convert | Sales, Finance (read), Tenant Admin | Yes |
| Quotation Detail — Send dialog | `/crm/quotations/show/{id}` | Confirm sending quotation to customer | Sales, Tenant Admin | Yes |
| Quotation Detail — Approval | `/crm/quotations/show/{id}` | Submit or approve (standard approval mode) | Sales (submit), Tenant Admin (approve) | Yes |
| Customer 360 — Overview | `/customers/show/{id}` | Customer profile, KPIs, panels | Staff with `customers.read` | Yes |
| Customer 360 — Timeline | `/customers/show/{id}?tab=timeline` | Event timeline | Staff with `customers.read` | Yes |
| Customer 360 — Opportunities | `/customers/show/{id}?tab=opportunities` | Customer opportunities | Sales, Tenant Admin | Yes |
| Customer 360 — Activities | `/customers/show/{id}?tab=activities` | Customer activities | Sales, Tenant Admin | Yes |
| Customer 360 — Bookings | `/customers/show/{id}?tab=bookings` | Customer bookings | Staff with `bookings.read` | Yes |
| Customer 360 — Invoices | `/customers/show/{id}?tab=invoices` | Customer invoices | Staff with invoice access | Yes |
| Customer 360 — Payments | `/customers/show/{id}?tab=payments` | Payments and gateway history | Finance, Tenant Admin, Sales (read) | Yes |
| Customer 360 — Tickets | `/customers/show/{id}?tab=tickets` | Support tickets | Staff with support access | Yes |
| Customer 360 — Revenue | `/customers/show/{id}?tab=revenue` | Revenue summary | Finance, Tenant Admin | Yes |
| Customer 360 — WhatsApp & comms | `/customers/show/{id}` (overview) | Opt-in, preferences, message history | Sales, Tenant Admin | Yes |
| Customer 360 — Sales Assistant | `/customers/show/{id}` (overview) | Embedded sales AI panel | Sales, Tenant Admin | Yes |
| Customer 360 — Operations strip | `/customers/show/{id}` (overview) | Operations readiness strip | Sales, Tenant Admin | Yes |
| WhatsApp Templates | `/crm/whatsapp/templates` | Manage Meta template registry | Tenant Admin | Yes |
| Sales Assistant | `/ai/sales` | Full-page sales AI chat | Sales, Tenant Admin | Yes |
| Operations Assistant | `/ai/operations` | Full-page operations AI chat | Sales, Tenant Admin | Yes |

---

## Portal

Customer self-service under `/portal/*` (separate auth from staff).

| Screen Name | Route | Purpose | User Role | Screenshot Required |
|-------------|-------|---------|-----------|:-------------------:|
| Portal Login | `/portal/login` | Customer authentication | Public, Customer | Yes |
| Portal Forgot Password | `/portal/forgot-password` | Request reset link | Public | Yes |
| Portal Reset Password | `/portal/reset-password` | Set new password | Public, Customer | Yes |
| Portal Dashboard | `/portal` | Home summary (quotations, bookings) | Customer | Yes |
| Portal Quotations List | `/portal/quotations` | List proposals visible to customer | Customer | Yes |
| Portal Quotation Detail | `/portal/quotations/{id}` | Review quote; PDF; accept/reject; pay | Customer | Yes |
| Portal Quotation — Accepted state | `/portal/quotations/{id}` | After accept (shows Pay Now if enabled) | Customer | Yes |
| Portal Quotation — Reject dialog | `/portal/quotations/{id}` | Reject with optional reason | Customer | Yes |
| Portal Payment Status | `/portal/payment-orders/{id}` | Payment/checkout outcome | Customer | Yes |
| Portal Bookings List | `/portal/bookings` | List customer bookings | Customer | Yes |
| Portal Booking Detail | `/portal/bookings/{id}` | Booking detail and documents | Customer | Yes |
| Portal Notifications | `/portal/notifications` | Notification inbox | Customer | Yes |
| Portal Profile | `/portal/profile` | Account details | Customer | Yes |
| Portal Preferences | `/portal/preferences` | WhatsApp opt-in, language, quiet hours | Customer | Yes |

---

## Mobile

Expo staff app (`apps/mobile`). Routes are **navigation paths**; deep links: `travelos://login`, `travelos://home`.

| Screen Name | Route | Purpose | User Role | Screenshot Required |
|-------------|-------|---------|-----------|:-------------------:|
| Bootstrap (loader) | `Bootstrap` | Session check before main app | Staff | No |
| Login | `Login` | Staff sign-in | Staff | Yes |
| Dashboard | `Main → Home → Dashboard` | CRM home KPIs | Sales, Tenant Admin | Yes |
| Leads List | `Main → Leads → LeadList` | Browse leads | Sales, Tenant Admin | Yes |
| Lead Detail | `Main → Leads → LeadDetail/{id}` | View lead | Sales, Tenant Admin | Yes |
| Lead Create | `Main → Leads → LeadCreate` | Create lead | Sales, Tenant Admin | Yes |
| Lead Edit | `Main → Leads → LeadEdit/{id}` | Edit lead | Sales, Tenant Admin | Yes |
| Opportunity List | `Main → Pipeline → OpportunityList` | Pipeline list | Sales, Tenant Admin | Yes |
| Opportunity Detail | `Main → Pipeline → OpportunityDetail/{id}` | View opportunity | Sales, Tenant Admin | Yes |
| Opportunity Create | `Main → Pipeline → OpportunityCreate` | Create opportunity | Sales, Tenant Admin | Yes |
| Opportunity Edit | `Main → Pipeline → OpportunityEdit/{id}` | Edit opportunity | Sales, Tenant Admin | Yes |
| Activity List | `Main → Activities → ActivityList` | Browse activities | Sales, Tenant Admin | Yes |
| Activity Detail | `Main → Activities → ActivityDetail/{id}` | View activity | Sales, Tenant Admin | Yes |
| Activity Create | `Main → Activities → ActivityCreate` | Create activity | Sales, Tenant Admin | Yes |
| Activity Edit | `Main → Activities → ActivityEdit/{id}` | Edit activity | Sales, Tenant Admin | Yes |
| More Menu | `Main → More → MoreMenu` | Secondary navigation hub | Staff | Yes |
| Profile | `Main → More → Profile` | User profile | Staff | Yes |
| Quotation List | `Main → More → QuotationList` | Browse quotations | Sales, Tenant Admin | Yes |
| Quotation Detail | `Main → More → QuotationDetail/{id}` | Quotation detail and actions | Sales, Tenant Admin | Yes |
| Quotation Create | `Main → More → QuotationCreate` | Create quotation | Sales, Tenant Admin | Yes |
| Quotation Edit | `Main → More → QuotationEdit/{id}` | Edit quotation | Sales, Tenant Admin | Yes |
| Booking List | `Main → More → BookingList` | Bookings with health badges | Sales, Tenant Admin | Yes |
| Booking Detail | `Main → More → BookingDetail/{id}` | Booking detail | Sales, Tenant Admin | Yes |
| Customer 360 | `Main → More → Customer360/{id}` | Customer summary | Sales, Tenant Admin | Yes |
| Customer Timeline | `Main → More → CustomerTimeline/{id}` | Timeline view | Sales, Tenant Admin | Yes |
| Arabic RTL layout | `Main` (any tab, locale AR) | RTL verification | Staff | Yes |

---

## Admin

Staff **Revenue** and **platform** modules: `/dashboard`, `/customers`, `/bookings`, `/packages`, `/payments`, `/users`, `/settings`, `/ai/*` (except sales/ops full-page assistants listed under CRM), plus auth and marketing.

### Authentication and marketing

| Screen Name | Route | Purpose | User Role | Screenshot Required |
|-------------|-------|---------|-----------|:-------------------:|
| Root landing | `/` | Marketing; redirects logged-in staff to dashboard | Public | No |
| Marketing home | `/home` | Public marketing page | Public | Yes |
| Staff login | `/login` | Agency user login | Public, Staff | Yes |
| Staff forgot password | `/forgot-password` | Password reset request | Public | Yes |
| Staff reset password | `/reset-password` | Complete password reset | Public, Staff | Yes |
| Staff onboarding | `/onboarding` | Complete invite / first login | Staff (pending) | Yes |
| Auth callback | `/auth/callback` | Server auth redirect (no screen) | System | No |

### Dashboard and notifications

| Screen Name | Route | Purpose | User Role | Screenshot Required |
|-------------|-------|---------|-----------|:-------------------:|
| Main dashboard | `/dashboard` | Revenue/booking KPIs (MVP) | Staff | Yes |
| Staff notifications | `/notifications` | In-app notification inbox | Staff | Yes |

### Customers and catalog

| Screen Name | Route | Purpose | User Role | Screenshot Required |
|-------------|-------|---------|-----------|:-------------------:|
| Customers list | `/customers` | Browse customers | Staff with `customers.read` | Yes |
| Customer create | `/customers/create` | Add customer | Sales, Tenant Admin | Yes |
| Customer edit | `/customers/edit/{id}` | Edit customer fields | Sales, Tenant Admin | Yes |
| Customer detail (360 entry) | `/customers/show/{id}` | Opens Customer 360 — see **CRM** section for tab screenshots | Staff with `customers.read` | Yes |
| Travelers list | `/travelers` | Manage travelers | Sales, Tenant Admin | Yes |
| Traveler create | `/travelers/create` | Add traveler | Sales, Tenant Admin | Yes |
| Traveler edit | `/travelers/edit/{id}` | Edit traveler | Sales, Tenant Admin | Yes |
| Traveler detail | `/travelers/show/{id}` | View traveler | Staff with read access | Yes |
| Destinations list | `/destinations` | Manage destinations | Sales, Tenant Admin | Yes |
| Destination create | `/destinations/create` | Add destination | Sales, Tenant Admin | Yes |
| Destination edit | `/destinations/edit/{id}` | Edit destination | Sales, Tenant Admin | Yes |
| Destination detail | `/destinations/show/{id}` | View destination | Staff with read access | Yes |
| Packages list | `/packages` | Browse packages | Staff with `packages.read` | Yes |
| Package create | `/packages/create` | Create package | Sales, Tenant Admin | Yes |
| Package edit | `/packages/edit/{id}` | Edit package and itinerary | Sales, Tenant Admin | Yes |
| Package detail | `/packages/show/{id}` | View/publish package | Staff with read access | Yes |

### Bookings

| Screen Name | Route | Purpose | User Role | Screenshot Required |
|-------------|-------|---------|-----------|:-------------------:|
| Bookings list | `/bookings` | Browse bookings | Staff with `bookings.read` | Yes |
| Booking create | `/bookings/create` | Create booking | Sales, Tenant Admin | Yes |
| Booking edit | `/bookings/edit/{id}` | Edit booking | Sales, Tenant Admin | Yes |
| Booking detail | `/bookings/show/{id}` | Travelers, items, status, documents | Staff with `bookings.read` | Yes |
| Booking detail — Ops AI panel | `/bookings/show/{id}` | Operations assistant on booking | Sales, Tenant Admin | Yes |

### Finance

| Screen Name | Route | Purpose | User Role | Screenshot Required |
|-------------|-------|---------|-----------|:-------------------:|
| Invoices list | `/invoices` | Browse invoices | Finance, Tenant Admin, Sales (read) | Yes |
| Invoice create | `/invoices/create` | Create invoice | Finance, Tenant Admin | Yes |
| Invoice edit | `/invoices/edit/{id}` | Edit invoice | Finance, Tenant Admin | Yes |
| Invoice detail | `/invoices/show/{id}` | View invoice / PDF | Staff with invoice read | Yes |
| Payments list | `/payments` | Browse ledger payments | Finance, Tenant Admin, Sales (read) | Yes |
| Payment create | `/payments/create` | Record manual payment | Finance, Tenant Admin | Yes |
| Payment detail | `/payments/show/{id}` | View payment | Finance, Tenant Admin, Sales (read) | Yes |

### Users, settings, audit

| Screen Name | Route | Purpose | User Role | Screenshot Required |
|-------------|-------|---------|-----------|:-------------------:|
| Users list | `/users` | Agency user list | Tenant Admin | Yes |
| User invite | `/users/create` | Invite user and assign role | Tenant Admin | Yes |
| User detail | `/users/show/{id}` | View user | Tenant Admin | Yes |
| Settings hub | `/settings` | Settings navigation | Tenant Admin | Yes |
| Knowledge documents | `/settings/knowledge` | Manage AI knowledge base files | Tenant Admin | Yes |
| Audit log | `/audit-logs` | Tenant audit history | Tenant Admin, super_admin | Yes |

### AI platform (admin navigation)

| Screen Name | Route | Purpose | User Role | Screenshot Required |
|-------------|-------|---------|-----------|:-------------------:|
| Knowledge agent | `/ai/knowledge` | Internal Q&A chat | Staff (`ai.knowledge.use`) | Yes |
| Booking agent | `/ai/booking` | Draft booking via chat | Sales, Tenant Admin | Yes |
| Support agent | `/ai/support` | Support chat and tickets | Staff (`ai.support.use`) | Yes |
| Support tickets list | `/ai/support/tickets` | Ticket inbox | Staff with support access | Yes |
| Support ticket detail | `/ai/support/tickets/show/{id}` | Ticket conversation | Staff with support access | Yes |
| AI history | `/ai/history` | Past AI conversations | Staff (`ai.read`) | Yes |
| AI analytics | `/ai/analytics` | Usage metrics | Tenant Admin | Yes |

---

## Summary

| Section | Screens listed | Screenshot Yes | Screenshot No |
|---------|:--------------:|:--------------:|:-------------:|
| CRM | 37 | 37 | 0 |
| Portal | 14 | 14 | 0 |
| Mobile | 26 | 24 | 2 |
| Admin | 48 | 45 | 3 |
| **Total** | **125** | **120** | **5** |

**No screenshot:** `/`, `/auth/callback`, mobile `Bootstrap` (and optional: capture `/home` only once if `/` is identical marketing).

---

## Appendix — Web `page.tsx` route index

Every Next.js page file mapped to manual section (for verification).

| `page.tsx` path | Section |
|-----------------|---------|
| `crm/dashboard` | CRM |
| `crm/operations` | CRM |
| `crm/sales-insights` | CRM |
| `crm/operations-insights` | CRM |
| `crm/leads`, `create`, `edit/[id]`, `show/[id]` | CRM |
| `crm/opportunities`, `create`, `edit/[id]`, `show/[id]` | CRM |
| `crm/activities`, `create`, `edit/[id]`, `show/[id]` | CRM |
| `crm/quotations`, `create`, `edit/[id]`, `show/[id]` | CRM |
| `crm/whatsapp/templates` | CRM |
| `customers/show/[id]` | CRM (360) + Admin (entry) |
| `ai/sales`, `ai/operations` | CRM |
| `portal/login`, `forgot-password`, `reset-password` | Portal |
| `portal/page` | Portal |
| `portal/quotations`, `quotations/[id]` | Portal |
| `portal/payment-orders/[id]` | Portal |
| `portal/bookings`, `bookings/[id]` | Portal |
| `portal/notifications`, `profile`, `preferences` | Portal |
| `page.tsx` (root), `home` | Admin |
| `login`, `forgot-password`, `reset-password`, `onboarding` | Admin |
| `dashboard`, `notifications` | Admin |
| `customers`, `create`, `edit/[id]` | Admin |
| `travelers`, `create`, `edit/[id]`, `show/[id]` | Admin |
| `destinations`, `create`, `edit/[id]`, `show/[id]` | Admin |
| `packages`, `create`, `edit/[id]`, `show/[id]` | Admin |
| `bookings`, `create`, `edit/[id]`, `show/[id]` | Admin |
| `invoices`, `create`, `edit/[id]`, `show/[id]` | Admin |
| `payments`, `create`, `show/[id]` | Admin |
| `users`, `create`, `show/[id]` | Admin |
| `settings`, `settings/knowledge` | Admin |
| `audit-logs` | Admin |
| `ai/knowledge`, `ai/booking`, `ai/support` | Admin |
| `ai/support/tickets`, `show/[id]` | Admin |
| `ai/history`, `ai/analytics` | Admin |

---

## Related documents

- [02-user-roles.md](./02-user-roles.md)
- [08-mobile-module.md](./08-mobile-module.md)
- [04-portal-module.md](./04-portal-module.md)
- [03-crm-module.md](./03-crm-module.md)
