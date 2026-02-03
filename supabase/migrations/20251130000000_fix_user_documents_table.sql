-- Fix Migration: Create user_documents table and required enums
-- This table was missing from the migration chain but exists in production
-- Created to fix migration errors when setting up new environments

-- Create document_kind enum if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_kind') THEN
        CREATE TYPE public.document_kind AS ENUM (
            'gov_id_front',
            'gov_id_back',
            'driver_license',
            'utility_bill',
            'selfie',
            'license_front',
            'license_back',
            'vehicle_registration',
            'vehicle_insurance',
            'criminal_record'
        );
    END IF;
END
$$;

-- Create kyc_status enum if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kyc_status') THEN
        CREATE TYPE public.kyc_status AS ENUM (
            'not_started',
            'pending',
            'verified',
            'rejected'
        );
    END IF;
END
$$;

-- Create user_documents table if not exists
CREATE TABLE IF NOT EXISTS public.user_documents (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    kind public.document_kind NOT NULL,
    storage_path TEXT NOT NULL,
    status public.kyc_status NOT NULL DEFAULT 'pending',
    metadata JSONB,
    notes TEXT,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id),
    analyzed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique constraint: one document per kind per user
    CONSTRAINT unique_user_document_kind UNIQUE (user_id, kind)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON public.user_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_status ON public.user_documents(status);
CREATE INDEX IF NOT EXISTS idx_user_documents_kind ON public.user_documents(kind);

-- Enable RLS
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own documents" ON public.user_documents;
CREATE POLICY "Users can view own documents"
    ON public.user_documents
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own documents" ON public.user_documents;
CREATE POLICY "Users can insert own documents"
    ON public.user_documents
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own documents" ON public.user_documents;
CREATE POLICY "Users can update own documents"
    ON public.user_documents
    FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own documents" ON public.user_documents;
CREATE POLICY "Users can delete own documents"
    ON public.user_documents
    FOR DELETE
    USING (auth.uid() = user_id);

-- Admin policy (service role can manage all)
DROP POLICY IF EXISTS "Service role can manage all documents" ON public.user_documents;
CREATE POLICY "Service role can manage all documents"
    ON public.user_documents
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Grant permissions
GRANT ALL ON public.user_documents TO authenticated;
GRANT ALL ON public.user_documents TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.user_documents_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.user_documents_id_seq TO service_role;

COMMENT ON TABLE public.user_documents IS 'Stores user verification documents (ID, license, etc.)';
