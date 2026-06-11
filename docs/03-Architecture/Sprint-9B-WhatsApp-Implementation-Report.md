# TravelOS Sprint 9B — WhatsApp Communications Implementation Report

**Sprint:** 9B  
**Status:** Implemented per approved architecture review  
**Date:** 2026-06-04  
**Scope:** Meta Cloud API template-only outbound WhatsApp; no inbound chat, SMS, push, Twilio production, or reminders.

---

## 1. Migration Summary

| Migration | Purpose |
|-----------|---------|
| `051_whatsapp_templates.sql` | `whatsapp_templates`, `tenant_whatsapp_settings`, enums (`whatsapp_template_language`, `whatsapp_meta_approval_status`, `whatsapp_provider`) |
| `052_whatsapp_messages.sql` | Outbound `whatsapp_messages` audit log with quotation/booking linkage |
| `053_whatsapp_preferences.sql` | `customer_communication_preferences` (opt-in/out, language, quiet hours) |
| `054_whatsapp_rls.sql` | RLS for all new tables; CRM permissions `crm.whatsapp.*` |
| `055_notification_delivery_whatsapp.sql` | Extends `notification_delivery_channel` (+`whatsapp`), `event_dispatch_job_type` (+`dispatch.whatsapp`), `notification_recipient_type` (+`phone_number`); FK from messages → deliveries |

**Not implemented:** `056` provider event analytics (deferred).

Apply: `npm run db:sync && npm run db:push` (or run SQL in Supabase dashboard).

---

## 2. WhatsApp Architecture Summary

Unchanged platform primitives (per approved review):

- `domain_events` — canonical facts
- `event_dispatch_jobs` — async queue (+ new job type `dispatch.whatsapp`)
- `notification_deliveries` — per-channel outcomes (+ channel `whatsapp`)

**New:** `WhatsAppDispatcher` as a **subscriber only** — same pattern as `EmailDispatcher` / `NotificationDispatcher`. No changes to event emission authority (server-side API only).

```
domain_event (quotation.sent | quotation.accepted | payment.completed | booking.created)
  → JobQueueService.enqueueForEvent() → dispatch.whatsapp job
  → EventDispatchWorker → WhatsAppDispatcher.process()
       → preferences + approved template + phone
       → MetaCloudAdapter.sendTemplateMessage()
       → whatsapp_messages + notification_deliveries
```

---

## 3. Meta Cloud Integration Summary

| Component | Location |
|-----------|----------|
| `WhatsAppProviderAdapter` | `src/lib/whatsapp/whatsapp-provider-adapter.ts` |
| `MetaCloudAdapter` | `src/lib/whatsapp/meta-cloud-adapter.ts` |
| `MockWhatsAppAdapter` | `src/lib/whatsapp/mock-whatsapp-adapter.ts` |
| `TwilioAdapter` (stub) | `src/lib/whatsapp/twilio-adapter.ts` |

**Capabilities:** `sendTemplateMessage()`, `verifyWebhook()` (HMAC SHA-256 `X-Hub-Signature-256`), `normalizeStatusEvent()` (sent / delivered / read / failed).

**Mock mode:** `WHATSAPP_MOCK_MODE=true` or missing `WHATSAPP_META_ACCESS_TOKEN` — used for local dev and gates.

**Env:** See `.env.example` (`WHATSAPP_META_*`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`).

---

## 4. Template System Summary

- Table: `whatsapp_templates` (per tenant, per `internal_name` + `language`).
- Meta approval: `meta_status` — **only `approved` templates send** (automated dispatcher and CRM manual send).
- Admin UI: `/crm/whatsapp/templates` (create, list, mark approved).
- API: `GET/POST /api/crm/whatsapp/templates`, `PATCH/DELETE /api/crm/whatsapp/templates/[id]`.
- Languages: `en`, `ar`.
- Map automated sends: `event_type` column matches domain event string (e.g. `quotation.sent`).

---

## 5. Preference Management Summary

- Table: `customer_communication_preferences`
- Fields: `whatsapp_opt_in_at`, `whatsapp_opt_out_at`, `preferred_language`, `quiet_hours_*`
- Portal: `/portal/preferences` + `GET/PATCH /api/portal/preferences`
- CRM: Customer 360 communication panel + `GET/PATCH /api/customers/[id]/communication-preferences`
- Dispatcher skips send when not opted in or within quiet hours.

---

## 6. CRM Integration Summary

| Feature | Implementation |
|---------|----------------|
| Send WhatsApp | `WhatsAppSendPanel` + `POST /api/crm/whatsapp/send` |
| Template picker | Approved templates from tenant registry |
| Customer message history | `WhatsAppMessageHistory` + `GET /api/crm/whatsapp/messages?customer_id=` |
| Quotation history | Same API with `quotation_id` on quotation show page |
| Booking history | Same API with `booking_id` (when booking context provided) |
| `quotation.sent` event | Emitted from `POST /api/quotations/[id]/send` |

**Out of scope:** CRM mobile send, inbox, free-form text, two-way chat.

---

## 7. Webhook Security Report

**Endpoint:** `GET/POST /api/webhooks/whatsapp`

| Control | Behavior |
|---------|----------|
| Verification (GET) | Meta `hub.verify_token` must match `WHATSAPP_WEBHOOK_VERIFY_TOKEN` (skipped in mock mode) |
| Signature (POST) | `X-Hub-Signature-256` HMAC with `WHATSAPP_META_APP_SECRET`; 401 if invalid |
| Payload | Status events only — **no inbound customer message processing** |
| Idempotency | Status updates ignore downgrades; unique index on `(tenant_id, provider_message_id)` |
| Tenant isolation | Messages resolved by `provider_message_id` within stored rows (tenant-scoped data) |

---

## 8. Testing Report

| Suite | Command |
|-------|---------|
| Unit | `npm run test:whatsapp` (8 tests: phone, opt-in, events, Meta normalize, mock send, job key) |
| Gate | `npm run gate:sprint9b:whatsapp` (schema, enqueue, delivery row, idempotency, isolation) |
| Worker | Reuse `npm run gate:sprint8d:worker` after migrations (whatsapp job type in DB enum) |

**Covered:** dispatcher config, template variables, opt-in logic, Meta webhook normalization, duplicate job enqueue, cross-tenant message isolation.

**Manual:** Configure Meta WABA, approved templates, enable `tenant_whatsapp_settings.whatsapp_enabled`, opt-in test customer, run cron worker.

---

## 9. Production Readiness Assessment

| Area | Status | Notes |
|------|--------|-------|
| Schema & RLS | Ready after migration apply | Service role for dispatcher/webhooks; staff/portal policies on new tables |
| Provider | Ready with credentials | Production requires real Meta token, phone number ID, app secret |
| Async worker | Ready | `dispatch.whatsapp` wired in `EventDispatchWorker` |
| Observability | Ready | Operations dashboard WhatsApp 24h metrics |
| Portal / CRM UX | Ready | Preferences + template send + history |
| Deferred | Not blocking 9B | 056 analytics, reminders, Twilio, inbound chat, mobile CRM send |

**Pre-go-live checklist:**

1. Apply migrations 051–055.
2. Set Meta env vars; disable mock mode in production.
3. Register webhook URL with Meta; set verify token.
4. Seed approved templates per event type (EN + AR).
5. Enable WhatsApp per tenant; obtain customer opt-in via portal.
6. Run `gate:sprint9b:whatsapp` and `gate:sprint8d:worker` against staging.

---

## Operations Dashboard

Extended metrics: sent, delivered, read, failed, failure rate (24h) from `whatsapp_messages`.

---

## Files of Note

- Dispatcher: `src/lib/whatsapp/whatsapp-dispatcher.ts`
- Worker wiring: `src/lib/events/event-dispatch-worker.ts`, `src/lib/events/job-queue-service.ts`
- Gate: `scripts/run-sprint9b-whatsapp-gate.mjs`
