#!/bin/bash
# Stop the bridge server

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BRIDGE_PID_FILE="$SCRIPT_DIR/.bridge.pid"
BRIDGE_PORT=9223

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

stopped=false

# Try to stop by PID file
if [ -f "$BRIDGE_PID_FILE" ]; then
    PID=$(cat "$BRIDGE_PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID" 2>/dev/null
        echo -e "${GREEN}✓ Bridge server stopped (PID: $PID)${NC}"
        stopped=true
    fi
    rm -f "$BRIDGE_PID_FILE"
fi

# Also try to find and kill by port (in case PID file is stale)
PID=$(lsof -t -i:$BRIDGE_PORT 2>/dev/null)
if [ -n "$PID" ]; then
    kill "$PID" 2>/dev/null
    if [ "$stopped" = false ]; then
        echo -e "${GREEN}✓ Bridge server stopped (PID: $PID)${NC}"
        stopped=true
    fi
fi

if [ "$stopped" = false ]; then
    echo -e "${RED}Bridge server not running${NC}"
fi

# Clean up log file option
if [ "$1" = "--clean" ] || [ "$1" = "-c" ]; then
    rm -f /tmp/bridge-server.log
    echo -e "${GREEN}✓ Cleaned log file${NC}"
fi
