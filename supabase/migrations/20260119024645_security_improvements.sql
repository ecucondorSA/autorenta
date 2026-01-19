-- =============================================================================
-- Migration: Security Improvements (P0-027)
-- =============================================================================
-- Based on security audit 2026-01-19
--
-- Changes:
-- 1. Create public_owner_info view for safe owner data exposure
-- 2. Create private bucket for inspections
-- 3. Add RLS policies for sensitive data
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Create public_owner_info view
-- -----------------------------------------------------------------------------
-- This view exposes only safe fields for public owner display in listings.
-- Use this view when querying owner info for car listings instead of
-- joining directly to profiles.

CREATE OR REPLACE VIEW public.public_owner_info AS
SELECT
  p.id,
  p.full_name,
  p.avatar_url,
  p.rating_avg,
  p.rating_count,
  p.created_at,
  -- These are trust indicators, not sensitive data
  CASE
    WHEN p.email_verified THEN true
    ELSE false
  END AS email_verified,
  CASE
    WHEN p.phone_verified THEN true
    ELSE false
  END AS phone_verified,
  -- Verification badges
  CASE
    WHEN p.is_verified THEN true
    ELSE false
  END AS is_verified
FROM public.profiles p
WHERE p.is_active = true OR p.is_active IS NULL;

-- Grant access to the view
GRANT SELECT ON public.public_owner_info TO authenticated;
GRANT SELECT ON public.public_owner_info TO anon;

COMMENT ON VIEW public.public_owner_info IS
'Safe view of owner profiles for public display. Use this instead of direct profile access for listings.';

-- -----------------------------------------------------------------------------
-- 2. Create private bucket for inspection images
-- -----------------------------------------------------------------------------
-- Inspection images contain potentially sensitive vehicle information (plates,
-- damage details). Move them to a private bucket with signed URL access.

-- Create bucket if not exists (handled by Supabase dashboard or seed)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('inspection-images', 'inspection-images', false)
-- ON CONFLICT (id) DO NOTHING;

-- Note: The actual bucket creation should be done via Supabase dashboard:
-- 1. Go to Storage > Create new bucket
-- 2. Name: inspection-images
-- 3. Public: OFF (unchecked)
-- 4. Apply RLS policies below

-- Policies for inspection-images bucket (apply after creating bucket)
/*
CREATE POLICY "Booking participants can upload inspections"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'inspection-images'
  AND EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id::text = (storage.foldername(name))[1]
    AND (b.renter_id = auth.uid() OR b.car_id IN (
      SELECT c.id FROM public.cars c WHERE c.owner_id = auth.uid()
    ))
  )
);

CREATE POLICY "Booking participants can view inspections"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'inspection-images'
  AND EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id::text = (storage.foldername(name))[1]
    AND (b.renter_id = auth.uid() OR b.car_id IN (
      SELECT c.id FROM public.cars c WHERE c.owner_id = auth.uid()
    ))
  )
);
*/

-- -----------------------------------------------------------------------------
-- 3. RPC for generating signed URLs
-- -----------------------------------------------------------------------------
-- Use this function to get signed URLs for private inspection images

CREATE OR REPLACE FUNCTION public.get_inspection_signed_url(
  p_booking_id UUID,
  p_file_path TEXT,
  p_expires_in INTEGER DEFAULT 3600 -- 1 hour default
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  v_user_id UUID;
  v_is_participant BOOLEAN;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify user is participant in booking
  SELECT EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.cars c ON c.id = b.car_id
    WHERE b.id = p_booking_id
    AND (b.renter_id = v_user_id OR c.owner_id = v_user_id)
  ) INTO v_is_participant;

  IF NOT v_is_participant THEN
    RAISE EXCEPTION 'Not authorized to access this booking';
  END IF;

  -- Return signed URL (requires Supabase Storage admin functions)
  -- This is a placeholder - actual implementation uses Edge Functions
  RETURN 'signed-url-placeholder';
END;
$$;

COMMENT ON FUNCTION public.get_inspection_signed_url IS
'Generate signed URL for private inspection images. Only booking participants can access.';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_inspection_signed_url TO authenticated;

-- -----------------------------------------------------------------------------
-- 4. Audit log for sensitive data access (optional)
-- -----------------------------------------------------------------------------
-- Uncomment to enable audit logging for profile access

/*
CREATE TABLE IF NOT EXISTS public.audit_profile_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accessor_id UUID NOT NULL REFERENCES auth.users(id),
  accessed_profile_id UUID NOT NULL,
  access_type TEXT NOT NULL,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_profile_access_time ON public.audit_profile_access(created_at);
ALTER TABLE public.audit_profile_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view audit logs"
ON public.audit_profile_access
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.is_admin = true
  )
);
*/

-- =============================================================================
-- IMPORTANT: Manual Steps Required
-- =============================================================================
--
-- After applying this migration, you must:
--
-- 1. CREATE PRIVATE BUCKET via Supabase Dashboard:
--    - Go to Storage > Create new bucket
--    - Name: inspection-images
--    - Public: OFF
--    - Apply RLS policies (uncomment and run the policies above)
--
-- 2. UPDATE FRONTEND to use signed URLs:
--    - apps/web/src/app/features/inspections/services/inspection.service.ts
--    - Replace direct storage URLs with Edge Function that generates signed URLs
--
-- 3. MIGRATE EXISTING IMAGES (if any):
--    - Move existing inspection images from car-images/inspections/*
--      to inspection-images/*
--    - Use Supabase Storage API or CLI
--
-- 4. UPDATE EDGE FUNCTIONS:
--    - analyze-video-inspection/index.ts
--    - gemini-analyze-frame/index.ts
--    - These need to use signed URLs or service role for private bucket access
--
-- =============================================================================
