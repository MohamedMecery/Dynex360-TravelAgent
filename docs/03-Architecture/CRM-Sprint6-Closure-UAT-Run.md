# Sprint 6 Closure UAT — Automated Run

Generated: 2026-06-03T18:57:05.357Z
Base URL: http://localhost:3000

| Section | Item | Status | Detail |
|---------|------|--------|--------|
| Deploy | table quotations | PASS |  |
| Deploy | table quotation_items | PASS |  |
| Deploy | bookings.quotation_id | PASS |  |
| Deploy | permission quotations.read | PASS |  |
| Deploy | permission quotations.read_all | PASS |  |
| Deploy | permission quotations.write | PASS |  |
| Deploy | permission quotations.write_all | PASS |  |
| Deploy | permission quotations.approve | PASS |  |
| Deploy | permission quotations.send | PASS |  |
| Deploy | permission quotations.accept | PASS |  |
| Deploy | permission quotations.convert | PASS |  |
| Workflow | simple create draft | PASS | d49b1774-bfab-45a9-87bc-c76dc0c0b0fc |
| Workflow | simple send → sent | PASS | got sent |
| Workflow | simple mark-viewed → viewed | PASS | got viewed |
| Workflow | simple accept → accepted | PASS | got accepted |
| Workflow | simple convert → converted_to_booking | PASS | got converted_to_booking |
| Workflow | simple sent_at | PASS |  |
| Workflow | simple viewed_at | PASS |  |
| Workflow | simple accepted_at | PASS |  |
| Workflow | simple total_amount > 0 | PASS |  |
| Workflow | booking.quotation_id set | PASS |  |
| Workflow | accept → verbal_approval | PASS | verbal_approval |
| Workflow | standard submit → pending_approval | PASS |  |
| Workflow | standard reject approval → draft | PASS |  |
| Workflow | standard approve | PASS |  |
| Workflow | standard send → sent | PASS | got sent |
| Workflow | standard mark-viewed → viewed | PASS | got viewed |
| Workflow | standard accept → accepted | PASS | got accepted |
| Workflow | standard convert → converted_to_booking | PASS | got converted_to_booking |
| RLS | cross-tenant read blocked | PASS |  |
| RLS | finance read_all | PASS |  |
| RLS | finance write blocked | PASS | no rows |
| Customer360 | quotation_created | PASS |  |
| Customer360 | quotation_sent | PASS |  |
| Customer360 | quotation_viewed | PASS |  |
| Customer360 | quotation_accepted | PASS |  |
| Customer360 | quotation_converted | PASS |  |
| Dashboard | CRM dashboard API | PASS |  |