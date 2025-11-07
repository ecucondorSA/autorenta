-- ============================================================================
-- ADMIN GLOBAL SEARCH FUNCTIONS
-- Created: 2025-11-07
-- Purpose: RPC functions for admin global search interface
-- Issue: #137 - Global Search Interface for Admin Operations
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: SEARCH USERS
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_search_users(
  p_query TEXT,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT,
  verification_level INTEGER,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  is_suspended BOOLEAN,
  total_bookings_as_renter BIGINT,
  total_bookings_as_owner BIGINT,
  wallet_balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_user_id UUID;
BEGIN
  -- Get current user ID
  v_admin_user_id := auth.uid();

  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_user_roles
    WHERE user_id = v_admin_user_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Search users
  RETURN QUERY
  SELECT
    u.id,
    u.email,
    p.full_name,
    p.avatar_url,
    p.role,
    COALESCE(p.verification_level, 0) as verification_level,
    u.created_at,
    u.last_sign_in_at,
    COALESCE(p.is_suspended, false) as is_suspended,
    -- Aggregate counts
    COALESCE((
      SELECT COUNT(*) FROM public.bookings WHERE renter_id = u.id
    ), 0) as total_bookings_as_renter,
    COALESCE((
      SELECT COUNT(*) FROM public.bookings b
      INNER JOIN public.cars c ON c.id = b.car_id
      WHERE c.owner_id = u.id
    ), 0) as total_bookings_as_owner,
    -- Wallet balance
    COALESCE((
      SELECT balance FROM public.wallets WHERE user_id = u.id
    ), 0) as wallet_balance
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE
    -- Search by email, name, or ID
    u.email ILIKE '%' || p_query || '%'
    OR p.full_name ILIKE '%' || p_query || '%'
    OR u.id::text = p_query
    OR p.phone ILIKE '%' || p_query || '%'
  ORDER BY u.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;

  -- Log the search action
  INSERT INTO public.admin_audit_log (
    admin_user_id,
    admin_role,
    action,
    resource_type,
    metadata,
    success
  )
  SELECT
    v_admin_user_id,
    aur.role,
    'user_search',
    'user',
    jsonb_build_object('query', p_query, 'limit', p_limit, 'offset', p_offset),
    true
  FROM public.admin_user_roles aur
  WHERE aur.user_id = v_admin_user_id AND aur.is_active = true
  LIMIT 1;

END;
$$;

-- ============================================================================
-- SECTION 2: SEARCH BOOKINGS
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_search_bookings(
  p_query TEXT,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  car_id UUID,
  car_title TEXT,
  car_brand TEXT,
  car_model TEXT,
  renter_id UUID,
  renter_name TEXT,
  renter_email TEXT,
  owner_id UUID,
  owner_name TEXT,
  owner_email TEXT,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  status TEXT,
  total_amount NUMERIC,
  currency TEXT,
  payment_status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_user_id UUID;
BEGIN
  -- Get current user ID
  v_admin_user_id := auth.uid();

  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_user_roles
    WHERE user_id = v_admin_user_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Search bookings
  RETURN QUERY
  SELECT
    b.id,
    b.car_id,
    c.title as car_title,
    COALESCE(c.brand, c.brand_text_backup) as car_brand,
    COALESCE(c.model, c.model_text_backup) as car_model,
    b.renter_id,
    renter_p.full_name as renter_name,
    renter_u.email as renter_email,
    c.owner_id,
    owner_p.full_name as owner_name,
    owner_u.email as owner_email,
    b.start_at,
    b.end_at,
    b.status::TEXT,
    COALESCE(b.total_amount, b.total_cents::NUMERIC / 100) as total_amount,
    b.currency,
    b.payment_status::TEXT,
    b.created_at
  FROM public.bookings b
  INNER JOIN public.cars c ON c.id = b.car_id
  INNER JOIN public.profiles renter_p ON renter_p.id = b.renter_id
  INNER JOIN auth.users renter_u ON renter_u.id = b.renter_id
  INNER JOIN public.profiles owner_p ON owner_p.id = c.owner_id
  INNER JOIN auth.users owner_u ON owner_u.id = c.owner_id
  WHERE
    -- Search by booking ID, user email, car title
    b.id::text = p_query
    OR renter_u.email ILIKE '%' || p_query || '%'
    OR owner_u.email ILIKE '%' || p_query || '%'
    OR c.title ILIKE '%' || p_query || '%'
    OR renter_p.full_name ILIKE '%' || p_query || '%'
    OR owner_p.full_name ILIKE '%' || p_query || '%'
  ORDER BY b.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;

  -- Log the search action
  INSERT INTO public.admin_audit_log (
    admin_user_id,
    admin_role,
    action,
    resource_type,
    metadata,
    success
  )
  SELECT
    v_admin_user_id,
    aur.role,
    'booking_search',
    'booking',
    jsonb_build_object('query', p_query, 'limit', p_limit, 'offset', p_offset),
    true
  FROM public.admin_user_roles aur
  WHERE aur.user_id = v_admin_user_id AND aur.is_active = true
  LIMIT 1;

END;
$$;

-- ============================================================================
-- SECTION 3: SEARCH CARS
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_search_cars(
  p_query TEXT,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  owner_id UUID,
  owner_name TEXT,
  owner_email TEXT,
  title TEXT,
  brand TEXT,
  model TEXT,
  year INTEGER,
  license_plate TEXT,
  price_per_day NUMERIC,
  currency TEXT,
  status TEXT,
  city TEXT,
  province TEXT,
  total_bookings BIGINT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_user_id UUID;
BEGIN
  -- Get current user ID
  v_admin_user_id := auth.uid();

  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_user_roles
    WHERE user_id = v_admin_user_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Search cars
  RETURN QUERY
  SELECT
    c.id,
    c.owner_id,
    p.full_name as owner_name,
    u.email as owner_email,
    c.title,
    COALESCE(c.brand, c.brand_text_backup) as brand,
    COALESCE(c.model, c.model_text_backup) as model,
    c.year,
    c.license_plate,
    c.price_per_day,
    c.currency,
    c.status::TEXT,
    c.city,
    c.province,
    COALESCE((
      SELECT COUNT(*) FROM public.bookings WHERE car_id = c.id
    ), 0) as total_bookings,
    c.created_at
  FROM public.cars c
  INNER JOIN public.profiles p ON p.id = c.owner_id
  INNER JOIN auth.users u ON u.id = c.owner_id
  WHERE
    -- Search by car ID, title, plate, owner email
    c.id::text = p_query
    OR c.title ILIKE '%' || p_query || '%'
    OR c.license_plate ILIKE '%' || p_query || '%'
    OR u.email ILIKE '%' || p_query || '%'
    OR p.full_name ILIKE '%' || p_query || '%'
    OR COALESCE(c.brand, c.brand_text_backup) ILIKE '%' || p_query || '%'
    OR COALESCE(c.model, c.model_text_backup) ILIKE '%' || p_query || '%'
  ORDER BY c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;

  -- Log the search action
  INSERT INTO public.admin_audit_log (
    admin_user_id,
    admin_role,
    action,
    resource_type,
    metadata,
    success
  )
  SELECT
    v_admin_user_id,
    aur.role,
    'car_search',
    'car',
    jsonb_build_object('query', p_query, 'limit', p_limit, 'offset', p_offset),
    true
  FROM public.admin_user_roles aur
  WHERE aur.user_id = v_admin_user_id AND aur.is_active = true
  LIMIT 1;

END;
$$;

-- ============================================================================
-- SECTION 4: SEARCH TRANSACTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_search_transactions(
  p_query TEXT,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  type TEXT,
  amount NUMERIC,
  currency TEXT,
  status TEXT,
  provider TEXT,
  provider_transaction_id TEXT,
  booking_id UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_user_id UUID;
BEGIN
  -- Get current user ID
  v_admin_user_id := auth.uid();

  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_user_roles
    WHERE user_id = v_admin_user_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Search transactions
  RETURN QUERY
  SELECT
    wt.id,
    wt.user_id,
    p.full_name as user_name,
    u.email as user_email,
    wt.type::TEXT,
    wt.amount,
    wt.currency,
    wt.status::TEXT,
    wt.provider,
    wt.provider_transaction_id,
    wt.booking_id,
    wt.created_at
  FROM public.wallet_transactions wt
  INNER JOIN public.profiles p ON p.id = wt.user_id
  INNER JOIN auth.users u ON u.id = wt.user_id
  WHERE
    -- Search by transaction ID, user email, provider transaction ID
    wt.id::text = p_query
    OR u.email ILIKE '%' || p_query || '%'
    OR p.full_name ILIKE '%' || p_query || '%'
    OR wt.provider_transaction_id ILIKE '%' || p_query || '%'
    OR wt.amount::TEXT LIKE '%' || p_query || '%'
  ORDER BY wt.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;

  -- Log the search action
  INSERT INTO public.admin_audit_log (
    admin_user_id,
    admin_role,
    action,
    resource_type,
    metadata,
    success
  )
  SELECT
    v_admin_user_id,
    aur.role,
    'transaction_search',
    'transaction',
    jsonb_build_object('query', p_query, 'limit', p_limit, 'offset', p_offset),
    true
  FROM public.admin_user_roles aur
  WHERE aur.user_id = v_admin_user_id AND aur.is_active = true
  LIMIT 1;

END;
$$;

-- ============================================================================
-- SECTION 5: ADD NEW AUDIT ACTION TYPES
-- ============================================================================

-- Add new search action types to admin_action_type enum if they don't exist
DO $$
BEGIN
  -- Check if type exists, if not add values
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'car_search'
    AND enumtypid = 'admin_action_type'::regtype
  ) THEN
    ALTER TYPE admin_action_type ADD VALUE 'car_search';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'transaction_search'
    AND enumtypid = 'admin_action_type'::regtype
  ) THEN
    ALTER TYPE admin_action_type ADD VALUE 'transaction_search';
  END IF;
END$$;

-- ============================================================================
-- SECTION 6: GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions to authenticated users (admin check is inside functions)
GRANT EXECUTE ON FUNCTION admin_search_users TO authenticated;
GRANT EXECUTE ON FUNCTION admin_search_bookings TO authenticated;
GRANT EXECUTE ON FUNCTION admin_search_cars TO authenticated;
GRANT EXECUTE ON FUNCTION admin_search_transactions TO authenticated;

COMMIT;
