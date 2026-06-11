# CRM Sprint 6 Phase 2 — Quotations Implementation Summary

**Status:** Code complete (035 + 036 + app layer). **Apply migrations on staging** before QA.

**Design reference:** [CRM-Sprint6-Phase2-Quotation-Design-Review.md](./CRM-Sprint6-Phase2-Quotation-Design-Review.md)

---

## 1. Code Summary

### Database (035 → 036)

| Migration | Purpose |
|-----------|---------|
| `035_quotations.sql` | Enums, `quotations`, `quotation_items`, `bookings.quotation_id`, tenant quotation settings, numbering, totals triggers, `uq_booking_quotation`, one active accept per opportunity |
| `036_quotation_rls_permissions.sql` | RLS policies, 8 CRM permissions, role grants, `v_customer_timeline_events` quotation UNIONs |

### Application layer

| Area | Files |
|------|-------|
| Types | `src/types/index.ts` — `Quotation`, `QuotationItem`, status enums |
| Lifecycle | `src/lib/crm/quotation-lifecycle.ts` — simple / standard transitions |
| Validation | `src/lib/validation/quotation.ts` — Zod schemas |
| Service | `src/lib/crm/quotations-service.ts` — CRUD, items, workflow, convert, opportunity → `verbal_approval` on accept |
| RBAC | `src/lib/auth/crm-rbac.ts`, `src/providers/access-control-provider.ts` |
| API client | `src/lib/crm/quotations-api-client.ts` |
| API routes | `src/app/api/quotations/**` |
| UI | `/crm/quotations` list, create, show, edit; `QuotationWorkflowActions`; opportunity integration |
| Timeline | `src/lib/crm/timeline-events.ts`, `036` view, `crm-timeline.tsx` links |
| i18n | `messages/en.json`, `messages/ar.json` |
| Tests | `scripts/test-crm-rls.mjs` extended to 035–036 |

### Explicitly not implemented (per authorization)

PDF, email engine, public links, customer portal acceptance, e-signatures, WhatsApp sending, multi-currency, additional approval hierarchy.

---

## 2. DB Changes

### New enums

- `quotation_status`, `quotation_item_type`, `quotation_approval_mode`

### New tables

- **`quotations`** — tenant-scoped, linked to `opportunities`, optional `customer_id`, monetary totals, lifecycle timestamps, `booking_id`, soft delete, audit columns
- **`quotation_items`** — line items with `item_type`, qty, unit price, auto `line_total`

### Altered tables

- **`bookings`** — `quotation_id UUID` + **`uq_booking_quotation`** (partial unique index, one booking per quotation)
- **`tenant_settings`** — `quotation_approval_mode`, `quotation_default_valid_days`, `quotation_terms_default`

### Functions / triggers

- `generate_quotation_number()` — `QT-YYYY-######`
- `recalculate_quotation_totals()` + item trigger
- Audit / `updated_at` triggers on quotations and items

### Constraints

```sql
CREATE UNIQUE INDEX uq_booking_quotation
ON bookings(quotation_id)
WHERE quotation_id IS NOT NULL;

CREATE UNIQUE INDEX uq_quotations_one_active_accept
ON quotations(opportunity_id)
WHERE deleted_at IS NULL
  AND status IN ('accepted', 'converted_to_booking');
```

### Customer 360

`v_customer_timeline_events` extended with: `quotation_created`, `quotation_sent`, `quotation_viewed`, `quotation_accepted`, `quotation_rejected`, `quotation_converted`.

---

## 3. Permission Matrix

| Permission | super_admin | tenant_admin | sales_agent | finance_officer |
|------------|:-----------:|:------------:|:-----------:|:---------------:|
| `quotations.read` | ✓ | ✓ | ✓ | — |
| `quotations.read_all` | ✓ | ✓ | — | ✓ |
| `quotations.write` | ✓ | ✓ | ✓ | — |
| `quotations.write_all` | ✓ | ✓ | — | — |
| `quotations.approve` | ✓ | ✓ | — | — |
| `quotations.send` | ✓ | ✓ | ✓ | — |
| `quotations.accept` | ✓ | ✓ | ✓ | — |
| `quotations.convert` | ✓ | ✓ | ✓ | — |

**Notes:**

- No `sales_manager` role in MVP.
- `quotations.convert` is separate from write (approved design).
- RLS uses `crm_can_read_row` / `crm_can_write_row` with `quotations.read_all` / `quotations.write_all`.
- Finance officer: read-only quotations (`read_all` only).

---

## 4. API Endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/quotations` | `crm.quotations.read` | List (filters: opportunity_id, customer_id, status, owner_id) |
| POST | `/api/quotations` | `crm.quotations.write` | Create with optional items |
| GET | `/api/quotations/:id` | `crm.quotations.read` | Detail + items |
| PATCH | `/api/quotations/:id` | `crm.quotations.write` | Update draft / pending_approval |
| DELETE | `/api/quotations/:id` | `crm.quotations.write` | Soft-delete draft / rejected / expired |
| POST | `/api/quotations/:id/send` | `crm.quotations.send` | Send (simple: draft→sent; standard: approved→sent) |
| POST | `/api/quotations/:id/submit-approval` | `crm.quotations.write` | draft→pending_approval (standard mode) |
| POST | `/api/quotations/:id/approve` | `crm.quotations.approve` | pending_approval→approved |
| POST | `/api/quotations/:id/reject-approval` | `crm.quotations.approve` | pending_approval→draft |
| POST | `/api/quotations/:id/mark-viewed` | `crm.quotations.write` | sent→viewed (manual only) |
| POST | `/api/quotations/:id/accept` | `crm.quotations.accept` | sent/viewed→accepted; opportunity→`verbal_approval` |
| POST | `/api/quotations/:id/reject` | `crm.quotations.write` | sent/viewed→rejected |
| POST | `/api/quotations/:id/convert` | `crm.quotations.convert` | accepted→booking; status `converted_to_booking` |
| POST | `/api/quotations/:id/items` | `crm.quotations.write` | Add line item |
| PATCH | `/api/quotations/:id/items/:itemId` | `crm.quotations.write` | Update line item |
| DELETE | `/api/quotations/:id/items/:itemId` | `crm.quotations.write` | Remove line item |

---

## 5. QA Checklist

### Migrations

- [ ] Apply `035_quotations.sql` then `036_quotation_rls_permissions.sql` on staging (SQL Editor or Supabase MCP `apply_migration`)
- [ ] Run `npm run test:crm-rls` with live env (`CRM_REQUIRE_LIVE=1` optional)

### CRUD

- [ ] Sales agent creates quotation from opportunity (with line items)
- [ ] Totals recalculate when items change
- [ ] Edit draft / pending_approval; locked after sent

### Simple mode (`quotation_approval_mode = simple`)

- [ ] draft → send → sent
- [ ] sent → mark viewed → viewed
- [ ] viewed → accept → opportunity stage `verbal_approval`
- [ ] accept → convert → draft booking; `uq_booking_quotation` blocks second conversion

### Standard mode

- [ ] draft → submit approval → pending_approval
- [ ] approve → approved → send → sent
- [ ] reject approval → returns to **draft**
- [ ] Tenant admin can approve; sales agent cannot

### RBAC

- [ ] Sales agent: own quotations read/write; cannot use `read_all`
- [ ] Finance officer: read all; no convert/send/write
- [ ] Cross-tenant access denied (RLS)

### Customer 360

- [ ] Timeline shows quotation events for customer-linked quotations
- [ ] Links open `/crm/quotations/show/:id`

### Regression

- [ ] Opportunity booking from stage still works
- [ ] CRM dashboard RPC unaffected

---

## 6. RLS Validation

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `quotations` | tenant + `crm_can_read_row(owner, read_all)` | tenant + write permission | owner write or write_all | same as update |
| `quotation_items` | tenant + parent quotation read access | parent write access | parent write access | parent write access |

**Validate with:**

```bash
npm run test:crm-rls
# With credentials:
CRM_REQUIRE_LIVE=1 npm run test:crm-rls
```

Manual: two sales agents in same tenant — agent A must not update agent B's quotation without `write_all`.

---

## 7. Performance Notes

- Indexes: `(tenant_id, status)`, `(tenant_id, owner_id)`, `(tenant_id, opportunity_id)`, `(tenant_id, customer_id)` on `quotations`; `(quotation_id)` on items.
- Totals via trigger on item changes — avoid N+1 recalc in app code.
- List API paginated (default 20); Refine list uses pageSize 50.
- Customer 360 view uses UNION — monitor row count per customer; existing timeline limits apply.
- Partial unique indexes are lightweight for convert and one-accept rules.

---

## 8. Risks

| Risk | Mitigation |
|------|------------|
| Migrations not applied on staging | Apply 035→036 before UAT; `test-crm-rls` warns when tables missing |
| `db:push` history mismatch (timestamped remote migrations) | Use SQL Editor or MCP per-file apply |
| Simple vs standard mode confusion in UI | API returns clear error codes (`APPROVAL_MODE_SIMPLE`, `QUOTATION_TRANSITION_INVALID`) |
| Accept without customer blocks convert | UI message `quotations.customerRequired`; link customer on opportunity first |
| Second accept on same opportunity | DB `uq_quotations_one_active_accept` |
| Duplicate booking from same quotation | `uq_booking_quotation` |

---

## 9. Open Items

| Item | Priority |
|------|----------|
| Apply 035/036 to staging/production | P0 |
| Item edit UI on quotation show (draft only) — API exists; show page is read-only for lines | P2 |
| Tenant settings UI for `quotation_approval_mode` / default validity | P2 |
| POST-MVP: PDF, email, public link, portal accept, e-sign, WhatsApp send | Backlog |
| POST-MVP: multi-currency beyond single `currency` column | Backlog |
| Arabic `activities.eventType.*` for quotation events (English added) | P3 |

---

## Apply migrations

```bash
# Copy to supabase folder if needed
npm run db:sync

# Prefer SQL Editor when db:push fails:
#   database/migrations/035_quotations.sql
#   database/migrations/036_quotation_rls_permissions.sql
```
