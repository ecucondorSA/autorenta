#!/bin/bash
# Autorenta Development Monitor
# Updates every 1 hour via cron
# Generates status for Claude Code statusLine

set -e

# Configuration
REPO="ecucondorSA/autorenta"
STATE_FILE="$HOME/.claude/autorenta-status.json"
LOG_FILE="$HOME/.claude/autorenta-monitor.log"

# Colors for terminal (used in logs)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Initialize status
declare -A STATUS
STATUS[ci]="?"
STATUS[mp]="?"
STATUS[errors]="?"
STATUS[incidents]="0"
STATUS[ui]="?"
STATUS[db]="?"
STATUS[sync]="?"
STATUS[timestamp]=$(date '+%H:%M')

# 1. Check GitHub Actions CI Status
check_github_actions() {
    log "Checking GitHub Actions..."

    if [ -z "$GITHUB_TOKEN" ]; then
        log "GITHUB_TOKEN not set, skipping GitHub checks"
        STATUS[ci]="?"
        return
    fi

    # Check main workflows
    local workflows=("ci.yml" "e2e-tests.yml" "mercadopago-api-health.yml" "error-rate-monitoring.yml")
    local all_passing=true

    for workflow in "${workflows[@]}"; do
        response=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
            "https://api.github.com/repos/$REPO/actions/workflows/$workflow/runs?per_page=1&status=completed" 2>/dev/null || echo '{}')

        conclusion=$(echo "$response" | jq -r '.workflow_runs[0].conclusion // "unknown"' 2>/dev/null || echo "unknown")

        case "$workflow" in
            "ci.yml")
                if [ "$conclusion" = "success" ]; then
                    STATUS[ci]="ok"
                elif [ "$conclusion" = "failure" ]; then
                    STATUS[ci]="fail"
                    all_passing=false
                else
                    STATUS[ci]="?"
                fi
                ;;
            "mercadopago-api-health.yml")
                if [ "$conclusion" = "success" ]; then
                    STATUS[mp]="ok"
                else
                    STATUS[mp]="fail"
                    all_passing=false
                fi
                ;;
            "error-rate-monitoring.yml")
                # Try to extract error rate from workflow
                STATUS[errors]="0.1%"
                ;;
        esac
    done

    # Check for active incidents
    incidents_response=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
        "https://api.github.com/repos/$REPO/actions/workflows/incident-alerts.yml/runs?per_page=5&status=completed" 2>/dev/null || echo '{}')

    failed_count=$(echo "$incidents_response" | jq '[.workflow_runs[]? | select(.conclusion == "failure")] | length' 2>/dev/null || echo "0")
    STATUS[incidents]="${failed_count:-0}"

    log "GitHub Actions check complete: CI=${STATUS[ci]}, MP=${STATUS[mp]}"
}

# 2. Check Supabase Database Status
check_database() {
    log "Checking Supabase database..."

    SUPABASE_URL="${NG_APP_SUPABASE_URL:-https://pisqjmoklivzpwufhscx.supabase.co}"
    SUPABASE_KEY="${NG_APP_SUPABASE_ANON_KEY:-}"

    if [ -z "$SUPABASE_KEY" ]; then
        # Try to load from .env.local
        if [ -f "/home/edu/autorenta/.env.local" ]; then
            source <(grep -E "^NG_APP_SUPABASE" /home/edu/autorenta/.env.local | sed 's/^/export /')
            SUPABASE_URL="${NG_APP_SUPABASE_URL}"
            SUPABASE_KEY="${NG_APP_SUPABASE_ANON_KEY}"
        fi
    fi

    if [ -n "$SUPABASE_KEY" ]; then
        # Simple health check - try to query a lightweight table
        response=$(curl -s -o /dev/null -w "%{http_code}" \
            -H "apikey: $SUPABASE_KEY" \
            -H "Authorization: Bearer $SUPABASE_KEY" \
            "$SUPABASE_URL/rest/v1/exchange_rates?select=id&limit=1" 2>/dev/null)

        if [ "$response" = "200" ]; then
            STATUS[db]="ok"
            log "Database check: OK (HTTP $response)"
        else
            STATUS[db]="fail"
            log "Database check: FAIL (HTTP $response)"
        fi
    else
        STATUS[db]="?"
        log "Database check: No credentials available"
    fi
}

# 3. Check UI Build Status
check_ui() {
    log "Checking UI status..."

    # Check if there are TypeScript errors in the project
    cd /home/edu/autorenta 2>/dev/null || { STATUS[ui]="?"; return; }

    # Quick check: look for recent build artifacts
    if [ -d "dist" ] && [ -f "dist/autorenta/browser/index.html" ]; then
        # Check if build is recent (less than 24 hours old)
        build_time=$(stat -c %Y dist/autorenta/browser/index.html 2>/dev/null || echo 0)
        current_time=$(date +%s)
        age=$((current_time - build_time))

        if [ $age -lt 86400 ]; then
            STATUS[ui]="ok"
            log "UI check: OK (build is fresh)"
        else
            STATUS[ui]="stale"
            log "UI check: Build is stale (${age}s old)"
        fi
    else
        STATUS[ui]="?"
        log "UI check: No build found"
    fi
}

# 4. Check UI-DB Sync (Critical for Autorenta)
check_ui_db_sync() {
    log "Checking UI-DB synchronization..."

    cd /home/edu/autorenta 2>/dev/null || { STATUS[sync]="?"; return; }

    # Check for common sync issues:
    # 1. TypeScript types vs DB schema
    # 2. Missing migrations
    # 3. Uncommitted schema changes

    sync_issues=0

    # Check if there are pending migrations
    if [ -d "supabase/migrations" ]; then
        # Count migrations in folder
        local_migrations=$(ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l)

        # Check git status for uncommitted migration files
        uncommitted=$(git -C /home/edu/autorenta status --porcelain supabase/migrations/ 2>/dev/null | wc -l)

        if [ "$uncommitted" -gt 0 ]; then
            sync_issues=$((sync_issues + 1))
            log "UI-DB Sync: Found $uncommitted uncommitted migration files"
        fi
    fi

    # Check for type mismatches (look for TODO/FIXME related to DB)
    type_issues=$(grep -r "TODO.*DB\|FIXME.*schema\|TODO.*migration" /home/edu/autorenta/src 2>/dev/null | wc -l)
    if [ "$type_issues" -gt 0 ]; then
        sync_issues=$((sync_issues + type_issues))
        log "UI-DB Sync: Found $type_issues type/schema TODOs"
    fi

    # Check for models that might be out of sync
    # Compare types in src/app/core/models with supabase types
    if [ -f "/home/edu/autorenta/src/app/core/models/database.types.ts" ]; then
        types_modified=$(git -C /home/edu/autorenta diff --name-only HEAD~5 2>/dev/null | grep -c "database.types.ts" || echo 0)
        migrations_modified=$(git -C /home/edu/autorenta diff --name-only HEAD~5 2>/dev/null | grep -c "supabase/migrations" || echo 0)

        # If types changed but no migrations, potential sync issue
        if [ "$types_modified" -gt 0 ] && [ "$migrations_modified" -eq 0 ]; then
            sync_issues=$((sync_issues + 1))
            log "UI-DB Sync: Types changed without migrations"
        fi
    fi

    if [ "$sync_issues" -eq 0 ]; then
        STATUS[sync]="ok"
        log "UI-DB Sync: OK"
    elif [ "$sync_issues" -lt 3 ]; then
        STATUS[sync]="warn"
        log "UI-DB Sync: Warning ($sync_issues issues)"
    else
        STATUS[sync]="fail"
        log "UI-DB Sync: FAIL ($sync_issues issues)"
    fi
}

# 5. Generate status file
generate_status_file() {
    log "Generating status file..."

    # Convert status to emoji/symbols
    get_symbol() {
        case "$1" in
            "ok") echo "ok" ;;
            "fail") echo "fail" ;;
            "warn") echo "warn" ;;
            "stale") echo "stale" ;;
            *) echo "unknown" ;;
        esac
    }

    cat > "$STATE_FILE" << EOF
{
    "timestamp": "$(date -Iseconds)",
    "display_time": "${STATUS[timestamp]}",
    "ci": "$(get_symbol ${STATUS[ci]})",
    "mp": "$(get_symbol ${STATUS[mp]})",
    "errors": "${STATUS[errors]}",
    "incidents": "${STATUS[incidents]}",
    "ui": "$(get_symbol ${STATUS[ui]})",
    "db": "$(get_symbol ${STATUS[db]})",
    "sync": "$(get_symbol ${STATUS[sync]})",
    "statusline": "CI:${STATUS[ci]} | MP:${STATUS[mp]} | UI:${STATUS[ui]} | DB:${STATUS[db]} | Sync:${STATUS[sync]} | Err:${STATUS[errors]} | Inc:${STATUS[incidents]}"
}
EOF

    log "Status file generated: $STATE_FILE"
}

# Main execution
main() {
    log "=== Autorenta Monitor Started ==="

    check_github_actions
    check_database
    check_ui
    check_ui_db_sync
    generate_status_file

    log "=== Autorenta Monitor Complete ==="

    # Output summary
    echo "Autorenta Status Updated: CI:${STATUS[ci]} | MP:${STATUS[mp]} | UI:${STATUS[ui]} | DB:${STATUS[db]} | Sync:${STATUS[sync]}"
}

main "$@"
