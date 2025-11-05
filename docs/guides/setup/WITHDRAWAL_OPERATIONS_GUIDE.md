# 📋 Withdrawal System - Daily Operations Guide

## Quick Reference Dashboard

### 🟢 System Health Check (Do this daily)

```bash
# 1. Check if Edge Functions are responding
curl -s https://obxvffplochgeiclibng.supabase.co/functions/v1/quick-action \
  -X POST -H "Content-Type: application/json" -d '{"test":true}' | grep -q "error" && echo "✅ Function OK" || echo "❌ Function DOWN"

curl -s https://obxvffplochgeiclibng.supabase.co/functions/v1/withdrawal-webhook \
  -X POST -H "Content-Type: application/json" -d '{}' | grep -q "OK" && echo "✅ Webhook OK" || echo "❌ Webhook DOWN"
```

### 📊 Monitor Transactions (Daily)

**SQL to run in Supabase Editor:**

```sql
-- Last 24 hours summary
SELECT
  status,
  COUNT(*) as total,
  COALESCE(SUM(amount), 0) as total_amount,
  ROUND(AVG(EXTRACT(EPOCH FROM (processed_at - created_at))::numeric), 2) as avg_process_time_sec
FROM withdrawal_requests
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status
ORDER BY total DESC;
```

**Expected Results:**
- Most should be `completed`
- If many `failed`: Check MercadoPago account status
- If any `pending`: Check Edge Function logs

---

## Common Operations

### 1. Check a Specific User's Withdrawal History

```sql
-- Replace 'user-uuid' with actual UUID
SELECT
  id,
  amount,
  fee_amount,
  status,
  created_at,
  approved_at,
  processed_at,
  completed_at,
  failure_reason
FROM withdrawal_requests
WHERE user_id = 'user-uuid-here'
ORDER BY created_at DESC;
```

### 2. Find Failed Withdrawals (Requires Investigation)

```sql
SELECT
  id,
  user_id,
  amount,
  fee_amount,
  status,
  failure_reason,
  created_at,
  processed_at
FROM withdrawal_requests
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

**Action Items if failures found:**
1. Check failure_reason (usually MercadoPago error)
2. Verify user's bank account is registered in MercadoPago
3. Check if account needs additional verification
4. Review MercadoPago dashboard for alerts

### 3. Detect Suspicious Withdrawal Patterns

```sql
-- Find users with unusual activity (more than 5 withdrawals or > $20k in 24h)
SELECT
  user_id,
  COUNT(*) as withdrawal_count,
  SUM(amount) as total_withdrawn,
  MIN(created_at) as first_withdrawal,
  MAX(created_at) as last_withdrawal,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count
FROM withdrawal_requests
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY user_id
HAVING COUNT(*) > 5 OR SUM(amount) > 20000
ORDER BY total_withdrawn DESC;
```

**Action Items if suspicious pattern found:**
1. Review transaction details manually
2. Check user's wallet balance history
3. Verify with user if legitimate
4. Consider temporary account review

### 4. Check Edge Function Logs

**URL**: https://supabase.com/dashboard/project/obxvffplochgeiclibng/functions

**What to look for:**
- ✅ Green checkmarks = Success
- ❌ Red errors = Investigate
- ⏱️ Response time = Should be < 1s
- 📊 Error rate = Should be < 5%

**Common error patterns:**
- `"Missing withdrawal_request_id"` = Database trigger didn't call function properly
- `"Account not found"` = User's bank account was deleted
- `"Invalid credentials"` = MercadoPago access token invalid
- `"Transfer limit exceeded"` = MercadoPago daily limit hit

### 5. Manual Withdrawal Retry

If a withdrawal failed but should have succeeded:

```sql
-- First, verify the withdrawal exists and see the error
SELECT id, status, failure_reason, processed_at
FROM withdrawal_requests
WHERE id = 'withdrawal-id-here';

-- If you want to retry, you need to:
-- 1. Understand WHY it failed
-- 2. Fix the underlying issue (e.g., account verification)
-- 3. Contact user or manually process through MercadoPago

-- DO NOT manually change status in database without proper audit trail
```

---

## Troubleshooting Matrix

| Symptom | Likely Cause | Fix |
|---------|------------|-----|
| All withdrawals stuck in `pending` | Edge Function not deployed | Redeploy function via CLI |
| All withdrawals `failed` with same error | MercadoPago access token invalid | Update MERCADOPAGO_ACCESS_TOKEN secret |
| Some withdrawals `approved` but never `completed` | Webhook not receiving confirmations | Check MercadoPago webhook configuration |
| One user's withdrawal fails repeatedly | Account not verified in MercadoPago | User must verify account in MP dashboard |
| Processing takes > 5 seconds | Database/network issue | Check database performance, review logs |
| Edge Function returning 404 | Function not deployed or URL wrong | Verify function is deployed and name is correct |

---

## Weekly Maintenance Checklist

- [ ] Review daily transaction summary
- [ ] Check for any failed withdrawals
- [ ] Verify Edge Function response times < 1s
- [ ] Confirm MercadoPago webhook is still active
- [ ] Monitor error rate (should be < 5%)
- [ ] Check user complaints/tickets related to withdrawals
- [ ] Review security logs for suspicious patterns
- [ ] Test a small withdrawal through the system

---

## Monthly Reports

### Transaction Report Template

```sql
-- Monthly summary
SELECT
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as total_withdrawals,
  COALESCE(SUM(amount), 0) as total_amount,
  COALESCE(SUM(fee_amount), 0) as total_fees,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
  ROUND(100.0 * COUNT(CASE WHEN status = 'completed' THEN 1 END) / COUNT(*), 2) as success_rate_percent,
  ROUND(AVG(EXTRACT(EPOCH FROM (processed_at - created_at)))::numeric, 2) as avg_process_sec
FROM withdrawal_requests
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;
```

### Top Users by Volume

```sql
SELECT
  p.id,
  p.first_name || ' ' || COALESCE(p.last_name, '') as name,
  COUNT(wr.id) as withdrawal_count,
  COALESCE(SUM(wr.amount), 0) as total_withdrawn,
  MAX(wr.created_at) as last_withdrawal
FROM profiles p
LEFT JOIN withdrawal_requests wr ON p.id = wr.user_id
WHERE wr.created_at > NOW() - INTERVAL '30 days'
GROUP BY p.id, p.first_name, p.last_name
ORDER BY total_withdrawn DESC
LIMIT 20;
```

---

## Emergency Procedures

### 🚨 If All Withdrawals Fail

**Step 1: Check Edge Function Status**
```bash
curl -X POST https://obxvffplochgeiclibng.supabase.co/functions/v1/quick-action \
  -H "Content-Type: application/json" \
  -d '{"withdrawal_request_id":"test"}'
```

**Expected Response:**
```json
{"error":"withdrawal_request_id does not exist"}
```

If you get 404, 500, or timeout:
1. Check Supabase Edge Functions dashboard
2. Verify function is deployed
3. Check for deployment errors in logs

**Step 2: Verify MercadoPago Credentials**
```bash
# Test access token in MercadoPago API
# Check Supabase Vault: https://supabase.com/dashboard/project/obxvffplochgeiclibng/settings/vault
```

**Step 3: Check Database**
```sql
-- Verify triggers are active
SELECT trigger_name, event_object_table, trigger_enabled
FROM information_schema.triggers
WHERE trigger_name LIKE '%withdrawal%';
```

Should show:
- `trigger_validate_withdrawal` - ENABLED
- `trigger_instant_process_withdrawal` - ENABLED

### 🚨 If Webhooks Not Receiving Confirmations

1. Go to MercadoPago Dashboard
2. Check Webhooks section in Settings
3. Verify webhook URL is exactly:
   ```
   https://obxvffplochgeiclibng.supabase.co/functions/v1/withdrawal-webhook
   ```
4. Check "Recent Requests" to see if confirmations are being sent
5. If not being sent, contact MercadoPago support

### 🚨 If Users Report Money Not Arriving

1. Check withdrawal status in database
   ```sql
   SELECT * FROM withdrawal_requests WHERE id = 'user-reference-id';
   ```

2. If status is `completed`:
   - Money was sent to MercadoPago
   - Issue is with user's bank or MercadoPago transfer
   - Provide user with MercadoPago transaction reference

3. If status is `failed`:
   - Check `failure_reason` column
   - Most common: Account not verified in MercadoPago
   - Contact user to verify their account

4. If status is `pending` or `approved`:
   - Withdrawal not yet processed
   - Check Edge Function logs
   - May need manual intervention

---

## Performance Baseline

Expected metrics (to detect degradation):

| Metric | Expected | Alert If Above |
|--------|----------|---|
| Processing time (p50) | 200ms | 1s |
| Processing time (p95) | 500ms | 2s |
| Processing time (p99) | 700ms | 3s |
| Error rate | < 2% | > 5% |
| Webhook response time | 100ms | 1s |
| Database query time | < 50ms | > 200ms |

---

## Useful Dashboard Links

| Purpose | URL |
|---------|-----|
| **Edge Functions Monitoring** | https://supabase.com/dashboard/project/obxvffplochgeiclibng/functions |
| **Database SQL Editor** | https://supabase.com/dashboard/project/obxvffplochgeiclibng/editor |
| **Secrets Management** | https://supabase.com/dashboard/project/obxvffplochgeiclibng/settings/vault |
| **MercadoPago Webhooks** | https://www.mercadopago.com.ar/developers/panel (Settings → Webhooks) |
| **MercadoPago Developer Docs** | https://developers.mercadopago.com/docs/withdrawal |

---

## Quick Copy-Paste Queries

### Get withdrawal status
```sql
SELECT id, amount, status, created_at FROM withdrawal_requests
WHERE id = 'ID_HERE' LIMIT 1;
```

### Get all pending withdrawals
```sql
SELECT id, user_id, amount, created_at FROM withdrawal_requests
WHERE status = 'pending' ORDER BY created_at ASC;
```

### Get all failed withdrawals (last 7 days)
```sql
SELECT id, user_id, amount, failure_reason, created_at
FROM withdrawal_requests
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

### Get success rate (last 24 hours)
```sql
SELECT
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
  ROUND(100.0 * COUNT(CASE WHEN status = 'completed' THEN 1 END) / COUNT(*), 2) as success_rate
FROM withdrawal_requests
WHERE created_at > NOW() - INTERVAL '24 hours';
```

---

## When Something Goes Wrong

**DO NOT:**
- ❌ Manually update withdrawal status in database
- ❌ Disable triggers without understanding consequences
- ❌ Change MercadoPago credentials without testing
- ❌ Delete withdrawal records

**DO:**
- ✅ Document the issue with timestamps
- ✅ Check Edge Function logs first
- ✅ Review failure_reason column
- ✅ Verify external service status (MercadoPago)
- ✅ Test with a small amount before major changes
- ✅ Escalate to development team if needed

---

**Last Updated**: October 18, 2025
**Created By**: Claude Code
**Maintained By**: AutoRenta Operations Team
