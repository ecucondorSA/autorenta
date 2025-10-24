# Integración Mercado Pago SDK - Frontend

## Problema Actual

El componente `card-hold-panel.component.ts` usa un token dummy:
```typescript
const cardToken = 'DUMMY_TOKEN'; // línea 285
const payerEmail = 'user@example.com'; // línea 286
```

Esto causa que la Edge Function rechace la petición con **400 Bad Request**.

## Solución: Integrar Mercado Pago SDK

### 1. Instalar SDK de Mercado Pago

```bash
cd apps/web
npm install @mercadopago/sdk-react
```

### 2. Agregar Script en `index.html`

```html
<!-- apps/web/src/index.html -->
<head>
  <script src="https://sdk.mercadopago.com/js/v2"></script>
</head>
```

### 3. Configurar Public Key

```typescript
// apps/web/src/environments/environment.ts
export const environment = {
  // ... otros configs
  mercadoPagoPublicKey: 'APP_USR-xxxxxxxx-xxxxxxxx', // SANDBOX para desarrollo
};
```

### 4. Crear Servicio MercadoPago

```typescript
// apps/web/src/app/core/services/mercadopago.service.ts
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

declare global {
  interface Window {
    MercadoPago: any;
  }
}

@Injectable({
  providedIn: 'root'
})
export class MercadoPagoService {
  private mp: any;

  constructor() {
    this.mp = new window.MercadoPago(environment.mercadoPagoPublicKey, {
      locale: 'es-AR'
    });
  }

  /**
   * Crea un token de tarjeta (cardToken)
   * Este token representa la tarjeta sin exponer datos sensibles
   */
  async createCardToken(cardData: {
    cardNumber: string;
    cardholderName: string;
    cardExpirationMonth: string;
    cardExpirationYear: string;
    securityCode: string;
    identificationType: string;
    identificationNumber: string;
  }): Promise<{ id: string }> {
    try {
      const token = await this.mp.createCardToken({
        cardNumber: cardData.cardNumber,
        cardholderName: cardData.cardholderName,
        cardExpirationMonth: cardData.cardExpirationMonth,
        cardExpirationYear: cardData.cardExpirationYear,
        securityCode: cardData.securityCode,
        identificationType: cardData.identificationType,
        identificationNumber: cardData.identificationNumber,
      });
      return token;
    } catch (error) {
      console.error('Error creating card token:', error);
      throw error;
    }
  }

  /**
   * Obtiene métodos de pago disponibles
   */
  async getPaymentMethods(): Promise<any> {
    return this.mp.getPaymentMethods();
  }

  /**
   * Obtiene tipos de documento disponibles
   */
  async getIdentificationTypes(): Promise<any> {
    return this.mp.getIdentificationTypes();
  }
}
```

### 5. Actualizar `card-hold-panel.component.ts`

```typescript
// Agregar imports
import { MercadoPagoService } from '../../../../core/services/mercadopago.service';
import { AuthService } from '../../../../core/services/auth.service';

// En el constructor
constructor(private mpService: MercadoPagoService, private authSvc: AuthService) {}

// Reemplazar onAuthorize()
protected async onAuthorize(): Promise<void> {
  if (!this.userId) {
    this.errorMessage.set('Error: Usuario no identificado');
    this.authorizationStatus.set('failed');
    return;
  }

  this.isLoading.set(true);
  this.errorMessage.set(null);

  try {
    // 1. Obtener email del usuario autenticado
    const user = await this.authSvc.getCurrentUser();
    const payerEmail = user?.email || '';

    if (!payerEmail) {
      throw new Error('No se pudo obtener el email del usuario');
    }

    // 2. TODO: Obtener datos de tarjeta del formulario
    // Por ahora usamos datos de prueba de Mercado Pago Sandbox
    const cardToken = await this.mpService.createCardToken({
      cardNumber: '5031755734530604', // Mastercard de prueba (SANDBOX)
      cardholderName: 'APRO', // Nombre de prueba
      cardExpirationMonth: '11',
      cardExpirationYear: '2025',
      securityCode: '123',
      identificationType: 'DNI',
      identificationNumber: '12345678',
    });

    console.log('Card token created:', cardToken.id);

    // 3. Llamar a authorizePayment con token real
    this.authService
      .authorizePayment({
        userId: this.userId,
        amountUsd: this.riskSnapshot.holdEstimatedUsd,
        amountArs: this.riskSnapshot.holdEstimatedArs,
        fxRate: this.fxSnapshot.rate,
        cardToken: cardToken.id, // ✅ Token real
        payerEmail: payerEmail,   // ✅ Email real
        description: `Preautorización para reserva${this.bookingId ? ` ${this.bookingId}` : ''}`,
        bookingId: this.bookingId,
      })
      .subscribe({
        next: (result) => {
          this.isLoading.set(false);
          if (result.ok && result.authorizedPaymentId) {
            // Éxito
            const authorization: PaymentAuthorization = {
              authorizedPaymentId: result.authorizedPaymentId,
              amountArs: this.riskSnapshot.holdEstimatedArs,
              amountUsd: this.riskSnapshot.holdEstimatedUsd,
              currency: 'ARS',
              expiresAt: result.expiresAt || new Date(),
              status: 'authorized',
              cardLast4: '0604', // Últimos 4 de la tarjeta de prueba
              createdAt: new Date(),
            };
            this.currentAuthSignal.set(authorization);
            this.authorizationStatus.set('authorized');
            this.authorizationChange.emit(authorization);
          } else {
            // Error
            this.errorMessage.set(result.error || 'Error desconocido');
            this.authorizationStatus.set('failed');
            this.authorizationChange.emit(null);
          }
        },
        error: (error) => {
          this.isLoading.set(false);
          this.errorMessage.set(error.message || 'Error de red');
          this.authorizationStatus.set('failed');
          this.authorizationChange.emit(null);
        },
      });
  } catch (error) {
    this.isLoading.set(false);
    const message = error instanceof Error ? error.message : 'Error al crear token de tarjeta';
    this.errorMessage.set(message);
    this.authorizationStatus.set('failed');
  }
}
```

### 6. Tarjetas de Prueba (Sandbox)

Mercado Pago provee tarjetas de prueba para desarrollo:

**Mastercard (APRO - Aprobado)**:
- Número: `5031 7557 3453 0604`
- CVV: `123`
- Fecha: `11/25`
- Nombre: `APRO`
- DNI: `12345678`

**Visa (OTHE - Rechazado por monto)**:
- Número: `4509 9535 6623 3704`
- CVV: `123`
- Fecha: `11/25`
- Nombre: `OTHE`
- DNI: `12345678`

Ver más: https://www.mercadopago.com.ar/developers/es/docs/checkout-api/integration-test/test-cards

### 7. Próximos Pasos

1. **Crear formulario de tarjeta** con validación
2. **Integrar SDK** en el componente
3. **Testing con tarjetas de prueba** (Sandbox)
4. **Producción**: Obtener Public Key real de Mercado Pago
5. **Seguridad**: Validar CVV, expiración, etc.

## Referencias

- **Mercado Pago Docs**: https://www.mercadopago.com.ar/developers/es/docs/checkout-api/integration-configuration/card/integrate-card-payment
- **SDK JS**: https://github.com/mercadopago/sdk-js
- **Test Cards**: https://www.mercadopago.com.ar/developers/es/docs/checkout-api/integration-test/test-cards
- **Public Key**: Panel de Mercado Pago → Credenciales → Public Key

## Notas de Seguridad

⚠️ **NUNCA** envíes datos de tarjeta al backend:
- ✅ Frontend → Mercado Pago SDK → `cardToken`
- ✅ Frontend → Tu Backend con `cardToken`
- ❌ Frontend → Tu Backend con datos de tarjeta raw

El SDK de Mercado Pago tokeniza la tarjeta en el cliente, y solo el token se envía a tu backend.
