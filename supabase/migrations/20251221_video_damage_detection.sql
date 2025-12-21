-- Migration: Add Video Damage Detection Tables
-- Description: Tablas para almacenar videos de inspección y resultados de análisis con IA
-- Created: 2025-12-21

-- ============================================
-- 1. Tabla de videos de inspección
-- ============================================
CREATE TABLE IF NOT EXISTS public.inspection_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  car_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Tipo de inspección
  inspection_type TEXT NOT NULL CHECK (inspection_type IN ('checkin', 'checkout')),
  
  -- Ruta del video en Cloud Storage
  video_path TEXT NOT NULL,
  video_url TEXT, -- URL pública del video (opcional)
  
  -- Estado del procesamiento
  status TEXT NOT NULL DEFAULT 'processing' 
    CHECK (status IN ('processing', 'completed', 'failed')),
  
  -- Metadata
  file_size_bytes BIGINT,
  duration_seconds INTEGER,
  video_codec TEXT,
  resolution TEXT, -- e.g., "1920x1080"
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  
  UNIQUE(booking_id, inspection_type)
);

-- Índices para búsquedas rápidas
CREATE INDEX idx_inspection_videos_booking ON public.inspection_videos(booking_id);
CREATE INDEX idx_inspection_videos_status ON public.inspection_videos(status);
CREATE INDEX idx_inspection_videos_created ON public.inspection_videos(created_at DESC);

-- RLS Policies
ALTER TABLE public.inspection_videos ENABLE ROW LEVEL SECURITY;

-- Users can view their own inspection videos (as renter or owner)
CREATE POLICY "Users can view own inspection videos"
  ON public.inspection_videos
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    auth.uid() IN (
      SELECT owner_id FROM public.cars WHERE id = car_id
    ) OR
    auth.uid() IN (
      SELECT renter_id FROM public.bookings WHERE id = booking_id
    )
  );

-- Users can upload inspection videos for their bookings
CREATE POLICY "Users can upload inspection videos"
  ON public.inspection_videos
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    (
      -- Renter can upload checkout video
      (inspection_type = 'checkout' AND auth.uid() IN (
        SELECT renter_id FROM public.bookings WHERE id = booking_id
      )) OR
      -- Owner can upload checkin video
      (inspection_type = 'checkin' AND auth.uid() IN (
        SELECT owner_id FROM public.cars WHERE id = car_id
      ))
    )
  );

-- ============================================
-- 2. Tabla de análisis de daños
-- ============================================
CREATE TABLE IF NOT EXISTS public.video_damage_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  inspection_video_id UUID NOT NULL REFERENCES public.inspection_videos(id) ON DELETE CASCADE,
  
  -- Tipo de inspección
  inspection_type TEXT NOT NULL CHECK (inspection_type IN ('checkin', 'checkout')),
  
  -- Resultados del análisis (JSON array de daños detectados)
  damages JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Resumen generado por IA
  summary TEXT,
  
  -- Confianza general del análisis (0-1)
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  
  -- Metadata del procesamiento
  processing_time_ms INTEGER,
  vertex_ai_model TEXT, -- e.g., "gemini-2.0-flash-exp"
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(booking_id, inspection_type)
);

-- Índices
CREATE INDEX idx_video_damage_analysis_booking ON public.video_damage_analysis(booking_id);
CREATE INDEX idx_video_damage_analysis_created ON public.video_damage_analysis(created_at DESC);

-- Índice GIN para búsquedas en el JSON de daños
CREATE INDEX idx_video_damage_analysis_damages ON public.video_damage_analysis USING GIN (damages);

-- RLS Policies
ALTER TABLE public.video_damage_analysis ENABLE ROW LEVEL SECURITY;

-- Users can view analysis for their bookings
CREATE POLICY "Users can view video analysis"
  ON public.video_damage_analysis
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT renter_id FROM public.bookings WHERE id = booking_id
      UNION
      SELECT owner_id FROM public.cars 
      WHERE id = (SELECT car_id FROM public.bookings WHERE id = booking_id)
    )
  );

-- ============================================
-- 3. Tabla de comparación de inspecciones
-- ============================================
CREATE TABLE IF NOT EXISTS public.inspection_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE UNIQUE,
  
  checkin_analysis_id UUID REFERENCES public.video_damage_analysis(id) ON DELETE SET NULL,
  checkout_analysis_id UUID REFERENCES public.video_damage_analysis(id) ON DELETE SET NULL,
  
  -- Daños nuevos detectados (presentes en checkout pero no en checkin)
  new_damages JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Costos estimados
  total_estimated_cost_usd DECIMAL(10,2) DEFAULT 0,
  
  -- Resumen de la comparación
  comparison_summary TEXT,
  
  -- Estado de la disputa (si aplica)
  dispute_status TEXT CHECK (dispute_status IN (
    'no_dispute', 'pending_review', 'owner_accepted', 'renter_contested', 'resolved'
  )) DEFAULT 'no_dispute',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_inspection_comparisons_booking ON public.inspection_comparisons(booking_id);
CREATE INDEX idx_inspection_comparisons_dispute ON public.inspection_comparisons(dispute_status);

-- RLS Policies
ALTER TABLE public.inspection_comparisons ENABLE ROW LEVEL SECURITY;

-- Users can view comparisons for their bookings
CREATE POLICY "Users can view inspection comparisons"
  ON public.inspection_comparisons
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT renter_id FROM public.bookings WHERE id = booking_id
      UNION
      SELECT owner_id FROM public.cars 
      WHERE id = (SELECT car_id FROM public.bookings WHERE id = booking_id)
    )
  );

-- ============================================
-- 4. Función helper: Obtener análisis completo
-- ============================================
CREATE OR REPLACE FUNCTION public.get_inspection_analysis(p_booking_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'booking_id', p_booking_id,
    'checkin', (
      SELECT jsonb_build_object(
        'video', row_to_json(iv.*),
        'analysis', row_to_json(va.*)
      )
      FROM public.inspection_videos iv
      LEFT JOIN public.video_damage_analysis va ON va.inspection_video_id = iv.id
      WHERE iv.booking_id = p_booking_id AND iv.inspection_type = 'checkin'
      LIMIT 1
    ),
    'checkout', (
      SELECT jsonb_build_object(
        'video', row_to_json(iv.*),
        'analysis', row_to_json(va.*)
      )
      FROM public.inspection_videos iv
      LEFT JOIN public.video_damage_analysis va ON va.inspection_video_id = iv.id
      WHERE iv.booking_id = p_booking_id AND iv.inspection_type = 'checkout'
      LIMIT 1
    ),
    'comparison', (
      SELECT row_to_json(ic.*)
      FROM public.inspection_comparisons ic
      WHERE ic.booking_id = p_booking_id
      LIMIT 1
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- ============================================
-- 5. Trigger: Auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_inspection_comparison_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_inspection_comparison_updated_at
BEFORE UPDATE ON public.inspection_comparisons
FOR EACH ROW
EXECUTE FUNCTION public.update_inspection_comparison_updated_at();

-- ============================================
-- 6. Comentarios
-- ============================================
COMMENT ON TABLE public.inspection_videos IS 
'Videos de inspección (check-in/check-out) almacenados en GCP Cloud Storage';

COMMENT ON TABLE public.video_damage_analysis IS 
'Resultados del análisis de daños con Vertex AI Gemini';

COMMENT ON TABLE public.inspection_comparisons IS 
'Comparación entre check-in y check-out para detectar daños nuevos';

COMMENT ON FUNCTION public.get_inspection_analysis IS 
'Obtiene análisis completo de inspecciones de un booking (checkin + checkout + comparison)';
