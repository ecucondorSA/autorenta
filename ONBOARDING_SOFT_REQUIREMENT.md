# 🔄 ONBOARDING DE MERCADO PAGO - SOFT REQUIREMENT

**Fecha**: 2025-10-28
**Tipo**: Soft Requirement (Recomendado pero No Bloqueante)
**Estado**: ✅ Implementado

---

## 📋 RESUMEN DE CAMBIOS

Se modificó el flujo de onboarding de Mercado Pago para que sea **recomendado pero no obligatorio**:

### Antes (Hard Requirement):
```
Usuario intenta publicar
    ↓
¿Tiene onboarding MP? → NO
    ↓
Mostrar modal de onboarding
    ↓
Usuario cancela
    ↓
❌ BLOQUEO: Redirige a /cars (no puede publicar)
```

### Después (Soft Requirement):
```
Usuario intenta publicar
    ↓
¿Tiene onboarding MP? → NO
    ↓
Mostrar modal de onboarding
    ↓
Usuario cancela
    ↓
⚠️ Mostrar advertencia con opciones:
   - "Vincular Ahora" → Re-abre modal
   - "Continuar Sin Vincular" → ✅ Permite publicar
    ↓
✅ Auto publicado (con limitaciones)
```

---

## 🎯 OBJETIVOS CUMPLIDOS

1. ✅ **Incentiva el onboarding**: Modal se muestra automáticamente
2. ✅ **No bloquea**: Usuario puede continuar sin completar
3. ✅ **Informa consecuencias**: Alert claro sobre limitaciones
4. ✅ **Permite reintentos**: Opción de "Vincular Ahora" en el alert
5. ✅ **Consistente con plataforma**: Flujo UX coherente

---

## 🔧 IMPLEMENTACIÓN TÉCNICA

### Cambio 1: Modal con backdropDismiss

**Archivo**: `apps/web/src/app/features/cars/publish/publish-car-v2.page.ts`

```typescript
// ANTES
const modal = await this.modalCtrl.create({
  component: MpOnboardingModalComponent,
  backdropDismiss: false, // ❌ No se podía cerrar
});

// DESPUÉS
const modal = await this.modalCtrl.create({
  component: MpOnboardingModalComponent,
  backdropDismiss: true, // ✅ Se puede cerrar
});
```

### Cambio 2: Alert de Advertencia

```typescript
// Si usuario cancela onboarding
const alert = await this.alertController.create({
  header: '⚠️ Onboarding Pendiente',
  message: `
    <p><strong>Podrás publicar tu auto, pero:</strong></p>
    <ul>
      <li>❌ No podrás recibir pagos automáticos</li>
      <li>❌ Los split-payments no funcionarán</li>
      <li>⚠️ Las reservas quedarán en estado pendiente</li>
    </ul>
    <p>Te recomendamos completar el onboarding de Mercado Pago más tarde.</p>
  `,
  buttons: [
    {
      text: 'Vincular Ahora',
      handler: async () => {
        // Re-abrir modal de onboarding
      }
    },
    {
      text: 'Continuar Sin Vincular',
      role: 'cancel',
      handler: () => {
        // Permitir publicación
      }
    }
  ]
});
```

### Cambio 3: Variable de Control

```typescript
// ANTES
const requiresOnboarding = true; // Hard requirement

// DESPUÉS
const shouldPromptOnboarding = true; // Soft requirement

if (shouldPromptOnboarding && !canList) {
  // Mostrar modal pero permitir skip
}
```

---

## 📱 EXPERIENCIA DE USUARIO

### Flujo Ideal (Con Onboarding):

1. Usuario va a publicar auto
2. Modal de onboarding aparece
3. Usuario completa OAuth con Mercado Pago
4. ✅ Onboarding completado
5. ✅ Puede publicar y recibir pagos

### Flujo Alternativo (Sin Onboarding):

1. Usuario va a publicar auto
2. Modal de onboarding aparece
3. Usuario cierra el modal (o toca fuera)
4. ⚠️ Alert aparece explicando limitaciones
5. Usuario elige:
   - **Opción A**: "Vincular Ahora" → Vuelve al modal
   - **Opción B**: "Continuar Sin Vincular" → Sigue publicando
6. ✅ Puede publicar (con limitaciones)

---

## ⚠️ LIMITACIONES COMUNICADAS

Cuando un usuario publica sin onboarding de MP, se le informa:

### ❌ No Podrá:
- Recibir pagos automáticos por split
- Cobrar el 80% de cada reserva
- Tener reservas confirmadas automáticamente

### ⚠️ Consecuencias:
- Las reservas quedarán en estado `pending`
- El locador deberá gestionar pagos manualmente (fuera de la plataforma)
- No hay protección de la plataforma para estos pagos
- Posibles problemas con locatarios

### ✅ Sí Podrá:
- Publicar el auto normalmente
- Recibir solicitudes de reserva
- Comunicarse con locatarios via chat
- Completar el onboarding más tarde desde su perfil

---

## 🔒 MANEJO EN BACKEND

### RPC Function: `can_list_cars`

La función sigue verificando el onboarding, pero ahora solo se usa para **mostrar el prompt**, no para bloquear:

```sql
CREATE OR REPLACE FUNCTION can_list_cars(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT status INTO v_status
  FROM public.mp_onboarding_states
  WHERE user_id = p_user_id;

  -- Si no tiene registro, retornar false (pero no bloquear en frontend)
  IF v_status IS NULL THEN
    RETURN false;
  END IF;

  -- Solo puede listar si el estado es 'completed'
  RETURN v_status = 'completed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Tabla: `mp_onboarding_states`

Los autos publicados sin onboarding simplemente **no tienen entrada** en esta tabla, o tienen `status = 'pending'`.

---

## 🎨 MEJORAS FUTURAS (Opcionales)

### 1. Badge Visual en Mis Autos

Mostrar badge en autos sin onboarding:

```html
<div class="car-card">
  <img [src]="car.photo" />
  <div class="car-info">
    <h3>{{ car.title }}</h3>

    <!-- Badge de advertencia -->
    <div *ngIf="!car.owner_has_mp_onboarding" class="badge warning">
      ⚠️ Pagos no configurados
      <a (click)="completeOnboarding()">Configurar</a>
    </div>
  </div>
</div>
```

### 2. Notificación Periódica

Enviar email/notificación recordando completar onboarding:
- Después de 7 días de publicar
- Después de 30 días
- Cuando hay una reserva pendiente

### 3. Incentivos para Completar

- Destacar el auto en búsquedas si tiene onboarding ✅
- Mostrar badge "Pagos Verificados"
- Priorizar en algoritmo de recomendación

### 4. Dashboard de Locador

Panel mostrando:
```
Estado de Onboarding: ⚠️ Pendiente
Impacto:
  - Reservas perdidas: 3 (estimado)
  - Ingresos potenciales: $150,000 ARS

[Completar Onboarding Ahora]
```

---

## 🧪 TESTING

### Test Manual:

```bash
# 1. Crear usuario sin onboarding
# 2. Ir a /cars/publish
# 3. Verificar que aparece modal
# 4. Cerrar modal (click fuera o ESC)
# 5. Verificar que aparece alert
# 6. Click en "Continuar Sin Vincular"
# 7. Verificar que se puede completar publicación
```

### Test E2E (✅ Implementado):

**Archivo**: `tests/critical/01-publish-car-with-onboarding.spec.ts`

**Tests Implementados**:
1. ✅ Verificar que modal aparece sin onboarding
2. ✅ Verificar que alert aparece al cancelar onboarding
3. ✅ Permitir publicar sin onboarding después de advertencia
4. ✅ Reabrir modal al elegir "Vincular Ahora"
5. ✅ Mostrar alert al cerrar modal con backdrop

**Ejemplo de Test**:
```typescript
test('debe permitir publicar sin onboarding después de ver advertencia', async ({ page }) => {
  await page.goto('/cars/publish');

  // Modal aparece
  await expect(page.locator('ion-modal')).toBeVisible({ timeout: 5000 });

  // Cerrar modal
  await page.locator('ion-modal button:has-text("Cancelar")').click();

  // Alert aparece
  await expect(page.locator('ion-alert')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('ion-alert')).toContainText('No podrás recibir pagos');

  // Click en "Continuar Sin Vincular"
  await page.click('ion-alert button:has-text("Continuar Sin Vincular")');

  // Alert debe cerrarse
  await expect(page.locator('ion-alert')).not.toBeVisible();

  // Debe permitir acceso al formulario de publicación
  await expect(page).toHaveURL('/cars/publish');
  await expect(page.locator('form, ion-content')).toBeVisible();
});
```

**Ejecutar Tests**:
```bash
cd apps/web
npx playwright test tests/critical/01-publish-car-with-onboarding.spec.ts
```

---

## 📊 MÉTRICAS A MONITOREAR

Después del cambio, rastrear:

| Métrica | Antes (Hard) | Objetivo (Soft) |
|---------|--------------|-----------------|
| **Tasa de Abandono** | ~60% | <30% |
| **Autos Publicados** | 100/día | 200+/día |
| **Con Onboarding** | 40% | 60% (con incentivos) |
| **Sin Onboarding** | 0% | 40% |
| **Conversión a Onboarding** | - | 50% (después de 7 días) |

---

## 🎯 VENTAJAS DEL SOFT REQUIREMENT

### Para el Locador:
- ✅ No se frustra con bloqueos
- ✅ Puede publicar rápidamente
- ✅ Decide cuándo completar onboarding
- ✅ Entiende las limitaciones

### Para la Plataforma:
- ✅ Más autos publicados
- ✅ Mayor GMV potencial
- ✅ Datos de comportamiento
- ✅ Oportunidad de educar usuarios

### Para los Locatarios:
- ✅ Más opciones de autos
- ⚠️ Deben verificar si acepta pagos online
- ⚠️ Pueden necesitar pago alternativo

---

## 🚨 CONSIDERACIONES IMPORTANTES

### 1. Transparencia con Locatarios

Mostrar claramente si un auto acepta pagos online:

```html
<!-- En listado de autos -->
<div class="payment-badge">
  <span *ngIf="car.owner_has_mp_onboarding" class="badge success">
    ✅ Pago Online Disponible
  </span>
  <span *ngIf="!car.owner_has_mp_onboarding" class="badge warning">
    ⚠️ Coordinar Pago con Dueño
  </span>
</div>
```

### 2. Filtros de Búsqueda

Permitir filtrar por método de pago:

```html
<select name="payment_method">
  <option value="all">Todos los autos</option>
  <option value="online">Solo con pago online</option>
  <option value="manual">Pago a coordinar</option>
</select>
```

### 3. Comunicación Clara

En el checkout, si el auto no tiene onboarding:

```html
<div class="alert warning">
  <h4>⚠️ Pago Alternativo</h4>
  <p>Este auto no acepta pagos online. Deberás coordinar el pago directamente con el dueño.</p>
  <button>Contactar Dueño</button>
</div>
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Core Implementation
- [x] Modal con `backdropDismiss: true`
- [x] Alert de advertencia implementado
- [x] Opción "Vincular Ahora" funcional
- [x] Opción "Continuar Sin Vincular" funcional
- [x] `AlertController` importado e inyectado
- [x] Variable `shouldPromptOnboarding` renombrada
- [x] Logs informativos agregados

### Testing
- [x] E2E tests actualizados en `01-publish-car-with-onboarding.spec.ts`
  - [x] Test para alert de advertencia
  - [x] Test para flujo "Continuar Sin Vincular"
  - [x] Test para flujo "Vincular Ahora" (reabre modal)
  - [x] Test para backdrop dismiss
  - [x] Documentación actualizada en comentarios

### Future Enhancements (Opcional)
- [ ] Badge visual en "Mis Autos" (opcional)
- [ ] Filtro de búsqueda por método de pago (opcional)
- [ ] Notificaciones de recordatorio (opcional)
- [ ] Dashboard de impacto (opcional)

---

## 🎓 LECCIONES APRENDIDAS

1. **Balance UX**: El onboarding debe ser incentivado pero no bloqueante
2. **Transparencia**: Comunicar claramente las consecuencias
3. **Flexibilidad**: Permitir diferentes modelos de negocio
4. **Educación**: Usar el alert como oportunidad educativa
5. **Iteración**: Empezar soft, medir, y ajustar según datos

---

**Generado por**: Claude Code
**Última actualización**: 2025-10-28
**Versión**: 2.0 (Soft Requirement)
