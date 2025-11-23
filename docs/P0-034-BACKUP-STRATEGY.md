# P0-034: Database Backup Strategy

**PROBLEMA**: No hay backups automáticos de database
**CRITICIDAD**: P0 (Critical)
**FECHA**: 2025-11-24

## Backup Strategy Overview

### Automated Daily Backups

**Platform**: Supabase Database Backups
**Schedule**: Daily at 2:00 AM UTC
**Retention**: 30 days
**Storage**: Supabase internal backup storage + S3 backup

### Backup Configuration

#### 1. Supabase Native Backups

Supabase provides automated backups for all projects:

- **Daily backups**: Automatic
- **Point-in-time recovery (PITR)**: Available for Pro/Team plans
- **Retention**: 7-30 days depending on plan
- **Location**: Supabase managed storage

**How to access**:
1. Go to Supabase Dashboard → Project Settings → Database
2. Navigate to "Backups" tab
3. View available backups and restore points

#### 2. Additional S3 Backups (Recommended)

For extra redundancy, implement S3 backups using `pg_dump`:

```bash
#!/bin/bash
# backup-db-to-s3.sh
# Run daily via cron: 0 2 * * * /path/to/backup-db-to-s3.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="autorenta_backup_${DATE}.sql"
S3_BUCKET="s3://autorenta-backups"

# Export database URL from environment
export PGPASSWORD="${SUPABASE_DB_PASSWORD}"

# Create backup
pg_dump \
  -h "${SUPABASE_DB_HOST}" \
  -U postgres \
  -d postgres \
  --no-owner \
  --no-privileges \
  -F c \
  -f "/tmp/${BACKUP_FILE}"

# Compress backup
gzip "/tmp/${BACKUP_FILE}"

# Upload to S3
aws s3 cp "/tmp/${BACKUP_FILE}.gz" "${S3_BUCKET}/${BACKUP_FILE}.gz"

# Clean up local file
rm "/tmp/${BACKUP_FILE}.gz"

# Delete backups older than 30 days from S3
aws s3 ls "${S3_BUCKET}/" | \
  awk '{print $4}' | \
  while read -r file; do
    if [[ $(date -d "30 days ago" +%s) -gt $(date -d "$(echo $file | cut -d_ -f3 | cut -d. -f1)" +%s) ]]; then
      aws s3 rm "${S3_BUCKET}/${file}"
    fi
  done
```

#### 3. Critical Tables Incremental Backups

For critical tables that change frequently, use incremental backups:

**Critical Tables**:
- `wallet_ledger` (financial transactions)
- `bookings` (booking records)
- `wallet_transactions` (payment records)
- `accounting_entries` (accounting records)

**Schedule**: Every 6 hours

```sql
-- Create incremental backup of wallet_ledger
COPY (
  SELECT * FROM wallet_ledger
  WHERE ts >= NOW() - INTERVAL '6 hours'
) TO '/tmp/wallet_ledger_incremental.csv' WITH CSV HEADER;
```

### Backup Testing Procedures

**Frequency**: Monthly
**Owner**: DevOps Team / Database Admin

#### Test Restore Procedure

1. **Create test database**:
```bash
# Create isolated test database
psql -h localhost -U postgres -c "CREATE DATABASE autorenta_restore_test;"
```

2. **Restore latest backup**:
```bash
# Download from S3
aws s3 cp s3://autorenta-backups/latest_backup.sql.gz /tmp/

# Restore
gunzip /tmp/latest_backup.sql.gz
pg_restore \
  -h localhost \
  -U postgres \
  -d autorenta_restore_test \
  /tmp/latest_backup.sql
```

3. **Verify data integrity**:
```sql
-- Check critical tables
SELECT COUNT(*) FROM wallet_ledger;
SELECT COUNT(*) FROM bookings;
SELECT COUNT(*) FROM profiles;

-- Verify latest records
SELECT MAX(created_at) FROM bookings;
SELECT MAX(ts) FROM wallet_ledger;
```

4. **Document results**:
- Time to restore: _____
- Data integrity: ✅/❌
- Issues found: _____
- Notes: _____

5. **Clean up**:
```bash
psql -h localhost -U postgres -c "DROP DATABASE autorenta_restore_test;"
```

### Disaster Recovery Plan

#### Recovery Time Objective (RTO)
**Target**: 4 hours maximum
**Definition**: Maximum acceptable downtime

#### Recovery Point Objective (RPO)
**Target**: 1 hour maximum
**Definition**: Maximum acceptable data loss

#### DR Procedure

**Step 1: Assess damage** (15 minutes)
- Identify affected tables/data
- Determine if partial or full restore needed
- Notify stakeholders

**Step 2: Stop writes** (5 minutes)
- Put application in maintenance mode
- Disable cron jobs
- Block user access if needed

**Step 3: Restore database** (1-2 hours)
- Download latest backup from S3
- Restore to new database instance
- Verify data integrity

**Step 4: Validate** (30 minutes)
- Run integrity checks
- Test critical user flows
- Verify financial data accuracy

**Step 5: Switch over** (15 minutes)
- Update connection strings
- Remove maintenance mode
- Monitor for issues

**Step 6: Post-mortem** (1 week)
- Document incident
- Identify root cause
- Implement preventive measures

### Backup Monitoring

**Alerts configured for**:
- Backup failure (Slack + Email)
- Backup size anomaly (>20% change)
- Missing daily backup
- S3 upload failure

**Dashboard**: Supabase Dashboard → Database → Backups

### Compliance & Security

**Encryption**:
- Backups encrypted at rest (AES-256)
- Backups encrypted in transit (TLS 1.3)

**Access Control**:
- Only DevOps team has S3 bucket access
- MFA required for Supabase dashboard
- Audit logs enabled for all backup access

**Data Retention**:
- Daily backups: 30 days
- Monthly backups: 1 year
- Annual backups: 7 years (compliance requirement)

### Backup Checklist

**Daily** (Automated):
- [ ] Daily Supabase backup created
- [ ] S3 backup uploaded successfully
- [ ] Old backups pruned (>30 days)

**Weekly** (Manual):
- [ ] Verify backup size is reasonable
- [ ] Check S3 bucket storage usage
- [ ] Review backup logs for errors

**Monthly** (Manual):
- [ ] Test restore procedure
- [ ] Verify critical table data
- [ ] Document test results
- [ ] Update DR plan if needed

### Emergency Contacts

**Primary**: DevOps Team - devops@autorentar.com
**Secondary**: Database Admin - db-admin@autorentar.com
**Supabase Support**: https://supabase.com/dashboard/support

### Related Documentation

- [Supabase Backup Documentation](https://supabase.com/docs/guides/platform/backups)
- [PostgreSQL pg_dump Guide](https://www.postgresql.org/docs/current/app-pgdump.html)
- [AWS S3 Backup Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/backup-for-s3.html)

---

**Last Updated**: 2025-11-24
**Reviewed By**: Claude Code
**Next Review**: 2025-12-24
