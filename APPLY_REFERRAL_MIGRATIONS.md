# 🚀 Aplicar Migraciones de Base de Datos

## MÉTODO RÁPIDO: Copy-Paste en Supabase Dashboard

### Paso 1: Ir al SQL Editor
Abre: https://supabase.com/dashboard/project/pisqjmoklivzpwufhscx/sql/new

### Paso 2: Copiar y Ejecutar el SQL Consolidado

Copia TODO el contenido de abajo y pégalo en el editor SQL de Supabase:

```sql
-- ============================================
-- CONSOLIDATED MIGRATION
-- Date: 2025-11-14
-- Description: Create missing tables (car_stats, car_blocked_dates, reviews fix)
-- ============================================

-- ============================================
-- MIGRATION 1: car_stats table
-- ============================================

CREATE TABLE IF NOT EXISTS public.car_stats (
  car_id UUID PRIMARY KEY REFERENCES public.cars(id) ON DELETE CASCADE,
  reviews_count INTEGER DEFAULT 0,
  rating_avg NUMERIC(3,2) DEFAULT 0,
  rating_cleanliness_avg NUMERIC(3,2) DEFAULT 0,
  rating_communication_avg NUMERIC(3,2) DEFAULT 0,
  rating_accuracy_avg NUMERIC(3,2) DEFAULT 0,
  rating_location_avg NUMERIC(3,2) DEFAULT 0,
  rating_checkin_avg NUMERIC(3,2) DEFAULT 0,
  rating_value_avg NUMERIC(3,2) DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  completed_bookings INTEGER DEFAULT 0,
  cancelled_bookings INTEGER DEFAULT 0,
  cancellation_rate NUMERIC(4,2) DEFAULT 0,
  last_review_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_car_stats_car_id ON public.car_stats(car_id);
CREATE INDEX IF NOT EXISTS idx_car_stats_rating ON public.car_stats(rating_avg DESC);
CREATE INDEX IF NOT EXISTS idx_car_stats_bookings ON public.car_stats(total_bookings DESC);

ALTER TABLE public.car_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view car stats" ON public.car_stats;
CREATE POLICY "Anyone can view car stats" ON public.car_stats FOR SELECT USING (true);

DROP POLICY IF EXISTS "Car owners can update their car stats" ON public.car_stats;
CREATE POLICY "Car owners can update their car stats" ON public.car_stats
    FOR ALL USING (
        car_id IN (SELECT id FROM public.cars WHERE owner_id = auth.uid())
    );

GRANT SELECT ON public.car_stats TO anon, authenticated;
GRANT ALL ON public.car_stats TO service_role;

-- Initialize stats for existing cars
INSERT INTO public.car_stats (car_id, reviews_count, rating_avg, total_bookings)
SELECT c.id, 0, 0.00, 0
FROM public.cars c
WHERE NOT EXISTS (SELECT 1 FROM public.car_stats cs WHERE cs.car_id = c.id)
ON CONFLICT (car_id) DO NOTHING;

-- ============================================
-- MIGRATION 2: car_blocked_dates table (verify/create)
-- ============================================

CREATE TABLE IF NOT EXISTS public.car_blocked_dates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    car_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
    blocked_from DATE NOT NULL,
    blocked_to DATE NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN ('maintenance', 'personal_use', 'vacation', 'other')),
    notes TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT car_blocked_dates_date_range_check CHECK (blocked_from <= blocked_to)
);

CREATE INDEX IF NOT EXISTS idx_car_blocked_dates_car_id ON public.car_blocked_dates(car_id);
CREATE INDEX IF NOT EXISTS idx_car_blocked_dates_dates ON public.car_blocked_dates(blocked_from, blocked_to);
CREATE INDEX IF NOT EXISTS idx_car_blocked_dates_created_by ON public.car_blocked_dates(created_by);

ALTER TABLE public.car_blocked_dates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Car owners can view blocked dates for their cars" ON public.car_blocked_dates;
CREATE POLICY "Car owners can view blocked dates for their cars" ON public.car_blocked_dates
    FOR SELECT USING (
        car_id IN (SELECT id FROM public.cars WHERE owner_id = auth.uid())
    );

DROP POLICY IF EXISTS "Car owners can insert blocked dates for their cars" ON public.car_blocked_dates;
CREATE POLICY "Car owners can insert blocked dates for their cars" ON public.car_blocked_dates
    FOR INSERT WITH CHECK (
        car_id IN (SELECT id FROM public.cars WHERE owner_id = auth.uid())
        AND created_by = auth.uid()
    );

DROP POLICY IF EXISTS "Car owners can update blocked dates for their cars" ON public.car_blocked_dates;
CREATE POLICY "Car owners can update blocked dates for their cars" ON public.car_blocked_dates
    FOR UPDATE USING (
        car_id IN (SELECT id FROM public.cars WHERE owner_id = auth.uid())
        AND created_by = auth.uid()
    );

DROP POLICY IF EXISTS "Car owners can delete blocked dates for their cars" ON public.car_blocked_dates;
CREATE POLICY "Car owners can delete blocked dates for their cars" ON public.car_blocked_dates
    FOR DELETE USING (
        car_id IN (SELECT id FROM public.cars WHERE owner_id = auth.uid())
        AND created_by = auth.uid()
    );

GRANT ALL ON public.car_blocked_dates TO authenticated;
GRANT ALL ON public.car_blocked_dates TO service_role;

-- ============================================
-- MIGRATION 3: Reviews table fix
-- ============================================

-- Add missing columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'car_id') THEN
        ALTER TABLE public.reviews ADD COLUMN car_id UUID REFERENCES public.cars(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'review_type') THEN
        ALTER TABLE public.reviews ADD COLUMN review_type TEXT CHECK (review_type IN ('renter_to_owner', 'owner_to_renter'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'is_visible') THEN
        ALTER TABLE public.reviews ADD COLUMN is_visible BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'reviewer_id') THEN
        ALTER TABLE public.reviews ADD COLUMN reviewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'reviewee_id') THEN
        ALTER TABLE public.reviews ADD COLUMN reviewee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reviews_car_id ON public.reviews(car_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON public.reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON public.reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_review_type ON public.reviews(review_type);
CREATE INDEX IF NOT EXISTS idx_reviews_visible ON public.reviews(is_visible) WHERE is_visible = true;
CREATE INDEX IF NOT EXISTS idx_reviews_car_visible ON public.reviews(car_id, is_visible) WHERE is_visible = true;
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_car_type_visible ON public.reviews(car_id, review_type, is_visible) 
    WHERE is_visible = true;

-- Update RLS policies
DROP POLICY IF EXISTS "Anyone can view visible reviews" ON public.reviews;
CREATE POLICY "Anyone can view visible reviews" ON public.reviews
    FOR SELECT USING (
        is_visible = true 
        OR reviewer_id = auth.uid()
        OR reviewee_id = auth.uid()
    );

DROP POLICY IF EXISTS "Users can create reviews" ON public.reviews;
CREATE POLICY "Users can create reviews" ON public.reviews
    FOR INSERT WITH CHECK (reviewer_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;
CREATE POLICY "Users can update own reviews" ON public.reviews
    FOR UPDATE USING (reviewer_id = auth.uid());

GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

SELECT 
    'Migrations applied successfully! ' ||
    'Tables created: car_stats, car_blocked_dates (verified), reviews (fixed)' 
    AS status;
```

### Paso 3: Ejecutar
Presiona el botón "RUN" o Ctrl+Enter

### Paso 4: Verificar
Deberías ver el mensaje de éxito:
```
Migrations applied successfully! Tables created: car_stats, car_blocked_dates (verified), reviews (fixed)
```

## ✅ Resultado Esperado

Después de ejecutar:
- ✅ Tabla `car_stats` creada
- ✅ Tabla `car_blocked_dates` verificada/creada
- ✅ Tabla `reviews` con estructura correcta
- ✅ Políticas RLS configuradas
- ✅ Índices creados para performance
- ✅ Permisos otorgados

## 🔍 Verificación

Para verificar que todo funcionó, ejecuta en Supabase:

```sql
-- Verificar tablas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('car_stats', 'car_blocked_dates', 'reviews');

-- Contar registros en car_stats
SELECT COUNT(*) FROM car_stats;

-- Ver estructura de reviews
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'reviews'
ORDER BY ordinal_position;
```

## 🎉 Siguiente Paso

Después de aplicar estas migraciones:
1. Refresca tu aplicación (Ctrl+Shift+R)
2. Verifica que no haya errores 404/400 en consola
3. Prueba las páginas de perfil y detalles de autos

