# Demo Seed Data

**Version:** MVP — `travelos-demo-seed-v1`

Idempotent demo business data for validating dashboard KPIs, booking workflows, search, and reporting without manual data entry.

---

## Prerequisites

1. Supabase project with migrations applied (`npm run db:push` or SQL Editor through `010_seed_geography.sql`).
2. `.env.local` with:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
3. A provisioned tenant and admin user:
   ```bash
   npm run admin:create
   ```

The seed uses the **service role** to bypass RLS and upsert tenant-scoped rows safely.

---

## Run the seed

```bash
npm run db:seed
```

Optional — target a different tenant slug:

```bash
TENANT_SLUG=my-agency npm run db:seed
```

The script is **idempotent**: re-running updates the same fixed-UUID records without duplicating data.

---

## What gets created

| Entity | Count | Notes |
|--------|------:|-------|
| Destinations | 3 | Dubai, Istanbul, Paris (`demo-*` slugs) |
| Packages | 5 | All **published**, with itinerary days + adult/child/infant pricing |
| Customers | 10 | 8 individual + 2 corporate; emails `@demo.travelos.local` |
| Travelers | 20 | 2 per customer, linked to customers |
| Bookings | 20 | Mixed statuses: 4 draft, 7 confirmed, 5 completed, 4 cancelled |
| Payments | 10 | Partial and full payments; DB triggers recalculate `payment_status` |
| Knowledge documents | 4 | Policy, FAQ, SOP — FTS chunks for Knowledge/Support agents |

All records include a `[travelos-demo-seed-v1]` marker in `notes` or document metadata where applicable.

---

## Booking status mix

| Status | Count | Payment pattern |
|--------|------:|-----------------|
| draft | 4 | unpaid |
| confirmed | 7 | mix of partial and paid (after payments) |
| completed | 5 | paid (historical trips) |
| cancelled | 4 | mostly unpaid; one with deposit retained |

Each non-draft booking includes **status history** entries (draft → confirmed → completed/cancelled).

---

## Verify after seeding

1. Sign in at `/login` with your admin credentials.
2. **Dashboard** — booking counts by status, revenue, outstanding balance.
3. **Customers** — search `demo.travelos.local`; open a customer show page for contacts/booking history.
4. **Packages** — five published packages with itinerary and pricing tiers.
5. **Bookings** — filter by status; open show pages for travelers and line items.
6. **Payments** — ten payment records linked to bookings.
7. **Knowledge Agent** — ask about cancellation policy or Dubai packages.
8. **Booking Agent** — search published Dubai packages.

See [DemoScript.md](./DemoScript.md) for a full 15-minute walkthrough.

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `Tenant slug "…" not found` | Run `npm run admin:create` first |
| `Country … not found` | Apply migration `010_seed_geography.sql` |
| `Payment exceeds remaining balance` | Re-run seed (upserts recalculate totals) |
| Supabase unreachable | Check `.env.local` URL/key or start local stack: `npx supabase start` |

---

## Implementation

| File | Purpose |
|------|---------|
| `scripts/seed-demo-data.mjs` | Orchestrator (tenant lookup, upserts, verification) |
| `scripts/seed/demo-data.mjs` | Fixed UUIDs and entity definitions |
| `package.json` | `"db:seed"` script |

Demo IDs use deterministic UUIDs (`00000000-{group}-4000-8000-{seq}`) so upserts remain stable across environments.

---

## Resetting demo data

To remove demo data only, delete rows whose IDs match the seed prefix or whose customer emails end with `@demo.travelos.local`. A dedicated reset script is POST-MVP; for now, re-seeding is safe and non-destructive to non-demo rows.
