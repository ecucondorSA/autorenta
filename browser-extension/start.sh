#!/bin/bash
# Browser Extension - Automated Start Script v1.2
# Inicia el bridge server con verificación completa

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BRIDGE_PORT=9223
BRIDGE_PID_FILE="$SCRIPT_DIR/.bridge.pid"
LOG_FILE="/tmp/bridge-server.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Header
clear
echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Claude Code Browser Extension - v1.2                   ║"
echo "║     Infinite Reconnect + Watchdog                          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check dependencies
check_deps() {
    local missing=()

    if ! command -v node &> /dev/null; then
        missing+=("node")
    fi

    if ! command -v curl &> /dev/null; then
        missing+=("curl")
    fi

    if [ ${#missing[@]} -ne 0 ]; then
        echo -e "${RED}Error: Missing dependencies: ${missing[*]}${NC}"
        exit 1
    fi

    # Check node version
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo -e "${RED}Error: Node.js 18+ required (found v$NODE_VERSION)${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓ Dependencies OK (Node.js v$(node -v | cut -d'v' -f2))${NC}"
}

# Check if port is in use
check_port() {
    if lsof -i :$BRIDGE_PORT >/dev/null 2>&1; then
        local pid=$(lsof -t -i:$BRIDGE_PORT 2>/dev/null)
        echo -e "${GREEN}✓ Bridge already running on port $BRIDGE_PORT (PID: $pid)${NC}"
        return 0
    fi
    return 1
}

# Start bridge server
start_bridge() {
    echo -e "${YELLOW}Starting bridge server...${NC}"

    # Ensure we're in the right directory
    cd "$SCRIPT_DIR"

    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo -e "${CYAN}  Installing dependencies...${NC}"
        npm install --silent
    fi

    # Start bridge in background
    node bridge-server.js > "$LOG_FILE" 2>&1 &
    local BRIDGE_PID=$!
    echo $BRIDGE_PID > "$BRIDGE_PID_FILE"

    # Wait for bridge to be ready
    echo -n "  Waiting for bridge"
    for i in {1..20}; do
        if curl -s http://localhost:$BRIDGE_PORT/health >/dev/null 2>&1; then
            echo ""
            echo -e "${GREEN}✓ Bridge server started (PID: $BRIDGE_PID)${NC}"
            return 0
        fi
        echo -n "."
        sleep 0.3
    done

    echo ""
    echo -e "${RED}✗ Failed to start bridge server${NC}"
    echo -e "  Check logs: ${CYAN}cat $LOG_FILE${NC}"
    exit 1
}

# Verify bridge health
verify_health() {
    local health=$(curl -s http://localhost:$BRIDGE_PORT/health 2>/dev/null)
    if [ -n "$health" ]; then
        local ext_status=$(echo "$health" | grep -o '"extensionConnected":[^,}]*' | cut -d':' -f2)
        if [ "$ext_status" = "true" ]; then
            echo -e "${GREEN}✓ Chrome Extension connected${NC}"
        else
            echo -e "${YELLOW}! Chrome Extension not connected yet${NC}"
        fi
    fi
}

# Main execution
main() {
    check_deps

    if ! check_port; then
        start_bridge
    fi

    verify_health

    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}Next Steps:${NC}"
    echo ""
    echo -e "  ${GREEN}1.${NC} Load extension in Chrome (if not already):"
    echo -e "     ${CYAN}chrome://extensions${NC} → Developer mode → Load unpacked"
    echo -e "     Select: ${CYAN}$SCRIPT_DIR${NC}"
    echo ""
    echo -e "  ${GREEN}2.${NC} Restart Claude Code to load MCP server:"
    echo -e "     ${CYAN}claude${NC}"
    echo ""
    echo -e "  ${GREEN}3.${NC} Test connection in Claude Code:"
    echo -e "     ${CYAN}browser_status${NC}"
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${BOLD}Key Improvements in v1.2:${NC}"
    echo -e "  • ${GREEN}Infinite reconnect${NC} - Bridge/extension reconnect forever"
    echo -e "  • ${GREEN}Exponential backoff${NC} - Smart retry delays (1s → 30s max)"
    echo -e "  • ${GREEN}Watchdog${NC} - Auto-recovery every 60s if disconnected"
    echo -e "  • ${GREEN}Order independent${NC} - Start bridge/extension in any order"
    echo ""
    echo -e "${BOLD}Useful Commands:${NC}"
    echo -e "  ${CYAN}npm run status${NC}  - Check bridge status"
    echo -e "  ${CYAN}npm run stop${NC}    - Stop bridge server"
    echo -e "  ${CYAN}cat $LOG_FILE${NC}   - View logs"
    echo ""
}

main "$@"
