# Relación Base de Datos ↔ UI - AutoRenta
**Actualizado:** 2025-12-01

## Resumen

| Componente | Estado |
|------------|--------|
| Tablas en BD | 104 |
| Features en UI | 30 |
| Servicios Core | 15+ |
| Tipos TypeScript | Sincronizados |

---

## Mapeo Feature → Servicio → Tablas

### 🚗 Cars (Vehículos)
```
Feature: /features/cars/
Servicio: cars.service.ts
Tablas:
  - cars (principal)
  - car_photos
  - car_brands
  - car_models
  - car_blocked_dates
  - pricing_overrides
```

### 📅 Bookings (Reservas)
```
Feature: /features/bookings/
Servicio: bookings.service.ts
Tablas:
  - bookings (principal)
  - booking_insurance_coverage
  - booking_inspections
  - booking_risk_snapshot
  - booking_claims
```

### 💰 Wallet (Billetera)
```
Feature: /features/wallet/
Servicio: wallet.service.ts
Tablas:
  - user_wallets
  - wallet_transactions
  - wallet_audit_log
  - withdrawal_requests
  - withdrawal_transactions
```

### 💳 Payments (Pagos)
```
Feature: /features/deposit/, /features/payouts/
Servicio: payments.service.ts
Tablas:
  - payments
  - payment_intents
  - payment_splits
  - payment_issues
```

### 👤 Profile (Perfil)
```
Feature: /features/profile/
Servicio: profiles.service.ts
Tablas:
  - profiles
  - user_documents
  - user_verifications
  - user_identity_levels
```

### ⚖️ Disputes (Disputas)
```
Feature: /features/disputes/
Servicio: disputes.service.ts
Tablas:
  - disputes
  - dispute_evidence
```

### 🏢 Organizations (Organizaciones/Flotas)
```
Feature: /features/organizations/
Servicio: organizations.service.ts
Tablas:
  - organizations
  - organization_members
```

### 🚩 Feature Flags
```
Feature: /features/admin/feature-flags/
Servicio: feature-flag.service.ts
Tablas:
  - feature_flags
  - feature_flag_overrides
  - feature_flag_audit_log
```

### 💬 Messages (Mensajes)
```
Feature: /features/messages/
Servicio: messages.service.ts
Tablas:
  - messages
  - encryption_keys
```

### 🔔 Notifications
```
Feature: /features/notifications/
Servicio: notifications.service.ts
Tablas:
  - notifications
  - notification_settings
  - push_tokens
```

### ⭐ Reviews (Reseñas)
```
Feature: /features/reviews/
Servicio: reviews.service.ts
Tablas:
  - reviews
```

### 🎁 Referrals (Referidos)
```
Feature: /features/referrals/
Servicio: referrals.service.ts
Tablas:
  - referrals
  - referral_codes
  - referral_rewards
```

### 📆 Calendar
```
Feature: /features/calendar/
Servicio: calendar.service.ts
Tablas:
  - car_google_calendars
  - google_calendar_tokens
  - calendar_sync_log
```

---

## Servicios Core

| Servicio | Archivo | Tablas Principales |
|----------|---------|-------------------|
| `SupabaseClientService` | supabase-client.service.ts | (cliente base) |
| `AuthService` | auth.service.ts | auth.users, profiles |
| `BookingsService` | bookings.service.ts | bookings, cars |
| `CarsService` | cars.service.ts | cars, car_photos |
| `WalletService` | wallet.service.ts | user_wallets, wallet_transactions |
| `PaymentsService` | payments.service.ts | payments, payment_intents |
| `ProfilesService` | profiles.service.ts | profiles |
| `DisputesService` | disputes.service.ts | disputes, dispute_evidence |
| `FeatureFlagService` | feature-flag.service.ts | feature_flags |
| `MessagesService` | messages.service.ts | messages |
| `NotificationsService` | notifications.service.ts | notifications |
| `ReviewsService` | reviews.service.ts | reviews |

---

## Tipos TypeScript

### Ubicación
```
/apps/web/src/app/core/types/database.types.ts
```

### Tipos Principales
- `Database` - Tipo raíz generado por Supabase
- `Booking`, `BookingStatus`
- `Car`, `CarStatus`
- `Payment`, `PaymentStatus`
- `Profile`
- `Dispute`, `DisputeStatus`, `DisputeKind`
- `FeatureFlag`
- `Organization`, `OrganizationMember`

---

## Funciones RPC Disponibles

### Wallet
- `wallet_get_balance(user_id)`
- `wallet_initiate_deposit(amount, currency)`
- `wallet_lock_funds(user_id, amount, booking_id)`
- `wallet_charge_rental(booking_id)`
- `wallet_debit_for_damage(booking_id, amount)`

### Booking
- `request_booking(car_id, start_at, end_at, ...)`
- `quote_booking(car_id, start_at, end_at)`
- `approve_booking(booking_id)`
- `lock_price_for_booking(car_id, days)`

### Payments
- `create_payment_authorization(booking_id)`
- `capture_payment_authorization(authorization_id)`
- `process_split_payment(booking_id)`

### Feature Flags
- `is_feature_enabled(flag_name, user_id)`

---

## Vistas Importantes

| Vista | Descripción |
|-------|-------------|
| `v_cars_with_main_photo` | Autos con foto principal |
| `v_wallet_history` | Historial de wallet |
| `car_latest_location` | Última ubicación de autos |
| `bookable_cars` | Autos disponibles para reserva |

---

## Notas

1. **RLS**: Todas las tablas críticas tienen Row Level Security habilitado
2. **Realtime**: Habilitado en `messages`, `notifications`, `wallet_transactions`
3. **Storage**: Buckets para `avatars`, `car-images`, `documents`
