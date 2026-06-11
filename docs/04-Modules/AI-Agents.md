# AI Agents Module

**Version:** 1.0 — Approved  
**Module ID:** AI  
**Phase:** 5 (Foundation), 6 (Expansion)  
**Last Updated:** 2026-06-02

---

## Purpose

Deliver the **TravelOS AI Platform**: three approved agents (Knowledge, Booking, Support) that assist agency staff with retrieval, sales operations, and customer support — under strict tenant isolation and human-in-the-loop controls.

---

## Agents in Scope

| Agent | Primary users | Module touchpoints |
|-------|---------------|-------------------|
| Knowledge Agent | All staff | Platform, Packages (read), Policies |
| Booking Agent | Sales Agent, Admin | [Bookings](./Bookings.md), Customers, Packages |
| Support Agent | Support staff, Sales | [Customers](./Customers.md), Bookings (read) |

Architecture detail: [AIArchitecture.md](../../ai/AIArchitecture.md).  
**How-to & testing:** [AI-Agents-Guide.md](../05-Development/AI-Agents-Guide.md).

---

## Business Processes

### Knowledge retrieval (internal)

1. Staff opens Knowledge chat in admin UI
2. Question embedded and matched against tenant knowledge chunks
3. Answer returned with citations
4. Feedback captured (helpful / not helpful)

### Booking assistance

1. Sales describes customer need in chat
2. Agent recommends packages and collects traveler details
3. Agent creates **draft** booking via tools
4. Staff reviews in Booking UI and confirms via standard workflow

See [booking-agent-workflow.md](../../ai/workflows/booking-agent-workflow.md).

### Support automation

1. Staff or (future) customer asks support question
2. Agent answers from FAQ/policy RAG or booking lookup
3. If unresolved, agent creates support ticket and suggests escalation
4. Human resolves ticket; status updated in CRM view

---

## User Stories

| ID | Story | Agent |
|----|-------|-------|
| US-AI-KNOW-001 | Search company knowledge | Knowledge |
| US-AI-KNOW-002 | Retrieve package policies | Knowledge |
| US-AI-KNOW-003 | Retrieve supplier information | Knowledge |
| US-AI-BKG-001 | Create booking from chat | Booking |
| US-AI-BKG-002 | Update booking from chat | Booking |
| US-AI-BKG-003 | Check booking status | Booking |
| US-AI-BKG-004 | Suggest packages | Booking |
| US-AI-BKG-005 | Collect traveler information | Booking |
| US-AI-SUP-001 | Answer customer questions | Support |
| US-AI-SUP-002 | Open support ticket | Support |
| US-AI-SUP-003 | Escalate support issue | Support |
| US-AI-SUP-004 | Track booking-related issues | Support |

Full definitions: [UserStories.md](../02-Business/UserStories.md).

---

## Functional Requirements (summary)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-AI-001 | Knowledge Agent answers from tenant knowledge base with citations | Must (Ph5) |
| FR-AI-002 | Booking Agent creates/updates **draft** bookings only | Must (Ph5) |
| FR-AI-003 | Booking Agent proposes cancellations; staff executes | Must (Ph5) |
| FR-AI-004 | Support Agent creates and updates support tickets | Must (Ph5) |
| FR-AI-005 | All agent calls enforce RBAC and tenant_id | Must (Ph5) |
| FR-AI-006 | Agent conversations and tool calls logged | Must (Ph5) |
| FR-AI-007 | Knowledge document upload and chunk indexing (admin) | Should (Ph5) |
| FR-AI-008 | Multi-agent orchestration router | POST-MVP (Ph6) |
| FR-AI-009 | Agent analytics dashboard (`/ai/analytics`) | Implemented (V1 KPIs) |

See [Requirements.md](../02-Business/Requirements.md) §1.8.

---

## API Endpoints (planned)

| Method | Path | Agent | Permission |
|--------|------|-------|------------|
| POST | /api/ai/knowledge-agent | Knowledge | `ai.knowledge.use` |
| POST | /api/ai/booking-agent | Booking | `ai.booking.use` |
| POST | /api/ai/support-agent | Support | `ai.support.use` |
| GET | /api/ai/conversations | All | `ai.read` |
| POST | /api/knowledge/documents | Knowledge Admin | `knowledge.manage` |

Existing: `src/app/api/ai/booking-agent/route.ts`.

---

## Permissions (proposed)

| Action | Super Admin | Tenant Admin | Sales Agent | Finance Officer |
|--------|:-----------:|:------------:|:-----------:|:---------------:|
| Use Knowledge Agent | Yes | Yes | Yes | Yes |
| Use Booking Agent | Yes | Yes | Yes | No |
| Use Support Agent | Yes | Yes | Yes | Yes |
| Manage knowledge docs | Yes | Yes | No | No |
| View agent logs | Yes | Yes | No | No |

Add to [RBAC.md](../03-Architecture/RBAC.md) during implementation.

---

## Database Tables (recommended — not migrated)

| Table | Purpose |
|-------|---------|
| ai_agents | Agent registry per tenant/platform |
| ai_sessions | Browser/session binding |
| ai_conversations | Thread header |
| ai_messages | User/assistant/tool messages |
| ai_logs | Tool calls, latency, errors |
| ai_feedback | Thumbs up/down, corrections |
| knowledge_documents | Source files metadata |
| knowledge_chunks | RAG chunks + embeddings |
| support_tickets | Support cases |
| support_ticket_messages | Ticket thread |

See [DatabaseDesign.md](../03-Architecture/DatabaseDesign.md) §8.

---

## UI Screens (planned)

| Screen | Route | Description |
|--------|-------|-------------|
| Knowledge Chat | /ai/knowledge | Internal Q&A |
| Booking Assistant | /ai/booking | Sales chat + draft preview |
| Support Console | /ai/support | Tickets + customer chat |
| Knowledge Admin | /settings/knowledge | Upload / reindex docs |

---

## Error Handling

| Error | Code | Message |
|-------|------|---------|
| Tenant context missing | 403 | Agent unavailable without tenant session |
| RAG empty | 404 | No knowledge indexed for this topic |
| Draft only violation | 422 | Agent cannot confirm bookings |
| Rate limit | 429 | Too many agent requests |

---

## Out of Scope (Phase 5)

- Autonomous booking confirmation
- Payment initiation via agent
- Public customer-facing chat (Phase 6+ channel work)
- Voice telephony (Phase 6 readiness only)
