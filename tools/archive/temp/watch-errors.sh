#!/bin/bash
#
# Real-Time TypeScript Error Monitor
# Watches build output and shows live error statistics
#
# Usage: ./watch-errors.sh
#

PROJECT_DIR="/home/edu/autorenta/apps/web"
TEMP_LOG="/tmp/watch_errors_live.log"
STATS_FILE="/tmp/error_stats.txt"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'
BOLD='\033[1m'

# Track errors
declare -A ERROR_FILES
declare -A ERROR_TYPES
TOTAL_ERRORS=0
LAST_UPDATE=$(date +%s)

# Print colored text
print_color() {
    echo -e "$1$2${NC}"
}

# Clear screen and move to top
clear_screen() {
    clear
    tput cup 0 0
}

# Print dashboard header
print_header() {
    local timestamp=$(date '+%H:%M:%S')
    clear_screen
    print_color "${BOLD}${CYAN}" "╔═══════════════════════════════════════════════════════════════════════╗"
    print_color "${BOLD}${CYAN}" "║           TypeScript Error Monitor - LIVE                             ║"
    print_color "${BOLD}${CYAN}" "╚═══════════════════════════════════════════════════════════════════════╝"
    echo ""
    print_color "${BLUE}" "Project: autorenta/apps/web"
    print_color "${BLUE}" "Time: $timestamp"
    print_color "${BLUE}" "Mode: Watch (Ctrl+C to exit)"
    echo ""
}

# Parse error line
parse_error() {
    local line="$1"
    
    # Extract file path
    if [[ "$line" =~ src/app/[^:]+\.ts ]]; then
        local file=$(echo "$line" | grep -oE "src/app/[^:]+\.ts" | head -1)
        if [ -n "$file" ]; then
            ERROR_FILES["$file"]=$((${ERROR_FILES["$file"]:-0} + 1))
        fi
    fi
    
    # Extract error type
    if [[ "$line" =~ TS[0-9]+ ]]; then
        local error_type=$(echo "$line" | grep -oE "TS[0-9]+" | head -1)
        if [ -n "$error_type" ]; then
            ERROR_TYPES["$error_type"]=$((${ERROR_TYPES["$error_type"]:-0} + 1))
        fi
    fi
}

# Display statistics
display_stats() {
    print_header
    
    # Total errors
    if [ "$TOTAL_ERRORS" -eq 0 ]; then
        print_color "${GREEN}${BOLD}" "✅ Total Errors: $TOTAL_ERRORS"
    elif [ "$TOTAL_ERRORS" -lt 50 ]; then
        print_color "${YELLOW}${BOLD}" "⚠️  Total Errors: $TOTAL_ERRORS"
    else
        print_color "${RED}${BOLD}" "❌ Total Errors: $TOTAL_ERRORS"
    fi
    
    echo ""
    print_color "${BOLD}${CYAN}" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_color "${BOLD}${YELLOW}" "🔥 TOP 10 FILES WITH ERRORS"
    print_color "${BOLD}${CYAN}" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Sort and display top files
    local count=0
    for file in "${!ERROR_FILES[@]}"; do
        echo "${ERROR_FILES[$file]} $file"
    done | sort -rn | head -10 | while read errors file; do
        count=$((count + 1))
        local short_file=$(echo "$file" | sed 's/src\/app\///')
        
        if [ "$errors" -gt 10 ]; then
            print_color "${RED}" "$(printf '%2d. [%3d errors] %s' $count $errors "$short_file")"
        elif [ "$errors" -gt 5 ]; then
            print_color "${YELLOW}" "$(printf '%2d. [%3d errors] %s' $count $errors "$short_file")"
        else
            print_color "${BLUE}" "$(printf '%2d. [%3d errors] %s' $count $errors "$short_file")"
        fi
    done
    
    echo ""
    print_color "${BOLD}${CYAN}" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_color "${BOLD}${YELLOW}" "📋 TOP 10 ERROR TYPES"
    print_color "${BOLD}${CYAN}" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Sort and display top error types
    for error_type in "${!ERROR_TYPES[@]}"; do
        echo "${ERROR_TYPES[$error_type]} $error_type"
    done | sort -rn | head -10 | while read count type; do
        printf "%3d occurrences - %s\n" "$count" "$type"
    done
    
    echo ""
    print_color "${BOLD}${CYAN}" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_color "${MAGENTA}" "Watching for changes... (Press Ctrl+C to stop)"
    print_color "${BOLD}${CYAN}" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Process build output
process_output() {
    local line="$1"
    
    # Check if it's an error line
    if echo "$line" | grep -q "✘.*ERROR"; then
        TOTAL_ERRORS=$((TOTAL_ERRORS + 1))
        parse_error "$line"
        
        # Update display every 5 errors or every 2 seconds
        local now=$(date +%s)
        if [ $((TOTAL_ERRORS % 5)) -eq 0 ] || [ $((now - LAST_UPDATE)) -gt 2 ]; then
            display_stats
            LAST_UPDATE=$now
        fi
    fi
    
    # Check for build completion
    if echo "$line" | grep -q "Application bundle generation"; then
        sleep 1
        display_stats
        
        # Save stats
        {
            echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
            echo "Total Errors: $TOTAL_ERRORS"
            echo ""
            echo "Files with errors:"
            for file in "${!ERROR_FILES[@]}"; do
                echo "${ERROR_FILES[$file]} $file"
            done | sort -rn
        } > "$STATS_FILE"
        
        # Show completion message
        echo ""
        if [ "$TOTAL_ERRORS" -eq 0 ]; then
            print_color "${GREEN}${BOLD}" "🎉 BUILD SUCCESSFUL - No errors!"
        else
            print_color "${YELLOW}" "📊 Build completed with $TOTAL_ERRORS errors"
            print_color "${BLUE}" "💾 Stats saved to: $STATS_FILE"
        fi
        echo ""
        
        # Reset for next build
        TOTAL_ERRORS=0
        ERROR_FILES=()
        ERROR_TYPES=()
    fi
}

# Cleanup function
cleanup() {
    echo ""
    print_color "${YELLOW}" "Stopping error monitor..."
    
    # Kill background npm process if exists
    if [ -n "$NPM_PID" ]; then
        kill $NPM_PID 2>/dev/null
    fi
    
    rm -f "$TEMP_LOG"
    
    print_color "${GREEN}" "✅ Monitor stopped"
    exit 0
}

# Setup trap for clean exit
trap cleanup SIGINT SIGTERM

# Main execution
main() {
    cd "$PROJECT_DIR" || exit 1
    
    # Initial display
    print_header
    print_color "${YELLOW}" "Starting build in watch mode..."
    echo ""
    
    # Start npm build in background and capture PID
    npm run build -- --watch 2>&1 | while IFS= read -r line; do
        echo "$line" >> "$TEMP_LOG"
        process_output "$line"
    done &
    
    NPM_PID=$!
    
    # Wait for the process
    wait $NPM_PID
}

# Check if already running
if pgrep -f "watch-errors.sh" | grep -v $$ > /dev/null; then
    print_color "${RED}" "❌ Error: Another instance is already running"
    print_color "${YELLOW}" "Kill it with: pkill -f watch-errors.sh"
    exit 1
fi

# Run main
main
