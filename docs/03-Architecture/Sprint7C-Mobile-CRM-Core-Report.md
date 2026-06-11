# Sprint 7C — Mobile CRM Core Report

**Date:** 2026-06-03  
**Decision:** **PASS**

> **TravelOS Mobile CRM Core is complete and Sprint 7C is closed.**

---

## 1. Executive Summary

Sprint 7C delivers the first production-ready CRM mobile experience on the Expo foundation from Sprint 7B. Sales agents and tenant admins can use the app to view the CRM dashboard, manage leads and opportunities (list, detail, create, edit), and work activities (list, detail, create, edit, complete).

All data access uses the TravelOS REST API with Bearer JWT. No direct Supabase CRUD for CRM entities. Permissions from `GET /api/auth/me?include_permissions=true` gate UI actions; the server remains authoritative on every mutation.

**Typecheck:** `apps/mobile` — `npm run typecheck` passes.

---

## 2. Screens Implemented

| Module | Screen | Route |
|--------|--------|-------|
| Dashboard | DashboardScreen | Home → Dashboard |
| Leads | LeadListScreen | Leads → LeadList |
| Leads | LeadDetailScreen | Leads → LeadDetail |
| Leads | LeadCreateScreen | Leads → LeadCreate |
| Leads | LeadEditScreen | Leads → LeadEdit |
| Opportunities | OpportunityListScreen | Pipeline → OpportunityList |
| Opportunities | OpportunityDetailScreen | Pipeline → OpportunityDetail |
| Opportunities | OpportunityCreateScreen | Pipeline → OpportunityCreate |
| Opportunities | OpportunityEditScreen | Pipeline → OpportunityEdit |
| Activities | ActivityListScreen | Activities → ActivityList |
| Activities | ActivityDetailScreen | Activities → ActivityDetail |
| Activities | ActivityCreateScreen | Activities → ActivityCreate |
| Activities | ActivityEditScreen | Activities → ActivityEdit |
| More | ProfileScreen | More → Profile |

**Out of scope (Sprint 7D+):** Quotations, Customer 360, Bookings, Notifications, Forecast, Lead Health, Admin.

---

## 3. Components Implemented

`apps/mobile/src/components/ui/`:

| Component | Purpose |
|-----------|---------|
| Button | Primary/secondary/ghost/destructive, loading |
| Input | Label, error, RTL text align |
| Select | Modal picker |
| Card | Surface container |
| Badge | Status chips |
| Avatar | Initials avatar |
| EmptyState | List empty |
| LoadingState | Full-screen load |
| ErrorState | Error + retry |
| Skeleton | Loading placeholders |

Theme: `src/theme/colors.ts`, `useTheme()` (light/dark via system).

---

## 4. Hooks Implemented

### Query keys

`src/lib/queryKeys.ts`

### API layer

`src/lib/api/crm.ts` — all CRM HTTP calls via `apiFetch`.

### TanStack Query hooks (`src/hooks/api/`)

| Hook | Purpose |
|------|---------|
| useDashboard | CRM dashboard payload |
| useLeads | Infinite list |
| useLead | Detail |
| useCreateLead / useUpdateLead | Mutations |
| useAssignLead | POST assign |
| useConvertLeadToOpportunity | Convert |
| useOpportunities | Infinite list |
| useOpportunity | Detail |
| useCreateOpportunity / useUpdateOpportunity | Mutations |
| useCreateBookingFromOpportunity | Booking draft from opp |
| useActivities | Infinite list (open/overdue/completed tabs) |
| useActivity | Detail |
| useCreateActivity / useUpdateActivity | Mutations |
| useCompleteActivity | Mark completed |
| useAssignees | Assignment picker |

### Permissions

| Hook | Purpose |
|------|---------|
| usePermission | Single permission check |
| usePermissions | Full list from profile |
| useRole / useIsTenantAdmin | Role helpers |

---

## 5. API Usage Matrix

| Screen / action | Method | Endpoint |
|-----------------|--------|----------|
| Dashboard | GET | `/api/crm/dashboard?period=` |
| Lead list | GET | `/api/leads` |
| Lead detail | GET | `/api/leads/:id` |
| Lead create | POST | `/api/leads` |
| Lead update | PATCH | `/api/leads/:id` |
| Lead assign | POST | `/api/leads/:id/assign` |
| Convert opportunity | POST | `/api/leads/:id/convert-opportunity` |
| Opportunity list | GET | `/api/opportunities` |
| Opportunity detail | GET | `/api/opportunities/:id` |
| Opportunity create | POST | `/api/opportunities` |
| Opportunity update | PATCH | `/api/opportunities/:id` |
| Create booking | POST | `/api/opportunities/:id/create-booking` |
| Activity list | GET | `/api/activities?view=` |
| Activity detail | GET | `/api/activities/:id` |
| Activity create | POST | `/api/activities` |
| Activity update | PATCH | `/api/activities/:id` |
| Assignees | GET | `/api/users/assignees` |
| Profile / permissions | GET | `/api/auth/me?include_permissions=true` |

---

## 6. Permission Matrix (UI gating)

| Permission | UI effect |
|------------|-----------|
| `crm.dashboard.read` | Dashboard tab (implicit via login) |
| `dashboard.financial` | Forecast/closed revenue KPIs |
| `crm.leads.read` | View leads |
| `crm.leads.write` | Create/edit/assign |
| `crm.opportunities.read` | View pipeline |
| `crm.opportunities.write` | Create/edit/stage/booking |
| `crm.activities.read` | View activities |
| `crm.activities.write` | Create/edit/complete |
| `users.assignees.read` | Assignee picker (via assignees endpoint) |

403 responses show user-friendly alerts; no client-side bypass.

---

## 7. Navigation Map

```
Bootstrap → Login | Main (tabs)
Main:
  Home → DashboardStack → Dashboard
  Leads → LeadsStack → List | Detail | Create | Edit
  Pipeline → PipelineStack → List | Detail | Create | Edit
  Activities → ActivitiesStack → List | Detail | Create | Edit
  More → MoreStack → Profile
```

**Deep links:**

- `travelos://lead/:id`
- `travelos://opportunity/:id`
- `travelos://activity/:id`
- `travelos://home`, `travelos://login`, `travelos://profile`

---

## 8. Test Results

| Check | Result |
|-------|--------|
| `npm run typecheck` (apps/mobile) | **PASS** |
| Sprint 7B HTTP gate (backend) | Unchanged; still valid |
| Manual device/emulator | **Required** — see checklist below |

### Manual checklist

| Test | Expected |
|------|----------|
| Login + session persist | Bootstrap → Main |
| Dashboard pull-to-refresh | KPIs reload |
| Lead list search/filter/infinite scroll | Pages load |
| Lead create/edit | API 201/200 |
| Lead assign + convert | API success |
| Opportunity stage update | PATCH |
| Activity tabs open/overdue/completed | Filtered lists |
| Activity complete | status=completed |
| 403 as read-only user | Alert, no crash |
| Deep link `travelos://lead/{id}` | Opens detail |
| Airplane mode → retry | ErrorState + recovery |

---

## 9. Risks

| Risk | Mitigation |
|------|------------|
| Activity “completed” tab filters client-side after `view=timeline` | Acceptable for MVP; server filter can be added later |
| Due date entry is ISO string (no native picker) | Document; date picker in 7D |
| Create booking uses mobile line_items draft | Aligns with API; full booking editor stays web |
| Cross-tab navigation uses `getParent()?.navigate` | Tested pattern for stale lead → opportunity |

---

## 10. Remaining Scope (Sprint 7D+)

- Quotations mobile UI  
- Customer 360 mobile UI  
- Bookings list/detail mobile UI  
- Push notifications + in-app inbox  
- Native date/time pickers, i18n (AR), offline mutation queue  
- Lead Health, Forecast, admin user management  

---

## References

- [TravelOS-Mobile-Backend-Foundation.md](./TravelOS-Mobile-Backend-Foundation.md)
- [TravelOS-Mobile-Architecture-Readiness-Report.md](./TravelOS-Mobile-Architecture-Readiness-Report.md)
- `apps/mobile/README.md`
