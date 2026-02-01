# 🚀 Implementation Plan: Referral System V1 (Growth Engine)

> **Goal:** Create a viral loop where users invite friends and both earn Wallet credits upon the referee's first completed trip.

## 1. 🗄️ Database Architecture (Supabase)

We need robust tracking of who invited whom and the status of that invitation.

### Tables
1.  **`referral_codes`**: Maps users to their unique invite code (e.g., `EDU123`).
    -   `code`: Unique string (6-8 chars).
    -   `user_id`: Owner of the code.
    -   `usage_count`: Stats.
2.  **`referrals`**: Tracks the relationship.
    -   `referrer_id`: Who invited.
    -   `referred_id`: Who accepted.
    -   `status`: `pending_trip` | `completed`.
    -   `reward_amount`: Snapshot of the reward at that time.

### Logic (Triggers/Functions)
1.  **`generate_referral_code`**: Auto-runs on `auth.users` insert. Ensures every user has a code from Day 1.
2.  **`process_referral_reward`**: Trigger on `bookings` update.
    -   When a booking changes to `completed`.
    -   Check if `renter_id` was referred by someone.
    -   If yes, and it's their *first* trip:
        -   Credit Referrer Wallet ($10 USD equivalent).
        -   Credit Referee Wallet ($5 USD equivalent).
        -   Mark referral as `completed`.

## 2. 🧩 Frontend Implementation (Angular)

### Services
-   **`ReferralService`**:
    -   `getMyCode()`: Fetches user's unique code.
    -   `getStats()`: Earned amount, invite count.
    -   `claimCode(code)`: Logic for a new user to enter a code (if not deep-linked).

### UI Components
-   **`ReferralsPage`**:
    -   **Hero:** "Invite friends, earn $10".
    -   **Code Card:** Copy to clipboard / Native Share.
    -   **Status List:** "Juan P. - Registered", "Maria L. - Trip Completed (+10)".

## 3. 🔗 Deep Linking (The "Magic")

-   **URL:** `autorenta.com/ref/:code`
-   **Behavior:**
    -   If app installed: Opens app, stores code in local storage/session.
    -   If web: Stores code in cookies/local storage.
    -   **On Signup:** Reads the stored code and applies it to the new account via `rpc`.

---

## 📝 Execution Steps

1.  **Database:** Create `referral_codes` & `referrals` tables + Triggers.
2.  **Backend:** Create RPC `claim_referral_code` and `get_referral_stats`.
3.  **Frontend:** Update `ReferralsPage` to use real data.
4.  **Integration:** Connect `BookingService` completion to the reward trigger.
