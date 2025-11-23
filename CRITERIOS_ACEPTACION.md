# ✅ CRITERIOS DE ACEPTACIÓN
## Autorentar - Remediación de 199 Bugs

**Versión**: 1.0
**Fecha**: Noviembre 23, 2025

---

## 📋 TABLA DE CONTENIDOS
1. [Criterios Generales](#criterios-generales)
2. [Criterios por Categoría de Bug](#criterios-por-categoría)
3. [Criterios de Calidad de Código](#calidad-código)
4. [Criterios de Testing](#criterios-testing)
5. [Criterios de Seguridad](#criterios-seguridad)
6. [Criterios de Performance](#criterios-performance)
7. [Criterios de UX/Accessibility](#criterios-ux)
8. [Proceso de Aprobación](#proceso-aprobación)

---

## 1. CRITERIOS GENERALES

### Para TODOS los bugs, sin excepción:

#### ✅ Código
- [ ] Implementación sigue arquitectura establecida
- [ ] No introduce nuevos code smells
- [ ] Respeta convenciones de naming del proyecto
- [ ] Sin hardcoded values (usar constants/config)
- [ ] Sin console.log en código final
- [ ] TypeScript strict mode compliant
- [ ] Sin warnings de linter
- [ ] Sin dead code introducido

#### ✅ Testing
- [ ] Unit tests escritos (mínimo 80% coverage del cambio)
- [ ] Integration tests si aplica
- [ ] E2E test para flujos críticos
- [ ] Tests pasan en CI/CD
- [ ] No tests comentados o skipped sin justificación
- [ ] Casos edge documentados y testeados

#### ✅ Documentación
- [ ] README actualizado si cambió setup
- [ ] JSDoc/TSDoc en funciones públicas
- [ ] CHANGELOG.md actualizado
- [ ] Migration guide si breaking change
- [ ] Swagger/OpenAPI actualizado si cambió API

#### ✅ Code Review
- [ ] Aprobado por mínimo 2 reviewers
- [ ] Todos los comentarios resueltos
- [ ] No "approve con reservas"
- [ ] Security review si tocó auth/payments
- [ ] Performance review si tocó queries/rendering

#### ✅ Deployment
- [ ] Deployed a staging exitosamente
- [ ] Smoke tests pasados
- [ ] No regresiones detectadas
- [ ] Rollback plan documentado
- [ ] Monitoring configurado
- [ ] Alerts configuradas si crítico

---

## 2. CRITERIOS POR CATEGORÍA DE BUG

### 🔐 SECURITY BUGS (P0-001, P0-004, P0-005, etc.)

#### Webhooks & APIs
- [ ] Signature validation implementada
- [ ] Timing-safe comparison usado
- [ ] Replay attack protection (timestamp + nonce)
- [ ] Webhook logs guardados para auditoría
- [ ] Rate limiting configurado
- [ ] Alert en intentos sospechosos
- [ ] Tested con requests maliciosos

**Ejemplo (P0-001 Webhook Validation)**:
```typescript
// ✅ ACEPTADO
const isValid = crypto.timingSafeEqual(
  Buffer.from(signature, 'hex'),
  Buffer.from(expectedSignature, 'hex')
);

if (!isValid) {
  await this.alertSecurityTeam('INVALID_WEBHOOK');
  throw new SecurityException();
}

// ❌ RECHAZADO
if (signature === expectedSignature) { // ❌ Timing attack vulnerable
  // ...
}
```

#### XSS Protection
- [ ] DOMPurify usado en TODO el UGC
- [ ] Server-side sanitization también
- [ ] CSP headers configurados
- [ ] Tested con payloads XSS comunes
- [ ] Angular sanitizer como 2da capa
- [ ] Ningún `[innerHTML]` sin sanitización

**Ejemplo (P0-005 XSS)**:
```typescript
// ✅ ACEPTADO
get safeDescription(): SafeHtml {
  const clean = DOMPurify.sanitize(this.car.description, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong'],
    ALLOWED_ATTR: []
  });
  return this.sanitizer.sanitize(SecurityContext.HTML, clean);
}

// ❌ RECHAZADO
<div [innerHTML]="car.description"></div>  // ❌ Sin sanitización
```

#### Authentication & Authorization
- [ ] Server-side validation siempre
- [ ] Client-side validation solo para UX
- [ ] Session management seguro
- [ ] Tokens con expiración razonable
- [ ] Logout limpia TODO (storage, cookies)
- [ ] Tested bypasses comunes

### 💳 PAYMENT BUGS (P0-002, P0-003, P0-012, etc.)

#### Validación de Pagos
- [ ] Server-side validation con Zod/Yup
- [ ] Algoritmo de Luhn para tarjetas
- [ ] BIN validation si aplica
- [ ] Fraud detection score calculado
- [ ] Rate limiting en endpoints
- [ ] PCI-DSS requirements cumplidos
- [ ] Audit log para TODAS las operaciones

**Ejemplo (P0-004 Payment Validation)**:
```typescript
// ✅ ACEPTADO
const PaymentSchema = z.object({
  cardNumber: z.string()
    .refine(val => validator.isCreditCard(val))
    .refine(val => this.luhnCheck(val)),
  amount: z.number().positive().max(50000),
  // ...
});

const validated = PaymentSchema.parse(data); // ✅ Lanza si inválido

// ❌ RECHAZADO
if (this.paymentForm.valid) { // ❌ Solo client-side
  this.submitPayment();
}
```

#### Wallet & Refunds
- [ ] Retry logic con exponential backoff
- [ ] Failed operations alertan equipo
- [ ] User notificado de problemas
- [ ] Background job para retry persistente
- [ ] Idempotency keys usadas
- [ ] Transacciones atómicas (BEGIN/COMMIT)
- [ ] Balance nunca negativo (DB constraint)

**Ejemplo (P0-002 Wallet Unlock)**:
```typescript
// ✅ ACEPTADO
for (let attempt = 0; attempt < maxRetries; attempt++) {
  try {
    await this.unlockFunds();
    return; // ✅ Éxito
  } catch (error) {
    if (attempt < maxRetries - 1) {
      await this.delay(Math.pow(2, attempt) * 1000);
    } else {
      await this.handleFailure(error); // ✅ Alert + ticket
    }
  }
}

// ❌ RECHAZADO
try {
  await this.unlockFunds();
} catch {
  // ❌ Silent failure
}
```

#### Insurance & Legal
- [ ] Insurance activación BLOQUEA si falla
- [ ] Auto-cancel booking sin insurance
- [ ] Auto-refund procesado
- [ ] Compliance team alertado
- [ ] Legal review aprobado
- [ ] Audit trail completo

**Ejemplo (P0-003 Insurance)**:
```typescript
// ✅ ACEPTADO
if (!insuranceActivated) {
  await this.cancelBooking(bookingId);
  await this.refundUser(bookingId);
  await this.alertCompliance();
  throw new InsuranceException();
}

// ❌ RECHAZADO
try {
  await this.activateInsurance();
} catch {
  this.logger.error('Insurance failed'); // ❌ Booking continúa
}
// Booking se confirma SIN seguro ❌ ILEGAL
```

### 🧠 MEMORY LEAKS (P0-006)

#### Cleanup Requerido
- [ ] `takeUntilDestroyed` en TODOS los observables
- [ ] `ngOnDestroy` implementado
- [ ] Supabase channels removed en destroy
- [ ] Intervals/timeouts cleared
- [ ] Event listeners removed
- [ ] Chrome DevTools heap snapshot verificado
- [ ] 30min runtime test sin leaks

**Ejemplo**:
```typescript
// ✅ ACEPTADO
export class MyComponent implements OnDestroy {
  private destroyRef = inject(DestroyRef);

  ngOnInit() {
    this.service.getData()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }
}

// ❌ RECHAZADO
ngOnInit() {
  this.service.getData().subscribe(); // ❌ No cleanup
}
```

### 🏗️ ARCHITECTURE BUGS (P0-007 Duplicate Code)

#### Code Deduplication
- [ ] Shared component/service creado
- [ ] Configuración via @Input() o config
- [ ] Todas las páginas migradas
- [ ] Tests actualizados
- [ ] E2E tests pasan
- [ ] Bundle size reducido >50%
- [ ] Zero regression bugs

**Ejemplo (P0-007 Marketplace)**:
```typescript
// ✅ ACEPTADO - Shared component
@Component({
  selector: 'app-marketplace-view',
  // ...
})
export class MarketplaceViewComponent {
  @Input() config!: MarketplaceConfig;
}

// 3 páginas ahora usan el mismo componente
export class MarketplaceV2Page {
  config = { title: 'Alquila tu auto', filter: 'all' };
}

// ❌ RECHAZADO - Código duplicado
// 3 archivos con ~400 líneas cada uno haciendo lo mismo
```

---

## 3. CRITERIOS DE CALIDAD DE CÓDIGO

### Complejidad
- [ ] Cyclomatic complexity ≤ 10
- [ ] Cognitive complexity ≤ 15
- [ ] Funciones ≤ 100 líneas
- [ ] Archivos ≤ 500 líneas
- [ ] Nesting depth ≤ 4 niveles

### Type Safety
- [ ] No `any` type (o justificado)
- [ ] Return types explícitos
- [ ] Generics apropiados
- [ ] Strict mode enabled
- [ ] No type assertions innecesarios

### Naming
- [ ] Variables: camelCase, descriptivo
- [ ] Functions: verbo + sustantivo
- [ ] Classes: PascalCase, sustantivo
- [ ] Constants: UPPER_SNAKE_CASE
- [ ] Boolean: is/has/should prefijo
- [ ] No abbreviations confusas

**Ejemplos**:
```typescript
// ✅ ACEPTADO
async function calculateTotalPrice(booking: Booking): Promise<number>
const MAX_RETRIES = 3;
const isUserAuthenticated = computed(() => !!this.user());

// ❌ RECHAZADO
function calc(b: any): any  // ❌ Naming pobre, any type
const max = 3;  // ❌ No descriptivo
const auth = this.user();  // ❌ Unclear
```

---

## 4. CRITERIOS DE TESTING

### Coverage Mínimo
- **P0 bugs**: 90% coverage del cambio
- **P1 bugs**: 80% coverage
- **P2 bugs**: 70% coverage
- **P3 bugs**: 60% coverage

### Unit Tests Requeridos
- [ ] Happy path
- [ ] Error cases
- [ ] Edge cases (null, undefined, empty)
- [ ] Boundary values
- [ ] Async operations
- [ ] Mocks realistas

**Ejemplo**:
```typescript
describe('PaymentService', () => {
  // ✅ Happy path
  it('should process valid payment');

  // ✅ Error cases
  it('should reject expired card');
  it('should reject invalid CVV');
  it('should handle network timeout');

  // ✅ Edge cases
  it('should handle null payment data');
  it('should handle amount = 0');

  // ✅ Boundary values
  it('should accept max amount');
  it('should reject amount > max');
});
```

### Integration Tests
- [ ] API endpoints tested
- [ ] Database operations verified
- [ ] External service mocks
- [ ] Error propagation tested

### E2E Tests (Critical Paths)
- [ ] User registration flow
- [ ] Car booking flow
- [ ] Payment flow
- [ ] Cancellation flow
- [ ] Tested en móvil Y desktop

---

## 5. CRITERIOS DE SEGURIDAD

### OWASP Top 10 Checklist
- [ ] A01:2021 – Broken Access Control: Verificado
- [ ] A02:2021 – Cryptographic Failures: N/A o mitigado
- [ ] A03:2021 – Injection: Input sanitization
- [ ] A04:2021 – Insecure Design: Architecture reviewed
- [ ] A05:2021 – Security Misconfiguration: Hardened
- [ ] A06:2021 – Vulnerable Components: Dependencies updated
- [ ] A07:2021 – Authentication Failures: Fixed
- [ ] A08:2021 – Software Integrity Failures: SRI, signatures
- [ ] A09:2021 – Logging Failures: Implemented
- [ ] A10:2021 – SSRF: URL validation

### Security Headers
```http
✅ REQUERIDOS:
Content-Security-Policy: default-src 'self'; ...
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(self)
```

### Penetration Testing
- [ ] SQL injection attempts
- [ ] XSS payload testing
- [ ] CSRF token validation
- [ ] Authentication bypass attempts
- [ ] Authorization escalation attempts
- [ ] OWASP ZAP scan clean

---

## 6. CRITERIOS DE PERFORMANCE

### Web Vitals (Lighthouse)
```
✅ REQUERIDO:
- Performance:        ≥ 90
- Accessibility:      ≥ 90
- Best Practices:     ≥ 95
- SEO:                ≥ 90

✅ Core Web Vitals:
- LCP (Largest Contentful Paint):  ≤ 2.5s
- FID (First Input Delay):          ≤ 100ms
- CLS (Cumulative Layout Shift):    ≤ 0.1
```

### Bundle Size
```
✅ REQUERIDO:
- Initial bundle:     ≤ 500KB (gzipped)
- Total bundle:       ≤ 1.5MB (gzipped)
- Lazy chunks:        ≤ 200KB each
```

### Runtime Performance
- [ ] Time to Interactive ≤ 3s
- [ ] First Contentful Paint ≤ 1.5s
- [ ] No main thread blocking >50ms
- [ ] Smooth scrolling (60fps)
- [ ] No memory leaks (30min test)

### Database
- [ ] Queries optimizadas (explain plan)
- [ ] Indexes apropiados
- [ ] N+1 queries evitadas
- [ ] Connection pooling configurado
- [ ] Query time ≤ 100ms (p95)

---

## 7. CRITERIOS DE UX/ACCESSIBILITY

### WCAG 2.1 Level AA
- [ ] 1.1.1 Non-text Content: Alt text
- [ ] 1.4.3 Contrast: Ratio ≥ 4.5:1
- [ ] 2.1.1 Keyboard: Todo navegable
- [ ] 2.4.3 Focus Order: Lógico
- [ ] 3.2.1 On Focus: Sin cambios inesperados
- [ ] 4.1.2 Name, Role, Value: ARIA completo

### Screen Reader Testing
- [ ] NVDA (Windows)
- [ ] JAWS (Windows)
- [ ] VoiceOver (macOS/iOS)
- [ ] TalkBack (Android)

### Keyboard Navigation
- [ ] Tab order lógico
- [ ] Focus visible
- [ ] Esc cierra modals
- [ ] Enter/Space activa buttons
- [ ] Arrow keys en listas

### Responsive Design
- [ ] Móvil (320px - 768px)
- [ ] Tablet (768px - 1024px)
- [ ] Desktop (1024px+)
- [ ] Touch targets ≥ 44x44px
- [ ] No horizontal scroll

### Loading States
- [ ] Skeleton screens o spinners
- [ ] Disable buttons durante carga
- [ ] Optimistic UI updates
- [ ] Error states claros
- [ ] Timeout handling

---

## 8. PROCESO DE APROBACIÓN

### Workflow
```
1. Developer completa implementación
   ↓
2. Self-review checklist
   ↓
3. Create Pull Request
   ↓
4. Automated checks (CI/CD)
   - Linting
   - Unit tests
   - Build
   - Security scan
   ↓
5. Code Review (2+ approvers)
   - P0: Security Lead + Backend Lead
   - P1: 2 Senior Engineers
   - P2: 1 Senior + 1 Mid
   ↓
6. QA Testing (staging)
   - Functional testing
   - Regression testing
   - Performance testing
   ↓
7. Stakeholder Approval
   - P0: CTO + relevant VP
   - P1: Tech Lead
   - P2: Team Lead
   ↓
8. Deploy to Production
   ↓
9. Post-Deploy Verification
   - Smoke tests
   - Monitoring check
   - Metrics baseline
   ↓
10. ✅ DONE
```

### Rejection Criteria (Auto-Reject si)
- ❌ Tests failing
- ❌ Coverage < threshold
- ❌ Linter errors
- ❌ Security vulnerabilities
- ❌ Performance regression >10%
- ❌ Breaking changes sin migration
- ❌ Sin documentación

### Escalation
Si bug requiere más de 2x tiempo estimado:
1. Tech Lead notificado
2. Blockers identificados
3. Sprint ajustado
4. Stakeholders informados

---

## 📝 CHECKLIST TEMPLATE

Usar este template en CADA PR:

```markdown
## Bug: [P0-XXX] Título

### Criterios Generales
- [ ] Código sigue arquitectura
- [ ] Tests coverage ≥ 80%
- [ ] Documentación actualizada
- [ ] 2+ code reviews aprobados
- [ ] Deployed a staging
- [ ] Smoke tests passed

### Criterios Específicos
- [ ] [Criterio específico 1 del tipo de bug]
- [ ] [Criterio específico 2]
- [ ] [Criterio específico 3]

### Testing
- [ ] Unit tests: X/Y passing
- [ ] Integration tests: X/Y passing
- [ ] E2E tests: X/Y passing
- [ ] Manual QA: PASS/FAIL

### Performance
- [ ] Lighthouse score: XX/100
- [ ] Bundle impact: +/-XX KB
- [ ] Runtime performance: OK

### Security
- [ ] Security review: APPROVED
- [ ] OWASP scan: CLEAN
- [ ] Penetration test: PASS

### Accessibility
- [ ] Axe scan: 0 violations
- [ ] Keyboard nav: PASS
- [ ] Screen reader: PASS

### Deployment
- [ ] Rollback plan documented
- [ ] Monitoring configured
- [ ] Alerts set up

### Stakeholder Approval
- [ ] Tech Lead: ✅
- [ ] [Otro stakeholder si P0]

---
**Ready for Production**: YES / NO
```

---

**Aprobado por**:
- Tech Lead: _______________
- CTO: _______________
- Fecha: _______________
