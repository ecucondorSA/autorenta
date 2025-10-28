# 🏪 Guía de Configuración del Marketplace de MercadoPago

Esta guía te ayudará a configurar el Marketplace de MercadoPago para habilitar split payments en AutoRenta.

## 📋 Contenido

1. [Archivos Creados](#archivos-creados)
2. [Configuración Inicial](#configuración-inicial)
3. [Validación de Configuración](#validación-de-configuración)
4. [Testing de Credenciales](#testing-de-credenciales)
5. [Uso en el Código](#uso-en-el-código)
6. [Tests Unitarios](#tests-unitarios)
7. [Troubleshooting](#troubleshooting)

---

## 📁 Archivos Creados

### 1. **`.env.example` actualizado**
   - Ubicación: `apps/web/.env.example`
   - Variables añadidas:
     - `MERCADOPAGO_MARKETPLACE_ID`
     - `MERCADOPAGO_APPLICATION_ID`
     - `MERCADOPAGO_PLATFORM_FEE_PERCENTAGE`

### 2. **Script de Validación**
   - Ubicación: `scripts/validate-marketplace-config.sh`
   - Propósito: Validar que todas las variables de entorno estén configuradas

### 3. **Servicio TypeScript**
   - Ubicación: `apps/web/src/app/core/services/marketplace.service.ts`
   - Propósito: Helpers para validar marketplace y calcular splits

### 4. **Script de Testing de Credenciales**
   - Ubicación: `scripts/test-marketplace-credentials.sh`
   - Propósito: Verificar credenciales con la API real de MercadoPago

### 5. **Tests Unitarios**
   - Ubicación: `apps/web/src/app/core/services/__tests__/marketplace.service.spec.ts`
   - Propósito: Tests mockeados del MarketplaceService

---

## ⚙️ Configuración Inicial

### Paso 1: Configurar Marketplace en MercadoPago

1. **Ir al panel de desarrolladores:**
   ```
   https://www.mercadopago.com.ar/developers/panel/app
   ```

2. **Seleccionar tu aplicación** (o crear una nueva)

3. **Activar Marketplace:**
   - Ve a "Configuración" → "Marketplace"
   - Activa "Split de pagos"
   - Configura:
     - **Comisión de plataforma:** 10%
     - **Modo:** Automático
     - **Transferencia:** Inmediata

4. **Obtener credenciales:**
   - **Marketplace ID:** En la sección "Marketplace"
   - **Application ID:** En "Información de la aplicación"
   - **Access Token:** En "Credenciales"
   - **Public Key:** En "Credenciales"

### Paso 2: Configurar Variables de Entorno

1. **Copiar el archivo de ejemplo:**
   ```bash
   cd apps/web
   cp .env.example .env.local
   ```

2. **Editar `.env.local` con los valores reales:**
   ```bash
   # MercadoPago Production
   MERCADOPAGO_ACCESS_TOKEN=APP_USR-1234567890abcdef-...
   MERCADOPAGO_PUBLIC_KEY=APP_USR-...

   # Marketplace
   MERCADOPAGO_MARKETPLACE_ID=tu-marketplace-id
   MERCADOPAGO_APPLICATION_ID=1234567890
   MERCADOPAGO_PLATFORM_FEE_PERCENTAGE=10
   ```

3. **Para testing, también configurar credenciales de sandbox:**
   ```bash
   MERCADOPAGO_TEST_ACCESS_TOKEN=TEST-1234567890abcdef-...
   MERCADOPAGO_TEST_PUBLIC_KEY=TEST-...
   ```

---

## ✅ Validación de Configuración

### Validar Variables de Entorno

Ejecuta el script de validación:

```bash
cd /home/edu/autorenta
./scripts/validate-marketplace-config.sh
```

**Output esperado:**

```
🔍 Validando configuración de MercadoPago Marketplace...

✅ Archivo .env.local encontrado

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 VALIDACIÓN DE VARIABLES REQUERIDAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣  Credenciales básicas de MercadoPago:
✅ MERCADOPAGO_ACCESS_TOKEN: Configurado
✅ MERCADOPAGO_PUBLIC_KEY: Configurado

2️⃣  Credenciales de Test/Sandbox:
⚠️  MERCADOPAGO_TEST_ACCESS_TOKEN: NO CONFIGURADO (OPCIONAL)

3️⃣  Configuración de Marketplace (Split Payment):
✅ MERCADOPAGO_MARKETPLACE_ID: Configurado
✅ MERCADOPAGO_APPLICATION_ID: Configurado
✅ MERCADOPAGO_PLATFORM_FEE_PERCENTAGE: Configurado

4️⃣  Configuración de Supabase:
✅ SUPABASE_URL: Configurado
✅ SUPABASE_SERVICE_ROLE_KEY: Configurado

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 RESUMEN DE VALIDACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Todas las variables están configuradas correctamente
```

---

## 🧪 Testing de Credenciales

### Test en Producción

Verifica que las credenciales funcionen con la API real:

```bash
./scripts/test-marketplace-credentials.sh prod
```

### Test en Sandbox

Verifica credenciales de test:

```bash
./scripts/test-marketplace-credentials.sh test
```

**Output esperado:**

```
🧪 Verificando credenciales de MercadoPago (modo: prod)...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔑 TEST 1: Validar Access Token
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Access Token válido

  📊 Información de la cuenta:
     User ID: 123456789
     Email: tu-email@ejemplo.com
     Site: MLA

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏪 TEST 2: Validar Configuración de Marketplace
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ MERCADOPAGO_MARKETPLACE_ID: tu-marketplace-id
✅ MERCADOPAGO_APPLICATION_ID: 1234567890

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💳 TEST 3: Crear Preference de Prueba (Split Payment)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  Preference falló (esperado sin collector_id)
   Para split payment real, necesitas un seller con onboarding completo

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 RESUMEN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Todas las validaciones pasaron

Próximos pasos:
1. Asegúrate que los sellers completen onboarding MP
2. Actualiza los cars con owner_mp_collector_id
3. Testea el flujo completo de reserva con split
```

---

## 💻 Uso en el Código

### Inyectar el Servicio

```typescript
import { Component } from '@angular/core';
import { MarketplaceService } from '@app/core/services/marketplace.service';

@Component({
  selector: 'app-publish-car',
  template: '...'
})
export class PublishCarComponent {
  constructor(private marketplaceService: MarketplaceService) {}

  async publishCar() {
    // Tu código aquí...
  }
}
```

### Validar Configuración del Marketplace

```typescript
async checkMarketplace() {
  const validation = await this.marketplaceService.validateMarketplaceConfig();

  if (!validation.isValid) {
    console.error('Marketplace no configurado:', validation.errors);
    return;
  }

  console.log('Marketplace configurado:', validation.config);
}
```

### Verificar Onboarding del Usuario

```typescript
async checkUserOnboarding(userId: string) {
  const isComplete = await this.marketplaceService.isUserOnboardingComplete(userId);

  if (!isComplete) {
    this.showMPOnboardingModal();
    return false;
  }

  return true;
}
```

### Calcular Split de Pagos

```typescript
async calculatePayment(bookingAmount: number) {
  const split = this.marketplaceService.calculateSplitAmounts(bookingAmount);

  console.log('Total:', split.total);
  console.log('Fee plataforma:', split.platformFee);
  console.log('Monto para locador:', split.ownerAmount);

  return split;
}
```

### Obtener Collector ID del Usuario

```typescript
async getCollectorId(userId: string) {
  const collectorId = await this.marketplaceService.getUserCollectorId(userId);

  if (!collectorId) {
    throw new Error('Usuario no tiene collector ID');
  }

  return collectorId;
}
```

### Validar que un Auto tenga Collector ID

```typescript
async validateCar(carId: string) {
  const isValid = await this.marketplaceService.validateCarHasCollectorId(carId);

  if (!isValid) {
    console.error('Auto no tiene collector ID del dueño');
    return false;
  }

  return true;
}
```

---

## 🧪 Tests Unitarios

### Ejecutar Tests

```bash
cd apps/web
npm test -- --include='**/marketplace.service.spec.ts'
```

### Coverage

```bash
npm run test:coverage
```

### Tests Incluidos

1. ✅ Validación de configuración del marketplace
2. ✅ Cálculo de splits con diferentes fees
3. ✅ Verificación de onboarding de usuarios
4. ✅ Obtención de collector IDs
5. ✅ Validación de autos con collector ID

---

## 🚨 Troubleshooting

### Error: "MERCADOPAGO_MARKETPLACE_ID no está configurado"

**Solución:**
1. Verifica que `.env.local` existe
2. Confirma que la variable está definida en el archivo
3. Reinicia el servidor de desarrollo

### Error: "Access Token inválido"

**Solución:**
1. Verifica que estás usando el token correcto (prod vs test)
2. Revisa que no haya espacios al inicio/final del token
3. Genera un nuevo token en el panel de MP

### Error: "Marketplace no está habilitado en tu cuenta"

**Solución:**
1. Ve a https://www.mercadopago.com.ar/developers/panel/app
2. Activa la funcionalidad de Marketplace
3. Puede requerir aprobación de MercadoPago (1-3 días hábiles)

### Error: "collector_id is required"

**Solución:**
- El seller (dueño del auto) debe completar el onboarding de MP
- Usa `MarketplaceService.isUserOnboardingComplete()` para verificar

---

## 📚 Referencias

- [MercadoPago Split Payments](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/split-payments)
- [MercadoPago Marketplace](https://www.mercadopago.com.ar/developers/es/docs/marketplace/checkout-pro/introduction)
- [MercadoPago API Reference](https://www.mercadopago.com.ar/developers/es/reference)

---

## ✅ Checklist de Implementación

Antes de considerar el Paso 2 completo:

- [ ] Variables de entorno configuradas en `.env.local`
- [ ] Script de validación pasa sin errores
- [ ] Script de test de credenciales funciona
- [ ] `MarketplaceService` importado en la app
- [ ] Tests unitarios pasando
- [ ] Documentación leída y entendida

---

**Última actualización:** 2025-10-28
**Versión:** 1.0
