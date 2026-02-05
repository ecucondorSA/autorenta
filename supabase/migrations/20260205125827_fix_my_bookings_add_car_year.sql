-- Fix booking views: add missing car_year column
-- This resolves the error: "column my_bookings.car_year does not exist"

-- Fix my_bookings view (renter perspective)
DROP VIEW IF EXISTS my_bookings;

CREATE VIEW my_bookings AS
SELECT
    b.id,
    b.car_id,
    b.renter_id,
    b.owner_id,
    b.start_at,
    b.end_at,
    b.status,
    b.total_price,
    b.currency,
    b.created_at,
    b.updated_at,
    b.returned_at,
    b.cancelled_at,
    b.cancellation_reason,
    b.inspection_status,
    b.notes,
    c.title AS car_title,
    c.brand AS car_brand,
    c.model AS car_model,
    c.year AS car_year,
    c.city AS car_city,
    c.province AS car_province,
    c.owner_id AS car_owner_id,
    po.full_name AS owner_name,
    po.avatar_url AS owner_avatar
FROM bookings b
JOIN cars c ON c.id = b.car_id
LEFT JOIN profiles po ON po.id = c.owner_id
WHERE b.renter_id = auth.uid();

COMMENT ON VIEW my_bookings IS 'View of bookings for the current authenticated user as renter';

-- Fix owner_bookings view (owner perspective)
DROP VIEW IF EXISTS owner_bookings;

CREATE VIEW owner_bookings AS
SELECT
    b.id,
    b.car_id,
    b.renter_id,
    b.owner_id,
    b.start_at,
    b.end_at,
    b.status,
    b.total_price,
    b.currency,
    b.created_at,
    b.updated_at,
    b.returned_at,
    b.cancelled_at,
    b.cancellation_reason,
    b.inspection_status,
    b.notes,
    c.title AS car_title,
    c.brand AS car_brand,
    c.model AS car_model,
    c.year AS car_year,
    c.city AS car_city,
    c.province AS car_province,
    pr.full_name AS renter_name,
    pr.avatar_url AS renter_avatar
FROM bookings b
JOIN cars c ON c.id = b.car_id
LEFT JOIN profiles pr ON pr.id = b.renter_id
WHERE c.owner_id = auth.uid();

COMMENT ON VIEW owner_bookings IS 'View of bookings for the current authenticated user as car owner';
