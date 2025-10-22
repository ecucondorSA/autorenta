-- ============================================
-- SISTEMA DE REVIEWS ESTILO AIRBNB
-- Migración SQL Completa
-- Versión: 1.0.0
-- Fecha: 2025-10-17
-- ============================================

-- ============================================
-- 1. TABLA: reviews
-- Almacena calificaciones y comentarios
-- ============================================

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relaciones
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  car_id uuid NOT NULL REFERENCES cars(id) ON DELETE CASCADE,

  -- Tipo de review
  review_type text NOT NULL CHECK (review_type IN ('renter_to_owner', 'owner_to_renter')),

  -- Calificaciones por categoría (1-5 estrellas)
  rating_cleanliness smallint CHECK (rating_cleanliness BETWEEN 1 AND 5),
  rating_communication smallint CHECK (rating_communication BETWEEN 1 AND 5),
  rating_accuracy smallint CHECK (rating_accuracy BETWEEN 1 AND 5),
  rating_location smallint CHECK (rating_location BETWEEN 1 AND 5),
  rating_checkin smallint CHECK (rating_checkin BETWEEN 1 AND 5),
  rating_value smallint CHECK (rating_value BETWEEN 1 AND 5),

  -- Calificación global (promedio calculado automáticamente)
  rating_overall numeric(3,2) GENERATED ALWAYS AS (
    (COALESCE(rating_cleanliness, 0) +
     COALESCE(rating_communication, 0) +
     COALESCE(rating_accuracy, 0) +
     COALESCE(rating_location, 0) +
     COALESCE(rating_checkin, 0) +
     COALESCE(rating_value, 0)) / 6.0
  ) STORED,

  -- Comentarios
  comment_public text,
  comment_private text,

  -- Estado y visibilidad
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'hidden')),
  is_visible boolean DEFAULT false,
  published_at timestamptz,

  -- Moderación
  is_flagged boolean DEFAULT false,
  flag_reason text,
  flagged_by uuid REFERENCES profiles(id),
  flagged_at timestamptz,
  moderation_status text DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  moderated_by uuid REFERENCES profiles(id),
  moderated_at timestamptz,
  moderation_notes text,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_review_per_booking UNIQUE (booking_id, reviewer_id),
  CONSTRAINT reviewer_not_reviewee CHECK (reviewer_id != reviewee_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_reviews_booking ON reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_car ON reviews(car_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_visible ON reviews(is_visible) WHERE is_visible = true;
CREATE INDEX IF NOT EXISTS idx_reviews_created ON reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_flagged ON reviews(is_flagged) WHERE is_flagged = true;
CREATE INDEX IF NOT EXISTS idx_reviews_type ON reviews(review_type);

-- Comentarios de documentación
COMMENT ON TABLE reviews IS 'Calificaciones y comentarios de reservas completadas';
COMMENT ON COLUMN reviews.review_type IS 'renter_to_owner: arrendatario califica propietario, owner_to_renter: viceversa';
COMMENT ON COLUMN reviews.rating_overall IS 'Promedio automático de todas las categorías';
COMMENT ON COLUMN reviews.comment_private IS 'Feedback privado solo visible para el reviewee';

-- ============================================
-- 2. TABLA: user_stats
-- Estadísticas agregadas por usuario
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_stats (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,

  -- Estadísticas como propietario (locador)
  owner_reviews_count int DEFAULT 0 CHECK (owner_reviews_count >= 0),
  owner_rating_avg numeric(3,2) DEFAULT 0 CHECK (owner_rating_avg BETWEEN 0 AND 5),
  owner_rating_cleanliness_avg numeric(3,2) DEFAULT 0,
  owner_rating_communication_avg numeric(3,2) DEFAULT 0,
  owner_rating_accuracy_avg numeric(3,2) DEFAULT 0,
  owner_rating_location_avg numeric(3,2) DEFAULT 0,
  owner_rating_checkin_avg numeric(3,2) DEFAULT 0,
  owner_rating_value_avg numeric(3,2) DEFAULT 0,
  owner_response_rate numeric(4,2) DEFAULT 0,
  owner_response_time_hours numeric(6,2) DEFAULT 0,

  -- Estadísticas como arrendatario (locatario)
  renter_reviews_count int DEFAULT 0 CHECK (renter_reviews_count >= 0),
  renter_rating_avg numeric(3,2) DEFAULT 0 CHECK (renter_rating_avg BETWEEN 0 AND 5),
  renter_rating_cleanliness_avg numeric(3,2) DEFAULT 0,
  renter_rating_communication_avg numeric(3,2) DEFAULT 0,
  renter_rating_accuracy_avg numeric(3,2) DEFAULT 0,
  renter_rating_checkin_avg numeric(3,2) DEFAULT 0,

  -- Bookings stats
  total_bookings_as_owner int DEFAULT 0,
  total_bookings_as_renter int DEFAULT 0,
  cancellation_count int DEFAULT 0,
  cancellation_rate numeric(4,2) DEFAULT 0,

  -- Badges y estatus
  is_top_host boolean DEFAULT false,
  is_super_host boolean DEFAULT false,
  is_verified_renter boolean DEFAULT false,
  badges jsonb DEFAULT '[]'::jsonb,

  -- Timestamps
  last_review_received_at timestamptz,
  updated_at timestamptz DEFAULT now(),

  -- Constraints
  CHECK (cancellation_rate >= 0 AND cancellation_rate <= 1)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_stats_top_host ON user_stats(is_top_host) WHERE is_top_host = true;
CREATE INDEX IF NOT EXISTS idx_user_stats_super_host ON user_stats(is_super_host) WHERE is_super_host = true;
CREATE INDEX IF NOT EXISTS idx_user_stats_owner_rating ON user_stats(owner_rating_avg DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_renter_rating ON user_stats(renter_rating_avg DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_badges ON user_stats USING GIN (badges);

COMMENT ON TABLE user_stats IS 'Estadísticas agregadas de reviews y bookings por usuario';
COMMENT ON COLUMN user_stats.badges IS 'Array JSON de badges obtenidos: ["top_host", "verified_renter", etc.]';

-- ============================================
-- 3. TABLA: car_stats
-- Estadísticas por vehículo
-- ============================================

CREATE TABLE IF NOT EXISTS public.car_stats (
  car_id uuid PRIMARY KEY REFERENCES cars(id) ON DELETE CASCADE,

  -- Estadísticas de reviews
  reviews_count int DEFAULT 0 CHECK (reviews_count >= 0),
  rating_avg numeric(3,2) DEFAULT 0 CHECK (rating_avg BETWEEN 0 AND 5),
  rating_cleanliness_avg numeric(3,2) DEFAULT 0,
  rating_communication_avg numeric(3,2) DEFAULT 0,
  rating_accuracy_avg numeric(3,2) DEFAULT 0,
  rating_location_avg numeric(3,2) DEFAULT 0,
  rating_checkin_avg numeric(3,2) DEFAULT 0,
  rating_value_avg numeric(3,2) DEFAULT 0,

  -- Bookings stats
  total_bookings int DEFAULT 0,
  completed_bookings int DEFAULT 0,
  cancelled_bookings int DEFAULT 0,
  cancellation_rate numeric(4,2) DEFAULT 0,

  -- Performance
  acceptance_rate numeric(4,2) DEFAULT 0,
  avg_response_time_hours numeric(6,2) DEFAULT 0,

  -- Timestamps
  last_review_at timestamptz,
  updated_at timestamptz DEFAULT now(),

  -- Constraints
  CHECK (cancellation_rate >= 0 AND cancellation_rate <= 1),
  CHECK (acceptance_rate >= 0 AND acceptance_rate <= 1)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_car_stats_rating ON car_stats(rating_avg DESC);
CREATE INDEX IF NOT EXISTS idx_car_stats_reviews ON car_stats(reviews_count DESC);
CREATE INDEX IF NOT EXISTS idx_car_stats_bookings ON car_stats(total_bookings DESC);

COMMENT ON TABLE car_stats IS 'Estadísticas agregadas de reviews y bookings por vehículo';

-- ============================================
-- 4. RLS POLICIES
-- Row Level Security
-- ============================================

-- Habilitar RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE car_stats ENABLE ROW LEVEL SECURITY;

-- REVIEWS: Solo lectura pública de reviews visibles
CREATE POLICY "Anyone can view published reviews"
  ON reviews FOR SELECT
  USING (is_visible = true AND status = 'published');

-- REVIEWS: Usuario puede ver sus propias reviews (incluso pending)
CREATE POLICY "Users can view own reviews"
  ON reviews FOR SELECT
  USING (reviewer_id = auth.uid() OR reviewee_id = auth.uid());

-- REVIEWS: Usuario puede crear review si es parte de la reserva
CREATE POLICY "Users can create reviews for their bookings"
  ON reviews FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE id = booking_id
      AND (renter_id = auth.uid() OR owner_id = auth.uid())
      AND status = 'completed'
    )
    AND reviewer_id = auth.uid()
  );

-- REVIEWS: Usuario puede actualizar su propia review (solo si pending)
CREATE POLICY "Users can update own pending reviews"
  ON reviews FOR UPDATE
  USING (reviewer_id = auth.uid() AND status = 'pending');

-- REVIEWS: Admins pueden moderar
CREATE POLICY "Admins can moderate reviews"
  ON reviews FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );

-- USER_STATS: Lectura pública de stats
CREATE POLICY "Anyone can view user stats"
  ON user_stats FOR SELECT
  USING (true);

-- USER_STATS: Solo sistema puede actualizar
CREATE POLICY "Only system can update user stats"
  ON user_stats FOR ALL
  USING (false);

-- CAR_STATS: Lectura pública de stats
CREATE POLICY "Anyone can view car stats"
  ON car_stats FOR SELECT
  USING (true);

-- CAR_STATS: Solo sistema puede actualizar
CREATE POLICY "Only system can update car stats"
  ON car_stats FOR ALL
  USING (false);

-- ============================================
-- 5. TRIGGER: Actualizar updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_reviews_updated_at ON reviews;
CREATE TRIGGER trigger_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_user_stats_updated_at ON user_stats;
CREATE TRIGGER trigger_user_stats_updated_at
  BEFORE UPDATE ON user_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_car_stats_updated_at ON car_stats;
CREATE TRIGGER trigger_car_stats_updated_at
  BEFORE UPDATE ON car_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 6. FUNCIÓN: Crear Review
-- ============================================

CREATE OR REPLACE FUNCTION create_review(
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
  v_renter_id uuid;
  v_owner_id uuid;
BEGIN
  -- Validar que la reserva existe y está completada
  SELECT status, end_date, renter_id, owner_id
  INTO v_booking_status, v_checkout_date, v_renter_id, v_owner_id
  FROM bookings
  WHERE id = p_booking_id;

  IF v_booking_status IS NULL THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF v_booking_status != 'completed' THEN
    RAISE EXCEPTION 'Booking must be completed to leave a review. Current status: %', v_booking_status;
  END IF;

  -- Validar período de 14 días
  IF now() > v_checkout_date + INTERVAL '14 days' THEN
    RAISE EXCEPTION 'Review period has expired (14 days after checkout)';
  END IF;

  -- Validar que el reviewer es parte de la reserva
  IF p_reviewer_id != v_renter_id AND p_reviewer_id != v_owner_id THEN
    RAISE EXCEPTION 'Reviewer must be part of the booking';
  END IF;

  -- Validar review_type
  IF p_review_type = 'renter_to_owner' AND p_reviewer_id != v_renter_id THEN
    RAISE EXCEPTION 'Invalid review type for this reviewer';
  END IF;

  IF p_review_type = 'owner_to_renter' AND p_reviewer_id != v_owner_id THEN
    RAISE EXCEPTION 'Invalid review type for this reviewer';
  END IF;

  -- Validar que no exista ya una review de este reviewer para esta reserva
  IF EXISTS (
    SELECT 1 FROM reviews
    WHERE booking_id = p_booking_id
    AND reviewer_id = p_reviewer_id
  ) THEN
    RAISE EXCEPTION 'Review already exists for this booking';
  END IF;

  -- Crear review
  INSERT INTO reviews (
    booking_id, reviewer_id, reviewee_id, car_id, review_type,
    rating_cleanliness, rating_communication, rating_accuracy,
    rating_location, rating_checkin, rating_value,
    comment_public, comment_private,
    status, is_visible
  ) VALUES (
    p_booking_id, p_reviewer_id, p_reviewee_id, p_car_id, p_review_type,
    p_rating_cleanliness, p_rating_communication, p_rating_accuracy,
    p_rating_location, p_rating_checkin, p_rating_value,
    p_comment_public, p_comment_private,
    'pending', false
  )
  RETURNING id INTO v_review_id;

  -- Verificar si ambas partes ya calificaron para publicar
  PERFORM publish_reviews_if_both_completed(p_booking_id);

  RETURN v_review_id;
END;
$$;

COMMENT ON FUNCTION create_review IS 'Crea una nueva review. Si ambas partes califican, las publica automáticamente.';

-- ============================================
-- 7. FUNCIÓN: Publicar Reviews si ambas partes completaron
-- ============================================

CREATE OR REPLACE FUNCTION publish_reviews_if_both_completed(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pending_count int;
BEGIN
  -- Contar reviews pendientes para esta reserva
  SELECT COUNT(*) INTO v_pending_count
  FROM reviews
  WHERE booking_id = p_booking_id
  AND status = 'pending';

  -- Si ambas partes calificaron (2 reviews pendientes), publicar ambas
  IF v_pending_count = 2 THEN
    UPDATE reviews
    SET
      status = 'published',
      is_visible = true,
      published_at = now()
    WHERE booking_id = p_booking_id
    AND status = 'pending';

    -- Actualizar estadísticas
    PERFORM update_user_stats_for_booking(p_booking_id);
    PERFORM update_car_stats_for_booking(p_booking_id);
  END IF;
END;
$$;

COMMENT ON FUNCTION publish_reviews_if_both_completed IS 'Publica reviews si ambas partes completaron la calificación';

-- ============================================
-- 8. FUNCIÓN: Publicar reviews pendientes (cron job)
-- ============================================

CREATE OR REPLACE FUNCTION publish_pending_reviews()
RETURNS TABLE(published_count int)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count int := 0;
  v_booking record;
BEGIN
  -- Publicar reviews pendientes cuyo período de 14 días ya expiró
  FOR v_booking IN
    SELECT DISTINCT r.booking_id, b.end_date
    FROM reviews r
    INNER JOIN bookings b ON r.booking_id = b.id
    WHERE r.status = 'pending'
    AND now() > b.end_date + INTERVAL '14 days'
  LOOP
    UPDATE reviews
    SET
      status = 'published',
      is_visible = true,
      published_at = now()
    WHERE booking_id = v_booking.booking_id
    AND status = 'pending';

    -- Actualizar estadísticas
    PERFORM update_user_stats_for_booking(v_booking.booking_id);
    PERFORM update_car_stats_for_booking(v_booking.booking_id);

    v_count := v_count + 1;
  END LOOP;

  RETURN QUERY SELECT v_count;
END;
$$;

COMMENT ON FUNCTION publish_pending_reviews IS 'Publica reviews pendientes después de 14 días (ejecutar diariamente)';

-- ============================================
-- 9. FUNCIÓN: Actualizar stats de usuario para una reserva
-- ============================================

CREATE OR REPLACE FUNCTION update_user_stats_for_booking(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_owner_id uuid;
  v_renter_id uuid;
BEGIN
  -- Obtener IDs de la reserva
  SELECT owner_id, renter_id INTO v_owner_id, v_renter_id
  FROM bookings
  WHERE id = p_booking_id;

  -- Actualizar stats del propietario
  PERFORM update_user_stats(v_owner_id);

  -- Actualizar stats del arrendatario
  PERFORM update_user_stats(v_renter_id);
END;
$$;

-- ============================================
-- 10. FUNCIÓN: Actualizar stats completas de usuario
-- ============================================

CREATE OR REPLACE FUNCTION update_user_stats(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_owner_reviews_count int;
  v_owner_rating_avg numeric;
  v_renter_reviews_count int;
  v_renter_rating_avg numeric;
  v_total_bookings_owner int;
  v_total_bookings_renter int;
  v_cancellation_count int;
  v_cancellation_rate numeric;
  v_is_top_host boolean;
  v_is_super_host boolean;
  v_badges jsonb;
BEGIN
  -- Estadísticas como propietario
  SELECT
    COUNT(*),
    COALESCE(AVG(rating_overall), 0)
  INTO v_owner_reviews_count, v_owner_rating_avg
  FROM reviews
  WHERE reviewee_id = p_user_id
  AND review_type = 'renter_to_owner'
  AND is_visible = true;

  -- Estadísticas como arrendatario
  SELECT
    COUNT(*),
    COALESCE(AVG(rating_overall), 0)
  INTO v_renter_reviews_count, v_renter_rating_avg
  FROM reviews
  WHERE reviewee_id = p_user_id
  AND review_type = 'owner_to_renter'
  AND is_visible = true;

  -- Bookings stats
  SELECT COUNT(*) INTO v_total_bookings_owner
  FROM bookings
  WHERE owner_id = p_user_id;

  SELECT COUNT(*) INTO v_total_bookings_renter
  FROM bookings
  WHERE renter_id = p_user_id;

  SELECT COUNT(*) INTO v_cancellation_count
  FROM bookings
  WHERE (owner_id = p_user_id OR renter_id = p_user_id)
  AND status = 'cancelled';

  v_cancellation_rate := CASE
    WHEN (v_total_bookings_owner + v_total_bookings_renter) > 0
    THEN v_cancellation_count::numeric / (v_total_bookings_owner + v_total_bookings_renter)
    ELSE 0
  END;

  -- Calcular badges
  v_is_top_host := (
    v_owner_reviews_count >= 10
    AND v_owner_rating_avg >= 4.8
    AND v_cancellation_rate < 0.05
  );

  v_is_super_host := (
    v_owner_reviews_count >= 50
    AND v_owner_rating_avg >= 4.9
    AND v_cancellation_rate = 0
  );

  -- Construir array de badges
  v_badges := '[]'::jsonb;
  IF v_is_top_host THEN
    v_badges := v_badges || '["top_host"]'::jsonb;
  END IF;
  IF v_is_super_host THEN
    v_badges := v_badges || '["super_host"]'::jsonb;
  END IF;

  -- Insertar o actualizar stats
  INSERT INTO user_stats (
    user_id,
    owner_reviews_count,
    owner_rating_avg,
    owner_rating_cleanliness_avg,
    owner_rating_communication_avg,
    owner_rating_accuracy_avg,
    owner_rating_location_avg,
    owner_rating_checkin_avg,
    owner_rating_value_avg,
    renter_reviews_count,
    renter_rating_avg,
    total_bookings_as_owner,
    total_bookings_as_renter,
    cancellation_count,
    cancellation_rate,
    is_top_host,
    is_super_host,
    badges,
    last_review_received_at
  )
  SELECT
    p_user_id,
    v_owner_reviews_count,
    v_owner_rating_avg,
    COALESCE((SELECT AVG(rating_cleanliness) FROM reviews WHERE reviewee_id = p_user_id AND review_type = 'renter_to_owner' AND is_visible = true), 0),
    COALESCE((SELECT AVG(rating_communication) FROM reviews WHERE reviewee_id = p_user_id AND review_type = 'renter_to_owner' AND is_visible = true), 0),
    COALESCE((SELECT AVG(rating_accuracy) FROM reviews WHERE reviewee_id = p_user_id AND review_type = 'renter_to_owner' AND is_visible = true), 0),
    COALESCE((SELECT AVG(rating_location) FROM reviews WHERE reviewee_id = p_user_id AND review_type = 'renter_to_owner' AND is_visible = true), 0),
    COALESCE((SELECT AVG(rating_checkin) FROM reviews WHERE reviewee_id = p_user_id AND review_type = 'renter_to_owner' AND is_visible = true), 0),
    COALESCE((SELECT AVG(rating_value) FROM reviews WHERE reviewee_id = p_user_id AND review_type = 'renter_to_owner' AND is_visible = true), 0),
    v_renter_reviews_count,
    v_renter_rating_avg,
    v_total_bookings_owner,
    v_total_bookings_renter,
    v_cancellation_count,
    v_cancellation_rate,
    v_is_top_host,
    v_is_super_host,
    v_badges,
    now()
  ON CONFLICT (user_id) DO UPDATE
  SET
    owner_reviews_count = EXCLUDED.owner_reviews_count,
    owner_rating_avg = EXCLUDED.owner_rating_avg,
    owner_rating_cleanliness_avg = EXCLUDED.owner_rating_cleanliness_avg,
    owner_rating_communication_avg = EXCLUDED.owner_rating_communication_avg,
    owner_rating_accuracy_avg = EXCLUDED.owner_rating_accuracy_avg,
    owner_rating_location_avg = EXCLUDED.owner_rating_location_avg,
    owner_rating_checkin_avg = EXCLUDED.owner_rating_checkin_avg,
    owner_rating_value_avg = EXCLUDED.owner_rating_value_avg,
    renter_reviews_count = EXCLUDED.renter_reviews_count,
    renter_rating_avg = EXCLUDED.renter_rating_avg,
    total_bookings_as_owner = EXCLUDED.total_bookings_as_owner,
    total_bookings_as_renter = EXCLUDED.total_bookings_as_renter,
    cancellation_count = EXCLUDED.cancellation_count,
    cancellation_rate = EXCLUDED.cancellation_rate,
    is_top_host = EXCLUDED.is_top_host,
    is_super_host = EXCLUDED.is_super_host,
    badges = EXCLUDED.badges,
    last_review_received_at = EXCLUDED.last_review_received_at,
    updated_at = now();
END;
$$;

COMMENT ON FUNCTION update_user_stats IS 'Recalcula todas las estadísticas y badges de un usuario';

-- ============================================
-- 11. FUNCIÓN: Actualizar stats de auto para una reserva
-- ============================================

CREATE OR REPLACE FUNCTION update_car_stats_for_booking(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_car_id uuid;
BEGIN
  SELECT car_id INTO v_car_id
  FROM bookings
  WHERE id = p_booking_id;

  PERFORM update_car_stats(v_car_id);
END;
$$;

-- ============================================
-- 12. FUNCIÓN: Actualizar stats completas de auto
-- ============================================

CREATE OR REPLACE FUNCTION update_car_stats(p_car_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reviews_count int;
  v_rating_avg numeric;
  v_total_bookings int;
  v_completed_bookings int;
  v_cancelled_bookings int;
  v_cancellation_rate numeric;
BEGIN
  -- Estadísticas de reviews
  SELECT
    COUNT(*),
    COALESCE(AVG(rating_overall), 0)
  INTO v_reviews_count, v_rating_avg
  FROM reviews
  WHERE car_id = p_car_id
  AND is_visible = true;

  -- Bookings stats
  SELECT COUNT(*) INTO v_total_bookings
  FROM bookings
  WHERE car_id = p_car_id;

  SELECT COUNT(*) INTO v_completed_bookings
  FROM bookings
  WHERE car_id = p_car_id
  AND status = 'completed';

  SELECT COUNT(*) INTO v_cancelled_bookings
  FROM bookings
  WHERE car_id = p_car_id
  AND status = 'cancelled';

  v_cancellation_rate := CASE
    WHEN v_total_bookings > 0
    THEN v_cancelled_bookings::numeric / v_total_bookings
    ELSE 0
  END;

  -- Insertar o actualizar stats
  INSERT INTO car_stats (
    car_id,
    reviews_count,
    rating_avg,
    rating_cleanliness_avg,
    rating_communication_avg,
    rating_accuracy_avg,
    rating_location_avg,
    rating_checkin_avg,
    rating_value_avg,
    total_bookings,
    completed_bookings,
    cancelled_bookings,
    cancellation_rate,
    last_review_at
  )
  SELECT
    p_car_id,
    v_reviews_count,
    v_rating_avg,
    COALESCE((SELECT AVG(rating_cleanliness) FROM reviews WHERE car_id = p_car_id AND is_visible = true), 0),
    COALESCE((SELECT AVG(rating_communication) FROM reviews WHERE car_id = p_car_id AND is_visible = true), 0),
    COALESCE((SELECT AVG(rating_accuracy) FROM reviews WHERE car_id = p_car_id AND is_visible = true), 0),
    COALESCE((SELECT AVG(rating_location) FROM reviews WHERE car_id = p_car_id AND is_visible = true), 0),
    COALESCE((SELECT AVG(rating_checkin) FROM reviews WHERE car_id = p_car_id AND is_visible = true), 0),
    COALESCE((SELECT AVG(rating_value) FROM reviews WHERE car_id = p_car_id AND is_visible = true), 0),
    v_total_bookings,
    v_completed_bookings,
    v_cancelled_bookings,
    v_cancellation_rate,
    (SELECT MAX(created_at) FROM reviews WHERE car_id = p_car_id AND is_visible = true)
  ON CONFLICT (car_id) DO UPDATE
  SET
    reviews_count = EXCLUDED.reviews_count,
    rating_avg = EXCLUDED.rating_avg,
    rating_cleanliness_avg = EXCLUDED.rating_cleanliness_avg,
    rating_communication_avg = EXCLUDED.rating_communication_avg,
    rating_accuracy_avg = EXCLUDED.rating_accuracy_avg,
    rating_location_avg = EXCLUDED.rating_location_avg,
    rating_checkin_avg = EXCLUDED.rating_checkin_avg,
    rating_value_avg = EXCLUDED.rating_value_avg,
    total_bookings = EXCLUDED.total_bookings,
    completed_bookings = EXCLUDED.completed_bookings,
    cancelled_bookings = EXCLUDED.cancelled_bookings,
    cancellation_rate = EXCLUDED.cancellation_rate,
    last_review_at = EXCLUDED.last_review_at,
    updated_at = now();
END;
$$;

COMMENT ON FUNCTION update_car_stats IS 'Recalcula todas las estadísticas de un vehículo';

-- ============================================
-- 13. FUNCIÓN: Flaggear review (reportar)
-- ============================================

CREATE OR REPLACE FUNCTION flag_review(
  p_review_id uuid,
  p_user_id uuid,
  p_reason text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE reviews
  SET
    is_flagged = true,
    flag_reason = p_reason,
    flagged_by = p_user_id,
    flagged_at = now()
  WHERE id = p_review_id;

  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION flag_review IS 'Permite a los usuarios reportar reviews inapropiadas';

-- ============================================
-- 14. VISTAS ÚTILES
-- ============================================

-- Vista: Reviews con información completa
CREATE OR REPLACE VIEW reviews_full AS
SELECT
  r.*,
  reviewer.full_name as reviewer_name,
  reviewer.avatar_url as reviewer_avatar,
  reviewee.full_name as reviewee_name,
  reviewee.avatar_url as reviewee_avatar,
  c.title as car_title,
  c.brand as car_brand,
  c.model as car_model,
  b.start_date as booking_start,
  b.end_date as booking_end
FROM reviews r
INNER JOIN profiles reviewer ON r.reviewer_id = reviewer.id
INNER JOIN profiles reviewee ON r.reviewee_id = reviewee.id
INNER JOIN cars c ON r.car_id = c.id
INNER JOIN bookings b ON r.booking_id = b.id;

COMMENT ON VIEW reviews_full IS 'Vista con información completa de reviews incluyendo perfiles y vehículos';

-- ============================================
-- 15. GRANTS Y PERMISOS
-- ============================================

-- Permitir ejecución de funciones a usuarios autenticados
GRANT EXECUTE ON FUNCTION create_review TO authenticated;
GRANT EXECUTE ON FUNCTION flag_review TO authenticated;

-- Vistas accesibles públicamente (RLS controla visibilidad)
GRANT SELECT ON reviews_full TO authenticated, anon;

-- ============================================
-- SETUP COMPLETADO
-- ============================================

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '✅ Sistema de Reviews configurado exitosamente';
  RAISE NOTICE '📊 Tablas creadas: reviews, user_stats, car_stats';
  RAISE NOTICE '⚙️  Funciones SQL: 13 funciones';
  RAISE NOTICE '🔒 RLS policies: Habilitadas';
  RAISE NOTICE '📅 Próximo paso: Configurar cron job para publish_pending_reviews()';
END $$;
