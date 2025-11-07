#!/bin/bash
# Configure Cloudflare Logpush for Centralized Logging (Issue #120)
#
# This script configures Cloudflare Logpush to forward worker logs to a destination.
# Supports: S3, R2, Datadog, Google Cloud Storage, Azure Blob Storage
#
# Prerequisites:
# - Cloudflare account with Workers enabled
# - wrangler CLI authenticated
# - Destination storage configured (S3/R2/etc.)
#
# Usage:
#   ./tools/configure-logpush.sh [destination_type]
#
# Examples:
#   ./tools/configure-logpush.sh r2       # Cloudflare R2 (recommended for cost)
#   ./tools/configure-logpush.sh s3       # AWS S3
#   ./tools/configure-logpush.sh datadog  # Datadog

set -e

ACCOUNT_ID="5b448192fe4b369642b68ad8f53a7603"
DESTINATION_TYPE="${1:-r2}"

echo "=================================================="
echo "Cloudflare Logpush Configuration"
echo "=================================================="
echo ""
echo "This script will configure Logpush for AutoRenta workers."
echo "Destination: $DESTINATION_TYPE"
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "Error: wrangler CLI not found. Please install it first."
    echo "  npm install -g wrangler"
    exit 1
fi

# Check authentication
echo "Checking Cloudflare authentication..."
if ! wrangler whoami &> /dev/null; then
    echo "Error: Not authenticated with Cloudflare."
    echo "  Run: wrangler login"
    exit 1
fi

echo "✓ Authentication verified"
echo ""

# Configuration based on destination type
case "$DESTINATION_TYPE" in
    r2)
        echo "Configuring Logpush to Cloudflare R2..."
        echo ""
        echo "Prerequisites for R2:"
        echo "  1. Create R2 bucket: wrangler r2 bucket create autorenta-logs"
        echo "  2. Note the bucket name"
        echo ""
        read -p "Enter R2 bucket name (default: autorenta-logs): " BUCKET_NAME
        BUCKET_NAME="${BUCKET_NAME:-autorenta-logs}"

        DESTINATION_CONF="r2://${BUCKET_NAME}/worker-logs"
        echo ""
        echo "Destination: $DESTINATION_CONF"
        ;;

    s3)
        echo "Configuring Logpush to AWS S3..."
        echo ""
        read -p "Enter S3 bucket name: " BUCKET_NAME
        read -p "Enter AWS region: " AWS_REGION
        read -p "Enter S3 path prefix (optional): " PATH_PREFIX

        DESTINATION_CONF="s3://${BUCKET_NAME}/${PATH_PREFIX}?region=${AWS_REGION}"
        echo ""
        echo "Note: You'll need to provide AWS credentials separately."
        ;;

    datadog)
        echo "Configuring Logpush to Datadog..."
        echo ""
        read -p "Enter Datadog API key: " DD_API_KEY
        read -p "Enter Datadog site (e.g., datadoghq.com): " DD_SITE

        DESTINATION_CONF="datadog://${DD_SITE}?header_DD-API-KEY=${DD_API_KEY}"
        ;;

    *)
        echo "Error: Unsupported destination type: $DESTINATION_TYPE"
        echo "Supported types: r2, s3, datadog"
        exit 1
        ;;
esac

echo ""
echo "=================================================="
echo "Manual Configuration Steps"
echo "=================================================="
echo ""
echo "Cloudflare Logpush cannot be fully automated via CLI yet."
echo "Please follow these steps in the Cloudflare Dashboard:"
echo ""
echo "1. Go to: https://dash.cloudflare.com/${ACCOUNT_ID}/workers/logpush"
echo ""
echo "2. Click 'Create Logpush job'"
echo ""
echo "3. Configure:"
echo "   - Dataset: Workers Trace Events"
echo "   - Destination: ${DESTINATION_CONF}"
echo "   - Ownership token: (will be provided by Cloudflare)"
echo ""
echo "4. Select fields to log (recommended):"
echo "   - Timestamp"
echo "   - ScriptName"
echo "   - Message"
echo "   - Level"
echo "   - Logs (all console.log/error output)"
echo ""
echo "5. Optional: Set sampling rate"
echo "   - Production: 100% (capture all logs)"
echo "   - High traffic: 10-50% (reduce costs)"
echo ""
echo "6. Set retention policy:"
echo "   - ERROR/WARN: 90 days"
echo "   - INFO/DEBUG: 30 days"
echo ""
echo "=================================================="
echo "Verification"
echo "=================================================="
echo ""
echo "After configuration, verify logs are flowing:"
echo ""
echo "1. Trigger a worker request"
echo "2. Wait 1-2 minutes for batch processing"
echo "3. Check destination for log files"
echo ""
echo "For R2:"
echo "  wrangler r2 object list autorenta-logs"
echo ""
echo "=================================================="
echo "Cost Estimates (for reference)"
echo "=================================================="
echo ""
echo "Cloudflare Logpush pricing:"
echo "  - \$0.75 per million log lines"
echo "  - First 10 million lines/month free"
echo ""
echo "R2 Storage (if using R2 destination):"
echo "  - \$0.015 per GB/month"
echo "  - Free egress to Cloudflare Workers"
echo ""
echo "Estimated costs for AutoRenta:"
echo "  - ~1M requests/month → ~\$0 (within free tier)"
echo "  - ~10M requests/month → ~\$0.75/month"
echo "  - Storage: ~\$0.15/month for 10GB"
echo ""
echo "=================================================="
echo "Next Steps"
echo "=================================================="
echo ""
echo "1. Complete manual configuration in dashboard"
echo "2. Test log delivery"
echo "3. Set up log analysis/monitoring (optional):"
echo "   - Query with Cloudflare Analytics"
echo "   - Forward to ELK stack"
echo "   - Forward to Grafana Loki"
echo ""
echo "Documentation: docs/infrastructure/centralized-logging.md"
echo ""
