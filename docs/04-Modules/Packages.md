# Packages Module

**Version:** 1.0 — MVP  
**Module ID:** PKG

---

## Purpose

Manage travel package catalog including itineraries, pricing tiers, and media. Only published packages are available for booking.

## Business Processes

- Package creation (draft → published → archived)
- Itinerary day management
- Pricing tier configuration

See [BusinessFlows.md](../02-Business/BusinessFlows.md) — Section 3.

## User Stories

| ID | Story |
|----|-------|
| US-PKG-001 | Create package |
| US-PKG-002 | Add itinerary days |
| US-PKG-003 | Set pricing tiers |
| US-PKG-004 | Save as draft |
| US-PKG-005 | Publish package |
| US-PKG-006 | Archive package |
| US-PKG-007 | Search packages |
| US-PKG-008 | Upload cover image |

## Business Rules

- BR-002: Only published packages selectable for bookings
- Status transitions: draft → published → archived
- Package must have at least one itinerary day and pricing tier to publish

## Database Tables

| Table | Description |
|-------|-------------|
| packages | Core package record |
| package_itineraries | Daily itinerary items |
| package_pricing | Pricing tiers (adult, child, infant) |
| package_media | Images and media files |

## API Endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | /api/packages | packages.read | List packages (filterable) |
| GET | /api/packages/:id | packages.read | Get package detail with itinerary + pricing |
| POST | /api/packages | packages.create | Create package (draft) |
| PUT | /api/packages/:id | packages.update | Update package |
| DELETE | /api/packages/:id | packages.delete | Soft delete package |
| POST | /api/packages/:id/publish | packages.publish | Publish package |
| POST | /api/packages/:id/archive | packages.publish | Archive package |
| GET | /api/packages/:id/itinerary | packages.read | List itinerary days |
| POST | /api/packages/:id/itinerary | packages.create | Add itinerary day |
| PUT | /api/packages/:id/itinerary/:dayId | packages.update | Update itinerary day |
| DELETE | /api/packages/:id/itinerary/:dayId | packages.delete | Delete itinerary day |
| GET | /api/packages/:id/pricing | packages.read | List pricing tiers |
| PUT | /api/packages/:id/pricing | packages.update | Upsert pricing tiers |
| POST | /api/packages/:id/media | packages.update | Upload cover image |

## Permissions

| Action | Super Admin | Tenant Admin | Sales Agent | Finance Officer |
|--------|:-----------:|:------------:|:-----------:|:---------------:|
| Create | Yes | Yes | Yes | No |
| Read | Yes | Yes | Yes | Yes |
| Update | Yes | Yes | Yes | No |
| Delete | Yes | Yes | No | No |
| Publish | Yes | Yes | Yes | No |

## UI Screens

| Screen | Route | Description |
|--------|-------|-------------|
| Package List | /packages | Filterable table: title, destination, status |
| Package Create | /packages/create | Form: title, description, destination, duration |
| Package Detail | /packages/:id | Itinerary, pricing, media, status actions |
| Package Edit | /packages/:id/edit | Edit basic info |

## Validation Rules

| Field | Rule |
|-------|------|
| title | Required, max 255 chars |
| destination | Optional, max 255 chars |
| duration_days | Optional, positive integer |
| status | Enum: draft, published, archived |
| pricing.amount | Required for publish, positive decimal |
| itinerary.day_number | Required, positive integer, unique per package |

## Error Handling

| Error | Code | Message |
|-------|------|---------|
| Cannot publish | 422 | Package must have itinerary and pricing before publishing |
| Not found | 404 | Package not found |
| Already archived | 422 | Package is already archived |
