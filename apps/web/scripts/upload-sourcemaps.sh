#!/bin/bash
# Upload source maps to Sentry after production build
#
# Required Environment Variables:
# - SENTRY_AUTH_TOKEN: Sentry authentication token
# - SENTRY_ORG: Sentry organization name (default: autorenta)
# - SENTRY_PROJECT: Sentry project name (default: autorenta-web)
#
# Usage:
#   ./scripts/upload-sourcemaps.sh

set -e

# Configuration
SENTRY_ORG="${SENTRY_ORG:-autorenta}"
SENTRY_PROJECT="${SENTRY_PROJECT:-autorenta-web}"
RELEASE="autorenta-web@0.1.0"
DIST_DIR="dist/web/browser"

echo "🔍 Uploading source maps to Sentry..."
echo "Organization: $SENTRY_ORG"
echo "Project: $SENTRY_PROJECT"
echo "Release: $RELEASE"
echo "Distribution directory: $DIST_DIR"

# Check if SENTRY_AUTH_TOKEN is set
if [ -z "$SENTRY_AUTH_TOKEN" ]; then
  echo "⚠️  SENTRY_AUTH_TOKEN not set - skipping source map upload"
  echo "To enable source map uploads, set SENTRY_AUTH_TOKEN environment variable"
  exit 0
fi

# Check if dist directory exists
if [ ! -d "$DIST_DIR" ]; then
  echo "❌ Distribution directory not found: $DIST_DIR"
  echo "Please run 'npm run build' first"
  exit 1
fi

# Create Sentry release
echo "📦 Creating Sentry release: $RELEASE"
npx @sentry/cli releases new "$RELEASE" || echo "Release already exists"

# Upload source maps
echo "📤 Uploading source maps..."
npx @sentry/cli releases files "$RELEASE" upload-sourcemaps \
  --url-prefix '~/' \
  --validate \
  --strip-prefix "$DIST_DIR" \
  "$DIST_DIR"

# Finalize release
echo "✅ Finalizing release..."
npx @sentry/cli releases finalize "$RELEASE"

# Set deployment
echo "🚀 Marking deployment..."
npx @sentry/cli releases deploys "$RELEASE" new -e production || true

echo "✅ Source maps uploaded successfully!"
