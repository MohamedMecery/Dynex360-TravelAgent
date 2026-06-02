# Support Agent Workflow

**Version:** 1.0  
**Status:** Approved (Phase 5) — documentation only  
**Last Updated:** 2026-06-02

---

## Overview

Support staff (or future customer channels) describe issues; the agent answers from FAQ/policy RAG, looks up bookings, and creates or escalates tickets.

## Process

```mermaid
flowchart TD
    A[Inbound question] --> B[Classify: FAQ vs booking vs escalation]
    B -->|FAQ| C[RAG retrieval]
    B -->|Booking| D[get_booking / get_customer tools]
    B -->|Escalation| E[create_support_ticket]
    C --> F[Generate answer + citations]
    D --> F
    E --> G[Assign user + notify]
    F --> H{Resolved?}
    H -->|No| E
    H -->|Yes| I[Close or leave open]
    I --> J[Log ai_messages]
```

## Ticket states

`open` → `pending` → `escalated` → `resolved` → `closed`

## Related

- [AIArchitecture.md](../AIArchitecture.md) §4
- [Customers.md](../../docs/04-Modules/Customers.md) — CRM integration
