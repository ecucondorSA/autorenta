# Admin Role-Based Access Control (RBAC) System

**Created:** 2025-11-07
**Issue:** [#123](https://github.com/ecucondorSA/autorenta/issues/123) - Admin Authentication & Role-Based Access Control
**Status:** ✅ Implemented

## Overview

AutoRenta now has a comprehensive admin system featuring:

- **4 Admin Roles** with hierarchical permissions
- **Database-level RLS enforcement** for security
- **Immutable audit logging** for compliance
- **Permission-based authorization** for fine-grained control
- **Route guards** for Angular route protection

## Admin Roles

| Role | Purpose | Permissions |
|------|---------|-------------|
| `super_admin` | System administrators | **All permissions** + admin management |
| `operations` | Daily operations team | User management, verifications, bookings, cars |
| `support` | Customer support | View-only access to users, verifications, bookings, cars |
| `finance` | Finance team | Payments, refunds, wallet transactions |

## Permissions Matrix

| Permission | Super Admin | Operations | Support | Finance |
|-----------|:-----------:|:----------:|:-------:|:-------:|
| **Users** |
| view_users | ✅ | ✅ | ✅ | ✅ |
| edit_users | ✅ | ✅ | ❌ | ❌ |
| suspend_users | ✅ | ✅ | ❌ | ❌ |
| delete_users | ✅ | ❌ | ❌ | ❌ |
| **Verifications** |
| view_verifications | ✅ | ✅ | ✅ | ❌ |
| approve_verifications | ✅ | ✅ | ❌ | ❌ |
| reject_verifications | ✅ | ✅ | ❌ | ❌ |
| **Bookings** |
| view_bookings | ✅ | ✅ | ✅ | ✅ |
| edit_bookings | ✅ | ✅ | ❌ | ❌ |
| cancel_bookings | ✅ | ✅ | ❌ | ❌ |
| **Payments** |
| view_payments | ✅ | ❌ | ❌ | ✅ |
| process_refunds | ✅ | ❌ | ❌ | ✅ |
| view_wallet_transactions | ✅ | ❌ | ❌ | ✅ |
| **Cars** |
| view_cars | ✅ | ✅ | ✅ | ❌ |
| approve_cars | ✅ | ✅ | ❌ | ❌ |
| suspend_cars | ✅ | ✅ | ❌ | ❌ |
| **Admin Management** |
| view_audit_log | ✅ | ❌ | ❌ | ❌ |
| manage_admins | ✅ | ❌ | ❌ | ❌ |
| grant_admin_roles | ✅ | ❌ | ❌ | ❌ |
| revoke_admin_roles | ✅ | ❌ | ❌ | ❌ |

## Database Schema

### Tables

#### `admin_users`
Tracks admin roles and grant/revoke history.

```sql
CREATE TABLE public.admin_users (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role admin_role NOT NULL,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `admin_audit_log`
Immutable append-only log of all admin actions.

```sql
CREATE TABLE public.admin_audit_log (
  id UUID PRIMARY KEY,
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),
  admin_role admin_role NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Database Functions

```sql
-- Check if user is admin
SELECT is_admin(); -- Returns boolean

-- Check if user has specific role
SELECT has_admin_role('super_admin'); -- Returns boolean

-- Get user's admin roles
SELECT get_admin_roles(); -- Returns admin_role[]

-- Log an admin action
SELECT log_admin_action(
  'approve_verification',
  'user_verification',
  'verification-uuid',
  '{"notes": "Approved after manual review"}'::jsonb
);
```

## Frontend Usage

### AdminService

```typescript
import { AdminService } from '@core/services/admin.service';

@Component({...})
export class MyComponent {
  constructor(private adminService: AdminService) {}

  async ngOnInit() {
    // Check if user is admin
    const isAdmin = await this.adminService.isAdmin();

    // Check specific role
    const isSuperAdmin = await this.adminService.hasRole('super_admin');

    // Check permission
    const canApprove = await this.adminService.hasPermission('approve_verifications');

    // Get all roles
    const roles = await this.adminService.getAdminRoles();

    // Get all permissions
    const permissions = await this.adminService.getPermissions();
  }

  async approveVerification(verificationId: string) {
    // Manual audit logging
    await this.adminService.logAction({
      action: 'approve_verification',
      resourceType: 'user_verification',
      resourceId: verificationId,
      details: { notes: 'Approved after review' }
    });
  }
}
```

### Route Guards

#### Basic Usage (Any Admin)

```typescript
// app.routes.ts
{
  path: 'admin',
  canMatch: [AdminGuard],
  loadChildren: () => import('./admin/admin.routes')
}
```

#### Role-Specific Routes

```typescript
// Super admin only
{
  path: 'admin/audit-log',
  canMatch: [AdminGuard],
  data: { requiredRole: 'super_admin' },
  loadComponent: () => import('./admin/audit-log/audit-log.component')
}

// Operations or super admin
{
  path: 'admin/verifications',
  canMatch: [AdminGuard],
  data: { requiredRole: 'operations' },
  loadComponent: () => import('./admin/verifications/verifications.component')
}
```

#### Permission-Specific Routes

```typescript
{
  path: 'admin/refunds',
  canMatch: [AdminGuard],
  data: { requiredPermission: 'process_refunds' },
  loadComponent: () => import('./admin/refunds/refunds.component')
}
```

#### Using Guard Presets

```typescript
import { SuperAdminGuard, OperationsGuard, FinanceGuard } from '@core/guards/admin.guard';

{
  path: 'admin/manage-admins',
  canMatch: [SuperAdminGuard],
  loadComponent: () => import('./admin/manage-admins/manage-admins.component')
}

{
  path: 'admin/payments',
  canMatch: [FinanceGuard],
  loadComponent: () => import('./admin/payments/payments.component')
}
```

### Audit Logging Decorator

Automatically log admin actions with decorators:

```typescript
import { AuditLog, AuditApproval, AuditRejection } from '@core/decorators/audit-log.decorator';

@Injectable({
  providedIn: 'root',
})
export class VerificationService {
  constructor(private adminService: AdminService) {}

  // Automatic logging with decorator
  @AuditApproval('user_verification')
  async approveVerification(verificationId: string): Promise<void> {
    // Implementation
  }

  @AuditRejection('user_verification')
  async rejectVerification(verificationId: string, reason: string): Promise<void> {
    // Implementation
  }

  // Custom audit logging
  @AuditLog('suspend_user', 'user', { includeParams: true })
  async suspendUser(userId: string, reason: string): Promise<void> {
    // Implementation
  }
}
```

## Admin Management

### Grant Admin Role

```typescript
// Only super admins can grant roles
await adminService.grantAdminRole(
  'user-uuid',
  'operations',
  'Promoted to operations team for Q4 2025'
);
```

### Revoke Admin Role

```typescript
// Only super admins can revoke roles
await adminService.revokeAdminRole(
  'admin-user-uuid',
  'Left company - standard offboarding'
);
```

### List Admin Users

```typescript
// Get all active admins
const activeAdmins = await adminService.listAdminUsers(false);

// Get all admins including revoked
const allAdmins = await adminService.listAdminUsers(true);
```

### View Audit Log

```typescript
// Only super admins can view audit log
const auditLog = await adminService.getAuditLog({
  action: 'approve_verification',
  limit: 50,
  offset: 0
});
```

## Security Features

### 1. Database-Level RLS

All admin tables have Row-Level Security policies:
- Super admins can view all admin users
- Super admins can insert/update admin users
- All admins can view their own admin record
- Only super admins can view audit log
- All admins can insert audit log entries (for their own actions)
- **NO UPDATE OR DELETE** on audit log (immutable)

### 2. Immutable Audit Log

The `admin_audit_log` table has:
- No UPDATE policies
- No DELETE policies
- Append-only inserts
- Captures who, what, when, where for every admin action

### 3. Role Caching

AdminService caches roles to reduce database queries:
- Cache cleared on auth state changes
- Cache is per-user (cleared when user changes)

### 4. Permission Checking

All admin operations check permissions before execution:
```typescript
async approveCar(carId: string) {
  // Check permission first
  const hasPermission = await this.hasPermission('approve_cars');
  if (!hasPermission) {
    throw new Error('Insufficient permissions to approve cars');
  }
  // ... implementation
}
```

## Migration & Setup

### 1. Apply Database Migration

```bash
# Apply the admin system migration
supabase db push
```

The migration file is: `supabase/migrations/20251107_create_admin_system.sql`

### 2. Create First Super Admin

```sql
-- In Supabase SQL Editor
INSERT INTO public.admin_users (user_id, role, notes)
VALUES (
  'YOUR_USER_UUID'::UUID,
  'super_admin',
  'Initial super admin created during system setup'
);
```

### 3. Sync TypeScript Types

```bash
# Sync database types to Angular app
npm run sync:types
```

### 4. Test Admin Access

```typescript
// In Angular component
const isAdmin = await adminService.isAdmin();
console.log('Is admin:', isAdmin);

const roles = await adminService.getAdminRoles();
console.log('Admin roles:', roles);
```

## Testing

### Unit Tests

```typescript
describe('AdminService', () => {
  let service: AdminService;
  let supabase: SupabaseClient;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AdminService],
    });
    service = TestBed.inject(AdminService);
    supabase = TestBed.inject(SupabaseClient);
  });

  it('should check if user is admin', async () => {
    const isAdmin = await service.isAdmin();
    expect(typeof isAdmin).toBe('boolean');
  });

  it('should get admin roles', async () => {
    const roles = await service.getAdminRoles();
    expect(Array.isArray(roles)).toBe(true);
  });

  it('should check permissions', async () => {
    const hasPermission = await service.hasPermission('view_users');
    expect(typeof hasPermission).toBe('boolean');
  });
});
```

### E2E Tests

```typescript
test('super admin can access audit log', async ({ page }) => {
  await page.goto('/admin/audit-log');
  await expect(page).toHaveURL('/admin/audit-log');
  await expect(page.locator('h1')).toContainText('Audit Log');
});

test('operations cannot access audit log', async ({ page }) => {
  await page.goto('/admin/audit-log');
  await expect(page).toHaveURL('/admin?error=insufficient_permissions');
});
```

## Monitoring & Compliance

### Audit Log Queries

```sql
-- All actions by a specific admin
SELECT * FROM admin_audit_log
WHERE admin_user_id = 'admin-uuid'
ORDER BY created_at DESC
LIMIT 100;

-- All approvals in last 24 hours
SELECT * FROM admin_audit_log
WHERE action LIKE '%approve%'
  AND created_at > now() - interval '24 hours'
ORDER BY created_at DESC;

-- Actions on specific resource
SELECT * FROM admin_audit_log
WHERE resource_type = 'user_verification'
  AND resource_id = 'verification-uuid'
ORDER BY created_at ASC;
```

### Compliance Reports

```sql
-- Admin activity summary
SELECT
  admin_user_id,
  admin_role,
  COUNT(*) as action_count,
  COUNT(DISTINCT action) as unique_actions,
  MIN(created_at) as first_action,
  MAX(created_at) as last_action
FROM admin_audit_log
WHERE created_at > now() - interval '30 days'
GROUP BY admin_user_id, admin_role
ORDER BY action_count DESC;
```

## Troubleshooting

### User Can't Access Admin Routes

1. Check if user has admin role:
   ```sql
   SELECT * FROM admin_users
   WHERE user_id = 'user-uuid'
     AND revoked_at IS NULL;
   ```

2. Check RLS policies are applied:
   ```sql
   SELECT tablename, policyname, permissive, roles, cmd, qual
   FROM pg_policies
   WHERE tablename IN ('admin_users', 'admin_audit_log');
   ```

### Audit Logging Not Working

1. Check if `log_admin_action` function exists:
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'log_admin_action';
   ```

2. Check if user is authenticated:
   ```typescript
   const { data: { user } } = await supabase.auth.getUser();
   console.log('Current user:', user);
   ```

### Permission Checks Failing

1. Clear admin role cache:
   ```typescript
   adminService.clearCache();
   ```

2. Verify permission matrix in code matches requirements

## Future Enhancements

- [ ] Admin dashboard with metrics
- [ ] Audit log export (CSV, JSON)
- [ ] Admin activity alerts
- [ ] IP allowlisting for admin access
- [ ] 2FA requirement for super admins
- [ ] Admin session timeout configuration
- [ ] Bulk admin operations
- [ ] Admin role templates

## References

- **Issue:** [#123 - Admin Authentication & RBAC](https://github.com/ecucondorSA/autorenta/issues/123)
- **Migration:** `supabase/migrations/20251107_create_admin_system.sql`
- **Service:** `apps/web/src/app/core/services/admin.service.ts`
- **Guard:** `apps/web/src/app/core/guards/admin.guard.ts`
- **Types:** `apps/web/src/app/core/types/admin.types.ts`
- **Decorator:** `apps/web/src/app/core/decorators/audit-log.decorator.ts`

---

**Questions or issues?** Contact the dev team or create a GitHub issue.
