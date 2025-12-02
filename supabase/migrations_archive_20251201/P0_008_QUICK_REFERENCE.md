# P0-008 Quick Reference Card

## 🚨 Critical: All Admin APIs Must Use These Functions

### Step 1: Check Permission (REQUIRED)
```typescript
const { data: hasPermission } = await supabase
  .rpc('check_admin_permission', {
    p_action: 'approve_booking',           // What action
    p_resource_type: 'booking',            // What resource
    p_required_role: 'operations'          // Required role (optional)
  });

if (!hasPermission) {
  return { status: 403, error: 'Forbidden' };
}
```

### Step 2: Log Action (REQUIRED)
```typescript
await supabase.rpc('log_admin_action', {
  p_action: 'booking_approve',
  p_resource_type: 'booking',
  p_resource_id: bookingId,
  p_old_values: oldData,                   // Before state
  p_new_values: newData,                   // After state
  p_ip_address: req.headers.get('x-forwarded-for'),
  p_user_agent: req.headers.get('user-agent')
});
```

## 📋 Common Actions by Role

### Operations Role
- `approve_verification` - Approve user verification
- `reject_verification` - Reject user verification
- `booking_approve` - Approve booking
- `booking_cancel` - Cancel booking
- `car_approve` - Approve car listing
- `car_suspend` - Suspend car listing

### Finance Role
- `payment_refund_full` - Full refund
- `payment_refund_partial` - Partial refund
- `payment_investigate` - Investigate payment
- `withdrawal_approve` - Approve withdrawal
- `withdrawal_reject` - Reject withdrawal

### Support Role
- `user_view` - View user details
- `booking_view` - View booking details
- `review_flag` - Flag review for moderation
- `review_hide` - Hide inappropriate review

### Super Admin (All of Above Plus)
- `role_grant` - Grant admin role
- `role_revoke` - Revoke admin role
- `config_update` - Update system config
- `user_suspend` - Suspend user account

## 🔍 Quick Audit Queries

### Recent Admin Activity
```sql
SELECT created_at, admin_role, action, resource_type, success
FROM admin_audit_logs
ORDER BY created_at DESC
LIMIT 20;
```

### Failed Access Attempts (Security Alert)
```sql
SELECT *
FROM admin_audit_logs
WHERE success = false
ORDER BY created_at DESC;
```

### Activity by IP Address
```sql
SELECT ip_address, COUNT(*) as actions
FROM admin_audit_logs
WHERE created_at > now() - interval '1 day'
GROUP BY ip_address
ORDER BY actions DESC;
```

## ⚠️ Common Mistakes to Avoid

❌ **WRONG**: Checking admin role in frontend only
```typescript
if (user.role === 'admin') {
  // Perform admin action
}
```

✅ **CORRECT**: Check permission server-side
```typescript
const { data: hasPermission } = await supabase
  .rpc('check_admin_permission', {
    p_action: 'approve_booking',
    p_resource_type: 'booking'
  });

if (!hasPermission) return { status: 403 };
```

❌ **WRONG**: Not logging admin actions
```typescript
await supabase.from('bookings').update({ status: 'approved' });
```

✅ **CORRECT**: Always log admin actions
```typescript
const oldData = await getOldData();
const newData = await updateData();
await supabase.rpc('log_admin_action', { ... });
```

## 📞 Support

Questions? Check the full documentation:
- `/supabase/migrations/README_P0_008_ADMIN_AUTH.md`
- `/P0_008_IMPLEMENTATION_SUMMARY.md`
