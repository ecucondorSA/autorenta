# Admin Feature Structure - Comprehensive Report
## Issue #137: Global Search Interface for Admin Operations

## 1. ADMIN FEATURE ORGANIZATION

### 1.1 Main Admin Routes (apps/web/src/app/app.routes.ts)
The admin feature is lazy-loaded under the `/admin` path with AuthGuard:

```
/admin (protected by AuthGuard)
├── /admin (dashboard)
├── /admin/withdrawals
├── /admin/refunds
├── /admin/coverage-fund
├── /admin/fgo
├── /admin/exchange-rates
├── /admin/accounting
├── /admin/claims
├── /admin/claims/:id
├── /admin/reviews
└── /admin/verifications
```

### 1.2 Current Admin Modules/Pages
```
apps/web/src/app/features/admin/
├── accounting/                    # Financial reporting
├── accounting-dashboard/          # Dashboard component
├── claims/                        # Insurance claims
├── components/                    # Shared components (coverage-fund-dashboard)
├── dashboard/                     # Main admin dashboard
├── deposits-monitoring/           # Deposit monitoring
├── exchange-rates/                # Currency exchange
├── fgo/                          # Financial Guarantee Operations
├── refunds/                       # Refund processing with SEARCH
├── reviews/                       # Review management
├── verifications/                 # User verification review
└── withdrawals/                   # Withdrawal requests
```

---

## 2. ADMIN ROUTING & AUTHENTICATION STRUCTURE

### 2.1 Admin Guard Implementation
**File**: `apps/web/src/app/core/guards/admin.guard.ts`

**Key Features**:
- Role-based access control (RBAC)
- Permission-based access control (PBAC)
- Three modes of operation:
  1. Basic: User must be any admin
  2. Role-specific: User must have specific role (via `route.data.requiredRole`)
  3. Permission-specific: User must have specific permission (via `route.data.requiredPermission`)

**Preset Guards Available**:
- `AdminGuard` - Any admin
- `SuperAdminGuard` - Only super_admin
- `OperationsGuard` - operations/super_admin
- `SupportGuard` - support/super_admin
- `FinanceGuard` - finance/super_admin

**Usage Example**:
```typescript
{
  path: 'verifications',
  canMatch: [AdminGuard],
  data: { requiredPermission: 'approve_verifications' },
  loadComponent: () => import('./admin-verifications.page')
}
```

### 2.2 Admin Roles & Permissions Hierarchy
**File**: `apps/web/src/app/core/services/admin.service.ts` (Lines 47-92)

**Roles**:
1. `super_admin` - Full access, manages other admins
2. `operations` - Verifications, bookings, cars, user management
3. `support` - View-only access for support
4. `finance` - Payment, refunds, wallet, financial reports

**Permission Matrix** (see PERMISSIONS_MATRIX):
- **super_admin**: 19 permissions (all except admin_management only)
- **operations**: 12 permissions (users, verifications, bookings, cars)
- **support**: 4 permissions (view only: users, verifications, bookings, cars)
- **finance**: 5 permissions (users, bookings, payments, refunds, wallet)

---

## 3. ADMIN SERVICE ARCHITECTURE

**File**: `apps/web/src/app/core/services/admin.service.ts`

### 3.1 Core Methods by Category

#### Role & Permission Checking
```typescript
async isAdmin(): Promise<boolean>
async hasRole(role: AdminRole): Promise<boolean>
async hasPermission(permission: AdminPermission): Promise<boolean>
async getAdminRoles(): Promise<AdminRole[]>
async getPermissions(): Promise<AdminPermission[]>
clearCache(): void
```

#### Audit Logging
```typescript
async logAction(context: AdminActionContext): Promise<string | null>
async getAuditLog(filters?: {...}): Promise<AdminAuditLog[]>
```

#### Admin User Management
```typescript
async grantAdminRole(userId: string, role: AdminRole, notes?: string): Promise<AdminUser | null>
async revokeAdminRole(adminUserId: string, reason?: string): Promise<void>
async listAdminUsers(includeRevoked = false): Promise<AdminUserWithProfile[]>
```

#### Car Management
```typescript
async approveCar(carId: string): Promise<void>
async listPendingCars(): Promise<unknown[]>
```

#### Booking Management
```typescript
async listRecentBookings(limit = 20): Promise<unknown[]>
```

#### Withdrawal Management
```typescript
async approveWithdrawal(requestId: string, adminNotes?: string): Promise<void>
async completeWithdrawal(requestId: string, providerTransactionId: string, ...): Promise<void>
async failWithdrawal(requestId: string, failureReason: string): Promise<void>
async rejectWithdrawal(requestId: string, rejectionReason: string): Promise<void>
async listWithdrawalRequests(status?: string): Promise<unknown[]>
```

#### Verification Management
```typescript
async getPendingVerifications(verificationType?: string, status?: string, ...): Promise<VerificationQueueItem[]>
async getVerificationStats(): Promise<VerificationStats>
async approveVerification(userId: string, verificationLevel: number, notes?: string): Promise<AdminVerificationResponse>
async rejectVerification(userId: string, verificationLevel: number, reason: string): Promise<AdminVerificationResponse>
async flagVerificationSuspicious(userId: string, notes: string): Promise<AdminVerificationResponse>
async requestAdditionalDocuments(userId: string, requestedDocs: string): Promise<AdminVerificationResponse>
```

#### Refund Management
```typescript
async listRefundRequests(status?: string): Promise<RefundRequest[]>
async getRefundRequestById(requestId: string): Promise<RefundRequest | null>
async searchBookingsForRefund(query: string): Promise<Array<Booking & { can_refund: boolean; ... }>>
async processRefund(params: ProcessRefundParams): Promise<ProcessRefundResult>
async rejectRefund(requestId: string, rejectionReason: string): Promise<void>
```

### 3.2 Search Pattern - Refunds Page (Existing Implementation)

**File**: `apps/web/src/app/features/admin/refunds/admin-refunds.page.ts`

The refunds page implements a SEARCH pattern for bookings:

```typescript
// Search method
async searchBookings(): Promise<void> {
  const query = this.searchQuerySignal();
  if (!query) return;
  
  this.searchingSignal.set(true);
  try {
    const results = await this.adminService.searchBookingsForRefund(query);
    this.searchResultsSignal.set(results);
  } catch (error) {
    // error handling
  } finally {
    this.searchingSignal.set(false);
  }
}
```

**Features**:
- Debounced search input
- Search by booking ID or user email
- Real-time search results with filtering
- Shows refund eligibility status
- Click to select for refund processing

---

## 4. DATABASE SCHEMA ENTITIES

### 4.1 Core User/Profile Tables (from supabase/migrations/)

#### profiles (Supabase built-in via auth.users)
- `id` (UUID) - references auth.users(id)
- `full_name` (TEXT)
- `email` (via auth.users relationship)
- `avatar_url` (TEXT)
- Additional fields: verification levels, preferences

#### auth.users (Supabase Auth)
- `id` (UUID) - Primary Key
- `email` (TEXT) - Unique
- `created_at` (TIMESTAMPTZ)
- `last_sign_in_at` (TIMESTAMPTZ)

### 4.2 Core Domain Tables

#### cars (20251016_create_core_tables.sql)
```sql
CREATE TABLE public.cars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Basic Info
  title TEXT NOT NULL,
  description TEXT,
  brand TEXT,
  model TEXT,
  year INTEGER,
  
  -- Pricing
  price_per_day NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ARS',
  
  -- Location
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'AR',
  latitude NUMERIC(10, 8),
  longitude NUMERIC(11, 8),
  
  -- Status
  status car_status NOT NULL DEFAULT 'draft', -- draft, pending, active, suspended, deleted
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
```

**Indexes**: owner_id, status, city, created_at

#### bookings (20251016_create_core_tables.sql)
```sql
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID NOT NULL REFERENCES public.cars(id),
  renter_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Dates
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  
  -- Status
  status booking_status NOT NULL DEFAULT 'pending', 
  -- pending, confirmed, in_progress, completed, cancelled, no_show
  
  -- Pricing
  total_amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ARS',
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Indexes**: car_id, renter_id, status, dates, created_at

#### payments (20251016_create_core_tables.sql)
```sql
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id),
  payment_intent_id UUID REFERENCES public.payment_intents(id),
  
  -- Provider
  provider payment_provider NOT NULL, -- mock, mercadopago, stripe
  provider_payment_id TEXT,
  
  -- Amount
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ARS',
  
  -- Status
  status payment_status NOT NULL DEFAULT 'pending',
  -- pending, processing, approved, rejected, refunded, cancelled
  
  -- Metadata
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4.3 Wallet System Tables

#### wallet_transactions (referenced in migrations, created in supabase)
```sql
CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Transaction Type
  type wallet_transaction_type, -- deposit, withdrawal, charge, refund, bonus, lock, unlock
  
  -- Amount
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL, -- USD, ARS, EUR
  
  -- Status
  status transaction_status, -- pending, completed, failed, cancelled
  
  -- Provider Info
  provider TEXT, -- mercadopago, stripe, bank_transfer, manual, system
  provider_transaction_id TEXT UNIQUE,
  
  -- References
  booking_id UUID REFERENCES public.bookings(id),
  refund_request_id UUID,
  
  -- Metadata
  metadata JSONB,
  admin_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Indexes**: 
- user_id, status, type
- provider_transaction_id (unique)
- created_at DESC

### 4.4 Admin System Tables (20251107)

#### admin_users
```sql
CREATE TABLE public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role admin_role_type NOT NULL, -- super_admin, operations, support, finance
  
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID,
  
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### admin_audit_log (immutable)
```sql
CREATE TABLE public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Actor
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),
  admin_role admin_role_type NOT NULL,
  
  -- Action
  action admin_action_type NOT NULL, -- user_search, booking_view, etc.
  resource_type TEXT NOT NULL,
  resource_id UUID,
  
  -- Details
  changes JSONB, -- {before: {...}, after: {...}}
  metadata JSONB, -- {reason, ip, user_agent, ...}
  
  -- Result
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  
  -- Immutable
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Indexes**: admin_user_id, action, resource_type, created_at DESC

### 4.5 Additional Searchable Tables

#### withdrawal_requests
- id, user_id, status (pending, approved, completed, rejected)
- amount, fee_amount, net_amount
- created_at, approved_at, completed_at

#### refund_requests
- id, booking_id, user_id, status
- refund_amount, destination (wallet, original_payment_method)
- created_at, approved_at, processed_at, completed_at

#### reviews
- id, booking_id, reviewer_id, reviewee_id
- rating, comment
- created_at

---

## 5. EXISTING SEARCH/AUTOCOMPLETE PATTERNS

### 5.1 Current Implementation: Refunds Page Search

**File**: `apps/web/src/app/features/admin/refunds/admin-refunds.page.ts`

**Search Method**: `searchBookingsForRefund(query: string)`

**Patterns**:
1. **Query Input**: Text input for booking ID or user email
2. **Search Button**: Manual search trigger (not debounced in current implementation)
3. **Results Display**: List of matching bookings with metadata
4. **Status Indicators**: Green "Eligible" / Red "No Eligible" badges
5. **Selection Handler**: Click to select booking for refund processing

**Service Layer** (`admin.service.ts` lines 972-1023):
```typescript
async searchBookingsForRefund(query: string): Promise<Array<Booking & {...}>> {
  // 1. UUID detection: if query looks like UUID, search by ID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(query)) {
    bookingsQuery = bookingsQuery.eq('id', query);
  }
  
  // 2. Select with relationships
  .select(`*, car:cars(...), renter:profiles!(...), refund_requests(...)`)
  
  // 3. Enrich with refund eligibility logic
  // - Check payment_status === 'paid' || status === 'confirmed'
  // - Calculate refund_eligible_amount
  // - Set can_refund boolean flag
  
  return processedResults;
}
```

**Key Patterns to Reuse**:
1. ✓ Signal-based state management (signals for query, results, loading)
2. ✓ Error boundary handling with fallbacks
3. ✓ UUID detection for direct ID search
4. ✓ Relationship loading with select() joins
5. ✓ Real-time filtering and enrichment

### 5.2 Other Existing Search-Like Features

#### Verification Queue (admin.service.ts lines 730-746)
```typescript
async getPendingVerifications(
  verificationType?: string,  // 'level_2', 'level_3'
  status?: string,             // 'PENDING', 'APPROVED', 'REJECTED'
  limit?: number,
  offset?: number
): Promise<VerificationQueueItem[]>
```
- Filter-based pagination
- Status filtering
- Type filtering

#### Withdrawal Request Listing
```typescript
async listWithdrawalRequests(status?: string): Promise<unknown[]>
```
- Optional status filter
- Relationship loading with select

---

## 6. AUTHENTICATION & AUTHORIZATION PATTERNS

### 6.1 Admin Guard Flow

1. **Request to admin route**
2. **CanMatchFn executes**:
   - Verify authentication: `auth.ensureSession()`
   - Check if user is admin: `adminService.isAdmin()`
   - If role required: `adminService.hasRole(requiredRole)`
   - If permission required: `adminService.hasPermission(requiredPermission)`
3. **Result**: Allow (true) or redirect (UrlTree)

### 6.2 Role-Based Permission Checking

All admin operations check permissions before execution:
```typescript
async approveCar(carId: string): Promise<void> {
  const hasPermission = await this.hasPermission('approve_cars');
  if (!hasPermission) {
    throw new Error('Insufficient permissions to approve cars');
  }
  // ... proceed with operation
  // Log action for audit trail
  await this.logAction({
    action: 'approve_car',
    resourceType: 'car',
    resourceId: carId,
  });
}
```

### 6.3 Audit Logging Pattern

Every admin action is automatically logged:
```typescript
interface AdminActionContext {
  action: string;              // e.g., 'approve_car'
  resourceType: string;        // e.g., 'car'
  resourceId?: string | null;  // e.g., car UUID
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

async logAction(context: AdminActionContext): Promise<string | null> {
  // RPC call to log_admin_action
  // Returns audit log entry ID
}
```

---

## 7. TYPE DEFINITIONS

**File**: `apps/web/src/app/core/types/admin.types.ts`

### 7.1 Core Types
```typescript
// Roles
type AdminRole = 'super_admin' | 'operations' | 'support' | 'finance';

// Permissions
type AdminPermission = 
  | 'view_users' | 'edit_users' | 'suspend_users' | 'delete_users'
  | 'view_verifications' | 'approve_verifications' | 'reject_verifications'
  | 'view_bookings' | 'edit_bookings' | 'cancel_bookings'
  | 'view_payments' | 'process_refunds' | 'view_wallet_transactions'
  | 'view_cars' | 'approve_cars' | 'suspend_cars'
  | 'view_audit_log' | 'manage_admins' | 'grant_admin_roles' | 'revoke_admin_roles';

// Admin User
interface AdminUser {
  id: string;
  user_id: string;
  role: AdminRole;
  granted_by: string | null;
  granted_at: string;
  revoked_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Audit Log
interface AdminAuditLog {
  id: string;
  admin_user_id: string;
  admin_role: AdminRole;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}
```

---

## 8. KEY TECHNICAL PATTERNS FOR ISSUE #137

### 8.1 Signal-Based State Management
All admin pages use Angular signals for reactive state:
```typescript
// Query state
private readonly searchQuerySignal = signal<string>('');
private readonly searchResultsSignal = signal<SearchResult[]>([]);
private readonly searchingSignal = signal<boolean>(false);

// Computed values
readonly searchQuery = computed(() => this.searchQuerySignal());
readonly searchResults = computed(() => this.searchResultsSignal());
readonly searching = computed(() => this.searchingSignal());

// Methods
updateSearchQuery(query: string): void {
  this.searchQuerySignal.set(query);
}

async searchBookings(): Promise<void> {
  this.searchingSignal.set(true);
  try {
    const results = await this.adminService.search(...);
    this.searchResultsSignal.set(results);
  } finally {
    this.searchingSignal.set(false);
  }
}
```

### 8.2 Service Layer Pattern
Search methods in AdminService follow consistent pattern:
1. Input validation
2. Permission check
3. Database query construction
4. Results enrichment
5. Error handling

### 8.3 Template Pattern (Search UI)
```html
<!-- Search Input -->
<input 
  type="text"
  [value]="searchQuery()"
  (input)="updateSearchQuery($any($event.target).value)"
  placeholder="Search..."
/>
<button (click)="search()" [disabled]="searching()">
  @if (searching()) { <spinner/> } else { Search }
</button>

<!-- Results -->
@if (searchResults().length > 0) {
  <div class="results">
    @for (item of searchResults(); track item.id) {
      <div (click)="select(item)">
        <!-- Item display -->
      </div>
    }
  </div>
}
```

---

## 9. RECOMMENDATIONS FOR ISSUE #137

### 9.1 Searchable Resources (Priority Order)
1. **Users**: by email, name, ID
2. **Bookings**: by ID, user email, car title
3. **Cars**: by title, owner email
4. **Transactions**: by ID, user email, type
5. **Withdrawals**: by ID, user email, status
6. **Refunds**: by ID, booking ID, user email
7. **Verifications**: by user email, status

### 9.2 Multi-Resource Search Implementation
Suggest creating an index/typeahead that searches across all admin-visible resources, similar to the refunds page but unified.

### 9.3 Reusable Patterns
- Use existing `AdminService.search*` methods
- Leverage signal-based state management
- Implement consistent result enrichment
- Follow existing permission checks
- Log all search operations to audit log

### 9.4 Database Optimization
Ensure indexes exist for frequently searched fields:
- users: email, full_name
- bookings: id, renter_id, created_at
- cars: id, owner_id, title
- wallet_transactions: user_id, created_at
- withdrawal_requests: user_id, status
- refund_requests: booking_id, user_id

---

## 10. FILE LOCATIONS SUMMARY

**Core Admin Infrastructure**:
- Guard: `/apps/web/src/app/core/guards/admin.guard.ts`
- Service: `/apps/web/src/app/core/services/admin.service.ts`
- Types: `/apps/web/src/app/core/types/admin.types.ts`
- Routes: `/apps/web/src/app/app.routes.ts` (lines 68-143)

**Admin Feature Pages**:
- Refunds (with search): `/apps/web/src/app/features/admin/refunds/`
- Verifications: `/apps/web/src/app/features/admin/verifications/`
- Withdrawals: `/apps/web/src/app/features/admin/withdrawals/`
- Claims: `/apps/web/src/app/features/admin/claims/`
- Reviews: `/apps/web/src/app/features/admin/reviews/`
- Accounting: `/apps/web/src/app/features/admin/accounting/`

**Database Migrations**:
- Core schema: `/supabase/migrations/20251016_create_core_tables.sql`
- Admin RBAC: `/supabase/migrations/20251107_create_admin_rbac_and_audit.sql`
- Admin system: `/supabase/migrations/20251107_create_admin_system.sql`
- Wallet tables: `/supabase/migrations/20251020_*.sql`, `20251028_*.sql`

