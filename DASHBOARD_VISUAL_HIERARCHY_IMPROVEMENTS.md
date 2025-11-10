# Dashboard Visual Hierarchy Improvements

**Issue**: #186 - UI Implementation (Phase 3, Day 4)
**Status**: Specification (Ready for Implementation)
**Priority**: Medium
**Estimated Effort**: 4 hours

## Current State

The dashboard currently shows multiple cards with equal visual weight, making it difficult for users to identify the most important information at a glance.

**Pain Points:**
- All cards look the same (no hierarchy)
- Critical actions not emphasized
- Important metrics buried among less critical info
- No visual grouping of related information

## Proposed Improvements

### 1. Card Hierarchy System

Use the new `CardComponent` with different variants to establish hierarchy:

```typescript
// HIGH PRIORITY - Use elevated variant with larger padding
<app-card variant="elevated" padding="lg" [hoverable]="true">
  <!-- Critical actions: Active bookings, pending approvals -->
</app-card>

// MEDIUM PRIORITY - Use elevated variant with standard padding
<app-card variant="elevated" padding="md">
  <!-- Important info: Earnings, upcoming trips -->
</app-card>

// LOW PRIORITY - Use flat variant
<app-card variant="flat" padding="sm">
  <!-- Stats, tips, optional info -->
</app-card>
```

### 2. Visual Grouping

Group related cards into sections with clear headings:

**Locatario Dashboard:**
```
┌─ Acciones Urgentes ──────────────────┐
│ ▸ Reservas Activas (if any)         │
│ ▸ Próximos Viajes (if any)          │
└──────────────────────────────────────┘

┌─ Mi Actividad ───────────────────────┐
│ ▸ Historial de Reservas              │
│ ▸ Vehículos Favoritos                │
└──────────────────────────────────────┘

┌─ Información ─────────────────────────┐
│ ▸ Consejos de Uso                    │
│ ▸ Promociones Disponibles            │
└──────────────────────────────────────┘
```

**Locador Dashboard:**
```
┌─ Requieren Atención ─────────────────┐
│ ▸ Solicitudes Pendientes (badge)    │
│ ▸ Check-ins/Check-outs Hoy          │
└──────────────────────────────────────┘

┌─ Mis Vehículos ──────────────────────┐
│ ▸ Vehículos Publicados               │
│ ▸ Rendimiento (ganancias, tasa)     │
└──────────────────────────────────────┘

┌─ Finanzas ────────────────────────────┐
│ ▸ Balance Disponible                 │
│ ▸ Próximos Pagos                     │
└──────────────────────────────────────┘
```

### 3. Color Coding & Icons

Use semantic colors and icons to create visual distinction:

**Urgency Levels:**
- 🔴 **Critical** (error-600): Requires immediate action
  - Pending approvals
  - Today's check-ins/check-outs
  - Overdue payments
- 🟡 **Important** (warning-600): Needs attention soon
  - Upcoming trips (24-48h)
  - Low vehicle availability
- 🔵 **Info** (info-600): Good to know
  - Stats, tips, promotions
- 🟢 **Success** (success-600): Positive metrics
  - Completed bookings
  - Earnings milestones

### 4. Layout Improvements

**Desktop (Grid):**
```css
.dashboard-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.5rem;
}

.dashboard-main {
  /* Left column: Primary content */
  grid-column: 1;
}

.dashboard-aside {
  /* Right column: Secondary info */
  grid-column: 2;
}
```

**Mobile (Stack):**
- Critical cards first
- Use collapsible sections for less important info
- Sticky CTA buttons at bottom

### 5. Empty States

When user has no active bookings/vehicles, show:
- `<app-empty-state>` with friendly illustration
- Clear CTA to get started (rent a car / publish a car)

### 6. Loading States

Replace generic spinners with:
- `<app-loading-state type="skeleton">` for cards
- Preserve layout to avoid jump

## Implementation Checklist

- [ ] Read current dashboard files (locatario + locador)
- [ ] Map current cards to hierarchy levels
- [ ] Implement section headers with semantic styling
- [ ] Apply card variants (elevated, flat)
- [ ] Add color-coded indicators for urgency
- [ ] Implement responsive grid layout
- [ ] Replace empty/loading states with new components
- [ ] Add icons to section headers
- [ ] Test on mobile/tablet/desktop
- [ ] Verify WCAG AA compliance

## Files to Modify

```
apps/web/src/app/features/dashboard/
├── dashboard-locatario.page.ts
├── dashboard-locatario.page.html
├── dashboard-locador.page.ts
├── dashboard-locador.page.html
└── components/
    ├── dashboard-section-header.component.ts (NEW)
    └── dashboard-stat-card.component.ts (NEW)
```

## Success Metrics

**Before:**
- No clear entry point
- Equal visual weight for all cards
- Users scan entire page to find what they need

**After:**
- Critical actions visible within 1 second
- Clear visual hierarchy with grouped sections
- Users find what they need in top 1/3 of page

## Example Implementation

```typescript
// dashboard-locador.page.html
<div class="dashboard-container">
  <!-- SECTION 1: Urgent -->
  <section class="dashboard-section urgent">
    <h2 class="section-header">
      <svg class="section-icon error">...</svg>
      Requieren Atención
      @if (pendingCount() > 0) {
        <span class="badge error">{{ pendingCount() }}</span>
      }
    </h2>

    <div class="section-grid">
      <app-card variant="elevated" padding="lg" [hoverable]="true">
        <!-- Pending Approvals Card -->
      </app-card>

      <app-card variant="elevated" padding="lg">
        <!-- Today's Check-ins Card -->
      </app-card>
    </div>
  </section>

  <!-- SECTION 2: Vehicles -->
  <section class="dashboard-section">
    <h2 class="section-header">
      <svg class="section-icon">...</svg>
      Mis Vehículos
    </h2>

    <div class="section-grid">
      <app-card variant="elevated" padding="md">
        <!-- Published Vehicles List -->
      </app-card>
    </div>
  </section>

  <!-- SECTION 3: Finances -->
  <section class="dashboard-section">
    <h2 class="section-header">
      <svg class="section-icon success">...</svg>
      Finanzas
    </h2>

    <div class="section-grid">
      <app-wallet-balance-card-v2 />

      <app-card variant="flat" padding="md">
        <!-- Upcoming Payments -->
      </app-card>
    </div>
  </section>
</div>
```

## Related

- Issue #183: UX Audit (Dashboard hierarchy issue identified)
- Issue #186: UI Implementation
- `docs/design-proposals.md`: Design system specification
- `apps/web/src/app/shared/components/card/`: Card component
- `apps/web/src/app/shared/components/empty-state/`: Empty state component
- `apps/web/src/app/shared/components/loading-state/`: Loading state component

## Notes

- This is a specification document. Implementation deferred to future sprint.
- All components and tokens needed for implementation are already created.
- Estimated implementation time: 4 hours (2h locador + 2h locatario)
- Can be implemented incrementally (one section at a time)
