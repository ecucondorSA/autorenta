# 🔄 Workflows de Verificación Progresiva - AutoRenta

## 📋 Flujos de Usuario Completos

Este documento detalla los workflows completos de verificación según el rol y acción del usuario.

---

## 🚗 Workflow 1: Usuario NUEVO → Primera RESERVA (Locatario)

### Paso a Paso

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. SIGNUP / LOGIN                                               │
│    - Registro con email                                         │
│    - Verificación email (código 6 dígitos)                      │
│    - Verificación teléfono (SMS)                                │
│    → RESULTADO: Level 1 (Explorador) ✅                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. EXPLORAR CATÁLOGO                                            │
│    - Ver todos los autos disponibles                            │
│    - Filtrar por precio, ubicación, etc.                        │
│    - Ver perfiles de propietarios                               │
│    - Agregar a favoritos                                        │
│    → NO puede reservar aún                                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. INTENTA RESERVAR AUTO                                        │
│    - Click en "Reservar ahora"                                  │
│    - Guard detecta: Level 1 insuficiente                        │
│    → REDIRIGE: /verification/upgrade?required=2&action=book     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. PÁGINA DE UPGRADE A LEVEL 2                                  │
│                                                                 │
│    ┌────────────────────────────────────────────────────────┐  │
│    │ 🔐 Verificá tu identidad para reservar                 │  │
│    │                                                        │  │
│    │ Para reservar este auto necesitás:                    │  │
│    │                                                        │  │
│    │ ✅ DNI/Pasaporte (frente y dorso)                     │  │
│    │ ✅ Licencia de conducir vigente                       │  │
│    │                                                        │  │
│    │ [Subir DNI Frente]    [Subir DNI Dorso]              │  │
│    │ [Subir Licencia de Conducir]                          │  │
│    │                                                        │  │
│    │         [Continuar con Verificación] →                │  │
│    └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. VALIDACIÓN AUTOMÁTICA (Edge Functions)                      │
│                                                                 │
│    a) verify-document-basic (DNI)                               │
│       - OCR: extrae nombre, número, fecha nacimiento            │
│       - Fake detection: bordes, hologramas                      │
│       - Score: 85/100 → APROBADO ✅                             │
│                                                                 │
│    b) verify-driver-license                                     │
│       - OCR: extrae nombre, vencimiento, categoría              │
│       - Validación: expiry = 2027-05-15 (vigente) ✅            │
│       - País: AR (Mercosur válido) ✅                            │
│       - Score: 92/100 → APROBADO ✅                             │
│                                                                 │
│    → RESULTADO: Level 2 activado ✅                             │
│    → UPDATE: user_identity_levels.current_level = 2             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. CONFIRMACIÓN Y RETORNO                                       │
│                                                                 │
│    ✅ ¡Verificación completada!                                 │
│    🟡 Ahora sos Participante verificado                         │
│                                                                 │
│    Podés:                                                       │
│    • Reservar autos hasta 7 días                                │
│    • Transacciones hasta $50,000 ARS                            │
│    • Publicar 1 auto                                            │
│                                                                 │
│    [Volver a reservar auto] →                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. COMPLETAR RESERVA                                            │
│    - Selecciona fechas (máx 7 días)                             │
│    - Total: $45,000 ARS (dentro del límite)                     │
│    - Pago con wallet o MercadoPago                              │
│    → RESERVA CONFIRMADA ✅                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Tiempo estimado: **5-7 minutos** (desde signup hasta reserva)

---

## 🏠 Workflow 2: Usuario EXISTENTE → Publicar PRIMER AUTO (Locador)

### Paso a Paso

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USUARIO CON LEVEL 2 YA ACTIVO                                │
│    - Ya tiene DNI verificado                                    │
│    - Ya tiene licencia verificada (como renter)                 │
│    → Estado actual: Level 2 ✅                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. NAVEGA A "PUBLICAR AUTO"                                     │
│    - Click en "Publicar mi auto"                                │
│    - Guard verifica: Level 2 ✅ (puede publicar 1 auto)         │
│    → ACCESO PERMITIDO                                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. FORMULARIO DE PUBLICACIÓN                                    │
│                                                                 │
│    Paso 1: Datos del auto                                       │
│    - Marca, modelo, año                                         │
│    - Patente/Dominio                                            │
│    - Precio por día                                             │
│                                                                 │
│    Paso 2: Fotos del auto                                       │
│    - Upload mínimo 3 fotos                                      │
│                                                                 │
│    Paso 3: ⚠️ DOCUMENTACIÓN DEL VEHÍCULO (NUEVO)               │
│    ┌────────────────────────────────────────────────────────┐  │
│    │ ¿Sos el dueño del vehículo?                            │  │
│    │                                                        │  │
│    │ ( ) Sí, soy el titular    ( ) No, tengo autorización │  │
│    │                                                        │  │
│    │ [Subir Cédula Verde]      [Subir Cédula Azul]        │  │
│    │ (foto legible del frente)                             │  │
│    └────────────────────────────────────────────────────────┘  │
│                                                                 │
│    Paso 4 (Opcional): Documentos adicionales                    │
│    - VTV (Verificación Técnica)                                 │
│    - Seguro del vehículo                                        │
│                                                                 │
│         [Publicar Auto] →                                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. VALIDACIÓN AUTOMÁTICA (Edge Function)                       │
│                                                                 │
│    verify-vehicle-ownership                                     │
│    - OCR cédula verde: patente = "ABC123"                       │
│    - OCR titular: "Juan Pérez"                                  │
│    - Match con user profile: ✅                                 │
│    - Match con patente ingresada: ✅                            │
│    - Score: 88/100 → APROBADO ✅                                │
│                                                                 │
│    → INSERT vehicle_documents                                   │
│    → UPDATE cars.status = 'pending_approval'                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. REVISIÓN MANUAL (OPCIONAL)                                   │
│    - Si score < 80: admin revisa cédula                         │
│    - Admin aprueba/rechaza en dashboard                         │
│    - Usuario recibe notificación por email                      │
│                                                                 │
│    → Si aprobado: cars.status = 'active'                        │
│    → Si rechazado: cars.status = 'rejected' + motivo            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. AUTO PUBLICADO ✅                                             │
│    - Auto visible en catálogo                                   │
│    - Usuario recibe notificación:                               │
│      "Tu Ford Focus 2020 ya está publicado"                     │
│                                                                 │
│    Límite alcanzado:                                            │
│    - 1/1 autos publicados (Level 2)                             │
│    - Para publicar más: upgrade a Level 3                       │
└─────────────────────────────────────────────────────────────────┘
```

### Tiempo estimado: **10-15 minutos** (sin contar aprobación manual)

---

## ⚠️ Edge Cases y Validaciones

### 1. **Licencia vencida durante reserva activa**

```sql
-- Escenario: Usuario tiene reserva vigente pero licencia vence

-- Validación diaria (cron job):
SELECT b.id, b.user_id, u.driver_license_expiry
FROM bookings b
JOIN user_identity_levels u ON u.user_id = b.renter_id
WHERE b.status = 'confirmed'
  AND b.start_date > CURRENT_DATE
  AND u.driver_license_expiry < CURRENT_DATE;

-- Acción:
-- 1. Enviar email/SMS urgente: "Tu licencia venció, renovála antes de la reserva"
-- 2. Si no renueva antes de start_date - 2 días → cancelar reserva
-- 3. Reembolso completo al usuario
```

### 2. **Usuario intenta publicar 2do auto con Level 2**

```typescript
// Guard en /cars/publish
const canPublish = await checkUserLevelAccess(userId, 2, 'publish_car');

if (!canPublish.allowed) {
  // Redirigir a upgrade
  router.navigate(['/verification/upgrade?required=3']);
  return false;
}

// Check car count limit
const carCount = await supabase
  .from('cars')
  .select('id')
  .eq('owner_id', userId)
  .in('status', ['active', 'pending_approval'])
  .count();

if (carCount >= 1) {
  // Show upgrade modal
  showModal({
    title: 'Límite de autos alcanzado',
    message: 'Con verificación básica podés publicar 1 auto. Upgrade a verificación completa para publicar ilimitados.',
    action: 'Verificarme completamente',
    link: '/verification/upgrade?required=3'
  });
  return false;
}
```

### 3. **Cédula azul sin ser dueño**

```typescript
// Validación en formulario de publicación
if (isOwner === false && !bluecardUrl) {
  showError('Si no sos el dueño del vehículo, necesitás subir la cédula azul o autorización notarial');
  return false;
}

// Edge Function valida:
if (!isOwner) {
  // OCR cédula azul
  const bluecardData = await ocrBlucecard(bluecardImage);

  if (!bluecardData.authorizedName.includes(userProfile.fullName)) {
    return {
      success: false,
      error: 'La cédula azul no está a tu nombre',
      requiresManualReview: true
    };
  }
}
```

### 4. **VTV o seguro vencido**

```sql
-- Validación al momento de activar auto
CREATE OR REPLACE FUNCTION validate_car_before_activation()
RETURNS TRIGGER AS $$
DECLARE
  v_doc RECORD;
BEGIN
  -- Get vehicle documents
  SELECT * INTO v_doc
  FROM vehicle_documents
  WHERE vehicle_id = NEW.id;

  -- Check VTV
  IF v_doc.vtv_expiry IS NOT NULL AND v_doc.vtv_expiry < CURRENT_DATE THEN
    RAISE EXCEPTION 'No podés activar el auto con VTV vencida. Renovála y actualizá la documentación.';
  END IF;

  -- Check insurance
  IF v_doc.insurance_expiry IS NOT NULL AND v_doc.insurance_expiry < CURRENT_DATE THEN
    RAISE EXCEPTION 'No podés activar el auto con seguro vencido. Renovalo y actualizá la documentación.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_car_documents_before_activation
  BEFORE UPDATE OF status ON cars
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION validate_car_before_activation();
```

### 5. **Usuario con DNI extranjero (no Mercosur)**

```typescript
// verify-driver-license Edge Function
const VALID_MERCOSUR_COUNTRIES = ['AR', 'UY', 'BR', 'PY', 'CL'];

if (!VALID_MERCOSUR_COUNTRIES.includes(licenseCountry)) {
  // Requiere revisión manual + licencia internacional
  return {
    success: false,
    requiresManualReview: true,
    reason: 'COUNTRY_NOT_MERCOSUR',
    message: 'Para licencias fuera de Mercosur necesitás licencia internacional. Un administrador revisará tu caso.',
    userAction: 'Subí también tu licencia internacional o permiso de conducir internacional'
  };
}
```

---

## 📊 Límites y Restricciones por Nivel

### Tabla Resumida

| Acción | Level 1 | Level 2 | Level 3 | Requiere también |
|--------|---------|---------|---------|------------------|
| Ver catálogo | ✅ | ✅ | ✅ | - |
| Publicar auto | ❌ | ✅ (1 auto) | ✅ (∞) | Cédula verde/azul |
| Reservar auto | ❌ | ✅ (<7 días) | ✅ (∞) | Licencia vigente |
| Depositar wallet | ❌ | ✅ ($100k) | ✅ (∞) | - |
| Retirar wallet | ❌ | ✅ ($50k/mes) | ✅ (∞) | - |
| Transacción única | ❌ | ✅ (<$50k) | ✅ (∞) | - |
| Seguros premium | ❌ | ❌ | ✅ | - |

---

## 🔔 Sistema de Notificaciones

### Notificaciones Proactivas

```sql
-- Cron job diario: detectar documentos próximos a vencer
SELECT * FROM get_expiring_documents(30); -- 30 días de umbral

-- Email templates:
-- 1. Licencia vence en 30 días
-- 2. Licencia vence en 7 días (urgente)
-- 3. VTV vence en 30 días
-- 4. Seguro vence en 15 días (crítico)
```

### Ejemplo de Email

```
Asunto: ⚠️ Tu licencia de conducir vence en 7 días

Hola Juan,

Tu licencia de conducir vence el 15/11/2025 (dentro de 7 días).

Para seguir reservando autos en AutoRenta, necesitás:
1. Renovar tu licencia
2. Actualizar la foto en tu perfil

[Actualizar Licencia] →

Si no actualizás antes del vencimiento, tus reservas futuras serán canceladas automáticamente.

Saludos,
Equipo AutoRenta
```

---

## 🎯 Roadmap de Implementación

### Fase 1: Base de datos ✅
- [x] Migración user_identity_levels
- [x] Tabla vehicle_documents
- [x] RPC functions de validación
- [x] Triggers de vencimiento

### Fase 2: Edge Functions (Semana 1-2)
- [ ] verify-document-basic (DNI)
- [ ] verify-driver-license
- [ ] verify-vehicle-ownership (cédula verde/azul)
- [ ] verify-vtv-insurance (opcional)

### Fase 3: Frontend Guards (Semana 2-3)
- [ ] VerificationLevelGuard
- [ ] canPublishCarGuard
- [ ] canBookCarGuard
- [ ] DriverLicenseValidGuard

### Fase 4: UI Components (Semana 3-4)
- [ ] Página /verification/upgrade
- [ ] Componente DocumentUpload
- [ ] Badge mejorado con tooltips
- [ ] Modal de límites alcanzados

### Fase 5: Notificaciones (Semana 4-5)
- [ ] Cron job de vencimientos
- [ ] Email templates
- [ ] SMS alerts (opcional)
- [ ] In-app notifications

### Fase 6: Admin Dashboard (Semana 5-6)
- [ ] Panel de revisión manual
- [ ] Aprobación de documentos de vehículos
- [ ] Estadísticas de verificación
- [ ] Logs de validaciones IA

---

## 🧪 Testing Checklist

### Tests Unitarios
- [ ] RPC: check_user_level_access
- [ ] RPC: check_driver_license_valid
- [ ] RPC: check_vehicle_documents_valid
- [ ] RPC: get_expiring_documents
- [ ] Trigger: validate_car_before_activation

### Tests de Integración
- [ ] Flujo completo: signup → reserva
- [ ] Flujo completo: signup → publicar auto
- [ ] Edge case: licencia vencida bloquea reserva
- [ ] Edge case: límite de 1 auto en Level 2
- [ ] Edge case: cédula azul sin ser dueño

### Tests E2E (Playwright)
- [ ] Usuario nuevo reserva auto (happy path)
- [ ] Usuario publica auto con cédula verde
- [ ] Usuario intenta publicar 2do auto sin Level 3
- [ ] Usuario con licencia vencida intenta reservar
- [ ] Upgrade de Level 2 a Level 3

---

**Última actualización**: 2025-10-22
**Autor**: Claude Code + Eduardo (AutoRenta Team)
**Status**: 🚧 En diseño - Listo para implementación
