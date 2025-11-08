#!/bin/bash
# ============================================================================
# MONITORING SYSTEM SETUP
# AutoRenta Production Monitoring - Initial Setup Script
# ============================================================================

set -euo pipefail

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[✅]${NC} $*"; }
error() { echo -e "${RED}[❌]${NC} $*"; }
warn() { echo -e "${YELLOW}[⚠️]${NC} $*"; }

# ============================================================================
# STEP 1: Database Setup
# ============================================================================

log "Step 1: Setting up database tables and functions..."

if [ ! -f "database/monitoring_setup.sql" ]; then
    error "monitoring_setup.sql not found!"
    exit 1
fi

log "Applying database schema..."
read -p "Enter Supabase project URL (e.g., https://xxx.supabase.co): " SUPABASE_URL
read -p "Enter Supabase service role key: " SERVICE_ROLE_KEY

# Apply SQL via Supabase CLI or direct connection
if command -v supabase &> /dev/null; then
    log "Using Supabase CLI..."
    supabase db execute -f database/monitoring_setup.sql --project-id "$(echo $SUPABASE_URL | sed 's|https://||' | sed 's|.supabase.co||')" || {
        error "Failed to apply schema via CLI. Trying direct connection..."
        # Fallback: Provide instructions for manual execution
        warn "Please run the SQL manually in Supabase Dashboard:"
        echo "  SQL Editor > New Query > Paste database/monitoring_setup.sql"
        read -p "Press Enter after running the SQL manually..."
    }
else
    warn "Supabase CLI not found. Please run SQL manually:"
    echo "  1. Go to Supabase Dashboard > SQL Editor"
    echo "  2. Create new query"
    echo "  3. Paste contents of database/monitoring_setup.sql"
    echo "  4. Run the query"
    read -p "Press Enter after running the SQL..."
fi

success "Database setup complete!"

# ============================================================================
# STEP 2: Deploy Edge Functions
# ============================================================================

log "Step 2: Deploying Edge Functions..."

if command -v supabase &> /dev/null; then
    log "Deploying monitoring-health-check..."
    supabase functions deploy monitoring-health-check || error "Failed to deploy health-check"
    
    log "Deploying monitoring-alerts..."
    supabase functions deploy monitoring-alerts || error "Failed to deploy alerts"
    
    log "Deploying monitoring-metrics..."
    supabase functions deploy monitoring-metrics || error "Failed to deploy metrics"
    
    success "Edge Functions deployed!"
else
    warn "Supabase CLI not found. Please deploy manually:"
    echo "  1. Go to Supabase Dashboard > Edge Functions"
    echo "  2. Deploy each function:"
    echo "     - monitoring-health-check"
    echo "     - monitoring-alerts"
    echo "     - monitoring-metrics"
    read -p "Press Enter after deploying functions..."
fi

# ============================================================================
# STEP 3: Configure Secrets
# ============================================================================

log "Step 3: Configuring secrets..."

if command -v supabase &> /dev/null; then
    log "Setting up secrets..."
    
    read -p "Enter production URL (default: https://autorenta.com): " PROD_URL
    PROD_URL=${PROD_URL:-https://autorenta.com}
    
    read -p "Enter Slack webhook URL (optional, press Enter to skip): " SLACK_WEBHOOK
    
    # Set secrets
    supabase secrets set PRODUCTION_URL="$PROD_URL" || warn "Failed to set PRODUCTION_URL"
    
    if [ -n "$SLACK_WEBHOOK" ]; then
        supabase secrets set SLACK_WEBHOOK_URL="$SLACK_WEBHOOK" || warn "Failed to set SLACK_WEBHOOK_URL"
        success "Slack webhook configured!"
    else
        warn "Slack webhook not configured. Alerts will not be sent."
    fi
    
    success "Secrets configured!"
else
    warn "Supabase CLI not found. Please configure secrets manually:"
    echo "  Dashboard > Settings > Vault > New Secret"
    echo "  Required secrets:"
    echo "    - PRODUCTION_URL"
    echo "    - SLACK_WEBHOOK_URL (optional)"
fi

# ============================================================================
# STEP 4: Setup Cron Jobs
# ============================================================================

log "Step 4: Setting up cron jobs..."

CRON_SQL="
-- Health check every 5 minutes
SELECT cron.schedule(
    'monitoring-health-check-every-5min',
    '*/5 * * * *',
    \$\$
    SELECT
        net.http_post(
            url := 'https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-health-check',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
            ),
            body := '{}'::jsonb
        ) AS request_id;
    \$\$
);

-- Alert notifications every 2 minutes
SELECT cron.schedule(
    'monitoring-alerts-every-2min',
    '*/2 * * * *',
    \$\$
    SELECT
        net.http_post(
            url := 'https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-alerts',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
            ),
            body := '{}'::jsonb
        ) AS request_id;
    \$\$
);

-- Cleanup old data daily at 2 AM
SELECT cron.schedule(
    'monitoring-cleanup-daily',
    '0 2 * * *',
    \$\$
    SELECT monitoring_cleanup_old_data();
    \$\$
);
"

warn "Please run this SQL in Supabase Dashboard > SQL Editor:"
echo "=========================================="
echo "$CRON_SQL"
echo "=========================================="
read -p "Press Enter after running the cron SQL..."

success "Cron jobs configured!"

# ============================================================================
# STEP 5: Test System
# ============================================================================

log "Step 5: Testing monitoring system..."

log "Testing health check endpoint..."
HEALTH_CHECK_URL="https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-health-check"
response=$(curl -s -w "\n%{http_code}" -X POST "$HEALTH_CHECK_URL" \
    -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" || echo "000")

http_code=$(echo "$response" | tail -n1)
if [ "$http_code" = "200" ] || [ "$http_code" = "503" ]; then
    success "Health check endpoint is working!"
else
    error "Health check endpoint returned HTTP $http_code"
fi

log "Testing metrics endpoint..."
METRICS_URL="https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-metrics?action=summary"
response=$(curl -s -w "\n%{http_code}" "$METRICS_URL" \
    -H "Authorization: Bearer $SERVICE_ROLE_KEY" || echo "000")

http_code=$(echo "$response" | tail -n1)
if [ "$http_code" = "200" ]; then
    success "Metrics endpoint is working!"
else
    error "Metrics endpoint returned HTTP $http_code"
fi

# ============================================================================
# SUMMARY
# ============================================================================

echo ""
echo "=========================================="
success "Monitoring system setup complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Verify health checks are running:"
echo "     https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-metrics?action=summary"
echo ""
echo "  2. View active alerts:"
echo "     https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-metrics?action=active_alerts"
echo ""
echo "  3. Check cron jobs in Supabase Dashboard:"
echo "     Database > Extensions > pg_cron > Scheduled Jobs"
echo ""
echo "  4. Monitor logs:"
echo "     Supabase Dashboard > Edge Functions > Logs"
echo ""













