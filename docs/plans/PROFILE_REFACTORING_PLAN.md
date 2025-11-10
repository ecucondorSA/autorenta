# Plan de Refactorización del Sistema de Perfil

**Fecha**: 2025-11-06  
**Estado**: 📋 Planificación  
**Prioridad**: Alta

---

## 📋 Resumen Ejecutivo

Refactorización completa del sistema de perfil para centralizar estado, mejorar UX con wizard de pasos, integrar verificación KYC, y optimizar rendimiento con lazy loading y autosave.

---

## 🎯 Objetivos

1. **Centralizar estado**: Unificar `getCurrentProfile()` y señales derivadas en `ProfileStore`
2. **Mejorar UX**: Wizard de pasos con validaciones progresivas y autosave
3. **Integrar verificación**: Flujo KYC dentro de la experiencia principal
4. **Optimizar rendimiento**: Lazy loading de secciones pesadas y cache inteligente

---

## 🏗️ Arquitectura Propuesta

### 1. ProfileStore (Nuevo)

**Ubicación**: `apps/web/src/app/core/stores/profile.store.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class ProfileStore {
  // Core state
  readonly profile = signal<UserProfile | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  
  // Computed values
  readonly avatarUrl = computed(() => this.profile()?.avatar_url ?? '');
  readonly canPublishCars = computed(() => {
    const role = this.profile()?.role;
    return role === 'owner' || role === 'both';
  });
  readonly canBookCars = computed(() => {
    const role = this.profile()?.role;
    return role === 'renter' || role === 'both';
  });
  
  // Wallet integration (delegates to WalletService)
  readonly availableBalance = this.walletService.availableBalance;
  readonly withdrawableBalance = this.walletService.withdrawableBalance;
  readonly lockedBalance = this.walletService.lockedBalance;
  
  // Methods
  async loadProfile(): Promise<void> { /* ... */ }
  async updateProfile(updates: UpdateProfileData): Promise<void> { /* ... */ }
  async uploadAvatar(file: File): Promise<string> { /* ... */ }
  async deleteAvatar(): Promise<void> { /* ... */ }
  invalidateCache(): void { /* ... */ }
}
```

**Beneficios**:
- ✅ Single source of truth para estado de perfil
- ✅ Cache automático con invalidación tras mutaciones
- ✅ Integración con WalletService sin duplicación
- ✅ Métodos idempotentes reutilizables

---

### 2. Reestructuración UX

#### 2.1 Secciones del Perfil

```
profile.page.html
├── (1) Hero Section (ligero)
│   ├── Avatar + CTAs rápidas
│   └── Nombre + Rol + Badges
│
├── (2) Identidad/Roles
│   ├── Información personal
│   └── Permisos (publicar/reservar)
│
├── (3) Contacto & Dirección
│   ├── Teléfono/WhatsApp
│   └── Dirección completa
│
├── (4) Licencias/Documentos
│   ├── Licencia de conducir
│   └── Estado de verificación KYC
│
└── (5) Reseñas y Métricas (@defer)
    ├── Carrusel unificado (dueño/inquilino)
    └── Gráfico de estadísticas
```

#### 2.2 Layout Responsive

**Desktop** (`lg:` breakpoint):
- Layout split: Avatar sidebar (300px) + Contenido principal
- Reutilizar `DriverProfileCardComponent` para sidebar

**Mobile** (`<lg`):
- Tabs horizontales controladas por señales
- Reducir scroll infinito
- Hero section sticky al top

#### 2.3 Lazy Loading

```html
<!-- Hero ligero (siempre visible) -->
<section class="hero-section">
  <!-- Avatar, nombre, CTAs -->
</section>

<!-- Secciones pesadas con @defer -->
@defer (on viewport) {
  <section class="reviews-section">
    <!-- Reviews carousel -->
  </section>
}

@defer (on viewport) {
  <section class="wallet-section">
    <!-- Wallet balances -->
  </section>
}
```

---

### 3. Wizard de Edición

#### 3.1 Estructura de Pasos

```typescript
type WizardStep = 'general' | 'contact' | 'address' | 'license' | 'verification';

interface WizardState {
  currentStep: WizardStep;
  completedSteps: Set<WizardStep>;
  dirtySteps: Set<WizardStep>;
  formData: Partial<UpdateProfileData>;
}
```

#### 3.2 Validaciones Progresivas

```typescript
// Paso 1: General (required)
const generalForm = fb.group({
  full_name: ['', [Validators.required, Validators.minLength(3)]],
  role: ['renter', Validators.required],
});

// Paso 2: Contacto (opcional, pero valida formato si se completa)
const contactForm = fb.group({
  phone: ['', [Validators.pattern(/^\+?[1-9]\d{1,14}$/)]],
  whatsapp: ['', [Validators.pattern(/^\+?[1-9]\d{1,14}$/)]],
});

// Paso 3: Dirección (opcional)
const addressForm = fb.group({
  address_line1: [''],
  city: [''],
  // ...
});
```

#### 3.3 Persistencia Optimista

```typescript
async saveStep(step: WizardStep): Promise<void> {
  const formData = this.getFormDataForStep(step);
  
  // Optimistic update
  this.profileStore.profile.update(prev => ({
    ...prev!,
    ...formData,
  }));
  
  try {
    await this.profileStore.updateProfile(formData);
    this.showToast('Cambios guardados', 'success');
    this.completedSteps.add(step);
  } catch (error) {
    // Rollback on error
    await this.profileStore.loadProfile();
    this.showToast('Error al guardar', 'error');
  }
}
```

#### 3.4 Autosave Silencioso

```typescript
// En constructor del componente
this.contactForm.valueChanges
  .pipe(
    debounceTime(2000), // 2 segundos de inactividad
    distinctUntilChanged(),
    filter(() => this.contactForm.valid),
  )
  .subscribe(async (values) => {
    await this.profileStore.updateProfile({
      phone: values.phone,
      whatsapp: values.whatsapp,
    });
    // Sin toast para autosave
  });
```

---

### 4. Integración de Verificación KYC

#### 4.1 Pestaña "Verificación"

```typescript
// En profile.page.ts
readonly activeTab = signal<'overview' | 'edit' | 'verification' | 'reviews'>('overview');

readonly verificationProgress = this.verificationStateService.verificationProgress;
readonly verificationSummary = computed(() => {
  const progress = this.verificationProgress();
  return {
    level: progress?.current_level ?? 1,
    emailVerified: progress?.requirements?.level_1?.email_verified ?? false,
    phoneVerified: progress?.requirements?.level_1?.phone_verified ?? false,
    driverLicenseVerified: progress?.requirements?.level_2?.driver_license_verified ?? false,
    documentVerified: progress?.requirements?.level_2?.document_verified ?? false,
  };
});
```

#### 4.2 Estado Resumen (Chips)

```html
<!-- En hero section -->
<div class="verification-summary">
  @if (verificationSummary().level >= 2) {
    <span class="badge-success">Nivel 2 Verificado</span>
  } @else {
    <span class="badge-warning">Documentos Pendientes</span>
  }
  
  @if (!verificationSummary().emailVerified) {
    <span class="badge-info">Verificar Email</span>
  }
</div>
```

#### 4.3 Sincronización de Banners

```typescript
// En profile.page.ts
readonly showVerificationBanner = computed(() => {
  const summary = this.verificationSummary();
  return summary.level < 2 && (summary.emailVerified || summary.phoneVerified);
});

// En template
@if (showVerificationBanner()) {
  <app-verification-prompt-banner 
    [currentLevel]="verificationSummary().level"
    (dismiss)="dismissVerificationBanner()"
  />
}
```

---

### 5. Wallet y Métricas

#### 5.1 Módulo "Finanzas"

```html
<section class="finances-module">
  <h3>Finanzas</h3>
  
  <div class="balance-summary">
    <div class="balance-item">
      <span class="label">Disponible</span>
      <span class="value">${{ profileStore.availableBalance() | number:'1.2-2' }}</span>
    </div>
    <div class="balance-item">
      <span class="label">Retirable</span>
      <span class="value">${{ profileStore.withdrawableBalance() | number:'1.2-2' }}</span>
    </div>
    <div class="balance-item">
      <span class="label">Bloqueado</span>
      <span class="value">${{ profileStore.lockedBalance() | number:'1.2-2' }}</span>
    </div>
  </div>
  
  <div class="cta-actions">
    <button (click)="navigateToWallet()" class="btn-primary">
      Ver Wallet Completo
    </button>
    <button (click)="openMercadoPagoConnect()" class="btn-secondary">
      Conectar MercadoPago
    </button>
  </div>
</section>
```

#### 5.2 Carrusel Unificado de Reseñas

```typescript
readonly allReviews = computed(() => [
  ...this.reviewsAsOwner().map(r => ({ ...r, context: 'owner' as const })),
  ...this.reviewsAsRenter().map(r => ({ ...r, context: 'renter' as const })),
].sort((a, b) => 
  new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
));

readonly displayedReviews = computed(() => {
  const all = this.allReviews();
  return this.showAllReviews() ? all : all.slice(0, 6);
});
```

#### 5.3 Gráfico de Estadísticas

```typescript
readonly userStatsChart = computed(() => {
  const stats = this.userStats();
  if (!stats) return null;
  
  return {
    responseRate: (stats.total_messages_sent / stats.total_messages_received) * 100,
    platformHours: Math.floor(
      (Date.now() - new Date(this.profile()?.created_at ?? Date.now()).getTime()) 
      / (1000 * 60 * 60)
    ),
    completionRate: this.calculateCompletionRate(),
  };
});
```

---

### 6. Notificaciones y Seguridad

#### 6.1 Subcomponente de Notificaciones

```typescript
// notifications-settings.component.ts
@Component({
  selector: 'app-notifications-settings',
  standalone: true,
  // ...
})
export class NotificationsSettingsComponent {
  readonly form = this.fb.group({
    email_bookings: [true],
    email_promotions: [true],
    push_bookings: [true],
    push_promotions: [true],
    whatsapp_bookings: [false],
    whatsapp_promotions: [false],
  });
  
  // Validación en vivo con debounce
  constructor() {
    this.form.valueChanges
      .pipe(debounceTime(500))
      .subscribe(async (values) => {
        await this.profileStore.updateProfile({
          notif_prefs: this.mapToNotificationPrefs(values),
        });
        this.showToast('Preferencias actualizadas', 'success');
      });
  }
}
```

#### 6.2 Sección de Seguridad

```typescript
// En profile.page.ts
readonly recentDevices = signal<DeviceSession[]>([]);
readonly twoFactorEnabled = signal(false);

async loadSecurityInfo(): Promise<void> {
  const devices = await this.authService.getRecentDevices();
  this.recentDevices.set(devices);
  
  const twoFactor = await this.authService.isTwoFactorEnabled();
  this.twoFactorEnabled.set(twoFactor);
}
```

```html
<section class="security-section">
  <h3>Seguridad</h3>
  
  <div class="device-list">
    @for (device of recentDevices(); track device.id) {
      <div class="device-card">
        <div class="device-info">
          <span class="device-name">{{ device.name }}</span>
          <span class="device-location">{{ device.location }}</span>
          <span class="device-last-seen">{{ device.lastSeen | date:'short' }}</span>
        </div>
        @if (device.isCurrent) {
          <span class="badge-success">Sesión Actual</span>
        }
      </div>
    }
  </div>
  
  <div class="two-factor-section">
    <label>
      <input type="checkbox" [checked]="twoFactorEnabled()" (change)="toggleTwoFactor($event)" />
      Autenticación de dos factores
    </label>
  </div>
</section>
```

---

## 📊 Plan de Implementación

### Fase 1: ProfileStore (Semanas 1-2)

- [ ] Crear `ProfileStore` service
- [ ] Migrar `getCurrentProfile()` a `ProfileStore.loadProfile()`
- [ ] Implementar cache con invalidación
- [ ] Integrar WalletService signals
- [ ] Migrar `ProfilePage` para usar `ProfileStore`
- [ ] Migrar `ProfileExpandedPage` para usar `ProfileStore`
- [ ] Tests unitarios para `ProfileStore`

### Fase 2: Reestructuración UX (Semanas 2-3)

- [ ] Reestructurar `profile.page.html` en secciones
- [ ] Implementar layout split para desktop
- [ ] Implementar tabs horizontales para mobile
- [ ] Agregar `@defer` para secciones pesadas
- [ ] Optimizar hero section (ligero)
- [ ] Tests E2E de layout responsive

### Fase 3: Wizard de Edición (Semanas 3-4)

- [ ] Crear componente `ProfileWizardComponent`
- [ ] Implementar pasos con validaciones progresivas
- [ ] Implementar persistencia optimista por paso
- [ ] Agregar autosave silencioso para campos menores
- [ ] Integrar toasts de éxito/error
- [ ] Tests E2E de flujo completo de edición

### Fase 4: Verificación KYC (Semanas 4-5)

- [ ] Integrar pestaña "Verificación" en `profile.page`
- [ ] Implementar estado resumen (chips)
- [ ] Sincronizar banners globales
- [ ] Migrar componentes de `profile-expanded` a `profile`
- [ ] Tests E2E de flujo de verificación

### Fase 5: Wallet y Métricas (Semanas 5-6)

- [ ] Crear módulo "Finanzas" con balances
- [ ] Integrar `mercadopago-connect.component`
- [ ] Unificar reseñas en carrusel
- [ ] Implementar gráfico de estadísticas
- [ ] Tests E2E de módulo de finanzas

### Fase 6: Notificaciones y Seguridad (Semanas 6-7)

- [ ] Crear `NotificationsSettingsComponent`
- [ ] Implementar validación en vivo con debounce
- [ ] Crear sección de seguridad con dispositivos
- [ ] Integrar 2FA toggle
- [ ] Tests E2E de preferencias

### Fase 7: Analytics y QA (Semanas 7-8)

- [ ] Instrumentar eventos analíticos en CTAs principales
- [ ] Agregar tracking de fricción (pasos abandonados)
- [ ] Tests E2E completos (mobile + desktop)
- [ ] Performance testing (lazy loading)
- [ ] Documentación de usuario

---

## 🔍 Métricas de Éxito

### Performance
- ✅ Hero section carga en < 200ms
- ✅ Secciones pesadas (reseñas, wallet) cargan bajo demanda
- ✅ Autosave no bloquea UI (< 100ms debounce)

### UX
- ✅ Tasa de completación de perfil > 80%
- ✅ Tiempo promedio de edición < 3 minutos
- ✅ Abandono en wizard < 10%

### Analytics
- ✅ Eventos trackeados: `profile_step_saved`, `profile_document_uploaded`, `profile_wallet_connected`
- ✅ Fricción medida: pasos con mayor abandono identificados

---

## 🧪 Testing Strategy

### Unit Tests
- `ProfileStore` methods (load, update, uploadAvatar)
- Form validations por paso
- Computed signals (canPublishCars, verificationSummary)

### Integration Tests
- ProfileStore + WalletService integration
- ProfileStore + VerificationStateService integration
- Autosave debounce behavior

### E2E Tests (Playwright)
- Flujo completo de edición por pasos
- Cambio de avatar
- Subida de documentos KYC
- Conexión de MercadoPago
- Navegación mobile/desktop

---

## 📚 Referencias

- [ProfileService actual](./../../apps/web/src/app/core/services/profile.service.ts)
- [ProfilePage actual](./../../apps/web/src/app/features/profile/profile.page.ts)
- [ProfileExpandedPage actual](./../../apps/web/src/app/features/profile/profile-expanded.page.ts)
- [WalletService](./../../apps/web/src/app/core/services/wallet.service.ts)
- [VerificationStateService](./../../apps/web/src/app/core/services/verification-state.service.ts)
- [AnalyticsService](./../../apps/web/src/app/core/services/analytics.service.ts)

---

## 🚀 Próximos Pasos

1. **Aprobar plan** con equipo
2. **Crear branch**: `feature/profile-refactoring`
3. **Iniciar Fase 1**: Implementar ProfileStore
4. **Code review** después de cada fase
5. **Deploy incremental** por fase (feature flags)

---

**Última actualización**: 2025-11-06  
**Autor**: Claude Code  
**Revisión**: Pendiente

