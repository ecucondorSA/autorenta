#!/bin/bash
# Diagnose Supabase connection issues
# Usage: ./tools/diagnose-supabase.sh

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SUPABASE_URL="https://pisqjmoklivzpwufhscx.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTMyMzIsImV4cCI6MjA3NjEyOTIzMn0.1b4XQpOgNm6bXdcU8gXGG2aUbTkjvr8xyJU4Mkgt6GU"

echo ""
echo "🔍 Supabase Connection Diagnostics"
echo "===================================="
echo ""
echo "Project: pisqjmoklivzpwufhscx"
echo "URL: $SUPABASE_URL"
echo ""

# Test 1: Basic connectivity
echo "Test 1: Basic Connectivity"
echo "--------------------------"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SUPABASE_URL" || echo "000")
if [ "$HTTP_CODE" = "000" ]; then
  echo -e "${RED}❌ Cannot reach Supabase (network error)${NC}"
  echo "   Check your internet connection"
elif [ "$HTTP_CODE" = "403" ]; then
  echo -e "${YELLOW}⚠️  HTTP 403 Forbidden${NC}"
  echo "   Server is reachable but denying access"
elif [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ Server is reachable (HTTP $HTTP_CODE)${NC}"
else
  echo -e "${YELLOW}⚠️  Unexpected response: HTTP $HTTP_CODE${NC}"
fi
echo ""

# Test 2: Auth Health Endpoint
echo "Test 2: Auth Health Endpoint"
echo "----------------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "apikey: $ANON_KEY" \
  "$SUPABASE_URL/auth/v1/health" 2>&1 || echo "ERROR")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE:")

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ Auth service is healthy${NC}"
  echo "   Response: $BODY"
elif echo "$BODY" | grep -qi "access denied"; then
  echo -e "${RED}❌ Access Denied${NC}"
  echo "   Response: $BODY"
  echo ""
  echo "   🚨 LIKELY CAUSE: Project is PAUSED or SUSPENDED"
  echo ""
  echo "   Free tier projects are paused after 7 days of inactivity."
  echo "   Login to Supabase dashboard to restore the project:"
  echo "   👉 https://supabase.com/dashboard/project/pisqjmoklivzpwufhscx"
else
  echo -e "${RED}❌ Auth service error${NC}"
  echo "   HTTP Code: $HTTP_CODE"
  echo "   Response: $BODY"
fi
echo ""

# Test 3: REST API
echo "Test 3: REST API (profiles table)"
echo "---------------------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  "$SUPABASE_URL/rest/v1/profiles?limit=1" 2>&1 || echo "ERROR")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE:")

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ REST API is accessible${NC}"
elif echo "$BODY" | grep -qi "access denied"; then
  echo -e "${RED}❌ Access Denied${NC}"
  echo "   Same issue as auth endpoint"
else
  echo -e "${YELLOW}⚠️  HTTP $HTTP_CODE${NC}"
  echo "   Response: $BODY"
  echo "   Note: This might be expected if RLS policies are strict"
fi
echo ""

# Test 4: Check project status page
echo "Test 4: Supabase Status Page"
echo "----------------------------"
STATUS_RESPONSE=$(curl -s "https://status.supabase.com/api/v2/status.json" || echo "ERROR")
if echo "$STATUS_RESPONSE" | grep -q '"indicator":"none"'; then
  echo -e "${GREEN}✅ Supabase platform is operational${NC}"
else
  echo -e "${YELLOW}⚠️  Supabase may have platform issues${NC}"
  echo "   Check: https://status.supabase.com"
fi
echo ""

# Summary
echo "Summary & Next Steps"
echo "===================="
echo ""
if echo "$BODY" | grep -qi "access denied"; then
  echo -e "${RED}🚨 PROJECT PAUSED OR SUSPENDED${NC}"
  echo ""
  echo "Action Required:"
  echo "1. Login to Supabase Dashboard:"
  echo "   https://supabase.com/dashboard/project/pisqjmoklivzpwufhscx"
  echo ""
  echo "2. Check project status:"
  echo "   - If PAUSED: Click 'Restore Project' or 'Unpause'"
  echo "   - If SUSPENDED: Check for emails from Supabase support"
  echo "   - If BILLING ISSUE: Update payment method"
  echo ""
  echo "3. Free tier projects pause after 7 days of inactivity"
  echo "   Consider upgrading to Pro plan (\$25/month) for always-on"
  echo ""
else
  echo -e "${GREEN}Connection issues may be temporary${NC}"
  echo "Try again in a few minutes"
fi
echo ""
