-- ============================================================================
-- SMART NOTIFICATIONS SYSTEM
-- Autorentar - 2026-01-21
-- ============================================================================

-- 1. EXTENDER TABLA PUSH_TOKENS
-- ============================================================================
ALTER TABLE public.push_tokens
ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'fcm' CHECK (platform IN ('fcm', 'web', 'apns')),
ADD COLUMN IF NOT EXISTS device_info JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

COMMENT ON COLUMN public.push_tokens.platform IS 'fcm=Android/Firebase, web=Web Push, apns=iOS';
COMMENT ON COLUMN public.push_tokens.device_info IS 'Device metadata: model, os_version, app_version';

-- Índice para tokens activos
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON public.push_tokens(user_id, is_active)
WHERE is_active = true;

-- 2. TABLA DE PREFERENCIAS DE NOTIFICACIÓN
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

    -- Canales habilitados
    push_enabled BOOLEAN DEFAULT true,
    email_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    whatsapp_enabled BOOLEAN DEFAULT false,

    -- Categorías de notificación
    booking_updates BOOLEAN DEFAULT true,      -- Cambios de estado de reserva
    payment_alerts BOOLEAN DEFAULT true,       -- Pagos, cobros, reembolsos
    chat_messages BOOLEAN DEFAULT true,        -- Mensajes de chat
    promotional BOOLEAN DEFAULT false,         -- Ofertas y promociones
    price_alerts BOOLEAN DEFAULT true,         -- Alertas de precio dinámico
    vehicle_alerts BOOLEAN DEFAULT true,       -- Mantenimiento, documentos
    review_reminders BOOLEAN DEFAULT true,     -- Recordatorios de review

    -- Smart Timing
    quiet_hours_enabled BOOLEAN DEFAULT true,
    quiet_hours_start TIME DEFAULT '22:00:00',
    quiet_hours_end TIME DEFAULT '08:00:00',
    timezone TEXT DEFAULT 'America/Argentina/Buenos_Aires',

    -- Frecuencia
    digest_mode BOOLEAN DEFAULT false,         -- Agrupar en digest diario
    digest_time TIME DEFAULT '09:00:00',       -- Hora del digest

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own preferences" ON public.notification_preferences;
CREATE POLICY "Users can view own preferences" ON public.notification_preferences
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own preferences" ON public.notification_preferences;
CREATE POLICY "Users can update own preferences" ON public.notification_preferences
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own preferences" ON public.notification_preferences;
CREATE POLICY "Users can insert own preferences" ON public.notification_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. TEMPLATES DE NOTIFICACIÓN
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identificador único del template
    code TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL CHECK (category IN (
        'booking', 'payment', 'chat', 'promotional',
        'price', 'vehicle', 'review', 'system'
    )),

    -- Contenido (con placeholders {{variable}})
    title_template TEXT NOT NULL,
    body_template TEXT NOT NULL,

    -- Configuración
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    icon TEXT,
    action_url_template TEXT,

    -- Rich notifications
    image_url_template TEXT,
    buttons JSONB DEFAULT '[]'::jsonb,

    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar templates base
INSERT INTO public.notification_templates (code, category, title_template, body_template, priority, action_url_template) VALUES
-- Booking
('booking_requested', 'booking', 'Nueva solicitud de reserva', '{{renter_name}} quiere reservar tu {{car_title}} del {{start_date}} al {{end_date}}', 'high', '/bookings/{{booking_id}}'),
('booking_confirmed', 'booking', 'Reserva confirmada', 'Tu reserva de {{car_title}} ha sido confirmada. Check-in: {{start_date}}', 'high', '/bookings/{{booking_id}}'),
('booking_rejected', 'booking', 'Reserva rechazada', 'Lo sentimos, el propietario no pudo aceptar tu solicitud para {{car_title}}', 'normal', '/marketplace'),
('booking_cancelled', 'booking', 'Reserva cancelada', 'La reserva de {{car_title}} ha sido cancelada', 'high', '/bookings/{{booking_id}}'),
('booking_reminder_1h', 'booking', 'Check-in en 1 hora', 'Tu reserva de {{car_title}} comienza pronto. Revisa los detalles de entrega.', 'high', '/bookings/{{booking_id}}'),
('booking_reminder_24h', 'booking', 'Reserva mañana', 'Recuerda: tu reserva de {{car_title}} comienza mañana a las {{start_time}}', 'normal', '/bookings/{{booking_id}}'),
('booking_ending_soon', 'booking', 'Devolución próxima', 'Tu reserva de {{car_title}} termina en {{hours}} horas. Prepárate para la devolución.', 'high', '/bookings/{{booking_id}}/return'),
('booking_completed', 'booking', 'Viaje completado', '¡Viaje completado! Deja una reseña para {{owner_name}} y su {{car_title}}', 'normal', '/bookings/{{booking_id}}/review'),

-- Payment
('payment_received', 'payment', 'Pago recibido', 'Recibimos tu pago de ${{amount}} para {{car_title}}', 'high', '/bookings/{{booking_id}}'),
('payment_failed', 'payment', 'Pago fallido', 'No pudimos procesar tu pago. Por favor, intenta nuevamente.', 'urgent', '/bookings/{{booking_id}}/payment'),
('payout_sent', 'payment', 'Transferencia enviada', 'Enviamos ${{amount}} a tu cuenta. Llegará en {{days}} días hábiles.', 'normal', '/wallet'),
('deposit_locked', 'payment', 'Depósito retenido', 'Retuvimos ${{amount}} como garantía. Se liberará al finalizar el viaje.', 'normal', '/wallet'),
('deposit_released', 'payment', 'Depósito liberado', '¡Buenas noticias! Tu depósito de ${{amount}} ha sido liberado.', 'normal', '/wallet'),

-- Chat
('new_message', 'chat', 'Nuevo mensaje', '{{sender_name}}: {{message_preview}}', 'normal', '/chat/{{conversation_id}}'),

-- Price alerts
('price_drop', 'price', 'Precio bajo detectado', '{{car_title}} en {{location}} ahora está a ${{price}}/día. ¡{{discount}}% menos!', 'normal', '/cars/{{car_id}}'),

-- Vehicle (owners)
('maintenance_due', 'vehicle', 'Mantenimiento pendiente', 'Tu {{car_title}} necesita service. Último: hace {{days}} días.', 'normal', '/my-cars/{{car_id}}/maintenance'),
('document_expiring', 'vehicle', 'Documento por vencer', 'El {{document_type}} de tu {{car_title}} vence en {{days}} días.', 'high', '/my-cars/{{car_id}}/documents'),

-- Reviews
('review_received', 'review', 'Nueva reseña', '{{reviewer_name}} te dejó una reseña de {{rating}} estrellas', 'normal', '/reviews'),
('review_reminder', 'review', 'Deja tu reseña', '¿Cómo fue tu experiencia con {{car_title}}? Tu opinión ayuda a la comunidad.', 'low', '/bookings/{{booking_id}}/review'),

-- Instant Booking
('instant_booking_new', 'booking', 'Reserva instantánea', '{{renter_name}} reservó tu {{car_title}} al instante. Check-in: {{start_date}}', 'high', '/bookings/{{booking_id}}')

ON CONFLICT (code) DO NOTHING;

-- 4. COLA DE NOTIFICACIONES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Destinatario
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Template y datos
    template_code TEXT NOT NULL REFERENCES public.notification_templates(code),
    data JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Scheduling
    scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    priority TEXT DEFAULT 'normal',

    -- Estado
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled', 'digested')),

    -- Canales a usar
    channels TEXT[] DEFAULT ARRAY['push'],

    -- Resultados
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    delivery_results JSONB DEFAULT '{}'::jsonb,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Para evitar duplicados
    idempotency_key TEXT
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_notification_queue_pending ON public.notification_queue(scheduled_for, status)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_notification_queue_user ON public.notification_queue(user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_queue_idempotency ON public.notification_queue(idempotency_key)
WHERE idempotency_key IS NOT NULL;

-- RLS (solo sistema puede escribir)
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notification_queue;
CREATE POLICY "Users can view own notifications" ON public.notification_queue
    FOR SELECT USING (auth.uid() = user_id);

-- 5. HISTORIAL DE NOTIFICACIONES ENVIADAS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notification_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Contenido final renderizado
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,

    -- Delivery info
    channels_used TEXT[] NOT NULL,
    template_code TEXT,

    -- Interacción
    read_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    action_taken TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_history_user ON public.notification_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_history_unread ON public.notification_history(user_id, read_at)
WHERE read_at IS NULL;

ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own history" ON public.notification_history;
CREATE POLICY "Users can view own history" ON public.notification_history
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own history" ON public.notification_history;
CREATE POLICY "Users can update own history" ON public.notification_history
    FOR UPDATE USING (auth.uid() = user_id);

-- 6. FUNCIÓN: ENCOLAR NOTIFICACIÓN
-- ============================================================================
CREATE OR REPLACE FUNCTION public.queue_notification(
    p_user_id UUID,
    p_template_code TEXT,
    p_data JSONB DEFAULT '{}'::jsonb,
    p_scheduled_for TIMESTAMPTZ DEFAULT NOW(),
    p_channels TEXT[] DEFAULT ARRAY['push'],
    p_idempotency_key TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_prefs RECORD;
    v_template RECORD;
    v_notification_id UUID;
    v_should_queue BOOLEAN := true;
    v_final_schedule TIMESTAMPTZ;
BEGIN
    -- Obtener template
    SELECT * INTO v_template FROM public.notification_templates
    WHERE code = p_template_code AND is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Template not found: %', p_template_code;
    END IF;

    -- Obtener preferencias del usuario (o crear defaults)
    SELECT * INTO v_prefs FROM public.notification_preferences
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        INSERT INTO public.notification_preferences (user_id)
        VALUES (p_user_id)
        RETURNING * INTO v_prefs;
    END IF;

    -- Verificar si la categoría está habilitada
    CASE v_template.category
        WHEN 'booking' THEN v_should_queue := v_prefs.booking_updates;
        WHEN 'payment' THEN v_should_queue := v_prefs.payment_alerts;
        WHEN 'chat' THEN v_should_queue := v_prefs.chat_messages;
        WHEN 'promotional' THEN v_should_queue := v_prefs.promotional;
        WHEN 'price' THEN v_should_queue := v_prefs.price_alerts;
        WHEN 'vehicle' THEN v_should_queue := v_prefs.vehicle_alerts;
        WHEN 'review' THEN v_should_queue := v_prefs.review_reminders;
        ELSE v_should_queue := true;
    END CASE;

    IF NOT v_should_queue THEN
        RETURN NULL;
    END IF;

    -- Aplicar quiet hours si está habilitado (excepto urgentes)
    v_final_schedule := p_scheduled_for;

    IF v_prefs.quiet_hours_enabled AND v_template.priority != 'urgent' THEN
        DECLARE
            v_current_time TIME;
            v_user_now TIMESTAMPTZ;
        BEGIN
            v_user_now := p_scheduled_for AT TIME ZONE v_prefs.timezone;
            v_current_time := v_user_now::TIME;

            -- Si está en quiet hours, mover al fin del quiet hours
            IF v_current_time >= v_prefs.quiet_hours_start OR v_current_time < v_prefs.quiet_hours_end THEN
                -- Calcular próximo fin de quiet hours
                IF v_current_time >= v_prefs.quiet_hours_start THEN
                    -- Es de noche, mover a mañana
                    v_final_schedule := (v_user_now::DATE + 1 + v_prefs.quiet_hours_end)::TIMESTAMPTZ;
                ELSE
                    -- Es temprano en la mañana, mover al fin de quiet hours de hoy
                    v_final_schedule := (v_user_now::DATE + v_prefs.quiet_hours_end)::TIMESTAMPTZ;
                END IF;

                -- Convertir de vuelta a UTC
                v_final_schedule := v_final_schedule AT TIME ZONE v_prefs.timezone AT TIME ZONE 'UTC';
            END IF;
        END;
    END IF;

    -- Filtrar canales según preferencias
    IF NOT v_prefs.push_enabled THEN
        p_channels := array_remove(p_channels, 'push');
    END IF;
    IF NOT v_prefs.email_enabled THEN
        p_channels := array_remove(p_channels, 'email');
    END IF;
    IF NOT v_prefs.sms_enabled THEN
        p_channels := array_remove(p_channels, 'sms');
    END IF;
    IF NOT v_prefs.whatsapp_enabled THEN
        p_channels := array_remove(p_channels, 'whatsapp');
    END IF;

    -- Si no quedan canales, no encolar
    IF array_length(p_channels, 1) IS NULL OR array_length(p_channels, 1) = 0 THEN
        RETURN NULL;
    END IF;

    -- Insertar en cola
    INSERT INTO public.notification_queue (
        user_id,
        template_code,
        data,
        scheduled_for,
        priority,
        channels,
        idempotency_key
    ) VALUES (
        p_user_id,
        p_template_code,
        p_data,
        v_final_schedule,
        v_template.priority,
        p_channels,
        p_idempotency_key
    )
    ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL
    DO NOTHING
    RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$;

-- 7. FUNCIÓN: OBTENER NOTIFICACIONES PENDIENTES PARA ENVIAR
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_pending_notifications(p_limit INTEGER DEFAULT 100)
RETURNS TABLE (
    notification_id UUID,
    user_id UUID,
    template_code TEXT,
    title TEXT,
    body TEXT,
    data JSONB,
    priority TEXT,
    channels TEXT[],
    tokens TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH pending AS (
        SELECT nq.*
        FROM public.notification_queue nq
        WHERE nq.status = 'pending'
        AND nq.scheduled_for <= NOW()
        ORDER BY
            CASE nq.priority
                WHEN 'urgent' THEN 1
                WHEN 'high' THEN 2
                WHEN 'normal' THEN 3
                WHEN 'low' THEN 4
            END,
            nq.scheduled_for
        LIMIT p_limit
        FOR UPDATE SKIP LOCKED
    ),
    user_tokens AS (
        SELECT pt.user_id, array_agg(pt.token) as tokens
        FROM public.push_tokens pt
        WHERE pt.is_active = true
        AND pt.user_id IN (SELECT p.user_id FROM pending p)
        GROUP BY pt.user_id
    )
    SELECT
        p.id as notification_id,
        p.user_id,
        p.template_code,
        -- Renderizar template con datos
        regexp_replace(
            regexp_replace(
                t.title_template,
                '\{\{([^}]+)\}\}',
                COALESCE(p.data->>'\1', ''),
                'g'
            ),
            '\{\{([^}]+)\}\}',
            '',
            'g'
        ) as title,
        regexp_replace(
            regexp_replace(
                t.body_template,
                '\{\{([^}]+)\}\}',
                COALESCE(p.data->>'\1', ''),
                'g'
            ),
            '\{\{([^}]+)\}\}',
            '',
            'g'
        ) as body,
        p.data || jsonb_build_object(
            'action_url', regexp_replace(
                COALESCE(t.action_url_template, ''),
                '\{\{([^}]+)\}\}',
                COALESCE(p.data->>'\1', ''),
                'g'
            )
        ) as data,
        p.priority,
        p.channels,
        COALESCE(ut.tokens, ARRAY[]::TEXT[]) as tokens
    FROM pending p
    JOIN public.notification_templates t ON t.code = p.template_code
    LEFT JOIN user_tokens ut ON ut.user_id = p.user_id;
END;
$$;

-- 8. FUNCIÓN: MARCAR NOTIFICACIÓN COMO ENVIADA
-- ============================================================================
CREATE OR REPLACE FUNCTION public.mark_notification_sent(
    p_notification_id UUID,
    p_success BOOLEAN,
    p_error_message TEXT DEFAULT NULL,
    p_delivery_results JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_notification RECORD;
BEGIN
    -- Actualizar estado
    UPDATE public.notification_queue
    SET
        status = CASE WHEN p_success THEN 'sent' ELSE 'failed' END,
        sent_at = CASE WHEN p_success THEN NOW() ELSE NULL END,
        error_message = p_error_message,
        delivery_results = p_delivery_results
    WHERE id = p_notification_id
    RETURNING * INTO v_notification;

    -- Si fue exitoso, guardar en historial
    IF p_success AND v_notification.id IS NOT NULL THEN
        INSERT INTO public.notification_history (
            user_id,
            title,
            body,
            data,
            channels_used,
            template_code
        )
        SELECT
            v_notification.user_id,
            regexp_replace(t.title_template, '\{\{[^}]+\}\}', '', 'g'),
            regexp_replace(t.body_template, '\{\{[^}]+\}\}', '', 'g'),
            v_notification.data,
            v_notification.channels,
            v_notification.template_code
        FROM public.notification_templates t
        WHERE t.code = v_notification.template_code;
    END IF;
END;
$$;

-- 9. TRIGGER: NOTIFICAR EN CAMBIOS DE BOOKING
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trigger_booking_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_car RECORD;
    v_renter RECORD;
    v_owner RECORD;
    v_data JSONB;
BEGIN
    -- Obtener datos relacionados
    SELECT * INTO v_car FROM public.cars WHERE id = NEW.car_id;
    SELECT * INTO v_renter FROM public.profiles WHERE id = NEW.renter_id;
    SELECT * INTO v_owner FROM public.profiles WHERE id = NEW.owner_id;

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
                NEW.owner_id,
                'instant_booking_new',
                v_data,
                NOW(),
                ARRAY['push', 'email'],
                'booking_' || NEW.id || '_instant'
            );
        ELSE
            -- Reserva normal: notificar al owner que hay solicitud
            PERFORM queue_notification(
                NEW.owner_id,
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
                    NEW.owner_id,
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
$$;

-- Crear trigger
DROP TRIGGER IF EXISTS booking_notification_trigger ON public.bookings;
CREATE TRIGGER booking_notification_trigger
    AFTER INSERT OR UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION trigger_booking_notification();

-- 10. FUNCIÓN: PROGRAMAR RECORDATORIOS DE BOOKING
-- ============================================================================
CREATE OR REPLACE FUNCTION public.schedule_booking_reminders(p_booking_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking RECORD;
    v_car RECORD;
    v_data JSONB;
BEGIN
    SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
    IF NOT FOUND THEN RETURN; END IF;

    SELECT * INTO v_car FROM public.cars WHERE id = v_booking.car_id;

    v_data := jsonb_build_object(
        'booking_id', v_booking.id,
        'car_id', v_booking.car_id,
        'car_title', COALESCE(v_car.title, v_car.brand || ' ' || v_car.model),
        'start_date', to_char(v_booking.start_at AT TIME ZONE 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY'),
        'start_time', to_char(v_booking.start_at AT TIME ZONE 'America/Argentina/Buenos_Aires', 'HH24:MI')
    );

    -- Recordatorio 24h antes (solo si la reserva es en más de 24h)
    IF v_booking.start_at > NOW() + INTERVAL '25 hours' THEN
        PERFORM queue_notification(
            v_booking.renter_id,
            'booking_reminder_24h',
            v_data,
            v_booking.start_at - INTERVAL '24 hours',
            ARRAY['push'],
            'booking_' || v_booking.id || '_reminder_24h'
        );
    END IF;

    -- Recordatorio 1h antes
    IF v_booking.start_at > NOW() + INTERVAL '2 hours' THEN
        PERFORM queue_notification(
            v_booking.renter_id,
            'booking_reminder_1h',
            v_data,
            v_booking.start_at - INTERVAL '1 hour',
            ARRAY['push'],
            'booking_' || v_booking.id || '_reminder_1h'
        );
    END IF;

    -- Recordatorio de devolución 2h antes del fin
    PERFORM queue_notification(
        v_booking.renter_id,
        'booking_ending_soon',
        v_data || jsonb_build_object('hours', '2'),
        v_booking.end_at - INTERVAL '2 hours',
        ARRAY['push'],
        'booking_' || v_booking.id || '_ending_2h'
    );
END;
$$;

-- 11. GRANTS
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.queue_notification TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_notifications TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_notification_sent TO service_role;
GRANT EXECUTE ON FUNCTION public.schedule_booking_reminders TO authenticated;

-- Permitir a usuarios ver sus notificaciones y preferencias
GRANT SELECT, UPDATE ON public.notification_preferences TO authenticated;
GRANT SELECT ON public.notification_history TO authenticated;
GRANT SELECT ON public.notification_templates TO authenticated;
