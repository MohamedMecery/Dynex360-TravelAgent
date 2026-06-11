# TravelOS Mobile — Maestro E2E

## Prerequisites

- [Maestro CLI](https://maestro.mobile.dev/) installed
- Expo dev build or simulator with app running
- Demo tenant credentials (`wp3a-sales@demo.travelos.local`)

## Run all flows

```bash
cd apps/mobile
maestro test maestro/flows/
```

## CI

GitHub Actions job `mobile-maestro` runs when `MAESTRO_CLOUD_API_KEY` is configured; otherwise flows are validated in `mobile-ci` via typecheck + HTTP UAT only.

## Flow index

| Flow | Coverage |
|------|----------|
| `01-login.yaml` | Authentication |
| `02-leads-list.yaml` | Leads tab |
| `03-quotations-list.yaml` | More → Quotations |
| `04-bookings-list.yaml` | More → Bookings |
| `05-arabic-rtl.yaml` | Locale switch |

Extended flows (quotation approval, convert, booking status) require stable test data IDs — use `scripts/run-sprint7e-mobile-uat.mjs` for API lifecycle validation.
