# Supabase Project Paused - Fix Guide

**Date**: 2025-11-06
**Issue**: Login fails with "Cannot contact Supabase" error
**Root Cause**: Supabase project is PAUSED
**Severity**: 🔴 Critical (blocks all functionality)

---

## Problem Description

Users cannot login to the AutoRenta application. The error message indicates:
> "No se pudo contactar con Supabase"

### Symptoms

- Login page loads but authentication fails
- Browser shows no network errors (200 OK for page load)
- Backend returns "Access denied" for all Supabase endpoints
- Auth health check fails: `curl https://obxvffplochgeiclibng.supabase.co/auth/v1/health` → "Access denied"

### Diagnosis

Run the diagnostic script:
```bash
./tools/diagnose-supabase.sh
```

Expected output if paused:
```
🚨 PROJECT PAUSED OR SUSPENDED

Auth Health Endpoint: ❌ Access Denied
REST API: ❌ Access Denied
```

---

## Root Cause

**Supabase Free Tier Auto-Pause Policy**

- Free tier projects are automatically paused after **7 days of inactivity**
- No API requests (auth, database, storage) during this period triggers pause
- Once paused, ALL endpoints return "Access denied"
- This is NOT a network issue - the server responds but rejects all requests

**Why This Happened**

Looking at git history, the last deployment was likely more than 7 days ago, and the project had no user activity during that period.

---

## Solution

### Step 1: Login to Supabase Dashboard

1. Open the Supabase dashboard:
   ```
   https://supabase.com/dashboard/project/obxvffplochgeiclibng
   ```

2. Login with your Supabase account credentials
   - Email: (the account that created this project)
   - Or use OAuth (GitHub, Google, etc.)

### Step 2: Restore the Project

**Option A: If you see a "PAUSED" banner**
- Click the **"Restore Project"** or **"Unpause"** button
- Wait 1-2 minutes for services to restart
- You should see "Project is running" status

**Option B: If project is suspended**
- Check your email for messages from Supabase support
- Common reasons: billing issue, ToS violation, high usage spike
- Follow instructions in the email to restore access

**Option C: If billing issue**
- Go to **Settings → Billing**
- Update payment method
- Clear any outstanding balance
- Wait for project to restart

### Step 3: Verify Fix

Run the diagnostic again:
```bash
./tools/diagnose-supabase.sh
```

Expected output when fixed:
```
✅ Auth service is healthy
✅ REST API is accessible
✅ Supabase platform is operational
```

### Step 4: Test Login

1. Navigate to the login page: `http://localhost:4200/auth/login`
2. Try logging in with a test account
3. Verify you can see the dashboard

---

## Prevention

### Option 1: Upgrade to Pro Plan (Recommended)

**Cost**: $25/month per project
**Benefits**:
- ✅ No auto-pause
- ✅ Always-on database
- ✅ 8GB database (vs 500MB free)
- ✅ 100GB storage (vs 1GB free)
- ✅ No daily email backups required
- ✅ Priority support

**When to upgrade**:
- Production deployments
- Projects with real users
- Need >99.9% uptime

**How to upgrade**:
```
Dashboard → Settings → Billing → Upgrade to Pro
```

### Option 2: Keep Project Active (Free Tier)

**Requirement**: At least 1 API request every 7 days

**Automated Solutions**:

**A) GitHub Actions Cron Job** (Recommended)

Create `.github/workflows/keep-supabase-active.yml`:
```yaml
name: Keep Supabase Active

on:
  schedule:
    # Run every 3 days at 9am UTC
    - cron: '0 9 */3 * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  ping-supabase:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Supabase Health Endpoint
        run: |
          curl -f -H "apikey: ${{ secrets.SUPABASE_ANON_KEY }}" \
            https://obxvffplochgeiclibng.supabase.co/auth/v1/health
        continue-on-error: true

      - name: Query Database
        run: |
          curl -f \
            -H "apikey: ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            https://obxvffplochgeiclibng.supabase.co/rest/v1/profiles?limit=1
        continue-on-error: true
```

**Required Secrets**:
- `SUPABASE_ANON_KEY` (already configured in GitHub)

**B) External Monitoring Service**

Use a free uptime monitor:
- **UptimeRobot** (free, 50 monitors): https://uptimerobot.com
- **Pingdom** (free tier): https://www.pingdom.com
- **Cronitor** (free, 10 monitors): https://cronitor.io

**Setup**:
1. Create account
2. Add monitor for: `https://obxvffplochgeiclibng.supabase.co/auth/v1/health`
3. Set check interval: Every 5-7 days
4. Add header: `apikey: <your-anon-key>`

**C) Local Cron Job** (if you have a server)

```bash
# Edit crontab
crontab -e

# Add this line (runs every 3 days at noon)
0 12 */3 * * curl -H "apikey: YOUR_ANON_KEY" https://obxvffplochgeiclibng.supabase.co/auth/v1/health
```

---

## Impact on Users

**When project is paused**:
- ❌ Cannot login (all auth blocked)
- ❌ Cannot register new users
- ❌ Cannot access any data
- ❌ Cannot upload images
- ❌ OAuth providers fail
- ✅ Frontend still loads (static files)
- ✅ No data loss (database is preserved)

**After restoration**:
- ✅ All data intact
- ✅ All users can login immediately
- ✅ No re-configuration needed
- ✅ Session tokens still valid (if not expired)

---

## Testing This Fix

### Before Fix
```bash
# Should fail with "Access denied"
curl -H "apikey: YOUR_KEY" \
  https://obxvffplochgeiclibng.supabase.co/auth/v1/health

# Expected: Access denied
```

### After Fix
```bash
# Should succeed with health status
curl -H "apikey: YOUR_KEY" \
  https://obxvffplochgeiclibng.supabase.co/auth/v1/health

# Expected: {"version":"...","name":"GoTrue"}
```

### Integration Test
```bash
# From project root
cd apps/web
npm start

# Navigate to http://localhost:4200/auth/login
# Try logging in - should work
```

---

## Related Issues

- **GitHub Issue**: (link to issue if created)
- **Supabase Status**: https://status.supabase.com
- **Supabase Docs**: https://supabase.com/docs/guides/platform/going-into-prod#pausing

---

## Lessons Learned

1. **Free tier limitations**: Not suitable for production without keepalive
2. **Monitoring gaps**: We didn't have alerts for Supabase being down
3. **Documentation**: This guide now exists to prevent future confusion
4. **Cost-benefit**: $25/month Pro plan may be worth it vs managing keepalive

---

## Appendix: Supabase Project Info

- **Project ID**: obxvffplochgeiclibng
- **Region**: us-east-2
- **Created**: 2025-10-15
- **Plan**: Free Tier
- **Database**: PostgreSQL 15
- **Edge Functions**: 20 deployed
- **Storage Buckets**: 3 (avatars, car-images, documents)

---

## Quick Reference Commands

```bash
# Diagnose connection
./tools/diagnose-supabase.sh

# Check Supabase status
curl https://status.supabase.com/api/v2/status.json

# Test auth endpoint
curl -H "apikey: YOUR_KEY" \
  https://obxvffplochgeiclibng.supabase.co/auth/v1/health

# Dashboard link
echo "https://supabase.com/dashboard/project/obxvffplochgeiclibng"
```
