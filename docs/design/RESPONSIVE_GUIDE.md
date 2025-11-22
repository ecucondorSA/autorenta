# Responsive Design Strategy for Autorenta

## Overview

This document outlines the strategy and guidelines for implementing responsive design across the Autorenta platform. The goal is to ensure a seamless and optimal user experience on a wide range of devices and screen sizes, from mobile phones to large desktop displays.

## Tools and Technologies

The Autorenta project leverages the following tools for responsive design:

*   **Tailwind CSS:** A utility-first CSS framework that provides a robust set of responsive utility classes (e.g., `sm:`, `md:`, `lg:`) for controlling layout, styling, and visibility based on screen size.
*   **PrimeNG:** An Angular UI component library. Many PrimeNG components offer built-in responsive features and configurations.
*   **Angular (Standalone Components):** The component-based architecture facilitates applying responsive styles at the component level.

## Breakpoints

The project utilizes custom breakpoints defined in `apps/web/tailwind.config.js`. These breakpoints serve as the foundation for applying responsive styles using Tailwind CSS utility classes:

*   `xs`: `480px`
*   `sm`: `640px`
*   `md`: `768px`
*   `lg`: `1024px`
*   `xl`: `1280px`
*   `2xl`: `1536px`
*   `3xl`: `1920px`

When applying responsive styles, always refer to these defined breakpoints.

## General Guidelines

1.  **Mobile-First Approach:** Design and develop for the smallest screen first, then progressively enhance the layout and features for larger screens. This ensures a solid foundation for all users.
2.  **Utilize Tailwind CSS Responsive Utilities:**
    *   Use responsive prefixes (e.g., `sm:flex`, `md:grid-cols-2`, `lg:hidden`) to apply styles conditionally based on screen size.
    *   Prefer `flexbox` and `CSS Grid` for layout management.
    *   Use `w-full`, `max-w-`, `min-w-` to control element widths.
    *   Employ `overflow-x-auto` for horizontally scrollable content where appropriate (e.g., navigation menus, filter pills).
    *   Use `flex-wrap` to allow items in a flex container to wrap onto multiple lines.
3.  **Leverage PrimeNG Responsive Features:** Explore and configure PrimeNG components for their built-in responsive capabilities (e.g., `p-table` responsive modes, `p-dialog` breakpoints).
4.  **Fluid Typography:** The project's `tailwind.config.js` already includes fluid typography using `clamp()` for `fontSize`, which automatically adjusts text size based on the viewport width.
5.  **Testing:**
    *   Always test changes on various screen sizes and orientations using browser developer tools.
    *   Consider extending Playwright e2e tests to include responsive checks for critical layouts.
6.  **Avoid Fixed Heights/Widths:** Unless absolutely necessary, avoid setting fixed pixel heights or widths. Prefer relative units (percentages, `vw`, `vh`, `rem`, `em`) or Tailwind's responsive utilities.
7.  **Accessibility:** Ensure responsive adjustments do not negatively impact accessibility. Maintain proper focus order, contrast, and touch target sizes.

## Example: MarketplaceV2Page (`apps/web/src/app/features/marketplace/marketplace-v2.page.html`)

As an initial implementation, the `MarketplaceV2Page` has been updated to improve its responsiveness:

*   **View Toggle Section:** The container for the title and view controls now uses `flex-col` on `xs` screens and `flex-row` on `sm` and up, with appropriate spacing, to prevent cramping on small devices.
*   **Grid View Car Card:**
    *   The `location_city` span no longer has a fixed `max-w-[120px]`, allowing the `truncate` utility to manage its length more flexibly.
    *   The features container now includes `flex-wrap` to ensure features wrap to the next line on smaller screens, preventing horizontal overflow.
*   **List View Car Card:**
    *   The features container now includes `flex-wrap` for better handling of multiple features on small screens.
    *   The `div` containing the car title, rating, location, and price now uses `flex-col` on `xs` screens and `flex-row` on `sm` and up, with `gap-2`, to ensure a readable and well-spaced layout on various screen sizes.

This iterative approach will be applied to other core UI components and pages as identified in the responsive design plan.
