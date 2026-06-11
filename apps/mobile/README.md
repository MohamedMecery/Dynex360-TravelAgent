# TravelOS Mobile (Expo)

Sprint 7C — CRM Dashboard, Leads, Opportunities, and Activities are implemented. Sprint 7D adds Quotations, Bookings, and Customer 360.

## Setup

1. Copy `.env.example` to `.env` and set Supabase + API URLs.
2. Install dependencies: `npm install` (from this directory).
3. Start Expo: `npm start`.
4. Ensure the Next.js API is running at `EXPO_PUBLIC_API_URL`.

## Deep links

Scheme: `travelos://` (see `app.json`).

Examples:

- `travelos://login`
- `travelos://home`

## Architecture

- Supabase Auth with Expo SecureStore session persistence
- TravelOS REST API via Bearer JWT (`src/lib/api-client.ts`)
- No direct Supabase reads for CRM data (API-only)
- CRM modules: Dashboard, Leads, Pipeline (Opportunities), Activities
