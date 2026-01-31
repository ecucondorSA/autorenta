# 🚗 AutoRenta Cars Experience Revamp Plan

## 🎯 Objective
Transform the Car Rental experience into a **premium, intuitive, and frictionless** journey. We will focus on the "Conversion" (Landing) page and the "List" (Browse) page, ensuring high-quality UX that rivals top-tier platforms (Airbnb, Turo).

## 📍 Focus Areas
1.  **Landing Page (`/cars`)**: Capture intent immediately with a smart search interface.
2.  **List Page (`/cars/list`)**: Advanced filtering by "groups of words", seamless map/list integration.
3.  **Booking Flow**: Intuitive transition from selection to reservation.

---

## 🛠 Phase 1: High-Conversion Landing Page (`CarsConversionPage`)

The current page is visually appealing but static. We need to make it functional immediately.

### 1. Smart Search Component (Hero Section)
Replace the simple "Explorar autos" button with a **floating search bar** that captures:
-   **Location:** City or Neighborhood (e.g., "Palermo, Buenos Aires").
-   **Dates:** Pickup and Return dates.
-   **Action:** "Buscar" button that navigates to `/cars/list` with pre-filled filters.

### 2. "Featured" Optimization
-   Ensure the "Featured Cars" grid uses the highest quality images.
-   Add "Instant Book" badges to cars that support it.

**Technical Changes:**
-   Update `cars-conversion.page.html`: Embed a new `<search-bar>` component or inline form.
-   Update `cars-conversion.page.ts`: Implement `onSearch` to pass `location`, `startDate`, `endDate` as query params.

---

## 🔍 Phase 2: Intelligent List & Discovery (`BrowseCarsPage`)

The user requested **"Filtering by groups of words"**. This means users should be able to type "SUV automatico palermo" and get results.

### 1. Advanced Search Header
-   Implement a sticky header with a **Omnibox Search**.
-   **Logic:** Parse search query into tokens:
    -   *Type:* SUV, Sedan, Coupe
    -   *Feature:* Automatico, Bluetooth, GPS
    -   *Location:* Palermo, Recoleta
-   **Visuals:** Show active filters as "Chips" that can be dismissed.

### 2. Map vs List Harmony
-   Ensure the Map View interacts perfectly with the List.
-   **Hover Effect:** Hovering a card in the list highlights the pin on the map.
-   **Mobile:** polished "Map Toggle" button (already exists, will refine animations).

### 3. Car Card 2.0
-   Redesign `app-car-card` for the list view to emphasize:
    -   **Total Price** vs **Daily Price** (Toggle).
    -   **Badges:** "Entrega Gratis", "Seguro Incluido".
    -   **Owner Status:** "Superhost" / "Verificado".

**Technical Changes:**
-   Refactor `BrowseStore` to handle complex filtering logic.
-   Implement a text-parser utility for the "Group of words" search.

---

## 📅 Phase 3: Seamless Booking Entry

### 1. Booking Sheet / Detail
-   When a user clicks a car, open a **Detailed Bottom Sheet** (Mobile) or **Side Panel** (Desktop) instead of navigating away immediately.
-   Allow checking availability without leaving the list context.

---

## 🚀 Execution Steps

1.  **Step 1:** Modify `CarsConversionPage` to include the Date/Location search form.
2.  **Step 2:** Update `BrowseCarsPage` to read these new query params.
3.  **Step 3:** Implement the "Group of Words" filtering logic in `BrowseStore`.
4.  **Step 4:** Polish UI/UX (Animations, Loading States, Empty States).

## 🛡️ Quality Assurance
-   **Tokens:** We will use `tokens` sparingly but effective for search parsing if needed (or simple regex/string matching first).
-   **Performance:** Ensure the Map doesn't lag when filtering.
-   **Responsiveness:** Test on Mobile (375px width) and Desktop (1920px).
