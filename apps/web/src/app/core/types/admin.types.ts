/**
 * Admin System Types
 * Created: 2025-11-07
 * Issue: #123 - Admin Authentication & Role-Based Access Control
 *
 * These types match the database schema defined in:
 * supabase/migrations/20251107_create_admin_system.sql
 *
 * After applying the migration, run `npm run sync:types` to auto-generate
 * from Supabase. These types serve as temporary definitions until then.
 */

// ============================================================================
// ADMIN ROLE ENUM
// ============================================================================

/**
 * Admin role types with hierarchical permissions
 * - super_admin: Full system access, manages other admins
 * - operations: User management, verifications, bookings
 * - support: User support, view-only access
 * - finance: Payment processing, refunds, financial reports
 */
export type AdminRole = 'super_admin' | 'operations' | 'support' | 'finance';

// ============================================================================
// ADMIN USER
// ============================================================================

/**
 * Admin user record - tracks which users have admin access and their roles
 */
export interface AdminUser {
  id: string;
  user_id: string;
  role: AdminRole;

  // Grant/revoke tracking
  granted_by: string | null;
  granted_at: string;
  revoked_at: string | null;
  revoked_by: string | null;

  // Notes
  notes: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Admin user for insert operations
 */
export interface AdminUserInsert {
  user_id: string;
  role: AdminRole;
  granted_by?: string | null;
  notes?: string | null;
}

/**
 * Admin user for update operations (mainly for revocation)
 */
export interface AdminUserUpdate {
  revoked_at?: string | null;
  revoked_by?: string | null;
  notes?: string | null;
}

// ============================================================================
// ADMIN AUDIT LOG
// ============================================================================

/**
 * Audit log entry - immutable record of admin actions
 */
export interface AdminAuditLog {
  id: string;

  // Who
  admin_user_id: string;
  admin_role: AdminRole;

  // What
  action: string;
  resource_type: string;
  resource_id: string | null;

  // Details
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;

  // When
  created_at: string;
}

/**
 * Audit log entry for insert operations
 */
export interface AdminAuditLogInsert {
  admin_user_id: string;
  admin_role: AdminRole;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  details?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

// ============================================================================
// RBAC PERMISSIONS
// ============================================================================

/**
 * Permission actions for RBAC
 */
export type AdminPermission =
  // User management
  | 'view_users'
  | 'edit_users'
  | 'suspend_users'
  | 'delete_users'

  // Verification
  | 'view_verifications'
  | 'approve_verifications'
  | 'reject_verifications'

  // Bookings
  | 'view_bookings'
  | 'edit_bookings'
  | 'cancel_bookings'

  // Payments & Refunds
  | 'view_payments'
  | 'process_refunds'
  | 'view_wallet_transactions'

  // Cars
  | 'view_cars'
  | 'approve_cars'
  | 'suspend_cars'

  // Audit
  | 'view_audit_log'

  // Admin management
  | 'manage_admins'
  | 'grant_admin_roles'
  | 'revoke_admin_roles';

/**
 * RBAC Permissions Matrix
 * Defines which roles have which permissions
 */
export const ADMIN_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  super_admin: [
    // All permissions
    'view_users',
    'edit_users',
    'suspend_users',
    'delete_users',
    'view_verifications',
    'approve_verifications',
    'reject_verifications',
    'view_bookings',
    'edit_bookings',
    'cancel_bookings',
    'view_payments',
    'process_refunds',
    'view_wallet_transactions',
    'view_cars',
    'approve_cars',
    'suspend_cars',
    'view_audit_log',
    'manage_admins',
    'grant_admin_roles',
    'revoke_admin_roles',
  ],

  operations: [
    'view_users',
    'edit_users',
    'suspend_users',
    'view_verifications',
    'approve_verifications',
    'reject_verifications',
    'view_bookings',
    'edit_bookings',
    'cancel_bookings',
    'view_cars',
    'approve_cars',
    'suspend_cars',
  ],

  support: [
    'view_users',
    'view_verifications',
    'view_bookings',
    'view_cars',
  ],

  finance: [
    'view_users',
    'view_bookings',
    'view_payments',
    'process_refunds',
    'view_wallet_transactions',
  ],
};

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Admin action context for audit logging
 */
export interface AdminActionContext {
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Admin user with profile information (for display)
 */
export interface AdminUserWithProfile extends AdminUser {
  profile?: {
    full_name: string;
    email: string;
    avatar_url?: string;
  };
  granted_by_profile?: {
    full_name: string;
    email: string;
  };
}

// ============================================================================
// GLOBAL SEARCH TYPES (Issue #137)
// ============================================================================

/**
 * User search result
 */
export interface UserSearchResult {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  verification_level: number;
  created_at: string;
  last_sign_in_at: string | null;
  is_suspended: boolean;
  total_bookings_as_renter: number;
  total_bookings_as_owner: number;
  wallet_balance: number;
}

/**
 * Booking search result
 */
export interface BookingSearchResult {
  id: string;
  car_id: string;
  car_title: string;
  car_brand: string | null;
  car_model: string | null;
  renter_id: string;
  renter_name: string;
  renter_email: string;
  owner_id: string;
  owner_name: string;
  owner_email: string;
  start_at: string;
  end_at: string;
  status: string;
  total_amount: number;
  currency: string;
  payment_status: string | null;
  created_at: string;
}

/**
 * Car search result
 */
export interface CarSearchResult {
  id: string;
  owner_id: string;
  owner_name: string;
  owner_email: string;
  title: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  license_plate: string | null;
  price_per_day: number;
  currency: string;
  status: string;
  city: string;
  province: string;
  total_bookings: number;
  created_at: string;
}

/**
 * Transaction search result
 */
export interface TransactionSearchResult {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  provider: string | null;
  provider_transaction_id: string | null;
  booking_id: string | null;
  created_at: string;
}

/**
 * Global search results (all entity types)
 */
export interface GlobalSearchResults {
  users: UserSearchResult[];
  bookings: BookingSearchResult[];
  cars: CarSearchResult[];
  transactions: TransactionSearchResult[];
}

/**
 * Search result metadata
 */
export interface SearchResultMetadata {
  query: string;
  total_results: number;
  search_time_ms: number;
}
