#!/bin/bash
# safe-dev.sh - Development server with memory protection
# Kills the dev server if memory gets critical

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Memory thresholds (in percentage)
WARN_THRESHOLD=75
CRITICAL_THRESHOLD=90

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Function to get memory usage percentage
get_mem_usage() {
    free | awk '/Mem:/ {printf "%.0f", $3/$2 * 100}'
}

# Function to show memory status
show_mem_status() {
    local usage=$(get_mem_usage)
    local color=$GREEN
    [[ $usage -ge $WARN_THRESHOLD ]] && color=$YELLOW
    [[ $usage -ge $CRITICAL_THRESHOLD ]] && color=$RED
    echo -e "${color}RAM: ${usage}%${NC}"
}

# Function to check if we should continue
check_memory() {
    local usage=$(get_mem_usage)
    if [[ $usage -ge $CRITICAL_THRESHOLD ]]; then
        echo -e "${RED}⚠️  CRITICAL: Memory at ${usage}%! Stopping dev server...${NC}"
        return 1
    elif [[ $usage -ge $WARN_THRESHOLD ]]; then
        echo -e "${YELLOW}⚠️  WARNING: Memory at ${usage}%${NC}"
    fi
    return 0
}

# Parse arguments
USE_FAST=false
MONITOR=true

while [[ $# -gt 0 ]]; do
    case $1 in
        --fast) USE_FAST=true; shift ;;
        --no-monitor) MONITOR=false; shift ;;
        *) shift ;;
    esac
done

# Set memory limit for Node.js (3GB max)
export NODE_OPTIONS="--max-old-space-size=3072"

echo -e "${GREEN}🚀 AutoRenta Safe Development Server${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
show_mem_status
echo "Node memory limit: 3GB"
echo "earlyoom: $(systemctl is-active earlyoom 2>/dev/null || echo 'not installed')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd "$PROJECT_ROOT"

# Choose dev command
if [[ "$USE_FAST" == "true" ]]; then
    DEV_CMD="pnpm dev:fast"
    echo -e "${YELLOW}Using fast mode (no sourcemaps)${NC}"
else
    DEV_CMD="pnpm dev"
fi

# Start memory monitor in background if enabled
if [[ "$MONITOR" == "true" ]]; then
    (
        while true; do
            sleep 30
            if ! check_memory; then
                # Find and kill ng serve process
                pkill -f "ng serve" 2>/dev/null || true
                notify-send -u critical "AutoRenta Dev" "Server stopped due to high memory usage" 2>/dev/null || true
                exit 1
            fi
        done
    ) &
    MONITOR_PID=$!
    trap "kill $MONITOR_PID 2>/dev/null" EXIT
fi

# Run development server
echo -e "${GREEN}Starting: $DEV_CMD${NC}"
echo ""
$DEV_CMD
