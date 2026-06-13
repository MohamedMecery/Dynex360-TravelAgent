# Cron Migration — Vercel Cron → n8n

The project had **one** Vercel cron (`vercel.json`). On the VPS, Vercel Cron does not
exist; replace it with an n8n Schedule workflow that calls the same endpoint.

## Mapping

| Vercel cron (`vercel.json`)            | Schedule        | Target endpoint                                   |
|----------------------------------------|-----------------|---------------------------------------------------|
| `/api/cron/process-dispatch-jobs`      | `*/2 * * * *`   | `GET https://travelos.srv1754043.hstgr.cloud/api/cron/process-dispatch-jobs` |

Runs every 2 minutes. Drains pending event-dispatch jobs (batch size 20).

## Endpoint auth

The route authorizes via either header (see
`src/app/api/cron/process-dispatch-jobs/route.ts`):

- `Authorization: Bearer <CRON_SECRET>`  ← use this, matches Vercel's behavior
- `x-cron-secret: <CRON_SECRET>`

`CRON_SECRET` must equal the value in `/docker/travelos/.env`.

## n8n workflow setup (https://n8n.srv1754043.hstgr.cloud)

1. **Schedule Trigger** node
   - Trigger Interval: *Cron Expression* → `*/2 * * * *`
2. **HTTP Request** node
   - Method: `GET`
   - URL: `https://travelos.srv1754043.hstgr.cloud/api/cron/process-dispatch-jobs`
   - Authentication: *Generic Credential Type* → *Header Auth*
     - Name: `Authorization`
     - Value: `Bearer <CRON_SECRET>`   (store as an n8n credential, not inline)
   - Options → Timeout: `30000` ms
   - On error: *Continue* (next run retries; jobs are idempotent / re-polled)
3. Activate the workflow.

> n8n and TravelOS share the same Docker host + Traefik. n8n can reach the app over
> the public HTTPS URL (simplest) or, if preferred, internally as
> `http://travelos:3000/...` since both join the `n8n_default` network — internal
> avoids a TLS round-trip but skips the public path. Public URL is recommended for
> parity with how it ran on Vercel.

## Verify after setup

```bash
# Manual hit with the secret should return 200 + { "data": ... }
curl -s -H "Authorization: Bearer <CRON_SECRET>" \
  https://travelos.srv1754043.hstgr.cloud/api/cron/process-dispatch-jobs

# Without/with wrong secret should return 401
curl -s -o /dev/null -w "%{http_code}\n" \
  https://travelos.srv1754043.hstgr.cloud/api/cron/process-dispatch-jobs   # -> 401
```
