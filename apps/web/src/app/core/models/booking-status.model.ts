// ============================================================================
// Booking Status Definitions
// Extracted to avoid circular dependencies
// ============================================================================

// Must match DB enum: public.booking_status
export type BookingStatus =
  | 'pending'
  | 'pending_payment'
  | 'pending_approval'
  | 'pending_owner_approval'
  | 'confirmed'
  | 'in_progress'
  | 'pending_return'
  | 'returned'
  | 'inspected_good'
  | 'damage_reported'
  | 'completed'
  | 'cancelled'
  | 'cancelled_renter'
  | 'cancelled_owner'
  | 'cancelled_system'
  | 'payment_validation_failed'
  | 'dispute'
  | 'disputed'
  | 'pending_dispute_resolution'
  | 'pending_review'
  | 'resolved'
  | 'rejected'
  | 'no_show'
  | 'expired';

// UI-only derived statuses (NOT stored in DB `booking_status`)
export type BookingUiStatus =
  | BookingStatus
  | 'pending_deposit';
