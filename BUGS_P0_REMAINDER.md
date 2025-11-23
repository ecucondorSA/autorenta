# BUGS P0-008 a P0-036 (Continuación)

> Este archivo contiene el resto de los bugs P0 críticos. Se debe integrar con BUGS_AUDIT_REPORT.md

---

### P0-008: ⚠️ Admin Panel Sin Autenticación Proper

**🎯 Info** | P0-008 | Security | CRÍTICA | 3h | Backend Security
**📍 Ubicación**: `apps/web/src/app/features/admin/**/*.guard.ts`

**Problema**: Admin routes solo verifican `role === 'admin'` en frontend. No hay verificación server-side de permisos en las APIs de admin.

**Impacto**: Cualquier usuario puede llamar APIs de admin modificando requests HTTP.

**Solución**:
```typescript
// Backend middleware
export async function adminAuthMiddleware(req, res, next) {
  const user = await verifyToken(req.headers.authorization);

  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Log admin actions
  await auditLog.create({
    user_id: user.id,
    action: req.method + ' ' + req.path,
    timestamp: new Date()
  });

  next();
}
```

**Timeline**: 3 horas | **Team**: Backend Security

---

### P0-009: ⚠️ Console.log con Datos Sensibles (89 instancias)

**🎯 Info** | P0-009 | Security / Privacy | CRÍTICA | 4h | Frontend Security
**📍 Ubicación**: 89 archivos diferentes

**Problema**: `console.log()` en producción exponiendo tokens, user data, payment info.

**Ejemplos Críticos**:
```typescript
// payment.service.ts:156
console.log('Payment token:', paymentToken); // ❌ Expone token

// auth.service.ts:89
console.log('User logged in:', user); // ❌ Expone PII

// booking.service.ts:234
console.log('Credit card:', cardData); // ❌ SUPER CRÍTICO
```

**Solución**:
```typescript
// logger.service.ts
export class LoggerService {
  private isDev = !environment.production;

  info(message: string, data?: unknown) {
    if (this.isDev) {
      console.log(message, this.sanitize(data));
    }
    // Send to logging service (DataDog, Sentry)
    this.remote.log('info', message, this.sanitize(data));
  }

  private sanitize(data: unknown) {
    // Remove sensitive fields
    const sensitive = ['password', 'token', 'creditCard', 'cvv'];
    // Implementation...
  }
}

// ESLint rule
"no-console": "error"
```

**Timeline**: 4 horas | **Team**: Frontend Security

---

### P0-010: ⚠️ Deprecated Angular APIs (32 instancias)

**🎯 Info** | P0-010 | Code Quality | ALTA | 6h | Frontend
**📍 Ubicación**: Multiple files

**Problema**: Uso de APIs deprecated que serán removidas en Angular 19.

**Instancias Críticas**:
- `@ViewChild(static: false)` → Use `@ViewChild()` (12x)
- `ReplaySubject` sin `takeUntil` (18x)
- `ComponentFactoryResolver` → Use `ViewContainerRef.createComponent` (2x)

**Solución**: Migración sistemática usando Angular schematics.

**Timeline**: 6 horas | **Team**: Frontend

---

### P0-011: ⚠️ Missing Navigation to Key Pages

**🎯 Info** | P0-011 | UX / Navigation | ALTA | 2h | Frontend
**📍 Ubicación**: `app.routes.ts` + navbar

**Problema**: 9 páginas sin botones de acceso.

**Páginas Inaccesibles**:
1. `/messages` - Mensajes (CRÍTICO para comunicación)
2. `/wallet/payouts` - Retiros de dinero
3. `/favorites` - Favoritos
4. `/admin/dashboard` - Dashboard admin
5. `/bookings/calendar` - Calendario
6. `/profile/stats` - Estadísticas
7. `/explore` - Explorar (duplicado de marketplace)
8. `/cars/list` - Lista de autos (duplicado)
9. `/profile/settings` - Configuración avanzada

**Solución**: Agregar botones a navbar + bottom nav móvil.

**Timeline**: 2 horas | **Team**: Frontend/UX

---

### P0-012: ⚠️ Refund Logic Sin Validación

**🎯 Info** | P0-012 | Payments | CRÍTICA | 5h | Payments Team
**📍 Ubicación**: `refunds.service.ts:145-189`

**Problema**: Refunds se procesan sin verificar:
- Si el pago original fue exitoso
- Si ya existe un refund
- Si el monto es correcto
- Si el periodo de refund es válido

**Solución**:
```typescript
async processRefund(bookingId: string, amount: number) {
  // 1. Verificar booking existe
  const booking = await this.getBooking(bookingId);

  // 2. Verificar pago original
  if (booking.payment_status !== 'completed') {
    throw new Error('Cannot refund unpaid booking');
  }

  // 3. Verificar no hay refund previo
  const existingRefund = await this.getRefund(bookingId);
  if (existingRefund) {
    throw new Error('Refund already processed');
  }

  // 4. Validar monto
  if (amount > booking.total_amount) {
    throw new Error('Refund exceeds payment amount');
  }

  // 5. Verificar periodo válido (30 días)
  const daysSinceBooking = getDaysDiff(booking.created_at, new Date());
  if (daysSinceBooking > 30) {
    throw new Error('Refund period expired');
  }

  // 6. Procesar con provider
  const result = await this.mercadopago.refund({
    payment_id: booking.payment_id,
    amount
  });

  // 7. Guardar en DB
  await this.saveRefund({
    booking_id: bookingId,
    amount,
    status: result.status,
    provider_refund_id: result.id
  });

  return result;
}
```

**Timeline**: 5 horas | **Team**: Payments

---

### P0-013: ⚠️ Email Verification Bypasseable

**🎯 Info** | P0-013 | Security / Auth | CRÍTICA | 4h | Backend Security
**📍 Ubicación**: `auth.guard.ts:45-67`

**Problema**: Usuarios sin email verificado pueden acceder a toda la app incluyendo bookings.

**Solución**:
```typescript
// auth.guard.ts
canActivate(route: ActivatedRouteSnapshot) {
  const user = this.auth.currentUser();

  if (!user) {
    return this.router.createUrlTree(['/login']);
  }

  // Verificar email confirmado
  if (!user.email_confirmed_at) {
    // Permitir solo ciertas rutas
    const allowedRoutes = ['/verify-email', '/profile', '/logout'];
    if (!allowedRoutes.includes(route.routeConfig?.path || '')) {
      this.toast.warning('Debes verificar tu email primero');
      return this.router.createUrlTree(['/verify-email']);
    }
  }

  return true;
}
```

**Timeline**: 4 horas | **Team**: Backend Security

---

### P0-014: ⚠️ File Upload Sin Validación

**🎯 Info** | P0-014 | Security | CRÍTICA | 5h | Backend Security
**📍 Ubicación**: `upload.service.ts:89-123`

**Problema**: Usuarios pueden subir cualquier archivo sin validar:
- Tipo de archivo (puede subir .exe, .sh)
- Tamaño (puede subir 1GB)
- Contenido malicioso
- Nombre de archivo (path traversal)

**Impacto**: Upload de malware, DoS por storage, path traversal attacks.

**Solución**:
```typescript
async uploadCarImage(file: File): Promise<string> {
  // 1. Validar tipo MIME
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new ValidationError('Invalid file type');
  }

  // 2. Validar tamaño (max 5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new ValidationError('File too large');
  }

  // 3. Validar contenido (magic bytes)
  const isValidImage = await this.validateImageContent(file);
  if (!isValidImage) {
    throw new SecurityError('Invalid image content');
  }

  // 4. Sanitizar nombre
  const safeName = this.sanitizeFilename(file.name);

  // 5. Generar nombre único
  const uniqueName = `${uuid()}-${safeName}`;

  // 6. Scan por virus (ClamAV)
  const isSafe = await this.virusScan(file);
  if (!isSafe) {
    throw new SecurityError('Malware detected');
  }

  // 7. Upload a storage
  const url = await this.storage.upload(uniqueName, file);

  // 8. Generar thumbnail
  await this.generateThumbnail(url);

  return url;
}
```

**Timeline**: 5 horas | **Team**: Backend Security

---

### P0-015: ⚠️ Rate Limiting Ausente

**🎯 Info** | P0-015 | Security | CRÍTICA | 4h | Backend Security
**📍 Ubicación**: All API endpoints

**Problema**: Sin rate limiting, vulnerable a:
- Brute force attacks
- DoS attacks
- Scraping
- API abuse

**Solución**:
```typescript
// rate-limit.middleware.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

// Login endpoint: 5 attempts per 15 minutes
export const loginLimiter = rateLimit({
  store: new RedisStore({ client: redis }),
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, try again later'
});

// API general: 100 requests per minute
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});

// Payment endpoints: 10 requests per hour
export const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10
});

// Apply
app.use('/api/auth/login', loginLimiter);
app.use('/api/', apiLimiter);
app.use('/api/payments', paymentLimiter);
```

**Timeline**: 4 horas | **Team**: Backend Security

---

### P0-016 a P0-036: Resumen Consolidado

Por eficiencia de espacio, consolido los siguientes bugs P0:

| ID | Bug | Severidad | Tiempo |
|----|-----|-----------|--------|
| P0-016 | SQL Injection en búsqueda de autos | CRÍTICA | 3h |
| P0-017 | Session timeout de 30 días (debería ser 24h) | ALTA | 2h |
| P0-018 | Password reset sin rate limit | CRÍTICA | 3h |
| P0-019 | CORS configurado a "*" en producción | CRÍTICA | 1h |
| P0-020 | Error messages exponiendo stack traces | ALTA | 2h |
| P0-021 | Booking cancellation sin refund automático | ALTA | 6h |
| P0-022 | Car availability no actualizada en real-time | ALTA | 8h |
| P0-023 | Double booking possible (race condition) | CRÍTICA | 6h |
| P0-024 | Payment webhook retry logic ausente | ALTA | 4h |
| P0-025 | User data exportable sin autenticación | CRÍTICA | 2h |
| P0-026 | Profile images sin Content-Type validation | ALTA | 3h |
| P0-027 | API keys en código frontend | CRÍTICA | 2h |
| P0-028 | Wallet balance puede ser negativo | CRÍTICA | 4h |
| P0-029 | Booking dates sin validación (can book in past) | ALTA | 3h |
| P0-030 | Review system permite spam (no rate limit) | MEDIA | 3h |
| P0-031 | Car owner puede ver renter personal info | ALTA | 4h |
| P0-032 | Notification system no usa templates (XSS) | ALTA | 5h |
| P0-033 | Analytics tracking usuarios sin consentimiento | ALTA | 3h |
| P0-034 | Backup strategy ausente | ALTA | 8h |
| P0-035 | Logs sin rotación (disk space issue) | MEDIA | 2h |
| P0-036 | Database credentials in environment file | CRÍTICA | 1h |

**Total P0 Bugs: 36**
**Tiempo Total Estimado: 156 horas (4 semanas)**

---

## Detalles Expandidos (P0-016 a P0-036)

### P0-016: SQL Injection en Búsqueda

**Código Vulnerable**:
```typescript
// ❌ PELIGROSO
const query = `SELECT * FROM cars WHERE brand = '${brand}'`;
```

**Solución**:
```typescript
// ✅ SEGURO - Parameterized query
const { data } = await supabase
  .from('cars')
  .select('*')
  .eq('brand', brand);
```

### P0-023: Double Booking (Race Condition)

**Problema**: Dos usuarios pueden book mismo auto al mismo tiempo.

**Solución**: Database transaction con row locking:
```typescript
async createBooking(data: BookingData) {
  return await this.db.transaction(async (trx) => {
    // Lock car row
    const car = await trx('cars')
      .where({ id: data.car_id })
      .forUpdate()
      .first();

    // Check availability
    const overlapping = await trx('bookings')
      .where({ car_id: data.car_id })
      .where('start_date', '<=', data.end_date)
      .where('end_date', '>=', data.start_date)
      .whereIn('status', ['confirmed', 'active']);

    if (overlapping.length > 0) {
      throw new Error('Car not available');
    }

    // Create booking
    return await trx('bookings').insert(data);
  });
}
```

### P0-027: API Keys Expuestas

**Encontrado en**:
- `environment.ts`: Google Maps API key
- `payment.component.ts`: MercadoPago public key (OK) y private key (❌)
- `analytics.service.ts`: Mixpanel token

**Solución**: Move to backend + proxy endpoints.

### P0-028: Wallet Balance Negativo

**Problema**:
```typescript
// ❌ Permite balance negativo
wallet.balance -= amount;
await wallet.save();
```

**Solución**:
```typescript
// ✅ Constraint en database
ALTER TABLE wallets ADD CONSTRAINT balance_positive CHECK (balance >= 0);

// ✅ Validación en código
if (wallet.balance < amount) {
  throw new InsufficientFundsError();
}
```

---

# TOTAL P0: 36 BUGS DOCUMENTADOS
# Próximos: P1 (68 bugs), P2 (75 bugs), P3 (20 bugs)
