# Audit Report: "My Bookings" Feature

## 1. Architecture Overview

### Frontend
- **Page:** `MyBookingsPage` (`apps/web/src/app/features/bookings/my-bookings/`)
- **Service:** `BookingsService` (`apps/web/src/app/core/services/bookings.service.ts`)
- **Data Fetching:** Calls `getMyBookings()` which queries the `my_bookings` Supabase view.
- **State Management:** Uses Angular Signals (`bookings`, `loading`, `error`) and Computed signals for filtering.

### Backend (Supabase)
- **Table:** `public.bookings` (Core data)
- **View:** `public.my_bookings` (Aggregated data for frontend)
- **Key Relations:**
  - `bookings.car_id` -> `cars.id`
  - `bookings.renter_id` -> `auth.users.id`
  - `bookings.payment_id` -> `payments.id`

## 2. Security Audit (RLS)

### Status: ✅ PASS (High Assurance)

- **Table `bookings`**:
  - **RLS Enabled:** YES
  - **Policies:**
    - `Renters can view own bookings`: Restricted to `auth.uid()`.
    - `Owners can view bookings for their cars`: Uses `EXISTS` subquery.
    - `Authenticated users can request bookings`: Restricted insert.
    - `Owners and renters can update bookings`: Restricted update.

- **View `my_bookings`**:
  - **Security Mechanism:** Hardcoded `WHERE` clause: `WHERE (b.renter_id = auth.uid())`.
  - **Analysis:** This effectively duplicates the RLS logic of the base table, ensuring that even if the view runs with elevated privileges (Security Definer behavior), it still restricts data to the current user.
  - **Recommendation:** Verify if the view should be `WITH (security_invoker = true)` to strictly enforce underlying RLS, though the current `WHERE` clause is a safe redundancy.

## 3. Performance Audit

### Status: ⚠️ WARNING (Potential Bottlenecks)

- **Indexes:**
  - `bookings(renter_id)`: ✅ Exists. Crucial for `my_bookings` view filtering.
  - `bookings(car_id)`: ✅ Exists. Used for joining with `cars`.
  - `car_photos(car_id, sort_order)`: ✅ Exists. Critical for the subquery fetching `main_photo_url`.

- **Potential Issues:**
  - **Subquery in View:** The `my_bookings` view contains a correlated subquery for `main_photo_url`:
    ```sql
    SELECT car_photos.url FROM public.car_photos
    WHERE car_photos.car_id = c.id
    ORDER BY car_photos.sort_order LIMIT 1
    ```
    **Risk:** As `car_photos` grows, this per-row subquery can slow down the listing significantly if the index isn't perfectly utilized.
  - **Join Complexity:** Joins 4 tables (`bookings`, `cars`, `payments`, `car_photos`).

### Recommendations
1.  **Monitor `my_bookings` latency:** If listing becomes slow (>200ms), consider denormalizing `main_photo_url` into the `cars` table to avoid the subquery.
2.  **Pagination:** The frontend service `getMyBookings` supports pagination (`range()`), and the view is efficient enough for paginated loads.

## 4. Code Quality & Maintenance

- **Frontend:**
  - Clean implementation using Signals.
  - Good separation of concerns with `BookingsService`.
  - **Improvement:** The `cancelBooking` logic uses `window.confirm` and `alert`. Recommend replacing with UI components (Modals/Toasts) for better UX.

- **Backend:**
  - `request_booking` RPC function handles validation logic securely on the server side.
  - Usage of specific Types (`booking_status`, etc.) ensures data integrity.

## 5. Summary of Action Items

| Priority | Category | Action |
| :--- | :--- | :--- |
| Low | UX | Replace `alert()`/`confirm()` in `MyBookingsPage` with proper UI components. |
| Medium | Performance | Monitor `my_bookings` view performance; consider denormalizing `main_photo_url` if slow. |
| Low | Security | Verify `my_bookings` view definition for `security_invoker` best practice (optional but recommended). |
