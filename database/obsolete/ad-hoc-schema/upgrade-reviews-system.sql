-- ============================================
-- UPGRADE SISTEMA DE REVIEWS
-- Migración incremental (no destructiva)
-- Extiende la tabla reviews existente
-- ============================================

-- ============================================
-- 1. AGREGAR NUEVAS COLUMNAS A reviews
-- ============================================

ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS car_id uuid REFERENCES cars(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS review_type text CHECK (review_type IN ('renter_to_owner', 'owner_to_renter')),
ADD COLUMN IF NOT EXISTS rating_cleanliness smallint CHECK (rating_cleanliness BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS rating_communication smallint CHECK (rating_communication BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS rating_accuracy smallint CHECK (rating_accuracy BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS rating_location smallint CHECK (rating_location BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS rating_checkin smallint CHECK (rating_checkin BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS rating_value smallint CHECK (rating_value BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS comment_public text,
ADD COLUMN IF NOT EXISTS comment_private text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'published' CHECK (status IN ('pending', 'published', 'hidden')),
ADD COLUMN IF NOT EXISTS is_visible boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS published_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS is_flagged boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS flag_reason text,
ADD COLUMN IF NOT EXISTS flagged_by uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS flagged_at timestamptz,
ADD COLUMN IF NOT EXISTS moderation_status text DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS moderated_by uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS moderated_at timestamptz,
ADD COLUMN IF NOT EXISTS moderation_notes text;

-- Migrar datos existentes
UPDATE public.reviews
SET
  comment_public = comment WHERE comment_public IS NULL,
  status = 'published' WHERE status IS NULL,
  is_visible = true WHERE is_visible IS NULL,
  published_at = created_at WHERE published_at IS NULL;

-- Poblar car_id desde bookings
UPDATE public.reviews r
SET car_id = b.car_id
FROM bookings b
WHERE r.booking_id = b.id
AND r.car_id IS NULL;

-- Poblar review_type desde role
UPDATE public.reviews
SET review_type = CASE
  WHEN role::text = 'renter_rates_owner' THEN 'renter_to_owner'
  WHEN role::text = 'owner_rates_renter' THEN 'owner_to_renter'
  ELSE 'renter_to_owner'
END
WHERE review_type IS NULL;

-- Migrar rating simple a categorías (asignar mismo valor a todas)
UPDATE public.reviews
SET
  rating_cleanliness = rating,
  rating_communication = rating,
  rating_accuracy = rating,
  rating_location = rating,
  rating_checkin = rating,
  rating_value = rating
WHERE rating_cleanliness IS NULL;

-- ============================================
-- 2. AGREGAR ÍNDICES ADICIONALES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_reviews_car ON reviews(car_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_visible ON reviews(is_visible) WHERE is_visible = true;
CREATE INDEX IF NOT EXISTS idx_reviews_flagged ON reviews(is_flagged) WHERE is_flagged = true;
CREATE INDEX IF NOT EXISTS idx_reviews_type ON reviews(review_type);

-- ============================================
-- 3. AGREGAR COLUMNA CALCULADA rating_overall
-- ============================================

-- No se puede agregar columna generated a tabla existente, usar trigger
CREATE OR REPLACE FUNCTION calculate_rating_overall()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Este trigger no hace nada, solo para compatibilidad
  -- El frontend calculará el promedio
  RETURN NEW;
END;
$$;

-- ============================================
-- 4. TABLAS user_stats y car_stats (ya deben existir)
-- ============================================

-- Asegurarse de que existen
CREATE TABLE IF NOT EXISTS public.user_stats (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  owner_reviews_count int DEFAULT 0,
  owner_rating_avg numeric(3,2) DEFAULT 0,
  owner_rating_cleanliness_avg numeric(3,2) DEFAULT 0,
  owner_rating_communication_avg numeric(3,2) DEFAULT 0,
  owner_rating_accuracy_avg numeric(3,2) DEFAULT 0,
  owner_rating_location_avg numeric(3,2) DEFAULT 0,
  owner_rating_checkin_avg numeric(3,2) DEFAULT 0,
  owner_rating_value_avg numeric(3,2) DEFAULT 0,
  renter_reviews_count int DEFAULT 0,
  renter_rating_avg numeric(3,2) DEFAULT 0,
  total_bookings_as_owner int DEFAULT 0,
  total_bookings_as_renter int DEFAULT 0,
  cancellation_count int DEFAULT 0,
  cancellation_rate numeric(4,2) DEFAULT 0,
  is_top_host boolean DEFAULT false,
  is_super_host boolean DEFAULT false,
  badges jsonb DEFAULT '[]'::jsonb,
  last_review_received_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.car_stats (
  car_id uuid PRIMARY KEY REFERENCES cars(id) ON DELETE CASCADE,
  reviews_count int DEFAULT 0,
  rating_avg numeric(3,2) DEFAULT 0,
  rating_cleanliness_avg numeric(3,2) DEFAULT 0,
  rating_communication_avg numeric(3,2) DEFAULT 0,
  rating_accuracy_avg numeric(3,2) DEFAULT 0,
  rating_location_avg numeric(3,2) DEFAULT 0,
  rating_checkin_avg numeric(3,2) DEFAULT 0,
  rating_value_avg numeric(3,2) DEFAULT 0,
  total_bookings int DEFAULT 0,
  completed_bookings int DEFAULT 0,
  cancelled_bookings int DEFAULT 0,
  cancellation_rate numeric(4,2) DEFAULT 0,
  last_review_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- 5. FUNCIONES PRINCIPALES
-- ============================================

-- Función: Crear review con sistema nuevo
CREATE OR REPLACE FUNCTION create_review_v2(
  p_booking_id uuid,
  p_reviewer_id uuid,
  p_reviewee_id uuid,
  p_car_id uuid,
  p_review_type text,
  p_rating_cleanliness int,
  p_rating_communication int,
  p_rating_accuracy int,
  p_rating_location int,
  p_rating_checkin int,
  p_rating_value int,
  p_comment_public text DEFAULT NULL,
  p_comment_private text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_review_id uuid;
  v_booking_status text;
  v_checkout_date timestamptz;
BEGIN
  -- Validaciones básicas
  SELECT status, end_date INTO v_booking_status, v_checkout_date
  FROM bookings
  WHERE id = p_booking_id;

  IF v_booking_status IS NULL THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF v_booking_status != 'completed' THEN
    RAISE EXCEPTION 'Booking must be completed';
  END IF;

  -- Validar período de 14 días
  IF now() > v_checkout_date + INTERVAL '14 days' THEN
    RAISE EXCEPTION 'Review period expired';
  END IF;

  -- Calcular promedio
  DECLARE
    v_rating_avg numeric := (
      p_rating_cleanliness +
      p_rating_communication +
      p_rating_accuracy +
      p_rating_location +
      p_rating_checkin +
      p_rating_value
    ) / 6.0;
  BEGIN
    -- Insertar review
    INSERT INTO reviews (
      booking_id, reviewer_id, reviewee_id, car_id, review_type,
      rating, -- rating simple para compatibilidad
      rating_cleanliness, rating_communication, rating_accuracy,
      rating_location, rating_checkin, rating_value,
      comment, comment_public, comment_private,
      status, is_visible, published_at,
      role
    ) VALUES (
      p_booking_id, p_reviewer_id, p_reviewee_id, p_car_id, p_review_type,
      ROUND(v_rating_avg),
      p_rating_cleanliness, p_rating_communication, p_rating_accuracy,
      p_rating_location, p_rating_checkin, p_rating_value,
      p_comment_public, p_comment_public, p_comment_private,
      'pending', false, NULL,
      CASE WHEN p_review_type = 'renter_to_owner' THEN 'renter_rates_owner'::rating_role
           ELSE 'owner_rates_renter'::rating_role END
    )
    RETURNING id INTO v_review_id;
  END;

  -- Verificar si ambos calificaron
  PERFORM publish_reviews_if_both_completed(p_booking_id);

  RETURN v_review_id;
END;
$$;

-- Función: Publicar si ambos completaron
CREATE OR REPLACE FUNCTION publish_reviews_if_both_completed(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pending_count int;
BEGIN
  SELECT COUNT(*) INTO v_pending_count
  FROM reviews
  WHERE booking_id = p_booking_id
  AND status = 'pending';

  IF v_pending_count = 2 THEN
    UPDATE reviews
    SET
      status = 'published',
      is_visible = true,
      published_at = now()
    WHERE booking_id = p_booking_id
    AND status = 'pending';

    -- Actualizar stats
    PERFORM update_user_stats_v2_for_booking(p_booking_id);
  END IF;
END;
$$;

-- Función: Actualizar stats de usuario (versión simplificada)
CREATE OR REPLACE FUNCTION update_user_stats_v2_for_booking(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_owner_id uuid;
  v_renter_id uuid;
BEGIN
  SELECT owner_id, renter_id INTO v_owner_id, v_renter_id
  FROM bookings b
  INNER JOIN cars c ON b.car_id = c.id
  WHERE b.id = p_booking_id;

  -- Actualizar stats del propietario
  INSERT INTO user_stats (user_id) VALUES (v_owner_id)
  ON CONFLICT (user_id) DO UPDATE
  SET
    owner_reviews_count = (
      SELECT COUNT(*)
      FROM reviews
      WHERE reviewee_id = v_owner_id
      AND review_type = 'renter_to_owner'
      AND is_visible = true
    ),
    owner_rating_avg = (
      SELECT COALESCE(AVG(rating), 0)
      FROM reviews
      WHERE reviewee_id = v_owner_id
      AND review_type = 'renter_to_owner'
      AND is_visible = true
    ),
    is_top_host = (
      SELECT COUNT(*) >= 10 AND AVG(rating) >= 4.8
      FROM reviews
      WHERE reviewee_id = v_owner_id
      AND review_type = 'renter_to_owner'
      AND is_visible = true
    ),
    updated_at = now();

  -- Actualizar stats del arrendatario
  INSERT INTO user_stats (user_id) VALUES (v_renter_id)
  ON CONFLICT (user_id) DO UPDATE
  SET
    renter_reviews_count = (
      SELECT COUNT(*)
      FROM reviews
      WHERE reviewee_id = v_renter_id
      AND review_type = 'owner_to_renter'
      AND is_visible = true
    ),
    renter_rating_avg = (
      SELECT COALESCE(AVG(rating), 0)
      FROM reviews
      WHERE reviewee_id = v_renter_id
      AND review_type = 'owner_to_renter'
      AND is_visible = true
    ),
    updated_at = now();
END;
$$;

-- ============================================
-- 6. INICIALIZAR STATS PARA DATOS EXISTENTES
-- ============================================

-- Inicializar user_stats para todos los usuarios
INSERT INTO user_stats (user_id)
SELECT id FROM profiles
ON CONFLICT (user_id) DO NOTHING;

-- Inicializar car_stats para todos los autos
INSERT INTO car_stats (car_id)
SELECT id FROM cars
ON CONFLICT (car_id) DO NOTHING;

-- Actualizar stats basado en reviews existentes
UPDATE user_stats us
SET
  owner_reviews_count = COALESCE((
    SELECT COUNT(*)
    FROM reviews r
    WHERE r.reviewee_id = us.user_id
    AND (r.review_type = 'renter_to_owner' OR r.role::text = 'renter_rates_owner')
  ), 0),
  owner_rating_avg = COALESCE((
    SELECT AVG(r.rating)
    FROM reviews r
    WHERE r.reviewee_id = us.user_id
    AND (r.review_type = 'renter_to_owner' OR r.role::text = 'renter_rates_owner')
  ), 0);

UPDATE car_stats cs
SET
  reviews_count = COALESCE((
    SELECT COUNT(*)
    FROM reviews r
    WHERE r.car_id = cs.car_id
  ), 0),
  rating_avg = COALESCE((
    SELECT AVG(r.rating)
    FROM reviews r
    WHERE r.car_id = cs.car_id
  ), 0);

-- ============================================
-- SETUP COMPLETADO
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Sistema de Reviews actualizado exitosamente';
  RAISE NOTICE '📊 Tabla reviews: Columnas agregadas';
  RAISE NOTICE '📊 Tablas user_stats y car_stats: Creadas/Verificadas';
  RAISE NOTICE '⚙️  Función create_review_v2: Lista para usar';
  RAISE NOTICE '📈 Stats inicializadas para usuarios y autos existentes';
END $$;
