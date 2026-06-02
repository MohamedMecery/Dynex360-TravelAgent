# TravelOS MVP Acceptance Criteria

**Version:** 1.1 — MVP + AI Phase 5  
**Last Updated:** 2026-06-02

Each criterion uses Given/When/Then format and maps to a user story ID.

---

## Authentication

### US-AUTH-001 — Login

- **Given** a registered user with valid credentials
- **When** they submit email and password on the login page
- **Then** they are authenticated, receive a JWT, and are redirected to the dashboard

- **Given** a user with invalid credentials
- **When** they submit the login form
- **Then** an error message is displayed and no session is created

### US-AUTH-002 — Password Reset

- **Given** a registered user on the forgot-password page
- **When** they enter their email and submit
- **Then** a password reset link is sent to their email

- **Given** a valid reset link
- **When** the user sets a new password meeting minimum requirements
- **Then** the password is updated and they can log in with the new password

### US-AUTH-003 — Session Persistence

- **Given** a logged-in user
- **When** they refresh the browser page
- **Then** they remain authenticated without re-entering credentials

### US-AUTH-004 — Logout

- **Given** a logged-in user
- **When** they click logout
- **Then** the session is destroyed and they are redirected to the login page

### US-AUTH-005 — Session Expiry

- **Given** a user with an expired JWT
- **When** they attempt to access a protected route
- **Then** they are redirected to the login page with an expiry message

### US-AUTH-006 — Super Admin Login

- **Given** a Super Admin with platform credentials
- **When** they log in
- **Then** they access the platform admin area with cross-tenant visibility

---

## User Management

### US-USER-001 — Invite User

- **Given** a Tenant Admin on the users page
- **When** they enter an email and submit an invitation
- **Then** an invitation email is sent and a pending user record is created

### US-USER-002 — Assign Role

- **Given** a Tenant Admin editing a user
- **When** they select a role (Sales Agent, Finance Officer, Tenant Admin) and save
- **Then** the user's permissions update to match the selected role

### US-USER-003 — Deactivate User

- **Given** an active user
- **When** a Tenant Admin deactivates them
- **Then** the user cannot log in and their status shows as inactive

### US-USER-004 — View Users

- **Given** a Tenant Admin on the users page
- **When** the page loads
- **Then** all tenant users are listed with name, email, role, and status

### US-USER-005 — Reactivate User

- **Given** a deactivated user
- **When** a Tenant Admin reactivates them
- **Then** the user can log in again

### US-USER-006 — Create Tenant

- **Given** a Super Admin on the tenants page
- **When** they create a new tenant with name and admin email
- **Then** a tenant record is created and the admin receives an invitation

---

## Customers

### US-CUST-001 — Create Customer

- **Given** a Sales Agent on the new customer form
- **When** they enter name, email, phone, type and save
- **Then** a customer record is created and visible in the customer list

### US-CUST-002 — Add Contacts

- **Given** an existing customer
- **When** a Sales Agent adds a contact with name, email, phone, and role
- **Then** the contact appears on the customer's detail page

### US-CUST-003 — Add Addresses

- **Given** an existing customer
- **When** a Sales Agent adds an address with street, city, country, postal code, and type
- **Then** the address appears on the customer's detail page

### US-CUST-004 — Search Customers

- **Given** multiple customers exist
- **When** a Sales Agent searches by name, email, or phone
- **Then** matching customers are returned within 1 second

### US-CUST-005 — Edit Customer

- **Given** an existing customer
- **When** a Sales Agent updates any field and saves
- **Then** the changes are persisted and visible immediately

### US-CUST-006 — Delete Customer

- **Given** a customer with no active bookings
- **When** a Tenant Admin soft-deletes the customer
- **Then** the customer is removed from active lists but retained in the database

### US-CUST-007 — Booking History

- **Given** a customer with past bookings
- **When** a Sales Agent views the customer detail page
- **Then** a list of associated bookings is displayed with status and dates

### US-CUST-008 — Duplicate Detection

- **Given** a customer with email "john@example.com" exists
- **When** a Sales Agent creates a new customer with the same email
- **Then** a warning is displayed suggesting the existing record

---

## Packages

### US-PKG-001 — Create Package

- **Given** a Sales Agent on the new package form
- **When** they enter title, description, destination, duration and save
- **Then** a package is created with status "draft"

### US-PKG-002 — Add Itinerary

- **Given** an existing package
- **When** a Sales Agent adds a day with title and description
- **Then** the itinerary day appears in order on the package detail page

### US-PKG-003 — Set Pricing

- **Given** an existing package
- **When** a Sales Agent sets adult, child, and infant prices
- **Then** pricing tiers are saved and available for booking calculations

### US-PKG-004 — Save as Draft

- **Given** a new or edited package
- **When** saved without publishing
- **Then** status remains "draft" and it is not selectable in booking creation

### US-PKG-005 — Publish Package

- **Given** a draft package with at least one itinerary day and pricing
- **When** a Sales Agent publishes it
- **Then** status changes to "published" and it appears in booking package selection

### US-PKG-006 — Archive Package

- **Given** a published package
- **When** a Sales Agent archives it
- **Then** status changes to "archived" and it is no longer selectable for new bookings

### US-PKG-007 — Search Packages

- **Given** multiple packages exist
- **When** a Sales Agent filters by destination or status
- **Then** matching packages are returned

### US-PKG-008 — Upload Cover Image

- **Given** an existing package
- **When** a Tenant Admin uploads an image file (JPEG/PNG, max 5MB)
- **Then** the image is stored and displayed as the package cover

---

## Bookings

### US-BKG-001 — Create Booking

- **Given** a customer and a published package exist
- **When** a Sales Agent creates a booking selecting both
- **Then** a booking is created with status "draft" and linked to customer and package

### US-BKG-002 — Add Travelers

- **Given** an existing booking
- **When** a Sales Agent adds a traveler with name, DOB, and passport number
- **Then** the traveler appears on the booking detail page

### US-BKG-003 — Add Line Items

- **Given** an existing booking
- **When** a Sales Agent adds a line item with description, quantity, and unit price
- **Then** the line item appears and the booking total recalculates

### US-BKG-004 — Auto-Calculate Total

- **Given** a booking with line items
- **When** any line item quantity or price changes
- **Then** booking total = sum(quantity × unit_price) for all line items

### US-BKG-005 — Confirm Booking

- **Given** a draft booking with at least one traveler and line item
- **When** a Sales Agent confirms it
- **Then** status changes to "confirmed" and a status history entry is recorded

### US-BKG-006 — Complete Booking

- **Given** a confirmed booking
- **When** a Sales Agent marks it completed
- **Then** status changes to "completed"

### US-BKG-007 — Cancel Booking

- **Given** a booking in any active status
- **When** a Sales Agent cancels it
- **Then** status changes to "cancelled" and no new payments can be recorded

### US-BKG-008 — Status History

- **Given** a booking with status changes
- **When** a user views the booking detail page
- **Then** a chronological list of status changes with user and timestamp is shown

### US-BKG-009 — Search Bookings

- **Given** multiple bookings exist
- **When** a Sales Agent filters by status, customer, or date range
- **Then** matching bookings are returned

### US-BKG-010 — Payment Status Display

- **Given** a booking with payments recorded
- **When** a Finance Officer views the booking
- **Then** payment status (unpaid/partial/paid) and amount paid vs total are displayed

---

## Payments

### US-PAY-001 — Record Payment

- **Given** a confirmed booking with outstanding balance
- **When** a Finance Officer records a payment with amount and method
- **Then** a payment record is created and linked to the booking

### US-PAY-002 — Payment Method

- **Given** a payment form
- **When** a Finance Officer selects cash, bank transfer, card, or other
- **Then** the method is saved on the payment record

### US-PAY-003 — Reference Number

- **Given** a payment being recorded
- **When** a Finance Officer enters a reference number
- **Then** it is stored and searchable on the payment record

### US-PAY-004 — Auto-Update Payment Status

- **Given** a booking with total $1000 and $600 already paid
- **When** a Finance Officer records a $400 payment
- **Then** booking payment status changes from "partial" to "paid"

### US-PAY-005 — Payment History

- **Given** a booking with multiple payments
- **When** a Finance Officer views the booking payments tab
- **Then** all payments are listed with amount, date, method, and reference

### US-PAY-006 — List Payments

- **Given** multiple payments across bookings
- **When** a Finance Officer filters by date range or method
- **Then** matching payments are returned

### US-PAY-007 — Prevent Overpayment

- **Given** a booking with total $1000 and $800 already paid
- **When** a Finance Officer attempts to record a $300 payment
- **Then** the system rejects the payment with an overpayment error

---

## Cross-Cutting

### US-XCT-001 — Tenant Isolation

- **Given** two tenants (A and B) with各自的 data
- **When** a user from tenant A queries any data endpoint
- **Then** only tenant A data is returned; tenant B data is never visible

### US-XCT-002 — Audit Log

- **Given** any business entity (customer, package, booking, payment)
- **When** a user creates, updates, or deletes the record
- **Then** an audit_log entry is created with user_id, action, entity, timestamp, and changes

### US-XCT-003 — Role Enforcement

- **Given** a Sales Agent logged in
- **When** they attempt to access payment recording or user management
- **Then** access is denied with a 403 Forbidden response

---

## Dashboard

### US-DASH-001 — Booking Counts

- **Given** a Tenant Admin on the dashboard
- **When** the page loads
- **Then** booking counts grouped by status (draft, confirmed, completed, cancelled) are displayed

### US-DASH-002 — Revenue Overview

- **Given** a Tenant Admin on the dashboard
- **When** the page loads
- **Then** total revenue (sum of paid bookings) and outstanding balance are displayed

### US-DASH-003 — Recent Bookings

- **Given** a Sales Agent on the dashboard
- **When** the page loads
- **Then** the 10 most recent bookings assigned to or created by the agent are listed

---

## Knowledge Agent (Phase 5)

### US-AI-KNOW-001 — Search company knowledge

- **Given** indexed tenant knowledge documents and a logged-in Sales Agent
- **When** they ask “What is our cancellation policy for confirmed bookings?”
- **Then** the Knowledge Agent returns an answer with at least one citation to a tenant document
- **And** no data from other tenants appears in the response

### US-AI-KNOW-002 — Retrieve package policies

- **Given** a published package with policy text in the knowledge base
- **When** the user asks for that package’s deposit rules
- **Then** the answer references the correct package name and policy excerpt

### US-AI-KNOW-003 — Retrieve supplier information

- **Given** a supplier contract document indexed for the tenant
- **When** an Operations Manager asks for payment terms for that supplier
- **Then** the agent returns cited contract terms or states that no document exists

### US-AI-KNOW-004 — Upload knowledge documents

- **Given** a Tenant Admin on the knowledge management screen
- **When** they upload a PDF and trigger reindex
- **Then** the document appears as `published` and is retrievable via US-AI-KNOW-001 within 5 minutes

---

## Booking Agent (Phase 5)

### US-AI-BKG-001 — Create booking from chat

- **Given** a valid customer and published package in the tenant
- **When** the Sales Agent requests a draft booking for 2 adults via chat
- **Then** a booking with `status = draft` is created with line items and a reference number
- **And** the agent does not set `status = confirmed`

### US-AI-BKG-002 — Update booking from chat

- **Given** an existing draft booking
- **When** the Sales Agent asks to add a traveler or line item via chat
- **Then** the draft booking is updated and totals recalculated
- **And** confirmed bookings are rejected for modification with a clear message

### US-AI-BKG-003 — Check booking status

- **Given** booking `BK-2026-0142` exists in the tenant
- **When** the user asks for its status in chat
- **Then** the agent returns status, payment_status, and total amount

### US-AI-BKG-004 — Suggest packages

- **Given** multiple published packages for “Istanbul”
- **When** the user asks for family packages in April
- **Then** the agent returns a ranked list of matching packages with short rationale

### US-AI-BKG-005 — Collect traveler information

- **Given** a draft booking without travelers
- **When** the user provides names and dates of birth in chat
- **Then** traveler rows are attached to the draft with required fields validated

---

## Support Agent (Phase 5)

### US-AI-SUP-001 — Answer customer questions

- **Given** FAQ content indexed for the tenant
- **When** the user asks “What are your office hours?”
- **Then** the Support Agent returns the documented answer with citation

### US-AI-SUP-002 — Open support ticket

- **Given** an unresolved customer issue in chat
- **When** the user requests a ticket
- **Then** a `support_tickets` record is created with status `open` and a unique ticket number

### US-AI-SUP-003 — Escalate support issue

- **Given** an open ticket and an escalation rule (e.g. refund dispute)
- **When** the agent detects escalation criteria
- **Then** ticket status becomes `escalated` and `assigned_user_id` is set

### US-AI-SUP-004 — Booking context for support

- **Given** a booking reference linked in the conversation
- **When** the user asks about payment status
- **Then** the agent summarizes booking payment_status and outstanding amount from live data
