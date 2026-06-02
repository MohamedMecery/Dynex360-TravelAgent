-- ============================================================================
-- TravelOS Migration 010_seed_geography
-- Seed global countries and major cities for MVP.
-- Idempotent: safe to re-run (ON CONFLICT).
-- ============================================================================

INSERT INTO countries (iso2, iso3, name, phone_code, currency_code) VALUES
    ('US', 'USA', 'United States',       '+1',   'USD'),
    ('GB', 'GBR', 'United Kingdom',      '+44',  'GBP'),
    ('FR', 'FRA', 'France',              '+33',  'EUR'),
    ('DE', 'DEU', 'Germany',             '+49',  'EUR'),
    ('IT', 'ITA', 'Italy',               '+39',  'EUR'),
    ('ES', 'ESP', 'Spain',               '+34',  'EUR'),
    ('AE', 'ARE', 'United Arab Emirates','+971', 'AED'),
    ('SA', 'SAU', 'Saudi Arabia',        '+966', 'SAR'),
    ('TR', 'TUR', 'Turkey',              '+90',  'TRY'),
    ('EG', 'EGY', 'Egypt',               '+20',  'EGP'),
    ('TH', 'THA', 'Thailand',            '+66',  'THB'),
    ('JP', 'JPN', 'Japan',               '+81',  'JPY'),
    ('AU', 'AUS', 'Australia',           '+61',  'AUD'),
    ('CA', 'CAN', 'Canada',              '+1',   'CAD'),
    ('IN', 'IND', 'India',               '+91',  'INR'),
    ('MY', 'MYS', 'Malaysia',            '+60',  'MYR'),
    ('SG', 'SGP', 'Singapore',           '+65',  'SGD'),
    ('QA', 'QAT', 'Qatar',               '+974', 'QAR'),
    ('JO', 'JOR', 'Jordan',              '+962', 'JOD'),
    ('MA', 'MAR', 'Morocco',             '+212', 'MAD')
ON CONFLICT (iso2) DO NOTHING;

-- Cities (resolved by country iso2)
INSERT INTO cities (country_id, name, state_region) VALUES
    ((SELECT id FROM countries WHERE iso2 = 'US'), 'New York',      'New York'),
    ((SELECT id FROM countries WHERE iso2 = 'US'), 'Los Angeles',   'California'),
    ((SELECT id FROM countries WHERE iso2 = 'US'), 'Miami',         'Florida'),
    ((SELECT id FROM countries WHERE iso2 = 'GB'), 'London',        'England'),
    ((SELECT id FROM countries WHERE iso2 = 'GB'), 'Edinburgh',     'Scotland'),
    ((SELECT id FROM countries WHERE iso2 = 'FR'), 'Paris',         NULL),
    ((SELECT id FROM countries WHERE iso2 = 'FR'), 'Nice',          NULL),
    ((SELECT id FROM countries WHERE iso2 = 'DE'), 'Berlin',        NULL),
    ((SELECT id FROM countries WHERE iso2 = 'DE'), 'Munich',        'Bavaria'),
    ((SELECT id FROM countries WHERE iso2 = 'IT'), 'Rome',          'Lazio'),
    ((SELECT id FROM countries WHERE iso2 = 'IT'), 'Milan',         'Lombardy'),
    ((SELECT id FROM countries WHERE iso2 = 'ES'), 'Barcelona',     'Catalonia'),
    ((SELECT id FROM countries WHERE iso2 = 'ES'), 'Madrid',        NULL),
    ((SELECT id FROM countries WHERE iso2 = 'AE'), 'Dubai',         'Dubai'),
    ((SELECT id FROM countries WHERE iso2 = 'AE'), 'Abu Dhabi',     'Abu Dhabi'),
    ((SELECT id FROM countries WHERE iso2 = 'SA'), 'Riyadh',        NULL),
    ((SELECT id FROM countries WHERE iso2 = 'SA'), 'Jeddah',        NULL),
    ((SELECT id FROM countries WHERE iso2 = 'TR'), 'Istanbul',      NULL),
    ((SELECT id FROM countries WHERE iso2 = 'TR'), 'Antalya',       NULL),
    ((SELECT id FROM countries WHERE iso2 = 'EG'), 'Cairo',         NULL),
    ((SELECT id FROM countries WHERE iso2 = 'EG'), 'Luxor',         NULL),
    ((SELECT id FROM countries WHERE iso2 = 'TH'), 'Bangkok',       NULL),
    ((SELECT id FROM countries WHERE iso2 = 'TH'), 'Phuket',        NULL),
    ((SELECT id FROM countries WHERE iso2 = 'JP'), 'Tokyo',         NULL),
    ((SELECT id FROM countries WHERE iso2 = 'JP'), 'Osaka',         NULL),
    ((SELECT id FROM countries WHERE iso2 = 'AU'), 'Sydney',        'New South Wales'),
    ((SELECT id FROM countries WHERE iso2 = 'AU'), 'Melbourne',     'Victoria'),
    ((SELECT id FROM countries WHERE iso2 = 'CA'), 'Toronto',       'Ontario'),
    ((SELECT id FROM countries WHERE iso2 = 'CA'), 'Vancouver',     'British Columbia'),
    ((SELECT id FROM countries WHERE iso2 = 'IN'), 'Mumbai',        'Maharashtra'),
    ((SELECT id FROM countries WHERE iso2 = 'IN'), 'Delhi',         NULL),
    ((SELECT id FROM countries WHERE iso2 = 'MY'), 'Kuala Lumpur',  NULL),
    ((SELECT id FROM countries WHERE iso2 = 'SG'), 'Singapore',     NULL),
    ((SELECT id FROM countries WHERE iso2 = 'QA'), 'Doha',          NULL),
    ((SELECT id FROM countries WHERE iso2 = 'JO'), 'Amman',         NULL),
    ((SELECT id FROM countries WHERE iso2 = 'MA'), 'Marrakech',     NULL),
    ((SELECT id FROM countries WHERE iso2 = 'MA'), 'Casablanca',    NULL)
ON CONFLICT (country_id, name, state_region) DO NOTHING;
