# TravelOS MVP User Stories

**Version:** 1.1 — MVP + AI Phase 5  
**Total Stories:** 65 (52 MVP + 13 AI)  
**Last Updated:** 2026-06-02

Format: `As a [role], I want [action] so that [benefit]`

---

## Authentication (US-AUTH)

| ID | Story | Priority | Module |
|----|-------|----------|--------|
| US-AUTH-001 | As a user, I want to log in with my email and password so that I can access the platform | Must | Authentication |
| US-AUTH-002 | As a user, I want to reset my password via email so that I can regain access if I forget it | Must | Authentication |
| US-AUTH-003 | As a user, I want my session to persist across page refreshes so that I don't have to log in repeatedly | Must | Authentication |
| US-AUTH-004 | As a user, I want to log out so that my session is securely terminated | Must | Authentication |
| US-AUTH-005 | As a user, I want to be redirected to login when my session expires so that unauthorized access is prevented | Must | Authentication |
| US-AUTH-006 | As a Super Admin, I want to log in with platform-level credentials so that I can manage all tenants | Must | Authentication |

## User Management (US-USER)

| ID | Story | Priority | Module |
|----|-------|----------|--------|
| US-USER-001 | As a Tenant Admin, I want to invite a new user by email so that they can join my agency | Must | User Management |
| US-USER-002 | As a Tenant Admin, I want to assign a role to a user so that they have appropriate permissions | Must | User Management |
| US-USER-003 | As a Tenant Admin, I want to deactivate a user so that they can no longer access the system | Must | User Management |
| US-USER-004 | As a Tenant Admin, I want to view all users in my tenant so that I can manage my team | Must | User Management |
| US-USER-005 | As a Tenant Admin, I want to reactivate a deactivated user so that they can regain access | Must | User Management |
| US-USER-006 | As a Super Admin, I want to create a new tenant organization so that a new agency can use the platform | Must | User Management |

## Customers (US-CUST)

| ID | Story | Priority | Module |
|----|-------|----------|--------|
| US-CUST-001 | As a Sales Agent, I want to create a new customer with contact details so that I can start a booking | Must | Customers |
| US-CUST-002 | As a Sales Agent, I want to add multiple contacts to a customer so that I can reach different people at a company | Must | Customers |
| US-CUST-003 | As a Sales Agent, I want to add addresses to a customer so that I have billing and mailing information | Must | Customers |
| US-CUST-004 | As a Sales Agent, I want to search customers by name, email, or phone so that I can quickly find existing records | Must | Customers |
| US-CUST-005 | As a Sales Agent, I want to edit customer details so that I can keep information up to date | Must | Customers |
| US-CUST-006 | As a Tenant Admin, I want to delete a customer so that inactive records are removed from active views | Must | Customers |
| US-CUST-007 | As a Sales Agent, I want to view a customer's booking history so that I understand their travel preferences | Should | Customers |
| US-CUST-008 | As a Sales Agent, I want the system to warn me about duplicate customers so that I don't create redundant records | Must | Customers |

## Packages (US-PKG)

| ID | Story | Priority | Module |
|----|-------|----------|--------|
| US-PKG-001 | As a Sales Agent, I want to create a travel package with title, description, and destination so that I can offer it to customers | Must | Packages |
| US-PKG-002 | As a Sales Agent, I want to add daily itinerary items to a package so that customers know what to expect | Must | Packages |
| US-PKG-003 | As a Sales Agent, I want to set pricing tiers (adult, child, infant) so that bookings calculate correctly | Must | Packages |
| US-PKG-004 | As a Sales Agent, I want to save a package as draft before publishing so that I can prepare it without making it visible | Must | Packages |
| US-PKG-005 | As a Sales Agent, I want to publish a package so that it becomes available for booking | Must | Packages |
| US-PKG-006 | As a Sales Agent, I want to archive a package so that it's no longer bookable but history is preserved | Must | Packages |
| US-PKG-007 | As a Sales Agent, I want to search packages by destination and status so that I can find the right offering quickly | Must | Packages |
| US-PKG-008 | As a Tenant Admin, I want to upload a cover image for a package so that it looks appealing in listings | Should | Packages |

## Bookings (US-BKG)

| ID | Story | Priority | Module |
|----|-------|----------|--------|
| US-BKG-001 | As a Sales Agent, I want to create a booking for a customer and package so that I can confirm their travel | Must | Bookings |
| US-BKG-002 | As a Sales Agent, I want to add travelers to a booking so that passenger details are captured | Must | Bookings |
| US-BKG-003 | As a Sales Agent, I want to add line items with quantities and prices so that the booking total is itemized | Must | Bookings |
| US-BKG-004 | As a Sales Agent, I want the system to auto-calculate the booking total so that I don't make arithmetic errors | Must | Bookings |
| US-BKG-005 | As a Sales Agent, I want to confirm a draft booking so that it becomes a firm reservation | Must | Bookings |
| US-BKG-006 | As a Sales Agent, I want to mark a booking as completed so that it reflects fulfilled travel | Must | Bookings |
| US-BKG-007 | As a Sales Agent, I want to cancel a booking so that it's no longer active | Must | Bookings |
| US-BKG-008 | As a Sales Agent, I want to view booking status history so that I can see who changed what and when | Must | Bookings |
| US-BKG-009 | As a Sales Agent, I want to search bookings by status, customer, or date so that I can manage my pipeline | Must | Bookings |
| US-BKG-010 | As a Finance Officer, I want to see payment status on each booking so that I know what's outstanding | Must | Bookings |

## Payments (US-PAY)

| ID | Story | Priority | Module |
|----|-------|----------|--------|
| US-PAY-001 | As a Finance Officer, I want to record a payment against a booking so that revenue is tracked | Must | Payments |
| US-PAY-002 | As a Finance Officer, I want to select a payment method so that I know how the customer paid | Must | Payments |
| US-PAY-003 | As a Finance Officer, I want to enter a reference number so that I can reconcile with bank statements | Must | Payments |
| US-PAY-004 | As a Finance Officer, I want the booking payment status to update automatically so that I don't track it manually | Must | Payments |
| US-PAY-005 | As a Finance Officer, I want to view all payments for a booking so that I see the full payment history | Must | Payments |
| US-PAY-006 | As a Finance Officer, I want to list all payments with date and method filters so that I can reconcile periods | Must | Payments |
| US-PAY-007 | As a Finance Officer, I want the system to prevent overpayment so that accounting stays accurate | Must | Payments |

## Cross-Cutting (US-XCT)

| ID | Story | Priority | Module |
|----|-------|----------|--------|
| US-XCT-001 | As a Tenant Admin, I want my agency's data isolated from other tenants so that confidentiality is guaranteed | Must | Platform |
| US-XCT-002 | As a Tenant Admin, I want an audit log of all changes so that I can review who modified records | Must | Platform |
| US-XCT-003 | As a Sales Agent, I want to only see actions permitted by my role so that I can't perform unauthorized operations | Must | Platform |

## Dashboard (US-DASH)

| ID | Story | Priority | Module |
|----|-------|----------|--------|
| US-DASH-001 | As a Tenant Admin, I want a dashboard showing booking counts by status so that I have a business overview | Must | Dashboard |
| US-DASH-002 | As a Tenant Admin, I want to see total revenue and outstanding payments so that I understand financial health | Must | Dashboard |
| US-DASH-003 | As a Sales Agent, I want to see my recent bookings so that I can follow up on pending items | Should | Dashboard |

## Knowledge Agent (US-AI-KNOW) — Phase 5

| ID | Story | Priority | Module |
|----|-------|----------|--------|
| US-AI-KNOW-001 | As a Sales Agent, I want to search company knowledge in natural language so that I find policies without asking managers | Must | AI |
| US-AI-KNOW-002 | As a Sales Agent, I want to retrieve package policies (cancellation, deposits) so that I quote accurately | Must | AI |
| US-AI-KNOW-003 | As an Operations Manager, I want to retrieve supplier contract terms so that I honor SLAs | Should | AI |
| US-AI-KNOW-004 | As a Tenant Admin, I want to upload operational documents for indexing so that the knowledge base stays current | Should | AI |

## Booking Agent (US-AI-BKG) — Phase 5

| ID | Story | Priority | Module |
|----|-------|----------|--------|
| US-AI-BKG-001 | As a Sales Agent, I want to create a draft booking from chat so that I capture inquiries faster | Must | AI |
| US-AI-BKG-002 | As a Sales Agent, I want to update a draft booking from chat so that I fix details before confirming | Must | AI |
| US-AI-BKG-003 | As a Sales Agent, I want to check booking status by reference in chat so that I answer customers quickly | Must | AI |
| US-AI-BKG-004 | As a Sales Agent, I want package recommendations from chat so that I offer relevant trips | Must | AI |
| US-AI-BKG-005 | As a Sales Agent, I want the agent to collect traveler details so that drafts are complete before I confirm | Must | AI |

## Support Agent (US-AI-SUP) — Phase 5

| ID | Story | Priority | Module |
|----|-------|----------|--------|
| US-AI-SUP-001 | As Support Staff, I want the agent to answer common customer questions so that I reduce response time | Must | AI |
| US-AI-SUP-002 | As Support Staff, I want to open a support ticket from chat so that issues are tracked | Must | AI |
| US-AI-SUP-003 | As Support Staff, I want to escalate a ticket to a senior agent so that complex cases get attention | Must | AI |
| US-AI-SUP-004 | As a Sales Agent, I want to see booking context when handling a complaint so that I resolve accurately | Should | AI |

---

## Story Count Summary

| Module | Count |
|--------|-------|
| Authentication | 6 |
| User Management | 6 |
| Customers | 8 |
| Packages | 8 |
| Bookings | 10 |
| Payments | 7 |
| Cross-Cutting | 3 |
| Dashboard | 3 |
| Knowledge Agent | 4 |
| Booking Agent | 5 |
| Support Agent | 4 |
| **Total** | **65** |

Acceptance criteria for AI stories: [AcceptanceCriteria.md](./AcceptanceCriteria.md).  
Stories tagged `POST-MVP` will be added in Growth and Enterprise phases (target: 300+ total).
