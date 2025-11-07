-- ============================================
-- Admin Review Moderation Functions
-- ============================================
-- This migration adds admin functions for moderating flagged reviews

-- Function: moderate_review
-- Allows admins to approve or reject flagged reviews
CREATE OR REPLACE FUNCTION moderate_review(
  p_review_id uuid,
  p_admin_id uuid,
  p_action text, -- 'approved' or 'rejected'
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_role text;
  v_result json;
BEGIN
  -- Verify admin role
  SELECT role INTO v_admin_role
  FROM profiles
  WHERE id = p_admin_id;

  IF v_admin_role != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can moderate reviews';
  END IF;

  -- Validate action
  IF p_action NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid action: must be "approved" or "rejected"';
  END IF;

  -- Update review
  UPDATE reviews
  SET
    moderation_status = p_action,
    moderated_by = p_admin_id,
    moderated_at = now(),
    moderation_notes = p_notes,
    -- If rejected, hide the review
    is_visible = CASE WHEN p_action = 'rejected' THEN false ELSE is_visible END,
    status = CASE WHEN p_action = 'rejected' THEN 'hidden' ELSE status END
  WHERE id = p_review_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Review not found';
  END IF;

  -- Return result
  SELECT json_build_object(
    'success', true,
    'review_id', p_review_id,
    'action', p_action,
    'moderated_at', now()
  ) INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION moderate_review IS 'Permite a los admins aprobar o rechazar reviews reportadas';

-- Function: get_flagged_reviews
-- Returns all flagged reviews with full context for admin review
CREATE OR REPLACE FUNCTION get_flagged_reviews(
  p_admin_id uuid,
  p_status text DEFAULT NULL -- 'pending', 'approved', 'rejected', or NULL for all
)
RETURNS TABLE (
  id uuid,
  booking_id uuid,
  reviewer_id uuid,
  reviewer_name text,
  reviewer_avatar text,
  reviewee_id uuid,
  reviewee_name text,
  reviewee_avatar text,
  car_id uuid,
  car_title text,
  review_type text,
  rating_cleanliness numeric,
  rating_communication numeric,
  rating_accuracy numeric,
  rating_location numeric,
  rating_checkin numeric,
  rating_value numeric,
  rating_overall numeric,
  comment_public text,
  comment_private text,
  is_flagged boolean,
  flag_reason text,
  flagged_by uuid,
  flagged_by_name text,
  flagged_at timestamptz,
  moderation_status text,
  moderated_by uuid,
  moderated_by_name text,
  moderated_at timestamptz,
  moderation_notes text,
  status text,
  is_visible boolean,
  created_at timestamptz,
  published_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_role text;
BEGIN
  -- Verify admin role
  SELECT role INTO v_admin_role
  FROM profiles
  WHERE id = p_admin_id;

  IF v_admin_role != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can view flagged reviews';
  END IF;

  -- Return flagged reviews with full context
  RETURN QUERY
  SELECT
    r.id,
    r.booking_id,
    r.reviewer_id,
    reviewer.full_name as reviewer_name,
    reviewer.avatar_url as reviewer_avatar,
    r.reviewee_id,
    reviewee.full_name as reviewee_name,
    reviewee.avatar_url as reviewee_avatar,
    r.car_id,
    c.title as car_title,
    r.review_type,
    r.rating_cleanliness,
    r.rating_communication,
    r.rating_accuracy,
    r.rating_location,
    r.rating_checkin,
    r.rating_value,
    r.rating_overall,
    r.comment_public,
    r.comment_private,
    r.is_flagged,
    r.flag_reason,
    r.flagged_by,
    flagger.full_name as flagged_by_name,
    r.flagged_at,
    r.moderation_status,
    r.moderated_by,
    moderator.full_name as moderated_by_name,
    r.moderated_at,
    r.moderation_notes,
    r.status,
    r.is_visible,
    r.created_at,
    r.published_at
  FROM reviews r
  INNER JOIN profiles reviewer ON r.reviewer_id = reviewer.id
  INNER JOIN profiles reviewee ON r.reviewee_id = reviewee.id
  LEFT JOIN cars c ON r.car_id = c.id
  LEFT JOIN profiles flagger ON r.flagged_by = flagger.id
  LEFT JOIN profiles moderator ON r.moderated_by = moderator.id
  WHERE r.is_flagged = true
    AND (p_status IS NULL OR r.moderation_status = p_status)
  ORDER BY
    CASE WHEN r.moderation_status = 'pending' THEN 0 ELSE 1 END,
    r.flagged_at DESC;
END;
$$;

COMMENT ON FUNCTION get_flagged_reviews IS 'Retorna todas las reviews reportadas con contexto completo para moderación';

-- Function: bulk_moderate_reviews
-- Allows admins to moderate multiple reviews at once
CREATE OR REPLACE FUNCTION bulk_moderate_reviews(
  p_review_ids uuid[],
  p_admin_id uuid,
  p_action text, -- 'approved' or 'rejected'
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_role text;
  v_updated_count integer;
  v_result json;
BEGIN
  -- Verify admin role
  SELECT role INTO v_admin_role
  FROM profiles
  WHERE id = p_admin_id;

  IF v_admin_role != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can moderate reviews';
  END IF;

  -- Validate action
  IF p_action NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid action: must be "approved" or "rejected"';
  END IF;

  -- Update reviews
  UPDATE reviews
  SET
    moderation_status = p_action,
    moderated_by = p_admin_id,
    moderated_at = now(),
    moderation_notes = p_notes,
    is_visible = CASE WHEN p_action = 'rejected' THEN false ELSE is_visible END,
    status = CASE WHEN p_action = 'rejected' THEN 'hidden' ELSE status END
  WHERE id = ANY(p_review_ids);

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  -- Return result
  SELECT json_build_object(
    'success', true,
    'updated_count', v_updated_count,
    'action', p_action,
    'moderated_at', now()
  ) INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION bulk_moderate_reviews IS 'Permite a los admins moderar múltiples reviews de una vez';

-- Grant permissions to authenticated users (RLS will control actual access)
GRANT EXECUTE ON FUNCTION moderate_review TO authenticated;
GRANT EXECUTE ON FUNCTION get_flagged_reviews TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_moderate_reviews TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Admin review moderation functions created successfully';
  RAISE NOTICE '📋 Functions: moderate_review, get_flagged_reviews, bulk_moderate_reviews';
END $$;
