# 🚗 Implementation Plan: Cars & Booking UX V2

> **Objective:** Elevate the "Browse Cars" and "Booking Request" experiences to a world-class, professional standard. Focus on intuitive UX, "Dark Ivory" aesthetic, and robust performance.

## 🎯 Goals
1.  **Professional UI:** Refine visual hierarchy, typography, and spacing. Implement "Dark Ivory" theme consistently.
2.  **Intuitive UX:** Streamline the flow from browsing -> selecting -> booking.
3.  **Performance:** Maintain high performance (10k+ cars map) while adding visual richness.
4.  **Robustness:** comprehensive error handling and testing.

## 🛠️ Key Areas

### 1. Cars List (`/cars/list`) - `BrowseCarsPage`

**Current State:** Split layout (List/Map), functional but basic visual polish.
**Improvements:**

*   **Layout:**
    *   [ ] Refine `split-layout` for better desktop/mobile transitions.
    *   [ ] Improve "Map vs List" toggle interaction on mobile (floating action button or bottom bar).
    *   [ ] **Skeleton Loading:** Replace simple spinners with skeleton screens for the list panel.
*   **`CarCardComponent`:**
    *   [ ] **Visual Polish:** Enhance typography (Satoshi font), refined shadows, and "Dark Ivory" colors.
    *   [ ] **Badges:** Standardize badges (Instant, Premium, etc.) with consistent styling.
    *   [ ] **Hover Effects:** Smoother scale/lift effects.
*   **`BookingSheetComponent`:**
    *   [ ] **Rich Content:** Display real car specs (Motor, Transmission, etc.) instead of hidden/fake data.
    *   [ ] **Action:** Make the "Continuar" button more prominent with price summary inside.
    *   [ ] **Transitions:** Ensure smooth slide-up/down animations with backdrop blur.

### 2. Booking Request (`/bookings/request`) - `BookingRequestPage`

**Current State:** Feature-rich but visually dense.
**Improvements:**

*   **Visual Hierarchy:**
    *   [ ] **Skeleton Loading:** Implement a full-page skeleton loader that mimics the final layout.
    *   [ ] **Summary Card:** Redesign the sticky summary to be cleaner and more readable. Use "glassmorphism" effects carefully.
    *   [ ] **Tabs:** Enhance tab switching with slide animations.
*   **Guarantee Section:**
    *   [ ] **Simplify:** Group complex information (Fiscal, P2P info) into cleaner accordions or modals.
    *   [ ] **Selection:** Make the "Card vs Wallet" selection more visual (large cards with icons).
*   **Protection Selector:**
    *   [ ] **Visual Cards:** Make the protection plans (Standard, Premium, Zero) look like distinct products with clear value props.

### 3. Shared Components & Theme

*   **Typography:** Ensure `Satoshi` font is used correctly for headings and `Inter` or `Sans` for body.
*   **Colors:** strict adherence to `zinc-900` (surface), `zinc-800` (border), `white` (text), and brand accent colors.

## 📅 Step-by-Step Plan

### Phase 1: Cars List Polish
1.  **Refactor `CarCardComponent`:**
    *   Update HTML structure for better semantic meaning.
    *   Apply new CSS classes for "Dark Ivory" look.
    *   Add Skeleton state.
2.  **Update `BrowseCarsPage`:**
    *   Implement Skeleton loader in the list panel.
    *   Refine mobile layout constraints.
3.  **Enhance `BookingSheetComponent`:**
    *   Connect real car data (features/specs).
    *   Polish the visual design.

### Phase 2: Booking Request UX
1.  **Refactor `BookingRequestPage`:**
    *   Create `BookingRequestSkeletonComponent`.
    *   Redesign the "Right Column" Summary Card.
    *   Refactor the "Guarantee" section for better readability.
2.  **Protection Selector:**
    *   Create a dedicated sub-component for `ProtectionPlanCard`.

### Phase 3: Testing & Verification
1.  **Unit Tests:** Add/Update tests for `CarCardComponent` and `BookingRequestPage`.
2.  **E2E:** Manual verification of the flow: List -> Map -> Sheet -> Request -> Success.
3.  **Edge Cases:** Test network failure, empty states, and invalid params.

## 🧪 Testing Strategy
-   **Visual:** Verify dark mode, mobile responsiveness, and high-DPI rendering.
-   **Functional:** Verify booking flow integrity (params passing, price calculation).
