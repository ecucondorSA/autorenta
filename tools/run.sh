#!/bin/bash

set -e

# Add any necessary setup or environment configuration here

if [ "$1" = "build" ]; then
  echo "Building..."
  # Execute the Angular build command directly, avoiding recursive prebuild triggering
  npx ng build
else
  echo "Running command: $@"
  "$@"
fi

exit 0
