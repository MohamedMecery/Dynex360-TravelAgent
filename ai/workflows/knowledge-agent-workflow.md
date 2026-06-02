# Knowledge Agent Workflow

**Version:** 1.0  
**Status:** Approved (Phase 5) — documentation only  
**Last Updated:** 2026-06-02

---

## Overview

Internal staff ask questions; the agent retrieves tenant-scoped chunks and responds with citations. No writes to bookings, customers, or payments.

## Process

```mermaid
flowchart TD
    A[User submits question] --> B{Session exists?}
    B -->|No| C[Create ai_conversation]
    B -->|Yes| D[Load message history]
    C --> D
    D --> E[Embed query]
    E --> F[Retrieve top-k chunks filtered by tenant_id]
    F --> G{Chunks found?}
    G -->|No| H[Respond: no documented guidance]
    G -->|Yes| I[LLM answer with citations]
    I --> J[Persist ai_messages + ai_logs]
    J --> K[Return to UI]
```

## Roles

| Role | Can use |
|------|---------|
| Sales Agent | Yes |
| Finance Officer | Yes |
| Tenant Admin | Yes + manage documents |

## Related

- [AIArchitecture.md](../AIArchitecture.md) §2
- [knowledge-base.md](../rag/knowledge-base.md)
