#!/bin/bash
# AutoRenta Development Server Starter
# Loads environment variables from .env.local and starts Angular dev server

# Load variables from .env.local
if [ -f "../../.env.local" ]; then
  export $(grep -v '^#' ../../.env.local | xargs)
  echo "✅ Loaded environment variables from .env.local"
else
  echo "⚠️  Warning: .env.local not found"
fi

# Start Angular development server
pnpm exec ng serve -c development-low-spec
