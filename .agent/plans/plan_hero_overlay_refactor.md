# Implementation Plan - Production Hero Overlay

This plan details the specific code changes required to implement the "Hero Overlay" design in `apps/web/src/app/features/marketplace/marketplace-v2.page.html`.

## 1. Structure Overview

We will restructure the top section of the page to have a clear layering:
- **Layer 0 (Background):** `app-car-3d-viewer` (Full screen).
- **Layer 1 (Scrim):** CSS Gradient Overlay (Left-aligned).
- **Layer 2 (Content):** Header, Text, and Search Bar centered/left-aligned.

## 2. CSS/Tailwind Classes

### The Scrim
```html
<div class="absolute inset-0 bg-gradient-to-r from-black/95 via-black/60 to-transparent pointer-events-none z-10"></div>
```

### The Search Bar (Desktop: Capsule, Mobile: Stack)
```html
<div class="group relative z-20 w-full max-w-4xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl lg:rounded-full p-2 flex flex-col lg:flex-row gap-2">

  <!-- Location Input Wrapper -->
  <div class="flex-1 relative flex items-center px-4 h-16 lg:h-auto border-b lg:border-b-0 lg:border-r border-white/10">
    <icon class="text-white/60 w-5 h-5 mr-3" />
    <div class="flex flex-col w-full">
      <label class="text-[10px] uppercase font-bold text-[#00D95F] tracking-wider">Ubicación</label>
      <input class="bg-transparent border-none p-0 text-white placeholder-white/50 focus:ring-0 text-base font-medium w-full" placeholder="Ciudad o aeropuerto" />
    </div>
  </div>

  <!-- Date Input Wrapper -->
  <div class="flex-1 relative flex items-center px-4 h-16 lg:h-auto">
    <icon class="text-white/60 w-5 h-5 mr-3" />
    <div class="flex flex-col w-full">
      <label class="text-[10px] uppercase font-bold text-[#00D95F] tracking-wider">Fechas</label>
      <app-date-range-picker class="custom-trigger" />
    </div>
  </div>

  <!-- Search Button -->
  <button class="w-full lg:w-auto bg-[#00D95F] hover:bg-[#00c053] text-black font-bold text-lg rounded-2xl lg:rounded-full px-8 py-4 lg:py-3 transition-all transform active:scale-95 shadow-lg shadow-[#00D95F]/20 flex items-center justify-center gap-2">
    <icon class="w-5 h-5" />
    <span>Buscar</span>
  </button>

</div>
```

## 3. Interaction Logic Updates
- **Mobile Navigation:** The user mentioned "Bottom Bar (estilo app nativa)" for Mobile. We should verify if a `BottomNavComponent` exists. If not, we will focus on the Hero section first as requested, but ensure the search bar doesn't overlap with a potential bottom space.
- **Date Picker:** Ensure `app-date-range-picker` can accept custom styling or slots to fit into the transparent design. We might need to wrap it or use a "trigger" style approach if the component supports it.

## 4. Execution Steps
1.  **Modify `marketplace-v2.page.html`**:
    - Remove the existing Hero text container.
    - Remove the existing Search Bar container logic.
    - Insert the new "Senior Designer" layout.
2.  **Verify & Tweak**:
    - Check the `#00D95F` contrast against the black text (should be AAA).
    - Check spacing on mobile (thumb reach).

## 5. Potential Pitfalls
- **Date Picker Styling:** The `app-date-range-picker` might be rigid. If it brings its own white background/borders, we might need to apply `::ng-deep` or global styles to make it blend into the glassmorphism, or simply wrap it carefully.
- **Z-Index Wars:** Ensuring the dropdowns (Location suggestions, Date calendar) pop *over* the glass container and 3D viewer.
