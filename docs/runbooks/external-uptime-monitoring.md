# Runbook: External Uptime Monitoring Setup

**Priority**: P0 (Production Blocker)
**Owner**: DevOps/Platform Team
**Last Updated**: 2025-11-07
**Status**: Implementation Guide

---

## 🎯 Overview

This runbook provides step-by-step instructions for setting up external uptime monitoring for AutoRenta using UptimeRobot (or alternative services). External monitoring is **critical** because it provides independent verification of service availability and can detect issues that internal monitoring cannot:

- **Independent validation**: Works even if Supabase/internal systems are down
- **Multi-region checks**: Detects regional outages and routing issues
- **DNS monitoring**: Catches DNS resolution failures
- **User-perspective monitoring**: Tests from actual user locations
- **SLA tracking**: Provides compliance-grade uptime metrics

---

## 📋 Prerequisites

Before starting, ensure you have:

- [ ] Admin access to production systems
- [ ] PagerDuty account (for critical alerts) - See [Issue #119](https://github.com/ecucondorSA/autorenta/issues/119)
- [ ] Slack workspace admin (for notifications)
- [ ] Email addresses for alert recipients
- [ ] SMS notification phone numbers (for critical alerts)
- [ ] Internal monitoring system deployed (see `MONITORING_SYSTEM.md`)

---

## 🔧 Service Selection

### Recommended: UptimeRobot Pro

**Why UptimeRobot?**
- ✅ Reliable and widely used (500M+ checks/day)
- ✅ Multi-region monitoring included
- ✅ PagerDuty integration
- ✅ Affordable ($7/month for Pro features)
- ✅ 1-minute check intervals
- ✅ SMS alerts included
- ✅ API for automation

**Pricing:**
- **Free Tier**: 50 monitors, 5-minute intervals, 2 alert channels
- **Pro Plan**: $7/month, 50 monitors, 1-minute intervals, unlimited alerts
- **Recommendation**: Start with Pro for production

**Alternatives:**
- **Pingdom**: $10/month, more features, better analytics
- **Hetrix Tools**: $4.50/month, budget option
- **Better Uptime**: $18/month, beautiful status pages
- **StatusCake**: Free tier available, 5-minute checks

---

## 🚀 Implementation Steps

### Step 1: Sign Up for UptimeRobot

1. Go to [https://uptimerobot.com](https://uptimerobot.com)
2. Click **"Sign Up Free"**
3. Use company email: `devops@autorenta.com` or team email
4. Verify email address
5. **Upgrade to Pro Plan** ($7/month):
   - Click "Upgrade" in dashboard
   - Select "Monthly" billing
   - Enable 1-minute interval checks

### Step 2: Create Monitor Group

Organize monitors into a logical group:

1. Go to **Dashboard** → **My Settings** → **Monitor Groups**
2. Click **"Add Monitor Group"**
3. Name: `AutoRenta Production`
4. Save

### Step 3: Create Monitors

Create the following monitors (in order of priority):

#### Monitor 1: Main Website (Critical)

**Configuration:**
```
Monitor Type: HTTP(s)
Friendly Name: AutoRenta - Main Website
URL: https://autorenta.pages.dev
Monitoring Interval: 1 minute
Monitor Timeout: 30 seconds

Expected Status Code: 200
Keyword to Check: (Optional) "AutoRenta" or specific text from homepage
HTTP Method: GET (HEAD for faster checks)

Locations:
  ✓ North America - US East (Virginia)
  ✓ South America - Brazil (São Paulo)
  ✓ Europe - Germany (Frankfurt)

Alert When Down For: 2 minutes (2 consecutive failures)
```

**Why this configuration?**
- 1-minute checks ensure 2-minute detection (meets requirement)
- Multi-region catches regional outages
- 2 failures prevents false positives
- GET method validates full page load

#### Monitor 2: Health Check API (Critical)

**Configuration:**
```
Monitor Type: HTTP(s)
Friendly Name: AutoRenta - Health Check API
URL: https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-health-check
Monitoring Interval: 1 minute
Monitor Timeout: 30 seconds

Expected Status Code: 200
Expected Response: Contains "total_checks" keyword
HTTP Method: POST
Request Body: {}
Headers:
  Content-Type: application/json

Locations:
  ✓ North America - US East
  ✓ South America - Brazil
  ✓ Europe - Germany

Alert When Down For: 2 minutes
```

**Why monitor the health check?**
- Validates backend services are running
- Tests database connectivity indirectly
- Monitors Edge Functions availability

#### Monitor 3: Payment Webhook (Critical)

**Configuration:**
```
Monitor Type: HTTP(s)
Friendly Name: AutoRenta - Payment Webhook
URL: https://payments-webhook.autorenta.workers.dev/webhooks/payments
  (Replace with actual Cloudflare Worker URL)
Monitoring Interval: 5 minutes
Monitor Timeout: 30 seconds

Expected Status Code: 200
Expected Response: Contains "status":"ok" keyword
HTTP Method: GET

Locations:
  ✓ North America - US East
  ✓ South America - Brazil

Alert When Down For: 10 minutes (2 consecutive failures)
```

**Note**: Get actual webhook URL from:
```bash
wrangler deployments list --name payments_webhook
```

#### Monitor 4: Database Health (via Internal Check)

**Configuration:**
```
Monitor Type: HTTP(s)
Friendly Name: AutoRenta - Database Health
URL: https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-metrics?action=summary
Monitoring Interval: 5 minutes
Monitor Timeout: 30 seconds

Expected Status Code: 200
Expected Response: Contains "healthy" keyword
HTTP Method: GET
Headers:
  Authorization: Bearer <SERVICE_ROLE_KEY>

Locations:
  ✓ North America - US East

Alert When Down For: 10 minutes
```

**⚠️ Security Note**: Use a read-only API key if possible. Store securely.

#### Monitor 5: Auth Endpoints (Important)

**Configuration:**
```
Monitor Type: HTTP(s)
Friendly Name: AutoRenta - Auth Login Page
URL: https://autorenta.pages.dev/auth/login
Monitoring Interval: 5 minutes
Monitor Timeout: 30 seconds

Expected Status Code: 200
Keyword to Check: "login" or "email"
HTTP Method: GET

Locations:
  ✓ North America - US East
  ✓ South America - Brazil

Alert When Down For: 10 minutes
```

#### Monitor 6: Car Listings API (Important)

**Configuration:**
```
Monitor Type: HTTP(s)
Friendly Name: AutoRenta - Car Listings Page
URL: https://autorenta.pages.dev/cars
Monitoring Interval: 5 minutes
Monitor Timeout: 30 seconds

Expected Status Code: 200
HTTP Method: GET

Locations:
  ✓ North America - US East
  ✓ South America - Brazil

Alert When Down For: 10 minutes
```

### Step 4: Configure Alert Contacts

UptimeRobot supports multiple alert channels. Configure all:

#### 4.1 Email Alerts

1. Go to **My Settings** → **Alert Contacts**
2. Click **"Add Alert Contact"**
3. Select **Email**
4. Configuration:
   ```
   Friendly Name: DevOps Team
   Email: devops@autorenta.com

   Send alerts for:
   ✓ Down
   ✓ Up (recovery)
   ✓ SSL expiry (30 days before)
   ```
5. Verify email
6. **Repeat** for additional recipients:
   - `alerts@autorenta.com` (team distribution list)
   - Individual developers (optional)

#### 4.2 Slack Alerts

1. In UptimeRobot: **My Settings** → **Alert Contacts** → **Add Alert Contact**
2. Select **Slack**
3. Click **"Connect with Slack"**
4. Authorize UptimeRobot in Slack workspace
5. Select channel: `#production-alerts` or `#ops`
6. Configure:
   ```
   Friendly Name: Slack - Production Alerts
   Channel: #production-alerts

   Send alerts for:
   ✓ Down
   ✓ Up
   ✓ SSL expiry
   ```

**Slack Message Format:**
```
🚨 [AutoRenta - Main Website] is DOWN
Response: Connection timeout
Duration: 2 minutes
Location: US East (Virginia)

View: https://uptimerobot.com/dashboard#monitor_id
```

#### 4.3 PagerDuty Integration (Critical Alerts Only)

**Prerequisites**: Complete [Issue #119 - PagerDuty Setup](https://github.com/ecucondorSA/autorenta/issues/119)

1. In PagerDuty: Create **Integration Key**
   - Go to **Services** → **AutoRenta Production**
   - Add Integration → **UptimeRobot**
   - Copy Integration Key

2. In UptimeRobot:
   - **My Settings** → **Alert Contacts** → **Add Alert Contact**
   - Select **Custom Webhook (via PagerDuty)**
   - Or use **Email-to-PagerDuty**: `<integration-key>@<subdomain>.pagerduty.com`

3. Configuration:
   ```
   Friendly Name: PagerDuty - Critical
   Email: <integration-key>@autorenta.pagerduty.com

   Send alerts for:
   ✓ Down only (not recoveries)

   Apply to monitors:
   - AutoRenta - Main Website
   - AutoRenta - Health Check API
   - AutoRenta - Payment Webhook
   ```

**PagerDuty Alert Routing:**
- **Severity High**: Main Website, Health Check API
- **Severity Medium**: Payment Webhook, Database
- **Severity Low**: Auth, Car Listings

#### 4.4 SMS Alerts (Critical Escalation)

**Use sparingly** - SMS credits are limited even on Pro plan.

1. **My Settings** → **Alert Contacts** → **Add Alert Contact**
2. Select **SMS**
3. Configuration:
   ```
   Friendly Name: On-Call Engineer SMS
   Phone: +54 9 11 XXXX-XXXX (Argentina format)

   Send alerts for:
   ✓ Down only

   Apply to monitors:
   - AutoRenta - Main Website (ONLY)
   ```

4. **Add secondary contact**:
   ```
   Friendly Name: Backup On-Call
   Phone: +54 9 11 YYYY-YYYY

   Alert after: 10 minutes down
   Apply to: Main Website
   ```

**SMS Alert Format:**
```
AutoRenta MAIN WEBSITE DOWN
2 min - US East
https://status.uptimerobot.com/monitor_id
```

### Step 5: Configure Advanced Settings

#### 5.1 Maintenance Windows

Prevent false alerts during deployments:

1. **Dashboard** → **Maintenance Windows**
2. **Add Maintenance Window**:
   ```
   Title: Weekly Deployment Window
   Type: Recurring
   Schedule: Every Wednesday, 02:00-03:00 UTC

   Affects:
   - All monitors

   Notification: Email team 1 hour before
   ```

3. **Create ad-hoc window** for emergency maintenance:
   ```
   Title: Emergency Database Migration
   Type: Once
   Start: <timestamp>
   Duration: 2 hours

   Affects: Select specific monitors
   ```

#### 5.2 Status Pages (Optional - Public)

Create public status page for users:

1. **My Status Pages** → **Add Status Page**
2. Configuration:
   ```
   Page Name: AutoRenta Status
   URL: https://status.autorenta.com (custom domain)
   OR: https://stats.uptimerobot.com/XXXXX (subdomain)

   Display Monitors:
   - AutoRenta - Main Website
   - AutoRenta - Auth
   - AutoRenta - Car Listings

   Hide:
   - Database Health (internal only)
   - API keys in URLs

   Show History: 90 days
   Show Response Times: Yes
   ```

3. **Customize appearance**:
   - Logo: Upload AutoRenta logo
   - Colors: Match brand (primary, secondary)
   - Announcements: Enable for incident communication

4. **Embed in website**:
   ```html
   <!-- Add to footer or dedicated /status page -->
   <iframe src="https://status.autorenta.com"
           width="100%" height="400px" frameborder="0"></iframe>
   ```

#### 5.3 SSL Certificate Monitoring

UptimeRobot automatically monitors SSL certificates:

1. Enable for all HTTPS monitors:
   ```
   Alert when certificate expires in: 30 days
   Re-check: Every 6 hours
   ```

2. Configure dedicated contact for SSL alerts:
   ```
   Email: devops@autorenta.com
   Subject: [SSL] Certificate Expiring Soon
   ```

---

## 📊 Success Metrics & Validation

### Verify Setup is Working

After configuration, validate:

#### 1. Check Monitor Status (within 5 minutes)

```bash
# All monitors should show "Up" within their first interval
# Check dashboard: https://uptimerobot.com/dashboard
```

**Expected Results:**
- ✅ All 6 monitors reporting "Up"
- ✅ Response times < 2 seconds
- ✅ 0 downtime alerts
- ✅ Multi-region checks running

#### 2. Test Alert Channels (Controlled Test)

**Test Process:**

1. **Pause a non-critical monitor**:
   - Select "AutoRenta - Car Listings"
   - Click "Pause" for 10 minutes
   - Note: This does NOT trigger alerts

2. **Create a test alert** (if supported):
   - Some plans allow "Send Test Alert"
   - OR temporarily change URL to invalid endpoint

3. **Verify notifications received**:
   - [ ] Email arrives within 2 minutes
   - [ ] Slack message posted in #production-alerts
   - [ ] PagerDuty incident created (if configured)
   - [ ] SMS sent (if configured for test)

4. **Resume monitor**:
   - Verify "Up" alert/notification sent

**Do NOT test in production hours** - coordinate with team.

#### 3. Validate Multi-Region Monitoring

Check that monitors are testing from all configured regions:

1. Dashboard → Click monitor → **"View Details"**
2. Scroll to **"Uptime Logs"**
3. Verify entries from:
   - ✅ North America (US East)
   - ✅ South America (Brazil)
   - ✅ Europe (Germany)

#### 4. Review Alert Routing

Verify alert contacts are assigned correctly:

| Monitor | Email | Slack | PagerDuty | SMS |
|---------|-------|-------|-----------|-----|
| Main Website | ✅ | ✅ | ✅ Critical | ✅ 2min |
| Health Check API | ✅ | ✅ | ✅ Critical | ❌ |
| Payment Webhook | ✅ | ✅ | ✅ Medium | ❌ |
| Database Health | ✅ | ✅ | ❌ | ❌ |
| Auth Endpoints | ✅ | ✅ | ❌ | ❌ |
| Car Listings | ✅ | ✅ | ❌ | ❌ |

### Target Metrics (from Issue #121)

Track these KPIs weekly:

```
✅ Uptime Target: 99.9% (max 43 minutes downtime/month)
✅ Detection Time: < 2 minutes (via 1-minute checks)
✅ False Positive Rate: < 1% (via 2 consecutive failure requirement)
✅ Alert Delivery: < 30 seconds after detection
✅ Multi-Region Coverage: 3 regions minimum
```

**Reporting:**
- Weekly: Review uptime percentage in dashboard
- Monthly: Export uptime report (Dashboard → Reports → Export CSV)
- Quarterly: Review incident history and MTTR

---

## 🔥 Incident Response Workflow

When an alert is received:

### 1. Alert Received (Within 2 minutes of issue)

**Channels:**
- Email: `devops@autorenta.com`
- Slack: `#production-alerts` channel
- PagerDuty: On-call engineer paged
- SMS: Critical alerts only

### 2. Acknowledge Incident (Within 5 minutes)

**Actions:**
1. **Acknowledge in PagerDuty** (stops escalation)
2. **Respond in Slack**: "Investigating [monitor name] alert"
3. **Check UptimeRobot dashboard**:
   - Which regions are affected?
   - What's the error message?
   - Response time or connection issue?

### 3. Initial Diagnosis (Within 10 minutes)

**Quick Checks:**

```bash
# Check main website
curl -I https://autorenta.pages.dev

# Check health endpoint
curl -X POST https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-health-check \
  -H "Content-Type: application/json" \
  -d '{}'

# Check internal monitoring
curl https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-metrics?action=summary \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY"

# Check Cloudflare status
curl https://www.cloudflarestatus.com/api/v2/status.json

# Check Supabase status
curl https://status.supabase.com/api/v2/status.json
```

### 4. Triage Decision Tree

```
Is it a real outage?
├─ YES → Continue to Step 5
└─ NO (false positive) →
   ├─ Regional issue? → Check if isolated to one region
   ├─ Deployment in progress? → Check maintenance windows
   ├─ Rate limiting? → Review recent traffic spikes
   └─ Monitor misconfiguration? → Adjust monitor settings
```

### 5. Escalation & Response

**Severity Levels:**

| Severity | Response Time | Actions |
|----------|---------------|---------|
| **Critical** (Main site down) | Immediate | Page on-call, create war room, post status update |
| **High** (API/Backend down) | 15 minutes | Investigate, prepare rollback, notify team |
| **Medium** (Degraded performance) | 30 minutes | Monitor, investigate during business hours |
| **Low** (Non-critical service) | 1 hour | Create ticket, fix in next sprint |

**Critical Incident Checklist:**
- [ ] Acknowledge in all channels
- [ ] Create Slack incident thread
- [ ] Post initial status update
- [ ] Check recent deployments (`git log -10`)
- [ ] Review Cloudflare/Supabase dashboards
- [ ] Consider rollback if recent deploy
- [ ] Update status page (if public)
- [ ] Post resolution when fixed
- [ ] Schedule post-mortem

### 6. Resolution & Post-Mortem

**After incident resolved:**

1. **Resolve in PagerDuty**
2. **Post resolution in Slack**:
   ```
   ✅ RESOLVED: Main Website restored
   Duration: 12 minutes
   Root cause: Database connection pool exhausted
   Fix: Restarted Edge Functions
   Follow-up: #123 created for connection pool tuning
   ```

3. **Update UptimeRobot** (if needed):
   - Add incident note in monitor history
   - Adjust monitor if false positive

4. **Schedule post-mortem** (for Critical/High severity):
   - Within 48 hours
   - Document in `docs/postmortems/YYYY-MM-DD-incident-name.md`
   - Action items → GitHub issues

---

## 🔐 Security Considerations

### API Keys and Credentials

UptimeRobot monitors may require authentication:

**Best Practices:**
1. **Use read-only keys** when possible
2. **Rotate keys quarterly**:
   ```bash
   # Update monitor with new auth header
   # Document in: docs/runbooks/secret-rotation.md
   ```

3. **Do NOT expose**:
   - Service role keys in public status pages
   - Database credentials in monitor URLs
   - Internal API endpoints publicly

### Access Control

Limit UptimeRobot dashboard access:

1. **My Settings** → **Account Settings** → **Sub-Users**
2. Add team members with appropriate roles:
   ```
   DevOps Lead: Admin (full access)
   Engineers: Viewer (read-only)
   Support: Viewer (alerts only)
   ```

3. **Enable 2FA**:
   - **My Settings** → **Security** → **Two-Factor Authentication**
   - Require for all admin users

### Webhook Security

If using custom webhooks:

```bash
# Verify webhook signature (if UptimeRobot supports)
# Or use IP whitelist for webhook endpoints
# UptimeRobot IPs: Check https://uptimerobot.com/locations
```

---

## 🛠️ Automation & API Integration

UptimeRobot provides API for automation:

### Get API Key

1. **My Settings** → **Account Settings** → **API Settings**
2. Generate **Main API Key** (full access) or **Monitor-specific keys**
3. Store securely:
   ```bash
   # .env (DO NOT COMMIT)
   UPTIMEROBOT_API_KEY=u123456-abcdef123456
   ```

### Common API Operations

#### Get All Monitors Status

```bash
#!/bin/bash
# tools/check-uptime-status.sh

API_KEY="u123456-abcdef123456"

curl -X POST "https://api.uptimerobot.com/v2/getMonitors" \
  -H "Content-Type: application/json" \
  -d "{
    \"api_key\": \"$API_KEY\",
    \"format\": \"json\",
    \"logs\": 1
  }" | jq '.monitors[] | {name: .friendly_name, status: .status, uptime: .custom_uptime_ratio}'
```

**Output:**
```json
{
  "name": "AutoRenta - Main Website",
  "status": 2,
  "uptime": "99.98"
}
```

**Status Codes:**
- `0`: Paused
- `1`: Not checked yet
- `2`: Up ✅
- `8`: Seems down
- `9`: Down ❌

#### Create Monitor Programmatically

```bash
#!/bin/bash
# tools/create-uptime-monitor.sh

API_KEY="u123456-abcdef123456"
MONITOR_URL="https://autorenta.pages.dev/new-feature"
MONITOR_NAME="AutoRenta - New Feature"

curl -X POST "https://api.uptimerobot.com/v2/newMonitor" \
  -H "Content-Type: application/json" \
  -d "{
    \"api_key\": \"$API_KEY\",
    \"friendly_name\": \"$MONITOR_NAME\",
    \"url\": \"$MONITOR_URL\",
    \"type\": 1,
    \"interval\": 300,
    \"timeout\": 30
  }"
```

#### Get Uptime Report (for SLA tracking)

```bash
#!/bin/bash
# tools/get-monthly-uptime.sh

API_KEY="u123456-abcdef123456"

# Get uptime for last 30 days
CUSTOM_UPTIME_RANGES="1-30-60-90"

curl -X POST "https://api.uptimerobot.com/v2/getMonitors" \
  -H "Content-Type: application/json" \
  -d "{
    \"api_key\": \"$API_KEY\",
    \"custom_uptime_ranges\": \"$CUSTOM_UPTIME_RANGES\"
  }" | jq '.monitors[] | {
    name: .friendly_name,
    uptime_1d: .custom_uptime_ranges[0],
    uptime_30d: .custom_uptime_ranges[1],
    uptime_60d: .custom_uptime_ranges[2]
  }'
```

### Integration with CI/CD

Add to GitHub Actions workflow:

```yaml
# .github/workflows/deploy-production.yml

jobs:
  deploy:
    steps:
      # ... deployment steps ...

      - name: Pause UptimeRobot monitors
        run: |
          # Pause for deployment window
          curl -X POST "https://api.uptimerobot.com/v2/editMonitor" \
            -H "Content-Type: application/json" \
            -d "{
              \"api_key\": \"${{ secrets.UPTIMEROBOT_API_KEY }}\",
              \"id\": \"${{ secrets.UPTIMEROBOT_MAIN_MONITOR_ID }}\",
              \"status\": 0
            }"

      # ... deploy application ...

      - name: Resume monitors after deployment
        if: always()
        run: |
          sleep 30  # Wait for app to start
          curl -X POST "https://api.uptimerobot.com/v2/editMonitor" \
            -H "Content-Type: application/json" \
            -d "{
              \"api_key\": \"${{ secrets.UPTIMEROBOT_API_KEY }}\",
              \"id\": \"${{ secrets.UPTIMEROBOT_MAIN_MONITOR_ID }}\",
              \"status\": 1
            }"
```

---

## 📈 Monitoring Best Practices

### 1. Check Intervals

**Recommendations:**
- **Critical services**: 1 minute (requires Pro plan)
- **Important services**: 5 minutes
- **Nice-to-have**: 10 minutes

**Why?**
- Faster detection = Faster recovery
- 1-minute checks with 2-failure threshold = 2-minute detection ✅

### 2. Multi-Region Coverage

**Required regions for AutoRenta:**
- 🌎 **South America (Brazil)**: Primary user base (Argentina + region)
- 🌍 **North America (US East)**: Cloudflare/Supabase infrastructure
- 🌏 **Europe (Germany)**: Secondary market, EU compliance

**Benefits:**
- Detect regional outages
- Verify CDN/routing
- Comply with data residency

### 3. Keyword Matching

Use keyword checks to validate content:

```
Good keywords:
✅ "AutoRenta" - Brand name in page
✅ "Buscar autos" - Core functionality
✅ "Iniciar sesión" - Auth working

Avoid:
❌ Common words ("the", "a") - Too generic
❌ Dynamic content (user names, dates)
❌ Numbers (inventory counts change)
```

### 4. Alert Threshold Tuning

Prevent alert fatigue:

```
Aggressive (1 failure):
- High false positive rate
- Alert fatigue
❌ NOT recommended

Balanced (2 consecutive failures): ✅
- 2-minute detection (with 1-min checks)
- <1% false positive rate
- Recommended for production

Conservative (3 failures):
- 3-minute detection
- Very low false positives
- Use for non-critical services
```

### 5. Maintenance Window Strategy

Schedule regular maintenance:

```
Weekly Deployment: Wednesday 02:00-03:00 UTC
  → Pause alerts, deploy, resume

Emergency Maintenance: Ad-hoc
  → Create window via API before deploy

Database Maintenance: Monthly, Sunday 04:00-05:00 UTC
  → Pause database health checks
```

---

## 🔍 Troubleshooting

### Common Issues & Solutions

#### Issue: False Positives (Monitor shows down but service is up)

**Symptoms:**
- Alert received but manual check shows service working
- Random "down" spikes in uptime graph
- No actual user impact

**Diagnosis:**
```bash
# Check if issue is regional
curl -I https://autorenta.pages.dev

# Check from different locations
# Use: https://tools.keycdn.com/performance

# Check rate limiting
curl -v https://autorenta.pages.dev 2>&1 | grep -i "rate\|429"
```

**Solutions:**
1. **Increase alert threshold**: 2 → 3 consecutive failures
2. **Extend timeout**: 30s → 60s (for slow responses)
3. **Check IP whitelisting**: UptimeRobot IPs may be blocked
4. **Use HEAD method**: Faster than GET for simple checks

#### Issue: Delayed Alerts (Receiving alerts after issue resolved)

**Symptoms:**
- Alert arrives 10+ minutes after incident
- Service recovered before alert received

**Diagnosis:**
```bash
# Check UptimeRobot status
curl https://stats.uptimerobot.com/api/v2/status.json

# Verify alert contact settings
# Dashboard → My Settings → Alert Contacts → Test
```

**Solutions:**
1. **Check email delivery**: May be in spam folder
2. **Verify PagerDuty integration**: Test integration key
3. **Upgrade to Pro**: Faster alerts on paid plans
4. **Use webhook alerts**: Often faster than email

#### Issue: SSL Certificate Warnings

**Symptoms:**
- Monitor shows "SSL certificate expired" but cert is valid
- SSL warnings for valid certificates

**Diagnosis:**
```bash
# Check certificate expiry
echo | openssl s_client -servername autorenta.pages.dev \
  -connect autorenta.pages.dev:443 2>/dev/null | \
  openssl x509 -noout -dates

# Check certificate chain
curl -I -v https://autorenta.pages.dev 2>&1 | grep -i cert
```

**Solutions:**
1. **Clear SSL cache**: Edit monitor → Save (forces re-check)
2. **Verify certificate chain**: Ensure intermediate certs included
3. **Check Cloudflare settings**: Verify SSL mode (Full vs Flexible)
4. **Disable SSL check**: Last resort for custom configs

#### Issue: High Response Times (but no downtime)

**Symptoms:**
- Response times consistently > 2 seconds
- No downtime but degraded performance

**Diagnosis:**
```bash
# Check internal metrics
curl https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-metrics?action=summary \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY"

# Check Cloudflare analytics
# Dashboard → Analytics → Performance

# Check database performance
# Supabase Dashboard → Database → Query Performance
```

**Solutions:**
1. **Optimize application**: See `docs/runbooks/performance-optimization.md`
2. **Scale infrastructure**: Upgrade Supabase/Cloudflare plan
3. **Enable caching**: Cloudflare Page Rules for static content
4. **Add CDN**: Ensure assets served from edge

#### Issue: Monitor Showing "Seems Down" (Not "Down")

**Symptoms:**
- Monitor status: "Seems down" (8) instead of "Down" (9)
- Intermittent failures

**Meaning:**
- Service responding but not as expected
- HTTP status != 200
- Keyword not found
- Timeout exceeded

**Solutions:**
1. **Check expected status**: May be returning 301/302 redirect
2. **Verify keywords**: Content may have changed
3. **Increase timeout**: Service may be slow but not down
4. **Check for redirects**: Use "Follow redirects" option

---

## 📚 Additional Resources

### Documentation
- **UptimeRobot API**: https://uptimerobot.com/api
- **Status Codes**: https://uptimerobot.com/faq/monitor-status-codes
- **IP Addresses**: https://uptimerobot.com/locations (for whitelisting)

### Internal Documentation
- **Internal Monitoring**: `docs/MONITORING_SYSTEM.md`
- **PagerDuty Setup**: Issue #119
- **Incident Response**: `docs/runbooks/incident-response.md` (TODO)
- **Disaster Recovery**: `docs/disaster-recovery-plan.md`

### Related Issues
- [#119: PagerDuty Integration](https://github.com/ecucondorSA/autorenta/issues/119)
- [#121: External Uptime Monitoring](https://github.com/ecucondorSA/autorenta/issues/121) ← Current
- [#114: Production Readiness Audit](https://github.com/ecucondorSA/autorenta/issues/114)

### External Tools
- **Multi-location testing**: https://tools.keycdn.com/performance
- **SSL checker**: https://www.ssllabs.com/ssltest/
- **DNS checker**: https://www.whatsmydns.net/
- **Status aggregator**: https://www.cloudflarestatus.com

---

## ✅ Checklist: External Monitoring Setup Complete

Use this checklist to verify setup:

### Account Setup
- [ ] UptimeRobot account created
- [ ] Upgraded to Pro plan ($7/month)
- [ ] 2FA enabled on account
- [ ] API key generated and stored securely

### Monitors Created (6 total)
- [ ] Main Website (1-min, multi-region)
- [ ] Health Check API (1-min, multi-region)
- [ ] Payment Webhook (5-min)
- [ ] Database Health (5-min)
- [ ] Auth Endpoints (5-min)
- [ ] Car Listings (5-min)

### Multi-Region Configuration
- [ ] North America (US East) enabled
- [ ] South America (Brazil) enabled
- [ ] Europe (Germany) enabled

### Alert Channels Configured
- [ ] Email (devops@autorenta.com)
- [ ] Slack (#production-alerts)
- [ ] PagerDuty (Critical monitors)
- [ ] SMS (Main website only)

### Advanced Features
- [ ] Maintenance windows scheduled
- [ ] SSL monitoring enabled (30-day warning)
- [ ] Status page created (optional)
- [ ] Alert thresholds tuned (2 consecutive failures)

### Testing & Validation
- [ ] All monitors showing "Up"
- [ ] Test alert sent and received
- [ ] Multi-region checks verified
- [ ] Response times < 2 seconds
- [ ] False positive rate tracked

### Documentation
- [ ] Team trained on alert response
- [ ] Incident response workflow documented
- [ ] API credentials stored in 1Password/Vault
- [ ] Monthly uptime review scheduled

### Integration
- [ ] GitHub Actions secrets configured
- [ ] Deployment workflow updated (pause/resume)
- [ ] Weekly uptime report automated
- [ ] Grafana dashboard linked (optional)

---

## 📞 Support & Escalation

**UptimeRobot Support:**
- Email: support@uptimerobot.com
- Response time: 24 hours (Pro plan)
- Docs: https://uptimerobot.com/faq

**Internal Team:**
- **DevOps Lead**: @devops (Slack)
- **On-Call Engineer**: Check PagerDuty schedule
- **Emergency**: +54 9 11 XXXX-XXXX

**Vendor Status Pages:**
- Cloudflare: https://www.cloudflarestatus.com
- Supabase: https://status.supabase.com
- MercadoPago: https://status.mercadopago.com

---

**Last Updated**: 2025-11-07
**Next Review**: Monthly (or after major incidents)
**Owner**: DevOps Team
