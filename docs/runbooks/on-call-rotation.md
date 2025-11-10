# On-Call Rotation and Escalation Procedures

**Status**: ✅ Active
**Owner**: Platform Engineering
**Last Updated**: 2025-11-07
**Related Issue**: #119

---

## Table of Contents

1. [Overview](#overview)
2. [On-Call Schedule](#on-call-schedule)
3. [Escalation Policy](#escalation-policy)
4. [Alert Response Procedures](#alert-response-procedures)
5. [Alert Types and Runbooks](#alert-types-and-runbooks)
6. [SLA Targets](#sla-targets)
7. [Handoff Procedures](#handoff-procedures)

---

## Overview

AutoRenta's on-call rotation ensures 24/7 coverage for production incidents. This document defines responsibilities, escalation procedures, and response protocols for on-call engineers.

### Responsibilities

**On-Call Engineer**:
- Respond to PagerDuty/Opsgenie alerts within SLA (see below)
- Triage and resolve P0/P1 incidents
- Escalate to backup if unable to resolve within 30 minutes
- Document all incidents in incident log
- Update stakeholders via Slack #incidents channel

**Backup Engineer**:
- Available for escalation (15 minutes after initial page)
- Provide support and second opinion
- Take over if primary is unavailable

**Manager (Escalation Point)**:
- Final escalation point (30 minutes after backup)
- Authorize emergency procedures
- Coordinate with external vendors if needed

---

## On-Call Schedule

### Rotation Schedule

```
Week 1: Engineer A (Primary), Engineer B (Backup)
Week 2: Engineer B (Primary), Engineer C (Backup)
Week 3: Engineer C (Primary), Engineer A (Backup)
```

**Rotation Changes**: Every Monday at 9:00 AM ART

### Availability Requirements

- **Primary**: Must be available 24/7 during rotation week
- **Backup**: Must be reachable within 15 minutes
- **Manager**: Must be reachable within 30 minutes

### PTO and Coverage

- Request coverage at least 1 week in advance
- Update PagerDuty/Opsgenie schedule immediately
- Notify team in #on-call Slack channel

---

## Escalation Policy

### Level 1: Primary On-Call Engineer
- **Page**: Immediately via PagerDuty/Opsgenie
- **Expected Response**: 5 minutes (acknowledge)
- **Expected Resolution Start**: 15 minutes

### Level 2: Backup Engineer
- **When**: No acknowledgment after 15 minutes OR Primary requests help
- **Page**: PagerDuty/Opsgenie auto-escalates
- **Expected Response**: 5 minutes

### Level 3: Engineering Manager
- **When**: No resolution after 30 minutes OR multi-service outage
- **Page**: PagerDuty/Opsgenie auto-escalates
- **Expected Response**: 10 minutes
- **Authority**: Can authorize emergency procedures, vendor contact

### Level 4: CTO/VP Engineering
- **When**: Major outage (>1 hour) OR data breach suspected
- **Contact**: Manual phone call
- **Response**: 30 minutes

---

## Alert Response Procedures

### Step 1: Acknowledge (Within 5 minutes)

1. **Acknowledge alert** in PagerDuty/Opsgenie
2. **Post in #incidents Slack**: "Alert acknowledged: [ALERT_TITLE]"
3. **Check dashboard**: https://autorentar.com/admin/monitoring

```bash
# Quick health check
curl https://autorentar.com/health
```

### Step 2: Triage (Within 15 minutes)

1. **Assess severity**:
   - P0 (Critical): System down, payments failing, data breach
   - P1 (High): Degraded performance, partial outage
   - P2 (Medium): Non-critical errors, warnings

2. **Identify scope**:
   - Check error rates in Sentry
   - Review CloudflarePages logs
   - Check Supabase dashboard

3. **Determine impact**:
   - Users affected (all, subset, specific region)
   - Revenue impact
   - Data integrity concerns

### Step 3: Communicate (Immediately after triage)

**For P0 Alerts**:
```markdown
# Incident Update - [INCIDENT_ID]

**Status**: Investigating
**Started**: [TIME]
**Severity**: P0 - Critical
**Impact**: [DESCRIPTION]
**ETA**: Investigating (update in 15min)
**On-Call**: @engineer-name
```

Post in:
- #incidents (Slack)
- Update status page (if public-facing)

### Step 4: Investigate & Mitigate

**Use runbooks** (see below) for specific alert types.

**Common investigation tools**:
```bash
# Check Cloudflare Pages logs
wrangler pages deployment tail autorenta-web

# Check Supabase logs
# Dashboard > Edge Functions > [function] > Logs

# Check Sentry errors
# https://sentry.io/organizations/autorenta/issues/

# Database health
psql $DATABASE_URL -c "SELECT COUNT(*) FROM monitoring_health_checks WHERE status = 'down' AND created_at > NOW() - INTERVAL '10 minutes';"
```

### Step 5: Resolve & Document

1. **Verify resolution**:
   - Run health checks
   - Check error rates back to baseline
   - Confirm with affected users (if any)

2. **Resolve alert** in PagerDuty/Opsgenie

3. **Document in incident log**:
```markdown
## Incident: [TITLE]

**Date**: 2025-11-07 14:30 ART
**Duration**: 45 minutes
**Severity**: P0
**MTTD**: 3 minutes ✅
**MTTR**: 45 minutes ❌ (SLA: 30 min)

### Timeline
- 14:30 - Alert fired (payment failures detected)
- 14:33 - Acknowledged by Engineer A
- 14:45 - Root cause identified (MercadoPago API timeout)
- 15:15 - Mitigated (increased timeout, added retry logic)

### Root Cause
MercadoPago API experiencing elevated response times (>5s). Our timeout was set to 3s, causing failures.

### Resolution
- Updated timeout to 10s in supabase/functions/mercadopago-create-preference
- Added exponential backoff retry (3 attempts)
- Deployed at 15:10 ART

### Follow-up Actions
- [ ] Review all external API timeouts (#ticket-123)
- [ ] Add API response time monitoring (#ticket-124)
- [ ] Contact MercadoPago support for SLA clarification (#ticket-125)
```

4. **Post-incident review** (for P0 incidents):
   - Schedule within 48 hours
   - Invite on-call, backup, affected teams
   - Create action items

---

## Alert Types and Runbooks

### P0: Payment Failure

**Alert**: `payment_failure_critical`
**Runbook**: [docs/runbooks/payment-failure.md](./payment-failure.md)

**Quick Actions**:
1. Check MercadoPago status: https://status.mercadopago.com
2. Review recent deployments (last 2 hours)
3. Check Supabase Edge Function logs: `mercadopago-webhook`, `create-preference`
4. Verify database wallet balances consistency

### P0: Database Connection Failure

**Alert**: `database_connection_failure`
**Runbook**: [docs/runbooks/database-connection-failure.md](./database-connection-failure.md)

**Quick Actions**:
1. Check Supabase status: https://status.supabase.com
2. Verify connection pool limits
3. Check recent database migrations
4. Review slow query log

### P0: API Response Degradation

**Alert**: `api_response_degradation`
**Runbook**: [docs/runbooks/api-degradation.md](./api-degradation.md)

**Quick Actions**:
1. Check Cloudflare analytics for traffic spike
2. Review Edge Function cold starts
3. Check database query performance
4. Verify external API dependencies (MercadoPago, Mapbox)

### P0: Authentication Failure Spike

**Alert**: `auth_failure_spike`
**Runbook**: [docs/runbooks/auth-spike.md](./auth-spike.md)

**Quick Actions**:
1. Check for brute force attack patterns
2. Review recent authentication changes
3. Verify Supabase Auth service status
4. Consider rate limiting escalation

### P1: Error Rate Spike

**Alert**: `error_rate_spike`
**Runbook**: [docs/runbooks/error-spike.md](./error-spike.md)

**Quick Actions**:
1. Check Sentry for new error patterns
2. Review recent deployments
3. Verify third-party service status
4. Check frontend error logs

---

## SLA Targets

### Mean Time To Detect (MTTD)

**Target**: < 5 minutes

**Measurement**:
- Time from issue occurrence to alert creation
- Tracked in `monitoring_sla_metrics.detection_time_ms`

**How to achieve**:
- Health checks run every 5 minutes
- Real-time error tracking via Sentry
- Custom alert rules for critical metrics

### Mean Time To Respond (MTTR)

**Target**: < 30 minutes

**Measurement**:
- Time from alert notification to resolution
- Tracked in `monitoring_sla_metrics.resolution_time_ms`

**How to achieve**:
- Clear escalation policy
- Well-documented runbooks
- Pre-built mitigation scripts
- Regular incident drills

### False Positive Rate

**Target**: < 5%

**Measurement**:
- Percentage of alerts marked as false positives
- Tracked in `monitoring_sla_metrics.is_false_positive`

**How to reduce**:
- Tune alert thresholds based on historical data
- Use spike detection vs. absolute thresholds
- Implement alert cooldown periods
- Regular alert rule review

---

## Handoff Procedures

### Weekly Handoff (Monday 9:00 AM ART)

1. **Outgoing engineer** prepares:
```markdown
## On-Call Handoff - Week of [DATE]

### Open Incidents
- [List any ongoing incidents]

### Known Issues
- [List any known issues to watch]

### Recent Changes
- [Deployments in last week]
- [Configuration changes]

### Action Items
- [Any follow-up needed]

### Notes
- [Anything unusual to be aware of]
```

2. **Handoff meeting** (15 minutes):
   - Review open incidents
   - Discuss known issues
   - Transfer PagerDuty/Opsgenie ownership
   - Answer questions

3. **Incoming engineer** confirms:
   - PagerDuty/Opsgenie alerts working
   - Access to all systems
   - Reviewed recent incidents

---

## Emergency Contacts

### Internal

| Role | Primary | Backup | Phone |
|------|---------|--------|-------|
| **On-Call Engineer** | [Name] | [Name] | [Phone] |
| **Engineering Manager** | [Name] | - | [Phone] |
| **CTO** | [Name] | - | [Phone] |

### External Vendors

| Service | Contact | Emergency Phone | SLA |
|---------|---------|----------------|-----|
| **Supabase** | support@supabase.com | - | 4 hours (Pro plan) |
| **Cloudflare** | Enterprise support | +1-888-99-FLARE | 1 hour (Enterprise) |
| **MercadoPago** | developers@mercadopago.com | - | Best effort |
| **Sentry** | support@sentry.io | - | Best effort |

---

## Tools and Access

### Required Access

- [ ] PagerDuty/Opsgenie mobile app installed
- [ ] Cloudflare Pages access (autorenta-web)
- [ ] Supabase dashboard access (obxvffplochgeiclibng)
- [ ] Sentry access (autorenta organization)
- [ ] GitHub access (ecucondorSA/autorenta)
- [ ] Slack #incidents, #on-call channels
- [ ] AWS/infrastructure access (if applicable)

### Quick Links

- **Monitoring Dashboard**: https://autorentar.com/admin/monitoring
- **Sentry**: https://sentry.io/organizations/autorenta/
- **Cloudflare**: https://dash.cloudflare.com/
- **Supabase**: https://supabase.com/dashboard/project/obxvffplochgeiclibng
- **Status Pages**:
  - Supabase: https://status.supabase.com
  - Cloudflare: https://www.cloudflarestatus.com
  - MercadoPago: https://status.mercadopago.com

---

## Training and Drills

### Onboarding Checklist

New on-call engineers must:
- [ ] Shadow on-call for 1 week
- [ ] Complete all runbook walkthroughs
- [ ] Participate in incident drill
- [ ] Verify access to all systems
- [ ] Review last 5 incidents

### Quarterly Incident Drills

**Schedule**: First Monday of each quarter

**Scenarios**:
1. Payment system failure
2. Database connection issues
3. DDoS attack simulation
4. Multi-region outage

**Goals**:
- Practice escalation procedures
- Verify runbooks are current
- Test communication protocols
- Measure MTTR

---

## Metrics and Reporting

### Weekly On-Call Report

Track and report:
- Total alerts received
- Alerts by severity (P0, P1, P2)
- Average MTTD
- Average MTTR
- SLA compliance rate
- False positive rate
- Incidents requiring escalation

### Monthly Review

Review:
- SLA trends
- Common alert types
- Runbook improvements needed
- Training gaps identified

---

**Document Owner**: Platform Engineering
**Review Frequency**: Quarterly
**Next Review**: 2026-02-07
