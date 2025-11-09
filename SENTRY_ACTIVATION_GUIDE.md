# Sentry Activation Guide

**Status**: ✅ Code is 100% READY - Only needs DSN configuration
**P1 Task**: Activate error tracking in production
**Effort**: 15 minutes

---

## Current Status

### ✅ What's Already Implemented

1. **Sentry Service** (`apps/web/src/app/core/services/sentry.service.ts`)
   - ✅ Error handler configured
   - ✅ Performance monitoring (browserTracingIntegration)
   - ✅ Session replay with masking
   - ✅ Sensitive data sanitization (tokens, passwords, headers)
   - ✅ Error filtering (browser extensions, network errors)

2. **Initialization** (`apps/web/src/main.ts`)
   - ✅ `initSentry()` called before app bootstrap (line 10)
   - ✅ Only runs when DSN is configured

3. **Environment Configuration** (`apps/web/src/environments/environment.ts`)
   - ✅ Reads from `NG_APP_SENTRY_DSN` env variable (line 130 in environment.base.ts)
   - ✅ Environment-specific config (production vs development)
   - ✅ Sample rates configured (10% traces in production, 100% in dev)

### ❌ What's Missing

- **Sentry DSN** - Not configured in environment variables
- **GitHub Secret** - Not set in repository

---

## Activation Steps

### Step 1: Create Sentry Project (if not exists)

1. Go to https://sentry.io/
2. Click "Create Project"
3. Select "Angular" as platform
4. Name: `autorenta-web`
5. Copy the DSN (looks like: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`)

### Step 2: Configure GitHub Secret

```bash
# Add secret to GitHub repository
gh secret set SENTRY_DSN --body "https://YOUR_SENTRY_DSN_HERE"
```

Or via GitHub UI:
1. Go to https://github.com/ecucondorSA/autorenta/settings/secrets/actions
2. Click "New repository secret"
3. Name: `SENTRY_DSN`
4. Value: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`

### Step 3: Configure Cloudflare Pages Environment Variable

Option A: Via Cloudflare Dashboard
1. Go to Cloudflare Pages → `autorenta-web` project
2. Settings → Environment variables
3. Production:
   - Variable name: `NG_APP_SENTRY_DSN`
   - Value: Your Sentry DSN
4. Click "Save"

Option B: Via Wrangler CLI (if configured)
```bash
wrangler pages deployment create autorenta-web \
  --env production \
  --env-var NG_APP_SENTRY_DSN="https://YOUR_DSN_HERE"
```

### Step 4: Rebuild & Deploy

```bash
# Trigger a new deployment
git commit --allow-empty -m "chore: trigger deployment to activate Sentry"
git push origin main
```

Or manually trigger from Cloudflare Pages dashboard.

---

## Verification

### 1. Check Initialization

After deployment, check browser console (production site):
- Should see: `✅ Sentry initialized` in console
- If not configured: `⚠️ Sentry DSN not configured - error tracking disabled`

### 2. Test Error Capture

Method 1: Create test error in production
```typescript
// Temporarily add this to any component
throw new Error('Test Sentry Error - Please ignore');
```

Method 2: Use browser console
```javascript
// In production site console
throw new Error('Test Sentry - Please ignore');
```

### 3. Verify in Sentry Dashboard

1. Go to https://sentry.io/organizations/YOUR_ORG/issues/
2. Should see the test error appear within 1-2 minutes
3. Click on error to see:
   - Stack trace
   - User context
   - Browser info
   - Session replay (if available)

---

## Configuration Details

### Sentry Features Enabled

1. **Error Tracking**
   - All unhandled errors
   - All console.error() calls
   - All promise rejections

2. **Performance Monitoring**
   - Page load times
   - API request durations
   - Navigation timing
   - **Sample rate**: 10% in production, 100% in development

3. **Session Replay**
   - Records user sessions on error
   - Masks all text (privacy)
   - Blocks all media (privacy)
   - **Sample rate**: 10% of sessions, 100% on errors

4. **Data Sanitization**
   - Automatically redacts:
     - Tokens
     - Passwords
     - API keys
     - Secrets
     - Authorization headers
     - Cookies

5. **Error Filtering**
   - Ignores:
     - Browser extension errors
     - Network errors (handled separately)
     - Chunk load errors
     - ResizeObserver errors

### Environment Variables

| Variable | Purpose | Production Value | Development Value |
|----------|---------|-----------------|------------------|
| `NG_APP_SENTRY_DSN` | Sentry Project DSN | `https://xxx@yyy.ingest.sentry.io/zzz` | Empty (disabled) |
| `NG_APP_SENTRY_ENVIRONMENT` | Environment tag | `production` | `development` |

### Sample Rates

- **Traces** (Performance): 10% in production, 100% in dev
- **Replays** (Sessions): 10% in production, 100% in dev
- **Replays on Error**: 100% always

---

## GitHub Actions Integration

### Update CI/CD Workflow

Add Sentry DSN to build step in `.github/workflows/build-and-deploy.yml`:

```yaml
- name: Build
  env:
    NG_APP_SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
    NG_APP_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    NG_APP_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
    # ... other env vars
  run: npm run build
```

---

## Cost Estimation

### Sentry Pricing (as of 2025)

**Free Tier**:
- 5,000 errors/month
- 10,000 performance units/month
- 50 replays/month

**Paid Plans** (if exceeded):
- Team: $26/month + usage
- Business: $80/month + usage

### Estimated Usage (AutoRenta)

Assuming 1,000 daily active users:
- Errors: ~100-500/month (if app is stable)
- Performance: ~30,000/month (10% sample rate)
- Replays: ~300/month (10% sample rate)

**Recommendation**: Start with Free tier, upgrade if needed

---

## Monitoring Best Practices

### 1. Set Up Alerts

Configure Sentry alerts for:
- Error rate > 10 errors/minute
- New error types
- Performance degradation
- Critical errors (5xx responses)

### 2. Integrate with Slack

1. In Sentry: Settings → Integrations → Slack
2. Connect workspace
3. Configure alert rules to post to #engineering or #alerts

### 3. Release Tracking

Add release info to builds:

```typescript
// environment.ts
release: `autorenta-web@${process.env.NG_APP_VERSION || 'unknown'}`
```

Then in CI:
```bash
export NG_APP_VERSION=$(git rev-parse --short HEAD)
```

---

## Rollback Plan

If Sentry causes issues:

1. **Disable via Environment Variable**
   ```bash
   # In Cloudflare Pages, delete NG_APP_SENTRY_DSN
   # Or set to empty string
   ```

2. **Code still works** - If DSN is empty, Sentry is disabled automatically (line 46-48 in sentry.service.ts)

3. **No code changes needed** - Just remove env variable

---

## Next Steps

1. [ ] Create Sentry project
2. [ ] Add `SENTRY_DSN` secret to GitHub
3. [ ] Configure `NG_APP_SENTRY_DSN` in Cloudflare Pages
4. [ ] Deploy to production
5. [ ] Verify initialization in browser console
6. [ ] Create test error to verify
7. [ ] Configure Slack alerts
8. [ ] Monitor error rate for first week

---

## Status: ✅ READY TO ACTIVATE

**Implementation**: 100% complete
**Configuration needed**: ~15 minutes
**Risk**: LOW (can be disabled via env variable)
**Impact**: HIGH (critical for production monitoring)

---

**Guide created**: 2025-11-09
**Code ready**: YES
**Waiting on**: Sentry DSN configuration
