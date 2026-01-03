# Autorenta Database Schema

> Documentación generada el 2025-12-30 basada en la BD de producción (Supabase)

## Resumen

| Métrica | Valor |
|---------|-------|
| **Tablas** | 131 |
| **Vistas** | 40 |
| **Enums** | 23 |
| **Funciones RPC** | 200+ |
| **Tablas con RLS** | 130 (99.2%) |

---

## 1. Tablas por Dominio

### 1.1 Core - Usuarios y Perfiles

| Tabla | Descripción |
|-------|-------------|
| `profiles` | Perfil de usuario (extiende auth.users) |
| `user_wallets` | Saldos de wallet por usuario |
| `user_documents` | Documentos de identidad/licencia |
| `user_verifications` | Estado de verificaciones KYC |
| `user_identity_levels` | Niveles de identidad verificada |
| `user_blocks` | Usuarios bloqueados |
| `user_favorites` | Favoritos genéricos |
| `user_favorite_cars` | Autos favoritos |
| `user_bonus_malus` | Score bonus/malus por historial |
| `driver_risk_profile` | Perfil de riesgo del conductor |
| `driver_score_snapshots` | Snapshots de score |
| `driver_telemetry` | Telemetría de manejo |
| `driver_class_history` | Historial de clase de conductor |
| `driver_protection_addons` | Add-ons de protección comprados |

### 1.2 Core - Vehículos

| Tabla | Descripción |
|-------|-------------|
| `cars` | Autos publicados en marketplace |
| `car_photos` | Fotos de los autos |
| `car_brands` | Catálogo de marcas |
| `car_models` | Catálogo de modelos |
| `car_blocked_dates` | Fechas bloqueadas |
| `car_stats` | Estadísticas por auto |
| `car_views` | Vistas/impresiones |
| `car_handover_points` | Puntos de entrega |
| `car_tracking_sessions` | Sesiones de tracking GPS |
| `car_tracking_points` | Puntos GPS registrados |
| `vehicle_categories` | Categorías de vehículos |
| `vehicle_documents` | Documentos del vehículo |
| `vehicle_model_equivalents` | Equivalencias entre modelos AR/BR |
| `vehicle_pricing_models` | Modelos de pricing por tipo |

### 1.3 Core - Reservas (Bookings)

| Tabla | Descripción |
|-------|-------------|
| `bookings` | Reservas principales (100+ columnas) |
| `bookings_pricing` | Desglose de precios |
| `bookings_payment` | Estado de pago |
| `bookings_insurance` | Cobertura de seguro |
| `bookings_confirmation` | Confirmaciones pickup/dropoff |
| `bookings_cancellation` | Datos de cancelación |
| `booking_contracts` | Contratos firmados |
| `booking_claims` | Reclamos |
| `booking_inspections` | Inspecciones |
| `booking_extensions` | Extensiones de reserva |
| `booking_extension_requests` | Solicitudes de extensión |
| `booking_insurance_coverage` | Coberturas activadas |
| `booking_location_tracking` | Tracking durante reserva |
| `booking_risk_snapshot` | Snapshot de riesgo al crear |
| `booking_payment_events` | Eventos de pago (audit) |
| `booking_waitlist` | Lista de espera |

### 1.4 Pagos y Wallet

| Tabla | Descripción |
|-------|-------------|
| `payments` | Pagos procesados |
| `payment_intents` | Intenciones de pago (pre-auth) |
| `payment_splits` | Split payments marketplace |
| `payment_references` | Referencias de pago |
| `payment_issues` | Problemas de pago |
| `payouts` | Pagos a propietarios |
| `wallet_transactions` | Transacciones de wallet (legacy) |
| `wallet_audit_log` | Log de auditoría wallet |
| `wallet_split_config` | Configuración de splits |
| `wallet_transaction_backups` | Backups de transacciones |
| `withdrawal_requests` | Solicitudes de retiro |
| `withdrawal_transactions` | Transacciones de retiro |
| `exchange_rates` | Tasas de cambio (Binance) |
| `exchange_rate_sync_log` | Log de sincronización FX |
| `fx_rates` | Tasas FX adicionales |
| `bank_accounts` | Cuentas bancarias de usuarios |

### 1.5 MercadoPago

| Tabla | Descripción |
|-------|-------------|
| `mp_onboarding_states` | Estados de onboarding MP |
| `mp_webhook_logs` | Logs de webhooks MP |

### 1.6 Disputas y Claims

| Tabla | Descripción |
|-------|-------------|
| `disputes` | Disputas abiertas |
| `dispute_evidence` | Evidencia de disputas |
| `claims` | Claims de seguro |
| `insurance_claims` | Claims de seguro detallados |
| `insurance_policies` | Pólizas de seguro |
| `insurance_addons` | Add-ons de seguro |
| `accident_reports` | Reportes de accidentes |
| `traffic_infractions` | Infracciones de tránsito |

### 1.7 Comunicaciones

| Tabla | Descripción |
|-------|-------------|
| `messages` | Mensajes entre usuarios |
| `notifications` | Notificaciones push/in-app |
| `notification_settings` | Preferencias de notificación |
| `push_tokens` | Tokens FCM |

### 1.8 Reviews y Ratings

| Tabla | Descripción |
|-------|-------------|
| `reviews` | Reviews de bookings |

### 1.9 Referidos y Promociones

| Tabla | Descripción |
|-------|-------------|
| `referral_codes` | Códigos de referido |
| `referrals` | Referidos registrados |
| `referral_rewards` | Recompensas de referidos |
| `promos` | Códigos promocionales |

### 1.10 Pricing Dinámico

| Tabla | Descripción |
|-------|-------------|
| `pricing_regions` | Regiones de pricing |
| `pricing_day_factors` | Factores por día semana |
| `pricing_hour_factors` | Factores por hora |
| `pricing_class_factors` | Factores por clase usuario |
| `pricing_user_factors` | Factores personalizados |
| `pricing_special_events` | Eventos especiales |
| `pricing_demand_snapshots` | Snapshots de demanda |
| `pricing_overrides` | Overrides manuales |
| `pricing_calculations` | Cálculos de precio |
| `pricing_cron_health` | Salud del cron |

### 1.11 FGO (Fondo de Garantía Operativo)

| Tabla | Descripción |
|-------|-------------|
| `fgo_parameters` | Parámetros del algoritmo FGO |
| `fgo_subfunds` | Sub-fondos del FGO |
| `fgo_metrics` | Métricas del FGO |
| `fleet_bonuses` | Bonos de flota |

### 1.12 Contabilidad

| Tabla | Descripción |
|-------|-------------|
| `accounting_accounts` | Plan de cuentas |
| `accounting_chart_of_accounts` | Catálogo de cuentas |
| `accounting_journal_entries` | Asientos contables |
| `accounting_ledger` | Libro mayor |
| `accounting_provisions` | Provisiones |
| `accounting_revenue_recognition` | Reconocimiento de ingresos |
| `accounting_period_balances` | Balances por período |
| `accounting_period_closures` | Cierres de período |
| `accounting_audit_log` | Log de auditoría contable |

### 1.13 Organizaciones

| Tabla | Descripción |
|-------|-------------|
| `organizations` | Organizaciones/flotas |
| `organization_members` | Miembros de org |

### 1.14 Onboarding

| Tabla | Descripción |
|-------|-------------|
| `onboarding_plan_templates` | Templates de onboarding |
| `user_onboarding_plans` | Planes de onboarding asignados |
| `user_onboarding_steps` | Pasos completados |

### 1.15 Admin y Sistema

| Tabla | Descripción |
|-------|-------------|
| `admin_users` | Usuarios admin |
| `admin_audit_log` | Log de auditoría admin |
| `feature_flags` | Feature flags |
| `feature_flag_overrides` | Overrides de flags |
| `feature_flag_audit_log` | Log de cambios flags |
| `platform_config` | Configuración de plataforma |
| `system_flags` | Flags de sistema |
| `cron_execution_log` | Log de ejecución cron |

### 1.16 Seguridad y Encriptación

| Tabla | Descripción |
|-------|-------------|
| `encryption_keys` | Claves de encriptación |
| `encryption_audit_log` | Log de acceso a claves |

### 1.17 Monitoreo

| Tabla | Descripción |
|-------|-------------|
| `monitoring_alerts` | Alertas de monitoreo |
| `monitoring_performance_metrics` | Métricas de performance |
| `query_performance_log` | Log de queries lentos |
| `outbound_requests` | Requests salientes |

### 1.18 P2P Trading

| Tabla | Descripción |
|-------|-------------|
| `p2p_config` | Configuración P2P |
| `p2p_orders` | Órdenes P2P |
| `p2p_events` | Eventos P2P |
| `p2p_market_prices` | Precios de mercado |

### 1.19 Soporte

| Tabla | Descripción |
|-------|-------------|
| `support_tickets` | Tickets de soporte |

### 1.20 Analytics

| Tabla | Descripción |
|-------|-------------|
| `conversion_events` | Eventos de conversión |
| `fees` | Fees cobrados |
| `transactions` | Transacciones genéricas |

---

## 2. Estructura de Tablas Principales

### 2.1 `profiles`

```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'locatario',
    is_admin BOOLEAN DEFAULT false,
    phone TEXT,
    email TEXT,
    email_verified BOOLEAN DEFAULT false,
    phone_verified BOOLEAN DEFAULT false,
    id_verified BOOLEAN DEFAULT false,
    onboarding onboarding_status DEFAULT 'incomplete',

    -- MercadoPago
    mercadopago_connected BOOLEAN DEFAULT false,
    mercadopago_collector_id TEXT,
    mercadopago_access_token TEXT,
    mercadopago_refresh_token TEXT,
    mercadopago_public_key VARCHAR,
    mercadopago_account_type VARCHAR,
    mp_onboarding_completed BOOLEAN DEFAULT false,

    -- Location
    home_latitude NUMERIC,
    home_longitude NUMERIC,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'AR',

    -- Ratings
    rating_avg NUMERIC DEFAULT 0,
    rating_count INTEGER DEFAULT 0,

    -- Wallet
    wallet_account_number TEXT, -- AR + 14 dígitos

    -- PII Encriptado
    phone_encrypted TEXT,
    dni_encrypted TEXT,
    driver_license_number_encrypted TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 2.2 `cars`

```sql
CREATE TABLE cars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES profiles(id),
    title TEXT NOT NULL,
    description TEXT,
    brand TEXT,
    model TEXT,
    year INTEGER,

    -- Pricing
    price_per_day NUMERIC NOT NULL,
    price_per_day_cents BIGINT,
    currency TEXT DEFAULT 'USD',
    security_deposit_usd NUMERIC DEFAULT 300.0,
    uses_dynamic_pricing BOOLEAN DEFAULT false,

    -- Location
    city TEXT NOT NULL,
    province TEXT NOT NULL,
    country TEXT DEFAULT 'AR',
    location_lat NUMERIC,
    location_lng NUMERIC,
    location_geom GEOMETRY(Point, 4326),

    -- Vehicle Details
    fuel_type TEXT,
    transmission TEXT,
    color TEXT,
    mileage INTEGER,
    seats INTEGER DEFAULT 5,
    doors INTEGER DEFAULT 4,
    plate TEXT,
    vin TEXT,

    -- Value
    value_usd NUMERIC,
    value_ars INTEGER,
    estimated_value_usd INTEGER,
    fipe_code TEXT,

    -- Rules
    min_rental_days INTEGER DEFAULT 1,
    max_rental_days INTEGER,
    auto_approval BOOLEAN DEFAULT false,
    cancel_policy cancel_policy DEFAULT 'moderate',
    allow_smoking BOOLEAN DEFAULT false,
    allow_pets BOOLEAN DEFAULT false,
    allow_rideshare BOOLEAN DEFAULT false,
    mileage_limit INTEGER DEFAULT 200,
    extra_km_price NUMERIC DEFAULT 5,

    -- Status
    status car_status DEFAULT 'draft',
    can_receive_payments BOOLEAN DEFAULT false,

    -- Ratings
    rating_avg NUMERIC DEFAULT 0,
    rating_count INTEGER DEFAULT 0,

    -- Org
    organization_id UUID REFERENCES organizations(id),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);
```

### 2.3 `bookings`

```sql
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    car_id UUID NOT NULL REFERENCES cars(id),
    renter_id UUID NOT NULL REFERENCES profiles(id),

    -- Dates
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    days_count INTEGER,

    -- Status
    status booking_status DEFAULT 'pending',
    approval_status TEXT,
    approval_expires_at TIMESTAMPTZ,
    approved_by UUID,
    approved_at TIMESTAMPTZ,

    -- Pricing
    total_amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'USD',
    nightly_rate_cents BIGINT,
    subtotal_cents BIGINT,
    insurance_cents BIGINT DEFAULT 0,
    fees_cents BIGINT DEFAULT 0,
    discounts_cents BIGINT DEFAULT 0,
    total_cents BIGINT,
    total_price_ars NUMERIC,
    breakdown JSONB,

    -- Dynamic Pricing
    has_dynamic_pricing BOOLEAN DEFAULT false,
    dynamic_price_snapshot JSONB,
    price_locked_until TIMESTAMPTZ,
    price_lock_token UUID,

    -- Payment
    payment_mode TEXT,
    payment_method TEXT,
    payment_provider payment_provider DEFAULT 'mercadopago',
    payment_preference_id TEXT,
    payment_init_point TEXT,
    payment_id UUID,
    paid_at TIMESTAMPTZ,
    idempotency_key TEXT,

    -- Split Payment
    payment_split_completed BOOLEAN DEFAULT false,
    provider_split_payment_id TEXT,
    provider_collector_id TEXT,
    owner_payment_amount NUMERIC,
    platform_fee NUMERIC,
    mercadopago_split_id VARCHAR,

    -- Wallet
    wallet_lock_id UUID,
    wallet_amount_cents BIGINT DEFAULT 0,
    wallet_status TEXT DEFAULT 'none',
    rental_amount_cents BIGINT,
    deposit_amount_cents BIGINT,
    deposit_status TEXT DEFAULT 'none',

    -- Guarantee
    guarantee_type TEXT,
    guarantee_amount_cents INTEGER,
    coverage_upgrade TEXT DEFAULT 'standard',

    -- Location
    pickup_location_lat NUMERIC,
    pickup_location_lng NUMERIC,
    dropoff_location_lat NUMERIC,
    dropoff_location_lng NUMERIC,
    delivery_required BOOLEAN DEFAULT false,
    delivery_distance_km NUMERIC,
    delivery_fee_cents BIGINT DEFAULT 0,
    distance_risk_tier TEXT,

    -- Completion
    completion_status TEXT DEFAULT 'active',
    owner_confirmed_delivery BOOLEAN DEFAULT false,
    renter_confirmed_payment BOOLEAN DEFAULT false,
    returned_at TIMESTAMPTZ,

    -- Payout
    payout_status payout_status_enum DEFAULT 'pending',
    payout_date TIMESTAMPTZ,

    -- Cancellation
    cancellation_policy_id BIGINT,
    cancellation_fee_cents BIGINT DEFAULT 0,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    cancelled_by_role booking_cancelled_by_role,

    -- Disputes
    dispute_opened_at TIMESTAMPTZ,
    dispute_reason TEXT,
    dispute_evidence_urls TEXT[],
    dispute_resolved_at TIMESTAMPTZ,
    dispute_resolution TEXT,
    dispute_amount_cents BIGINT,

    -- Penalties
    late_return_hours NUMERIC,
    late_return_penalty_cents BIGINT,
    fuel_level_checkin INTEGER,
    fuel_level_checkout INTEGER,
    fuel_penalty_cents BIGINT,

    -- Calendar
    google_calendar_event_id TEXT,
    calendar_synced_at TIMESTAMPTZ,

    -- Metadata
    metadata JSONB,
    risk_snapshot_id UUID,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ
);
```

### 2.4 `payments`

```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id),
    payment_intent_id UUID REFERENCES payment_intents(id),
    user_id UUID REFERENCES profiles(id),

    -- Provider
    provider payment_provider NOT NULL,
    provider_payment_id TEXT,

    -- Amount
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'ARS',

    -- Status
    status payment_status DEFAULT 'pending',

    -- Hold/Capture
    is_hold BOOLEAN DEFAULT false,
    authorized_at TIMESTAMPTZ,
    captured_at TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,
    amount_authorized_cents BIGINT,
    amount_captured_cents BIGINT DEFAULT 0,
    expires_at TIMESTAMPTZ,

    -- Card
    payment_method_id TEXT,
    card_last4 TEXT,

    -- Metadata
    description TEXT,
    idempotency_key TEXT,
    metadata JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 2.5 `wallet_transactions`

```sql
CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    type TEXT NOT NULL, -- deposit, withdrawal, lock, unlock, transfer, etc.
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'ARS',
    status TEXT DEFAULT 'pending',

    -- References
    booking_id UUID,
    payment_id UUID,
    ref TEXT, -- idempotency reference

    -- Balance tracking
    balance_before NUMERIC,
    balance_after NUMERIC,

    -- Metadata
    description TEXT,
    metadata JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
);
```

### 2.6 `exchange_rates`

```sql
CREATE TABLE exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pair TEXT NOT NULL, -- e.g., 'USD/ARS'
    rate NUMERIC NOT NULL,
    is_active BOOLEAN DEFAULT true,
    source TEXT DEFAULT 'binance',
    last_updated TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 2.7 `disputes`

```sql
CREATE TABLE disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id),
    opened_by UUID NOT NULL REFERENCES profiles(id),
    kind dispute_kind NOT NULL, -- damage, no_show, late_return, other
    description TEXT,
    status dispute_status DEFAULT 'open',
    resolved_by UUID,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 3. Enums

```sql
-- Estados de booking
CREATE TYPE booking_status AS ENUM (
    'pending_payment', 'pending', 'pending_approval', 'confirmed',
    'in_progress', 'pending_review', 'disputed', 'completed',
    'cancelled', 'no_show', 'expired', 'cancelled_renter',
    'cancelled_owner', 'cancelled_system', 'rejected', 'resolved',
    'pending_dispute_resolution', 'payment_validation_failed'
);

-- Estados de auto
CREATE TYPE car_status AS ENUM ('draft', 'pending', 'active', 'suspended', 'deleted');

-- Proveedores de pago
CREATE TYPE payment_provider AS ENUM ('mock', 'mercadopago', 'stripe');

-- Estados de pago
CREATE TYPE payment_status AS ENUM (
    'pending', 'processing', 'approved', 'rejected', 'refunded', 'cancelled'
);

-- Políticas de cancelación
CREATE TYPE cancel_policy AS ENUM ('flex', 'moderate', 'strict');

-- Tipos de disputa
CREATE TYPE dispute_kind AS ENUM ('damage', 'no_show', 'late_return', 'other');

-- Estados de disputa
CREATE TYPE dispute_status AS ENUM ('open', 'in_review', 'resolved', 'rejected');

-- Estados de payout
CREATE TYPE payout_status_enum AS ENUM (
    'pending', 'processing', 'completed', 'failed', 'manual_review'
);

-- Onboarding
CREATE TYPE onboarding_status AS ENUM ('incomplete', 'complete', 'skipped');

-- Roles admin
CREATE TYPE admin_role AS ENUM ('super_admin', 'operations', 'support', 'finance');

-- Tipos de documento
CREATE TYPE document_kind AS ENUM (
    'gov_id_front', 'gov_id_back', 'driver_license', 'utility_bill',
    'selfie', 'license_front', 'license_back', 'vehicle_registration',
    'vehicle_insurance', 'criminal_record'
);

-- Eventos de pago
CREATE TYPE payment_event_type AS ENUM (
    'payment_initiated', 'payment_processing', 'payment_approved',
    'payment_rejected', 'payment_failed', 'payment_cancelled',
    'hold_created', 'hold_captured', 'hold_released', 'hold_expired',
    'hold_reauthorized', 'refund_initiated', 'refund_processing',
    'refund_completed', 'refund_failed', 'partial_refund_completed',
    'split_initiated', 'split_owner_payment', 'split_platform_fee',
    'split_completed', 'wallet_lock_created', 'wallet_lock_released',
    'wallet_funds_transferred', 'dispute_opened', 'dispute_evidence_submitted',
    'dispute_resolved', 'webhook_received', 'status_sync', 'manual_intervention'
);

-- Tipos de notificación
CREATE TYPE notification_type AS ENUM (
    'new_booking_for_owner', 'booking_cancelled_for_owner',
    'booking_cancelled_for_renter', 'new_chat_message',
    'payment_successful', 'payout_successful', 'inspection_reminder',
    'generic_announcement', 'mp_onboarding_required',
    'booking_reminder_24h', 'booking_reminder_2h',
    'document_expiry_license', 'owner_inactive_reminder',
    'optimization_tip', 'booking_ended_review', 'monthly_report',
    'welcome', 'verification_approved', 'verification_rejected',
    'nearby_cars', 'car_views_milestone', 'car_recommendation',
    'renter_tip', 'price_drop_alert', 'favorite_car_available',
    'pending_requests_reminder'
);
```

---

## 4. Vistas Principales

| Vista | Descripción |
|-------|-------------|
| `bookable_cars` | Autos disponibles para reservar |
| `my_bookings` | Bookings del usuario actual (renter) |
| `owner_bookings` | Bookings de los autos del owner |
| `owner_pending_approvals` | Aprobaciones pendientes para owner |
| `v_wallet_history` | Historial consolidado de wallet |
| `v_cars_with_main_photo` | Autos con foto principal |
| `v_car_reviews` | Reviews por auto |
| `v_fx_rates_current` | Tasas FX activas |
| `v_identity_verification_status` | Estado de verificación KYC |
| `v_fgo_status` | Estado del FGO |
| `cars_payment_status_diagnostic` | Diagnóstico de capacidad de pago |
| `profiles_decrypted` | Perfiles con PII desencriptado |
| `messages_decrypted` | Mensajes desencriptados |
| `pending_payouts_critical` | Payouts críticos pendientes |
| `accounting_balance_sheet` | Balance general |
| `accounting_income_statement` | Estado de resultados |

---

## 5. Funciones RPC Principales

### 5.1 Bookings

| Función | Descripción |
|---------|-------------|
| `approve_booking(booking_id, owner_id)` | Aprobar booking |
| `reject_booking(booking_id, reason)` | Rechazar booking |
| `cancel_with_fee(booking_id)` | Cancelar con fee |
| `complete_checkout(booking_id)` | Completar checkout |
| `complete_booking_and_process_payout(booking_id)` | Completar y pagar |
| `check_availability(car_id, start, end)` | Verificar disponibilidad |
| `get_cars_within_radius(lat, lng, km, start, end)` | Buscar autos por radio |
| `add_to_waitlist(car_id, start, end)` | Agregar a waitlist |

### 5.2 Pagos

| Función | Descripción |
|---------|-------------|
| `create_payment_authorization(...)` | Crear pre-autorización |
| `capture_payment_authorization(payment_id, amount)` | Capturar pago |
| `cancel_payment_authorization(payment_id)` | Cancelar autorización |
| `create_mp_preauth_order(...)` | Crear orden MP pre-auth |
| `capture_mp_preauth_order(...)` | Capturar orden MP |
| `calculate_payment_split(total, fee_pct)` | Calcular split |
| `complete_payment_split(split_id, mp_id, data)` | Completar split |

### 5.3 Wallet

| Función | Descripción |
|---------|-------------|
| `wallet_deposit(user_id, amount, ref)` | Depositar en wallet |
| `wallet_withdraw(user_id, amount)` | Retirar de wallet |
| `wallet_lock_funds(user_id, booking_id, amount)` | Bloquear fondos |
| `wallet_unlock_funds(booking_id)` | Desbloquear fondos |
| `wallet_transfer(from_user, to_user, amount, ref)` | Transferir P2P |
| `get_user_balance_from_ledger(user_id)` | Obtener balance |

### 5.4 FX y Pricing

| Función | Descripción |
|---------|-------------|
| `get_current_fx_rate(from, to)` | Obtener tasa actual |
| `calculate_dynamic_price(region, user, start, hours)` | Calcular precio dinámico |
| `calculate_suggested_daily_rate(value, category, country)` | Sugerir tarifa diaria |
| `calculate_user_bonus_malus(user_id)` | Calcular bonus/malus |

### 5.5 Verificación

| Función | Descripción |
|---------|-------------|
| `can_publish_car(user_id)` | Puede publicar auto |
| `get_driver_profile(user_id)` | Perfil de conductor |
| `check_mercadopago_connection()` | Verificar conexión MP |
| `connect_mercadopago(...)` | Conectar cuenta MP |

### 5.6 FGO (Fondo de Garantía)

| Función | Descripción |
|---------|-------------|
| `fgo_assess_eligibility(booking_id, claim_amount)` | Evaluar elegibilidad |
| `fgo_execute_waterfall(booking_id, claim, desc, url)` | Ejecutar waterfall de cobertura |
| `fgo_contribute_from_deposit(...)` | Contribuir al fondo |
| `fgo_pay_siniestro(...)` | Pagar siniestro |

### 5.7 Reviews

| Función | Descripción |
|---------|-------------|
| `create_review(booking_id, reviewer, reviewee, rating, ...)` | Crear review |
| `update_car_rating(car_id)` | Actualizar rating auto |
| `update_user_rating(user_id)` | Actualizar rating usuario |

### 5.8 Encriptación

| Función | Descripción |
|---------|-------------|
| `encrypt_pii(plaintext)` | Encriptar PII |
| `decrypt_pii(ciphertext)` | Desencriptar PII |
| `add_bank_account_with_encryption(...)` | Agregar cuenta encriptada |

---

## 6. Políticas RLS

Todas las tablas (130/131) tienen RLS habilitado.

### Patrones Comunes:

```sql
-- Usuario puede ver sus propios datos
(auth.uid() = user_id)

-- Participantes de booking
((auth.uid() = renter_id) OR
 EXISTS (SELECT 1 FROM cars WHERE cars.id = bookings.car_id
         AND cars.owner_id = auth.uid()))

-- Solo admins
EXISTS (SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin')

-- Service role
(auth.jwt() ->> 'role') = 'service_role'
```

### Tablas con Políticas Especiales:

| Tabla | Política |
|-------|----------|
| `bookings` | Renter + Owner del car + Admin |
| `cars` | Owner + lectura pública para activos |
| `messages` | Sender + Recipient |
| `payments` | Booking participants |
| `wallet_transactions` | Solo usuario propietario |
| `accounting_*` | Solo admins |
| `admin_*` | Solo super_admins |

---

## 7. Índices Importantes

```sql
-- Búsqueda geoespacial
CREATE INDEX idx_cars_location_geom ON cars USING GIST (location_geom);

-- Búsqueda por disponibilidad
CREATE INDEX idx_bookings_car_dates ON bookings (car_id, start_at, end_at);
CREATE INDEX idx_bookings_status ON bookings (status);

-- Wallet
CREATE INDEX idx_wallet_transactions_user ON wallet_transactions (user_id);
CREATE INDEX idx_wallet_transactions_ref ON wallet_transactions (ref);

-- FX Rates
CREATE INDEX idx_exchange_rates_active ON exchange_rates (pair) WHERE is_active = true;
```

---

## 8. Triggers Principales

| Trigger | Tabla | Descripción |
|---------|-------|-------------|
| `handle_new_user` | `auth.users` | Crear perfil automático |
| `update_car_rating` | `reviews` | Actualizar rating del auto |
| `update_user_rating` | `reviews` | Actualizar rating usuario |
| `auto_update_price_per_day` | `cars` | Recalcular precio |
| `booking_payment_event_logger` | `bookings` | Log de eventos de pago |
| `accounting_*` | varios | Contabilidad automática |

---

## 9. Extensiones Habilitadas

```sql
-- Geoespacial
postgis
postgis_topology

-- UUID
uuid-ossp
pgcrypto

-- Índices especiales
btree_gist

-- Full-text search
pg_trgm
```

---

## 10. Consideraciones de Migración

### Wallet Dual System

El sistema de wallet tiene dos arquitecturas:

1. **Legacy** (`wallet_transactions`): Sistema original
2. **Nuevo** (`wallet_ledger`): Double-entry bookkeeping

Vista consolidada: `v_wallet_history`

### Exchange Rates

- Fuente: Binance API
- Actualización: Automática cada hora
- Margen de plataforma: +10% para garantías

---

*Documentación generada automáticamente. Última actualización: 2025-12-30*
