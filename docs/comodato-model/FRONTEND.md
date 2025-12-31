# FRONTEND - Cambios en Código

## Resumen
Este documento detalla los cambios necesarios en el código frontend y servicios de Angular.

---

# 1. ESTRUCTURA DE ARCHIVOS

```
apps/web/src/
├── app/
│   ├── features/
│   │   ├── cars/
│   │   │   └── car-form/
│   │   │       └── car-form.component.ts  → Agregar sharing_mode selector
│   │   │
│   │   ├── bookings/
│   │   │   ├── booking-create/
│   │   │   │   └── booking-create.component.ts  → Lógica comodato
│   │   │   │
│   │   │   └── booking-detail/
│   │   │       └── booking-detail.component.ts  → Mostrar tipo acuerdo
│   │   │
│   │   └── owner/
│   │       ├── dashboard/
│   │       │   └── owner-dashboard.component.ts  → Mostrar rewards
│   │       │
│   │       └── rewards/  → NUEVO: Sección de rewards
│   │           ├── rewards.component.ts
│   │           ├── rewards.component.html
│   │           └── rewards.routes.ts
│   │
│   ├── core/
│   │   └── services/
│   │       ├── booking.service.ts  → Agregar agreement_type
│   │       ├── car.service.ts  → Agregar sharing_mode
│   │       └── rewards.service.ts  → NUEVO
│   │
│   └── shared/
│       └── models/
│           ├── booking.model.ts  → Actualizar interface
│           ├── car.model.ts  → Actualizar interface
│           └── community.model.ts  → NUEVO
│
supabase/
└── functions/
    ├── calculate-rewards/  → NUEVO
    │   └── index.ts
    └── process-comodato-payment/  → NUEVO
        └── index.ts
```

---

# 2. MODELOS (Interfaces TypeScript)

## 2.1 `car.model.ts` - Actualizar

```typescript
export interface Car {
  id: string;
  owner_id: string;
  title: string;
  // ... campos existentes ...

  // NUEVOS CAMPOS
  sharing_mode: 'rental' | 'comodato' | 'disabled';
  estimated_daily_cost_cents?: number;
  annual_expense_estimate_cents?: number;
  ytd_earnings_cents: number;
  earnings_limit_reached: boolean;
  last_personal_use_verified_at?: string;
  sharing_suspended_at?: string;
  sharing_suspension_reason?: string;
}
```

## 2.2 `booking.model.ts` - Actualizar

```typescript
export interface Booking {
  id: string;
  car_id: string;
  user_id: string;
  // ... campos existentes ...

  // NUEVOS CAMPOS
  agreement_type: 'rental' | 'comodato';
  comodato_agreement_id?: string;
  reward_pool_contribution_cents: number;
  fgo_contribution_cents: number;
}
```

## 2.3 `community.model.ts` - NUEVO

```typescript
export interface CommunityMembership {
  id: string;
  owner_id: string;
  status: 'active' | 'suspended' | 'expelled';
  tier: 'standard' | 'silver' | 'gold' | 'platinum';
  joined_at: string;
  terms_accepted_at?: string;
  terms_version?: string;
  onboarding_completed: boolean;
}

export interface CommunityReward {
  id: string;
  owner_id: string;
  period_year: number;
  period_month: number;
  availability_points: number;
  rating_points: number;
  seniority_points: number;
  referral_points: number;
  response_time_points: number;
  participation_points: number;
  bonus_points: number;
  penalty_points: number;
  total_points: number;
  amount_cents: number;
  currency: string;
  status: 'pending' | 'calculated' | 'approved' | 'paid' | 'cancelled';
  calculation_details: Record<string, any>;
}

export interface RewardPoolStatus {
  period_year: number;
  period_month: number;
  contributions_cents: number;
  total_available_cents: number;
  total_distributed_cents: number;
  cents_per_point?: number;
  status: 'open' | 'calculating' | 'distributed' | 'closed';
  total_owners: number;
  avg_reward_cents: number;
}

export interface OwnerUsageLimits {
  car_id: string;
  year: number;
  month: number;
  days_shared: number;
  max_days_allowed: number;
  consecutive_days_current: number;
  max_consecutive_allowed: number;
  personal_use_days: number;
  ytd_earnings_cents: number;
  is_blocked: boolean;
  block_reason?: string;
}
```

---

# 3. SERVICIOS

## 3.1 `rewards.service.ts` - NUEVO

```typescript
import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Observable, from, map } from 'rxjs';
import { CommunityReward, RewardPoolStatus, CommunityMembership } from '../models/community.model';

@Injectable({ providedIn: 'root' })
export class RewardsService {
  private supabase = inject(SupabaseService);

  // Obtener membresía del usuario actual
  getMyMembership(): Observable<CommunityMembership | null> {
    return from(
      this.supabase.client
        .from('community_memberships')
        .select('*')
        .single()
    ).pipe(
      map(({ data }) => data)
    );
  }

  // Obtener rewards del usuario actual
  getMyRewards(limit = 12): Observable<CommunityReward[]> {
    return from(
      this.supabase.client
        .from('community_rewards')
        .select('*')
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false })
        .limit(limit)
    ).pipe(
      map(({ data }) => data ?? [])
    );
  }

  // Obtener reward del mes actual
  getCurrentMonthReward(): Observable<CommunityReward | null> {
    const now = new Date();
    return from(
      this.supabase.client
        .from('community_rewards')
        .select('*')
        .eq('period_year', now.getFullYear())
        .eq('period_month', now.getMonth() + 1)
        .single()
    ).pipe(
      map(({ data }) => data)
    );
  }

  // Obtener estado del pool
  getPoolStatus(): Observable<RewardPoolStatus | null> {
    const now = new Date();
    return from(
      this.supabase.client
        .from('v_reward_pool_status')
        .select('*')
        .eq('period_year', now.getFullYear())
        .eq('period_month', now.getMonth() + 1)
        .single()
    ).pipe(
      map(({ data }) => data)
    );
  }

  // Obtener estado de comunidad del owner
  getOwnerCommunityStatus(ownerId: string): Observable<any> {
    return from(
      this.supabase.client
        .from('v_owner_community_status')
        .select('*')
        .eq('owner_id', ownerId)
        .single()
    ).pipe(
      map(({ data }) => data)
    );
  }

  // Obtener límites de uso de un auto
  getCarUsageLimits(carId: string): Observable<any> {
    return from(
      this.supabase.client
        .from('v_car_sharing_status')
        .select('*')
        .eq('car_id', carId)
        .single()
    ).pipe(
      map(({ data }) => data)
    );
  }
}
```

## 3.2 `car.service.ts` - Modificar

```typescript
// Agregar método para actualizar sharing_mode
updateSharingMode(carId: string, mode: 'rental' | 'comodato' | 'disabled'): Observable<Car> {
  return from(
    this.supabase.client
      .from('cars')
      .update({ sharing_mode: mode })
      .eq('id', carId)
      .select()
      .single()
  ).pipe(
    map(({ data }) => data)
  );
}

// Agregar método para actualizar gastos anuales estimados
updateAnnualExpenses(carId: string, expensesCents: number): Observable<Car> {
  return from(
    this.supabase.client
      .from('cars')
      .update({ annual_expense_estimate_cents: expensesCents })
      .eq('id', carId)
      .select()
      .single()
  ).pipe(
    map(({ data }) => data)
  );
}
```

## 3.3 `booking.service.ts` - Modificar

```typescript
// Modificar método de creación para incluir agreement_type
createBooking(booking: Partial<Booking>): Observable<Booking> {
  // El agreement_type viene del sharing_mode del auto
  return from(
    this.supabase.client
      .from('bookings')
      .insert({
        ...booking,
        agreement_type: booking.agreement_type ?? 'comodato' // Default comodato
      })
      .select()
      .single()
  ).pipe(
    map(({ data }) => data)
  );
}
```

---

# 4. COMPONENTES

## 4.1 Car Form - Agregar Sharing Mode Selector

```typescript
// car-form.component.ts - Agregar campo

sharingModeOptions = [
  { value: 'comodato', label: 'Comodato (Préstamo Comunitario)' },
  { value: 'rental', label: 'Alquiler Tradicional' },
  { value: 'disabled', label: 'No Disponible' }
];

// En el template - Agregar selector
```

```html
<!-- car-form.component.html - Agregar sección -->
<div class="form-group">
  <label>Modo de Compartición</label>
  <select formControlName="sharing_mode">
    @for (option of sharingModeOptions; track option.value) {
      <option [value]="option.value">{{ option.label }}</option>
    }
  </select>
  <small class="hint">
    Comodato: Préstamo gratuito con rewards mensuales de la comunidad
  </small>
</div>

@if (form.get('sharing_mode')?.value === 'comodato') {
  <div class="form-group">
    <label>Gastos Anuales Estimados del Vehículo</label>
    <input type="number" formControlName="annual_expense_estimate" placeholder="12000">
    <small class="hint">
      Seguro, patente, mantenimiento, etc. Este es tu límite máximo de rewards anuales.
    </small>
  </div>
}
```

## 4.2 Owner Dashboard - Mostrar Rewards

```typescript
// owner-dashboard.component.ts
import { RewardsService } from '@core/services/rewards.service';

@Component({...})
export class OwnerDashboardComponent {
  private rewardsService = inject(RewardsService);

  membership$ = this.rewardsService.getMyMembership();
  currentReward$ = this.rewardsService.getCurrentMonthReward();
  poolStatus$ = this.rewardsService.getPoolStatus();
}
```

```html
<!-- owner-dashboard.component.html - Agregar sección de rewards -->
<section class="community-rewards">
  <h2>Rewards de Comunidad</h2>

  @if (membership$ | async; as membership) {
    <div class="membership-card">
      <span class="tier">{{ membership.tier | titlecase }}</span>
      <span class="since">Miembro desde {{ membership.joined_at | date:'MMM yyyy' }}</span>
    </div>
  }

  @if (currentReward$ | async; as reward) {
    <div class="current-reward">
      <h3>Este Mes</h3>
      <div class="points">{{ reward.total_points }} puntos</div>

      <div class="breakdown">
        <div>Disponibilidad: {{ reward.availability_points }}</div>
        <div>Rating: {{ reward.rating_points }}</div>
        <div>Antigüedad: {{ reward.seniority_points }}</div>
        <div>Referidos: {{ reward.referral_points }}</div>
        <div>Respuesta: {{ reward.response_time_points }}</div>
      </div>

      @if (reward.status === 'paid') {
        <div class="amount">
          Recibido: {{ reward.amount_cents / 100 | currency:'ARS' }}
        </div>
      }
    </div>
  }

  @if (poolStatus$ | async; as pool) {
    <div class="pool-info">
      <h3>Pool del Mes</h3>
      <div>Total: {{ pool.total_available_cents / 100 | currency:'ARS' }}</div>
      <div>Participantes: {{ pool.total_owners }}</div>
      @if (pool.cents_per_point) {
        <div>Valor por punto: {{ pool.cents_per_point | number:'1.2-2' }} centavos</div>
      }
    </div>
  }
</section>
```

## 4.3 Rewards Page - NUEVO

```typescript
// rewards.component.ts
@Component({
  selector: 'app-rewards',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rewards.component.html'
})
export class RewardsComponent {
  private rewardsService = inject(RewardsService);

  rewards$ = this.rewardsService.getMyRewards();
  membership$ = this.rewardsService.getMyMembership();

  formatMonth(year: number, month: number): string {
    return new Date(year, month - 1).toLocaleDateString('es', {
      month: 'long',
      year: 'numeric'
    });
  }
}
```

```html
<!-- rewards.component.html -->
<div class="rewards-page">
  <h1>Mis Rewards de Comunidad</h1>

  @if (membership$ | async; as membership) {
    <div class="membership-status">
      <div class="tier-badge tier-{{ membership.tier }}">
        {{ membership.tier | titlecase }}
      </div>
      <div class="info">
        <span>Estado: {{ membership.status }}</span>
        <span>Desde: {{ membership.joined_at | date:'dd/MM/yyyy' }}</span>
      </div>
    </div>
  }

  <h2>Historial de Rewards</h2>

  <div class="rewards-list">
    @for (reward of rewards$ | async; track reward.id) {
      <div class="reward-card status-{{ reward.status }}">
        <div class="period">{{ formatMonth(reward.period_year, reward.period_month) }}</div>

        <div class="points-grid">
          <div class="point-item">
            <span class="label">Disponibilidad</span>
            <span class="value">{{ reward.availability_points }}</span>
          </div>
          <div class="point-item">
            <span class="label">Rating</span>
            <span class="value">{{ reward.rating_points }}</span>
          </div>
          <div class="point-item">
            <span class="label">Antigüedad</span>
            <span class="value">{{ reward.seniority_points }}</span>
          </div>
          <div class="point-item">
            <span class="label">Referidos</span>
            <span class="value">{{ reward.referral_points }}</span>
          </div>
          <div class="point-item">
            <span class="label">Respuesta</span>
            <span class="value">{{ reward.response_time_points }}</span>
          </div>
          <div class="point-item total">
            <span class="label">Total</span>
            <span class="value">{{ reward.total_points }}</span>
          </div>
        </div>

        <div class="reward-amount">
          @switch (reward.status) {
            @case ('pending') {
              <span class="status">Pendiente de cálculo</span>
            }
            @case ('calculated') {
              <span class="status">Calculado - Pendiente de pago</span>
            }
            @case ('approved') {
              <span class="amount">{{ reward.amount_cents / 100 | currency:'ARS' }}</span>
              <span class="status">Aprobado</span>
            }
            @case ('paid') {
              <span class="amount">{{ reward.amount_cents / 100 | currency:'ARS' }}</span>
              <span class="status paid">Pagado</span>
            }
          }
        </div>
      </div>
    } @empty {
      <div class="no-rewards">
        Aún no tienes rewards. Sigue participando en la comunidad.
      </div>
    }
  </div>
</div>
```

---

# 5. RUTAS

## 5.1 Agregar Ruta de Rewards

```typescript
// owner.routes.ts - Agregar ruta
export const OWNER_ROUTES: Routes = [
  {
    path: '',
    component: OwnerLayoutComponent,
    children: [
      { path: '', component: OwnerDashboardComponent },
      { path: 'cars', component: OwnerCarsComponent },
      {
        path: 'rewards',
        loadComponent: () => import('./rewards/rewards.component').then(m => m.RewardsComponent)
      },
      // ... otras rutas
    ]
  }
];
```

---

# 6. EDGE FUNCTIONS

## 6.1 `calculate-rewards/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Calcular rewards para todos los owners activos
    const { data, error } = await supabase.rpc('cron_calculate_all_rewards')

    if (error) throw error

    return new Response(
      JSON.stringify({ success: true, owners_processed: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

## 6.2 `process-comodato-payment/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { booking_id } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Procesar pago de booking comodato
    const { data, error } = await supabase.rpc('process_comodato_booking_payment', {
      p_booking_id: booking_id
    })

    if (error) throw error

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

---

# 7. TEXTO UI / COPY

## 7.1 Terminología

| Término Anterior | Nuevo Término |
|------------------|---------------|
| "Alquiler" | "Préstamo" o "Compartir" |
| "Pago al propietario" | "Reward de comunidad" |
| "Tarifa diaria" | "Contribución de servicio" |
| "Ganancias" | "Rewards acumulados" |

## 7.2 Mensajes Importantes

```typescript
export const COMODATO_MESSAGES = {
  SHARING_MODE_INFO:
    'Al compartir tu vehículo en modo Comodato, realizas un préstamo gratuito. ' +
    'Recibirás rewards mensuales basados en tu participación en la comunidad, ' +
    'no relacionados directamente con cada préstamo.',

  NO_DIRECT_PAYMENT:
    'En el modelo de comunidad, no recibes pago por cada préstamo. ' +
    'Los rewards se calculan mensualmente según tu disponibilidad, rating, ' +
    'antigüedad y otros factores.',

  LIMIT_REACHED:
    'Has alcanzado el límite de días de compartición este mes. ' +
    'Esto asegura que tu uso del vehículo se mantenga principalmente personal.',

  ANNUAL_LIMIT:
    'Has alcanzado el límite anual de rewards, equivalente a tus gastos estimados del vehículo. ' +
    'No podrás recibir más rewards este año calendario.'
};
```
