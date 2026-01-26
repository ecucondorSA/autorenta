-- =====================================================
-- FIX: trigger_booking_notification uses NEW.owner_id
-- but bookings table does not have owner_id column
-- The owner_id must be fetched from cars table
-- =====================================================

CREATE OR REPLACE FUNCTION public.trigger_booking_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_car RECORD;
    v_renter RECORD;
    v_owner RECORD;
    v_data JSONB;
    v_owner_id UUID;
BEGIN
    -- Obtener datos del auto (incluyendo owner_id)
    SELECT * INTO v_car FROM public.cars WHERE id = NEW.car_id;

    -- Obtener owner_id desde el auto, NO desde booking
    v_owner_id := v_car.owner_id;

    -- Obtener datos del renter
    SELECT * INTO v_renter FROM public.profiles WHERE id = NEW.renter_id;

    -- Obtener datos del owner usando el ID del auto
    SELECT * INTO v_owner FROM public.profiles WHERE id = v_owner_id;

    -- Construir data común
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

    -- Notificar según el cambio de estado
    IF TG_OP = 'INSERT' THEN
        -- Nueva reserva
        IF NEW.is_instant_booking THEN
            -- Instant booking: notificar al owner
            PERFORM queue_notification(
                v_owner_id,
                'instant_booking_new',
                v_data,
                NOW(),
                ARRAY['push', 'email'],
                'booking_' || NEW.id || '_instant'
            );
        ELSE
            -- Reserva normal: notificar al owner que hay solicitud
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
                -- Notificar al renter
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
                -- Notificar a ambos
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
                -- Recordatorio de review al renter
                PERFORM queue_notification(
                    NEW.renter_id,
                    'booking_completed',
                    v_data,
                    NOW() + INTERVAL '2 hours',
                    ARRAY['push'],
                    'booking_' || NEW.id || '_review_renter'
                );
            ELSE
                -- No action for other statuses
        END CASE;
    END IF;

    RETURN NEW;
END;
$function$;

-- Verificar que la función se actualizó correctamente
DO $$
BEGIN
  RAISE NOTICE 'trigger_booking_notification updated - now uses v_car.owner_id instead of NEW.owner_id';
END $$;
