# Rate Limiting - Deployment Checklist

**Date**: 2025-11-09
**Priority**: P0 CRITICAL
**Estimated Time**: 1-2 hours
**Assigned To**: Operations Team

---

## ✅ Pre-Deployment Checklist

- [ ] Review `RATE_LIMITING_IMPLEMENTATION_GUIDE.md`
- [ ] Confirm Cloudflare account access (ID: `5b448192fe4b369642b68ad8f53a7603`)
- [ ] Get approval for $20/month Cloudflare Pro plan
- [ ] Notify team of deployment (Slack/Email)
- [ ] Prepare rollback plan (disable rules if issues)

---

## 🚀 Deployment Steps

### Step 1: Upgrade Cloudflare Plan (10 min)

- [ ] Login to Cloudflare Dashboard: https://dash.cloudflare.com/
- [ ] Select account: `5b448192fe4b369642b68ad8f53a7603`
- [ ] Select domain (or Pages project: `autorenta-web`)
- [ ] Click **Plan** → **Upgrade to Pro**
- [ ] Confirm billing: $20/month
- [ ] Wait for upgrade confirmation (1-2 min)

**Verification**: Plan shows "Pro" badge

---

### Step 2: Configure Rate Limiting Rules (30 min)

Navigate to: **Security** → **WAF** → **Rate limiting rules**

#### Rule 1: Login Brute Force Protection

- [ ] Click **Create rule**
- [ ] Name: `Login Brute Force Protection`
- [ ] Description: `Limit login attempts to prevent credential stuffing`

**Match Criteria**:
```
When incoming requests match:
  - Field: Request URL
  - Operator: contains
  - Value: /auth/v1/token

  AND

  - Field: HTTP Method
  - Operator: equals
  - Value: POST
```

**Rate Limit**:
```
Limit:
  - Threshold: 5 requests
  - Period: 10 minutes
  - Counting method: Count by IP address
```

**Action**:
```
Action: Block
Duration: 1 hour
Response:
  - Status Code: 429
  - Body: {"error": "Too many login attempts. Try again in 1 hour."}
```

- [ ] Click **Deploy**

---

#### Rule 2: API General Protection

- [ ] Click **Create rule**
- [ ] Name: `API General Protection`
- [ ] Description: `Limit API requests to prevent abuse`

**Match Criteria**:
```
When incoming requests match:
  - Field: Request URL
  - Operator: contains
  - Value: /rest/v1/

  OR

  - Field: Request URL
  - Operator: contains
  - Value: /functions/v1/
```

**Rate Limit**:
```
Limit:
  - Threshold: 100 requests
  - Period: 1 minute
  - Counting method: Count by IP address
```

**Action**:
```
Action: Managed Challenge (CAPTCHA)
Duration: 10 minutes
Escalation:
  - After 3 challenges: Block for 1 hour
```

- [ ] Click **Deploy**

---

#### Rule 3: Password Reset Protection

- [ ] Click **Create rule**
- [ ] Name: `Password Reset Protection`
- [ ] Description: `Limit password reset requests`

**Match Criteria**:
```
When incoming requests match:
  - Field: Request URL
  - Operator: contains
  - Value: /auth/v1/recover

  AND

  - Field: HTTP Method
  - Operator: equals
  - Value: POST
```

**Rate Limit**:
```
Limit:
  - Threshold: 3 requests
  - Period: 1 hour
  - Counting method: Count by IP address
```

**Action**:
```
Action: Block
Duration: 2 hours
Response:
  - Status Code: 429
  - Body: {"error": "Too many password reset requests. Try again later."}
```

- [ ] Click **Deploy**

---

#### Rule 4: Registration Protection

- [ ] Click **Create rule**
- [ ] Name: `Registration Protection`
- [ ] Description: `Limit account creation`

**Match Criteria**:
```
When incoming requests match:
  - Field: Request URL
  - Operator: contains
  - Value: /auth/v1/signup

  AND

  - Field: HTTP Method
  - Operator: equals
  - Value: POST
```

**Rate Limit**:
```
Limit:
  - Threshold: 5 requests
  - Period: 1 hour
  - Counting method: Count by IP address
```

**Action**:
```
Action: Managed Challenge (CAPTCHA)
Escalation:
  - After 2 challenges: Block for 24 hours
```

- [ ] Click **Deploy**

---

#### Rule 5: File Upload Protection

- [ ] Click **Create rule**
- [ ] Name: `File Upload Protection`
- [ ] Description: `Limit file uploads`

**Match Criteria**:
```
When incoming requests match:
  - Field: Request URL
  - Operator: contains
  - Value: /storage/v1/object/

  AND

  - Field: HTTP Method
  - Operator: equals
  - Value: POST

  AND

  - Field: Content-Type
  - Operator: contains
  - Value: multipart/form-data
```

**Rate Limit**:
```
Limit:
  - Threshold: 20 requests
  - Period: 1 hour
  - Counting method: Count by IP address
```

**Action**:
```
Action: Block
Duration: 1 hour
Response:
  - Status Code: 429
  - Body: {"error": "Too many file uploads. Try again later."}
```

- [ ] Click **Deploy**

---

### Step 3: Configure Security Settings (10 min)

Navigate to: **Security** → **Settings**

- [ ] **Bot Fight Mode**: Enable
- [ ] **Browser Integrity Check**: Enable
- [ ] **Security Level**: Set to "Medium"
- [ ] **Challenge Passage**: Set to "30 minutes"
- [ ] **I'm Under Attack Mode**: Leave OFF (only enable during active DDoS)

- [ ] Click **Save**

---

### Step 4: Set Up Alerts (10 min)

Navigate to: **Notifications** → **Add**

#### Alert 1: High Rate Limit Triggers

- [ ] Click **Add**
- [ ] Name: `High Rate Limit Alerts`
- [ ] Event Type: `Rate Limiting Rule Triggered`
- [ ] Threshold: `> 100 triggers in 5 minutes`
- [ ] Notification Channel: Email
- [ ] Recipients: `ops-team@autorenta.com`
- [ ] Click **Save**

#### Alert 2: DDoS Detection

- [ ] Click **Add**
- [ ] Name: `DDoS Attack Detection`
- [ ] Event Type: `HTTP DDoS Attack Detected`
- [ ] Threshold: `Any detection`
- [ ] Notification Channel: Email + SMS (if available)
- [ ] Recipients: `ops-team@autorenta.com`
- [ ] Click **Save**

---

## 🧪 Testing (20 min)

### Test 1: Login Rate Limit

```bash
# Run from terminal
SUPABASE_URL="https://obxvffplochgeiclibng.supabase.co"
SUPABASE_KEY="your-anon-key"

for i in {1..6}; do
  echo "Login attempt $i:"
  curl -X POST "$SUPABASE_URL/auth/v1/token" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Content-Type: application/json" \
    -d '{"grant_type":"password","email":"test@test.com","password":"wrong"}' \
    -w "\nStatus: %{http_code}\n\n"
  sleep 2
done
```

- [ ] Verify attempts 1-5 return `400` (bad credentials)
- [ ] Verify attempt 6 returns `429` (rate limited) ✅

---

### Test 2: API Rate Limit

```bash
# Run from terminal
SUPABASE_URL="https://obxvffplochgeiclibng.supabase.co"
SUPABASE_KEY="your-anon-key"

for i in {1..105}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "apikey: $SUPABASE_KEY" \
    "$SUPABASE_URL/rest/v1/cars?limit=1")

  if [ "$STATUS" = "429" ]; then
    echo "Rate limited at request $i"
    break
  fi

  if [ $((i % 10)) -eq 0 ]; then
    echo "Progress: $i/105..."
  fi
done
```

- [ ] Verify rate limit triggers around request 101 ✅

---

### Test 3: Password Reset Limit

```bash
# Run from terminal
SUPABASE_URL="https://obxvffplochgeiclibng.supabase.co"
SUPABASE_KEY="your-anon-key"

for i in {1..4}; do
  echo "Password reset attempt $i:"
  curl -X POST "$SUPABASE_URL/auth/v1/recover" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com"}' \
    -w "\nStatus: %{http_code}\n\n"
  sleep 1
done
```

- [ ] Verify attempts 1-3 return `200` (success)
- [ ] Verify attempt 4 returns `429` (rate limited) ✅

---

## 📊 Monitoring Setup (10 min)

Navigate to: **Analytics & Logs** → **Security**

- [ ] Create dashboard widget: **Blocked Requests Per Hour**
- [ ] Create dashboard widget: **Top Blocked IPs**
- [ ] Create dashboard widget: **Rate Limit Rule Triggers**
- [ ] Pin dashboard to homepage

**Set up weekly review**:
- [ ] Calendar reminder: Review rate limit effectiveness (every Monday)
- [ ] Check for false positives
- [ ] Adjust thresholds if needed

---

## ✅ Post-Deployment Verification (10 min)

- [ ] All 5 rate limiting rules show as "Active"
- [ ] Security settings configured correctly
- [ ] Alerts configured and sending test notifications
- [ ] Testing confirms limits working as expected
- [ ] No false positive reports from team
- [ ] Dashboard showing real-time data

---

## 📝 Documentation Updates

- [ ] Update API documentation with rate limit info
- [ ] Update FAQ with rate limit explanation
- [ ] Document rollback procedure in runbook
- [ ] Share deployment summary with team

---

## 🚨 Rollback Procedure

If rate limiting causes issues:

**Quick Disable (2 min)**:
1. Go to Cloudflare → Security → WAF
2. Toggle **OFF** problematic rule
3. Verify issue resolved
4. Investigate false positive

**Full Rollback (5 min)**:
1. Disable all 5 rate limiting rules
2. Monitor for attack surge
3. Communicate to team
4. Schedule re-deployment with adjusted thresholds

---

## ✅ Success Criteria

- [ ] Cloudflare Pro plan active
- [ ] 5 rate limiting rules deployed and active
- [ ] Security settings configured
- [ ] Alerts configured and tested
- [ ] Testing confirms limits work
- [ ] Monitoring dashboard set up
- [ ] No false positive reports
- [ ] Team notified of completion
- [ ] Documentation updated

---

## 📞 Support Contacts

- **Cloudflare Support**: https://support.cloudflare.com/
- **Emergency Disable**: [Link to Cloudflare dashboard]
- **Team Lead**: [Contact info]
- **On-Call Engineer**: [Contact info]

---

**Estimated Total Time**: 1-2 hours
**Risk Level**: Low (easy rollback)
**Impact**: High (prevents attacks, ensures uptime)
**Priority**: P0 CRITICAL

---

**Deployment Date**: ______________
**Deployed By**: ______________
**Verification By**: ______________
**Sign-off**: ______________
