#!/bin/bash

set -e

BUILD_COMMAND_RUN=false

build() {
  if [ "$BUILD_COMMAND_RUN" = false ]; then
    echo "Running ng build with timeout..."
    # Set a timeout of 30 minutes (1800 seconds) for the ng build command
    timeout 1800 npx ng build
    if [ $? -eq 124 ]; then
      echo "ng build command timed out after 30 minutes."
      exit 1
    fi
    BUILD_COMMAND_RUN=true
  else
    echo "ng build already executed, skipping..."
  fi
}

# Check for essential environment variables
if [ -z "$NG_APP_SUPABASE_URL" ] || [ -z "$NG_APP_SUPABASE_ANON_KEY" ]; then
  echo "Error: Essential environment variables NG_APP_SUPABASE_URL or NG_APP_SUPABASE_ANON_KEY are not set."
  exit 1
fi

if [ "$1" = "build" ]; then
  build
else
  echo "Usage: ./tools/run.sh build"
  exit 1
fi
