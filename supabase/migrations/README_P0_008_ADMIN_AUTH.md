# P0-008: Admin Panel Server-Side Authentication Fix

## Overview

This migration (`20251123_fix_p0_008_admin_authentication_audit.sql`) fixes the critical security vulnerability where admin APIs only verify permissions on the frontend, allowing any user to call admin APIs by modifying HTTP requests.

## What This Migration Does

### 1. Enhanced Admin Audit Log Table
- Adds `ip_address` (INET) column for tracking request origin
- Adds `user_agent` (TEXT) column for tracking client information
- Adds `old_values` (JSONB) for before snapshots
- Adds `new_values` (JSONB) for after snapshots
- Creates performance indexes for IP-based auditing and user agent analysis

### 2. Server-Side Permission Check Function

**Function**: `check_admin_permission(action, resource_type, required_role)`

This function MUST be called by all admin APIs before executing any admin operation.

**Parameters**:
- `p_action` (TEXT): The action being performed (e.g., 'approve_verification')
- `p_resource_type` (TEXT): Type of resource (e.g., 'user_verification', 'booking')
- `p_required_role` (admin_role_type): Minimum required role (optional)

**Returns**: `BOOLEAN`
- `true` if user has permission
- `false` if user lacks permission

**Behavior**:
- Verifies user is authenticated
- Checks if user has admin role via RBAC system
- Falls back to legacy `is_admin` flag in profiles
- Validates required role if specified
- **Automatically logs all permission checks** (success and failure)

### 3. Enhanced Audit Logging Function

**Function**: `log_admin_action(action, resource_type, resource_id, old_values, new_values, ip_address, user_agent)`

**Parameters**:
- `p_action` (TEXT): Action performed (e.g., 'approve_booking')
- `p_resource_type` (TEXT): Resource type (e.g., 'booking')
- `p_resource_id` (TEXT): Resource UUID (optional)
- `p_old_values` (JSONB): Before state (optional)
- `p_new_values` (JSONB): After state (optional)
- `p_ip_address` (TEXT): IP address from HTTP request (optional)
- `p_user_agent` (TEXT): User agent from HTTP request (optional)

**Returns**: `UUID` - ID of the audit log entry

### 4. Helper Function

**Function**: `get_current_user_admin_role()`

**Returns**: `admin_role_type` - User's highest admin role, or NULL if not an admin

## Usage Examples

### Backend API Example (Node.js/TypeScript)

```typescript
import { createClient } from '@supabase/supabase-js';

// Admin API endpoint for approving user verification
export async function approveVerification(
  verificationId: string,
  req: Request
) {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // STEP 1: Check admin permission (server-side)
  const { data: hasPermission, error: permError } = await supabase
    .rpc('check_admin_permission', {
      p_action: 'approve_verification',
      p_resource_type: 'user_verification',
      p_required_role: 'operations' // Requires operations role or higher
    });

  if (!hasPermission || permError) {
    return {
      status: 403,
      body: { error: 'Forbidden: Insufficient permissions' }
    };
  }

  // STEP 2: Get current verification data (for audit log)
  const { data: oldData } = await supabase
    .from('user_verifications')
    .select('*')
    .eq('id', verificationId)
    .single();

  // STEP 3: Perform the admin action
  const { data: newData, error } = await supabase
    .from('user_verifications')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString()
    })
    .eq('id', verificationId)
    .select()
    .single();

  if (error) {
    return { status: 500, body: { error: error.message } };
  }

  // STEP 4: Log the admin action with full context
  await supabase.rpc('log_admin_action', {
    p_action: 'verification_approve',
    p_resource_type: 'user_verification',
    p_resource_id: verificationId,
    p_old_values: oldData,
    p_new_values: newData,
    p_ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    p_user_agent: req.headers.get('user-agent') || 'unknown'
  });

  return { status: 200, body: { success: true, data: newData } };
}
```

### SQL Example (Direct Database Operation)

```sql
-- Example 1: Check if current user can approve bookings
SELECT check_admin_permission(
  'approve_booking',
  'booking',
  'operations'::admin_role_type
);
-- Returns: true or false

-- Example 2: Log an admin action with full tracking
SELECT log_admin_action(
  'booking_cancel',
  'booking',
  '123e4567-e89b-12d3-a456-426614174000',
  '{"status": "confirmed", "cancelled_at": null}'::jsonb,
  '{"status": "cancelled", "cancelled_at": "2025-11-23T10:30:00Z", "cancelled_by": "admin"}'::jsonb,
  '192.168.1.100',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
);
-- Returns: UUID of audit log entry

-- Example 3: Get current user's admin role
SELECT get_current_user_admin_role();
-- Returns: 'super_admin', 'operations', 'finance', 'support', or NULL
```

### Angular Service Example

```typescript
import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private supabase: SupabaseClient) {}

  async approveVerification(verificationId: string) {
    // Check permission first
    const { data: hasPermission } = await this.supabase
      .rpc('check_admin_permission', {
        p_action: 'approve_verification',
        p_resource_type: 'user_verification',
        p_required_role: 'operations'
      });

    if (!hasPermission) {
      throw new Error('Insufficient permissions');
    }

    // Get old data
    const { data: oldData } = await this.supabase
      .from('user_verifications')
      .select('*')
      .eq('id', verificationId)
      .single();

    // Perform update
    const { data: newData, error } = await this.supabase
      .from('user_verifications')
      .update({ status: 'approved' })
      .eq('id', verificationId)
      .select()
      .single();

    if (error) throw error;

    // Log action (IP and user agent will be extracted server-side if using Edge Functions)
    await this.supabase.rpc('log_admin_action', {
      p_action: 'verification_approve',
      p_resource_type: 'user_verification',
      p_resource_id: verificationId,
      p_old_values: oldData,
      p_new_values: newData
    });

    return newData;
  }
}
```

## Admin Role Hierarchy

The permission system respects the following role hierarchy:

1. **super_admin** - Can do everything
2. **operations** - User management, verifications, bookings
3. **finance** - Payment processing, refunds, financial reports
4. **support** - View-only access, user support

When checking permissions:
- `super_admin` can perform any action
- Specific roles can only perform actions within their domain
- Role requirements are hierarchical (super_admin > operations > finance > support)

## Security Features

### Automatic Audit Logging

Every permission check is automatically logged with:
- ✅ User ID who made the request
- ✅ Action attempted
- ✅ Resource type and ID
- ✅ Success or failure status
- ✅ Error message (if failed)
- ✅ Timestamp

### Comprehensive Action Logging

When logging admin actions:
- ✅ Before and after values (for rollback/investigation)
- ✅ IP address (for forensic analysis)
- ✅ User agent (identify suspicious clients)
- ✅ Admin role at time of action
- ✅ Immutable (no updates or deletes allowed)

### Row Level Security

- Super admins can view all audit logs
- Regular admins can only view their own logs
- Service role can insert logs (for server-side operations)
- **No one** can update or delete logs (immutable)

## Querying Audit Logs

### View recent admin actions
```sql
SELECT
  aal.created_at,
  p.full_name as admin_name,
  aal.admin_role,
  aal.action,
  aal.resource_type,
  aal.success,
  aal.ip_address,
  aal.metadata
FROM admin_audit_logs aal
JOIN profiles p ON p.id = aal.admin_user_id
ORDER BY aal.created_at DESC
LIMIT 50;
```

### Find failed permission attempts
```sql
SELECT *
FROM admin_audit_logs
WHERE success = false
  AND action IN ('permission_check_failed', 'unauthorized_access_attempt', 'insufficient_permissions')
ORDER BY created_at DESC;
```

### Track specific user's admin actions
```sql
SELECT
  created_at,
  action,
  resource_type,
  resource_id,
  old_values,
  new_values,
  ip_address
FROM admin_audit_logs
WHERE admin_user_id = 'USER_UUID_HERE'
ORDER BY created_at DESC;
```

### Analyze admin activity by IP
```sql
SELECT
  ip_address,
  COUNT(*) as action_count,
  COUNT(DISTINCT admin_user_id) as unique_admins,
  array_agg(DISTINCT action) as actions_performed
FROM admin_audit_logs
WHERE created_at > now() - interval '7 days'
  AND ip_address IS NOT NULL
GROUP BY ip_address
ORDER BY action_count DESC;
```

## Migration Dependencies

This migration requires:
1. `20251107_create_admin_rbac_and_audit.sql` - RBAC system with admin_audit_logs table
2. `20251119_allow_admin_role_in_profiles.sql` - Admin role support in profiles

## Testing Checklist

- [ ] Run migration on dev environment
- [ ] Verify `check_admin_permission()` returns true for admin users
- [ ] Verify `check_admin_permission()` returns false for non-admin users
- [ ] Verify failed permission attempts are logged
- [ ] Verify successful permission checks are logged
- [ ] Test `log_admin_action()` with IP address and user agent
- [ ] Verify super_admin can view all audit logs
- [ ] Verify regular admins can only view their own logs
- [ ] Update all admin APIs to use `check_admin_permission()`
- [ ] Test with different admin roles (super_admin, operations, finance, support)
- [ ] Verify before/after values are captured correctly
- [ ] Check that audit logs are truly immutable (no UPDATE or DELETE)

## Production Deployment Steps

1. **Backup Database**
   ```bash
   pg_dump -h your-db.supabase.co -U postgres -d postgres > backup_before_p0_008.sql
   ```

2. **Run Migration**
   ```bash
   psql -h your-db.supabase.co -U postgres -d postgres -f 20251123_fix_p0_008_admin_authentication_audit.sql
   ```

3. **Verify Migration**
   ```sql
   -- Check functions exist
   SELECT routine_name
   FROM information_schema.routines
   WHERE routine_schema = 'public'
     AND routine_name IN ('check_admin_permission', 'log_admin_action', 'get_current_user_admin_role');

   -- Check new columns exist
   SELECT column_name
   FROM information_schema.columns
   WHERE table_name = 'admin_audit_logs'
     AND column_name IN ('ip_address', 'user_agent', 'old_values', 'new_values');
   ```

4. **Update Admin APIs**
   - Add `check_admin_permission()` call to all admin endpoints
   - Add `log_admin_action()` call after successful operations
   - Pass IP address and user agent from HTTP headers

5. **Monitor Audit Logs**
   ```sql
   -- Monitor for unauthorized access attempts
   SELECT * FROM admin_audit_logs
   WHERE success = false
     AND created_at > now() - interval '1 hour'
   ORDER BY created_at DESC;
   ```

## Troubleshooting

### Function doesn't exist
```
ERROR: function check_admin_permission does not exist
```
**Solution**: Ensure migration ran successfully. Check with:
```sql
SELECT routine_name FROM information_schema.routines WHERE routine_name = 'check_admin_permission';
```

### User is not an admin
```
ERROR: User is not an admin
```
**Solution**: User needs to be added to `admin_user_roles` table or have `is_admin = true` in profiles.

### Invalid IP address format
The migration handles invalid IP addresses gracefully by setting them to NULL. Check logs with:
```sql
SELECT * FROM admin_audit_logs WHERE ip_address IS NULL AND metadata->>'ip_address' != 'unknown';
```

## Security Recommendations

1. **Always use check_admin_permission()** before admin operations
2. **Always log admin actions** with full context (IP, user agent, before/after)
3. **Review audit logs regularly** for suspicious activity
4. **Set up alerts** for failed permission attempts
5. **Implement rate limiting** on admin endpoints
6. **Use service role key** for server-side operations only
7. **Never expose service role key** to frontend code
8. **Rotate admin credentials** regularly
9. **Monitor for privilege escalation** attempts
10. **Set up automated reports** for admin activity

## Support

For questions or issues:
- Check existing audit logs for similar issues
- Review the migration file for implementation details
- Contact the backend security team
- See P0-008 in BUGS_AUDIT_REPORT.md for original context
