# TravelOS Mobile — Release Checklist (Sprint 7E)

## Environment variables (production)

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Publishable/anon key |
| `EXPO_PUBLIC_API_BASE_URL` | Next.js API origin (HTTPS only) |

Store secrets in EAS Secrets — never commit `.env.production`.

## Build profiles (`apps/mobile/eas.json`)

| Profile | Use |
|---------|-----|
| `development` | Dev client + local API |
| `preview` | Internal QA APK / simulator |
| `production` | Store builds (auto-increment version) |

```bash
cd apps/mobile
eas build --profile preview --platform android
eas build --profile production --platform all
```

## Versioning

- **App version:** `apps/mobile/package.json` `version`
- **Build number:** EAS `autoIncrement` on production profile
- Tag releases: `mobile/v0.1.0`

## Pre-release gates

1. `npm run typecheck` in `apps/mobile`
2. `node scripts/run-sprint7e-mobile-uat.mjs` against staging API
3. Maestro smoke: `maestro test apps/mobile/maestro/flows/01-login.yaml`
4. Manual RTL pass on Android + iOS (Arabic locale in More)
5. Security: Bearer-only API, no service role in app bundle

## Crash & error monitoring (recommended)

- **Sentry:** `@sentry/react-native` + `SENTRY_DSN` EAS secret
- **Expo Updates:** channel `production` for OTA JS fixes (no native changes)

## Go-live

- [ ] Staging UAT JSON: `scripts/sprint7e-mobile-uat-results.json` all PASS
- [ ] Play Console / TestFlight internal track uploaded
- [ ] Deep links verified: `travelos://quotation/:id`, `booking/:id`, `customer/:id/360`
- [ ] Rollback plan documented (previous build ID in EAS)
