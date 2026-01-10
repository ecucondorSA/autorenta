# Plan de Implementación: Modelo de Participación en Red de Movilidad (Network Participation Model)

Este plan detalla la transformación de AutoRenta de un modelo de "Alquiler Tradicional" (jurídicamente riesgoso como Locación encubierta) a un modelo de "Red de Movilidad Compartida" basado en la figura legal del **Negocio en Participación (Art. 1448 CCyC de Argentina)**.

## 1. Fundamentación Legal y Estructural

### 1.1 El Problema Raíz
El modelo actual (Pago por uso directo) califica ineludiblemente como **Locación de Cosas (Art. 1187 CCyC)**. Esto implica:
- Responsabilidad objetiva y subjetiva directa del dueño.
- Exclusión automática de seguros particulares (uso comercial).
- Obligaciones fiscales de "locador" para el dueño.

### 1.2 La Solución: Negocio en Participación (Art. 1448 CCyC)
Adoptaremos la figura de **Negocio en Participación**, un contrato asociativo donde:
- **Gestor (AutoRenta):** Actúa frente a terceros (Usuarios), administra el fondo común (Pool), emite facturas y contrata el seguro flotante. Responsabilidad ilimitada ante terceros por la gestión.
- **Partícipes (Propietarios):** Aportan "disponibilidad de rodados" al negocio común. No tienen acción directa frente a terceros (Usuarios). Su riesgo se limita a su aporte (el uso del vehículo). Reciben "resultados" (ganancias del pool), no "alquileres".

**Ventaja Clave:** Al desvincular el ingreso del uso específico, se rompe la relación directa de "precio por cosa" típica de la locación. El propietario cobra por *participar en la red*, incluso si el auto no se mueve (siempre que esté disponible).

---

## 2. Cambios en el Modelo de Datos

### 2.1 Nueva Entidad: `ParticipationPeriod`
Rastreará el rendimiento de cada vehículo mensualmente.

```typescript
// src/app/core/models/participation.model.ts

export interface ParticipationPeriod {
  id: string; // uuid
  car_id: string;
  owner_id: string;
  period: string; // '2026-01'

  // Métricas Base
  total_hours_in_period: number; // 720h o 744h
  available_hours: number;       // Horas que el auto estuvo OFERTA
  days_used: number;            // Días con bookings efectivos

  // Factores (Snapshot al cierre del mes)
  location_factor: number;      // 0.5 - 2.0 (basado en demanda de zona)
  vehicle_category_factor: number; // 1.0 - 1.5 (Gama)
  owner_rating_at_close: number;   // 1.0 - 5.0

  // Cálculo de Puntos
  points_availability: number;
  points_location: number;
  points_vehicle: number;
  points_rating: number;
  points_usage_bonus: number;
  total_points: number;

  // Resultado Financiero
  pool_share_percentage: number; // % del pool general
  earnings_usd: number;          // Monto a liquidar
  status: 'open' | 'calculated' | 'paid';
}
```

### 2.2 Nueva Entidad: `NetworkPool`
Gestión del fondo común mensual.

```typescript
export interface NetworkPool {
  id: string;
  period: string; // '2026-01'
  total_revenue_usd: number;     // Recaudación bruta (Contribuciones de usuarios)
  platform_fee_percentage: number; // e.g., 25% (Cubre seguro + tec)
  platform_revenue_usd: number;
  distributable_revenue_usd: number; // 75% para partícipes
  total_network_points: number;    // Suma de puntos de todos los partícipes
  status: 'collecting' | 'closed' | 'distributed';
}
```

---

## 3. Implementación Lógica (Backend/Edge Functions)

### 3.1 Edge Function: `calculate-participation-points`
**Trigger:** Cron job diario (actualización parcial) + Cierre mensual.
**Lógica:**
1. Leer `bookings` del mes para calcular `days_used`.
2. Leer `car_availability_logs` (nueva tabla necesaria o inferida) para `available_hours`.
3. Aplicar fórmula:
   ```typescript
   const Puntos = (Td * 0.40) + (Fu * 0.25) + (Fv * 0.15) + (Fc * 0.10) + (Bu * 0.10);
   ```

### 3.2 Edge Function: `distribute-monthly-pool`
**Trigger:** Día 1 del mes siguiente.
**Lógica:**
1. Sumar `total_revenue_usd` de todas las transacciones `capture` del mes.
2. Calcular `distributable = total * 0.75`.
3. Sumar `total_network_points`.
4. Para cada `ParticipationPeriod`:
   - `share = total_points / total_network_points`
   - `earnings = distributable * share`
5. Generar registros de `payouts` pendientes.

---

## 4. Cambios en la Interfaz de Usuario (Frontend)

### 4.1 "Booking Detail" -> "Access Detail"
**Archivo:** `src/app/features/bookings/detail/booking-detail.page.html`
- **Reemplazar:** Terminología de "Precio x Día" y "Alquiler".
- **Añadir:** Componente `ContributionBreakdown` (como solicitado).
- **Añadir:** Banner legal explicativo "Naturaleza del Acuerdo" (Negocio en Participación).

### 4.2 Dashboard de Propietario (Owner Dashboard)
**Archivo:** `src/app/features/dashboard/owner/owner-dashboard.page.html`
- **Nuevo Widget:** "Mi Participación en la Red".
  - Gráfico de barras o radial con los 5 factores de puntos.
  - Indicador de "Puntos Acumulados" y "Estimación de Retorno" en tiempo real.
- **Visualización:** Diferenciar claramente que el dinero proviene del POOL, no de un usuario específico.

---

## 5. Estrategia de Blindaje (Counter-Attack Strategy)

Ante el desafío de la asegurabilidad individual, adoptamos una estrategia ofensiva basada en precedentes de mercado y leyes de economía social.

### 5.1 Adquisición de Póliza Flota (The Sura Route)
**Precedente:** Ebes (operativo desde 2018 con Sura).
**Acción:** Negociación corporativa directa.
- **Objetivo:** Póliza Flota para "Vehículos en Uso Compartido".
- **Argumento:** "Replicar el modelo Ebes".
- **Plan B (Insurtech):** Contactar a **Me Curo** y **Cover Genius** para seguros on-demand.

### 5.2 Estructuración del FGO como Mutual (Ley 20.321)
Para blindar el Fondo de Garantía Operativa ante acusaciones de "seguro ilegal":
- **Figura Legal:** El FGO se constituirá o operará bajo mandato de una **Asociación Mutual** (propia o alianza).
- **Marco Legal:** Ley 20.321, Art 4 (Ayuda Recíproca ante Riesgos Eventuales).
- **Terminología Obligatoria:**
  - Prima -> "Aporte Solidario".
  - Siniestro -> "Evento Contingente".
  - Cobertura -> "Subsidio de Ayuda".

---

## 6. Pasos de Ejecución Inmediata

1.  **Dossier de Negociación:** Preparar documento técnico para presentar a Sura/Insurtechs demostrando la reducción de riesgo por tecnología (trackers, scoring de usuarios).
2.  **Refactor Legal FGO:** Reescribir TyC del FGO eliminando términos de seguros y adoptando nomenclátor mutualista.
3.  **Implementación Técnica:**
    - Edge Functions de Puntos (mantener modelo Network Participation).
    - UI Dashboard: Mostrar métricas de "Participación" para reforzar el modelo legal ante la aseguradora (demostrar que no es simple alquiler).

