#!/bin/bash

set -e

# Source the utils script
source "$(dirname "${BASH_SOURCE[0]}")/utils.sh"

AUTORENTA_SKIP_INSTALL=${AUTORENTA_SKIP_INSTALL:-}

if [ "$1" = "install" ]; then
  echo ". install: Running install script..."
  # Add your install commands here
  # Example: npm install
  exit 0
else
  echo ". install: Unknown command: $1"
  exit 1
fi