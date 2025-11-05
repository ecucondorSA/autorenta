# Lista de Archivos para Actualizar Imports de Tipos Supabase

**Total estimado: ~45 archivos**

---

## PRIORIDAD 1: Archivos Base de Tipos (4 archivos) 🔴 CRÍTICO

Estos definen los tipos que otros archivos usan. **Actualizar primero.**

```
1. src/app/core/types/database.types.ts
2. src/app/core/models/index.ts
3. src/app/core/models/wallet.model.ts
4. src/app/core/utils/type-guards.ts
```

**Acción:** Re-exportar los tipos de Supabase en lugar de definirlos manualmente.

---

## PRIORIDAD 2: Servicios Core (5 archivos) 🔴 CRÍTICO

Estos servicios son usados por toda la aplicación.

```
5. src/app/core/services/profile.service.ts
6. src/app/core/services/cars.service.ts
7. src/app/core/services/bookings.service.ts
8. src/app/core/services/admin.service.ts
9. src/app/core/services/cars-compare.service.ts
```

---

## PRIORIDAD 3: Componentes Wallet (4 archivos) 🟠 ALTA

Tienen errores activos de tipos.

```
10. src/app/shared/components/wallet-balance-card/wallet-balance-card.component.ts
11. src/app/shared/components/transaction-history/transaction-history.component.ts
12. src/app/shared/components/deposit-modal/deposit-modal.component.ts
13. src/app/features/wallet/wallet.page.ts
```

**Tipos necesarios:** `WalletBalance`, `WalletTransaction`, `WalletLedger`

---

## PRIORIDAD 4: Páginas Profile (3 archivos) 🟠 ALTA

Tienen 35+ errores relacionados con tipos Profile.

```
14. src/app/features/profile/profile-expanded.page.ts
15. src/app/features/profile/profile.page.ts
16. src/app/features/users/public-profile.page.ts
```

**Tipos necesarios:** `Profile`, `ProfileUpdate`

---

## PRIORIDAD 5: Booking & Payments (5 archivos) 🟠 ALTA

Errores de métodos WalletService y tipos de pago.

```
17. src/app/features/bookings/booking-detail-payment/booking-detail-payment.page.ts
18. src/app/features/bookings/booking-detail-payment/components/card-hold-panel.component.ts
19. src/app/features/bookings/booking-detail-payment/components/credit-security-panel.component.ts
20. src/app/features/bookings/checkout/services/checkout-payment.service.ts
21. src/app/features/bookings/owner-bookings/owner-bookings.page.ts
```

**Tipos necesarios:** `Booking`, `Payment`, `PaymentAuthorization`

---

## PRIORIDAD 6: Páginas Cars (7 archivos) 🟡 MEDIA

```
22. src/app/features/cars/publish/publish-car.page.ts
23. src/app/features/cars/publish/publish-car-v2.page.ts
24. src/app/features/cars/publish/car-publish.page.ts
25. src/app/features/cars/detail/car-detail.page.ts
26. src/app/features/cars/list/cars-list.page.ts
27. src/app/features/cars/my-cars/my-cars.page.ts
28. src/app/features/cars/compare/compare.page.ts
```

**Tipos necesarios:** `Car`, `CarInsert`, `CarUpdate`

---

## PRIORIDAD 7: Componentes Compartidos (8 archivos) 🟡 MEDIA

```
29. src/app/shared/components/car-card/car-card.component.ts
30. src/app/shared/components/cars-map/cars-map.component.ts
31. src/app/shared/components/bank-account-form/bank-account-form.component.ts
32. src/app/shared/components/mercadopago-card-form/mercadopago-card-form.component.ts
33. src/app/shared/components/verification-prompt-banner/verification-prompt-banner.component.ts
34. src/app/shared/components/pwa-titlebar/pwa-titlebar.component.ts
35. src/app/shared/utils/car-placeholder-images.ts
36. src/app/shared/utils/car-placeholder.util.ts
```

---

## PRIORIDAD 8: Otros (9 archivos) ⚪ BAJA

```
37. src/app/features/bookings/booking-detail/review-management.component.ts
38. src/app/features/messages/messages.page.ts
39. src/app/features/explore/explore.page.ts
40. src/app/features/home/home.page.ts
41. src/app/features/dashboard/owner-dashboard.page.ts
42. src/app/features/admin/admin-dashboard.page.ts
43. src/app/features/admin/dashboard/admin-dashboard.page.ts
44. src/app/app.component.ts
45. src/app/core/guards/onboarding.guard.ts
```

---

## ESTRATEGIA DE ACTUALIZACIÓN

### Fase 1: Actualizar archivos base (1-4)
- Tiempo: 15 min
- Impacto: Prepara la base para todos los demás

### Fase 2: Actualizar servicios (5-9)
- Tiempo: 30 min
- Impacto: Alto - servicios usados por toda la app

### Fase 3: Actualizar componentes críticos (10-21)
- Tiempo: 1 hora
- Impacto: Muy alto - elimina la mayoría de errores

### Fase 4: Actualizar resto (22-45)
- Tiempo: 1-2 horas
- Impacto: Medio - mejora consistencia

---

## PATRÓN DE ACTUALIZACIÓN

### Antes:
```typescript
import { Profile, Car } from '@core/types/database.types';
```

### Después:
```typescript
import { Profile, Car } from '@core/types/supabase-types';
```

---

## TIPOS DISPONIBLES EN supabase-types.ts

- ✅ `Profile`, `ProfileInsert`, `ProfileUpdate`
- ✅ `Car`, `CarInsert`, `CarUpdate`
- ✅ `Booking`, `BookingInsert`, `BookingUpdate`
- ✅ `WalletBalance`, `WalletTransaction`, `WalletLedger`
- ✅ `Payment`, `PaymentAuthorization`
- ✅ `BankAccount`
- ✅ `Review`
- ✅ `Database` (tipo completo)

---

## RECOMENDACIÓN

**Empezar por los archivos 1-13 (Prioridad 1-3)**
- Son 13 archivos
- Tiempo estimado: 1 hora
- Eliminaría ~40-50% de los errores de tipos
- Prepara la base para el resto

¿Quieres que empiece con estos 13 archivos críticos?
