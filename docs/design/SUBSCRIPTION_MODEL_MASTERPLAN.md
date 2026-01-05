# Masterplan: Modelo de Suscripción "Autorentar Club" (Wallet v2)

> **Resumen:** Implementación de un modelo de membresía anual (ej. $300 USD) que actúa como un "Fondo de Garantía Prepago". Esto elimina la necesidad de bloquear cupo en la tarjeta de crédito del usuario por cada alquiler, reduciendo la fricción y mejorando la conversión.

---

## 1. Definición del Modelo de Negocio

### 1.1 Concepto Legal (Compatibilidad con Comodato)
Para mantener la integridad del modelo de Comodato (préstamo de uso), esta suscripción **NO es un seguro**.
*   **Terminología Correcta:** "Membresía de Garantía Simplificada" o "Fondo de Garantía Prepago".
*   **Funcionamiento:** El usuario deposita un saldo anual (ej. $300). Este saldo garantiza el cumplimiento de sus obligaciones (devolver el auto en estado original).
*   **Diferencia con Seguro:** Un seguro transfiere el riesgo a un tercero. Aquí, el usuario sigue siendo responsable, pero "prepaga" su responsabilidad hasta el monto de su saldo.

### 1.2 Mecánica Financiera (Saldo Agotable)
El modelo se basa en un **Saldo de Cobertura Agotable**:
1.  **Suscripción:** Usuario paga $300 USD/año.
2.  **Booking:** Al reservar, el depósito de garantía requerido es **$0** (mientras `saldo_cobertura > franquicia_auto`).
3.  **Siniestro:** Si hay daños, se descuentan del "Saldo de Cobertura".
    *   *Caso A:* Daño de $100. Saldo restante: $200. La suscripción sigue activa.
    *   *Caso B:* Daño de $500. Saldo disponible: $300. Se agota el saldo ($0) y el usuario debe pagar los $200 restantes.
4.  **Agotamiento:** Si el saldo llega a 0, la suscripción se suspende hasta que el usuario "recargue" el fondo.

---

## 2. Arquitectura de Base de Datos

Necesitamos estructurar la persistencia para separar el dinero "Cash" (Wallet normal) del dinero "Cobertura" (Suscripción).

### 2.1 Nueva Tabla: `subscriptions`
```sql
CREATE TYPE subscription_status AS ENUM ('active', 'inactive', 'depleted', 'expired');
CREATE TYPE subscription_tier AS ENUM ('club_basic', 'club_prime');

CREATE TABLE public.subscriptions (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    tier subscription_tier DEFAULT 'club_prime',
    status subscription_status DEFAULT 'active',
    
    -- Finanzas
    total_amount_cents bigint NOT NULL,      -- Monto original pagado (ej. 30000 cents)
    remaining_balance_cents bigint NOT NULL, -- Saldo disponible para cubrir daños
    currency text DEFAULT 'USD',
    
    -- Vigencia
    starts_at timestamptz DEFAULT now(),
    expires_at timestamptz NOT NULL,         -- 1 año desde starts_at
    
    -- Metadatos
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Índices para búsqueda rápida en el checkout
CREATE INDEX idx_subscriptions_user_status ON subscriptions(user_id, status) 
WHERE status = 'active';
```

### 2.2 Nueva Tabla: `subscription_usage_logs`
Auditoría de cómo se consume el saldo de la suscripción.

```sql
CREATE TABLE public.subscription_usage_logs (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    subscription_id uuid REFERENCES subscriptions(id) NOT NULL,
    booking_id uuid REFERENCES bookings(id), -- Booking relacionado
    claim_id uuid,                           -- Si fue por un siniestro
    
    amount_deducted_cents bigint NOT NULL,
    reason text NOT NULL,                    -- 'claim_deduction', 'admin_adjustment'
    balance_before_cents bigint NOT NULL,
    balance_after_cents bigint NOT NULL,
    
    created_at timestamptz DEFAULT now()
);
```

---

## 3. Lógica de Integración (Backend & Frontend)

### 3.1 Modificación del Checkout (Booking Flow)
El cambio más crítico ocurre al calcular el desglose de precios y requerimientos.

**Lógica Actual (`BookingOpsService`):**
```typescript
deposit_required = car.franchise_value; // Ej: $500
```

**Nueva Lógica:**
```typescript
// Pseudo-código
async function calculateDeposit(user, car) {
  const subscription = await getActiveSubscription(user.id);
  
  if (subscription && subscription.remaining_balance >= car.franchise_value) {
    return {
      amount: 0,
      coveredBy: 'autorentar_club',
      coverageBalance: subscription.remaining_balance
    };
  } else {
    return {
      amount: car.franchise_value, // $500
      coveredBy: 'credit_card_hold'
    };
  }
}
```

### 3.2 Modificación de la Wallet (UI)
La pantalla de Wallet debe evolucionar para mostrar dos estados.

**Estado A: Usuario Sin Suscripción**
*   **Banner Promocional:** "Olvídate de los depósitos de garantía. Únete al Club Autorentar por $300/año."
*   **Simulador:** "¿Cuánto gastas en bloqueos de tarjeta? Ahorra con el Club."

**Estado B: Usuario Suscripto**
*   **Tarjeta Digital "Club Member":** Diseño premium (Dorado/Negro).
*   **Barra de "Cobertura Disponible":** Muestra visualmente los $300 (o lo que quede).
*   **Historial:** Lista filtrada mostrando solo deducciones por uso/siniestros.

### 3.3 Gestión de Siniestros (Claims)
Cuando un dueño reporta un daño y se aprueba:
1.  El sistema verifica si el Renter tiene suscripción activa.
2.  Si `SI`: Se crea un registro en `subscription_usage_logs` y se resta de `subscriptions.remaining_balance_cents`.
3.  Si el saldo llega a 0, se actualiza `subscriptions.status = 'depleted'`.

---

## 4. Guía de Implementación Paso a Paso

### Fase 1: Cimientos (Backend)
- [ ] Crear migraciones SQL para `subscriptions` y `subscription_usage_logs`.
- [ ] Actualizar `database.types.ts` en el frontend.
- [ ] Crear Políticas RLS (Row Level Security):
    - El usuario solo puede ver su propia suscripción.
    - Solo el sistema (funciones admin) puede modificar el saldo.

### Fase 2: Servicios Core (Frontend)
- [ ] Crear `SubscriptionService`:
    - `getActiveSubscription()`
    - `subscribe()` (Integración con MercadoPago/Stripe para el cobro de los $300).
    - `getUsageHistory()`
- [ ] Actualizar `WalletService` para incluir datos de suscripción en el resumen.

### Fase 3: Integración en Checkout
- [ ] Modificar `BookingOpsService.getPaymentBreakdown`.
- [ ] Actualizar componente UI `booking-pricing-breakdown` para mostrar "Depósito: $0 (Cubierto por Club)".
- [ ] Actualizar lógica de validación de pago: Permitir avanzar sin pago de depósito si está cubierto.

### Fase 4: UI de Wallet & Venta
- [ ] Diseñar componente `ClubMembershipCard`.
- [ ] Crear flujo de compra de suscripción dentro de la Wallet.
- [ ] Implementar vista de detalles de consumo.

---

## 5. Reglas de Negocio Críticas (Guardrails)

1.  **Exclusividad de Cobertura:** El saldo de la suscripción SOLO cubre la franquicia (deducible). Daños superiores a la franquicia siguen siendo responsabilidad del usuario (o del seguro del auto, según corresponda).
2.  **No Reembolsable:** La cuota de membresía ($300) no se devuelve si no se usa. Es el costo de tener la disponibilidad de la garantía.
3.  **Renovación:** No automática por defecto (para evitar problemas de contracargos). El usuario renueva manualmente o al agotarse el saldo.
4.  **Suspensión:** Si un usuario tiene un comportamiento de riesgo (ej. 2 siniestros en 1 mes), Autorenta se reserva el derecho de cancelar la suscripción unilateralmente (devolviendo el saldo restante prorrateado si aplica).

