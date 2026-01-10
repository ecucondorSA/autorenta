-- =============================================================================
-- Migration: Add Storage Policy for Video Inspection Frames
-- =============================================================================
--
-- Adds storage policies for the 'inspections/' folder in 'car-images' bucket.
-- This allows authenticated users to upload/view inspection frames organized
-- by booking_id and stage.
--
-- Path format: inspections/{booking_id}/{stage}/{timestamp}_frame_{index}.jpg
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Policy: Authenticated users can upload inspection frames
-- -----------------------------------------------------------------------------
-- Users can upload frames to any booking they're part of (owner or renter)
-- The actual authorization is handled by the Edge Function which validates
-- the user's relationship to the booking before providing URLs.

CREATE POLICY "Users can upload inspection frames"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'car-images'
  AND (storage.foldername(name))[1] = 'inspections'
);

-- -----------------------------------------------------------------------------
-- 2. Policy: Anyone can view inspection frames (public read)
-- -----------------------------------------------------------------------------
-- Inspection frames need to be publicly readable for the Edge Function
-- to analyze them with Gemini Vision API.

-- Note: The existing "Anyone can view car images" policy already allows
-- SELECT on all objects in car-images bucket, so this is covered.

-- -----------------------------------------------------------------------------
-- 3. Policy: Authenticated users can delete their inspection frames
-- -----------------------------------------------------------------------------
-- Allow cleanup of old inspection frames

CREATE POLICY "Users can delete inspection frames"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'car-images'
  AND (storage.foldername(name))[1] = 'inspections'
);

-- Note: Comments on storage policies are not supported by Supabase
-- Path format: inspections/{booking_id}/{stage}/{timestamp}_frame_{index}.jpg
