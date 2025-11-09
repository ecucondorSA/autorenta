# Rate Limiting - Implementation Guide

**Status**: Ready for Implementation
**Priority**: P0 CRITICAL (Production Requirement)
**Estimated Time**: 1-2 hours (Cloudflare) or 1-2 days (Supabase)
**Recommended**: Cloudflare Rate Limiting (fastest, easiest)

---

## 📋 Overview

Implement rate limiting to protect the AutoRenta API from:
- **Brute force attacks** (login, password reset)
- **API abuse** (excessive requests)
- **DDoS attacks** (distributed denial of service)
- **Credential stuffing** (automated login attempts)
- **Resource exhaustion** (database overload)

**Goal**: Limit requests per IP address to reasonable thresholds while maintaining good UX for legitimate users.

---

## 🎯 Strategy Selection

### Option A: Cloudflare Rate Limiting (RECOMMENDED)

**Pros**:
- ✅ Quick implementation (1-2 hours)
- ✅ No code changes required
- ✅ Edge-level protection (before reaching servers)
- ✅ Built-in DDoS protection
- ✅ Dashboard and analytics
- ✅ Automatic challenge/block mechanisms

**Cons**:
- ⚠️ Requires Cloudflare Pro plan ($20/month)
- ⚠️ Less granular control vs custom implementation

**Cost**: $20/month (Cloudflare Pro)

### Option B: Supabase Edge Function Middleware

**Pros**:
- ✅ Free (no additional cost)
- ✅ Granular control (per-endpoint, per-user)
- ✅ Custom logic (different limits for auth users)
- ✅ Integration with existing error handling

**Cons**:
- ⚠️ Requires code implementation (1-2 days)
- ⚠️ Higher latency (not at edge)
- ⚠️ Database overhead (storing rate limit data)
- ⚠️ More maintenance

**Cost**: Free

---

## ✅ Recommended: Cloudflare Rate Limiting

**Decision**: Use Cloudflare Rate Limiting for quick production deployment.

---

## 🚀 Implementation: Cloudflare Rate Limiting

### Step 1: Upgrade to Cloudflare Pro ($20/month)

1. Go to Cloudflare Dashboard: https://dash.cloudflare.com/
2. Select your account (ID: `5b448192fe4b369642b68ad8f53a7603`)
3. Select domain (e.g., `autorenta-web.pages.dev` or custom domain)
4. Click **Plan** → **Upgrade to Pro**
5. Confirm billing ($20/month)

### Step 2: Configure Rate Limiting Rules

Navigate to **Security** → **WAF** → **Rate limiting rules**

#### Rule 1: Login Protection (High Priority)

**Purpose**: Prevent brute force login attacks

```yaml
Rule Name: Login Brute Force Protection
Description: Limit login attempts to prevent credential stuffing

Match:
  - Request URL: contains "/auth/v1/token"
  - Method: POST
  - Request Body: contains "grant_type=password"

Rate Limit:
  - Threshold: 5 requests
  - Period: 10 minutes
  - Per: IP address

Action:
  - Block for: 1 hour
  - Response: HTTP 429 Too Many Requests
  - Error message: "Too many login attempts. Please try again in 1 hour."

Priority: 1 (highest)
```

**Testing**:
```bash
# Test login rate limit (should block after 5 attempts)
for i in {1..6}; do
  curl -X POST "https://obxvffplochgeiclibng.supabase.co/auth/v1/token" \
    -H "Content-Type: application/json" \
    -d '{"grant_type":"password","email":"test@test.com","password":"wrong"}' \
    -w "\nStatus: %{http_code}\n"
  sleep 1
done
# 6th request should return 429
```

#### Rule 2: API General Protection (Medium Priority)

**Purpose**: Prevent API abuse and resource exhaustion

```yaml
Rule Name: API General Protection
Description: Limit API requests to prevent abuse

Match:
  - Request URL: contains "/rest/v1/" OR contains "/functions/v1/"
  - Method: GET, POST, PUT, DELETE

Rate Limit:
  - Threshold: 100 requests
  - Period: 1 minute
  - Per: IP address

Action:
  - Challenge (CAPTCHA) for: 10 minutes
  - After 3 challenges: Block for 1 hour

Priority: 2
```

**Reasoning**: 100 req/min = ~1.6 req/sec (reasonable for normal usage)

#### Rule 3: Password Reset Protection (High Priority)

**Purpose**: Prevent password reset spam

```yaml
Rule Name: Password Reset Protection
Description: Limit password reset requests to prevent abuse

Match:
  - Request URL: contains "/auth/v1/recover"
  - Method: POST

Rate Limit:
  - Threshold: 3 requests
  - Period: 1 hour
  - Per: IP address

Action:
  - Block for: 2 hours
  - Response: HTTP 429 Too Many Requests
  - Error message: "Too many password reset requests. Please try again later."

Priority: 1
```

#### Rule 4: Registration Protection (Medium Priority)

**Purpose**: Prevent spam account creation

```yaml
Rule Name: Registration Protection
Description: Limit account creation to prevent spam

Match:
  - Request URL: contains "/auth/v1/signup"
  - Method: POST

Rate Limit:
  - Threshold: 5 requests
  - Period: 1 hour
  - Per: IP address

Action:
  - Challenge (CAPTCHA)
  - After 2 challenges: Block for 24 hours

Priority: 2
```

#### Rule 5: File Upload Protection (Medium Priority)

**Purpose**: Prevent storage abuse

```yaml
Rule Name: File Upload Protection
Description: Limit file uploads to prevent storage abuse

Match:
  - Request URL: contains "/storage/v1/object/"
  - Method: POST
  - Content-Type: contains "multipart/form-data"

Rate Limit:
  - Threshold: 20 uploads
  - Period: 1 hour
  - Per: IP address

Action:
  - Block for: 1 hour
  - Response: HTTP 429 Too Many Requests

Priority: 2
```

### Step 3: Configure Advanced Settings

Navigate to **Security** → **Settings**

**Enable**:
- ✅ **Bot Fight Mode**: Automatically challenge/block known bots
- ✅ **Browser Integrity Check**: Verify browser legitimacy
- ✅ **Security Level**: Medium
- ✅ **Challenge Passage**: 30 minutes

**Disable** (for now):
- ❌ **I'm Under Attack Mode**: Only enable during active DDoS

### Step 4: Set Up Alerts

Navigate to **Notifications** → **Add**

**Alert 1: High Rate Limit Triggers**
```yaml
Name: High Rate Limit Alerts
Event: Rate Limiting Rule Triggered
Threshold: > 100 triggers in 5 minutes
Notification: Email, Slack (if configured)
Recipients: team@autorenta.com
```

**Alert 2: DDoS Detection**
```yaml
Name: DDoS Attack Detection
Event: HTTP DDoS Attack Detected
Threshold: Any detection
Notification: Email, SMS (critical)
Recipients: ops-team@autorenta.com
```

### Step 5: Monitoring & Analytics

Navigate to **Analytics & Logs** → **Security**

**Monitor**:
- Rate limit rule triggers
- Blocked requests by country
- Top blocked IPs
- Challenge solve rate

**Set up dashboard**:
- View blocked requests per hour
- Track false positive rate
- Monitor legitimate user impact

---

## 🧪 Testing Rate Limits

### Test 1: Login Rate Limit

```bash
#!/bin/bash
# Test login rate limit
URL="https://obxvffplochgeiclibng.supabase.co/auth/v1/token"
SUPABASE_KEY="your-anon-key"

echo "Testing login rate limit (should block after 5 attempts)..."
for i in {1..6}; do
  echo "Attempt $i:"
  curl -X POST "$URL" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Content-Type: application/json" \
    -d '{"grant_type":"password","email":"test@example.com","password":"wrongpass"}' \
    -w "\nHTTP Status: %{http_code}\n\n" \
    -s
  sleep 2
done
```

**Expected**:
- Attempts 1-5: 400 Bad Request (invalid credentials)
- Attempt 6: **429 Too Many Requests** ✅

### Test 2: API Rate Limit

```bash
#!/bin/bash
# Test API rate limit
URL="https://obxvffplochgeiclibng.supabase.co/rest/v1/cars"
SUPABASE_KEY="your-anon-key"

echo "Testing API rate limit (100 req/min)..."
for i in {1..105}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "apikey: $SUPABASE_KEY" \
    "$URL?limit=1")

  if [ "$STATUS" = "429" ]; then
    echo "Rate limit triggered at request $i (expected ~101)"
    break
  fi

  if [ $((i % 10)) -eq 0 ]; then
    echo "Progress: $i/105 requests..."
  fi
done
```

**Expected**: Block around request 101

### Test 3: Password Reset Limit

```bash
#!/bin/bash
# Test password reset rate limit
URL="https://obxvffplochgeiclibng.supabase.co/auth/v1/recover"
SUPABASE_KEY="your-anon-key"

echo "Testing password reset rate limit (should block after 3 attempts)..."
for i in {1..4}; do
  echo "Attempt $i:"
  curl -X POST "$URL" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com"}' \
    -w "\nHTTP Status: %{http_code}\n\n" \
    -s
  sleep 1
done
```

**Expected**:
- Attempts 1-3: 200 OK (email sent)
- Attempt 4: **429 Too Many Requests** ✅

---

## 🛡️ Security Considerations

### Bypass Prevention

**IP Rotation**: Attackers can rotate IPs to bypass rate limits
- **Mitigation**: Use Bot Fight Mode + Browser Integrity Check
- **Advanced**: Implement device fingerprinting (requires custom JS)

**Distributed Attacks**: DDoS from many IPs
- **Mitigation**: Cloudflare's automatic DDoS protection
- **Action**: Enable "I'm Under Attack Mode" if needed

### False Positives

**Shared IPs** (corporate networks, VPNs):
- **Risk**: Legitimate users behind same IP hit limit
- **Mitigation**: Use higher thresholds (100 req/min reasonable)
- **Solution**: Implement user-level rate limiting (future)

**Mobile Networks** (carrier-grade NAT):
- **Risk**: Many users share same IP
- **Mitigation**: Cloudflare detects mobile networks, applies lenient rules
- **Monitoring**: Track mobile user complaints

### Legitimate High-Volume Users

**Admin dashboards** (polling, real-time updates):
- **Risk**: Admin users hit API limits
- **Mitigation**: Implement exemption for authenticated admin users (future)
- **Workaround**: Whitelist admin IPs (temporary)

---

## 📊 Monitoring Checklist

### Daily (First Week)

- [ ] Review blocked request count
- [ ] Check for false positive reports
- [ ] Monitor legitimate user impact
- [ ] Verify challenge solve rate (should be >90%)

### Weekly (Ongoing)

- [ ] Analyze top blocked countries/IPs
- [ ] Adjust thresholds if needed
- [ ] Review attack patterns
- [ ] Update rules based on new threats

### Monthly

- [ ] Review rate limit effectiveness
- [ ] Compare cost vs benefit
- [ ] Evaluate need for custom implementation
- [ ] Update documentation

---

## 🔄 Rollback Plan

If rate limiting causes issues:

### Quick Disable (5 minutes)
1. Go to Cloudflare Dashboard → Security → WAF
2. Toggle **OFF** problematic rule
3. Monitor for resolution
4. Investigate false positive cause

### Full Rollback (10 minutes)
1. Disable all rate limiting rules
2. Monitor for attack surge
3. Re-enable with adjusted thresholds
4. Communicate with team

---

## 📈 Success Criteria

- [ ] Rate limiting rules configured in Cloudflare
- [ ] Login attempts limited to 5 per 10 min
- [ ] API requests limited to 100 per min
- [ ] Password resets limited to 3 per hour
- [ ] Alerts configured for high trigger rates
- [ ] Testing confirms limits work as expected
- [ ] No false positive reports from users
- [ ] Monitoring dashboard set up
- [ ] Team trained on disabling rules if needed

---

## 💰 Cost Analysis

### Cloudflare Pro Plan
- **Monthly Cost**: $20
- **Included**:
  - Rate limiting (unlimited rules)
  - DDoS protection (L3/L4/L7)
  - WAF (Web Application Firewall)
  - Advanced analytics
  - Page Rules (20 included)

**ROI**:
- Prevents credential stuffing → Protects user accounts
- Prevents API abuse → Reduces infrastructure costs
- Prevents DDoS → Ensures uptime (99.99%)
- **Value**: $200-500/month in prevented attacks and downtime

**Recommendation**: **IMPLEMENT** - $20/month is minimal cost for protection

---

## 🎯 Next Steps After Implementation

### Phase 1: Basic (Current)
- ✅ Cloudflare rate limiting
- ✅ IP-based limits
- ✅ Edge-level protection

### Phase 2: Enhanced (Month 2)
- User-level rate limiting (authenticated users get higher limits)
- Device fingerprinting (detect rotation attacks)
- Granular endpoint limits (different limits per endpoint)

### Phase 3: Advanced (Month 3+)
- Machine learning-based anomaly detection
- Adaptive rate limiting (auto-adjust based on attack patterns)
- Reputation-based limits (trusted users get higher limits)

---

## 📝 Documentation Updates

After implementation, update:

1. **API Documentation**:
   - Add rate limit headers to API responses
   - Document limit thresholds for developers
   - Provide guidance on handling 429 errors

2. **User Documentation**:
   - Explain rate limits in FAQ
   - Provide contact info if legitimately blocked

3. **Operations Runbook**:
   - How to disable rules in emergency
   - How to whitelist legitimate high-volume users
   - Escalation procedures for DDoS attacks

---

**Document Version**: 1.0
**Last Updated**: 2025-11-09
**Status**: Ready for Implementation
**Estimated Time**: 1-2 hours
**Next Review**: After implementation
