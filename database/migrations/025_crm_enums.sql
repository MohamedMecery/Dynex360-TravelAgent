-- ============================================================================
-- TravelOS Migration 025_crm_enums
-- CRM Phase 7A enum types
-- ============================================================================

CREATE TYPE lead_status AS ENUM (
    'new',
    'contacted',
    'qualified',
    'proposal_sent',
    'negotiation',
    'won',
    'lost'
);

CREATE TYPE lead_source AS ENUM (
    'whatsapp',
    'website',
    'facebook',
    'instagram',
    'tiktok',
    'referral',
    'walk_in',
    'phone_call',
    'other'
);

CREATE TYPE preferred_contact_channel AS ENUM (
    'whatsapp',
    'phone',
    'email',
    'in_person'
);

CREATE TYPE opportunity_stage AS ENUM (
    'discovery',
    'proposal',
    'negotiation',
    'verbal_approval',
    'closed_won',
    'closed_lost'
);

CREATE TYPE activity_type AS ENUM (
    'call',
    'whatsapp',
    'email',
    'meeting',
    'task'
);

CREATE TYPE activity_status AS ENUM (
    'open',
    'in_progress',
    'completed',
    'cancelled'
);
