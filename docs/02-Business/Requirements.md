# TravelOS Functional and Non-Functional Requirements

**Version:** 1.1 — MVP + AI Phase 5  
**Last Updated:** 2026-06-02

---

## 1. Functional Requirements

### 1.1 Authentication (FR-AUTH)

| ID | Requirement | Module | Priority |
|----|-------------|--------|----------|
| FR-AUTH-001 | System shall authenticate users via email and password using Supabase Auth | Authentication | Must |
| FR-AUTH-002 | System shall issue JWT tokens on successful login | Authentication | Must |
| FR-AUTH-003 | System shall support password reset via email link | Authentication | Must |
| FR-AUTH-004 | System shall expire sessions after configurable idle timeout (default 24h) | Authentication | Must |
| FR-AUTH-005 | System shall include tenant_id and role claims in JWT custom claims | Authentication | Must |
| FR-AUTH-006 | System shall prevent access to authenticated routes without valid session | Authentication | Must |

### 1.2 User Management (FR-USER)

| ID | Requirement | Module | Priority |
|----|-------------|--------|----------|
| FR-USER-001 | Tenant Admin shall invite new users by email address | User Management | Must |
| FR-USER-002 | Tenant Admin shall assign exactly one role per user | User Management | Must |
| FR-USER-003 | Tenant Admin shall deactivate and reactivate user accounts | User Management | Must |
| FR-USER-004 | Tenant Admin shall view all users in their tenant with role and status | User Management | Must |
| FR-USER-005 | Super Admin shall create and manage tenant organizations | User Management | Must |
| FR-USER-006 | Super Admin shall view users across all tenants | User Management | Should |

### 1.3 Customers (FR-CUST)

| ID | Requirement | Module | Priority |
|----|-------------|--------|----------|
| FR-CUST-001 | Sales Agent shall create a customer with name, email, phone, and type | Customers | Must |
| FR-CUST-002 | Sales Agent shall add multiple contacts to a customer record | Customers | Must |
| FR-CUST-003 | Sales Agent shall add multiple addresses to a customer record | Customers | Must |
| FR-CUST-004 | Sales Agent shall search customers by name, email, or phone | Customers | Must |
| FR-CUST-005 | Sales Agent shall edit customer details | Customers | Must |
| FR-CUST-006 | Tenant Admin shall soft-delete customers (preserving booking history) | Customers | Must |
| FR-CUST-007 | Sales Agent shall view customer booking history | Customers | Should |
| FR-CUST-008 | System shall prevent duplicate customers by email within a tenant | Customers | Must |

### 1.4 Packages (FR-PKG)

| ID | Requirement | Module | Priority |
|----|-------------|--------|----------|
| FR-PKG-001 | Sales Agent shall create a package with title, description, destination, duration | Packages | Must |
| FR-PKG-002 | Sales Agent shall add itinerary days with title and description | Packages | Must |
| FR-PKG-003 | Sales Agent shall define pricing tiers (adult, child, infant) with amounts | Packages | Must |
| FR-PKG-004 | Sales Agent shall set package status: draft, published, archived | Packages | Must |
| FR-PKG-005 | Tenant Admin shall upload a cover image for a package | Packages | Should |
| FR-PKG-006 | Sales Agent shall search and filter packages by destination, status | Packages | Must |
| FR-PKG-007 | Only published packages shall be selectable during booking creation | Packages | Must |

### 1.5 Bookings (FR-BKG)

| ID | Requirement | Module | Priority |
|----|-------------|--------|----------|
| FR-BKG-001 | Sales Agent shall create a booking linking a customer to a package | Bookings | Must |
| FR-BKG-002 | Sales Agent shall add travelers with name, date of birth, passport number | Bookings | Must |
| FR-BKG-003 | Sales Agent shall add line items with description, quantity, unit price | Bookings | Must |
| FR-BKG-004 | System shall auto-calculate booking total from line items | Bookings | Must |
| FR-BKG-005 | Sales Agent shall transition booking status: draft → confirmed → completed → cancelled | Bookings | Must |
| FR-BKG-006 | System shall track payment status: unpaid, partial, paid | Bookings | Must |
| FR-BKG-007 | System shall record status change history with user and timestamp | Bookings | Must |
| FR-BKG-008 | Sales Agent shall search bookings by status, customer, date range | Bookings | Must |
| FR-BKG-009 | Cancelled bookings shall not accept new payments | Bookings | Must |

### 1.6 Payments (FR-PAY)

| ID | Requirement | Module | Priority |
|----|-------------|--------|----------|
| FR-PAY-001 | Finance Officer shall record a payment against a booking | Payments | Must |
| FR-PAY-002 | Finance Officer shall select payment method: cash, bank transfer, card, other | Payments | Must |
| FR-PAY-003 | Finance Officer shall enter amount, date, and reference number | Payments | Must |
| FR-PAY-004 | System shall auto-update booking payment status when payment recorded | Payments | Must |
| FR-PAY-005 | Finance Officer shall view payment history per booking | Payments | Must |
| FR-PAY-006 | Finance Officer shall list all payments with date and method filters | Payments | Must |
| FR-PAY-007 | System shall prevent overpayment beyond booking total | Payments | Must |

### 1.7 Cross-Cutting (FR-XCT)

| ID | Requirement | Module | Priority |
|----|-------------|--------|----------|
| FR-XCT-001 | All tenant-scoped data shall be isolated via Row Level Security | Platform | Must |
| FR-XCT-002 | All API endpoints shall enforce RBAC permissions | Platform | Must |
| FR-XCT-003 | All INSERT/UPDATE/DELETE operations shall write to audit_logs | Platform | Must |
| FR-XCT-004 | All business entities shall support soft delete via deleted_at | Platform | Must |
| FR-XCT-005 | All business entities shall track created_by and updated_by | Platform | Must |
| FR-XCT-006 | Admin UI shall be responsive for desktop and tablet viewports | Platform | Must |
| FR-XCT-007 | Marketing site shall support English and Arabic with RTL | Platform | Must |
| FR-XCT-008 | Marketing metrics band shall display approved trust statistics | Platform | Should |

### 1.8 AI Platform (FR-AI) — Phase 5

| ID | Requirement | Module | Priority |
|----|-------------|--------|----------|
| FR-AI-001 | Knowledge Agent shall answer questions using tenant-scoped RAG over operational documents | AI | Must |
| FR-AI-002 | Knowledge Agent shall return citations (document title, chunk reference) | AI | Must |
| FR-AI-003 | Knowledge Agent shall support policies, procedures, packages, pricing, supplier contracts, FAQs | AI | Must |
| FR-AI-004 | Booking Agent shall recommend published packages based on natural language criteria | AI | Must |
| FR-AI-005 | Booking Agent shall create bookings in `draft` status only | AI | Must |
| FR-AI-006 | Booking Agent shall update draft bookings and line items | AI | Must |
| FR-AI-007 | Booking Agent shall propose booking cancellation; execution requires staff RBAC | AI | Must |
| FR-AI-008 | Booking Agent shall return booking status by reference number | AI | Must |
| FR-AI-009 | Booking Agent shall collect traveler fields required for draft bookings | AI | Must |
| FR-AI-010 | Support Agent shall answer FAQs using shared knowledge corpus | AI | Must |
| FR-AI-011 | Support Agent shall create support tickets with category and priority | AI | Must |
| FR-AI-012 | Support Agent shall route or escalate tickets to assigned users | AI | Must |
| FR-AI-013 | Support Agent shall link tickets to customers and bookings when provided | AI | Should |
| FR-AI-014 | System shall log AI conversations, messages, and tool invocations per tenant | AI | Must |
| FR-AI-015 | Tenant Admin shall upload knowledge documents for indexing | AI | Should |

### 1.9 Marketing (FR-MKT)

| ID | Requirement | Module | Priority |
|----|-------------|--------|----------|
| FR-MKT-001 | Public landing shall present hero, features, solutions, pricing, testimonials, FAQ | Marketing | Must |
| FR-MKT-002 | Landing shall include Trust & Scale Metrics with animated counters | Marketing | Should |
| FR-MKT-003 | Route `/home` shall show marketing site for authenticated users | Marketing | Must |

---

## 2. Non-Functional Requirements

### 2.1 Performance (NFR-PERF)

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-PERF-001 | Dashboard page load time | < 2 seconds |
| NFR-PERF-002 | CRUD API response time (p95) | < 500ms |
| NFR-PERF-003 | Search query response time | < 1 second |
| NFR-PERF-004 | Concurrent users per tenant | 50 |

### 2.2 Security (NFR-SEC)

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-SEC-001 | Authentication mechanism | Supabase Auth JWT |
| NFR-SEC-002 | Authorization mechanism | RLS + RBAC |
| NFR-SEC-003 | Cross-tenant data isolation | Zero leakage |
| NFR-SEC-004 | Transport encryption | HTTPS TLS 1.2+ |
| NFR-SEC-005 | Password minimum length | 8 characters |
| NFR-SEC-006 | Audit trail completeness | 100% of mutations logged |

### 2.3 Scalability (NFR-SCALE)

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-SCALE-001 | Supported tenants (MVP) | 50 |
| NFR-SCALE-002 | Customers per tenant | 100,000 |
| NFR-SCALE-003 | Bookings per tenant | 10,000 |

### 2.4 Availability (NFR-AVAIL)

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-AVAIL-001 | Platform uptime | 99% |
| NFR-AVAIL-002 | Database backup frequency | Daily (Supabase automated) |
| NFR-AVAIL-003 | Recovery capability | Point-in-time via Supabase |

### 2.5 Usability (NFR-USE)

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-USE-001 | Admin UI language | English and Arabic (RTL) |
| NFR-USE-002 | Supported browsers | Chrome, Firefox, Safari, Edge (latest 2) |
| NFR-USE-003 | Mobile support | Responsive tablet; phone read-only |

### 2.6 Maintainability (NFR-MAINT)

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-MAINT-001 | Primary language | TypeScript strict mode |
| NFR-MAINT-002 | Test coverage (business logic) | 70%+ |
| NFR-MAINT-003 | CI/CD pipeline | Lint + test + deploy on merge |

---

## 3. Business Rules

| ID | Rule | Applies To |
|----|------|-----------|
| BR-001 | A customer email must be unique within a tenant | Customers |
| BR-002 | Only published packages can be selected for new bookings | Packages, Bookings |
| BR-003 | Booking total = sum of (line item quantity × unit price) | Bookings |
| BR-004 | Payment status: unpaid (0 paid), partial (>0 and < total), paid (≥ total) | Bookings, Payments |
| BR-005 | Cancelled bookings cannot receive new payments | Bookings, Payments |
| BR-006 | Total payments for a booking cannot exceed booking total | Payments |
| BR-007 | Soft-deleted records are excluded from default queries but retained in database | All entities |
| BR-008 | Status transitions must follow: draft → confirmed → completed; any → cancelled | Bookings |
| BR-009 | Each user belongs to exactly one tenant (except Super Admin) | Users |
| BR-010 | Each user has exactly one role within their tenant | Users |
| BR-011 | AI agents shall not confirm bookings or record payments autonomously | AI, Bookings |
| BR-012 | Knowledge retrieval shall never return documents from another tenant | AI |
| BR-013 | Support tickets shall be tenant-scoped | AI, Customers |

---

## 4. Requirement Traceability

| Requirement Group | User Stories | Database Tables | API Endpoints |
|-------------------|-------------|-----------------|---------------|
| FR-AUTH | US-AUTH-001 to 006 | users, tenants | /auth/* |
| FR-USER | US-USER-001 to 006 | users, roles, user_roles | /users/* |
| FR-CUST | US-CUST-001 to 008 | customers, customer_contacts, customer_addresses | /customers/* |
| FR-PKG | US-PKG-001 to 007 | packages, package_itineraries, package_pricing | /packages/* |
| FR-BKG | US-BKG-001 to 009 | bookings, booking_items, booking_travelers, booking_status_history | /bookings/* |
| FR-PAY | US-PAY-001 to 007 | payments, payment_transactions | /payments/* |
| FR-XCT | US-XCT-001 to 003 | audit_logs | All endpoints |
| FR-AI | US-AI-KNOW-001 to 003, US-AI-BKG-001 to 005, US-AI-SUP-001 to 004 | ai_*, knowledge_*, support_* (recommended) | /api/ai/* |
| FR-MKT | — | — | `/`, `/home` |

See [UserStories.md](./UserStories.md) for detailed story definitions.
