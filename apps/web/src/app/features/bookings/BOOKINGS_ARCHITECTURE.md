# Booking Domain Architecture

> **Last Updated:** 2026-01-24
> **Status:** Analysis & Consolidation Phase

## 1. Overview
The `bookings` feature module manages the entire lifecycle of a vehicle rental, from the initial request to the final review and settlement. It handles two distinct user roles: **Renters** (Guests) and **Owners** (Hosts), often within similar views but with different actions.

## 2. Current Architecture

### Entry Points
- **Renter:** `BookingsHubPage` (`/bookings`)
  - A "Smart Container" that contextually switches views based on the user's state:
    - **Pre-Trip:** Upcoming trip within 48h.
    - **Active-Trip:** Currently on a trip.
    - **Pending-Action:** Payment or approval needed.
    - **Idle:** Default list view (wraps legacy `MyBookingsPage`).
- **Owner:** `OwnerBookingsPage` (`/bookings/owner`)
  - A dashboard view focused on management tasks: "Pending Approval", "Pending Review", "Upcoming Check-ins".

### The "God Component": `BookingDetailPage`
- Located at `/bookings/:id`.
- Currently handles **too many responsibilities**:
  - Status display.
  - Flow navigation (Stepper).
  - Extension requests.
  - Dispute management.
  - Claims & Insurance.
  - Reviews.
  - Payment details.
- **Refactoring Goal:** Break this down into smaller, route-based feature pages (e.g., `/bookings/:id/manage`, `/bookings/:id/payment`).

### Specialized Views
- **Active Rental:** `ActiveRentalPage` (`/bookings/:id/active`)
  - A simplified "Dashboard" for the renter *during* the trip. Focused on "Emergency", "Extend", "Return Info".
- **Pending Payment:** `BookingPendingPage` (`/bookings/:id/pending`)
  - A waiting room for async payment confirmation (Realtime + Polling).

## 3. Booking Lifecycle Flows

### A. P2P Request Flow (Owner Approval)
1. **Request:** Renter creates request (`BookingRequestPage`).
2. **Pending Approval:** Status `pending`, `payment_mode=wallet`. Owner sees in `PendingApprovalPage`.
3. **Approved:** Owner accepts. Status -> `pending_payment`.
4. **Payment:** Renter pays. Status -> `confirmed`.

### B. Handover (Check-in)
1. **Owner Check-in:** Owner verifies driver documents and hands over keys (`OwnerCheckInPage`).
2. **Renter Check-in:** Renter confirms condition and receipt (`CheckInPage`).
3. **Start:** Status -> `in_progress`.

### C. Return (Check-out)
1. **Renter Check-out:** Renter returns car and takes photos (`CheckOutPage`).
2. **Pending Review:** Status -> `pending_review`.
3. **Owner Check-out:** Owner inspects car and confirms return (`OwnerCheckOutPage`).
4. **Completion:** Status -> `completed` (or `disputed` if damages reported).

## 4. Identified Issues & Technical Debt

1.  **Directory Structure:** The `bookings/` folder is flat and mixes Renter, Owner, and Shared pages.
    - *Fix:* Group into `renter/`, `owner/`, and `shared/`.
2.  **Duplication:**
    - `MyBookingsPage` vs `OwnerBookingsPage`: Similar lists but diverged code.
    - `ActiveRentalPage` vs `BookingDetailPage`: Overlapping functionality for "in_progress" state.
3.  **State Management:**
    - Newer pages (`BookingsHub`) use `BookingsStore` (Signals).
    - Older pages use Service + Observables directly.
    - *Goal:* Migrate all to `BookingsStore`.
4.  **Legacy Routes:** `bookings.routes.ts` contains legacy paths that should be cleaned up or marked as deprecated.

## 5. Proposed Directory Structure

```text
bookings/
├── core/                # Module-specific services/guards/models
├── components/          # Dumb components (Cards, Badges, StatusIndicators)
├── renter/              # Renter-specific pages
│   ├── hub/             # BookingsHub (Main Entry)
│   ├── list/            # MyBookings (History/List)
│   ├── request/         # Request Flow
│   ├── active/          # ActiveRental (Trip Dashboard)
│   ├── check-in/        # Renter Check-in Flow
│   └── check-out/       # Renter Check-out Flow
├── owner/               # Owner-specific pages
│   ├── dashboard/       # OwnerBookings (Main Entry)
│   ├── approvals/       # PendingApproval
│   ├── check-in/        # Owner Check-in Flow
│   └── check-out/       # Owner Check-out Flow
└── shared/              # Shared Pages
    ├── detail/          # BookingDetail (The heavy lifter - to be refactored)
    └── disputes/        # Dispute Management
```
