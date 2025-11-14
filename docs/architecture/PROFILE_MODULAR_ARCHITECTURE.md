# Profile System - Modular Architecture Design

**Date**: 2025-11-11
**Version**: 2.0
**Status**: 🟡 Design Phase
**Related**: [Audit Report](../audits/PROFILE_SYSTEM_AUDIT_2025-11-11.md)

---

## 📋 Executive Summary

This document defines the modular restructure of AutoRenta's profile system to improve:
- **Maintainability**: Clear separation of concerns by feature domain
- **Scalability**: Easy to add new profile sections without touching existing code
- **Reusability**: Shared components and validation logic
- **User Experience**: Progressive disclosure and focused editing per section

### Key Changes from Current System
| Aspect | Current (v1.0) | New (v2.0) |
|--------|----------------|------------|
| **Architecture** | Monolithic ProfileExpanded with 8 tabs | Modular section components |
| **State** | Single large FormGroup | Section-level FormGroups |
| **Validation** | Mixed validation logic | Centralized validators |
| **Persistence** | Full profile update on save | Granular section updates |
| **Reusability** | Copy-paste between components | Shared section components |

---

## 🏗️ Architecture Overview

### Component Hierarchy

```
apps/web/src/app/features/profile/
├── profile.page.ts                          [KEEP - Basic profile view]
├── profile-expanded.page.ts                 [REFACTOR - Container]
│
├── components/
│   ├── profile-wizard/                      [KEEP - Onboarding flow]
│   │   └── profile-wizard.component.ts
│   │
│   ├── sections/                            [NEW - Modular sections]
│   │   ├── identity/
│   │   │   ├── profile-identity-section.component.ts
│   │   │   ├── profile-identity-section.component.html
│   │   │   └── profile-identity-section.component.scss
│   │   │
│   │   ├── contact/
│   │   │   ├── profile-contact-section.component.ts
│   │   │   ├── profile-contact-section.component.html
│   │   │   └── profile-contact-section.component.scss
│   │   │
│   │   ├── location/                        [NEW - GPS location]
│   │   │   ├── profile-location-section.component.ts
│   │   │   ├── profile-location-section.component.html
│   │   │   ├── profile-location-section.component.scss
│   │   │   └── components/
│   │   │       └── location-picker/         [NEW - Map picker]
│   │   │           ├── location-picker.component.ts
│   │   │           └── location-picker.component.html
│   │   │
│   │   ├── driver/                          [ADAPTER - Wraps existing]
│   │   │   └── profile-driver-section.component.ts
│   │   │
│   │   ├── verification/                    [ADAPTER - Wraps existing]
│   │   │   └── profile-verification-section.component.ts
│   │   │
│   │   ├── preferences/
│   │   │   ├── profile-preferences-section.component.ts
│   │   │   ├── profile-preferences-section.component.html
│   │   │   └── profile-preferences-section.component.scss
│   │   │
│   │   ├── notifications/
│   │   │   ├── profile-notifications-section.component.ts
│   │   │   ├── profile-notifications-section.component.html
│   │   │   └── profile-notifications-section.component.scss
│   │   │
│   │   └── security/
│   │       ├── profile-security-section.component.ts
│   │       ├── profile-security-section.component.html
│   │       └── profile-security-section.component.scss
│   │
│   ├── shared/                              [NEW - Reusable UI]
│   │   ├── section-card/
│   │   │   ├── section-card.component.ts    [Wrapper for sections]
│   │   │   └── section-card.component.html
│   │   │
│   │   └── field-validators/                [Centralized validators]
│   │       └── profile-validators.ts
│   │
│   └── [existing components]                [KEEP - No changes]
│       ├── driver-profile-card/
│       ├── verification-progress/
│       └── ...
```

---

## 🎯 Modular Section Design

### Section Interface (Base)

Every profile section implements a common interface for consistency:

```typescript
// profile-section.interface.ts
export interface ProfileSection {
  // Metadata
  id: string                              // Unique identifier (e.g., 'identity', 'contact')
  title: string                           // Display title
  description?: string                    // Optional description
  icon?: string                           // Optional icon class

  // State
  form: FormGroup                         // Section's form group
  loading: WritableSignal<boolean>        // Async loading state
  error: WritableSignal<string | null>    // Error state
  isDirty: Signal<boolean>                // Has unsaved changes
  isValid: Signal<boolean>                // Form is valid

  // Lifecycle
  loadData(profile: UserProfile): void    // Populate form from profile
  getData(): Partial<UpdateProfileData>   // Extract form data
  reset(): void                           // Reset to initial state

  // Actions
  save(): Promise<void>                   // Save this section only
  cancel(): void                          // Cancel changes

  // Validation
  validateSection(): boolean              // Custom validation logic
  getErrors(): string[]                   // Get validation error messages
}
```

---

## 📦 Section Definitions

### 1. Identity Section

**Purpose**: Core personal information required for legal compliance

**Fields**:
```typescript
{
  full_name: string           // Required, min 3 chars
  date_of_birth: Date         // Required (after migration), min age 18
  gov_id_type: string         // Optional: 'DNI' | 'Passport' | 'Other'
  gov_id_number: string       // Optional
}
```

**Validations**:
- `full_name`: Required, minLength(3), pattern(/^[a-zA-Z\s]+$/)
- `date_of_birth`: Required, minAge(18), maxAge(100)
- `gov_id_number`: conditionallyRequired(if gov_id_type selected)

**UI Components**:
- Text input: full_name
- Date picker: date_of_birth (with age calculator preview)
- Select: gov_id_type
- Text input: gov_id_number (masked based on type)

**Permissions**:
- Read: Any authenticated user (own profile only)
- Update: Own profile only
- Admin: Can view but not edit user's legal info

---

### 2. Contact Section

**Purpose**: Contact information for communication and bookings

**Fields**:
```typescript
{
  phone: string               // Optional, E.164 format
  whatsapp: string            // Optional, E.164 format
  address_line1: string       // Optional
  address_line2: string       // Optional
  city: string                // Optional
  state: string               // Optional
  postal_code: string         // Optional
  country: string             // Optional, ISO 3166-1 alpha-2
}
```

**Validations**:
- `phone`: pattern(E.164), conditionallyRequired(for renters)
- `whatsapp`: pattern(E.164)
- `postal_code`: pattern(based on country)
- `country`: enum(['AR', 'UY', 'CL'])

**UI Components**:
- Phone input: phone (with country code selector)
- Phone input: whatsapp (with "Same as phone" checkbox)
- Address autocomplete: powered by Mapbox Geocoding API
- Checkbox: "Use this address as home location" (populates GPS fields)

**Auto-save**:
- Debounced auto-save after 2 seconds of inactivity
- Visual indicator: "Saving..." → "Saved ✓"

---

### 3. Location Section (NEW)

**Purpose**: Home location for distance-based pricing and nearby search

**Fields**:
```typescript
{
  home_latitude: number       // Required (if location set), range: -90 to 90
  home_longitude: number      // Required (if location set), range: -180 to 180
  location_verified_at: Date  // Auto-set when user confirms location
  preferred_search_radius_km: number  // Default: 25, range: 5-100
}
```

**Validations**:
- `home_latitude`: validLatitude()
- `home_longitude`: validLongitude()
- `preferred_search_radius_km`: min(5), max(100)
- Composite: bothOrNeitherCoordinates() (can't have only lat or only lng)

**UI Components**:
- **Interactive Map** (Mapbox GL JS):
  - Shows current home location marker (draggable)
  - Button: "Use my current location" (asks permission)
  - Button: "Search address" (geocoding search)
  - Visual: Circle overlay showing search radius

- **Search Radius Slider**:
  - Min: 5 km, Max: 100 km, Default: 25 km
  - Live preview: Updates circle on map

- **Location Info Card**:
  - Displays: Approximate address (reverse geocoding)
  - Displays: Last verified timestamp
  - Button: "Clear location" (removes coordinates)

**Privacy**:
- Location is OPTIONAL
- Only approximate location shown to other users (city-level)
- Exact coordinates used server-side for distance calculations only

**Auto-save**:
- Saves automatically when user confirms new location
- Shows confirmation toast: "Location saved ✓"

---

### 4. Driver Section (ADAPTER)

**Purpose**: Driver license and driving profile (insurance class)

**Reuses Existing**:
- `DriverProfileCardComponent` (already implemented)
- Shows driver license info
- Shows Bonus-Malus class
- Links to /profile/driver-profile and /protections

**Additional Fields** (if not already in DriverProfileCard):
```typescript
{
  driver_license_number: string
  driver_license_country: string
  driver_license_expiry: Date
}
```

**Integration**:
```typescript
@Component({
  selector: 'app-profile-driver-section',
  template: `
    <app-section-card
      [title]="'Conductor'"
      [description]="'Información de tu licencia de conducir'"
      [icon]="'car'"
    >
      <app-driver-profile-card />
    </app-section-card>
  `
})
export class ProfileDriverSectionComponent {
  // Just a wrapper, no additional logic needed
}
```

---

### 5. Verification Section (ADAPTER)

**Purpose**: Email, phone, selfie, and document verification status

**Reuses Existing**:
- `VerificationProgressComponent` (master progress bar)
- `EmailVerificationComponent`
- `PhoneVerificationComponent`
- `SelfieCaptureComponent`

**Read-only Fields**:
```typescript
{
  is_email_verified: boolean
  is_phone_verified: boolean
  is_driver_verified: boolean
  kyc: 'not_started' | 'pending' | 'verified' | 'rejected'
}
```

**Integration**:
```typescript
@Component({
  selector: 'app-profile-verification-section',
  template: `
    <app-section-card
      [title]="'Verificación'"
      [description]="'Completa tu verificación para publicar autos'"
    >
      <app-verification-progress />
      <app-email-verification />
      <app-phone-verification />
      <app-selfie-capture />
    </app-section-card>
  `
})
export class ProfileVerificationSectionComponent {
  // Wrapper with computed verification state
  readonly overallProgress = computed(() => {
    const emailDone = profileStore.profile()?.is_email_verified ?? false;
    const phoneDone = profileStore.profile()?.is_phone_verified ?? false;
    const driverDone = profileStore.profile()?.is_driver_verified ?? false;
    const total = 3;
    const completed = [emailDone, phoneDone, driverDone].filter(Boolean).length;
    return (completed / total) * 100;
  });
}
```

---

### 6. Preferences Section

**Purpose**: User preferences for locale, timezone, currency, and marketing

**Fields**:
```typescript
{
  timezone: string            // Default: 'America/Buenos_Aires'
  locale: string              // Default: 'es-AR'
  currency: string            // Default: 'ARS'
  marketing_opt_in: boolean   // Default: true
}
```

**Validations**:
- `timezone`: enum(Intl.supportedValuesOf('timeZone'))
- `locale`: enum(['es-AR', 'es-UY', 'es-CL', 'en-US'])
- `currency`: enum(['ARS', 'UYU', 'CL

P', 'USD'])

**UI Components**:
- Select: timezone (searchable, grouped by region)
- Select: locale (with language/country flags)
- Select: currency (with symbols)
- Checkbox: marketing_opt_in with clear opt-out text

**Auto-save**:
- Immediate save on change (no manual save button needed)
- Affects UI immediately (currency, date formats, etc.)

---

### 7. Notifications Section

**Purpose**: Configure notification channels and types

**Fields**:
```typescript
{
  notif_prefs: {
    email: {
      bookings: boolean       // Booking status updates
      promotions: boolean     // Marketing emails
    },
    push: {
      bookings: boolean       // Push notifications
      promotions: boolean     // Promotional push
    },
    whatsapp: {
      bookings: boolean       // WhatsApp messages
      promotions: boolean     // WhatsApp promotions
    }
  }
}
```

**Validations**:
- At least one channel must be enabled for bookings (safety)

**UI Components**:
- Matrix of toggles: Channel (rows) × Type (columns)
- Visual example: "You'll receive messages like: ..."
- Warning: "At least one booking notification channel must be enabled"

**Auto-save**:
- Immediate save on toggle
- Shows success toast: "Notification preferences updated ✓"

---

### 8. Security Section

**Purpose**: Read-only security status and TOS acceptance

**Read-only Fields**:
```typescript
{
  is_email_verified: boolean
  is_phone_verified: boolean
  is_driver_verified: boolean
  tos_accepted_at: Date
  created_at: Date
  updated_at: Date
}
```

**UI Components**:
- Status badges: Email ✓, Phone ✓, Driver ✓
- Timestamp: "Terms accepted on [date]"
- Timestamp: "Account created on [date]"
- Link: "Review Terms of Service" → opens TOS modal
- Link: "Privacy Policy"
- Button: "Export my data" (GDPR compliance)
- Button: "Delete my account" (with confirmation modal)

**No Form**:
- This section is purely informational
- Actions trigger external flows (data export, account deletion)

---

## 🔌 State Management

### ProfileStore Extension

```typescript
// profile.store.ts (extended)
export class ProfileStore {
  // ... existing signals ...

  // Section-level updates
  async updateSection(
    sectionId: string,
    updates: Partial<UpdateProfileData>
  ): Promise<UserProfile> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const updated = await this.profileService.updateProfile(updates);
      this.profile.set(updated);

      // Analytics
      this.analyticsService.track('profile_section_updated', {
        section: sectionId,
        fields: Object.keys(updates)
      });

      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Update failed';
      this.error.set(message);

      // Rollback optimistic update (if any)
      this.loadProfile(true);

      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  // Invalidate specific section cache
  invalidateSection(sectionId: string): void {
    // Future: implement section-level cache invalidation
    this.invalidateCache();
  }
}
```

---

## 🎨 UI/UX Patterns

### Section Card Component

Reusable wrapper for all sections:

```typescript
@Component({
  selector: 'app-section-card',
  template: `
    <div class="section-card" [class.editing]="isEditing()">
      <!-- Header -->
      <div class="section-header">
        <div class="section-title">
          @if (icon) {
            <i class="icon-{{icon}}"></i>
          }
          <h3>{{ title }}</h3>
        </div>

        @if (description) {
          <p class="section-description">{{ description }}</p>
        }

        @if (showEditButton && !isEditing()) {
          <button (click)="startEdit()" class="btn-text">
            Edit
          </button>
        }
      </div>

      <!-- Content (projected) -->
      <div class="section-content" [class.readonly]="readonly">
        <ng-content />
      </div>

      <!-- Footer (actions) -->
      @if (isEditing() && showActions()) {
        <div class="section-actions">
          <button
            (click)="onCancel.emit()"
            class="btn-secondary"
            [disabled]="loading()"
          >
            Cancel
          </button>

          <button
            (click)="onSave.emit()"
            class="btn-primary"
            [disabled]="!isDirty() || !isValid() || loading()"
          >
            @if (loading()) {
              <span class="spinner"></span> Saving...
            } @else {
              Save Changes
            }
          </button>
        </div>
      }

      <!-- Errors -->
      @if (error()) {
        <div class="section-error" role="alert">
          <i class="icon-alert"></i>
          {{ error() }}
        </div>
      }
    </div>
  `,
  styles: [`
    .section-card {
      @apply card-premium p-6 mb-4;
      transition: all 0.3s ease;
    }

    .section-card.editing {
      @apply border-2 border-cta-default;
    }

    .section-header {
      @apply flex items-start justify-between mb-4;
    }

    .section-title {
      @apply flex items-center gap-2;
    }

    .section-title h3 {
      @apply text-lg font-semibold;
    }

    .section-description {
      @apply text-sm text-text-muted;
    }

    .section-content.readonly {
      @apply opacity-75 pointer-events-none;
    }

    .section-actions {
      @apply flex justify-end gap-3 mt-4 pt-4 border-t;
    }

    .section-error {
      @apply bg-error/10 border border-error text-error px-4 py-3 rounded mt-4;
    }
  `]
})
export class SectionCardComponent {
  @Input() title!: string;
  @Input() description?: string;
  @Input() icon?: string;
  @Input() readonly = false;
  @Input() showEditButton = true;
  @Input() showActions = signal(true);

  @Input() isEditing = signal(false);
  @Input() loading = signal(false);
  @Input() error = signal<string | null>(null);
  @Input() isDirty = signal(false);
  @Input() isValid = signal(true);

  @Output() onSave = new EventEmitter<void>();
  @Output() onCancel = new EventEmitter<void>();
  @Output() onEdit = new EventEmitter<void>();

  startEdit(): void {
    this.isEditing.set(true);
    this.onEdit.emit();
  }
}
```

---

### Tab vs Accordion

**Recommendation**: Use **Tabs** for ProfileExpandedPage

**Pros of Tabs**:
- ✅ Clear navigation between sections
- ✅ Better for 8+ sections (current state)
- ✅ Familiar pattern for users
- ✅ Easier to implement deep linking (`/profile-expanded?tab=contact`)

**Accordion Alternative** (for future mobile-first redesign):
- Allows multiple sections open simultaneously
- Better for mobile (no horizontal scrolling)
- Progressive disclosure

**Hybrid Approach** (Recommended):
```typescript
// Desktop: Tabs
// Mobile: Accordion

<div class="profile-container">
  <!-- Desktop: Tab Navigation -->
  <ion-tabs class="hidden lg:flex">
    <ion-tab-bar>
      <ion-tab-button tab="identity">Identity</ion-tab-button>
      <ion-tab-button tab="contact">Contact</ion-tab-button>
      <!-- ... -->
    </ion-tab-bar>
  </ion-tabs>

  <!-- Mobile: Accordion -->
  <ion-accordion-group class="flex lg:hidden">
    <ion-accordion value="identity">
      <ion-item slot="header">Identity</ion-item>
      <div slot="content">
        <app-profile-identity-section />
      </div>
    </ion-accordion>
    <!-- ... -->
  </ion-accordion-group>
</div>
```

---

## 🔐 Validation Strategy

### Centralized Validators

```typescript
// profile-validators.ts
export class ProfileValidators {
  // Age validation
  static minAge(minAge: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const birthDate = new Date(control.value);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      return age < minAge ? { minAge: { required: minAge, actual: age } } : null;
    };
  }

  // Phone validation (E.164 format)
  static phone(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      return phoneRegex.test(control.value) ? null : { phone: true };
    };
  }

  // GPS coordinate validation
  static latitude(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (control.value === null || control.value === undefined) return null;

      const lat = Number(control.value);
      return lat >= -90 && lat <= 90 ? null : { latitude: true };
    };
  }

  static longitude(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (control.value === null || control.value === undefined) return null;

      const lng = Number(control.value);
      return lng >= -180 && lng <= 180 ? null : { longitude: true };
    };
  }

  // Conditional required (e.g., gov_id_number required if gov_id_type selected)
  static conditionallyRequired(condition: () => boolean): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!condition()) return null;

      return Validators.required(control);
    };
  }

  // Both or neither (lat/lng must both be present or both absent)
  static bothOrNeither(fieldA: string, fieldB: string): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const a = group.get(fieldA)?.value;
      const b = group.get(fieldB)?.value;

      const hasA = a !== null && a !== undefined && a !== '';
      const hasB = b !== null && b !== undefined && b !== '';

      if (hasA && !hasB) return { [fieldB]: { requiredWith: fieldA } };
      if (hasB && !hasA) return { [fieldA]: { requiredWith: fieldB } };

      return null;
    };
  }
}
```

---

## 🔄 Data Flow

### Section Update Flow

```
User edits field in Section Component
        ↓
Form value changes (reactive)
        ↓
isDirty signal = true
        ↓
User clicks "Save" button
        ↓
Section Component calls save()
        ↓
Extracts data via getData()
        ↓
Calls ProfileStore.updateSection(sectionId, updates)
        ↓
ProfileStore sets loading = true
        ↓
ProfileService.updateProfile(updates)
        ↓
Supabase RPC: update_my_profile()
        ↓
Returns updated profile
        ↓
ProfileStore updates profile signal
        ↓
Section Component receives new profile via input
        ↓
Calls loadData(profile) to sync form
        ↓
isDirty = false, isEditing = false
        ↓
Success toast shown
```

### Error Handling Flow

```
Update fails (network/validation/RLS)
        ↓
ProfileService throws error
        ↓
ProfileStore catches error
        ↓
Rolls back optimistic update (calls loadProfile(true))
        ↓
Sets error signal with message
        ↓
Section Component shows error in UI
        ↓
User can:
  - Retry (click Save again)
  - Cancel (discard changes)
  - Edit and try again
```

---

## 📱 Responsive Design

### Breakpoints

```scss
// Tailwind breakpoints (AutoRenta uses these)
$mobile: 0-639px        // sm
$tablet: 640-1023px     // md-lg
$desktop: 1024px+       // lg+
```

### Mobile Adaptations

**Profile Expanded (Mobile)**:
- Replace tabs with accordion
- Stack sections vertically
- Full-width form fields
- Sticky save button at bottom
- Simplified headers (icons only)

**Location Picker (Mobile)**:
- Full-screen map modal
- Bottom sheet with controls
- Geolocation button prominent
- Search bar at top

**Contact Section (Mobile)**:
- Phone number input with native keyboard
- One field per row (no inline groups)
- Larger touch targets (48px min)

---

## 🚀 Migration Path (Existing → Modular)

### Phase 1: Create Section Components (Week 1)
- [ ] Create `sections/` directory structure
- [ ] Implement `SectionCardComponent` (wrapper)
- [ ] Implement `ProfileIdentitySectionComponent`
- [ ] Implement `ProfileContactSectionComponent`
- [ ] Implement `ProfileLocationSectionComponent` (new)
- [ ] Implement adapters for Driver and Verification

### Phase 2: Update ProfileExpanded (Week 2)
- [ ] Refactor ProfileExpandedPage to use section components
- [ ] Migrate tab logic to section-based routing
- [ ] Update ProfileStore with `updateSection()` method
- [ ] Add ProfileValidators utility class

### Phase 3: Apply Migrations & Test (Week 2)
- [ ] Apply SQL migrations to dev database
- [ ] Run `npm run sync:types`
- [ ] Test each section saves correctly
- [ ] Test validation logic
- [ ] Test error handling and rollback

### Phase 4: New Features (Week 3)
- [ ] Implement LocationPickerComponent (map integration)
- [ ] Add GPS location UI to Location section
- [ ] Add date_of_birth UI to Identity section
- [ ] Test distance-based pricing with real locations

### Phase 5: Polish & Deploy (Week 3-4)
- [ ] E2E tests for all sections
- [ ] Accessibility audit (ARIA, keyboard nav)
- [ ] Performance audit (Lighthouse)
- [ ] Deploy to staging
- [ ] QA testing
- [ ] Deploy to production

---

## 📊 Success Metrics

### Technical Metrics
- **Code Reusability**: 80%+ of section logic shared via base class
- **Bundle Size**: No increase >5% (tree-shaking of unused sections)
- **Performance**: Section load time <100ms
- **Type Safety**: 100% (no `any` types)

### User Metrics
- **Profile Completion Rate**: Target 90%+ (up from current ~70%)
- **Time to Complete Profile**: Target <5 minutes (down from ~8 minutes)
- **Edit Success Rate**: Target 99%+ (proper error handling)
- **Mobile Usability Score**: Target 95+ (Lighthouse)

---

## 🔒 Security Considerations

### RLS Policies (No Changes Needed)
Current RLS on `profiles` table already handles:
- Users can only read/update their own profile
- Admins can read all profiles
- No user can update `wallet_account_number`, `kyc`, `onboarding`, or `rating_*` fields directly

### New Fields (GPS Location)
- **Privacy**: Home location is optional
- **Precision**: Only city-level shown to other users
- **Verification**: `location_verified_at` ensures user confirmed location
- **Retention**: Can be cleared anytime by user

### Date of Birth
- **Privacy**: Not shown publicly (used server-side only)
- **GDPR**: Part of "Export my data" and "Delete my account" flows
- **Validation**: Server-side check ensures age ≥ 18

---

## 📚 Related Documentation

- [Profile System Audit Report](../audits/PROFILE_SYSTEM_AUDIT_2025-11-11.md)
- [Apply Profile Migrations Guide](../migrations/APPLY_PROFILE_MIGRATIONS.md)
- [CLAUDE.md - Main project docs](../../CLAUDE.md)
- [Database Schema](../../database/schema.sql)
- [Supabase RLS Policies](../../supabase/migrations/)

---

## ✅ Next Steps

1. **Review this design document** with team
2. **Approve architecture** and section breakdown
3. **Create Jira tickets** for each phase
4. **Start Phase 1** (create section components)
5. **Apply migrations** to dev database
6. **Test iteratively** after each phase

---

**Last Updated**: 2025-11-11
**Reviewed By**: [Pending]
**Approved By**: [Pending]
**Status**: 🟡 Awaiting approval to proceed with implementation
