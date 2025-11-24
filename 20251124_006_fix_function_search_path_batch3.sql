-- ============================================================================
-- MIGRATION 6: Fix Function Search Path (Batch 3 - Booking/Dynamic Pricing/Calendar)
-- ============================================================================
-- Date: 2025-11-24
-- Risk Level: CRITICAL
-- Functions: 18 (Booking, Pricing, Calendar, Utility)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.quote_booking(p_car_id UUID, p_start_date DATE, p_end_date DATE, p_user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_daily_rate NUMERIC;
  v_days INTEGER;
BEGIN
  SELECT daily_rate INTO v_daily_rate FROM cars WHERE id = p_car_id;
  SELECT (p_end_date - p_start_date) INTO v_days;
  RETURN v_daily_rate * v_days;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_dynamic_price(p_car_id UUID, p_start_date DATE, p_end_date DATE)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_base_price NUMERIC;
  v_demand_multiplier NUMERIC := 1.0;
BEGIN
  SELECT daily_rate INTO v_base_price FROM cars WHERE id = p_car_id;
  SELECT multiplier INTO v_demand_multiplier FROM demand_snapshots 
  WHERE car_id = p_car_id ORDER BY created_at DESC LIMIT 1;
  RETURN v_base_price * COALESCE(v_demand_multiplier, 1.0);
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_batch_dynamic_prices(p_car_ids UUID[])
RETURNS TABLE(car_id UUID, dynamic_price NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.daily_rate * COALESCE(ds.multiplier, 1.0)
  FROM cars c
  LEFT JOIN demand_snapshots ds ON c.id = ds.car_id
  WHERE c.id = ANY(p_car_ids)
  ORDER BY c.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.adjust_alpha_dynamic(p_car_id UUID, p_new_alpha NUMERIC)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE cars SET alpha_parameter = p_new_alpha WHERE id = p_car_id;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_next_available_date(p_car_id UUID)
RETURNS DATE
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_next_date DATE;
BEGIN
  SELECT MIN(end_date) INTO v_next_date FROM bookings 
  WHERE car_id = p_car_id AND status NOT IN ('cancelled', 'completed');
  RETURN COALESCE(v_next_date, CURRENT_DATE);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_car_blocked_dates(p_car_id UUID)
RETURNS TABLE(start_date DATE, end_date DATE, reason VARCHAR)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT bd.start_date, bd.end_date, bd.reason
  FROM blocked_dates bd
  WHERE bd.car_id = p_car_id
  ORDER BY bd.start_date;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_active_calendar_token(p_user_id UUID)
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_token VARCHAR;
BEGIN
  SELECT token INTO v_token FROM calendar_tokens 
  WHERE user_id = p_user_id AND active = TRUE LIMIT 1;
  RETURN v_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_google_calendar_connected(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM calendar_tokens 
    WHERE user_id = p_user_id AND active = TRUE
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_calendar_sync_timestamp(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE calendar_tokens SET last_sync_at = NOW() WHERE user_id = p_user_id;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.start_location_tracking(p_booking_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_tracking_id UUID;
BEGIN
  INSERT INTO location_tracking (booking_id, started_at, status)
  VALUES (p_booking_id, NOW(), 'active')
  RETURNING id INTO v_tracking_id;
  RETURN v_tracking_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.end_location_tracking(p_tracking_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE location_tracking SET status = 'ended', ended_at = NOW() WHERE id = p_tracking_id;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_active_tracking_for_booking(p_booking_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_tracking_id UUID;
BEGIN
  SELECT id INTO v_tracking_id FROM location_tracking 
  WHERE booking_id = p_booking_id AND status = 'active' LIMIT 1;
  RETURN v_tracking_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_location_tracking_created_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.created_at := NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.booking_location_tracking_broadcast_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  PERFORM pg_notify('location_updates', jsonb_build_object(
    'booking_id', NEW.booking_id,
    'latitude', NEW.latitude,
    'longitude', NEW.longitude,
    'timestamp', NEW.updated_at
  )::text);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_car_conversation_participants(p_car_id UUID)
RETURNS TABLE(user_id UUID, last_message_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT m.sender_id, MAX(m.created_at)
  FROM messages m
  JOIN conversations c ON m.conversation_id = c.id
  WHERE c.car_id = p_car_id
  GROUP BY m.sender_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_conversation_as_read(p_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE messages SET read_at = NOW() WHERE conversation_id = p_conversation_id AND read_at IS NULL;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_unread_messages_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM messages WHERE recipient_id = p_user_id AND read_at IS NULL;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_conversation_messages(p_conversation_id UUID)
RETURNS TABLE(id UUID, sender_id UUID, content TEXT, created_at TIMESTAMPTZ, read_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.sender_id, m.content, m.created_at, m.read_at
  FROM messages m
  WHERE m.conversation_id = p_conversation_id
  ORDER BY m.created_at DESC;
END;
$$;

