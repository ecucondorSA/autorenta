# 🔧 DEUDA TÉCNICA - PLAN DE EJECUCIÓN DETALLADO

**Objetivo**: Resolver TODAS las 20 items de deuda técnica
**Estimado Total**: 72 horas
**Timeline Posible**: 2-3 días intensivos (24-30 horas/día)
**Status**: 🔴 IN PROGRESS - Starting NOW

---

## 📊 PLAN MAESTRO

### PHASE 1: CRITICAL (12 horas) 🔴

**1.1 TOKEN ENCRYPTION** (2-3h)
- [ ] Crear migration en Supabase
- [ ] Implementar encrypt/decrypt functions
- [ ] Encriptar tokens existentes
- [ ] Proteger RLS policies

**1.2 REMOVE CONSOLE.LOGS** (2-3h)
- [ ] Encontrar todos los console.log (847)
- [ ] Reemplazar con Sentry/LogRocket
- [ ] Configurar logging en producción
- [ ] Verificar no hay data sensible

**1.3 FIX N+1 QUERIES** (1h)
- [ ] Identificar wallet-reconciliation
- [ ] Convertir a batch query
- [ ] Benchmark performance improvement

**1.4 TYPE SAFETY FIXES** (2h)
- [ ] Remover unsafe casts (`as`)
- [ ] Agregar type guards
- [ ] Validar en runtime

**1.5 ERROR HANDLING** (1-2h)
- [ ] Add try-catch blocks
- [ ] Proper error messages
- [ ] User-friendly responses

---

### PHASE 2: HIGH PRIORITY (16 horas) 🟠

**2.1 SERVICE LAYER REFACTORING** (4h)
- [ ] Separate SplitPaymentService concerns
- [ ] Separate PayoutService concerns
- [ ] Create dedicated services for:
  - WalletService
  - NotificationService
  - AuditService

**2.2 CODE QUALITY** (4h)
- [ ] Remove code duplication
- [ ] Extract common patterns
- [ ] Implement factory patterns
- [ ] Add missing interfaces

**2.3 SECURITY IMPROVEMENTS** (4h)
- [ ] Add input validation
- [ ] Sanitize user inputs
- [ ] Add rate limiting
- [ ] Implement CSRF protection

**2.4 PERFORMANCE OPTIMIZATION** (4h)
- [ ] Add caching layers
- [ ] Optimize database queries
- [ ] Implement pagination
- [ ] Add lazy loading

---

### PHASE 3: MEDIUM PRIORITY (28 horas) 🟡

**3.1 TEST COVERAGE** (8h)
- [ ] Unit tests for split payment
- [ ] Unit tests for payout
- [ ] Unit tests for wallet
- [ ] Unit tests for validation

**3.2 INTEGRATION TESTS** (6h)
- [ ] E2E payment flow
- [ ] E2E payout flow
- [ ] E2E wallet operations
- [ ] E2E error scenarios

**3.3 CODE ORGANIZATION** (8h)
- [ ] Reorganize file structure
- [ ] Create barrel exports
- [ ] Add missing documentation
- [ ] Create component libraries

**3.4 MONITORING & LOGGING** (6h)
- [ ] Setup Sentry integration
- [ ] Add structured logging
- [ ] Create dashboard
- [ ] Setup alerts

---

### PHASE 4: LOW PRIORITY (16 horas) 🟢

**4.1 OPTIMIZATION** (6h)
- [ ] Bundle size optimization
- [ ] Image compression
- [ ] CSS minification
- [ ] JS minification

**4.2 STYLING** (4h)
- [ ] Consistent code style
- [ ] Fix linting issues
- [ ] Update prettier config
- [ ] Format all files

**4.3 DOCUMENTATION** (4h)
- [ ] API documentation
- [ ] Component documentation
- [ ] Setup guide update
- [ ] Troubleshooting guide

**4.4 CLEANUP** (2h)
- [ ] Remove unused code
- [ ] Remove unused imports
- [ ] Remove unused styles
- [ ] Update dependencies

---

## 🎯 EJECUCIÓN FASE POR FASE

### PHASE 1: CRITICAL (START NOW) 🔴

#### 1.1 TOKEN ENCRYPTION (2-3 horas)

**Paso 1: Crear migration**
```sql
-- Create encrypted_token column
ALTER TABLE user_profiles
ADD COLUMN mercadopago_token_encrypted TEXT,
ADD COLUMN token_encryption_version INT DEFAULT 1,
ADD COLUMN token_encrypted_at TIMESTAMP;

-- Create index for performance
CREATE INDEX idx_profiles_encrypted_tokens
ON user_profiles(id)
WHERE mercadopago_token_encrypted IS NOT NULL;
```

**Paso 2: Implementar encryption functions**
```typescript
// apps/web/src/app/core/services/encryption.service.ts
import crypto from 'crypto';

@Injectable({ providedIn: 'root' })
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly saltLength = 16;

  constructor(private config: ConfigService) {}

  encrypt(plaintext: string): string {
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const salt = crypto.randomBytes(this.saltLength);

    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();
    return `${salt.toString('hex')}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  decrypt(encrypted: string): string {
    const key = this.getEncryptionKey();
    const [salt, iv, authTag, ciphertext] = encrypted.split(':');

    const decipher = crypto.createDecipheriv(
      this.algorithm,
      key,
      Buffer.from(iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  private getEncryptionKey(): Buffer {
    const keyEnv = process.env['ENCRYPTION_KEY'];
    if (!keyEnv) throw new Error('ENCRYPTION_KEY not set');
    return Buffer.from(keyEnv, 'hex').slice(0, this.keyLength);
  }
}
```

**Paso 3: Migrar tokens existentes**
```typescript
// Script to run once
async migrateTokens() {
  const { data: users } = await this.supabase
    .from('user_profiles')
    .select('id, mercadopago_token')
    .not('mercadopago_token', 'is', null);

  for (const user of users) {
    const encrypted = this.encrypt(user.mercadopago_token);
    await this.supabase
      .from('user_profiles')
      .update({
        mercadopago_token_encrypted: encrypted,
        token_encrypted_at: new Date().toISOString()
      })
      .eq('id', user.id);
  }
}
```

**Paso 4: Actualizar RLS policies**
```sql
-- Protect encrypted tokens
CREATE POLICY "Users can only view own encrypted tokens"
ON user_profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can only update own encrypted tokens"
ON user_profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
```

---

#### 1.2 REMOVE CONSOLE.LOGS (2-3 horas)

**Paso 1: Encontrar todos los console.logs**
```bash
grep -r "console\.log\|console\.error\|console\.warn" \
  apps/web/src \
  --include="*.ts" \
  --include="*.js" \
  -n > console_logs.txt

wc -l console_logs.txt  # See count (should be ~847)
```

**Paso 2: Crear logger service**
```typescript
// apps/web/src/app/core/services/logger.service.ts
import * as Sentry from "@sentry/angular";

@Injectable({ providedIn: 'root' })
export class LoggerService {
  constructor(private config: ConfigService) {
    if (this.config.isProduction()) {
      Sentry.init({ dsn: this.config.sentryDsn });
    }
  }

  debug(message: string, data?: any): void {
    if (!this.config.isProduction()) {
      console.log(`[DEBUG] ${message}`, data);
    }
  }

  info(message: string, data?: any): void {
    if (this.config.isProduction()) {
      Sentry.captureMessage(message, 'info');
    } else {
      console.log(`[INFO] ${message}`, data);
    }
  }

  warn(message: string, error?: Error): void {
    if (this.config.isProduction()) {
      Sentry.captureException(new Error(message), { extra: { error } });
    } else {
      console.warn(`[WARN] ${message}`, error);
    }
  }

  error(message: string, error: Error): void {
    Sentry.captureException(error, { extra: { message } });
    if (!this.config.isProduction()) {
      console.error(`[ERROR] ${message}`, error);
    }
  }
}
```

**Paso 3: Script para reemplazar console.logs**
```bash
# Remove all console.logs from production code
find apps/web/src -name "*.ts" -type f | while read file; do
  # Remove console.log statements
  sed -i '/^[[:space:]]*console\.log/d' "$file"
  sed -i '/^[[:space:]]*console\.error/d' "$file"
  sed -i '/^[[:space:]]*console\.warn/d' "$file"
done

# Verify removal
grep -r "console\.log" apps/web/src && echo "Still found console.log" || echo "All removed"
```

**Paso 4: Agregar logger a servicios**
```typescript
// Example: Update split-payment.service.ts
constructor(
  private supabase: SupabaseClientService,
  private logger: LoggerService  // Add this
) {}

processSplitPayment(request: SplitPaymentRequest): Observable<SplitPaymentResponse> {
  this.logger.info('Processing split payment', { request });
  return from(this.validateAndProcessPayment(request));
}
```

---

#### 1.3 FIX N+1 QUERIES (1 hora)

**Identificar el problema**
```typescript
// ❌ BEFORE: N+1 Query
async getUserWalletsWithHistory() {
  const { data: users } = await this.supabase
    .from('profiles')
    .select('*');

  const results = [];
  for (const user of users) {
    const { data: wallet } = await this.supabase  // ← N queries!
      .from('user_wallets')
      .select('*')
      .eq('user_id', user.id);
    results.push({ user, wallet });
  }
  return results;
}
```

**Solución con JOIN**
```typescript
// ✅ AFTER: Single query with JOIN
async getUserWalletsWithHistory() {
  const { data: results } = await this.supabase
    .from('profiles')
    .select(`
      id,
      email,
      role,
      user_wallets (
        id,
        available_balance,
        locked_balance,
        currency
      )
    `);

  return results;
}
```

**Verificar performance**
```typescript
async benchmarkWalletQuery() {
  const start = performance.now();
  const results = await this.getUserWalletsWithHistory();
  const end = performance.now();

  this.logger.info('Query performance', {
    duration: `${end - start}ms`,
    recordCount: results.length
  });
}
```

---

#### 1.4 TYPE SAFETY FIXES (2 horas)

**Identificar unsafe casts**
```bash
grep -r " as " apps/web/src --include="*.ts" | grep -v "as const" | head -20
```

**Ejemplo: Reemplazar casts con type guards**
```typescript
// ❌ BEFORE: Unsafe cast
const user = data as User;

// ✅ AFTER: Type guard
function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'email' in obj &&
    'role' in obj
  );
}

const user = isUser(data) ? data : null;
if (!user) throw new Error('Invalid user data');
```

**Crear utility para validación**
```typescript
// apps/web/src/app/core/utils/type-guards.ts
export function isPayment(obj: unknown): obj is Payment {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'amount' in obj &&
    'status' in obj &&
    ['pending', 'completed', 'failed'].includes((obj as any).status)
  );
}

export function isSplit(obj: unknown): obj is PaymentSplit {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'collectorId' in obj &&
    'amount' in obj
  );
}
```

---

#### 1.5 ERROR HANDLING (1-2 horas)

**Crear error handling utility**
```typescript
// apps/web/src/app/core/utils/error-handler.ts
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public userMessage: string = 'Algo salió mal. Por favor intenta de nuevo.'
  ) {
    super(message);
  }
}

export function handleError(error: any): AppError {
  if (error instanceof AppError) return error;

  if (error.status === 401) {
    return new AppError('UNAUTHORIZED', error.message, 401, 'Tu sesión expiró');
  }

  if (error.status === 403) {
    return new AppError('FORBIDDEN', error.message, 403, 'No tienes permisos');
  }

  if (error.status === 404) {
    return new AppError('NOT_FOUND', error.message, 404, 'No encontrado');
  }

  return new AppError('INTERNAL_ERROR', error.message, 500);
}
```

**Aplicar a servicios**
```typescript
async processSplitPayment(request: SplitPaymentRequest): Promise<SplitPaymentResponse> {
  try {
    if (!request.collectors || request.collectors.length === 0) {
      throw new AppError('INVALID_REQUEST', 'No collectors specified', 400);
    }

    // ... process
  } catch (error) {
    const appError = handleError(error);
    this.logger.error('Split payment failed', appError);
    throw appError;
  }
}
```

---

## 📝 EXECUTION CHECKLIST

### PHASE 1: CRITICAL (12h) 🔴
- [ ] Token encryption (2-3h)
- [ ] Remove console.logs (2-3h)
- [ ] Fix N+1 queries (1h)
- [ ] Type safety (2h)
- [ ] Error handling (1-2h)

**Subtotal: 12h**
**Timeline: 1 day**

---

### PHASE 2: HIGH (16h) 🟠
- [ ] Service refactoring (4h)
- [ ] Code quality (4h)
- [ ] Security improvements (4h)
- [ ] Performance optimization (4h)

**Subtotal: 16h**
**Timeline: 1-2 days**

---

### PHASE 3: MEDIUM (28h) 🟡
- [ ] Test coverage (8h)
- [ ] Integration tests (6h)
- [ ] Code organization (8h)
- [ ] Monitoring setup (6h)

**Subtotal: 28h**
**Timeline: 2-3 days**

---

### PHASE 4: LOW (16h) 🟢
- [ ] Optimization (6h)
- [ ] Styling (4h)
- [ ] Documentation (4h)
- [ ] Cleanup (2h)

**Subtotal: 16h**
**Timeline: 1-2 days**

---

## 🚀 TOTAL TIMELINE

```
PHASE 1 (Critical):    1 day (12h)
PHASE 2 (High):        1-2 days (16h)
PHASE 3 (Medium):      2-3 days (28h)
PHASE 4 (Low):         1-2 days (16h)
──────────────────────────────────
TOTAL:                 5-8 days (72h)

IF INTENSIVE (24h/day):  3 days
IF NORMAL (8h/day):      9 days
```

---

## ✅ SUCCESS CRITERIA

```
✅ All 20 technical debt items addressed
✅ 0 console.log in production code
✅ Token encryption implemented
✅ N+1 queries fixed
✅ Type safety 100%
✅ Error handling comprehensive
✅ Test coverage 80%+
✅ Performance benchmarks passed
✅ Code quality score 90%+
```

---

Generated: 29 Octubre 2025
Status: 🔴 READY TO START - PHASE 1 NOW
