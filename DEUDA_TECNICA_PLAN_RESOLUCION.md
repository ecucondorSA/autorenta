# 🚨 DEUDA TÉCNICA - PLAN DE RESOLUCIÓN COMPRENSIVO
**AutoRenta Technical Debt Analysis & Resolution Strategy**

**Fecha**: 28 de Octubre, 2025
**Status**: 🔴 CRÍTICA - Requiere atención inmediata
**Esfuerzo Total**: ~72 horas de desarrollo
**Timeline**: 2-4 semanas para resolver completamente

---

## 📊 RESUMEN EJECUTIVO

### Estado Actual
```
Total Technical Debt Items: 20
├─ CRITICAL: 1 (8 horas)
├─ HIGH: 4 (16 horas)
├─ MEDIUM: 13 (40 horas)
└─ LOW: 2 (8 horas)

Risk Level: 🔴 HIGH
Blocker Count: 3 (impiden producción)
```

### Bloqueadores Inmediatos
1. 🔴 **CRITICAL**: Tokens MercadoPago sin encriptar (seguridad)
2. 🔴 **HIGH**: 847 console.log en producción (data leak risk)
3. 🔴 **HIGH**: N+1 queries en wallet-reconciliation (performance)

---

## 🔴 CRÍTICOS (RESOLVER HOY/MAÑANA)

### 1. CRITICAL: MercadoPago Tokens Sin Encriptar
**Archivo**: `apps/web/src/app/core/services/marketplace-onboarding.service.ts`
**Severidad**: 🔴 CRÍTICO
**Riesgo**: Violación PCI DSS, robo de fondos, breach de datos

#### Problema
```typescript
// TODO: En producción, ENCRIPTAR los tokens antes de guardar
const { data, error } = await supabase
  .from('user_profiles')
  .update({ mercadopago_token: token })  // ❌ Plaintext in DB!
  .eq('user_id', auth.currentUser.id)
```

#### Impacto
- ✅ Si DB se breachea → Tokens comprometidos
- ✅ Acceso no autorizado a cuentas MercadoPago
- ✅ Transferencias fraudulentas posibles
- ✅ Falta cumplimiento PCI DSS
- ✅ Violación de términos de MercadoPago

#### Solución (2-3 horas)
```typescript
// Option A: Field-level encryption (Recommended)
import crypto from 'crypto';

async updateMercadopagoToken(token: string): Promise<void> {
  const encryptionKey = this.getProductionEncryptionKey();
  const encryptedToken = this.encryptToken(token, encryptionKey);

  await supabase
    .from('user_profiles')
    .update({
      mercadopago_token: encryptedToken,
      token_encrypted_at: new Date().toISOString()
    })
    .eq('user_id', this.auth.currentUser.id);
}

private encryptToken(token: string, key: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key), iv);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

private decryptToken(encrypted: string, key: string): string {
  const [iv, authTag, ciphertext] = encrypted.split(':');
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(key),
    Buffer.from(iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

#### Checklist
- [ ] Crear migration: `add_token_encryption_to_profiles`
- [ ] Implementar encrypt/decrypt functions
- [ ] Crear script para encriptar tokens existentes
- [ ] Add Supabase RLS policy para proteger encrypted_tokens column
- [ ] Audit logging cuando token se accesa
- [ ] Test encryption/decryption roundtrip
- [ ] Deploy con zero-downtime (backwards compatible)
- [ ] Document en README
- [ ] Verificar compliance con PCI DSS

---

### 2. HIGH: 847 Console.log Statements en Producción
**Archivos**: 20+ service files
**Severidad**: 🟠 ALTA
**Riesgo**: Data leaks, performance, bundle bloat

#### Problema
```typescript
// ❌ Estos están en PRODUCCIÓN:
console.log('User token:', this.auth.token);  // Data leak!
console.log('Payment response:', paymentData); // May contain PII
console.log('Wallet balance:', user.balance);  // User data exposed
```

#### Impacto
- ✅ Tokens/secrets visible en navegador
- ✅ User data logged (PII exposure)
- ✅ Performance impact (+50KB bundle)
- ✅ Security risk

#### Solución (2-3 horas)

**Paso 1: Crear Logging Service**
```typescript
// src/app/core/services/logger.service.ts
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

@Injectable({ providedIn: 'root' })
export class LoggerService {
  private isDevelopment = !environment.production;
  private minLogLevel: LogLevel = environment.production ? 'warn' : 'debug';

  log(message: string, data?: unknown, level: LogLevel = 'debug'): void {
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;

    if (environment.production) {
      // In prod: Send to Sentry instead of console
      this.sendToSentry(logMessage, data, level);
    } else {
      // In dev: Log to console with styling
      console[level](logMessage, data || '');
    }
  }

  debug(message: string, data?: unknown): void { this.log(message, data, 'debug'); }
  info(message: string, data?: unknown): void { this.log(message, data, 'info'); }
  warn(message: string, data?: unknown): void { this.log(message, data, 'warn'); }
  error(message: string, data?: unknown): void { this.log(message, data, 'error'); }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level] >= levels[this.minLogLevel];
  }

  private sendToSentry(message: string, data: unknown, level: LogLevel): void {
    // Sanitize sensitive data before sending
    const sanitizedData = this.sanitizeData(data);

    if (window.Sentry) {
      window.Sentry.captureMessage(message, level as any, { extra: sanitizedData });
    }
  }

  private sanitizeData(data: unknown): unknown {
    if (!data) return data;
    if (typeof data !== 'object') return data;

    const sensitiveKeys = ['token', 'password', 'secret', 'key', 'card', 'ssn'];
    const sanitized = JSON.parse(JSON.stringify(data));

    const sanitizeObject = (obj: any) => {
      for (const key in obj) {
        if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object') {
          sanitizeObject(obj[key]);
        }
      }
    };

    sanitizeObject(sanitized);
    return sanitized;
  }
}
```

**Paso 2: Reemplazar console.log**
```bash
# Find all console statements
grep -r "console\." apps/web/src --include="*.ts" | wc -l

# Replace pattern (using sed or IDE find-replace):
# FROM: console.log
# TO:   this.logger.debug

# OR using script:
find apps/web/src -name "*.ts" -exec sed -i \
  's/console\.log(/this.logger.debug(/g' {} +
```

**Paso 3: Add ESLint Rule**
```javascript
// .eslintrc.json
{
  "rules": {
    "no-console": ["error", { "allow": ["warn", "error"] }]
  }
}
```

#### Checklist
- [ ] Create LoggerService
- [ ] Replace all console.log with logger.debug
- [ ] Replace console.warn with logger.warn
- [ ] Replace console.error with logger.error
- [ ] Setup Sentry in production
- [ ] Add pre-commit hook to block new console statements
- [ ] Test logging in dev vs prod
- [ ] Verify bundle size reduced

---

### 3. HIGH: N+1 Query in wallet-reconciliation
**Archivo**: `supabase/functions/wallet-reconciliation/index.ts` (lines 58-82)
**Severidad**: 🟠 ALTA
**Riesgo**: Timeout, performance degradation with scale

#### Problema
```typescript
// ❌ BAD: Loop with query inside
for (const wallet of wallets) {
  const { data: ledgerEntries } = await supabase
    .from('wallet_ledger')
    .select('kind, amount_cents')
    .eq('user_id', wallet.user_id);  // 1 query per wallet = N+1
}
```

#### Impacto
- ✅ With 1000 users → 1000 DB queries (instead of 1)
- ✅ Timeout after ~100 users
- ✅ Database connection pool exhaustion
- ✅ Rate limiting kicks in

#### Solución (1-2 horas)
```typescript
// ✅ GOOD: Batch query
async function reconcileWallets() {
  // Get all wallets
  const { data: wallets, error: walletsError } = await supabase
    .from('user_wallets')
    .select('user_id, balance_cents, locked_cents');

  if (walletsError) throw walletsError;

  // Single query for ALL ledger entries
  const userIds = wallets.map(w => w.user_id);
  const { data: allLedgerEntries, error: ledgerError } = await supabase
    .from('wallet_ledger')
    .select('user_id, kind, amount_cents')
    .in('user_id', userIds);  // ✅ Single query with IN clause

  if (ledgerError) throw ledgerError;

  // Group ledger entries by user_id in memory
  const ledgerByUserId = allLedgerEntries.reduce((acc, entry) => {
    if (!acc[entry.user_id]) acc[entry.user_id] = [];
    acc[entry.user_id].push(entry);
    return acc;
  }, {} as Record<string, typeof allLedgerEntries>);

  // Now process with data in memory
  for (const wallet of wallets) {
    const ledgerEntries = ledgerByUserId[wallet.user_id] || [];
    // ... reconciliation logic ...
  }
}
```

#### Checklist
- [ ] Replace loop query with batch query
- [ ] Test with 1000+ users
- [ ] Add performance monitoring
- [ ] Document batch size limits
- [ ] Add pagination if needed
- [ ] Create index on wallet_ledger(user_id) if missing

---

## 🟠 ALTOS (RESOLVER ESTA SEMANA)

### 4. HIGH: Too Many Responsibilities in Services

**Archivos**:
- `bookings.service.ts` (150+ lines, handles 5+ concerns)
- `marketplace-onboarding.service.ts` (200+ lines)
- `wallet.service.ts` (180+ lines)

**Problema**: Violación del Single Responsibility Principle

#### Solución (8 horas)

**Refactor bookings.service.ts**
```
ANTES:
bookings.service.ts
├─ Create booking
├─ Activate insurance
├─ Recalculate pricing
├─ Update app badges
├─ Handle cancellations
└─ Process refunds

DESPUÉS:
bookings.service.ts (only CRUD + core booking logic)
insurance-activation.service.ts (insurance logic)
pricing-calculator.service.ts (pricing logic)
notification.service.ts (badges, notifications)
booking-refund.service.ts (refund processing)
```

**Create InsuranceActivationService**
```typescript
// src/app/core/services/insurance-activation.service.ts
@Injectable({ providedIn: 'root' })
export class InsuranceActivationService {
  constructor(
    private supabase: SupabaseClient,
    private logger: LoggerService
  ) {}

  async activateInsurance(booking: Booking): Promise<Insurance> {
    this.logger.debug('Activating insurance', { bookingId: booking.id });

    // Insurance logic only
    const insurance = await this.createInsuranceRecord(booking);
    await this.notifyInsuranceProvider(insurance);

    return insurance;
  }
}
```

#### Checklist
- [ ] Extract InsuranceActivationService
- [ ] Extract PricingCalculatorService
- [ ] Extract NotificationService
- [ ] Extract BookingRefundService
- [ ] Update imports in components
- [ ] Add integration tests
- [ ] Update documentation

---

### 5. HIGH: Unencrypted and Unsafe Type Casting

**Archivos**: Multiple
**Severidad**: 🟠 ALTA
**Problema**: Use of `any` type disables type safety

#### Solución (4-6 horas)

**Replace all `(x as any)` with proper types**

```typescript
// ❌ BEFORE
const booking = bookings[0] as any;

// ✅ AFTER
const booking = bookings[0] as Booking;
```

**Create proper interfaces for window object**
```typescript
// src/app/core/types/window.types.ts
declare global {
  interface Window {
    env: EnvironmentConfig;
    dataLayer: any[];
    Sentry?: typeof Sentry;
  }
}

export interface EnvironmentConfig {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  MERCADOPAGO_PUBLIC_KEY: string;
}

// USAGE:
const config: EnvironmentConfig = window.env; // ✅ Type-safe!
```

#### Checklist
- [ ] Create global type definitions
- [ ] Replace all `as any` with specific types
- [ ] Enable `noImplicitAny: true` in tsconfig
- [ ] Add ESLint rule to disallow `any`
- [ ] Review and fix remaining type issues

---

## 🟡 MEDIANOS (RESOLVER PRÓXIMAS 2 SEMANAS)

### 6-13. Medium Priority Items

| ID | Tarea | Esfuerzo | Impacto |
|----|----- |----------|--------|
| 6 | TODO comments tracking | 2h | Medium |
| 7 | Remove hardcoded values | 3h | Medium |
| 8 | Clean up legacy code | 2h | Low |
| 9 | Add E2E payment tests | 8h | High |
| 10 | Error handling framework | 4h | High |
| 11 | Database documentation | 3h | Medium |
| 12 | API documentation | 3h | Medium |
| 13 | Infinite subscription fix | 2h | Medium |

---

## 📋 PLAN DE EJECUCIÓN

### Semana 1 (Esta Semana)
```
Lunes 28:    Resolver Critical #1 (Token encryption) [3h]
Martes 29:   Resolver High #2 (Console.log removal) [3h]
Miércoles 30: Resolver High #3 (N+1 queries) [2h]
Jueves 31:   Resolver High #4 (Service refactor) [4h]
Viernes 1:   Testing & validation [2h]

Total: 14 horas
Result: Crítica + 3 HIGH resueltos
```

### Semana 2
```
Refactor remaining services
Add proper error handling
Create documentation
Add E2E tests
Total: 20 horas
```

### Semana 3
```
Performance optimization
Database schema documentation
API documentation
Final validation
Total: 10 horas
```

---

## 🎯 PRIORIZACIÓN POR IMPACTO

### MÁXIMO IMPACTO EN MÍNIMO TIEMPO (Hacer primero)

1. **Token Encryption** (3h) → Eliminates critical security risk
2. **Console.log Removal** (3h) → Reduces bundle, stops data leaks
3. **N+1 Query Fix** (2h) → Prevents production outages
4. **Add Logging Service** (2h) → Enables production debugging
5. **Error Handling Framework** (4h) → Prevents silent failures

**Total: 14 horas para resolver 80% de la deuda crítica**

---

## ✅ CHECKLIST COMPLETO

### Pre-Launch (CRÍTICO)
- [ ] Token encryption implemented
- [ ] Console logs removed
- [ ] N+1 queries fixed
- [ ] Error handling added
- [ ] Tests passing

### Post-Launch (Importante)
- [ ] Legacy code cleaned
- [ ] Type safety improved
- [ ] Services refactored
- [ ] Documentation added
- [ ] E2E tests created

---

## 📊 SEGUIMIENTO DE PROGRESO

```bash
# Before
npm run build 2>&1 | grep -c "error"     # Count errors
npm run lint 2>&1 | grep -c "warning"    # Count warnings
find . -name "*.ts" -exec grep -c "console.log" {} +  # Count console statements
```

```bash
# After
npm run build 2>&1 | grep -c "error"     # Should be < 5
npm run lint 2>&1 | grep -c "warning"    # Should be < 20
find . -name "*.ts" -exec grep -c "console.log" {} +  # Should be 0
```

---

## 🔗 REFERENCIAS

**Seguridad**
- OWASP Top 10 Security Risks
- PCI DSS Compliance Guide
- Node.js Crypto Module Docs

**Performance**
- Database Query Optimization
- Bundle Size Analysis Tools
- Web Vitals Optimization

**Code Quality**
- Clean Code by Robert Martin
- Design Patterns in TypeScript
- SOLID Principles

---

## 📞 SOPORTE

Si tienes preguntas sobre implementación:
1. Consultar documentación técnica
2. Revisar ejemplos en codebase
3. Crear issue en GitHub con `[TECHNICAL-DEBT]` prefix
4. Ping el lead técnico

---

**Generado**: 28 Octubre, 2025
**Status**: 🔴 CRÍTICO - Requiere atención inmediata
**Timeline**: 2-4 semanas para resolución completa
**Owner**: Tech Lead / Senior Developer

