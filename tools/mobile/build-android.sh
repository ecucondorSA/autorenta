#!/bin/bash

# tools/mobile/build-android.sh
# Builds the web app for Android with proper environment variables

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/../../"
WEB_DIR="$PROJECT_ROOT/apps/web"

echo -e "${GREEN}📱 AutoRenta Android Builder${NC}"
echo "=============================="

# Check for .env file
if [ ! -f "$WEB_DIR/.env" ]; then
    echo -e "${YELLOW}⚠️  Missing apps/web/.env file!${NC}"
    echo "Creating from template..."
    cp "$WEB_DIR/.env.example" "$WEB_DIR/.env"
    echo -e "${RED}❌ Please edit apps/web/.env and add your NG_APP_SUPABASE_ANON_KEY${NC}"
    echo "The app WILL CRASH on startup without this key."
    exit 1
fi

# Load environment variables from .env
echo "Loading environment variables..."
set -a # automatically export all variables
source "$WEB_DIR/.env"
set +a

# Verify critical vars
if [ -z "$NG_APP_SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}❌ NG_APP_SUPABASE_ANON_KEY is empty in apps/web/.env${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Environment loaded.${NC}"

# Build Web App
echo "🏗️  Building Angular App..."
cd "$WEB_DIR"
npm run build

# Sync Capacitor
echo "🔄 Syncing Capacitor..."
echo "ℹ️  Note: App is configured to load https://autorentar.com as fallback to prevent ERR_CONNECTION_REFUSED"
npx cap sync android

echo -e "${GREEN}✅ Android assets updated successfully!${NC}"
echo "You can now run: npx cap open android"
