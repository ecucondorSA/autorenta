#!/bin/bash
#
# AutoRenta Debug Script for Android USB Debugging
# ================================================
#
# This script helps filter and view logs from the AutoRenta app
# running on an Android device connected via USB.
#
# Usage:
#   ./debug-android.sh              # Show all [AR] logs
#   ./debug-android.sh ERROR        # Show only ERROR level logs
#   ./debug-android.sh WARN         # Show only WARN level logs
#   ./debug-android.sh Payment      # Show only PaymentService logs
#   ./debug-android.sh -c           # Clear logcat before starting
#   ./debug-android.sh -e           # Show only errors (ERROR + CRITICAL)
#   ./debug-android.sh -f           # Follow mode (real-time)
#   ./debug-android.sh -s           # Save logs to file
#
# Requirements:
#   - ADB installed and in PATH
#   - Android device connected via USB with debugging enabled
#   - AutoRenta app installed on the device
#

set -e

# Colors for terminal output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Configuration
LOG_TAG="\\[AR\\]"
FILTER=""
CLEAR_FIRST=false
ERRORS_ONLY=false
FOLLOW_MODE=true
SAVE_TO_FILE=false
OUTPUT_FILE=""

# Print banner
print_banner() {
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║           AutoRenta Debug Console v1.0                    ║"
    echo "║   Professional debugging for Android USB devices          ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Print usage
print_usage() {
    echo -e "${CYAN}Usage:${NC}"
    echo "  $0 [OPTIONS] [FILTER]"
    echo ""
    echo -e "${CYAN}Options:${NC}"
    echo "  -c, --clear     Clear logcat buffer before starting"
    echo "  -e, --errors    Show only ERROR and CRITICAL level logs"
    echo "  -f, --follow    Follow mode (real-time streaming) [default]"
    echo "  -s, --save      Save logs to file (autorentar-debug-TIMESTAMP.log)"
    echo "  -h, --help      Show this help message"
    echo ""
    echo -e "${CYAN}Filters:${NC}"
    echo "  DEBUG           Show only DEBUG level logs"
    echo "  INFO            Show only INFO level logs"
    echo "  WARN            Show only WARN level logs"
    echo "  ERROR           Show only ERROR level logs"
    echo "  CRITICAL        Show only CRITICAL level logs"
    echo "  <ServiceName>   Filter by service name (e.g., Payment, Auth, Booking)"
    echo ""
    echo -e "${CYAN}Examples:${NC}"
    echo "  $0                    # All AutoRenta logs"
    echo "  $0 ERROR              # Only errors"
    echo "  $0 Payment            # Only PaymentService logs"
    echo "  $0 -c -e              # Clear and show only errors"
    echo "  $0 -s Booking         # Save Booking logs to file"
}

# Check if ADB is installed
check_adb() {
    if ! command -v adb &> /dev/null; then
        echo -e "${RED}Error: ADB is not installed or not in PATH${NC}"
        echo "Please install Android SDK Platform Tools"
        exit 1
    fi
}

# Check if device is connected
check_device() {
    local devices=$(adb devices | grep -v "List of devices" | grep "device$" | wc -l)
    if [ "$devices" -eq 0 ]; then
        echo -e "${RED}Error: No Android device connected${NC}"
        echo "Please connect your device via USB and enable USB debugging"
        exit 1
    fi

    local device_id=$(adb devices | grep "device$" | head -1 | cut -f1)
    echo -e "${GREEN}Device connected:${NC} $device_id"
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -c|--clear)
                CLEAR_FIRST=true
                shift
                ;;
            -e|--errors)
                ERRORS_ONLY=true
                shift
                ;;
            -f|--follow)
                FOLLOW_MODE=true
                shift
                ;;
            -s|--save)
                SAVE_TO_FILE=true
                OUTPUT_FILE="autorentar-debug-$(date +%Y%m%d-%H%M%S).log"
                shift
                ;;
            -h|--help)
                print_usage
                exit 0
                ;;
            -*)
                echo -e "${RED}Unknown option: $1${NC}"
                print_usage
                exit 1
                ;;
            *)
                FILTER="$1"
                shift
                ;;
        esac
    done
}

# Colorize log output
colorize_output() {
    while IFS= read -r line; do
        if [[ $line == *"[CRITICAL]"* ]]; then
            echo -e "${RED}${BOLD}$line${NC}"
        elif [[ $line == *"[ERROR]"* ]]; then
            echo -e "${RED}$line${NC}"
        elif [[ $line == *"[WARN]"* ]]; then
            echo -e "${YELLOW}$line${NC}"
        elif [[ $line == *"[INFO]"* ]]; then
            echo -e "${BLUE}$line${NC}"
        elif [[ $line == *"[DEBUG]"* ]]; then
            echo -e "${PURPLE}$line${NC}"
        else
            echo "$line"
        fi
    done
}

# Main function
main() {
    print_banner
    check_adb
    check_device
    parse_args "$@"

    # Clear logcat if requested
    if [ "$CLEAR_FIRST" = true ]; then
        echo -e "${CYAN}Clearing logcat buffer...${NC}"
        adb logcat -c
    fi

    # Build grep filter
    local grep_filter="$LOG_TAG"

    if [ "$ERRORS_ONLY" = true ]; then
        grep_filter="$grep_filter.*\\[(ERROR|CRITICAL)\\]"
        echo -e "${CYAN}Filter:${NC} Errors only (ERROR, CRITICAL)"
    elif [ -n "$FILTER" ]; then
        grep_filter="$grep_filter.*$FILTER"
        echo -e "${CYAN}Filter:${NC} $FILTER"
    fi

    echo -e "${CYAN}Starting log capture...${NC} (Press Ctrl+C to stop)"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo ""

    # Start logcat with filtering
    if [ "$SAVE_TO_FILE" = true ]; then
        echo -e "${GREEN}Saving to:${NC} $OUTPUT_FILE"
        adb logcat -v time | grep -E "$grep_filter" | tee "$OUTPUT_FILE" | colorize_output
    else
        adb logcat -v time | grep -E "$grep_filter" | colorize_output
    fi
}

# Run main function with all arguments
main "$@"
