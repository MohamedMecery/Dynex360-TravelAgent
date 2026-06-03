# TravelOS Database Design

**Version:** 2.0 — Expanded MVP
**Engine:** PostgreSQL 15 (Supabase)
**Last Updated:** 2026-06-02
**Status:** MVP schema in migration; AI tables recommended for Phase 5 (no migrations yet)

---

## 1. Design Principles

| Principle | Implementation |
|-----------|----------------|
| UUID primary keys | `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| Multi-tenancy | `tenant_id UUID NOT NULL REFERENCES tenants(id)` on all tenant tables + RLS |
| Soft delete | `deleted_at TIMESTAMPTZ NULL`; active rows filtered via `deleted_at IS NULL` |
| Audit columns | `created_by`, `updated_by` → `users(id)`; `created_at`, `updated_at` timestamptz |
| Row Level Security | Enabled on every table; tenant isolation via JWT `tenant_id` claim |
| Created/Modified by | `created_by` / `updated_by` populated by application + verified by trigger |
| Referential integrity | Explicit FKs; `ON DELETE CASCADE` for owned children, `SET NULL` for audit FKs |
| Normalization | 3NF; lookups extracted to reference tables |

### 1.1 Global vs Tenant tables

- **Global (no tenant_id, no soft delete, no audit):** `roles`, `permissions`, `role_permissions`, `countries`, `cities`.
- **Tenant-scoped:** all others.

### 1.2 Enum Types

```sql
tenant_status        : active | suspended | inactive
user_status          : active | inactive | pending
customer_type        : individual | corporate
address_type         : billing | mailing | other
traveler_gender      : male | female | other | unspecified   -- new
destination_status   : active | inactive                     -- new
package_status       : draft | published | archived
pricing_tier         : adult | child | infant
booking_status       : draft | confirmed | completed | cancelled
payment_status       : unpaid | partial | paid
invoice_status       : draft | issued | partially_paid | paid | cancelled | void  -- new
payment_method       : cash | bank_transfer | card | other
transaction_type     : payment | refund | adjustment
audit_action         : INSERT | UPDATE | DELETE
```

---

## 2. Apply / Dependency Order (migration files)

```
001_core           : enums (tenant/user) + tenants, tenant_settings, users,
                     roles, permissions, role_permissions, user_roles
002_master_data    : enum (destination_status) + countries, cities, destinations
003_customers_packages : enums (customer/address/traveler/package/pricing) +
                     customers, customer_contacts, customer_addresses, travelers,
                     packages, package_days, package_day_activities,
                     package_pricing, package_media
004_bookings_finance : enums (booking/payment/invoice/transaction) +
                     bookings, booking_items, booking_travelers,
                     booking_status_history, booking_notes, booking_documents,
                     invoices, payments, payment_transactions
005_supporting     : enum (audit_action) + notifications, audit_logs
006_rls_policies   : helper functions + RLS enablement + policies
007_functions_triggers : triggers & business functions
008_seed_reference : roles, permissions, role_permissions seed data
```

---

## 3. Table Specifications

Legend: **PK** = primary key, **FK** = foreign key, **UK** = unique, **NN** = not null.

---

### 3.1 `tenants` — Core

**Purpose:** Root organization record; anchor for tenant isolation.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, default gen_random_uuid() |
| name | VARCHAR(150) | NN |
| slug | VARCHAR(60) | NN, UK |
| status | tenant_status | NN, default 'active' |
| created_at | TIMESTAMPTZ | NN, default now() |
| updated_at | TIMESTAMPTZ | NN, default now() |

**Indexes:** PK(id); UNIQUE(slug).

---

### 3.2 `tenant_settings` — Support

**Purpose:** Per-tenant configuration (currency, timezone, locale).

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| tenant_id | UUID | NN, FK → tenants(id) ON DELETE CASCADE, UK |
| default_currency | CHAR(3) | NN, default 'USD' |
| timezone | VARCHAR(50) | NN, default 'UTC' |
| locale | VARCHAR(10) | NN, default 'en' |
| created_at / updated_at | TIMESTAMPTZ | NN, default now() |

**Indexes:** PK(id); UNIQUE(tenant_id).

---

### 3.3 `users` — Core

**Purpose:** Staff account; mirrors Supabase `auth.users` (same UUID).

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK (equals auth.users.id) |
| tenant_id | UUID | FK → tenants(id) ON DELETE CASCADE (NULL only for platform super_admin) |
| email | VARCHAR(255) | NN, UK |
| full_name | VARCHAR(150) | |
| status | user_status | NN, default 'pending' |
| created_at / updated_at | TIMESTAMPTZ | NN, default now() |

**Constraints:** UNIQUE(email).
**Indexes:** PK(id); idx(tenant_id); UNIQUE(email).

---

### 3.4 `roles` — Lookup (Global)

**Purpose:** Named role grouping a set of permissions.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| name | VARCHAR(50) | NN, UK |
| description | VARCHAR(255) | |
| is_system | BOOLEAN | NN, default false |
| created_at | TIMESTAMPTZ | NN, default now() |

**Indexes:** PK(id); UNIQUE(name).

---

### 3.5 `permissions` — Lookup (Global)

**Purpose:** Discrete capability expressed as `module.action`.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| module | VARCHAR(50) | NN |
| action | VARCHAR(50) | NN |
| description | VARCHAR(255) | |

**Constraints:** UNIQUE(module, action).
**Indexes:** PK(id); UNIQUE(module, action).

---

### 3.6 `role_permissions` — Junction (Global)

**Purpose:** Many-to-many between roles and permissions.

| Column | Type | Constraints |
|--------|------|-------------|
| role_id | UUID | NN, FK → roles(id) ON DELETE CASCADE |
| permission_id | UUID | NN, FK → permissions(id) ON DELETE CASCADE |

**Constraints:** PK(role_id, permission_id).
**Indexes:** PK composite; idx(permission_id).

---

### 3.7 `user_roles` — Junction (Tenant-scoped)

**Purpose:** Assigns a role to a user within a tenant.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | NN, FK → users(id) ON DELETE CASCADE |
| role_id | UUID | NN, FK → roles(id) ON DELETE CASCADE |
| tenant_id | UUID | NN, FK → tenants(id) ON DELETE CASCADE |
| created_at | TIMESTAMPTZ | NN, default now() |

**Constraints:** UNIQUE(user_id, tenant_id) — one role per user per tenant.
**Indexes:** PK(id); idx(user_id); idx(role_id); idx(tenant_id).

---

### 3.8 `countries` — Lookup (Global)

**Purpose:** ISO 3166 country reference for nationalities, destinations, currencies.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| iso2 | CHAR(2) | NN, UK (ISO 3166-1 alpha-2) |
| iso3 | CHAR(3) | UK (ISO 3166-1 alpha-3) |
| name | VARCHAR(100) | NN |
| phone_code | VARCHAR(10) | |
| currency_code | CHAR(3) | |
| is_active | BOOLEAN | NN, default true |
| created_at / updated_at | TIMESTAMPTZ | NN, default now() |

**Constraints:** UNIQUE(iso2), UNIQUE(iso3).
**Indexes:** PK(id); UNIQUE(iso2); UNIQUE(iso3); idx(name).

---

### 3.9 `cities` — Lookup (Global)

**Purpose:** Cities tied to countries; basis for destinations and addresses.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| country_id | UUID | NN, FK → countries(id) ON DELETE CASCADE |
| name | VARCHAR(150) | NN |
| state_region | VARCHAR(150) | |
| latitude | DECIMAL(9,6) | |
| longitude | DECIMAL(9,6) | |
| is_active | BOOLEAN | NN, default true |
| created_at / updated_at | TIMESTAMPTZ | NN, default now() |

**Constraints:** UNIQUE(country_id, name, state_region).
**Indexes:** PK(id); idx(country_id); idx(country_id, name).

---

### 3.10 `destinations` — Lookup (Tenant-scoped)

**Purpose:** Agency-curated marketable destination built on global geography.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| tenant_id | UUID | NN, FK → tenants(id) ON DELETE CASCADE |
| country_id | UUID | NN, FK → countries(id) ON DELETE RESTRICT |
| city_id | UUID | FK → cities(id) ON DELETE SET NULL (nullable) |
| name | VARCHAR(200) | NN |
| slug | VARCHAR(200) | NN |
| description | TEXT | |
| status | destination_status | NN, default 'active' |
| deleted_at | TIMESTAMPTZ | |
| created_by | UUID | FK → users(id) ON DELETE SET NULL |
| updated_by | UUID | FK → users(id) ON DELETE SET NULL |
| created_at / updated_at | TIMESTAMPTZ | NN, default now() |

**Constraints:** UNIQUE(tenant_id, slug) WHERE deleted_at IS NULL (partial unique index).
**Indexes:** PK(id); idx(tenant_id); idx(country_id); idx(city_id); idx(tenant_id, status).

---

### 3.11 `customers` — Core

**Purpose:** Account holder placing bookings (individual or corporate).

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| tenant_id | UUID | NN, FK → tenants(id) ON DELETE CASCADE |
| type | customer_type | NN, default 'individual' |
| first_name | VARCHAR(100) | |
| last_name | VARCHAR(100) | |
| company_name | VARCHAR(200) | |
| email | VARCHAR(255) | |
| phone | VARCHAR(50) | |
| deleted_at | TIMESTAMPTZ | |
| created_by / updated_by | UUID | FK → users(id) ON DELETE SET NULL |
| created_at / updated_at | TIMESTAMPTZ | NN, default now() |

**Constraints:** CHECK (type='corporate' AND company_name IS NOT NULL) OR (type='individual' AND last_name IS NOT NULL); UNIQUE(tenant_id, email) WHERE deleted_at IS NULL.
**Indexes:** PK(id); idx(tenant_id); idx(tenant_id, email); idx(tenant_id, last_name).

---

### 3.12 `customer_contacts` — Support

**Purpose:** Additional contacts for a customer.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| customer_id | UUID | NN, FK → customers(id) ON DELETE CASCADE |
| tenant_id | UUID | NN, FK → tenants(id) ON DELETE CASCADE |
| name | VARCHAR(150) | NN |
| email | VARCHAR(255) | |
| phone | VARCHAR(50) | |
| created_at / updated_at | TIMESTAMPTZ | NN, default now() |

**Indexes:** PK(id); idx(customer_id); idx(tenant_id).

---

### 3.13 `customer_addresses` — Support

**Purpose:** Postal addresses for a customer. Country/city are normalized to geography FKs (no free-text).

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| customer_id | UUID | NN, FK → customers(id) ON DELETE CASCADE |
| tenant_id | UUID | NN, FK → tenants(id) ON DELETE CASCADE |
| type | address_type | NN, default 'billing' |
| street | VARCHAR(255) | |
| city_id | UUID | FK → cities(id) ON DELETE SET NULL |
| country_id | UUID | FK → countries(id) ON DELETE SET NULL |
| postal_code | VARCHAR(20) | |
| created_at / updated_at | TIMESTAMPTZ | NN, default now() |

**Indexes:** PK(id); idx(customer_id); idx(tenant_id); idx(country_id); idx(city_id).

---

### 3.14 `travelers` — Core

**Purpose:** Reusable traveler profile (the person who travels). May be linked to a customer account or stand alone.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| tenant_id | UUID | NN, FK → tenants(id) ON DELETE CASCADE |
| customer_id | UUID | FK → customers(id) ON DELETE SET NULL (nullable) |
| first_name | VARCHAR(100) | NN |
| last_name | VARCHAR(100) | NN |
| date_of_birth | DATE | |
| gender | traveler_gender | NN, default 'unspecified' |
| nationality_country_id | UUID | FK → countries(id) ON DELETE SET NULL |
| passport_number | VARCHAR(50) | |
| passport_expiry | DATE | |
| email | VARCHAR(255) | |
| phone | VARCHAR(50) | |
| deleted_at | TIMESTAMPTZ | |
| created_by / updated_by | UUID | FK → users(id) ON DELETE SET NULL |
| created_at / updated_at | TIMESTAMPTZ | NN, default now() |

**Constraints:** CHECK (passport_expiry IS NULL OR passport_expiry > date_of_birth).
**Indexes:** PK(id); idx(tenant_id); idx(customer_id); idx(nationality_country_id); idx(tenant_id, last_name, first_name).

---

### 3.15 `packages` — Core

**Purpose:** Sellable travel product.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| tenant_id | UUID | NN, FK → tenants(id) ON DELETE CASCADE |
| destination_id | UUID | FK → destinations(id) ON DELETE SET NULL (nullable) |
| title | VARCHAR(255) | NN |
| description | TEXT | |
| duration_days | INTEGER | CHECK (duration_days > 0) |
| status | package_status | NN, default 'draft' |
| cover_image_url | TEXT | |
| deleted_at | TIMESTAMPTZ | |
| created_by / updated_by | UUID | FK → users(id) ON DELETE SET NULL |
| created_at / updated_at | TIMESTAMPTZ | NN, default now() |

**Indexes:** PK(id); idx(tenant_id); idx(tenant_id, status); idx(destination_id).

> Change vs v1.0: free-text `destination VARCHAR` replaced by `destination_id` FK.

---

### 3.16 `package_days` — Transaction

**Purpose:** Day-by-day plan for a package (replaces `package_itineraries`).

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| package_id | UUID | NN, FK → packages(id) ON DELETE CASCADE |
| tenant_id | UUID | NN, FK → tenants(id) ON DELETE CASCADE |
| day_number | INTEGER | NN, CHECK > 0 |
| title | VARCHAR(255) | NN |
| description | TEXT | |
| created_at / updated_at | TIMESTAMPTZ | NN, default now() |

**Constraints:** UNIQUE(package_id, day_number).
**Indexes:** PK(id); idx(package_id).

---

### 3.16b `package_day_activities` — Transaction

**Purpose:** Individual activities scheduled within a package day.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| package_day_id | UUID | NN, FK → package_days(id) ON DELETE CASCADE |
| tenant_id | UUID | NN, FK → tenants(id) ON DELETE CASCADE |
| title | VARCHAR(255) | NN |
| description | TEXT | |
| start_time | TIME | |
| end_time | TIME | |
| location | VARCHAR(255) | |
| sort_order | INTEGER | NN, default 0 |
| created_at / updated_at | TIMESTAMPTZ | NN, default now() |

**Constraints:** CHECK (end_time IS NULL OR start_time IS NULL OR end_time >= start_time).
**Indexes:** PK(id); idx(package_day_id).

---

### 3.17 `package_pricing` — Transaction

**Purpose:** Price per traveler tier for a package.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| package_id | UUID | NN, FK → packages(id) ON DELETE CASCADE |
| tenant_id | UUID | NN, FK → tenants(id) ON DELETE CASCADE |
| tier | pricing_tier | NN |
| amount | DECIMAL(12,2) | NN, CHECK >= 0 |
| currency | CHAR(3) | NN, default 'USD' |
| created_at / updated_at | TIMESTAMPTZ | NN, default now() |

**Constraints:** UNIQUE(package_id, tier).
**Indexes:** PK(id); idx(package_id).

---

### 3.18 `package_media` — Support

**Purpose:** Images/documents attached to a package.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| package_id | UUID | NN, FK → packages(id) ON DELETE CASCADE |
| tenant_id | UUID | NN, FK → tenants(id) ON DELETE CASCADE |
| file_url | TEXT | NN |
| file_type | VARCHAR(50) | |
| sort_order | INTEGER | default 0 |
| created_at | TIMESTAMPTZ | NN, default now() |

**Indexes:** PK(id); idx(package_id).

---

### 3.19 `bookings` — Core / Transaction (hub)

**Purpose:** Central transaction linking customer, package, travelers, invoices, and payments.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| tenant_id | UUID | NN, FK → tenants(id) ON DELETE CASCADE |
| reference_number | VARCHAR(50) | NN (generated by trigger) |
| customer_id | UUID | NN, FK → customers(id) ON DELETE RESTRICT |
| package_id | UUID | NN, FK → packages(id) ON DELETE RESTRICT |
| status | booking_status | NN, default 'draft' |
| payment_status | payment_status | NN, default 'unpaid' |
| total_amount | DECIMAL(12,2) | NN, default 0 (maintained by trigger) |
| currency | CHAR(3) | NN, default 'USD' |
| travel_date | DATE | |
| notes | TEXT | |
| deleted_at | TIMESTAMPTZ | |
| created_by / updated_by | UUID | FK → users(id) ON DELETE SET NULL |
| created_at / updated_at | TIMESTAMPTZ | NN, default now() |

**Constraints:** UNIQUE(tenant_id, reference_number).
**Indexes:** PK(id); idx(tenant_id); idx(customer_id); idx(package_id); idx(tenant_id, status); idx(tenant_id, travel_date).

---

### 3.20 `booking_items` — Transaction

**Purpose:** Line items that make up the booking total.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| booking_id | UUID | NN, FK → bookings(id) ON DELETE CASCADE |
| tenant_id | UUID | NN, FK → tenants(id) ON DELETE CASCADE |
| description | VARCHAR(255) | NN |
| quantity | INTEGER | NN, default 1, CHECK > 0 |
| unit_price | DECIMAL(12,2) | NN |
| total_price | DECIMAL(12,2) | NN (= quantity * unit_price via trigger) |
| created_at / updated_at | TIMESTAMPTZ | NN, default now() |

**Indexes:** PK(id); idx(booking_id).

---

### 3.21 `booking_travelers` — Junction

**Purpose:** Assigns reusable traveler profiles to a booking.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| booking_id | UUID | NN, FK → bookings(id) ON DELETE CASCADE |
| traveler_id | UUID | NN, FK → travelers(id) ON DELETE RESTRICT |
| tenant_id | UUID | NN, FK → tenants(id) ON DELETE CASCADE |
| is_lead | BOOLEAN | NN, default false |
| price_tier | pricing_tier | NN, default 'adult' |
| created_at / updated_at | TIMESTAMPTZ | NN, default now() |

**Constraints:** UNIQUE(booking_id, traveler_id); partial UNIQUE(booking_id) WHERE is_lead = true (one lead per booking).
**Indexes:** PK(id); idx(booking_id); idx(traveler_id).

> Change vs v1.0: traveler details moved out of this table into `travelers`; this is now a pure junction.

---

### 3.22 `booking_status_history` — Transaction (ledger)

**Purpose:** Immutable record of booking status transitions.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| booking_id | UUID | NN, FK → bookings(id) ON DELETE CASCADE |
| tenant_id | UUID | NN, FK → tenants(id) ON DELETE CASCADE |
| from_status | booking_status | |
| to_status | booking_status | NN |
| changed_by | UUID | FK → users(id) ON DELETE SET NULL |
| notes | TEXT | |
| created_at | TIMESTAMPTZ | NN, default now() |

**Indexes:** PK(id); idx(booking_id).

---

### 3.22b `booking_notes` — Support

**Purpose:** Free-text notes attached to a booking.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| booking_id | UUID | NN, FK → bookings(id) ON DELETE CASCADE |
| tenant_id | UUID | NN, FK → tenants(id) ON DELETE CASCADE |
| note | TEXT | NN |
| created_by | UUID | FK → users(id) ON DELETE SET NULL |
| created_at / updated_at | TIMESTAMPTZ | NN, default now() |

**Indexes:** PK(id); idx(booking_id); idx(tenant_id).

---

### 3.22c `booking_documents` — Support

**Purpose:** File attachments (vouchers, passports, tickets) linked to a booking.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| booking_id | UUID | NN, FK → bookings(id) ON DELETE CASCADE |
| tenant_id | UUID | NN, FK → tenants(id) ON DELETE CASCADE |
| file_url | TEXT | NN |
| file_name | VARCHAR(255) | |
| file_type | VARCHAR(50) | |
| file_size | BIGINT | CHECK (file_size IS NULL OR file_size >= 0) |
| uploaded_by | UUID | FK → users(id) ON DELETE SET NULL |
| created_at / updated_at | TIMESTAMPTZ | NN, default now() |

**Indexes:** PK(id); idx(booking_id); idx(tenant_id).

---

### 3.23 `invoices` — Transaction

**Purpose:** Financial document issued against a booking; payments are applied to it.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| tenant_id | UUID | NN, FK → tenants(id) ON DELETE CASCADE |
| booking_id | UUID | NN, FK → bookings(id) ON DELETE RESTRICT |
| invoice_number | VARCHAR(50) | NN (generated by trigger) |
| status | invoice_status | NN, default 'draft' |
| issue_date | DATE | |
| due_date | DATE | |
| subtotal | DECIMAL(12,2) | NN, default 0, CHECK >= 0 |
| tax_amount | DECIMAL(12,2) | NN, default 0, CHECK >= 0 |
| total_amount | DECIMAL(12,2) | NN, default 0, CHECK >= 0 |
| currency | CHAR(3) | NN, default 'USD' |
| notes | TEXT | |
| line_items_snapshot | JSONB | Frozen `booking_items` at first `issued` (D-012, migration 022) |
| deleted_at | TIMESTAMPTZ | |
| created_by / updated_by | UUID | FK → users(id) ON DELETE SET NULL |
| created_at / updated_at | TIMESTAMPTZ | NN, default now() |

**Constraints:** UNIQUE(tenant_id, invoice_number); CHECK (total_amount = subtotal + tax_amount); CHECK (due_date IS NULL OR due_date >= issue_date).
**Triggers:** `trg_invoices_freeze_line_snapshot` copies booking lines into `line_items_snapshot` when status becomes `issued`.
**Indexes:** PK(id); idx(tenant_id); idx(booking_id); idx(tenant_id, status); idx(tenant_id, due_date).

---

### 3.24 `payments` — Transaction

**Purpose:** Money received against an invoice (or booking directly).

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| tenant_id | UUID | NN, FK → tenants(id) ON DELETE CASCADE |
| booking_id | UUID | NN, FK → bookings(id) ON DELETE RESTRICT |
| invoice_id | UUID | FK → invoices(id) ON DELETE SET NULL (nullable) |
| amount | DECIMAL(12,2) | NN, CHECK > 0 |
| method | payment_method | NN |
| reference_number | VARCHAR(100) | |
| payment_date | DATE | NN, default CURRENT_DATE |
| notes | TEXT | |
| deleted_at | TIMESTAMPTZ | |
| created_by / updated_by | UUID | FK → users(id) ON DELETE SET NULL |
| created_at / updated_at | TIMESTAMPTZ | NN, default now() |

**Constraints:** CHECK (amount > 0); trigger prevents Σ payments > invoice/booking total (overpayment guard).
**Indexes:** PK(id); idx(tenant_id); idx(booking_id); idx(invoice_id); idx(tenant_id, payment_date).

> Change vs v1.0: added optional `invoice_id` link.

---

### 3.25 `payment_transactions` — Transaction (ledger)

**Purpose:** Immutable per-movement ledger for a payment (payment / refund / adjustment).

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| payment_id | UUID | NN, FK → payments(id) ON DELETE CASCADE |
| tenant_id | UUID | NN, FK → tenants(id) ON DELETE CASCADE |
| transaction_type | transaction_type | NN, default 'payment' |
| amount | DECIMAL(12,2) | NN |
| metadata | JSONB | default '{}' |
| created_at | TIMESTAMPTZ | NN, default now() |

**Indexes:** PK(id); idx(payment_id).

---

### 3.25b `notifications` — Support

**Purpose:** In-app notifications delivered to a user (booking/payment/system events).

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| tenant_id | UUID | NN, FK → tenants(id) ON DELETE CASCADE |
| user_id | UUID | NN, FK → users(id) ON DELETE CASCADE (recipient) |
| type | VARCHAR(50) | NN (e.g. booking, payment, invoice, system) |
| title | VARCHAR(255) | NN |
| message | TEXT | |
| entity_type | VARCHAR(50) | optional source entity (e.g. 'booking') |
| entity_id | UUID | optional source record id |
| is_read | BOOLEAN | NN, default false |
| read_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | NN, default now() |

**Indexes:** PK(id); idx(tenant_id); idx(user_id); idx(user_id, is_read).

---

### 3.26 `audit_logs` — Audit

**Purpose:** Append-only trail of data changes for compliance.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| tenant_id | UUID | FK → tenants(id) ON DELETE CASCADE |
| user_id | UUID | FK → users(id) ON DELETE SET NULL |
| action | audit_action | NN |
| table_name | VARCHAR(63) | NN |
| record_id | UUID | |
| old_data | JSONB | |
| new_data | JSONB | |
| created_at | TIMESTAMPTZ | NN, default now() |

**Indexes:** PK(id); idx(tenant_id); idx(table_name, record_id); idx(created_at).

---

## 4. Row Level Security Model

Every table has RLS enabled. Pattern by table class:

| Table class | SELECT policy | WRITE policy |
|-------------|---------------|--------------|
| Global lookups (roles, permissions, countries, cities) | `true` (read-all authenticated) | super_admin only |
| Tenant tables | `tenant_id = auth.tenant_id() OR auth.is_super_admin()` | same + RBAC permission check |
| audit_logs | tenant match, read-only to admins | INSERT via trigger only; no UPDATE/DELETE |

Helper functions (defined in migration 002):

```sql
auth.tenant_id()      -> (auth.jwt() ->> 'tenant_id')::uuid
auth.user_role()      -> auth.jwt() ->> 'role'
auth.is_super_admin() -> auth.user_role() = 'super_admin'
```

---

## 5. Triggers and Functions (planned for migration 003)

| Trigger | Tables | Purpose |
|---------|--------|---------|
| `set_updated_at` | all with updated_at | maintain updated_at |
| `audit_log_trigger` | all audited tables | write to audit_logs |
| `generate_booking_reference` | bookings | BK-YYYY-###### per tenant |
| `generate_invoice_number` | invoices | INV-YYYY-###### per tenant |
| `calculate_item_total` | booking_items | total_price = qty × unit_price |
| `recalculate_booking_total` | booking_items | sum into bookings.total_amount |
| `recalculate_invoice_status` | payments | set invoice/booking payment_status |
| `prevent_overpayment` | payments | block Σ payments > total |
| `set_audit_user` | audited tables | enforce created_by/updated_by from JWT |

---

## 6. Resolved Design Decisions (approved 2026-06-01)

1. **Geography scope:** ✅ Countries & cities are **global**; destinations are **tenant-scoped**.
2. **Travelers ownership:** ✅ `travelers.customer_id` is **nullable** (standalone travelers allowed).
3. **Payments linkage:** ✅ `payments.invoice_id` remains **optional**; `booking_id` required.
4. **Invoice cardinality:** ✅ **1 booking → many invoices** (no single-invoice constraint).
5. **Address normalization:** ✅ `customer_addresses` uses `country_id` + `city_id` FKs; free-text removed.

---

## 7. Migration Files

```
database/migrations/001_core.sql                 (enums + tenancy, users, RBAC)
database/migrations/002_master_data.sql          (countries, cities, destinations)
database/migrations/003_customers_packages.sql   (customers, travelers, packages, days, activities)
database/migrations/004_bookings_finance.sql     (bookings, invoices, payments)
database/migrations/005_supporting.sql           (notifications, audit_logs)
database/migrations/006_rls_policies.sql         (RLS + helper functions)
database/migrations/007_functions_triggers.sql   (triggers/business functions)
database/migrations/008_seed_reference.sql       (roles, permissions seed)
database/migrations/009_auth_hook.sql            (JWT custom access token hook)
database/migrations/010_seed_geography.sql       (countries + cities seed)
database/migrations/011_*.sql                   (tenant JWT helpers — see repo)
```

**Planned (Phase 5 — not approved for migration yet):** `012_ai_platform.sql`, `013_knowledge_rag.sql`, `014_support_tickets.sql`

---

## 8. AI Platform — Database Impact Analysis (recommendations only)

**Gate:** Implementation approval required. **Do not** add migrations until approved.

### 8.1 Summary

| Entity | Required? | Rationale |
|--------|-----------|-----------|
| `ai_agents` | **Yes** | Per-tenant agent enablement and config |
| `ai_conversations` | **Yes** | Thread history for all three agents |
| `ai_messages` | **Yes** | User/assistant/tool payloads |
| `ai_sessions` | **Recommended** | Correlate browser tab / device; optional if conversation-only model suffices |
| `ai_logs` | **Yes** | Audit tool calls, model, latency, errors (compliance) |
| `ai_feedback` | **Recommended** | Phase 6 feedback loops; optional in Phase 5 MVP |
| `knowledge_documents` | **Yes** | Knowledge Agent corpus metadata |
| `knowledge_chunks` | **Yes** | RAG retrieval units + `vector` column (pgvector) |
| `support_tickets` | **Yes** | Support Agent case management |
| `support_ticket_messages` | **Yes** | Ticket threads |

### 8.2 Proposed table sketches

#### `ai_agents`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| tenant_id | UUID FK → tenants | RLS |
| agent_key | TEXT | `knowledge` \| `booking` \| `support` |
| enabled | BOOLEAN | Default true |
| config | JSONB | Model, rate limits, prompts version |

UK: `(tenant_id, agent_key)`

#### `ai_conversations`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| tenant_id | UUID FK | |
| user_id | UUID FK → users | |
| agent_key | TEXT | |
| title | TEXT | Optional auto-summary |
| created_at / updated_at | TIMESTAMPTZ | |

#### `ai_messages`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| conversation_id | UUID FK | |
| role | ENUM | user, assistant, system, tool |
| content | TEXT | |
| metadata | JSONB | Citations, tool_call ids |
| created_at | TIMESTAMPTZ | |

#### `ai_logs`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| tenant_id | UUID FK | |
| conversation_id | UUID FK | Nullable |
| event_type | TEXT | tool_call, error, retrieval |
| payload | JSONB | Redact PII in app layer |
| created_at | TIMESTAMPTZ | |

#### `knowledge_documents`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| tenant_id | UUID FK | |
| title | TEXT | |
| document_type | ENUM | policy, faq, contract, package, sop |
| storage_path | TEXT | Supabase Storage |
| status | ENUM | processing, published, archived |
| deleted_at | TIMESTAMPTZ | Soft delete |

#### `knowledge_chunks`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| document_id | UUID FK | ON DELETE CASCADE |
| tenant_id | UUID FK | Denormalized for RLS |
| chunk_index | INT | |
| content | TEXT | |
| embedding | VECTOR(1536) | Model-dependent dimension |
| token_count | INT | |

Index: HNSW or IVFFlat on `embedding` with `tenant_id` filter.

#### `support_tickets`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| tenant_id | UUID FK | |
| ticket_number | TEXT | UK per tenant |
| status | ENUM | open, pending, escalated, resolved, closed |
| priority | ENUM | low, medium, high, urgent |
| customer_id | UUID FK | Nullable |
| booking_id | UUID FK | Nullable |
| assigned_user_id | UUID FK | Nullable |
| subject | TEXT | |
| created_by | UUID FK | |

#### `support_ticket_messages`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| ticket_id | UUID FK | |
| author_type | ENUM | user, customer, agent, system |
| content | TEXT | |
| created_at | TIMESTAMPTZ | |

### 8.3 RLS considerations

- All tables tenant-scoped with same `current_tenant_id()` pattern as MVP.
- `knowledge_chunks` policies must prevent cross-tenant vector search (filter `tenant_id` in RPC).
- `ai_logs` insert-only for app service role; read restricted to Tenant Admin.

### 8.4 Migration file proposal (future)

```
012_ai_core.sql         — ai_agents, ai_conversations, ai_messages, ai_sessions, ai_logs, ai_feedback
013_knowledge_rag.sql   — knowledge_documents, knowledge_chunks, vector extension
014_support.sql         — support_tickets, support_ticket_messages
015_rls_ai.sql          — policies
```

### 8.5 Alternatives considered

| Approach | Rejected because |
|----------|------------------|
| Store chats only in external SaaS | Breaks tenant isolation audit requirements |
| Reuse `notifications` for tickets | Insufficient threading, assignment, escalation |
| Single `ai_events` JSON blob | Poor queryability for analytics (Phase 6) |

See [DomainModel.md](./DomainModel.md) §10 and [AIArchitecture.md](../../ai/AIArchitecture.md).
