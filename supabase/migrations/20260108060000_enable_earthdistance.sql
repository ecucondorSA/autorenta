-- ============================================================================
-- FIX: Enable earthdistance extension for get_available_cars
-- Date: 2026-01-08
-- Description: The <@> operator requires cube and earthdistance extensions
-- ============================================================================

-- Cube extension is required by earthdistance
CREATE EXTENSION IF NOT EXISTS cube;

-- Earthdistance provides the <@> operator for point distance calculations
CREATE EXTENSION IF NOT EXISTS earthdistance;

-- Note: The operator point <@> point returns distance in STATUTE MILES
-- To convert to KM, multiply by 1.60934
