# AutoRenta - RPC Functions Reference

**Last Updated:** 2025-12-28

This document provides JSDoc-style documentation for the main PostgreSQL RPC functions in AutoRenta.

---

## Table of Contents

1. [Booking Functions](#1-booking-functions)
2. [Wallet Functions](#2-wallet-functions)
3. [Car Search Functions](#3-car-search-functions)
4. [Analytics Functions](#4-analytics-functions)
5. [Admin Functions](#5-admin-functions)
6. [Maintenance Functions](#6-maintenance-functions)

---

## 1. Booking Functions

### `check_car_availability`

Checks if a car is available for a given date range.

```sql
/**
 * @function check_car_availability
 * @description Verifies if a car is available for booking in the specified date range
 * @param {UUID} p_car_id - The car ID to check
 * @param {DATE} p_start_date - Start date of the rental period
 * @param {DATE} p_end_date - End date of the rental period
 * @returns {TABLE} availability status and conflict details
 *   - available: BOOLEAN - Whether the car is available
 *   - conflict_booking_id: UUID - ID of conflicting booking (if any)
 *   - conflict_reason: TEXT - Reason for unavailability
 * @example
 *   SELECT * FROM check_car_availability(
 *     'car-uuid-here',
 *     '2025-01-15',
 *     '2025-01-20'
 *   );
 */
```

### `booking_confirm_and_release`

Confirms a booking completion and releases funds.

```sql
/**
 * @function booking_confirm_and_release
 * @description Handles bilateral confirmation of booking completion.
 *              When both parties confirm, releases locked funds appropriately.
 * @param {UUID} p_booking_id - The booking ID
 * @param {TEXT} p_role - Role of confirming party: 'owner' or 'renter'
 * @param {BOOLEAN} p_reported_damages - Whether damages were reported (owner only)
 * @returns {JSONB} Result with status and transaction details
 *   - status: 'confirmed' | 'pending_other_party' | 'error'
 *   - rental_released: NUMERIC - Amount released to owner
 *   - deposit_released: NUMERIC - Amount returned to renter
 * @example
 *   SELECT booking_confirm_and_release(
 *     'booking-uuid',
 *     'owner',
 *     false
 *   );
 */
```

### `log_payment_event`

Logs a payment state change event for audit trail.

```sql
/**
 * @function log_payment_event
 * @description Records a payment event in the booking_payment_events table
 *              for complete audit trail of payment lifecycle.
 * @param {UUID} p_booking_id - The booking ID
 * @param {TEXT} p_event_type - Event type: 'created', 'approved', 'captured', 'refunded', 'failed'
 * @param {TEXT} p_payment_provider - Provider: 'mercadopago', 'paypal', 'wallet'
 * @param {TEXT} p_payment_id - External payment ID from provider
 * @param {JSONB} p_event_data - Additional event data
 * @param {JSONB} p_provider_response - Raw response from payment provider
 * @returns {UUID} The created event ID
 * @example
 *   SELECT log_payment_event(
 *     'booking-uuid',
 *     'captured',
 *     'mercadopago',
 *     'PAY-123456',
 *     '{"amount": 15000}',
 *     '{"status": "approved"}'
 *   );
 */
```

---

## 2. Wallet Functions

### `wallet_lock_rental_and_deposit`

Locks funds for both rental payment and security deposit.

```sql
/**
 * @function wallet_lock_rental_and_deposit
 * @description Atomically locks rental amount and security deposit from renter's wallet.
 *              Creates two separate lock transactions for proper accounting.
 * @param {UUID} p_booking_id - The booking ID
 * @param {NUMERIC} p_rental_amount - Rental amount to lock (in cents)
 * @param {NUMERIC} p_deposit_amount - Security deposit to lock (default: 25000 = $250 USD)
 * @returns {JSONB} Result with transaction IDs and locked amounts
 *   - rental_lock_transaction_id: UUID
 *   - deposit_lock_transaction_id: UUID
 *   - total_locked: NUMERIC
 * @throws {EXCEPTION} If insufficient balance
 * @example
 *   SELECT wallet_lock_rental_and_deposit(
 *     'booking-uuid',
 *     15000,  -- $150 rental
 *     25000   -- $250 deposit
 *   );
 */
```

### `wallet_complete_booking`

Completes a booking and releases funds to appropriate parties.

```sql
/**
 * @function wallet_complete_booking
 * @description Releases locked funds after successful booking completion.
 *              Rental goes to owner (minus platform fee), deposit returns to renter.
 * @param {UUID} p_booking_id - The booking ID
 * @returns {JSONB} Result with released amounts
 *   - owner_received: NUMERIC - Amount credited to owner
 *   - renter_refunded: NUMERIC - Deposit returned to renter
 *   - platform_fee: NUMERIC - Platform fee deducted
 * @example
 *   SELECT wallet_complete_booking('booking-uuid');
 */
```

### `wallet_complete_booking_with_damages`

Completes a booking with damage claims deducted.

```sql
/**
 * @function wallet_complete_booking_with_damages
 * @description Releases locked funds with damage amount deducted from deposit.
 *              Damage amount goes to owner, remainder of deposit to renter.
 * @param {UUID} p_booking_id - The booking ID
 * @param {NUMERIC} p_damage_amount - Amount to deduct for damages (in cents)
 * @param {TEXT} p_damage_description - Description of damages
 * @returns {JSONB} Result with released and deducted amounts
 *   - owner_received: NUMERIC - Rental + damage amount
 *   - renter_refunded: NUMERIC - Deposit minus damage
 *   - damage_deducted: NUMERIC - Amount for damages
 * @example
 *   SELECT wallet_complete_booking_with_damages(
 *     'booking-uuid',
 *     5000,  -- $50 damage
 *     'Minor scratch on rear bumper'
 *   );
 */
```

### `admin_get_wallet_metrics`

Returns comprehensive wallet usage metrics.

```sql
/**
 * @function admin_get_wallet_metrics
 * @description Generates detailed wallet analytics for admin dashboard.
 *              Includes deposits, withdrawals, balances, and trends.
 * @param {TIMESTAMPTZ} p_start_date - Start of analysis period (default: 30 days ago)
 * @param {TIMESTAMPTZ} p_end_date - End of analysis period (default: now)
 * @returns {JSONB} Comprehensive metrics object
 *   - summary: { total_users, active_users, transaction_counts }
 *   - deposits: { total, average, period_stats }
 *   - withdrawals: { total, average, period_stats }
 *   - balances: { total, distribution, top_users }
 *   - by_provider: { mercadopago, paypal, wallet }
 *   - daily_trend: [ { date, deposits, withdrawals } ]
 * @example
 *   SELECT admin_get_wallet_metrics(
 *     NOW() - INTERVAL '7 days',
 *     NOW()
 *   );
 */
```

### `admin_wallet_health_check`

Returns wallet system health status.

```sql
/**
 * @function admin_wallet_health_check
 * @description Performs health checks on the wallet system.
 *              Detects anomalies like negative balances or stuck transactions.
 * @returns {JSONB} Health status object
 *   - status: 'healthy' | 'warning' | 'critical'
 *   - checks: {
 *       negative_balances: { count, status },
 *       stuck_pending_transactions: { count, status },
 *       orphaned_transactions: { count, status }
 *     }
 *   - checked_at: TIMESTAMPTZ
 * @example
 *   SELECT admin_wallet_health_check();
 */
```

---

## 3. Car Search Functions

### `get_available_cars`

Searches for available cars with filters.

```sql
/**
 * @function get_available_cars
 * @description Main car search function with comprehensive filtering.
 *              Handles availability, location, pricing, and feature filters.
 * @param {TIMESTAMPTZ} p_start_date - Rental start date
 * @param {TIMESTAMPTZ} p_end_date - Rental end date
 * @param {DOUBLE PRECISION} p_lat - Search center latitude
 * @param {DOUBLE PRECISION} p_lng - Search center longitude
 * @param {INTEGER} p_radius_km - Search radius in kilometers (default: 50)
 * @param {INTEGER} p_offset - Pagination offset (default: 0)
 * @param {INTEGER} p_limit - Results limit (default: 100)
 * @param {TEXT} p_transmission - Filter: 'automatic' | 'manual' | NULL
 * @param {TEXT} p_fuel_type - Filter: 'gasoline' | 'diesel' | 'electric' | NULL
 * @param {NUMERIC} p_min_price - Minimum daily price USD
 * @param {NUMERIC} p_max_price - Maximum daily price USD
 * @returns {TABLE} Matching cars with computed fields
 *   - All car columns
 *   - distance_km: DOUBLE PRECISION
 *   - owner_rating: NUMERIC
 *   - total_bookings: INTEGER
 * @example
 *   SELECT * FROM get_available_cars(
 *     '2025-01-15'::TIMESTAMPTZ,
 *     '2025-01-20'::TIMESTAMPTZ,
 *     -34.6037,  -- Buenos Aires lat
 *     -58.3816,  -- Buenos Aires lng
 *     30,        -- 30km radius
 *     0,         -- offset
 *     20         -- limit
 *   );
 */
```

### `calculate_dynamic_price`

Calculates dynamic pricing based on demand.

```sql
/**
 * @function calculate_dynamic_price
 * @description Computes dynamic price based on region demand, time factors,
 *              and user-specific bonus/malus adjustments.
 * @param {UUID} p_region_id - Geographic region ID
 * @param {UUID} p_user_id - User ID for bonus/malus calculation
 * @param {TIMESTAMPTZ} p_rental_start - Start of rental period
 * @param {INTEGER} p_rental_hours - Duration in hours
 * @returns {JSONB} Pricing calculation result
 *   - base_price: NUMERIC
 *   - surge_multiplier: NUMERIC
 *   - surge_active: BOOLEAN
 *   - user_adjustment: NUMERIC
 *   - total_price: NUMERIC
 * @example
 *   SELECT calculate_dynamic_price(
 *     'region-uuid',
 *     'user-uuid',
 *     NOW(),
 *     24
 *   );
 */
```

---

## 4. Analytics Functions

### `track_conversion_event`

Tracks conversion funnel events.

```sql
/**
 * @function track_conversion_event
 * @description Records a conversion event for analytics tracking.
 *              Used to measure funnel: view -> search -> booking -> payment.
 * @param {TEXT} p_event_name - Event name: 'view_car', 'begin_checkout', 'purchase', etc.
 * @param {UUID} p_user_id - User ID (NULL for anonymous)
 * @param {UUID} p_car_id - Related car ID (optional)
 * @param {UUID} p_booking_id - Related booking ID (optional)
 * @param {JSONB} p_event_data - Additional event metadata
 * @returns {UUID} Created event ID
 * @example
 *   SELECT track_conversion_event(
 *     'begin_checkout',
 *     'user-uuid',
 *     'car-uuid',
 *     'booking-uuid',
 *     '{"source": "marketplace", "device": "mobile"}'
 *   );
 */
```

### `calculate_bonus_malus`

Calculates user's pricing adjustment factor.

```sql
/**
 * @function calculate_bonus_malus
 * @description Computes a user's bonus/malus factor based on their history.
 *              Factors: rating, cancellation rate, completion rate, verification.
 * @param {UUID} p_user_id - User ID
 * @returns {JSONB} Bonus/malus calculation
 *   - total_factor: NUMERIC (e.g., 0.95 = 5% discount)
 *   - percentage: NUMERIC (e.g., -5 = 5% discount)
 *   - type: 'bonus' | 'malus' | 'neutral'
 *   - breakdown: { rating, cancellation, completion, verification }
 * @example
 *   SELECT calculate_bonus_malus('user-uuid');
 *   -- Returns: {"total_factor": 0.95, "percentage": -5, "type": "bonus", ...}
 */
```

---

## 5. Admin Functions

### `maintenance_get_data_health_report`

Generates data health report for admin.

```sql
/**
 * @function maintenance_get_data_health_report
 * @description Comprehensive data health check for admin monitoring.
 *              Identifies orphaned records, inconsistent states, old data.
 * @returns {JSONB} Health report
 *   - bookings: { pending_old, orphaned, inconsistent_states }
 *   - cars: { no_photos, no_prices, inactive_published }
 *   - wallets: { negative_balances, stuck_transactions }
 *   - notifications: { old_unread, orphaned }
 *   - generated_at: TIMESTAMPTZ
 * @example
 *   SELECT maintenance_get_data_health_report();
 */
```

### `get_booking_payment_history`

Returns payment event history for a booking.

```sql
/**
 * @function get_booking_payment_history
 * @description Retrieves complete payment event history for audit purposes.
 *              Shows all state changes from creation to completion/refund.
 * @param {UUID} p_booking_id - The booking ID
 * @returns {TABLE} Payment events chronologically
 *   - event_id: UUID
 *   - event_type: TEXT
 *   - payment_provider: TEXT
 *   - payment_id: TEXT
 *   - event_data: JSONB
 *   - created_at: TIMESTAMPTZ
 * @example
 *   SELECT * FROM get_booking_payment_history('booking-uuid');
 */
```

---

## 6. Maintenance Functions

### `maintenance_cleanup_old_notifications`

Cleans up old notification records.

```sql
/**
 * @function maintenance_cleanup_old_notifications
 * @description Deletes read notifications older than specified period.
 *              Safe operation - only removes already-read notifications.
 * @param {INTERVAL} p_older_than - Age threshold (default: '6 months')
 * @returns {INTEGER} Number of notifications deleted
 * @example
 *   SELECT maintenance_cleanup_old_notifications('6 months');
 *   -- Returns: 1234 (deleted count)
 */
```

### `maintenance_identify_test_accounts`

Identifies potential test accounts.

```sql
/**
 * @function maintenance_identify_test_accounts
 * @description Finds accounts that appear to be test/demo accounts.
 *              Checks for: test@, demo@, +test patterns, specific domains.
 * @returns {TABLE} Suspected test accounts
 *   - user_id: UUID
 *   - email: TEXT
 *   - created_at: TIMESTAMPTZ
 *   - reason: TEXT
 * @example
 *   SELECT * FROM maintenance_identify_test_accounts();
 */
```

---

## Usage Notes

1. **Security**: All functions use `SECURITY DEFINER` with explicit `search_path` to prevent injection.

2. **Permissions**: Most functions require `authenticated` role. Admin functions check for admin role internally.

3. **Error Handling**: Functions return structured errors in JSONB format for consistent client handling.

4. **Transactions**: Wallet functions use explicit transactions for atomicity.

5. **Logging**: Critical operations log to `wallet_audit_log` or `booking_payment_events`.

---

## Related Documentation

- [Webhooks Documentation](./WEBHOOKS.md)
- [PII Audit](./PII_METADATA_AUDIT.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)

---

*Documentation generated by Claude Code*
*Last updated: 2025-12-28*
