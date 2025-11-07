# Bonus Protector Epic #82 - Implementation Analysis

**Date:** 2025-11-07
**Epic:** #82 - Bonus Protector Purchase Flow
**Status:** Partially Implemented

## Executive Summary

The Bonus Protector feature is **~70% complete**. The backend infrastructure and core purchase flow are fully implemented, but key dashboard and notification features are missing.

---

## Epic Requirements vs Implementation Status

| # | Requirement | Status | Location |
|---|-------------|--------|----------|
| 1 | Product page explaining benefits | ✅ **DONE** | `/protections` page with info cards |
| 2 | Protection level selector | ✅ **DONE** | `BonusProtectorPurchaseComponent` |
| 3 | Integrated checkout with wallet | ✅ **DONE** | Purchase flow + wallet validation |
| 4 | Dashboard displaying active protections | ❌ **MISSING** | No dashboard view exists |
| 5 | Renewal reminder notifications | ❌ **MISSING** | No notification integration |
| 6 | Status badge for driver profiles | ❌ **MISSING** | `driver-profile-card` doesn't show protector |
| 7 | Coverage details per level | ✅ **DONE** | Capacity grid in purchase component |

---

## What Exists (Implemented)

### ✅ Backend Infrastructure (100% Complete)

**Database Table:** `driver_protection_addons`
- Location: `supabase/migrations/20251106_create_bonus_malus_core_tables.sql:150-214`
- Schema: 12 columns with full audit trail
- Protection levels 1-3 with claim tracking
- 6-month expiry window

**RPC Functions:** (3 core methods)
- `purchase_bonus_protector(user_id, protection_level, price_cents)` ✅
- `apply_bonus_protector(user_id, claim_id, claim_severity)` ✅
- `get_active_bonus_protector(p_user_id)` ✅

**TypeScript Service:** `BonusProtectorService`
- Location: `apps/web/src/app/core/services/bonus-protector.service.ts`
- Full API coverage with Angular Signals
- Computed properties: `hasActiveProtector`, `protectionLevel`, `isExpired`, `isNearExpiry`
- Methods: `loadOptions()`, `loadActiveProtector()`, `purchaseProtector()`, `simulateClaimImpact()`

### ✅ Frontend Purchase Flow (100% Complete)

**Component:** `BonusProtectorPurchaseComponent`
- Location: `apps/web/src/app/shared/components/bonus-protector-purchase/`
- Features:
  - 8 template sections (active status, recommendation, options, simulator, etc.)
  - Interactive claim impact simulator
  - Savings calculation and ROI analysis
  - Wallet integration with confirmation dialogs
  - Level selector with pricing (Level 1: $15, Level 2: $25, Level 3: $40)
  - Protection capacity display (leve/moderado/grave claims)

**Page:** `ProtectionsPage`
- Location: `apps/web/src/app/features/protections/protections.page.ts`
- Route: `/protections` (with AuthGuard)
- Integrated purchase component
- Vehicle insurance information
- Quick links to wallet and driver profile

**Navigation:**
- Linked from `/driver-profile` (line 73)
- Linked from `/booking-checkout` (line 203)
- Linked from `/profile` (profile-expanded.page.html:463)

---

## What's Missing (To Complete Epic)

### ❌ 1. Dashboard Component for Active Protections

**Requirement:** Display active protection status prominently

**Needed:**
- Add active protector section to `driver-profile-card.component.ts`
- Show:
  - Protection level badge (🛡️ Nivel 1/2/3)
  - Remaining claims (e.g., "2 usos restantes")
  - Expiry date with countdown ("Expira en 45 días")
  - Visual indicator for near-expiry (warning color)
  - Quick link to renew/purchase

**Implementation Plan:**
```typescript
// In driver-profile-card.component.ts
inject(BonusProtectorService)
- Add computed signal for activeProtector
- Display badge in template after "Class Badge" section
- Use color coding: success (active), warning (near expiry), danger (expired)
```

### ❌ 2. Renewal Reminder Notifications

**Requirement:** Notify users when protection is about to expire

**Needed:**
- Notification trigger: 7 days before expiry
- Notification trigger: 1 day before expiry
- Notification trigger: On expiry day
- Integration with existing `NotificationsService`

**Implementation Options:**

**Option A: Database Trigger (Recommended)**
```sql
-- Create notification on protector expiry check
-- Add to cron job that runs daily
-- Insert into user_notifications table
```

**Option B: Edge Function**
```typescript
// Supabase Edge Function: check-expiring-protectors
// Runs daily via cron
// Queries protectors expiring in 1, 7 days
// Creates notifications via notifications service
```

**Integration Points:**
- Table: `user_notifications` (if exists)
- Service: `apps/web/src/app/core/services/user-notifications.service.ts`
- Page: `apps/web/src/app/features/notifications/notifications.page.ts`

### ❌ 3. Status Badge for Driver Profiles

**Requirement:** Show protection status on driver profile

**Needed:**
- Add badge to `DriverProfileCardComponent` template
- Badge variations:
  - "🛡️ Protegido (Nivel 2)" - Active protector
  - "⚠️ Expira pronto" - Near expiry (< 7 days)
  - "❌ Sin protección" - No active protector
- Badge click opens `/protections` page or renewal modal

**Implementation:**
```html
<!-- In driver-profile-card template, after class badge -->
<div class="protector-badge-container" *ngIf="hasActiveProtector()">
  <ion-badge [color]="protectorBadgeColor()" class="protector-badge">
    <ion-icon [name]="protectorIcon()"></ion-icon>
    <span>{{ protectorBadgeText() }}</span>
  </ion-badge>
  <button (click)="onManageProtector()">Gestionar</button>
</div>
```

---

## Critical Integration Gap

**Missing Claim Processing Integration:**

The `apply_bonus_protector()` RPC function exists but is **NOT called** during claim approval workflow.

**Impact:** Users can purchase protection, but it's **never actually applied** when claims are processed. Driver class still increases despite having active protector.

**Fix Required:**
```typescript
// In claim approval workflow (admin or automated)
// After claim is approved:
if (claim.driver_has_fault) {
  // Check if driver has active protector
  const result = await supabase.rpc('apply_bonus_protector', {
    user_id: claim.driver_id,
    claim_id: claim.id,
    claim_severity: claim.severity
  });

  if (result.data.protection_applied) {
    // Notify driver that protector was used
    // Update claim record
  }
}
```

---

## Implementation Priority

### High Priority (Completes Epic #82)
1. ✅ **Add active protector status to driver-profile-card** (2-3 hours)
2. ✅ **Add status badge to driver profile page** (1 hour)
3. ✅ **Create renewal notifications system** (4-5 hours)
   - Database trigger or Edge Function
   - Integration with notifications service
   - Test notification delivery

### Medium Priority (Operational)
4. **Fix claim processing integration** (2 hours)
   - Find claim approval workflow
   - Add `apply_bonus_protector()` call
   - Test with mock claim

### Low Priority (Enhancements)
5. **Admin dashboard for protectors** (future)
6. **Analytics and reporting** (future)
7. **Email notifications for expiry** (future)

---

## Testing Checklist

### Purchase Flow
- [ ] User can view protections page
- [ ] Level selector displays 3 options with correct pricing
- [ ] Wallet balance validation works
- [ ] Purchase deducts from wallet
- [ ] Active protector displays after purchase
- [ ] Cannot purchase second protector while one is active

### Dashboard Display
- [ ] Active protector shows on driver profile card
- [ ] Badge displays correct level and remaining claims
- [ ] Expiry countdown is accurate
- [ ] Near-expiry warning appears 7 days before
- [ ] Expired protector shows correctly

### Notifications
- [ ] Notification created 7 days before expiry
- [ ] Notification created 1 day before expiry
- [ ] Notification created on expiry day
- [ ] Clicking notification navigates to protections page

### Claim Processing
- [ ] Protector applies when claim is approved
- [ ] Driver class doesn't increase when protected
- [ ] Claims counter decrements correctly
- [ ] Protector marks as used when exhausted
- [ ] Audit trail records protector application

---

## Files to Modify

### 1. Driver Profile Card Component
**File:** `apps/web/src/app/shared/components/driver-profile-card/driver-profile-card.component.ts`
**Changes:**
- Inject `BonusProtectorService`
- Add computed signals for active protector status
- Add template section for protector badge
- Add click handler to navigate to protections page

### 2. Notifications System
**Files:**
- New: `supabase/migrations/YYYYMMDD_create_protector_expiry_notifications.sql`
- New: `supabase/functions/check-expiring-protectors/index.ts` (Edge Function)
- Modify: `supabase/migrations/YYYYMMDD_setup_bonus_malus_cron_jobs.sql` (add cron job)

### 3. Notifications Service (Integration)
**File:** `apps/web/src/app/core/services/user-notifications.service.ts`
**Changes:**
- Ensure notification types include 'protector_expiring', 'protector_expired'
- Add handlers for protector notification clicks

### 4. Claim Processing (Critical Bug Fix)
**File:** TBD - Need to find claim approval workflow
**Search for:**
- `booking_claims` table inserts/updates
- Claim approval logic
- Admin claim processing

---

## Estimated Effort

| Task | Effort | Priority |
|------|--------|----------|
| Driver profile badge | 2-3 hours | HIGH |
| Renewal notifications | 4-5 hours | HIGH |
| Dashboard component | 2 hours | HIGH |
| Claim integration fix | 2 hours | MEDIUM |
| Testing | 3-4 hours | HIGH |
| **TOTAL** | **13-16 hours** | - |

---

## Conclusion

The Bonus Protector feature has a **solid foundation** with complete backend infrastructure and purchase UI. To complete Epic #82, we need to implement:

1. ✅ Dashboard/status display in driver profile card
2. ✅ Renewal reminder notifications
3. ✅ Status badge on driver profiles

Additionally, there's a **critical bug** where purchased protectors are never actually applied during claim processing. This should be fixed to make the feature functional.

**Next Steps:**
1. Implement missing UI components (dashboard badge + status)
2. Create notification system for expiry reminders
3. Fix claim processing integration
4. Comprehensive E2E testing
5. User acceptance testing

**Recommended Approach:**
Start with dashboard/badge implementation (high visibility, low complexity), then tackle notifications (higher complexity but essential for UX), and finally fix the claim processing integration (critical for functionality).
