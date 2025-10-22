-- ================================================
-- Create vehicle_documents table
-- Description: Store vehicle registration, insurance, and verification documents
-- Date: 2025-10-17
-- ================================================

BEGIN;

-- Create enum for document types
DO $$ BEGIN
  CREATE TYPE vehicle_document_kind AS ENUM (
    'registration',          -- Cédula verde/título de propiedad
    'insurance',             -- Póliza de seguro
    'technical_inspection',  -- Revisión técnica
    'circulation_permit',    -- Permiso de circulación
    'ownership_proof'        -- Comprobante de titularidad
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create vehicle_documents table
CREATE TABLE IF NOT EXISTS public.vehicle_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id uuid NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  kind vehicle_document_kind NOT NULL,
  storage_path text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  expiry_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  verified_by uuid REFERENCES public.profiles(id),
  verified_at timestamptz,

  -- Constraint: Each car can have only one document of each kind
  UNIQUE(car_id, kind)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_car_id ON public.vehicle_documents(car_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_status ON public.vehicle_documents(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_kind ON public.vehicle_documents(kind);

-- Enable RLS
ALTER TABLE public.vehicle_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Car owners can view their own car's documents
CREATE POLICY "select_vehicle_documents" ON public.vehicle_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cars
      WHERE cars.id = vehicle_documents.car_id
      AND cars.owner_id = auth.uid()
    )
  );

-- Car owners can insert documents for their own cars
CREATE POLICY "insert_vehicle_documents" ON public.vehicle_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cars
      WHERE cars.id = vehicle_documents.car_id
      AND cars.owner_id = auth.uid()
    )
  );

-- Car owners can update their own car's documents (only if not verified)
CREATE POLICY "update_vehicle_documents" ON public.vehicle_documents
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cars
      WHERE cars.id = vehicle_documents.car_id
      AND cars.owner_id = auth.uid()
    )
    AND status = 'pending'  -- Only pending documents can be updated
  );

-- Car owners can delete their own car's documents (only if not verified)
CREATE POLICY "delete_vehicle_documents" ON public.vehicle_documents
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cars
      WHERE cars.id = vehicle_documents.car_id
      AND cars.owner_id = auth.uid()
    )
    AND status = 'pending'  -- Only pending documents can be deleted
  );

-- Trigger to update updated_at
CREATE TRIGGER vehicle_documents_updated_at
  BEFORE UPDATE ON public.vehicle_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

COMMIT;

-- ================================================
-- Storage bucket for vehicle documents
-- ================================================
-- This should be created in Supabase Storage UI or via:
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('vehicle-documents', 'vehicle-documents', false);

-- Storage RLS policies (to be created in Supabase Storage):
-- 1. Allow car owners to upload to their car's folder
-- 2. Allow car owners to read their car's documents
-- 3. Allow admins to read all documents
