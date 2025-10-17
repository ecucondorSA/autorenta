# 🌟 Plan de Implementación: Sistema de Reviews Estilo Airbnb

## 📋 Índice

1. [Arquitectura General](#arquitectura-general)
2. [Base de Datos (Capa 1)](#base-de-datos)
3. [Backend Services (Capa 2)](#backend-services)
4. [Frontend Components (Capa 3)](#frontend-components)
5. [Lógica de Negocio](#logica-de-negocio)
6. [Sistema de Badges](#sistema-de-badges)
7. [Roadmap de Implementación](#roadmap)

---

## 🏗️ Arquitectura General {#arquitectura-general}

### Flujo del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│  1. RESERVA FINALIZADA (checkout)                           │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  2. PERÍODO DE REVIEW (14 días)                             │
│     - Ambas partes pueden calificar                         │
│     - Reviews en estado "pending"                           │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  3. PUBLICACIÓN                                             │
│     - Si ambos califican → publicar ambas                   │
│     - Si solo uno califica → publicar al vencer 14 días     │
│     - Si nadie califica → cerrar período sin publicación    │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  4. CÁLCULO DE PROMEDIOS                                    │
│     - Actualizar ratings del usuario                        │
│     - Actualizar ratings del auto                           │
│     - Calcular badges (Top Host, etc.)                      │
└─────────────────────────────────────────────────────────────┘
```

### Principios Clave

1. **Transparencia**: Reviews visibles públicamente
2. **Equidad**: Sistema bilateral (ambas partes califican)
3. **Anti-represalia**: Publicación simultánea
4. **Confianza**: Verificación de identidad requerida
5. **Incentivos**: Badges y destacados para buenos usuarios

---

## 🗄️ Base de Datos (Capa 1) {#base-de-datos}

### Tabla: `reviews`

Almacena las calificaciones y comentarios.

```sql
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relaciones
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  car_id uuid NOT NULL REFERENCES cars(id) ON DELETE CASCADE,

  -- Tipo de review
  review_type text NOT NULL CHECK (review_type IN ('renter_to_owner', 'owner_to_renter')),

  -- Calificaciones por categoría (1-5 estrellas)
  rating_cleanliness smallint CHECK (rating_cleanliness BETWEEN 1 AND 5),
  rating_communication smallint CHECK (rating_communication BETWEEN 1 AND 5),
  rating_accuracy smallint CHECK (rating_accuracy BETWEEN 1 AND 5),
  rating_location smallint CHECK (rating_location BETWEEN 1 AND 5),
  rating_checkin smallint CHECK (rating_checkin BETWEEN 1 AND 5),
  rating_value smallint CHECK (rating_value BETWEEN 1 AND 5),

  -- Calificación global (calculada automáticamente)
  rating_overall numeric(3,2) GENERATED ALWAYS AS (
    (COALESCE(rating_cleanliness, 0) +
     COALESCE(rating_communication, 0) +
     COALESCE(rating_accuracy, 0) +
     COALESCE(rating_location, 0) +
     COALESCE(rating_checkin, 0) +
     COALESCE(rating_value, 0)) / 6.0
  ) STORED,

  -- Comentarios
  comment_public text,
  comment_private text,

  -- Estado y visibilidad
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'hidden')),
  is_visible boolean DEFAULT false,
  published_at timestamptz,

  -- Moderación
  is_flagged boolean DEFAULT false,
  flag_reason text,
  moderation_status text DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_review_per_booking UNIQUE (booking_id, reviewer_id),
  CONSTRAINT reviewer_not_reviewee CHECK (reviewer_id != reviewee_id)
);

-- Índices
CREATE INDEX idx_reviews_booking ON reviews(booking_id);
CREATE INDEX idx_reviews_reviewer ON reviews(reviewer_id);
CREATE INDEX idx_reviews_reviewee ON reviews(reviewee_id);
CREATE INDEX idx_reviews_car ON reviews(car_id);
CREATE INDEX idx_reviews_status ON reviews(status);
CREATE INDEX idx_reviews_visible ON reviews(is_visible);
CREATE INDEX idx_reviews_created ON reviews(created_at DESC);
```

### Tabla: `user_stats`

Estadísticas agregadas de cada usuario.

```sql
CREATE TABLE public.user_stats (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,

  -- Estadísticas como propietario (locador)
  owner_reviews_count int DEFAULT 0,
  owner_rating_avg numeric(3,2) DEFAULT 0,
  owner_rating_cleanliness_avg numeric(3,2) DEFAULT 0,
  owner_rating_communication_avg numeric(3,2) DEFAULT 0,
  owner_rating_accuracy_avg numeric(3,2) DEFAULT 0,
  owner_rating_location_avg numeric(3,2) DEFAULT 0,
  owner_rating_checkin_avg numeric(3,2) DEFAULT 0,
  owner_rating_value_avg numeric(3,2) DEFAULT 0,

  -- Estadísticas como arrendatario (locatario)
  renter_reviews_count int DEFAULT 0,
  renter_rating_avg numeric(3,2) DEFAULT 0,
  renter_rating_cleanliness_avg numeric(3,2) DEFAULT 0,
  renter_rating_communication_avg numeric(3,2) DEFAULT 0,
  renter_rating_accuracy_avg numeric(3,2) DEFAULT 0,
  renter_rating_checkin_avg numeric(3,2) DEFAULT 0,

  -- Badges
  is_top_host boolean DEFAULT false,
  is_verified_renter boolean DEFAULT false,
  badges jsonb DEFAULT '[]'::jsonb,

  -- Timestamps
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_user_stats_top_host ON user_stats(is_top_host) WHERE is_top_host = true;
CREATE INDEX idx_user_stats_owner_rating ON user_stats(owner_rating_avg DESC);
```

### Tabla: `car_stats`

Estadísticas de cada vehículo.

```sql
CREATE TABLE public.car_stats (
  car_id uuid PRIMARY KEY REFERENCES cars(id) ON DELETE CASCADE,

  -- Estadísticas de reviews
  reviews_count int DEFAULT 0,
  rating_avg numeric(3,2) DEFAULT 0,
  rating_cleanliness_avg numeric(3,2) DEFAULT 0,
  rating_communication_avg numeric(3,2) DEFAULT 0,
  rating_accuracy_avg numeric(3,2) DEFAULT 0,
  rating_location_avg numeric(3,2) DEFAULT 0,
  rating_checkin_avg numeric(3,2) DEFAULT 0,
  rating_value_avg numeric(3,2) DEFAULT 0,

  -- Bookings stats
  total_bookings int DEFAULT 0,
  completed_bookings int DEFAULT 0,
  cancellation_rate numeric(4,2) DEFAULT 0,

  -- Timestamps
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_car_stats_rating ON car_stats(rating_avg DESC);
CREATE INDEX idx_car_stats_reviews ON car_stats(reviews_count DESC);
```

---

## ⚙️ Backend Services (Capa 2) {#backend-services}

### Funciones SQL

#### 1. Crear Review

```sql
CREATE OR REPLACE FUNCTION create_review(
  p_booking_id uuid,
  p_reviewer_id uuid,
  p_reviewee_id uuid,
  p_car_id uuid,
  p_review_type text,
  p_rating_cleanliness int,
  p_rating_communication int,
  p_rating_accuracy int,
  p_rating_location int,
  p_rating_checkin int,
  p_rating_value int,
  p_comment_public text,
  p_comment_private text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_review_id uuid;
  v_booking_status text;
  v_checkout_date timestamptz;
BEGIN
  -- Validar que la reserva existe y está completada
  SELECT status, end_date INTO v_booking_status, v_checkout_date
  FROM bookings
  WHERE id = p_booking_id;

  IF v_booking_status IS NULL THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF v_booking_status != 'completed' THEN
    RAISE EXCEPTION 'Booking must be completed to leave a review';
  END IF;

  -- Validar período de 14 días
  IF now() > v_checkout_date + INTERVAL '14 days' THEN
    RAISE EXCEPTION 'Review period has expired (14 days after checkout)';
  END IF;

  -- Validar que el reviewer es parte de la reserva
  IF NOT EXISTS (
    SELECT 1 FROM bookings
    WHERE id = p_booking_id
    AND (renter_id = p_reviewer_id OR owner_id = p_reviewer_id)
  ) THEN
    RAISE EXCEPTION 'Reviewer must be part of the booking';
  END IF;

  -- Crear review
  INSERT INTO reviews (
    booking_id, reviewer_id, reviewee_id, car_id, review_type,
    rating_cleanliness, rating_communication, rating_accuracy,
    rating_location, rating_checkin, rating_value,
    comment_public, comment_private,
    status, is_visible
  ) VALUES (
    p_booking_id, p_reviewer_id, p_reviewee_id, p_car_id, p_review_type,
    p_rating_cleanliness, p_rating_communication, p_rating_accuracy,
    p_rating_location, p_rating_checkin, p_rating_value,
    p_comment_public, p_comment_private,
    'pending', false
  )
  RETURNING id INTO v_review_id;

  -- Verificar si ambas partes ya calificaron para publicar
  PERFORM publish_reviews_if_both_completed(p_booking_id);

  RETURN v_review_id;
END;
$$;
```

#### 2. Publicar Reviews (lógica de 14 días)

```sql
CREATE OR REPLACE FUNCTION publish_reviews_if_both_completed(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_review_count int;
BEGIN
  -- Contar reviews pendientes para esta reserva
  SELECT COUNT(*) INTO v_review_count
  FROM reviews
  WHERE booking_id = p_booking_id
  AND status = 'pending';

  -- Si ambas partes calificaron (2 reviews), publicar ambas
  IF v_review_count = 2 THEN
    UPDATE reviews
    SET
      status = 'published',
      is_visible = true,
      published_at = now()
    WHERE booking_id = p_booking_id
    AND status = 'pending';

    -- Actualizar estadísticas
    PERFORM update_user_stats_for_booking(p_booking_id);
    PERFORM update_car_stats_for_booking(p_booking_id);
  END IF;
END;
$$;
```

#### 3. Publicar reviews pendientes (cron job - después de 14 días)

```sql
CREATE OR REPLACE FUNCTION publish_pending_reviews()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Publicar reviews pendientes cuyo período de 14 días ya expiró
  UPDATE reviews r
  SET
    status = 'published',
    is_visible = true,
    published_at = now()
  FROM bookings b
  WHERE r.booking_id = b.id
  AND r.status = 'pending'
  AND now() > b.end_date + INTERVAL '14 days';

  -- Actualizar estadísticas de los usuarios/autos afectados
  -- (ejecutar funciones de update_stats para cada booking)
END;
$$;
```

#### 4. Actualizar estadísticas de usuario

```sql
CREATE OR REPLACE FUNCTION update_user_stats(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Estadísticas como propietario
  INSERT INTO user_stats (user_id) VALUES (p_user_id)
  ON CONFLICT (user_id) DO UPDATE
  SET
    owner_reviews_count = (
      SELECT COUNT(*)
      FROM reviews
      WHERE reviewee_id = p_user_id
      AND review_type = 'renter_to_owner'
      AND is_visible = true
    ),
    owner_rating_avg = (
      SELECT COALESCE(AVG(rating_overall), 0)
      FROM reviews
      WHERE reviewee_id = p_user_id
      AND review_type = 'renter_to_owner'
      AND is_visible = true
    ),
    owner_rating_cleanliness_avg = (
      SELECT COALESCE(AVG(rating_cleanliness), 0)
      FROM reviews
      WHERE reviewee_id = p_user_id
      AND review_type = 'renter_to_owner'
      AND is_visible = true
    ),
    -- ... otros promedios por categoría

    -- Estadísticas como arrendatario
    renter_reviews_count = (
      SELECT COUNT(*)
      FROM reviews
      WHERE reviewee_id = p_user_id
      AND review_type = 'owner_to_renter'
      AND is_visible = true
    ),
    renter_rating_avg = (
      SELECT COALESCE(AVG(rating_overall), 0)
      FROM reviews
      WHERE reviewee_id = p_user_id
      AND review_type = 'owner_to_renter'
      AND is_visible = true
    ),

    -- Calcular badges
    is_top_host = (
      SELECT CASE
        WHEN COUNT(*) >= 10
        AND AVG(rating_overall) >= 4.8
        THEN true
        ELSE false
      END
      FROM reviews
      WHERE reviewee_id = p_user_id
      AND review_type = 'renter_to_owner'
      AND is_visible = true
      AND created_at >= now() - INTERVAL '12 months'
    ),

    updated_at = now();
END;
$$;
```

---

## 🎨 Frontend Components (Capa 3) {#frontend-components}

### Componente: `ReviewFormComponent`

Formulario para dejar una review después de completar una reserva.

```typescript
// review-form.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';

interface ReviewForm {
  rating_cleanliness: number;
  rating_communication: number;
  rating_accuracy: number;
  rating_location: number;
  rating_checkin: number;
  rating_value: number;
  comment_public: string;
  comment_private: string;
}

@Component({
  selector: 'app-review-form',
  templateUrl: './review-form.component.html',
  standalone: true,
})
export class ReviewFormComponent {
  @Input() bookingId!: string;
  @Input() reviewType!: 'renter_to_owner' | 'owner_to_renter';
  @Output() submitReview = new EventEmitter<ReviewForm>();

  form: ReviewForm = {
    rating_cleanliness: 0,
    rating_communication: 0,
    rating_accuracy: 0,
    rating_location: 0,
    rating_checkin: 0,
    rating_value: 0,
    comment_public: '',
    comment_private: '',
  };

  categories = [
    { key: 'rating_cleanliness', label: 'Limpieza', icon: '🧼' },
    { key: 'rating_communication', label: 'Comunicación', icon: '💬' },
    { key: 'rating_accuracy', label: 'Precisión', icon: '✓' },
    { key: 'rating_location', label: 'Ubicación', icon: '📍' },
    { key: 'rating_checkin', label: 'Check-in', icon: '🔑' },
    { key: 'rating_value', label: 'Valor', icon: '💰' },
  ];

  setRating(category: string, rating: number): void {
    (this.form as any)[category] = rating;
  }

  getRating(category: string): number {
    return (this.form as any)[category];
  }

  get overallRating(): number {
    const ratings = [
      this.form.rating_cleanliness,
      this.form.rating_communication,
      this.form.rating_accuracy,
      this.form.rating_location,
      this.form.rating_checkin,
      this.form.rating_value,
    ];
    const sum = ratings.reduce((a, b) => a + b, 0);
    return sum / 6;
  }

  onSubmit(): void {
    if (this.overallRating > 0) {
      this.submitReview.emit(this.form);
    }
  }
}
```

### Componente: `ReviewCardComponent`

Muestra una review individual.

```typescript
// review-card.component.ts
import { Component, Input } from '@angular/core';

interface Review {
  id: string;
  reviewer: {
    name: string;
    avatar_url: string;
  };
  rating_overall: number;
  rating_cleanliness: number;
  rating_communication: number;
  rating_accuracy: number;
  rating_location: number;
  rating_checkin: number;
  rating_value: number;
  comment_public: string;
  created_at: string;
}

@Component({
  selector: 'app-review-card',
  templateUrl: './review-card.component.html',
  standalone: true,
})
export class ReviewCardComponent {
  @Input() review!: Review;

  showAllCategories = false;

  getStars(rating: number): string {
    return '⭐'.repeat(Math.round(rating));
  }
}
```

### Servicio: `ReviewsService`

```typescript
// reviews.service.ts
import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { injectSupabase } from '@/core/services/supabase-client.service';

@Injectable({ providedIn: 'root' })
export class ReviewsService {
  private supabase: SupabaseClient = injectSupabase();

  async createReview(reviewData: {
    booking_id: string;
    reviewer_id: string;
    reviewee_id: string;
    car_id: string;
    review_type: string;
    rating_cleanliness: number;
    rating_communication: number;
    rating_accuracy: number;
    rating_location: number;
    rating_checkin: number;
    rating_value: number;
    comment_public: string;
    comment_private: string;
  }): Promise<{ success: boolean; review_id?: string; error?: string }> {
    try {
      const { data, error } = await this.supabase.rpc('create_review', reviewData);

      if (error) throw error;

      return { success: true, review_id: data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async getReviewsForUser(userId: string, asOwner: boolean = true): Promise<any[]> {
    const reviewType = asOwner ? 'renter_to_owner' : 'owner_to_renter';

    const { data, error } = await this.supabase
      .from('reviews')
      .select(`
        *,
        reviewer:reviewer_id (id, full_name, avatar_url),
        car:car_id (id, title, brand, model)
      `)
      .eq('reviewee_id', userId)
      .eq('review_type', reviewType)
      .eq('is_visible', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getReviewsForCar(carId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('reviews')
      .select(`
        *,
        reviewer:reviewer_id (id, full_name, avatar_url)
      `)
      .eq('car_id', carId)
      .eq('is_visible', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getUserStats(userId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || this.getDefaultStats();
  }

  async getCarStats(carId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('car_stats')
      .select('*')
      .eq('car_id', carId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || this.getDefaultCarStats();
  }

  private getDefaultStats(): any {
    return {
      owner_reviews_count: 0,
      owner_rating_avg: 0,
      renter_reviews_count: 0,
      renter_rating_avg: 0,
      is_top_host: false,
      badges: [],
    };
  }

  private getDefaultCarStats(): any {
    return {
      reviews_count: 0,
      rating_avg: 0,
      total_bookings: 0,
      completed_bookings: 0,
    };
  }
}
```

---

## 🧠 Lógica de Negocio {#logica-de-negocio}

### Reglas de Publicación

1. **Ambos califican dentro de 14 días**
   - ✅ Publicar ambas reviews inmediatamente
   - ✅ Actualizar stats de usuario y auto

2. **Solo uno califica dentro de 14 días**
   - ⏳ Mantener review en estado `pending`
   - ⏳ Al vencer 14 días → publicar automáticamente (cron job)

3. **Nadie califica en 14 días**
   - ❌ Cerrar período de review sin publicación
   - ❌ No afecta estadísticas

### Cron Job: Publicación Automática

```sql
-- Ejecutar diariamente
SELECT cron.schedule(
  'publish-pending-reviews',
  '0 0 * * *', -- A medianoche
  $$SELECT publish_pending_reviews()$$
);
```

### Cálculo de Top Host

Criterios para obtener el badge "Top Host":

```sql
-- Mínimo 10 reviews en los últimos 12 meses
-- Promedio ≥ 4.8 estrellas
-- Tasa de cancelación < 5%
-- Sin violaciones de políticas

is_top_host = (
  owner_reviews_count >= 10
  AND owner_rating_avg >= 4.8
  AND cancellation_rate < 0.05
  AND moderation_violations = 0
)
```

---

## 🏅 Sistema de Badges {#sistema-de-badges}

### Badges Disponibles

```typescript
enum BadgeType {
  TOP_HOST = 'top_host',
  VERIFIED_RENTER = 'verified_renter',
  SUPER_HOST = 'super_host',
  EARLY_ADOPTER = 'early_adopter',
  TRUSTED_DRIVER = 'trusted_driver',
}

interface Badge {
  type: BadgeType;
  name: string;
  description: string;
  icon: string;
  criteria: string;
  color: string;
}

const BADGES: Badge[] = [
  {
    type: BadgeType.TOP_HOST,
    name: 'Top Host',
    description: 'Propietario destacado con excelentes calificaciones',
    icon: '🏆',
    criteria: '≥10 reviews, promedio ≥4.8⭐',
    color: 'gold',
  },
  {
    type: BadgeType.SUPER_HOST,
    name: 'Super Host',
    description: 'Propietario excepcional con historial impecable',
    icon: '⭐',
    criteria: '≥50 reviews, promedio ≥4.9⭐, 0 cancelaciones',
    color: 'platinum',
  },
  {
    type: BadgeType.VERIFIED_RENTER,
    name: 'Arrendatario Verificado',
    description: 'Identidad y licencia verificadas',
    icon: '✓',
    criteria: 'Verificación de identidad completada',
    color: 'blue',
  },
  {
    type: BadgeType.TRUSTED_DRIVER,
    name: 'Conductor Confiable',
    description: 'Historial de arrendatario impecable',
    icon: '🚗',
    criteria: '≥10 reservas, promedio ≥4.8⭐',
    color: 'green',
  },
];
```

### Componente: Badge Display

```typescript
@Component({
  selector: 'app-user-badges',
  template: `
    <div class="flex gap-2 flex-wrap">
      @for (badge of userBadges; track badge.type) {
        <div
          class="badge"
          [class]="'badge-' + badge.color"
          [title]="badge.description"
        >
          <span>{{ badge.icon }}</span>
          <span class="text-xs font-medium">{{ badge.name }}</span>
        </div>
      }
    </div>
  `,
  standalone: true,
})
export class UserBadgesComponent {
  @Input() badges: BadgeType[] = [];

  get userBadges(): Badge[] {
    return BADGES.filter(b => this.badges.includes(b.type));
  }
}
```

---

## 📅 Roadmap de Implementación {#roadmap}

### Fase 1: Base de Datos (Semana 1)

- [ ] Crear tablas: `reviews`, `user_stats`, `car_stats`
- [ ] Implementar funciones SQL: `create_review`, `publish_reviews_if_both_completed`
- [ ] Crear índices y constraints
- [ ] Setup cron job para publicación automática (pg_cron)
- [ ] Poblar datos de prueba

### Fase 2: Backend Services (Semana 2)

- [ ] Crear `ReviewsService` en Angular
- [ ] Implementar RPC calls a funciones SQL
- [ ] Crear endpoints REST si es necesario
- [ ] Implementar lógica de validación
- [ ] Tests unitarios de servicios

### Fase 3: Frontend Components (Semana 3)

- [ ] Crear `ReviewFormComponent` (formulario de calificación)
- [ ] Crear `ReviewCardComponent` (mostrar review individual)
- [ ] Crear `ReviewsListComponent` (lista de reviews)
- [ ] Crear `UserStatsComponent` (stats de usuario)
- [ ] Crear `UserBadgesComponent` (mostrar insignias)
- [ ] Crear `CarRatingComponent` (rating de auto)

### Fase 4: Integración (Semana 4)

- [ ] Integrar formulario de review al finalizar reserva
- [ ] Mostrar reviews en perfil de usuario
- [ ] Mostrar reviews en detalle de auto
- [ ] Implementar notificaciones (email/push)
- [ ] Implementar sistema de moderación básico

### Fase 5: Optimización & Testing (Semana 5)

- [ ] Tests E2E del flujo completo
- [ ] Optimización de queries (explain analyze)
- [ ] Implementar caché para stats agregadas
- [ ] Implementar lazy loading de reviews
- [ ] Performance testing

### Fase 6: Features Avanzadas (Futuro)

- [ ] Detección de reviews fraudulentas (IA)
- [ ] Sistema de apelaciones
- [ ] Reviews con fotos
- [ ] Respuestas a reviews
- [ ] Analytics de reviews (dashboard admin)

---

## 📊 Métricas de Éxito

### KPIs a Monitorear

1. **Tasa de Participación**
   - % de reservas con al menos 1 review
   - Meta: >60%

2. **Calidad de Reviews**
   - Promedio de palabras por review
   - % de reviews con comentario público
   - Meta: >80%

3. **Tiempo de Respuesta**
   - Tiempo promedio para dejar review
   - Meta: <7 días

4. **Impacto en Conversión**
   - Tasa de conversión de autos con reviews vs sin reviews
   - Meta: +30% con reviews

5. **Confianza**
   - NPS de usuarios que leen reviews
   - Meta: >50

---

## 🔐 Consideraciones de Seguridad

### Prevención de Abuso

1. **Validación de Identidad**
   - Solo usuarios verificados pueden dejar reviews
   - Una review por booking (constraint DB)

2. **Anti-Gaming**
   - Detectar patterns de fake reviews (IA)
   - Limitar reviews en corto período de tiempo
   - Verificar que la reserva fue completada

3. **Moderación**
   - Flagging de reviews inapropiadas
   - Review manual de reviews flaggeadas
   - Ban automático por múltiples violaciones

4. **Privacidad**
   - `comment_private` solo visible para reviewee
   - Opción de ocultar perfil público
   - GDPR compliance (derecho al olvido)

---

## 🎨 Mockups de UI

### Review Form

```
┌─────────────────────────────────────────────────────┐
│  ⭐ Califica tu experiencia con Juan                │
├─────────────────────────────────────────────────────┤
│                                                     │
│  🧼 Limpieza            ⭐⭐⭐⭐⭐                    │
│  💬 Comunicación        ⭐⭐⭐⭐☆                    │
│  ✓ Precisión           ⭐⭐⭐⭐⭐                    │
│  📍 Ubicación           ⭐⭐⭐⭐⭐                    │
│  🔑 Check-in            ⭐⭐⭐⭐☆                    │
│  💰 Valor               ⭐⭐⭐⭐⭐                    │
│                                                     │
│  Promedio: 4.8 ⭐                                   │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │ Cuéntanos sobre tu experiencia (público)   │  │
│  │                                             │  │
│  │                                             │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │ Feedback privado (solo Juan)               │  │
│  │                                             │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
│  [ Cancelar ]              [ Enviar Review ]       │
└─────────────────────────────────────────────────────┘
```

### User Profile with Stats

```
┌─────────────────────────────────────────────────────┐
│  👤 Juan Pérez                                      │
│  🏆 Top Host  ✓ Verificado                         │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Como Propietario:                                  │
│  ⭐ 4.9 (47 reviews)                                │
│    🧼 Limpieza: 5.0                                 │
│    💬 Comunicación: 4.9                             │
│    🔑 Check-in: 4.8                                 │
│                                                     │
│  Como Arrendatario:                                 │
│  ⭐ 4.7 (12 reviews)                                │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ María G. ⭐⭐⭐⭐⭐  hace 2 días               │ │
│  │ "Excelente experiencia, auto impecable..."   │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  [ Ver todas las reviews ]                         │
└─────────────────────────────────────────────────────┘
```

---

## 📚 Recursos Adicionales

### Documentación

- `REVIEWS_API.md` - API reference completa
- `REVIEWS_TESTING.md` - Guía de testing
- `REVIEWS_ANALYTICS.md` - Dashboard de métricas

### Scripts Útiles

```bash
# Poblar reviews de prueba
npm run seed:reviews

# Ejecutar publicación manual de reviews pendientes
npm run reviews:publish-pending

# Recalcular todas las estadísticas
npm run reviews:recalc-stats

# Limpiar reviews de testing
npm run reviews:clean-test-data
```

---

## ✅ Checklist de Lanzamiento

### Pre-Lanzamiento

- [ ] Todas las migraciones SQL ejecutadas
- [ ] Servicios backend testeados (unit + integration)
- [ ] Componentes frontend implementados
- [ ] Flujo E2E testeado
- [ ] Cron job configurado en producción
- [ ] Sistema de moderación activo
- [ ] Documentación completa
- [ ] Training del equipo de soporte

### Post-Lanzamiento

- [ ] Monitorear métricas diarias
- [ ] Ajustar algoritmo de badges según datos reales
- [ ] Recopilar feedback de usuarios beta
- [ ] Iterar sobre UI/UX basado en comportamiento
- [ ] Implementar features avanzadas (respuestas, fotos, etc.)

---

**Versión:** 1.0.0
**Fecha:** 2025-10-17
**Estado:** Plan de Implementación
**Próximo paso:** Crear migraciones SQL (Fase 1)
