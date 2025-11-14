-- =====================================================
-- ÍNDICES CRÍTICOS PARA RLS Y REALTIME
-- Ejecutar en Supabase SQL Editor
-- =====================================================
-- SEGURO: Usa CONCURRENTLY (no bloquea escrituras)
-- =====================================================

-- 1. BOOKINGS (tabla más crítica para Realtime)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_locatario_id
    ON bookings(locatario_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_locador_id
    ON bookings(locador_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_car_id
    ON bookings(car_id);

-- Índice compuesto para queries de status + fechas
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_status_dates
    ON bookings(status, start_date, end_date)
    WHERE status IN ('active', 'pending', 'approved');

-- 2. CARS
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cars_user_id
    ON cars(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cars_status
    ON cars(status)
    WHERE status = 'active';

-- 3. NOTIFICATIONS (tabla con actividad Realtime)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_id
    ON notifications(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_read_created
    ON notifications(user_id, read, created_at DESC);

-- 4. WALLET_TRANSACTIONS
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_transactions_user_id
    ON wallet_transactions(user_id);

-- 5. REVIEWS
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_booking_id
    ON reviews(booking_id);

-- 6. CAR_IMAGES
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_car_images_car_id
    ON car_images(car_id);

-- =====================================================
-- VERIFICAR QUE SE CREARON
-- =====================================================
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
