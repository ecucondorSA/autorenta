# Modelo de Participación en Red de Movilidad Compartida

## Resumen Ejecutivo

Este documento describe un modelo alternativo al "alquiler tradicional" donde los propietarios son **participantes de una red de movilidad** y reciben compensación por **disponibilidad**, no únicamente por uso.

---

## 1. Problema con el Modelo Actual

```
┌─────────────────────────────────────────────────────────────┐
│                    MODELO ACTUAL (Alquiler)                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Usuario ──[$100]──► Plataforma ──[$75]──► Propietario    │
│                           │                                 │
│                         [$25]                               │
│                           │                                 │
│                       Comisión                              │
│                                                             │
│   PROBLEMA: Pago directo por uso = LOCACIÓN                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Test legal**: ¿El propietario recibe dinero si su auto NO se usa?
- **Respuesta actual**: NO → Es locación/alquiler

---

## 2. Modelo Propuesto: Red de Movilidad Compartida

```
┌─────────────────────────────────────────────────────────────────────┐
│              MODELO PROPUESTO (Participación en Red)                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                        ┌──────────────┐                             │
│   Usuarios ──[$]──────►│    POOL      │                             │
│   (pagan por acceso    │   COMÚN      │                             │
│    a la red)           │  DE INGRESOS │                             │
│                        └──────┬───────┘                             │
│                               │                                     │
│              ┌────────────────┼────────────────┐                    │
│              │                │                │                    │
│              ▼                ▼                ▼                    │
│        ┌─────────┐      ┌─────────┐      ┌─────────┐               │
│        │ Owner A │      │ Owner B │      │ Owner C │               │
│        │ (usado) │      │(NO usado)│     │ (usado) │               │
│        │  $350   │      │  $280   │      │  $120   │               │
│        └─────────┘      └─────────┘      └─────────┘               │
│              ▲                ▲                ▲                    │
│              │                │                │                    │
│              └────────────────┴────────────────┘                    │
│                    Distribución por                                 │
│                    PARTICIPACIÓN                                    │
│                    (no solo por uso)                                │
│                                                                     │
│   ✅ Owner B recibe $280 aunque su auto NO se usó                  │
│   ✅ Rompe el vínculo directo uso → pago                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Test legal**: ¿El propietario recibe dinero si su auto NO se usa?
- **Respuesta nueva**: SÍ → No es locación directa, es participación en red

---

## 3. Fórmula de Distribución

### 3.1 Variables de Participación

| Variable | Símbolo | Descripción | Peso |
|----------|---------|-------------|------|
| Tiempo Disponible | `Td` | Horas que el auto estuvo disponible en la red | 40% |
| Factor Ubicación | `Fu` | Demanda histórica de la zona | 25% |
| Factor Vehículo | `Fv` | Categoría y estado del vehículo | 15% |
| Calificación | `Fc` | Rating promedio del propietario | 10% |
| Bonus por Uso | `Bu` | Incentivo adicional si se usó (NO es el único factor) | 10% |

### 3.2 Cálculo de Puntos de Participación

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FÓRMULA DE PARTICIPACIÓN                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Puntos = (Td × 0.40) + (Fu × 0.25) + (Fv × 0.15)                 │
│          + (Fc × 0.10) + (Bu × 0.10)                                │
│                                                                     │
│   Donde:                                                            │
│   • Td = horasDisponibles / horasTotalesMes × 100                  │
│   • Fu = demandaZona (0.5 a 2.0)                                   │
│   • Fv = categoriaVehiculo (1.0 a 1.5)                             │
│   • Fc = rating (1.0 a 5.0) / 5 × 100                              │
│   • Bu = diasUsado / diasDisponibles × 100 (máx 100)               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.3 Distribución del Pool

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DISTRIBUCIÓN MENSUAL                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Pool Total = Σ (todas las contribuciones del mes)                │
│                                                                     │
│   ┌─────────────────────────────────────────────────────┐          │
│   │                   POOL: $10,000                     │          │
│   └─────────────────────────────────────────────────────┘          │
│                            │                                        │
│              ┌─────────────┴─────────────┐                         │
│              ▼                           ▼                          │
│   ┌─────────────────────┐     ┌─────────────────────┐              │
│   │   PLATAFORMA 25%    │     │  PARTICIPANTES 75%  │              │
│   │      $2,500         │     │      $7,500         │              │
│   │                     │     │                     │              │
│   │ • Tecnología        │     │ Distribuido según   │              │
│   │ • Seguros           │     │ puntos de cada      │              │
│   │ • Soporte           │     │ participante        │              │
│   │ • Legal             │     │                     │              │
│   └─────────────────────┘     └─────────────────────┘              │
│                                         │                           │
│                    ┌────────────────────┼────────────────────┐      │
│                    ▼                    ▼                    ▼      │
│              ┌──────────┐        ┌──────────┐        ┌──────────┐  │
│              │ Owner A  │        │ Owner B  │        │ Owner C  │  │
│              │ 45 pts   │        │ 38 pts   │        │ 17 pts   │  │
│              │          │        │          │        │          │  │
│              │ $3,375   │        │ $2,850   │        │ $1,275   │  │
│              └──────────┘        └──────────┘        └──────────┘  │
│                   ▲                   ▲                   ▲        │
│                   │                   │                   │        │
│               AUTO USADO         AUTO NO USADO       AUTO USADO    │
│               15 días            0 días              10 días       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Ejemplo Detallado de Cálculo

### Datos del Mes

| Métrica | Valor |
|---------|-------|
| Pool total recaudado | $10,000 USD |
| Porcentaje participantes | 75% |
| Pool para participantes | $7,500 USD |
| Total horas del mes | 720 horas |

### Participante A: Auto Usado

| Variable | Valor | Cálculo | Puntos |
|----------|-------|---------|--------|
| Tiempo Disponible | 720h (100%) | 100 × 0.40 | 40.0 |
| Factor Ubicación | Palermo (1.8) | 1.8 × 25 | 45.0 |
| Factor Vehículo | SUV (1.3) | 1.3 × 15 | 19.5 |
| Calificación | 4.8/5 | (4.8/5 × 100) × 0.10 | 9.6 |
| Bonus por Uso | 15/30 días (50%) | 50 × 0.10 | 5.0 |
| **TOTAL** | | | **119.1** |

### Participante B: Auto NO Usado

| Variable | Valor | Cálculo | Puntos |
|----------|-------|---------|--------|
| Tiempo Disponible | 720h (100%) | 100 × 0.40 | 40.0 |
| Factor Ubicación | Belgrano (1.4) | 1.4 × 25 | 35.0 |
| Factor Vehículo | Sedan (1.0) | 1.0 × 15 | 15.0 |
| Calificación | 4.5/5 | (4.5/5 × 100) × 0.10 | 9.0 |
| Bonus por Uso | 0/30 días (0%) | 0 × 0.10 | 0.0 |
| **TOTAL** | | | **99.0** |

### Participante C: Auto Usado Parcialmente

| Variable | Valor | Cálculo | Puntos |
|----------|-------|---------|--------|
| Tiempo Disponible | 360h (50%) | 50 × 0.40 | 20.0 |
| Factor Ubicación | Zona Sur (0.8) | 0.8 × 25 | 20.0 |
| Factor Vehículo | Económico (0.9) | 0.9 × 15 | 13.5 |
| Calificación | 4.2/5 | (4.2/5 × 100) × 0.10 | 8.4 |
| Bonus por Uso | 10/15 días (67%) | 67 × 0.10 | 6.7 |
| **TOTAL** | | | **68.6** |

### Distribución Final

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DISTRIBUCIÓN DEL MES                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Total Puntos = 119.1 + 99.0 + 68.6 = 286.7 puntos                │
│   Pool Participantes = $7,500 USD                                   │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │  PARTICIPANTE A (usado 15 días)                             │  │
│   │  Puntos: 119.1 / 286.7 = 41.5%                              │  │
│   │  Recibe: $7,500 × 0.415 = $3,115 USD                        │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │  PARTICIPANTE B (NO usado, 0 días)                          │  │
│   │  Puntos: 99.0 / 286.7 = 34.5%                               │  │
│   │  Recibe: $7,500 × 0.345 = $2,590 USD  ◄── RECIBE SIN USO   │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │  PARTICIPANTE C (usado 10 días)                             │  │
│   │  Puntos: 68.6 / 286.7 = 23.9%                               │  │
│   │  Recibe: $7,500 × 0.239 = $1,795 USD                        │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│   VERIFICACIÓN: $3,115 + $2,590 + $1,795 = $7,500 ✓               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Resultado Clave

| Participante | Días Usado | Recibe | Observación |
|--------------|------------|--------|-------------|
| A | 15 días | $3,115 | Mayor por ubicación premium |
| **B** | **0 días** | **$2,590** | **Recibe sin uso - CLAVE LEGAL** |
| C | 10 días | $1,795 | Menor por disponibilidad parcial |

---

## 5. Cambios en Terminología

### 5.1 Términos a Reemplazar

| Término Actual | Término Nuevo | Justificación |
|----------------|---------------|---------------|
| Alquiler | Contribución de movilidad | No es pago por uso directo |
| Precio por día | Contribución diaria | Es aporte a la red |
| Propietario | Participante / Anfitrión | Es miembro de la red |
| Inquilino | Usuario de la red | Accede a la red, no alquila |
| Ingreso por alquiler | Retorno por participación | No es renta, es retorno |
| Comisión | Cuota de gestión de red | Servicio de coordinación |
| Reserva | Solicitud de acceso | Acceso a vehículo de la red |

### 5.2 Flujo Conceptual Nuevo

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FLUJO CONCEPTUAL                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ANTES (Alquiler):                                                │
│   "Juan alquila el auto de María por $50/día"                      │
│                                                                     │
│   DESPUÉS (Red de Movilidad):                                      │
│   "Juan accede a la red de movilidad compartida.                   │
│    María participa en la red aportando disponibilidad.             │
│    La red distribuye los ingresos entre todos los participantes."  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. Implicaciones Legales y Fiscales

### 6.1 Argumentos a Favor

| Aspecto | Argumento |
|---------|-----------|
| **Naturaleza jurídica** | No es cesión de uso (locación) sino participación en red |
| **Contraprestación** | No hay vínculo directo pago ↔ uso específico |
| **Precedentes** | Similar a cooperativas, pools de activos, capacity payments |
| **Test de disponibilidad** | Participante recibe aún sin uso → no es alquiler |

### 6.2 Documentación Necesaria

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ESTRUCTURA CONTRACTUAL                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   1. CONTRATO USUARIO ↔ PLATAFORMA                                 │
│      • Usuario contrata "acceso a red de movilidad"                │
│      • NO contrata con el propietario                              │
│      • Paga "contribución de movilidad"                            │
│                                                                     │
│   2. CONTRATO PARTICIPANTE ↔ PLATAFORMA                            │
│      • Participante "aporta disponibilidad de vehículo"            │
│      • Recibe "retorno por participación en la red"                │
│      • NO es contrato de alquiler ni cesión de uso                 │
│                                                                     │
│   3. TÉRMINOS DE SERVICIO                                          │
│      • Definen la naturaleza de "red de movilidad compartida"      │
│      • Explican el modelo de distribución                          │
│      • Aclaran que NO es servicio de alquiler tradicional          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.3 Facturación

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MODELO DE FACTURACIÓN                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   PLATAFORMA → USUARIO:                                            │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │  Concepto: Servicio de acceso a red de movilidad compartida │  │
│   │  Período: 15-18 Enero 2026                                  │  │
│   │  Importe: $150 USD                                          │  │
│   │  (NO dice "alquiler de vehículo")                           │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│   PLATAFORMA → PARTICIPANTE:                                       │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │  Concepto: Retorno por participación en red - Enero 2026    │  │
│   │  Puntos acumulados: 99.0                                    │  │
│   │  Porcentaje del pool: 34.5%                                 │  │
│   │  Importe: $2,590 USD                                        │  │
│   │  (NO dice "ingreso por alquiler")                           │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 7. Diseño de UI para el Dashboard del Participante

### 7.1 Vista Mensual del Participante

```
┌─────────────────────────────────────────────────────────────────────┐
│  🚗 Mi Participación en la Red                      Enero 2026     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │   DISPONIBILIDAD │  │  MIS PUNTOS      │  │  MI RETORNO      │  │
│  │                  │  │                  │  │                  │  │
│  │     720 hrs      │  │     99.0 pts     │  │   $2,590 USD     │  │
│  │     100%         │  │   34.5% del pool │  │                  │  │
│  │                  │  │                  │  │                  │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                     │
│  ════════════════════════════════════════════════════════════════  │
│                                                                     │
│  📊 Desglose de Puntos                                             │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │                                                             │   │
│  │  Tiempo Disponible (40%)     ████████████████████  40.0 pts │   │
│  │  Factor Ubicación (25%)      ██████████████        35.0 pts │   │
│  │  Factor Vehículo (15%)       ██████                15.0 pts │   │
│  │  Calificación (10%)          █████                  9.0 pts │   │
│  │  Bonus por Uso (10%)         ░░░░░                  0.0 pts │   │
│  │                              ─────────────────────────────  │   │
│  │  TOTAL                                              99.0 pts │   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  💡 Tu auto no fue seleccionado este mes, pero tu disponibilidad   │
│     contribuyó a la red y generaste retorno por participación.     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.2 Vista del Pool General

```
┌─────────────────────────────────────────────────────────────────────┐
│  🌐 Estado de la Red de Movilidad                   Enero 2026     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Pool Total del Mes                                                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                             │   │
│  │      $10,000 USD                                            │   │
│  │      ══════════════════════════════════════════════════     │   │
│  │      ████████████████████████████████░░░░░░░░░░░░░░░░░     │   │
│  │      ├── Participantes: $7,500 (75%)                        │   │
│  │      └── Gestión Red: $2,500 (25%)                          │   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Participantes Activos: 3                                          │
│  Total Puntos Red: 286.7                                           │
│  Vehículos Disponibles: 3                                          │
│  Usuarios Atendidos: 12                                            │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Distribución por Participante                              │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │                                                             │   │
│  │  🚙 Toyota Corolla (Palermo)                                │   │
│  │     119.1 pts │ ████████████████████████  │ $3,115 (41.5%)  │   │
│  │     Usado: 15 días                                          │   │
│  │                                                             │   │
│  │  🚗 Ford Focus (Belgrano)              ◄── TU VEHÍCULO      │   │
│  │     99.0 pts  │ ████████████████████      │ $2,590 (34.5%)  │   │
│  │     Usado: 0 días                                           │   │
│  │                                                             │   │
│  │  🚙 Chevrolet Onix (Zona Sur)                               │   │
│  │     68.6 pts  │ ██████████████            │ $1,795 (23.9%)  │   │
│  │     Usado: 10 días                                          │   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 8. Cambios Necesarios en booking-detail-payment

### 8.1 Sección de Precio Actualizada

```html
<!-- ANTES -->
<div class="price-breakdown">
  <h3>Total del Alquiler</h3>
  <p>Precio por día: USD 50</p>
  <p>Días: 3</p>
  <p>Total: USD 150</p>
</div>

<!-- DESPUÉS -->
<div class="contribution-breakdown">
  <h3>Contribución de Movilidad</h3>

  <div class="info-banner">
    <p>Tu contribución se suma al pool mensual de la red y se
       distribuye entre todos los participantes según su aporte
       de disponibilidad.</p>
  </div>

  <div class="breakdown">
    <div class="line-item">
      <span>Contribución diaria</span>
      <span>USD 50</span>
    </div>
    <div class="line-item">
      <span>Días de acceso</span>
      <span>3</span>
    </div>
    <div class="line-item separator">
      <span>Subtotal contribución</span>
      <span>USD 150</span>
    </div>
    <div class="line-item">
      <span>Protección y asistencia</span>
      <span>Incluida</span>
    </div>
    <div class="line-item total">
      <span>Total Contribución</span>
      <span>USD 150</span>
    </div>
  </div>

  <div class="distribution-note">
    <p><strong>¿Cómo se distribuye?</strong></p>
    <ul>
      <li>75% → Pool de participantes (por disponibilidad)</li>
      <li>25% → Gestión de la red (seguros, soporte, tecnología)</li>
    </ul>
  </div>
</div>
```

### 8.2 Banner de Naturaleza del Acuerdo (Actualizado)

```html
<section class="legal-nature-banner">
  <div class="icon">📋</div>
  <div class="content">
    <h4>Naturaleza del Acuerdo</h4>
    <p>
      Estás accediendo a la <strong>Red de Movilidad Compartida</strong>
      de AutoRenta. Esta no es una relación de alquiler tradicional.
    </p>
    <ul>
      <li>Los participantes (propietarios) aportan disponibilidad de vehículos</li>
      <li>Los usuarios (vos) aportan contribuciones de movilidad</li>
      <li>La red distribuye los ingresos según participación, no solo por uso</li>
    </ul>
    <p class="legal-note">
      Cada participante es responsable de sus obligaciones fiscales
      según su situación ante AFIP.
    </p>
  </div>
</section>
```

---

## 9. Implementación Técnica

### 9.1 Modelo de Datos

```typescript
// types/participation.ts

interface ParticipationMetrics {
  participantId: string;
  vehicleId: string;
  period: {
    month: number;
    year: number;
  };

  // Métricas de participación
  availableHours: number;      // Horas disponible
  totalHoursInPeriod: number;  // Total horas del período
  locationFactor: number;      // 0.5 - 2.0
  vehicleFactor: number;       // 0.9 - 1.5
  rating: number;              // 1.0 - 5.0
  daysUsed: number;            // Días efectivamente usado
  daysAvailable: number;       // Días marcado como disponible

  // Puntos calculados
  points: {
    availability: number;      // 40% peso
    location: number;          // 25% peso
    vehicle: number;           // 15% peso
    rating: number;            // 10% peso
    usageBonus: number;        // 10% peso
    total: number;
  };

  // Distribución
  poolShare: number;           // Porcentaje del pool
  earnings: number;            // Retorno en USD
}

interface MonthlyPool {
  period: {
    month: number;
    year: number;
  };
  totalContributions: number;  // Total recaudado
  platformShare: number;       // 25%
  participantsShare: number;   // 75%
  totalPoints: number;         // Suma de puntos de todos
  participants: ParticipationMetrics[];
}
```

### 9.2 Servicio de Cálculo

```typescript
// services/participation-calculator.service.ts

@Injectable({ providedIn: 'root' })
export class ParticipationCalculatorService {

  private readonly WEIGHTS = {
    availability: 0.40,
    location: 0.25,
    vehicle: 0.15,
    rating: 0.10,
    usageBonus: 0.10
  };

  calculatePoints(metrics: ParticipationMetrics): number {
    const availabilityScore =
      (metrics.availableHours / metrics.totalHoursInPeriod) * 100;

    const usageBonusScore = metrics.daysAvailable > 0
      ? (metrics.daysUsed / metrics.daysAvailable) * 100
      : 0;

    const ratingScore = (metrics.rating / 5) * 100;

    return (
      (availabilityScore * this.WEIGHTS.availability) +
      (metrics.locationFactor * 25 * this.WEIGHTS.location) +
      (metrics.vehicleFactor * 15 * this.WEIGHTS.vehicle) +
      (ratingScore * this.WEIGHTS.rating) +
      (usageBonusScore * this.WEIGHTS.usageBonus)
    );
  }

  distributePool(pool: MonthlyPool): ParticipationMetrics[] {
    const participantsPool = pool.totalContributions * 0.75;

    // Calcular puntos totales
    let totalPoints = 0;
    pool.participants.forEach(p => {
      p.points.total = this.calculatePoints(p);
      totalPoints += p.points.total;
    });

    // Distribuir según puntos
    pool.participants.forEach(p => {
      p.poolShare = p.points.total / totalPoints;
      p.earnings = participantsPool * p.poolShare;
    });

    return pool.participants;
  }
}
```

---

## 10. Resumen Ejecutivo

### Lo que cambia

| Aspecto | Modelo Actual | Modelo Propuesto |
|---------|---------------|------------------|
| **Relación legal** | Locación (alquiler) | Participación en red |
| **Flujo de dinero** | Usuario → Propietario | Usuario → Pool → Participantes |
| **Base de pago** | Días de uso | Puntos de participación |
| **Si no se usa** | Propietario no recibe | Propietario SÍ recibe |
| **Terminología** | Alquiler, precio, renta | Contribución, participación, retorno |

### Beneficios

1. **Legal**: Argumento sólido de que no es locación
2. **Fiscal**: Base para tratamiento diferente ante AFIP
3. **Seguro**: Propietario "participa en red", no "alquila comercialmente"
4. **Comunidad**: Incentiva mantener autos disponibles

### Riesgos

1. Requiere implementación técnica real (no solo cosmética)
2. AFIP podría cuestionar si es "esquema artificioso"
3. Necesita validación legal formal

---

## 11. Próximos Pasos

- [ ] Validación legal con abogado especializado
- [ ] Consulta tributaria con contador
- [ ] Diseño técnico detallado del sistema de puntos
- [ ] Actualización de contratos y términos de servicio
- [ ] Implementación del dashboard de participación
- [ ] Actualización de UI en booking-detail-payment
