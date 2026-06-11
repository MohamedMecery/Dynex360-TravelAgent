# TravelOS Known Limitations

**Audience:** Pilot stakeholders, operations, engineering  
**Baseline:** Sprint 9E pilot readiness (~92%)  
**Last updated:** 2026-06-04

---

## Platform scope

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| Single role per staff user | No multi-hat permissions without role change | Use tenant_admin sparingly |
| No Operations Officer / Support roles in MVP | Support workflows use sales + AI support agent | Plan role expansion post-pilot |
| Mobile separate release track | Pilot web may lead mobile store release | Use web for admin tasks until mobile GA |
| English + Arabic UI | Partial AR coverage on some screens | Prioritize pilot-critical flows for AR QA |

---

## CRM

| Limitation | Detail |
|------------|--------|
| No separate CRM account entity | Customers are shared `customers` table |
| No package on opportunity | Package only via quotation line items |
| Finance read-only CRM | Cannot edit leads/opportunities/quotations |
| Owner-based RLS | Sales agents cannot see peers' records without read_all |
| Quotation approval | Standard mode requires tenant_admin approve |
| One active accepted quote | Policy per opportunity — conflicts return 409 |

---

## Customer portal

| Limitation | Detail |
|------------|--------|
| No staff impersonation of customer | Must provision real portal account |
| Draft quotations hidden | Customers never see internal draft/approval states |
| No portal-side booking edits | Read-only booking data |
| Password reset depends on Supabase SMTP | Separate from Resend app email |
| 404 on cross-customer IDs | By design (anti-enumeration) |

---

## Payments

| Limitation | Detail |
|------------|--------|
| Paymob only (production) | Stripe adapter is stub |
| Tenant must enable payments | Disabled by default in `tenant_payment_settings` |
| Deposit automation creates **draft** booking | Staff must confirm booking (`confirm_on_deposit=false`) |
| No refund UI | Manual reconciliation via Paymob + ledger |
| No installments / split pay UI | Single checkout intent per flow |
| Mock modes forbidden in prod | Enabling mocks breaks audit/compliance |
| Timeline payment events (051) | Not implemented — limited payment timeline in portal |

---

## WhatsApp

| Limitation | Detail |
|------------|--------|
| Template-only outbound | No free-form chat or inbound message handling |
| Meta approval required | Unapproved templates never send |
| Customer opt-in required | Dispatcher skips without opt-in |
| Quiet hours | Messages deferred/skipped — not queued for later auto-send in all cases |
| No mobile CRM send | Web CRM only |
| Twilio adapter stub | Meta Cloud is production path |
| No reminder campaigns | Deferred post-9B |
| Analytics migration 056 | Not implemented |

---

## AI

| Limitation | Detail |
|------------|--------|
| No autonomous writes | All mutations require human or explicit API |
| Scoring latency | Minutes — depends on cron worker, not real-time |
| Rule-based engines only | No ML forecasting in pilot |
| Token budgets | Per-tenant monthly cap in `ai_agents.config` |
| finance_officer excluded | No sales/ops/booking agents for finance role |
| Sales insights admin-only | `ai.sales.insights.read` not for sales_agent |
| No customer-facing AI | Portal has no AI chat |
| Multi-agent orchestration | Post-MVP (FR-AI-008) |
| LLM dependency | Requires `ANTHROPIC_API_KEY`; degraded mode without |

---

## Async operations

| Limitation | Detail |
|------------|--------|
| Notifications not instantaneous | SLA minutes, not seconds |
| Cron single point | Missed cron intervals delay all channels |
| Dead-letter manual recovery | Ops must replay after fixing root cause |
| Stuck `processing` jobs | Requires engineering intervention if lock stale |
| Scheduled automations framework | Present but pilot uses event-driven only |

---

## Security & compliance

| Limitation | Detail |
|------------|--------|
| JWT claims are UX hints | DB `users` + RLS authoritative |
| Service role highly privileged | Must never ship to client |
| Webhook replay | Mitigated by idempotency — monitor duplicates in Paymob |
| CI Supabase project | Must not be used for pilot — seed overwrite risk |
| Preview deployments | Need separate env or caution with production DB |

---

## Integrations

| Limitation | Detail |
|------------|--------|
| Email dual path | App (Resend) + Auth (Supabase SMTP) must both work |
| Paymob region | Primarily MENA; currency/policy per tenant |
| Meta WABA setup | Manual Business Manager onboarding per agency brand |
| OpenAI optional | RAG embeddings skipped if key missing |

---

## Testing & observability

| Limitation | Detail |
|------------|--------|
| Gates require running server | Not pure unit-test coverage of full journey |
| E2E may skip live Paymob/WhatsApp | Mock flags in CI only |
| No built-in APM | Relies on Vercel logs + Supabase dashboard |
| Commercial gate needs provisioned portal user | Script-assisted setup |

---

## Operational considerations

| Topic | Consideration |
|-------|---------------|
| Migration drift | Always `db:push` on clone before comparing schema |
| Mock flags in production | Launch blocker — validate with `PRODUCTION_CHECK=1` |
| Queue depth spikes | Marketing send (quotation.sent) may spike WhatsApp jobs |
| AI cost | Monitor Anthropic usage during pilot |
| Data residency | Supabase region chosen at project create — hard to move |
| Backup/restore | Monthly drill recommended; not automated in app |
| At least one tenant_admin | Lockout risk if all admins deactivated |

---

## Go-live conditions (summary)

From Pilot Launch Readiness Report — pilot **GO WITH CONDITIONS** when:

1. Migrations 001–064 applied  
2. Production env validator passes  
3. Cron + `CRON_SECRET` operational  
4. Paymob/WhatsApp mocks disabled  
5. Commercial journey gate PASS on staging  
6. Resend + Supabase Auth SMTP verified  
7. Onboarding runbooks delivered to ops  

---

## Related documents

- [docs/03-Architecture/TravelOS-Pilot-Launch-Readiness-Report.md](../03-Architecture/TravelOS-Pilot-Launch-Readiness-Report.md)
- [16-production-runbooks.md](./16-production-runbooks.md)
- [14-environment-config.md](./14-environment-config.md)
