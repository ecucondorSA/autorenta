# External Uptime Monitoring - Quick Start Guide

**Issue**: [#121 External Uptime Monitoring](https://github.com/ecucondorSA/autorenta/issues/121)
**Priority**: P0 (Production Blocker)
**Time**: ~2 hours for complete setup

---

## 🚀 Quick Setup (30 Minutes)

### Step 1: Create UptimeRobot Account (5 min)

```bash
# 1. Go to: https://uptimerobot.com
# 2. Sign up with: devops@autorenta.com
# 3. Upgrade to Pro: $7/month (required for 1-min intervals)
```

### Step 2: Create 6 Monitors (15 min)

Copy/paste these configurations directly:

#### Monitor 1: Main Website ⭐ CRITICAL

```
Type: HTTP(s)
Name: AutoRenta - Main Website
URL: https://autorenta.pages.dev
Interval: 1 minute
Status: 200
Regions: US East, Brazil, Germany
Alert: 2 consecutive failures
```

#### Monitor 2: Health Check API ⭐ CRITICAL

```
Type: HTTP(s)
Name: AutoRenta - Health Check API
URL: https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-health-check
Method: POST
Body: {}
Interval: 1 minute
Status: 200
Keyword: "total_checks"
Regions: US East, Brazil, Germany
Alert: 2 consecutive failures
```

#### Monitor 3: Payment Webhook ⭐ CRITICAL

```
Type: HTTP(s)
Name: AutoRenta - Payment Webhook
URL: https://[YOUR-WORKER].workers.dev/webhooks/payments
  ⚠️ Get actual URL: wrangler deployments list --name payments_webhook
Method: GET
Interval: 5 minutes
Status: 200
Keyword: "status":"ok"
Regions: US East, Brazil
Alert: 2 consecutive failures
```

#### Monitor 4: Database Health

```
Type: HTTP(s)
Name: AutoRenta - Database Health
URL: https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-metrics?action=summary
Headers: Authorization: Bearer [SERVICE_ROLE_KEY]
Interval: 5 minutes
Status: 200
Keyword: "healthy"
Regions: US East
Alert: 2 consecutive failures
```

#### Monitor 5: Auth Login

```
Type: HTTP(s)
Name: AutoRenta - Auth Login Page
URL: https://autorenta.pages.dev/auth/login
Interval: 5 minutes
Status: 200
Keyword: "login"
Regions: US East, Brazil
Alert: 2 consecutive failures
```

#### Monitor 6: Car Listings

```
Type: HTTP(s)
Name: AutoRenta - Car Listings
URL: https://autorenta.pages.dev/cars
Interval: 5 minutes
Status: 200
Regions: US East, Brazil
Alert: 2 consecutive failures
```

### Step 3: Configure Alerts (10 min)

**My Settings → Alert Contacts → Add:**

```
1. Email: devops@autorenta.com
   - Alerts: Down, Up, SSL Expiry

2. Slack: #production-alerts
   - Connect via Slack integration
   - Alerts: Down, Up, SSL Expiry

3. PagerDuty: [Integration Key from Issue #119]
   - Email format: <key>@autorenta.pagerduty.com
   - Alerts: Down only
   - Apply to: Main Website, Health Check, Payment Webhook

4. SMS: +54 9 11 XXXX-XXXX (on-call engineer)
   - Alerts: Down only
   - Apply to: Main Website ONLY
```

---

## ✅ Validation Checklist (5 min)

After setup, verify:

- [ ] All 6 monitors showing "Up" status
- [ ] Multi-region checks running (check monitor details)
- [ ] Alert contacts configured (4 total)
- [ ] Test alert sent successfully
- [ ] Response times < 2 seconds
- [ ] SSL monitoring enabled (30-day warning)

**Test Alert:**
```bash
# Option 1: Send test notification in UptimeRobot
My Settings → Alert Contacts → [Select contact] → Send Test

# Option 2: Temporarily pause a non-critical monitor
Dashboard → AutoRenta - Car Listings → Pause (10 min)
# Verify alerts received, then resume
```

---

## 📊 Success Metrics (Track Weekly)

```
Target: 99.9% uptime (max 43 min downtime/month)
Detection: < 2 minutes
False Positives: < 1%
Alert Delivery: < 30 seconds
Multi-Region: 3 regions active
```

**Check metrics:**
```
Dashboard → Reports → Export CSV (monthly)
Dashboard → View each monitor → Uptime percentage
```

---

## 🔥 When Alert Received

### Immediate Actions (< 5 min)

1. **Acknowledge in PagerDuty** (stops escalation)
2. **Check UptimeRobot dashboard**: Which region(s)? What error?
3. **Verify with manual check**:
   ```bash
   curl -I https://autorenta.pages.dev
   ```

4. **Check internal monitoring**:
   ```bash
   curl https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-metrics?action=summary \
     -H "Authorization: Bearer $SERVICE_ROLE_KEY"
   ```

5. **Respond in Slack**: "Investigating [service] alert"

### Decision Tree

```
Is service actually down?
├─ YES → Escalate to incident response
│   ├─ Check recent deployments (git log -10)
│   ├─ Check vendor status (Cloudflare, Supabase)
│   ├─ Consider rollback if recent deploy
│   └─ Update team in Slack
│
└─ NO → False positive
    ├─ Regional issue? → Check if isolated
    ├─ Deployment? → Check maintenance windows
    └─ Adjust monitor if needed
```

---

## 📚 Full Documentation

For detailed information, see:

- **Complete Runbook**: [docs/runbooks/external-uptime-monitoring.md](./external-uptime-monitoring.md)
  - Detailed setup instructions
  - Advanced configuration
  - Troubleshooting guide
  - API automation
  - Incident response workflows

- **Configuration Template**: [docs/runbooks/uptimerobot-config-template.json](./uptimerobot-config-template.json)
  - JSON reference for all monitors
  - Alert contact configurations
  - Success metrics definitions

- **Main Monitoring Docs**: [docs/MONITORING_SYSTEM.md](../MONITORING_SYSTEM.md)
  - Internal monitoring system
  - Integration with external monitoring
  - Combined alert flow

---

## 🔧 Common Issues

### "Payment Webhook URL not working"

```bash
# Get current worker URL
wrangler deployments list --name payments_webhook

# Should return something like:
# https://payments-webhook.autorenta.workers.dev

# Update monitor URL to:
# https://[WORKER-URL]/webhooks/payments
```

### "Database Health monitor failing"

```bash
# Verify SERVICE_ROLE_KEY is correct
# In UptimeRobot: Edit Monitor → Headers → Authorization
# Format: Bearer <your-service-role-key>

# Test manually:
curl "https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-metrics?action=summary" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY"
```

### "Too many false positives"

```bash
# Increase alert threshold:
# Edit Monitor → Alert Settings → Alert when down for: 3 failures (instead of 2)

# Or increase timeout:
# Edit Monitor → Monitor Timeout: 60 seconds (instead of 30)
```

### "Alerts not being received"

```bash
# Check email spam folder
# Verify Slack integration: My Settings → Alert Contacts → Test
# Verify PagerDuty key: Issue #119 documentation
# Check UptimeRobot status: https://stats.uptimerobot.com
```

---

## 🎯 Next Steps (After Setup)

1. **Schedule weekly review**: Every Monday, check uptime reports
2. **Set up automation**: Add UptimeRobot API to CI/CD (see full runbook)
3. **Create status page**: Public status page for users (optional)
4. **Monthly report**: Export CSV for SLA compliance tracking
5. **Tune thresholds**: Adjust based on first month of data

---

## 💡 Pro Tips

- **SMS alerts**: Use ONLY for critical services (limited credits)
- **Maintenance windows**: Create before deployments to avoid false alerts
- **Regional checks**: If one region fails but others pass → regional issue (DNS/CDN)
- **Response times**: If consistently > 2s → investigate performance (not just uptime)
- **Keywords**: Use specific text like brand name, not generic words
- **API automation**: Pause monitors during deployments via API

---

## 📞 Support

**UptimeRobot Support:**
- Email: support@uptimerobot.com
- Docs: https://uptimerobot.com/faq

**Internal Team:**
- Slack: #production-alerts
- PagerDuty: Check on-call schedule
- Documentation: This repo → docs/runbooks/

**Related Issues:**
- [#119: PagerDuty Setup](https://github.com/ecucondorSA/autorenta/issues/119)
- [#121: External Monitoring](https://github.com/ecucondorSA/autorenta/issues/121) ← Current
- [#114: Production Readiness](https://github.com/ecucondorSA/autorenta/issues/114)

---

**Last Updated**: 2025-11-07
**Estimated Setup Time**: 30 minutes (basic) | 2 hours (complete with testing)
