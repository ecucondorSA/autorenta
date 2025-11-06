# 🎯 PRÓXIMOS PASOS - Plan de Acción

**Fecha**: 2025-11-03  
**Estado Actual**: ✅ Correcciones críticas completadas  
**Próximo Sprint**: Mejoras de calidad y completar deuda técnica

---

## ✅ LO QUE YA ESTÁ HECHO

- ✅ XSS vulnerabilities eliminadas (innerHTML sanitizado)
- ✅ Manejo de errores mejorado en archivos críticos
- ✅ Validación de disponibilidad antes de checkout
- ✅ Archivos de debug eliminados
- ✅ Console.logs críticos migrados a LoggerService

---

## 🔴 PRIORIDAD ALTA (Esta Semana)

### 1. Completar TODOs Críticos (4-6 horas)

**Archivos prioritarios**:
- `apps/web/src/app/features/cars/list/cars-list.page.ts:809`
  ```typescript
  // TODO: surface feedback to user (toast/snackbar)
  ```
  **Acción**: Crear componente toast notification o usar Angular Material Snackbar
  
- `apps/web/src/app/shared/components/smart-onboarding/smart-onboarding.component.ts:345`
  ```typescript
  // TODO: Guardar onboarding_data en metadata del perfil si se necesita
  ```
  **Acción**: Guardar respuestas del onboarding en `profile.metadata` o crear tabla dedicada

- `apps/web/src/app/features/bookings/booking-detail-payment/booking-detail-payment.page.ts:733`
  ```typescript
  driverAge: 30, // TODO: Obtener edad real del usuario
  ```
  **Acción**: Calcular edad desde `profile.date_of_birth` o agregar campo `age` al perfil

**Impacto**: Mejora UX y funcionalidad faltante

---

### 2. Migrar Console.logs Restantes (6-8 horas)

**Estado actual**: 139 console.logs/warn/error en 41 archivos

**Estrategia**:
1. Priorizar servicios críticos (payments, bookings, wallet)
2. Migrar componente por componente
3. Usar LoggerService con niveles apropiados

**Archivos prioritarios** (por impacto):
- `apps/web/src/app/core/services/bookings.service.ts` (7 ocurrencias)
- `apps/web/src/app/core/services/wallet.service.ts` (1 ocurrencia)
- `apps/web/src/app/core/services/checkout-payment.service.ts` (4 ocurrencias)
- `apps/web/src/app/core/services/notifications/notifications.service.ts` (4 ocurrencias)
- `apps/web/src/app/shared/components/simple-checkout/simple-checkout.component.ts` (3 ocurrencias)

**Comando útil**:
```bash
# Buscar todos los console.logs pendientes
grep -r "console\." apps/web/src/app --include="*.ts" | grep -v "logger.service.ts" | wc -l
```

---

### 3. Crear ErrorHandlerService Global (3-4 horas)

**Objetivo**: Centralizar manejo de errores y mostrar mensajes al usuario

**Estructura propuesta**:
```typescript
// apps/web/src/app/core/services/error-handler.service.ts
@Injectable({ providedIn: 'root' })
export class ErrorHandlerService {
  constructor(
    private logger: LoggerService,
    private notifications: NotificationsService
  ) {}

  handleError(error: unknown, context: string, showToUser = true): void {
    // 1. Log error
    this.logger.error(`Error in ${context}`, error);
    
    // 2. Categorizar error
    const userMessage = this.getUserFriendlyMessage(error);
    
    // 3. Mostrar al usuario si es necesario
    if (showToUser) {
      this.notifications.showError(userMessage);
    }
    
    // 4. Enviar a Sentry si es crítico
    if (this.isCritical(error)) {
      this.logger.critical(`Critical error in ${context}`, error);
    }
  }
  
  private getUserFriendlyMessage(error: unknown): string {
    // Mapear errores técnicos a mensajes amigables
    if (error instanceof Error) {
      // Mapear códigos de error conocidos
      if (error.message.includes('network')) {
        return 'Error de conexión. Verifica tu internet.';
      }
      // ... más mapeos
    }
    return 'Ocurrió un error inesperado. Por favor intenta nuevamente.';
  }
}
```

**Integración**:
- Agregar a `app.config.ts` como provider global
- Crear interceptor HTTP para errores automáticos
- Reemplazar try/catch manuales en servicios críticos

---

## 🟡 PRIORIDAD MEDIA (Próximas 2 Semanas)

### 4. Reducir Uso de `any` (Incremental)

**Estado actual**: 238 ocurrencias de `any`

**Estrategia incremental**:
1. **Fase 1**: Tipar EventEmitters (prioridad alta)
   - `EventEmitter<any>` → `EventEmitter<BookingCreatedEvent>`
   - Crear interfaces para eventos comunes

2. **Fase 2**: Tipar callbacks de Supabase
   - Crear tipos para payloads de realtime
   - Tipar respuestas de RPC functions

3. **Fase 3**: Tipar Record<string, any>
   - Crear interfaces específicas para metadata
   - Tipar configuraciones dinámicas

**Meta**: Reducir a <100 ocurrencias en 2 semanas

---

### 5. Mejorar Smoke Tests (2-3 horas)

**Estado actual**: Solo verifica que páginas respondan

**Agregar tests**:
```yaml
# .github/workflows/build-and-deploy.yml
smoke-tests:
  steps:
    - name: Test homepage loads
      run: curl -sL https://autorenta-web.pages.dev | grep -q "<app-root"
    
    - name: Test cars API (sin auth)
      run: |
        response=$(curl -sL "https://autorenta-web.pages.dev/api/cars?limit=1")
        echo "$response" | jq -e '.length >= 0' || exit 1
    
    - name: Test login page renders
      run: |
        response=$(curl -sL "https://autorenta-web.pages.dev/auth/login")
        echo "$response" | grep -q "login\|signin" || exit 1
```

**Mejora futura**: Usar Playwright para tests E2E básicos

---

### 6. Completar TODOs Restantes (Incremental)

**TODOs pendientes**: 31 en 18 archivos

**Priorizar por impacto**:
- 🔴 Alto: Funcionalidad faltante visible al usuario
- 🟡 Medio: Mejoras de código/infraestructura
- 🟢 Bajo: Optimizaciones y limpieza

**Crear tracking**:
```bash
# Generar lista de TODOs
grep -rn "TODO\|FIXME" apps/web/src --include="*.ts" > todos.txt
```

---

## 🟢 PRIORIDAD BAJA (Próximo Mes)

### 7. Documentación de Seguridad (2-3 horas)

**Crear documentación**:
- `docs/SECURITY.md` - Guía de seguridad
- `docs/SECRETS_ROTATION.md` - Proceso de rotación de secrets
- `docs/ERROR_HANDLING.md` - Estrategia de manejo de errores

### 8. Optimizaciones de Performance

**Revisar**:
- Bundle size analysis
- Lazy loading de módulos pesados
- Optimización de imágenes

### 9. Mejoras de Testing

**Agregar**:
- Tests unitarios para servicios críticos
- Tests E2E para flujos principales
- Coverage reports

---

## 📊 MÉTRICAS DE ÉXITO

### Corto Plazo (1 semana)
- [ ] 0 TODOs críticos pendientes
- [ ] <50 console.logs restantes
- [ ] ErrorHandlerService implementado
- [ ] Todos los servicios críticos usando LoggerService

### Mediano Plazo (2 semanas)
- [ ] <100 ocurrencias de `any`
- [ ] Smoke tests mejorados
- [ ] Documentación de seguridad creada

### Largo Plazo (1 mes)
- [ ] <50 ocurrencias de `any`
- [ ] Coverage >70% en servicios críticos
- [ ] Todos los servicios con manejo de errores centralizado

---

## 🚀 COMANDOS ÚTILES

```bash
# Buscar console.logs pendientes
grep -r "console\." apps/web/src/app --include="*.ts" | grep -v "logger.service.ts" | wc -l

# Buscar TODOs
grep -rn "TODO\|FIXME" apps/web/src --include="*.ts" | wc -l

# Buscar uso de any
grep -r ": any\|any\[\]" apps/web/src/app --include="*.ts" | wc -l

# Verificar lint errors
cd apps/web && npm run lint

# Correr tests
cd apps/web && npm run test

# Build para verificar TypeScript
cd apps/web && npm run build
```

---

## 📝 NOTAS

- **Priorizar impacto sobre cantidad**: Es mejor corregir 5 archivos críticos que 20 archivos menores
- **Commits pequeños**: Hacer commits por cada mejora completa
- **Testing**: Verificar que cada cambio no rompe funcionalidad existente
- **Documentación**: Actualizar docs cuando sea necesario

---

**Última actualización**: 2025-11-03  
**Próxima revisión**: 2025-11-10
