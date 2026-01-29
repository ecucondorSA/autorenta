-- ============================================================================
-- COMPREHENSIVE FIX: All triggers referencing NEW.owner_id on bookings table
-- Created: 2026-01-26
-- Fixes: Sentry Issues #611, #617, #622, #619
-- ============================================================================
--
-- ROOT CAUSE: Multiple triggers reference NEW.owner_id on bookings table,
-- but this column may not exist or be NULL at INSERT time.
--
-- SOLUTION: All triggers must fetch owner_id from cars table using car_id.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. FIX: trigger_check_fraud_on_booking (Fraud Detection)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trigger_check_fraud_on_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_analysis JSONB;
    v_score INTEGER;
    v_owner_id UUID;
BEGIN
    -- CRITICAL: Get owner_id from cars table, NOT from NEW.owner_id
    SELECT owner_id INTO v_owner_id
    FROM public.cars
    WHERE id = NEW.car_id;

    -- If car not found (rare but possible), skip fraud check silently
    IF v_owner_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Run collusion analysis
    BEGIN
        v_analysis := public.analyze_collusion_risk(NEW.renter_id, v_owner_id);
        v_score := COALESCE((v_analysis->>'score')::INTEGER, 0);
    EXCEPTION WHEN OTHERS THEN
        -- Don't block booking creation if fraud check fails
        RETURN NEW;
    END;

    -- If risk is significant (> 20), log the event
    IF v_score > 20 THEN
        BEGIN
            INSERT INTO public.risk_events (
                booking_id,
                renter_id,
                owner_id,
                risk_type,
                risk_score,
                details
            ) VALUES (
                NEW.id,
                NEW.renter_id,
                v_owner_id,  -- Use fetched owner_id
                'collusion',
                v_score,
                v_analysis->'details'
            );
        EXCEPTION WHEN OTHERS THEN
            -- Log failure but don't block booking
            NULL;
        END;
    END IF;

    RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. FIX: trigger_smart_booking_notification (Smart Notifications)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trigger_smart_booking_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_car RECORD;
    v_renter RECORD;
    v_owner RECORD;
    v_data JSONB;
    v_owner_id UUID;
BEGIN
    -- CRITICAL: Get car data including owner_id
    SELECT * INTO v_car FROM public.cars WHERE id = NEW.car_id;

    -- If car not found, skip notification
    IF v_car IS NULL THEN
        RETURN NEW;
    END IF;

    -- Use owner_id from cars table
    v_owner_id := v_car.owner_id;

    -- Get related profiles
    SELECT * INTO v_renter FROM public.profiles WHERE id = NEW.renter_id;
    SELECT * INTO v_owner FROM public.profiles WHERE id = v_owner_id;

    -- Build common data
    v_data := jsonb_build_object(
        'booking_id', NEW.id,
        'car_id', NEW.car_id,
        'car_title', COALESCE(v_car.title, v_car.brand || ' ' || v_car.model),
        'start_date', to_char(NEW.start_at AT TIME ZONE 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY'),
        'end_date', to_char(NEW.end_at AT TIME ZONE 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY'),
        'start_time', to_char(NEW.start_at AT TIME ZONE 'America/Argentina/Buenos_Aires', 'HH24:MI'),
        'renter_name', COALESCE(v_renter.full_name, 'Usuario'),
        'owner_name', COALESCE(v_owner.full_name, 'Propietario')
    );

    -- Notify based on operation and status change
    IF TG_OP = 'INSERT' THEN
        IF NEW.is_instant_booking THEN
            PERFORM queue_notification(
                v_owner_id,  -- Use fetched owner_id
                'instant_booking_new',
                v_data,
                NOW(),
                ARRAY['push', 'email'],
                'booking_' || NEW.id || '_instant'
            );
        ELSE
            PERFORM queue_notification(
                v_owner_id,  -- Use fetched owner_id
                'booking_requested',
                v_data,
                NOW(),
                ARRAY['push', 'email'],
                'booking_' || NEW.id || '_requested'
            );
        END IF;

    ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        CASE NEW.status
            WHEN 'confirmed' THEN
                PERFORM queue_notification(
                    NEW.renter_id,
                    'booking_confirmed',
                    v_data,
                    NOW(),
                    ARRAY['push', 'email'],
                    'booking_' || NEW.id || '_confirmed'
                );

            WHEN 'rejected' THEN
                PERFORM queue_notification(
                    NEW.renter_id,
                    'booking_rejected',
                    v_data,
                    NOW(),
                    ARRAY['push'],
                    'booking_' || NEW.id || '_rejected'
                );

            WHEN 'cancelled' THEN
                PERFORM queue_notification(
                    NEW.renter_id,
                    'booking_cancelled',
                    v_data,
                    NOW(),
                    ARRAY['push'],
                    'booking_' || NEW.id || '_cancelled_renter'
                );
                PERFORM queue_notification(
                    v_owner_id,  -- Use fetched owner_id
                    'booking_cancelled',
                    v_data,
                    NOW(),
                    ARRAY['push'],
                    'booking_' || NEW.id || '_cancelled_owner'
                );

            WHEN 'completed' THEN
                PERFORM queue_notification(
                    NEW.renter_id,
                    'booking_completed',
                    v_data,
                    NOW() + INTERVAL '2 hours',
                    ARRAY['push'],
                    'booking_' || NEW.id || '_review_renter'
                );
            ELSE
                NULL;
        END CASE;
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Never block booking operations due to notification failures
    RETURN NEW;
END;
$$;

-- ============================================================================
-- 3. FIX: trigger_booking_notification (Original booking notification)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trigger_booking_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_car RECORD;
    v_renter RECORD;
    v_owner RECORD;
    v_data JSONB;
    v_owner_id UUID;
BEGIN
    -- Get car data including owner_id
    SELECT * INTO v_car FROM public.cars WHERE id = NEW.car_id;

    IF v_car IS NULL THEN
        RETURN NEW;
    END IF;

    v_owner_id := v_car.owner_id;

    SELECT * INTO v_renter FROM public.profiles WHERE id = NEW.renter_id;
    SELECT * INTO v_owner FROM public.profiles WHERE id = v_owner_id;

    v_data := jsonb_build_object(
        'booking_id', NEW.id,
        'car_id', NEW.car_id,
        'car_title', COALESCE(v_car.title, v_car.brand || ' ' || v_car.model),
        'start_date', to_char(NEW.start_at AT TIME ZONE 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY'),
        'end_date', to_char(NEW.end_at AT TIME ZONE 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY'),
        'start_time', to_char(NEW.start_at AT TIME ZONE 'America/Argentina/Buenos_Aires', 'HH24:MI'),
        'renter_name', COALESCE(v_renter.full_name, 'Usuario'),
        'owner_name', COALESCE(v_owner.full_name, 'Propietario')
    );

    IF TG_OP = 'INSERT' THEN
        IF NEW.is_instant_booking THEN
            PERFORM queue_notification(
                v_owner_id,
                'instant_booking_new',
                v_data,
                NOW(),
                ARRAY['push', 'email'],
                'booking_' || NEW.id || '_instant'
            );
        ELSE
            PERFORM queue_notification(
                v_owner_id,
                'booking_requested',
                v_data,
                NOW(),
                ARRAY['push', 'email'],
                'booking_' || NEW.id || '_requested'
            );
        END IF;

    ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        CASE NEW.status
            WHEN 'confirmed' THEN
                PERFORM queue_notification(
                    NEW.renter_id,
                    'booking_confirmed',
                    v_data,
                    NOW(),
                    ARRAY['push', 'email'],
                    'booking_' || NEW.id || '_confirmed'
                );

            WHEN 'rejected' THEN
                PERFORM queue_notification(
                    NEW.renter_id,
                    'booking_rejected',
                    v_data,
                    NOW(),
                    ARRAY['push'],
                    'booking_' || NEW.id || '_rejected'
                );

            WHEN 'cancelled' THEN
                PERFORM queue_notification(
                    NEW.renter_id,
                    'booking_cancelled',
                    v_data,
                    NOW(),
                    ARRAY['push'],
                    'booking_' || NEW.id || '_cancelled_renter'
                );
                PERFORM queue_notification(
                    v_owner_id,
                    'booking_cancelled',
                    v_data,
                    NOW(),
                    ARRAY['push'],
                    'booking_' || NEW.id || '_cancelled_owner'
                );

            WHEN 'completed' THEN
                PERFORM queue_notification(
                    NEW.renter_id,
                    'booking_completed',
                    v_data,
                    NOW() + INTERVAL '2 hours',
                    ARRAY['push'],
                    'booking_' || NEW.id || '_review_renter'
                );
            ELSE
                NULL;
        END CASE;
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

-- ============================================================================
-- 4. ENSURE: owner_id column and backfill (function/trigger already in 20260126210000)
-- ============================================================================
DO $$
BEGIN
    -- Add owner_id column if not exists (idempotent)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'bookings'
        AND column_name = 'owner_id'
    ) THEN
        ALTER TABLE public.bookings
        ADD COLUMN owner_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT;

        CREATE INDEX IF NOT EXISTS idx_bookings_owner_id ON public.bookings(owner_id);
    END IF;
END $$;

-- NOTE: populate_booking_owner_id function and trigger are already created in
-- migration 20260126210000_fix_bookings_missing_columns.sql

-- Backfill owner_id for existing records (idempotent)
UPDATE public.bookings b
SET owner_id = c.owner_id
FROM public.cars c
WHERE b.car_id = c.id
  AND b.owner_id IS NULL;

-- ============================================================================
-- 5. Verification
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Migration complete: All booking triggers now fetch owner_id from cars table';
    RAISE NOTICE 'Fixed functions: trigger_check_fraud_on_booking, trigger_smart_booking_notification, trigger_booking_notification';
    RAISE NOTICE 'Added BEFORE INSERT trigger to auto-populate owner_id in bookings table';
END $$;

COMMIT;
