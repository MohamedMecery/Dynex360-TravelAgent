# TravelOS Entity Relationship Diagram

**Version:** 2.1 — Expanded MVP (approved)
**Last Updated:** 2026-06-02

Normalized to 3NF. Global reference tables (`roles`, `permissions`, `countries`, `cities`) have no `tenant_id`; all other tables are tenant-scoped.

---

## 1. High-Level Relationship Map

```mermaid
flowchart LR
    countries --> cities
    countries --> destinations
    cities --> destinations
    destinations --> packages
    packages --> package_days
    package_days --> package_day_activities
    customers --> travelers
    countries --> travelers
    countries --> customer_addresses
    cities --> customer_addresses
    customers --> bookings
    packages --> bookings
    bookings --> booking_travelers
    travelers --> booking_travelers
    bookings --> booking_notes
    bookings --> booking_documents
    bookings --> invoices
    invoices --> payments
    bookings --> payments
    users --> notifications
```

---

## 2. Full ERD

```mermaid
erDiagram
    tenants ||--o{ tenant_settings : has
    tenants ||--o{ users : employs
    tenants ||--o{ destinations : curates
    tenants ||--o{ customers : owns
    tenants ||--o{ travelers : owns
    tenants ||--o{ packages : owns
    tenants ||--o{ bookings : owns
    tenants ||--o{ invoices : owns
    tenants ||--o{ payments : owns
    tenants ||--o{ notifications : scopes

    users ||--o{ user_roles : assigned
    roles ||--o{ user_roles : grants
    roles ||--o{ role_permissions : has
    permissions ||--o{ role_permissions : included
    users ||--o{ notifications : receives

    countries ||--o{ cities : contains
    countries ||--o{ destinations : locates
    cities ||--o{ destinations : locates
    countries ||--o{ travelers : nationality
    countries ||--o{ customer_addresses : country
    cities ||--o{ customer_addresses : city

    destinations ||--o{ packages : features
    packages ||--o{ package_days : planned
    package_days ||--o{ package_day_activities : schedules
    packages ||--o{ package_pricing : priced
    packages ||--o{ package_media : displays
    packages ||--o{ bookings : booked

    customers ||--o{ customer_contacts : has
    customers ||--o{ customer_addresses : has
    customers ||--o{ travelers : registers
    customers ||--o{ bookings : places

    bookings ||--o{ booking_items : contains
    bookings ||--o{ booking_travelers : includes
    travelers ||--o{ booking_travelers : participates
    bookings ||--o{ booking_status_history : tracks
    bookings ||--o{ booking_notes : annotated
    bookings ||--o{ booking_documents : attaches
    bookings ||--o{ invoices : billed
    bookings ||--o{ payments : receives

    invoices ||--o{ payments : settled
    payments ||--o{ payment_transactions : logs

    countries {
        uuid id PK
        char iso2 UK
        char iso3 UK
        varchar name
        char currency_code
    }
    cities {
        uuid id PK
        uuid country_id FK
        varchar name
        varchar state_region
    }
    destinations {
        uuid id PK
        uuid tenant_id FK
        uuid country_id FK
        uuid city_id FK
        varchar name
        varchar slug
        enum status
        timestamptz deleted_at
        uuid created_by FK
        uuid updated_by FK
    }
    tenants {
        uuid id PK
        varchar name
        varchar slug UK
        enum status
    }
    users {
        uuid id PK
        uuid tenant_id FK
        varchar email UK
        varchar full_name
        enum status
    }
    roles {
        uuid id PK
        varchar name UK
        boolean is_system
    }
    permissions {
        uuid id PK
        varchar module
        varchar action
    }
    role_permissions {
        uuid role_id FK
        uuid permission_id FK
    }
    user_roles {
        uuid user_id FK
        uuid role_id FK
        uuid tenant_id FK
    }
    customers {
        uuid id PK
        uuid tenant_id FK
        enum type
        varchar first_name
        varchar last_name
        varchar email
        varchar company_name
        timestamptz deleted_at
        uuid created_by FK
        uuid updated_by FK
    }
    customer_contacts {
        uuid id PK
        uuid customer_id FK
        uuid tenant_id FK
        varchar name
        varchar email
        varchar phone
    }
    customer_addresses {
        uuid id PK
        uuid customer_id FK
        uuid tenant_id FK
        enum type
        varchar street
        uuid city_id FK
        uuid country_id FK
        varchar postal_code
    }
    travelers {
        uuid id PK
        uuid tenant_id FK
        uuid customer_id FK
        varchar first_name
        varchar last_name
        date date_of_birth
        enum gender
        uuid nationality_country_id FK
        varchar passport_number
        date passport_expiry
        timestamptz deleted_at
        uuid created_by FK
        uuid updated_by FK
    }
    packages {
        uuid id PK
        uuid tenant_id FK
        uuid destination_id FK
        varchar title
        integer duration_days
        enum status
        timestamptz deleted_at
        uuid created_by FK
        uuid updated_by FK
    }
    package_days {
        uuid id PK
        uuid package_id FK
        uuid tenant_id FK
        integer day_number
        varchar title
        text description
    }
    package_day_activities {
        uuid id PK
        uuid package_day_id FK
        uuid tenant_id FK
        varchar title
        text description
        time start_time
        time end_time
        varchar location
        integer sort_order
    }
    package_pricing {
        uuid id PK
        uuid package_id FK
        uuid tenant_id FK
        enum tier
        decimal amount
        char currency
    }
    package_media {
        uuid id PK
        uuid package_id FK
        uuid tenant_id FK
        text file_url
        integer sort_order
    }
    bookings {
        uuid id PK
        uuid tenant_id FK
        varchar reference_number
        uuid customer_id FK
        uuid package_id FK
        enum status
        enum payment_status
        decimal total_amount
        char currency
        date travel_date
        timestamptz deleted_at
        uuid created_by FK
        uuid updated_by FK
    }
    booking_items {
        uuid id PK
        uuid booking_id FK
        uuid tenant_id FK
        varchar description
        integer quantity
        decimal unit_price
        decimal total_price
    }
    booking_travelers {
        uuid id PK
        uuid booking_id FK
        uuid traveler_id FK
        uuid tenant_id FK
        boolean is_lead
        enum price_tier
    }
    booking_status_history {
        uuid id PK
        uuid booking_id FK
        uuid tenant_id FK
        enum from_status
        enum to_status
        uuid changed_by FK
    }
    booking_notes {
        uuid id PK
        uuid booking_id FK
        uuid tenant_id FK
        text note
        uuid created_by FK
    }
    booking_documents {
        uuid id PK
        uuid booking_id FK
        uuid tenant_id FK
        text file_url
        varchar file_name
        varchar file_type
        bigint file_size
        uuid uploaded_by FK
    }
    invoices {
        uuid id PK
        uuid tenant_id FK
        uuid booking_id FK
        varchar invoice_number
        enum status
        date issue_date
        date due_date
        decimal subtotal
        decimal tax_amount
        decimal total_amount
        char currency
        timestamptz deleted_at
        uuid created_by FK
        uuid updated_by FK
    }
    payments {
        uuid id PK
        uuid tenant_id FK
        uuid booking_id FK
        uuid invoice_id FK
        decimal amount
        enum method
        date payment_date
        timestamptz deleted_at
        uuid created_by FK
        uuid updated_by FK
    }
    payment_transactions {
        uuid id PK
        uuid payment_id FK
        uuid tenant_id FK
        enum transaction_type
        decimal amount
        jsonb metadata
    }
    notifications {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        varchar type
        varchar title
        text message
        varchar entity_type
        uuid entity_id
        boolean is_read
        timestamptz read_at
    }
    audit_logs {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        enum action
        varchar table_name
        uuid record_id
        jsonb old_data
        jsonb new_data
    }
```

---

## 3. Table Inventory

| # | Table | Category | Tenant-Scoped | Soft Delete | Audit Cols | Migration |
|---|-------|----------|:-------------:|:-----------:|:----------:|-----------|
| 1 | tenants | Core | n/a (root) | No | No | 001 |
| 2 | tenant_settings | Support | Yes | No | No | 001 |
| 3 | users | Core | Yes | No | No | 001 |
| 4 | roles | Lookup (global) | No | No | No | 001 |
| 5 | permissions | Lookup (global) | No | No | No | 001 |
| 6 | role_permissions | Junction | No | No | No | 001 |
| 7 | user_roles | Junction | Yes | No | No | 001 |
| 8 | countries | Lookup (global) | No | No | No | 002 |
| 9 | cities | Lookup (global) | No | No | No | 002 |
| 10 | destinations | Lookup (tenant) | Yes | Yes | Yes | 002 |
| 11 | customers | Core | Yes | Yes | Yes | 003 |
| 12 | customer_contacts | Support | Yes | No | No | 003 |
| 13 | customer_addresses | Support | Yes | No | No | 003 |
| 14 | travelers | Core | Yes | Yes | Yes | 003 |
| 15 | packages | Core | Yes | Yes | Yes | 003 |
| 16 | package_days | Transaction | Yes | No | No | 003 |
| 17 | package_day_activities | Transaction | Yes | No | No | 003 |
| 18 | package_pricing | Transaction | Yes | No | No | 003 |
| 19 | package_media | Support | Yes | No | No | 003 |
| 20 | bookings | Core/Transaction | Yes | Yes | Yes | 004 |
| 21 | booking_items | Transaction | Yes | No | No | 004 |
| 22 | booking_travelers | Junction | Yes | No | No | 004 |
| 23 | booking_status_history | Transaction (ledger) | Yes | No | No | 004 |
| 24 | booking_notes | Support | Yes | No | partial | 004 |
| 25 | booking_documents | Support | Yes | No | partial | 004 |
| 26 | invoices | Transaction | Yes | Yes | Yes | 004 |
| 27 | payments | Transaction | Yes | Yes | Yes | 004 |
| 28 | payment_transactions | Transaction (ledger) | Yes | No | No | 004 |
| 29 | notifications | Support | Yes | No | No | 005 |
| 30 | audit_logs | Audit | Yes | No | No | 005 |

**Total: 30 tables** (MVP operational schema).

---

## 4. Recommended AI & Support ERD (Phase 5 — not migrated)

The following entities are **recommended** for Knowledge, Booking, and Support agents. See [DECISIONS.md](../01-Product/DECISIONS.md) D-006–D-008.

```mermaid
erDiagram
    tenants ||--o{ ai_agents : configures
    tenants ||--o{ knowledge_documents : owns
    knowledge_documents ||--o{ knowledge_chunks : contains
    users ||--o{ ai_sessions : has
    users ||--o{ ai_conversations : starts
    ai_conversations ||--o{ ai_messages : contains
    ai_messages ||--o{ ai_feedback : receives
    ai_conversations ||--o{ ai_logs : generates
    tenants ||--o{ support_tickets : owns
    customers ||--o{ support_tickets : raises
    bookings ||--o{ support_tickets : relates
    users ||--o{ support_tickets : assigned
    support_tickets ||--o{ support_ticket_messages : contains

    ai_agents {
        uuid id PK
        uuid tenant_id FK
        string agent_key
        boolean enabled
    }
    knowledge_documents {
        uuid id PK
        uuid tenant_id FK
        string title
        string document_type
        string storage_path
    }
    knowledge_chunks {
        uuid id PK
        uuid document_id FK
        text content
        vector embedding
    }
    ai_conversations {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        string agent_key
    }
    ai_messages {
        uuid id PK
        uuid conversation_id FK
        string role
        text content
    }
    support_tickets {
        uuid id PK
        uuid tenant_id FK
        string ticket_number
        string status
        uuid customer_id FK
        uuid booking_id FK
    }
```

**Migration policy:** Document only until Phase 5 implementation gate passes.
