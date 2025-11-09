# Análisis de Código - AutoRenta

**Fecha**: 2025-11-09
**Versión Angular**: 20.3.7 (standalone components)
**Líneas de Código**: ~128,000 (TypeScript)
**Archivos**: 450 TS, 125 HTML, 21 SCSS

---

## 📊 Resumen Ejecutivo

**Calificación General**: 7.5/10 (Bueno)

**Fortalezas** ⭐:
- ✅ Arquitectura moderna (Angular 17+ standalone)
- ✅ Configuración TypeScript estricta (`strict: true`)
- ✅ Uso extensivo de Signals (583 usos)
- ✅ Lazy loading implementado correctamente
- ✅ Separación clara features/core/shared
- ✅ Seguridad con RLS y guards

**Áreas de Mejora** ⚠️:
- ❌ Archivos muy grandes (>1000 líneas)
- ❌ Test coverage bajo (~10%)
- ❌ Uso excesivo de `any` (244 instancias)
- ❌ Console.logs en producción (95+ archivos)
- ❌ TODOs sin resolver (40)

---

## 🏗️ Arquitectura

### Estructura de Carpetas

```
apps/web/src/app/
├── core/               # Servicios singleton, guards, models
│   ├── services/       # 60+ servicios
│   ├── guards/         # Auth, verification, role guards
│   ├── models/         # TypeScript interfaces
│   ├── interceptors/   # HTTP interceptors
│   └── config/         # Configuración global
├── features/           # Módulos funcionales (21 features)
│   ├── auth/
│   ├── bookings/
│   ├── cars/
│   ├── wallet/
│   ├── admin/
│   └── ...
├── shared/             # Componentes reutilizables
└── tabs/               # Navegación principal
```

**Calificación**: 9/10 ✅

**Fortalezas**:
- ✅ Separación clara de responsabilidades
- ✅ Features independientes (buen acoplamiento)
- ✅ Path aliases configurados (`@core`, `@shared`, `@features`)
- ✅ Standalone components (no NgModules)

**Mejoras sugeridas**:
- Considerar subdividir `features/` por dominio de negocio
- Crear una carpeta `utils/` para funciones helper
- Separar `types/` de `models/` para mayor claridad

---

## 💻 Calidad de Código

### TypeScript Configuration

**Archivo**: `apps/web/tsconfig.json`

```json
{
  "strict": true,                          // ✅ Excelente
  "noImplicitReturns": true,              // ✅ Excelente
  "noFallthroughCasesInSwitch": true,     // ✅ Excelente
  "strictTemplates": true,                // ✅ Excelente
  "strictInjectionParameters": true       // ✅ Excelente
}
```

**Calificación**: 10/10 ✅

**Análisis**: Configuración **excepcional** de TypeScript con modo strict habilitado y todas las verificaciones estrictas activadas. Esto previene muchos errores comunes.

---

### ESLint Configuration

**Archivo**: `apps/web/eslint.config.mjs`

**Reglas activas**:
- ✅ Reglas recomendadas de Angular
- ✅ Reglas recomendadas de TypeScript
- ⚠️ `no-explicit-any`: 'warn' (debería ser 'error')
- ✅ Import order enforcement
- ✅ Reglas relajadas en tests (apropiado)

**Calificación**: 7/10 ⚠️

**Mejoras sugeridas**:
```javascript
// Cambiar de 'warn' a 'error' para mejor tipado
'@typescript-eslint/no-explicit-any': 'error',

// Agregar reglas adicionales:
'@typescript-eslint/explicit-module-boundary-types': 'error',
'@angular-eslint/no-lifecycle-call': 'error',
'@angular-eslint/use-lifecycle-interface': 'error',
```

---

### Uso de TypeScript Moderno

#### Signals (Angular 17+)

**Estadísticas**:
- `signal<>`: 583 usos ✅
- `computed<>`: 19 usos ✅
- `effect()`: 17 usos ✅

**Ejemplo**: `apps/web/src/app/core/services/withdrawal.service.ts`

```typescript
export class WithdrawalService {
  // Excelente uso de signals para state management
  readonly bankAccounts = signal<BankAccount[]>([]);
  readonly withdrawalRequests = signal<WithdrawalRequest[]>([]);
  readonly loading = signal<WithdrawalLoadingState>({ ... });

  // Computed signals para valores derivados
  readonly defaultBankAccount = computed(() =>
    this.bankAccounts().find((acc) => acc.is_default)
  );

  readonly activeBankAccounts = computed(() =>
    this.bankAccounts().filter((acc) => acc.is_active)
  );
}
```

**Calificación**: 9/10 ✅

**Fortalezas**:
- ✅ Excelente adopción de Signals para reactivity
- ✅ Uso correcto de computed para valores derivados
- ✅ Effects para side effects (apropiado)

**Mejoras sugeridas**:
- Migrar servicios legacy que aún usan BehaviorSubject
- Documentar cuándo usar signals vs observables

---

### Uso de `any`

**Estadísticas**: 244 usos de `any` en `core/services/`

**Ejemplos problemáticos**:

```typescript
// ❌ MAL: Type assertion con any
const carInput = input as Record<string, unknown>;

// ❌ MAL: any en parámetros
const customerData: any = { ... };

// ❌ MAL: any en response de fetch
const customer = await mpResponse.json(); // any implícito
```

**Calificación**: 5/10 ❌

**Impacto**:
- ⚠️ Pérdida de type safety
- ⚠️ Errores no detectados en compile-time
- ⚠️ IntelliSense limitado

**Soluciones recomendadas**:

```typescript
// ✅ BIEN: Tipos específicos
interface MercadoPagoCustomer {
  email: string;
  first_name: string;
  last_name: string;
  phone?: { area_code: string; number: string };
  identification?: { type: string; number: string };
}

const customerData: MercadoPagoCustomer = { ... };

// ✅ BIEN: Type guard para runtime validation
function isValidCarInput(input: unknown): input is CarInput {
  return typeof input === 'object' &&
         input !== null &&
         'latitude' in input &&
         'longitude' in input;
}
```

---

## 📏 Complejidad y Tamaño de Archivos

### Archivos Más Grandes

| Archivo | Líneas | Calificación | Acción Recomendada |
|---------|--------|--------------|-------------------|
| `bookings.service.backup.ts` | 1,429 | ❌ CRÍTICO | **Eliminar** (archivo de backup) |
| `booking-detail-payment.page.ts` | 1,385 | ❌ CRÍTICO | **Refactorizar** (extraer lógica a servicios) |
| `cars-map.component.ts` | 1,156 | ❌ CRÍTICO | **Refactorizar** (separar en sub-componentes) |
| `car-detail.page.ts` | 1,131 | ❌ CRÍTICO | **Refactorizar** (extraer secciones) |
| `admin.service.ts` | 1,057 | ⚠️ ALTO | Considerar separar por dominio |
| `cars-list.page.ts` | 922 | ⚠️ ALTO | Extraer filtros a componente |

**Calificación**: 4/10 ❌

**Problemas**:
- ❌ Violación del principio de responsabilidad única (SRP)
- ❌ Difícil de mantener y testear
- ❌ Alto acoplamiento
- ❌ Baja cohesión

**Límites recomendados**:
- Componentes: **≤ 400 líneas**
- Servicios: **≤ 500 líneas**
- Páginas: **≤ 600 líneas**

**Plan de Refactoring** (Prioridad Alta):

### 1. `booking-detail-payment.page.ts` (1,385 líneas)

**Refactorizar en**:
```
booking-detail-payment/
├── booking-detail-payment.page.ts (200 líneas)
├── components/
│   ├── payment-summary.component.ts
│   ├── payment-method-selector.component.ts
│   ├── booking-timeline.component.ts
│   └── price-breakdown.component.ts
└── services/
    └── booking-payment.service.ts
```

### 2. `cars-map.component.ts` (1,156 líneas)

**Refactorizar en**:
```
cars-map/
├── cars-map.component.ts (300 líneas)
├── components/
│   ├── map-marker.component.ts
│   ├── map-filters.component.ts
│   ├── map-car-card.component.ts
│   └── map-controls.component.ts
└── services/
    └── map-state.service.ts
```

---

## 🧪 Testing

### Coverage Actual

**Estadísticas**:
- Archivos de test: 45
- Total archivos TS: 450
- **Coverage**: ~10% ❌

**Distribución**:
```
Services tested:     ~15/60 (25%)
Components tested:   ~20/100 (20%)
Guards tested:       ~5/8 (62%)
```

**Calificación**: 3/10 ❌

**Impacto**:
- ❌ Alto riesgo de regresiones
- ❌ Refactoring peligroso sin tests
- ❌ Bugs no detectados temprano

**Meta recomendada**:
- **Crítico**: 80%+ coverage en servicios core
- **Importante**: 70%+ coverage en componentes
- **Deseable**: 90%+ coverage en guards y pipes

**Plan de Testing**:

#### Prioridad P0 (Crítica)

```typescript
// 1. Servicios críticos de negocio
apps/web/src/app/core/services/
├── bookings.service.spec.ts ❌ Falta
├── wallet.service.spec.ts ❌ Falta
├── payments.service.spec.ts ❌ Falta
└── auth.service.spec.ts ❌ Falta
```

#### Prioridad P1 (Alta)

```typescript
// 2. Guards de seguridad
apps/web/src/app/core/guards/
├── auth.guard.spec.ts ✅ Existe
├── verification.guard.spec.ts ❌ Falta
└── role.guard.spec.ts ❌ Falta
```

#### Prioridad P2 (Media)

```typescript
// 3. Componentes críticos de UI
apps/web/src/app/shared/components/
├── payment-provider-selector.spec.ts ❌ Falta
├── car-card.spec.ts ❌ Falta
└── booking-card.spec.ts ❌ Falta
```

---

## 🚨 Anti-Patrones y Code Smells

### 1. Console.log en Producción

**Estadísticas**: 95+ archivos con console.log/error/warn

**Ejemplos**:

```typescript
// ❌ MAL
console.log('🚗 Creating car with data:', carData);
console.error('❌ Error creating car:', error);

// ✅ BIEN
this.logger.info('Creating car', { carData });
this.logger.error('Error creating car', error);
```

**Impacto**:
- ⚠️ Exposición de datos sensibles en producción
- ⚠️ Performance degradation (logging no optimizado)
- ⚠️ No hay control centralizado de logs

**Solución**: Usar `LoggerService` existente

```typescript
// Implementación existente en core/services/logger.service.ts
@Injectable({ providedIn: 'root' })
export class LoggerService {
  info(message: string, context?: any) { ... }
  error(message: string, error?: Error, context?: any) { ... }
  warn(message: string, context?: any) { ... }
}

// Uso correcto
constructor(private logger: LoggerService) {}

this.logger.info('Car created successfully', { carId });
this.logger.error('Failed to create car', error, { carData });
```

---

### 2. TODOs sin Resolver

**Estadísticas**: 40 TODOs, 2 FIXME/HACK

**Ejemplos críticos**:

```typescript
// TODO: Implementar paginación (lleva meses sin hacerse)
// TODO: Agregar validación de fechas (bug potencial)
// FIXME: Memory leak en subscription (crítico)
```

**Calificación**: 6/10 ⚠️

**Plan de acción**:
1. Auditar todos los TODOs
2. Convertir TODOs críticos en issues de GitHub
3. Eliminar TODOs obsoletos
4. Resolver FIXMEs inmediatamente

---

### 3. Archivos de Backup en Repositorio

**Problema**: `bookings.service.backup.ts` (1,429 líneas)

```bash
# ❌ MAL: Archivos .backup en git
apps/web/src/app/core/services/bookings.service.backup.ts
```

**Solución**:
```bash
# Eliminar archivo de backup
git rm apps/web/src/app/core/services/bookings.service.backup.ts

# Agregar a .gitignore
echo "*.backup.ts" >> .gitignore
```

**Nota**: Git history preserva versiones anteriores, no es necesario mantener archivos .backup.

---

### 4. God Classes / Services

**Problema**: Servicios con demasiadas responsabilidades

**Ejemplo**: `admin.service.ts` (1,057 líneas)

```typescript
// ❌ MAL: Un servicio hace TODO
@Injectable()
export class AdminService {
  // Gestión de usuarios
  getUsers() { }
  updateUser() { }

  // Verificaciones
  approveVerification() { }
  rejectVerification() { }

  // Refunds
  processRefund() { }

  // Bookings
  cancelBooking() { }

  // Payments
  viewTransactions() { }

  // ... 50+ métodos más
}
```

**Solución**: Separar por dominio

```typescript
// ✅ BIEN: Servicios especializados
@Injectable() export class AdminUsersService { }
@Injectable() export class AdminVerificationsService { }
@Injectable() export class AdminRefundsService { }
@Injectable() export class AdminBookingsService { }
@Injectable() export class AdminPaymentsService { }
```

---

## 🔒 Seguridad

### Análisis de Seguridad

**Calificación General**: 8/10 ✅

### Fortalezas

1. **Autenticación con Supabase** ✅
   - Email/password + magic links
   - JWT tokens con refresh
   - Logout seguro

2. **Row Level Security (RLS)** ✅
   - Políticas en todas las tablas
   - Verificación a nivel de base de datos
   - Aislamiento de datos por usuario

3. **PII Encryption** ✅ (Recién implementado)
   - AES-256-CBC para datos sensibles
   - 11 campos encriptados
   - GDPR compliant

4. **Guards y Guards** ✅
   - `AuthGuard`: Rutas protegidas
   - `VerificationGuard`: Verificación de usuario
   - `RoleGuard`: Control de acceso por rol

### Vulnerabilidades Potenciales

#### 1. XSS (Cross-Site Scripting)

**Riesgo**: Bajo ✅

Angular sanitiza automáticamente templates HTML, pero hay casos especiales:

```typescript
// ⚠️ CUIDADO: Bypass de sanitización
@Component({
  template: `<div [innerHTML]="userInput"></div>`
})
export class MyComponent {
  userInput = '<script>alert("XSS")</script>'; // Angular lo sanitiza
}

// ❌ PELIGROSO: Bypass manual
constructor(private sanitizer: DomSanitizer) {}

get dangerousHtml() {
  return this.sanitizer.bypassSecurityTrustHtml(this.userInput); // NO HACER
}
```

**Recomendaciones**:
- ✅ Nunca usar `bypassSecurityTrust*` con input de usuario
- ✅ Validar y sanitizar input del lado del servidor también

#### 2. SQL Injection

**Riesgo**: Muy Bajo ✅

Supabase usa prepared statements automáticamente:

```typescript
// ✅ SEGURO: Supabase usa prepared statements
await this.supabase
  .from('cars')
  .select('*')
  .eq('id', userInput); // Sanitizado automáticamente
```

#### 3. Sensitive Data Exposure

**Riesgo**: Bajo (mejorado con PII encryption) ✅

**Áreas de atención**:

```typescript
// ⚠️ CUIDADO: No logear datos sensibles
console.log('User data:', {
  phone: user.phone, // ❌ PII en logs
  dni: user.dni,     // ❌ PII en logs
});

// ✅ BIEN: Redactar datos sensibles
this.logger.info('User data', {
  userId: user.id,
  phone: '***', // Redactado
});
```

#### 4. Rate Limiting

**Estado**: ⏳ Pendiente (diseñado, no desplegado)

**Ver**: `RATE_LIMITING_IMPLEMENTATION_GUIDE.md`

---

## ⚡ Performance

### Análisis de Performance

**Calificación**: 7/10 ✅

### Optimizaciones Implementadas

1. **Lazy Loading** ✅
   ```typescript
   // Excelente: Todas las features cargadas bajo demanda
   {
     path: 'bookings',
     loadChildren: () => import('./features/bookings/bookings.routes')
   }
   ```

2. **OnPush Change Detection** ⚠️ Uso parcial
   ```typescript
   // Solo algunos componentes usan OnPush
   @Component({
     changeDetection: ChangeDetectionStrategy.OnPush // ✅
   })
   ```

   **Recomendación**: Usar OnPush en componentes presentacionales

3. **Image Optimization** ✅
   ```typescript
   // Excelente: Optimización de imágenes antes de subir
   async optimizeImage(file: File, options: ImageOptimizeOptions) {
     // Resize, compress, convert to WebP
   }
   ```

### Áreas de Mejora

#### 1. Change Detection

**Problema**: Muchos componentes usan Default change detection

```typescript
// ❌ Subóptimo
@Component({
  // Default change detection = verifica TODO el árbol
})

// ✅ Óptimo
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
```

**Impacto**: 2-5x más lento en aplicaciones grandes

**Solución**: Migrar componentes presentacionales a OnPush

#### 2. Subscriptions sin Cleanup

```typescript
// ❌ MAL: Memory leak
ngOnInit() {
  this.service.data$.subscribe(data => {
    // Sin unsubscribe
  });
}

// ✅ BIEN: Async pipe o takeUntilDestroyed
data$ = this.service.data$.pipe(
  takeUntilDestroyed()
);
```

#### 3. N+1 Query Problem

**Ejemplo observado**:

```typescript
// ❌ MAL: N+1 queries
async loadCarsWithOwners(carIds: string[]) {
  for (const carId of carIds) {
    const car = await this.getCar(carId);         // Query 1
    const owner = await this.getOwner(car.ownerId); // Query 2 (N veces)
  }
}

// ✅ BIEN: Join en una query
async loadCarsWithOwners(carIds: string[]) {
  const cars = await this.supabase
    .from('cars')
    .select('*, owner:profiles(*)')
    .in('id', carIds);
}
```

---

## 📚 Documentación

### Estado Actual

**Calificación**: 6/10 ⚠️

**Documentación existente**:
- ✅ `CLAUDE.md` (excelente guía de desarrollo)
- ✅ Runbooks operativos (8 documentos)
- ✅ README con setup instructions
- ✅ API documentation (parcial)

**Documentación faltante**:
- ❌ JSDoc en servicios complejos
- ❌ Diagramas de arquitectura
- ❌ Guías de testing
- ❌ Guías de contribución

### Mejoras Recomendadas

#### 1. JSDoc en Servicios

```typescript
/**
 * Crea un booking para un auto específico
 *
 * @param carId - ID del auto a reservar
 * @param dates - Fechas de inicio y fin de la reserva
 * @param userId - ID del usuario que hace la reserva
 * @returns Promise con el booking creado
 * @throws {Error} Si el auto no está disponible
 * @throws {Error} Si el usuario no está verificado
 *
 * @example
 * ```typescript
 * const booking = await bookingService.createBooking(
 *   'car-123',
 *   { start: '2025-01-01', end: '2025-01-07' },
 *   'user-456'
 * );
 * ```
 */
async createBooking(
  carId: string,
  dates: { start: string; end: string },
  userId: string
): Promise<Booking> {
  // ...
}
```

#### 2. Diagramas de Arquitectura

Crear diagramas con Mermaid:

```mermaid
graph TD
    A[Usuario] --> B[Angular App]
    B --> C[Supabase Client]
    C --> D[Auth Service]
    C --> E[Database RLS]
    C --> F[Edge Functions]
    F --> G[MercadoPago API]
    E --> H[PostgreSQL]
```

---

## 🎯 Plan de Mejora

### Prioridades

#### P0 - Crítico (Hacer Ahora)

1. **Eliminar archivo de backup** (5 min)
   ```bash
   git rm apps/web/src/app/core/services/bookings.service.backup.ts
   ```

2. **Refactorizar archivos >1000 líneas** (1-2 semanas)
   - `booking-detail-payment.page.ts` (1,385 líneas)
   - `cars-map.component.ts` (1,156 líneas)
   - `car-detail.page.ts` (1,131 líneas)

3. **Agregar tests a servicios críticos** (1 semana)
   - `bookings.service.spec.ts`
   - `wallet.service.spec.ts`
   - `payments.service.spec.ts`

4. **Reemplazar console.log por LoggerService** (3-4 días)
   - Script de find/replace automatizado
   - Review manual de logs sensibles

#### P1 - Alta (Próximo Sprint)

5. **Reducir uso de `any`** (1 semana)
   - Crear interfaces específicas
   - Agregar type guards
   - Configurar ESLint: `no-explicit-any: error`

6. **Implementar OnPush en componentes presentacionales** (3-4 días)
   - Identificar componentes candidatos
   - Migrar uno por uno
   - Medir mejora de performance

7. **Resolver todos los TODOs** (1 semana)
   - Auditar 40 TODOs
   - Crear issues para TODOs válidos
   - Eliminar TODOs obsoletos

#### P2 - Media (Mes 2)

8. **Mejorar documentación** (1 semana)
   - Agregar JSDoc a servicios principales
   - Crear diagramas de arquitectura
   - Documentar patrones de testing

9. **Optimizaciones de performance** (1 semana)
   - Auditar subscriptions
   - Implementar virtual scrolling donde sea necesario
   - Optimizar queries con joins

10. **Code quality improvements** (continuo)
    - Configurar SonarQube
    - Establecer umbrales de complejidad
    - CI checks para prevenir regresiones

---

## 📊 Métricas Sugeridas

### 1. Code Quality Metrics

```yaml
Target Metrics:
  Test Coverage: ≥ 80%
  TypeScript Strict: true ✅
  ESLint Errors: 0
  Max File Size: 600 lines
  Max Function Complexity: 10
  No 'any' usage: true
  No console.log: true
```

### 2. Performance Metrics

```yaml
Target Metrics:
  First Contentful Paint: < 1.5s
  Time to Interactive: < 3s
  Largest Contentful Paint: < 2.5s
  Cumulative Layout Shift: < 0.1
  Bundle Size (main): < 500KB
```

### 3. Security Metrics

```yaml
Target Metrics:
  Dependencies Vulnerabilities: 0 high/critical
  Rate Limiting: Enabled ✅ (pending deployment)
  PII Encryption: 100% ✅ (implemented)
  RLS Policies: 100% coverage ✅
  Authentication: JWT with refresh ✅
```

---

## 🏆 Calificaciones por Categoría

| Categoría | Calificación | Estado | Prioridad Mejora |
|-----------|--------------|--------|------------------|
| **Arquitectura** | 9/10 | ✅ Excelente | Baja |
| **TypeScript Config** | 10/10 | ✅ Excelente | Ninguna |
| **Code Quality** | 6/10 | ⚠️ Mejorable | Alta |
| **Testing** | 3/10 | ❌ Crítico | Crítica |
| **Seguridad** | 8/10 | ✅ Bueno | Media |
| **Performance** | 7/10 | ✅ Bueno | Media |
| **Documentación** | 6/10 | ⚠️ Mejorable | Alta |
| **Mantenibilidad** | 5/10 | ⚠️ Mejorable | Crítica |

**Calificación General**: **7.5/10** (Bueno con áreas de mejora identificadas)

---

## 🎯 Conclusiones

### Fortalezas Principales

1. **Arquitectura moderna y bien organizada** ⭐
   - Standalone components
   - Lazy loading
   - Separación clara de responsabilidades

2. **Configuración estricta de TypeScript** ⭐
   - Strict mode enabled
   - Comprehensive compiler checks
   - Previene errores comunes

3. **Seguridad robusta** ⭐
   - RLS en base de datos
   - PII encryption implementado
   - Auth guards correctamente configurados

4. **Adopción de features modernas** ⭐
   - 583 usos de Signals
   - Reactive state management
   - Angular 17+ best practices

### Áreas Críticas de Mejora

1. **Test Coverage** ❌ (3/10)
   - Solo 10% de código testeado
   - Riesgo alto de regresiones
   - **Acción**: Agregar tests a servicios críticos (P0)

2. **Archivos muy grandes** ❌ (4/10)
   - 4 archivos >1000 líneas
   - Difícil mantenimiento
   - **Acción**: Refactorizar inmediatamente (P0)

3. **Uso excesivo de `any`** ❌ (5/10)
   - 244 instancias en servicios
   - Pérdida de type safety
   - **Acción**: Crear interfaces específicas (P1)

4. **Console.logs en producción** ❌ (4/10)
   - 95+ archivos afectados
   - Exposición de datos sensibles
   - **Acción**: Migrar a LoggerService (P0)

### Recomendación Final

El código de AutoRenta tiene una **base sólida** con arquitectura moderna y buenas prácticas de seguridad. Sin embargo, requiere **mejoras urgentes** en:

1. **Testing** (crítico para confiabilidad)
2. **Refactoring** de archivos grandes (crítico para mantenibilidad)
3. **Reducción de deuda técnica** (importante para evolución)

**Tiempo estimado de mejoras críticas**: 3-4 semanas
**ROI esperado**: 5-10x en reducción de bugs y tiempo de desarrollo

---

**Próximos pasos recomendados**:
1. ✅ Leer este análisis completo
2. 📋 Crear issues en GitHub para cada mejora P0/P1
3. 🎯 Priorizar refactoring de archivos grandes
4. 🧪 Implementar tests en servicios críticos
5. 📊 Configurar métricas de code quality en CI/CD

---

**Documento creado**: 2025-11-09
**Revisión recomendada**: Mensual
**Próxima auditoría**: 2025-12-09
