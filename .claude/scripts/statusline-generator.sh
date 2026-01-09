#!/bin/bash
# StatusLine Generator for Claude Code
# Reads status from autorenta-status.json and outputs formatted statusLine

STATE_FILE="$HOME/.claude/autorenta-status.json"

# Emoji mappings
get_emoji() {
    case "$1" in
        "ok") echo "\u2705" ;;      # Green checkmark
        "fail") echo "\u274C" ;;    # Red X
        "warn") echo "\u26A0\uFE0F" ;; # Warning
        "stale") echo "\u23F0" ;;   # Clock (stale)
        "unknown"|"?") echo "\u2753" ;; # Question mark
        *) echo "\u2753" ;;
    esac
}

# Check if status file exists
if [ ! -f "$STATE_FILE" ]; then
    echo "Autorenta | No status data"
    exit 0
fi

# Read status
ci=$(jq -r '.ci // "unknown"' "$STATE_FILE")
mp=$(jq -r '.mp // "unknown"' "$STATE_FILE")
ui=$(jq -r '.ui // "unknown"' "$STATE_FILE")
db=$(jq -r '.db // "unknown"' "$STATE_FILE")
sync=$(jq -r '.sync // "unknown"' "$STATE_FILE")
errors=$(jq -r '.errors // "?"' "$STATE_FILE")
incidents=$(jq -r '.incidents // "0"' "$STATE_FILE")
display_time=$(jq -r '.display_time // ""' "$STATE_FILE")

# Build statusline with symbols
ci_sym=$( [ "$ci" = "ok" ] && echo "+" || echo "-" )
mp_sym=$( [ "$mp" = "ok" ] && echo "+" || echo "-" )
ui_sym=$( [ "$ui" = "ok" ] && echo "+" || echo "-" )
db_sym=$( [ "$db" = "ok" ] && echo "+" || echo "-" )
sync_sym=$( [ "$sync" = "ok" ] && echo "+" || ( [ "$sync" = "warn" ] && echo "~" || echo "-" ) )

# Determine overall status
overall="OK"
if [ "$ci" = "fail" ] || [ "$mp" = "fail" ] || [ "$db" = "fail" ]; then
    overall="ALERT"
elif [ "$sync" = "warn" ] || [ "$ui" = "stale" ]; then
    overall="WARN"
fi

# Output based on overall status
case "$overall" in
    "OK")
        echo "Autorenta [CI$ci_sym MP$mp_sym UI$ui_sym DB$db_sym Sync$sync_sym] Err:$errors Inc:$incidents"
        ;;
    "WARN")
        echo "Autorenta [CI$ci_sym MP$mp_sym UI$ui_sym DB$db_sym Sync$sync_sym] Err:$errors Inc:$incidents"
        ;;
    "ALERT")
        echo "ALERT Autorenta [CI$ci_sym MP$mp_sym UI$ui_sym DB$db_sym Sync$sync_sym] Err:$errors Inc:$incidents"
        ;;
esac
