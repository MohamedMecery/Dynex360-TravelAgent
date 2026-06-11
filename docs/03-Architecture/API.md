# TravelOS API Specification

**Version:** 1.1 — Mobile foundation (Sprint 7B)  
**Base URL:** `/api`  
**Auth:** Supabase session — **Bearer JWT** (mobile) or **SSR cookies** (web)  
**Content-Type:** `application/json`

---

## Common Conventions

### Authentication (dual transport)

All protected routes use `requireActiveApiAccess()`:

| Transport | Client | Header / mechanism |
|-----------|--------|-------------------|
| **Web** | Next.js browser | Supabase SSR auth cookies (automatic on `fetch("/api/...")`) |
| **Mobile** | Expo / React Native | `Authorization: Bearer <supabase_access_token>` |

Implementation: `src/lib/supabase/api-client.ts` resolves cookie or Bearer before `getUser()`.

**Middleware:** `/api/*` paths are not redirected to `/login`; handlers return JSON `401`/`403`.

JWT `app_metadata` claims (UX only): `tenant_id`, `role`, `account_status`. Authoritative access is always DB-backed (`users`, `user_roles`).

### Authentication Header (mobile)

```
Authorization: Bearer {supabase_access_token}
```

### Mobile example

```typescript
const { data: { session } } = await supabase.auth.getSession();
const res = await fetch(`${API_URL}/api/auth/me`, {
  headers: {
    Authorization: `Bearer ${session?.access_token}`,
    Accept: "application/json",
  },
});
```

### Pagination

Query params: `page` (default 1), `limit` (default 20, max 100)

Response envelope:
```json
{
  "data": [],
  "meta": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 }
}
```

### Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": [{ "field": "email", "message": "Invalid format" }]
  }
}
```

### Standard Error Codes

| HTTP | Code | Description |
|------|------|-------------|
| 400 | VALIDATION_ERROR | Invalid request body or params |
| 401 | UNAUTHORIZED | Missing or invalid JWT |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Duplicate or constraint violation |
| 422 | UNPROCESSABLE | Business rule violation |
| 500 | INTERNAL_ERROR | Server error |

---

## Auth Endpoints

### GET /api/auth/me

Returns current user profile (web + mobile).

**Permission:** Authenticated (active account)

**Query:** `include_permissions` — `true` | `1` to include `permissions[]` (effective role hints).

**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "email": "agent@agency.com",
    "full_name": "Jane Agent",
    "tenant_id": "uuid",
    "role": "sales_agent",
    "account_status": "active",
    "permissions": ["crm.leads.read", "crm.leads.write", "bookings.read"]
  }
}
```

`permissions` is omitted unless `include_permissions` is set.

---

## Users Endpoints

### GET /api/users

List tenant users.

**Permission:** users.read

**Query:** `status`, `role`, `search`

### POST /api/users/invite

Invite a new user.

**Permission:** users.create

**Request:**
```json
{
  "email": "new@agency.com",
  "full_name": "New Agent",
  "role": "sales_agent"
}
```

### PUT /api/users/:id

Update user (role, status).

**Permission:** users.update

### DELETE /api/users/:id

Deactivate user.

**Permission:** users.delete

### GET /api/users/assignees

Active assignable users in the current tenant (CRM assignment pickers).

**Permission:** CRM read/write or `users.read` (see `canReadAssignees`)

**Query:** `search` (optional)

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "agent@agency.com",
      "full_name": "Jane Agent",
      "role": "sales_agent"
    }
  ],
  "meta": { "total": 1 }
}
```

---

## Customers Endpoints

### GET /api/customers

**Permission:** customers.read  
**Query:** `search`, `type`, `page`, `limit`

**Response 200:**
```json
{
  "data": [{
    "id": "uuid",
    "type": "individual",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "created_at": "2026-06-01T00:00:00Z"
  }],
  "meta": { "page": 1, "limit": 20, "total": 50, "totalPages": 3 }
}
```

### POST /api/customers

**Permission:** customers.create

**Request:**
```json
{
  "type": "individual",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "company_name": null,
  "notes": ""
}
```

### GET /api/customers/:id

**Permission:** customers.read

### PUT /api/customers/:id

**Permission:** customers.update

### DELETE /api/customers/:id

**Permission:** customers.delete (soft delete)

### POST /api/customers/:id/contacts

**Permission:** customers.create

**Request:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "+0987654321",
  "role": "Emergency Contact"
}
```

### POST /api/customers/:id/addresses

**Permission:** customers.create

**Request:**
```json
{
  "type": "billing",
  "street": "123 Main St",
  "city": "New York",
  "state": "NY",
  "country": "US",
  "postal_code": "10001"
}
```

---

## Packages Endpoints

### GET /api/packages

**Permission:** packages.read  
**Query:** `status`, `destination`, `search`, `page`, `limit`

### POST /api/packages

**Permission:** packages.create

**Request:**
```json
{
  "title": "Paris Adventure",
  "description": "7-day tour of Paris",
  "destination": "Paris, France",
  "duration_days": 7
}
```

### GET /api/packages/:id

Returns package with itinerary and pricing.

### PUT /api/packages/:id

**Permission:** packages.update

### POST /api/packages/:id/publish

**Permission:** packages.publish

### POST /api/packages/:id/archive

**Permission:** packages.publish

### POST /api/packages/:id/itinerary

**Request:**
```json
{
  "day_number": 1,
  "title": "Arrival in Paris",
  "description": "Check in and explore the neighborhood"
}
```

### PUT /api/packages/:id/pricing

**Request:**
```json
{
  "tiers": [
    { "tier": "adult", "amount": 1500.00 },
    { "tier": "child", "amount": 900.00 },
    { "tier": "infant", "amount": 200.00 }
  ]
}
```

---

## Bookings Endpoints

### GET /api/bookings

**Permission:** `bookings.read`  
**Query:** `status`, `payment_status`, `customer_id`, `date_from` (YYYY-MM-DD), `date_to`, `search` (reference), `page`, `limit`

**Response 200:** Paginated `data` with optional `customers`, `packages` embeds.

### GET /api/bookings/:id

**Permission:** `bookings.read`

**Response 200:** Booking with `booking_items`, `booking_travelers`, `booking_status_history` (last 50).

### PATCH /api/bookings/:id/status

**Permission:** Status-specific (`bookings.confirm`, etc.)

**Request:** `{ "status": "confirmed" }`

### POST /api/bookings

**Permission:** bookings.create

**Request:**
```json
{
  "customer_id": "uuid",
  "package_id": "uuid",
  "travel_date": "2026-08-15",
  "notes": "Honeymoon trip"
}
```

### GET /api/bookings/:id

Returns booking with travelers, items, payments, history.

### POST /api/bookings/:id/confirm

**Permission:** bookings.confirm

### POST /api/bookings/:id/complete

**Permission:** bookings.complete

### POST /api/bookings/:id/cancel

**Permission:** bookings.cancel

**Request:**
```json
{ "notes": "Customer requested cancellation" }
```

### POST /api/bookings/:id/travelers

**Request:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "date_of_birth": "1990-05-15",
  "passport_number": "AB1234567"
}
```

### POST /api/bookings/:id/items

**Request:**
```json
{
  "description": "Adult x 2",
  "quantity": 2,
  "unit_price": 1500.00
}
```

---

## Payments Endpoints

### GET /api/payments

**Permission:** payments.read  
**Query:** `booking_id`, `method`, `date_from`, `date_to`, `page`, `limit`

### POST /api/payments

**Permission:** payments.create

**Request:**
```json
{
  "booking_id": "uuid",
  "amount": 500.00,
  "method": "bank_transfer",
  "reference_number": "TXN-2026-001",
  "payment_date": "2026-06-01",
  "notes": "First installment"
}
```

**Response 201:**
```json
{
  "data": {
    "id": "uuid",
    "booking_id": "uuid",
    "amount": 500.00,
    "method": "bank_transfer",
    "booking_payment_status": "partial"
  }
}
```

### GET /api/bookings/:id/payments

**Permission:** payments.read

---

## Dashboard Endpoints

### GET /api/dashboard/stats

**Permission:** dashboard.read

**Response 200:**
```json
{
  "data": {
    "bookings_by_status": { "draft": 5, "confirmed": 12, "completed": 30, "cancelled": 2 },
    "total_revenue": 45000.00,
    "outstanding_balance": 8500.00,
    "recent_bookings": []
  }
}
```

---

## CRM Dashboard

### GET /api/crm/dashboard

CRM pipeline KPIs, charts, and action lists (distinct from operations `GET /api/dashboard/stats`).

**Permission:** `crm.dashboard.read`  
**Financial KPIs/charts:** included only when the caller has `dashboard.financial` (tenant_admin, finance_officer).

**Query parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `period` | `month` \| `quarter` \| `custom` | Default `month` (calendar month UTC) |
| `from` | ISO8601 | Required when `period=custom` |
| `to` | ISO8601 | Required when `period=custom` |

**Response 200:** See `CRM-Phase7-Implementation-Spec.md` §9.2 (`period`, `kpis`, `charts`, `lists`).

**Errors:** `400` validation, `403` missing CRM dashboard permission.

---

## Screen-to-API Traceability

| Screen | API Calls |
|--------|-----------|
| Login | Supabase signInWithPassword, GET /api/auth/me |
| Customer List | GET /api/customers |
| Customer Create | POST /api/customers |
| Customer Detail | GET /api/customers/:id, GET /api/customers/:id/bookings |
| Package List | GET /api/packages |
| Package Detail | GET /api/packages/:id, POST publish/archive |
| Booking List | GET /api/bookings |
| Booking Create | POST /api/bookings, POST travelers, POST items |
| Booking Detail | GET /api/bookings/:id, POST confirm/cancel/complete |
| Payment List | GET /api/payments |
| Record Payment | POST /api/payments |
| Dashboard | GET /api/dashboard/stats |
| CRM Dashboard | GET /api/crm/dashboard |
| User Management | GET/POST/PUT/DELETE /api/users |
