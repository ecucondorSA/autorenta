# AutoRenta - Rollback Guide

**Last Updated:** 2025-12-28

This guide documents rollback procedures for different components of the AutoRenta platform.

---

## Quick Reference

| Component | Rollback Method | Time to Rollback |
|-----------|-----------------|------------------|
| Frontend (Web) | Cloudflare Dashboard | ~1 minute |
| Edge Functions | Git revert + deploy | ~3 minutes |
| Database Schema | Reverse migration | ~5 minutes |
| Database Data | Point-in-time recovery | ~15-30 minutes |

---

## 1. Frontend Rollback (Cloudflare Pages)

### Via Dashboard (Recommended)
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to: `Pages > autorentar > Deployments`
3. Find the last known good deployment
4. Click the three dots menu (⋮)
5. Select **"Rollback to this deployment"**
6. Confirm the rollback

### Via CLI
```bash
# List recent deployments
npx wrangler pages deployment list --project-name=autorentar

# Note the deployment ID of the last known good version
# Rollbacks via CLI require re-deploying from git

# Checkout the previous version
git checkout <commit-hash>

# Build and deploy
pnpm build:web
CLOUDFLARE_ACCOUNT_ID=5b448192fe4b369642b68ad8f53a7603 \
npx wrangler pages deploy dist/web/browser \
  --project-name=autorentar \
  --commit-dirty=true

# Return to main branch
git checkout main
```

### Verification
- Check: https://autorentar.pages.dev
- Verify key functionality: login, search, booking flow
- Check browser console for errors

---

## 2. Edge Functions Rollback (Supabase)

### Single Function Rollback
```bash
# Revert the specific function to previous version
git log --oneline supabase/functions/<function-name>/
git checkout <commit-hash> -- supabase/functions/<function-name>/

# Deploy the reverted version
supabase functions deploy <function-name>

# Verify
supabase functions logs <function-name> --follow
```

### Multiple Functions Rollback
```bash
# Revert entire functions directory
git checkout <commit-hash> -- supabase/functions/

# Deploy all functions
supabase functions deploy

# Or deploy specific critical functions first
supabase functions deploy mercadopago-process-brick-payment
supabase functions deploy mercadopago-webhook
supabase functions deploy paypal-webhook
```

### Emergency: Disable Function
If a function is causing issues and you need to disable it immediately:

```bash
# Option 1: Deploy a minimal "under maintenance" version
cat > /tmp/maintenance.ts << 'EOF'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
serve(() => new Response(
  JSON.stringify({ error: 'Service temporarily unavailable', retry_after: 300 }),
  { status: 503, headers: { 'Content-Type': 'application/json', 'Retry-After': '300' } }
));
EOF

# Backup original
cp supabase/functions/<function-name>/index.ts /tmp/<function-name>-backup.ts

# Deploy maintenance version
cp /tmp/maintenance.ts supabase/functions/<function-name>/index.ts
supabase functions deploy <function-name>
```

### Verification
```bash
# Check function logs
supabase functions logs <function-name> --follow

# Test endpoint
curl -X POST https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/<function-name> \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## 3. Database Schema Rollback

### Reverse Migration (Recommended)
For each migration, create a corresponding rollback script.

**Example:** Rolling back a new column
```sql
-- Original migration: 20251228_add_feature.sql
ALTER TABLE bookings ADD COLUMN new_feature TEXT;

-- Rollback: 20251228_add_feature_rollback.sql
ALTER TABLE bookings DROP COLUMN IF EXISTS new_feature;
```

**Execute rollback:**
```bash
PGPASSWORD='Ab.12345' psql \
  -h aws-1-sa-east-1.pooler.supabase.com -p 6543 \
  -U postgres.pisqjmoklivzpwufhscx -d postgres \
  -f supabase/migrations/<migration>_rollback.sql
```

### RPC/Function Rollback
```sql
-- Drop new version
DROP FUNCTION IF EXISTS <function_name>;

-- Restore previous version from git
-- Then execute the old migration file
```

### Rolling Back Indexes
```sql
-- If you added an index that's causing issues
DROP INDEX CONCURRENTLY IF EXISTS idx_name;
```

### Rolling Back Constraints
```sql
-- If you added a constraint that's blocking data
ALTER TABLE table_name DROP CONSTRAINT IF EXISTS constraint_name;
```

---

## 4. Database Data Rollback

### Point-in-Time Recovery (PITR)
Supabase Pro plans include PITR. For critical data issues:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select project: `pisqjmoklivzpwufhscx`
3. Navigate to: `Settings > Database > Backups`
4. Choose recovery point
5. Initiate recovery (creates new project)

**Note:** PITR creates a new project. You'll need to:
- Update DNS/environment variables
- Migrate Edge Functions
- Update Cloudflare Pages environment

### Manual Data Correction
For small data issues, correct manually:

```sql
-- Identify affected records
SELECT * FROM table_name WHERE condition;

-- Backup before changing
CREATE TABLE table_name_backup_YYYYMMDD AS
SELECT * FROM table_name WHERE condition;

-- Apply correction
UPDATE table_name SET column = value WHERE condition;

-- Verify
SELECT * FROM table_name WHERE condition;
```

---

## 5. Payment System Rollback

### MercadoPago Issues
If MercadoPago integration is broken:

1. **Immediate:** Disable payment button in UI
   ```typescript
   // Set feature flag in environment
   VITE_PAYMENTS_ENABLED=false
   ```

2. **Short-term:** Redirect to wallet-only payments
   ```typescript
   // Force wallet payment method
   if (isPaymentSystemDown) {
     return 'wallet';
   }
   ```

3. **Rollback function:**
   ```bash
   git checkout HEAD~1 -- supabase/functions/mercadopago-process-brick-payment
   supabase functions deploy mercadopago-process-brick-payment
   ```

### Webhook Issues
If webhooks are failing and payments are not being confirmed:

1. **Check logs:**
   ```bash
   supabase functions logs mercadopago-webhook --follow
   ```

2. **Manual payment confirmation:**
   ```sql
   -- Find pending payments
   SELECT * FROM mp_webhook_logs WHERE processed = FALSE;

   -- Manually confirm booking if payment verified in MP dashboard
   UPDATE bookings
   SET status = 'confirmed', paid_at = NOW()
   WHERE id = '<booking_id>';
   ```

---

## 6. Rollback Checklist

### Before Rollback
- [ ] Identify the exact issue and affected component
- [ ] Document current state (logs, errors, affected users)
- [ ] Notify team members
- [ ] Prepare rollback commands
- [ ] Identify verification steps

### During Rollback
- [ ] Execute rollback command
- [ ] Monitor logs for errors
- [ ] Check for cascading failures
- [ ] Document any issues

### After Rollback
- [ ] Verify functionality is restored
- [ ] Check error rates in monitoring
- [ ] Notify affected users if applicable
- [ ] Create postmortem
- [ ] Plan proper fix for the issue

---

## 7. Common Rollback Scenarios

### Scenario: Bad Deploy Broke Login
```bash
# 1. Rollback frontend
# Via Cloudflare Dashboard - select previous deployment

# 2. If Edge Function issue
supabase functions logs mercadopago-oauth-callback --follow
git checkout HEAD~1 -- supabase/functions/mercadopago-oauth-callback
supabase functions deploy mercadopago-oauth-callback
```

### Scenario: Search Returns No Results
```bash
# Check if RPC was modified
git log --oneline supabase/migrations/*available_cars*

# If migration broke the RPC
PGPASSWORD='...' psql ... -c "
  SELECT * FROM get_available_cars(
    NOW() + INTERVAL '1 day',
    NOW() + INTERVAL '7 days',
    -34.6, -58.4, 50, 0
  ) LIMIT 5;
"

# Rollback to previous RPC version
git checkout <hash> -- supabase/migrations/<file>.sql
# Execute the old migration
```

### Scenario: Payments Failing
```bash
# 1. Check rate limiter
PGPASSWORD='...' psql ... -c "
  SELECT * FROM rate_limit_log
  WHERE endpoint LIKE 'mercadopago%'
  ORDER BY created_at DESC LIMIT 10;
"

# 2. Check Edge Function logs
supabase functions logs mercadopago-process-brick-payment --follow

# 3. Rollback if needed
git checkout HEAD~1 -- supabase/functions/mercadopago-process-brick-payment
supabase functions deploy mercadopago-process-brick-payment
```

---

## 8. Contacts

| Role | When to Contact |
|------|-----------------|
| DevOps | Infrastructure issues, Cloudflare, Supabase |
| Backend | Edge Functions, Database, Payments |
| Frontend | UI issues, Angular, Ionic |

---

## Related Documentation

- [Incident Runbook](./INCIDENT_RUNBOOK.md)
- [CI/CD Workflow](./CI_CD_WORKFLOW.md)
- [Webhooks Documentation](./WEBHOOKS.md)

---

*Documentation generated by Claude Code*
