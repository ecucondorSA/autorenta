-- ============================================================================
-- Crear tabla vehicle_documents (faltante en producción)
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.vehicle_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Ownership status
  is_owner BOOLEAN NOT NULL DEFAULT true,

  -- Cédula Verde (ownership document)
  green_card_url TEXT,
  green_card_owner_name TEXT,
  green_card_vehicle_domain TEXT,
  green_card_verified_at TIMESTAMPTZ,
  green_card_ai_score NUMERIC(5,2) CHECK (green_card_ai_score >= 0 AND green_card_ai_score <= 100),
  green_card_ai_metadata JSONB DEFAULT '{}'::jsonb,

  -- Cédula Azul (authorization for non-owners)
  blue_card_url TEXT,
  blue_card_authorized_name TEXT,
  blue_card_verified_at TIMESTAMPTZ,
  blue_card_ai_score NUMERIC(5,2) CHECK (blue_card_ai_score >= 0 AND blue_card_ai_score <= 100),
  blue_card_ai_metadata JSONB DEFAULT '{}'::jsonb,

  -- VTV (Technical Vehicle Verification)
  vtv_url TEXT,
  vtv_expiry DATE,
  vtv_verified_at TIMESTAMPTZ,

  -- Insurance
  insurance_url TEXT,
  insurance_expiry DATE,
  insurance_company TEXT,
  insurance_policy_number TEXT,
  insurance_verified_at TIMESTAMPTZ,

  -- Manual review
  manual_review_required BOOLEAN DEFAULT false,
  manual_reviewed_by UUID REFERENCES public.profiles(id),
  manual_reviewed_at TIMESTAMPTZ,
  manual_review_notes TEXT,
  manual_review_decision TEXT CHECK (manual_review_decision IN ('APPROVED', 'REJECTED', 'PENDING')),

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT vehicle_documents_ownership_check CHECK (
    (is_owner = true AND green_card_url IS NOT NULL) OR
    (is_owner = false AND blue_card_url IS NOT NULL)
  )
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_vehicle_docs_vehicle_id ON public.vehicle_documents(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_docs_user_id ON public.vehicle_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_docs_status ON public.vehicle_documents(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_docs_manual_review ON public.vehicle_documents(manual_review_required)
  WHERE manual_review_required = true;
CREATE INDEX IF NOT EXISTS idx_vehicle_docs_vtv_expiry ON public.vehicle_documents(vtv_expiry)
  WHERE vtv_expiry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicle_docs_insurance_expiry ON public.vehicle_documents(insurance_expiry)
  WHERE insurance_expiry IS NOT NULL;

-- RLS Policies
ALTER TABLE public.vehicle_documents ENABLE ROW LEVEL SECURITY;

-- Los dueños pueden ver/editar documentos de sus propios vehículos
DROP POLICY IF EXISTS "select_vehicle_documents" ON public.vehicle_documents;
CREATE POLICY "select_vehicle_documents" ON public.vehicle_documents
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.cars
    WHERE cars.id = vehicle_documents.vehicle_id
      AND cars.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "insert_vehicle_documents" ON public.vehicle_documents;
CREATE POLICY "insert_vehicle_documents" ON public.vehicle_documents
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cars
    WHERE cars.id = vehicle_documents.vehicle_id
      AND cars.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "update_vehicle_documents" ON public.vehicle_documents;
CREATE POLICY "update_vehicle_documents" ON public.vehicle_documents
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.cars
    WHERE cars.id = vehicle_documents.vehicle_id
      AND cars.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "delete_vehicle_documents" ON public.vehicle_documents;
CREATE POLICY "delete_vehicle_documents" ON public.vehicle_documents
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.cars
    WHERE cars.id = vehicle_documents.vehicle_id
      AND cars.owner_id = auth.uid()
  )
);

COMMIT;

-- Verificar que se creó correctamente
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'vehicle_documents'
ORDER BY ordinal_position;
