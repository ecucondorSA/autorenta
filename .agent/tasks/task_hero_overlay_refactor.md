# Task: Implement Production-Ready Hero UI Overlay (Angular)

## Objective
Transform the confusing "Hero" section of the Marketplace V2 Page into a polished, high-conversion "Hero Overlay" that sits atop the 3D Car Viewer. This design must adhere to "Senior Product Designer" standards: rigorous readability, a unified "capsule" search bar, and optimized mobile/desktop responsiveness.

## User Requirements
- **Overlay Tech:** UI must float over the `app-car-3d-viewer` (canvas settings are already good, focus is on HTML/CSS).
- **Readability:** Implement a specific "Gradient Scrim" (Black -> Transparent) on the left side.
- **Typography:** Geometric Sans-serif, large titles, tight tracking.
- **Search Bar:** Unified "Capsule" design (Glassmorphism). No separate floating inputs.
- **Primary Action Color:** Neon Green `#00D95F` (Text: Black, Bold).
- **Responsive:**
    - Desktop: Horizontal Search Bar.
    - Mobile: Vertical Stack (Thumb-friendly). Bottom Navigation (simulated or prepared).

## Context
- **Framework:** Angular 18+ (Standalone Components).
- **File:** `apps/web/src/app/features/marketplace/marketplace-v2.page.html`.
- **Current State:** Functional 3D viewer with a basic, somewhat fragmented UI overlay.
- **Design System:** Tailwind CSS.

## Step-by-Step Plan

### 1. Visual Foundation (The Scrim)
- Create an absolute positioned `div` over the 3D viewer.
- Apply a `bg-gradient-to-r from-black/95 via-black/50 to-transparent` to ensure text on the left is readable against *any* 3D background brightness.

### 2. Typography & Copy
- Update the Main Headline (`<h1>`):
    - Font: `font-sans` (assuming Inter/Jakarta is configured as sans).
    - Size: `text-5xl lg:text-7xl`.
    - Weight: `font-bold` or `font-extrabold`.
    - Tracking: `tracking-tighter`.
    - Color: `text-white`.
- Refine Subheadline (`<p>`):
    - Increase readability with slightly larger text (`text-lg` or `text-xl`) and `text-gray-200`.

### 3. The "Money Maker" (Unified Search Bar)
- **Container:**
    - Desktop: `rounded-full` (Capsule). `flex-row`.
    - Mobile: `rounded-3xl` (Card-like). `flex-col`.
    - Style: `bg-white/10 backdrop-blur-xl border border-white/20`.
- **Inputs (Location & Date):**
    - Style: Transparent backgrounds, no borders, white text, white placeholders.
    - Icons: Lucide/Heroicons in `text-gray-300` or Brand Green.
    - Divider: Vertical line separator on Desktop.
- **Action Button ("Buscar"):**
    - Background: `#00D95F`.
    - Text: `text-black font-bold`.
    - Shape: `rounded-full`.
    - Hover: Brightness boost or shadow expansion.

### 4. Code Cleanup
- Remove legacy commented-out code (old badge, old inputs).
- Ensure `z-index` layering is correct (3D Viewer = 0, Scrim = 10, Content = 20).

## Verification
- **Screenshot Check:** Validate contrast, alignment, and the "premium" feel of the search bar.
- **Mobile Check:** Ensure the search bar stacks correctly and is usable.
