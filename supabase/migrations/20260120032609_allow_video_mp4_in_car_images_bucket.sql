-- Allow video/mp4 uploads in car-images bucket for marketing videos
-- This enables the generate-marketing-content function to upload Veo-generated videos

UPDATE storage.buckets
SET allowed_mime_types = array_cat(
  COALESCE(allowed_mime_types, ARRAY[]::text[]),
  ARRAY['video/mp4', 'video/webm', 'video/quicktime']::text[]
)
WHERE name = 'car-images'
  AND NOT ('video/mp4' = ANY(COALESCE(allowed_mime_types, ARRAY[]::text[])));

-- Also increase file size limit to 100MB for videos (if currently lower)
UPDATE storage.buckets
SET file_size_limit = GREATEST(COALESCE(file_size_limit, 0), 104857600) -- 100MB
WHERE name = 'car-images';
