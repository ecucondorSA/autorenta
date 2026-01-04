-- Migration: Add review rating categories for both review types
-- Description:
--   - Renter→Owner: cleanliness, communication, accuracy, location, checkin, value
--   - Owner→Renter: communication, punctuality, care, rules, recommend

-- ============================================
-- RENTER → OWNER categories (evaluating car/owner)
-- ============================================
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS rating_cleanliness INTEGER CHECK (rating_cleanliness >= 1 AND rating_cleanliness <= 5);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS rating_communication INTEGER CHECK (rating_communication >= 1 AND rating_communication <= 5);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS rating_accuracy INTEGER CHECK (rating_accuracy >= 1 AND rating_accuracy <= 5);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS rating_location INTEGER CHECK (rating_location >= 1 AND rating_location <= 5);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS rating_checkin INTEGER CHECK (rating_checkin >= 1 AND rating_checkin <= 5);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS rating_value INTEGER CHECK (rating_value >= 1 AND rating_value <= 5);

-- ============================================
-- OWNER → RENTER categories (evaluating renter)
-- ============================================
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS rating_punctuality INTEGER CHECK (rating_punctuality >= 1 AND rating_punctuality <= 5);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS rating_care INTEGER CHECK (rating_care >= 1 AND rating_care <= 5);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS rating_rules INTEGER CHECK (rating_rules >= 1 AND rating_rules <= 5);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS rating_recommend INTEGER CHECK (rating_recommend >= 1 AND rating_recommend <= 5);

-- ============================================
-- Column comments for documentation
-- ============================================
COMMENT ON COLUMN reviews.rating_cleanliness IS 'Renter→Owner: Estado de limpieza del vehículo (1-5)';
COMMENT ON COLUMN reviews.rating_communication IS 'Both: Claridad y rapidez en comunicación (1-5)';
COMMENT ON COLUMN reviews.rating_accuracy IS 'Renter→Owner: Descripción vs realidad del vehículo (1-5)';
COMMENT ON COLUMN reviews.rating_location IS 'Renter→Owner: Conveniencia del punto de entrega (1-5)';
COMMENT ON COLUMN reviews.rating_checkin IS 'Renter→Owner: Facilidad del proceso de entrega (1-5)';
COMMENT ON COLUMN reviews.rating_value IS 'Renter→Owner: Relación precio-calidad (1-5)';
COMMENT ON COLUMN reviews.rating_punctuality IS 'Owner→Renter: Cumplimiento de horarios acordados (1-5)';
COMMENT ON COLUMN reviews.rating_care IS 'Owner→Renter: Cómo cuidó y devolvió el vehículo (1-5)';
COMMENT ON COLUMN reviews.rating_rules IS 'Owner→Renter: Respeto de las condiciones del alquiler (1-5)';
COMMENT ON COLUMN reviews.rating_recommend IS 'Owner→Renter: ¿Alquilarías nuevamente a este usuario? (1-5)';
