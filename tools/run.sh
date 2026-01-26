#!/usr/bin/env bash

set -e

source "$(dirname "${BASH_SOURCE[0]}")/utils.sh"

AUTORENTA_SKIP_INSTALL=${AUTORENTA_SKIP_INSTALL:-''}

# Check if the command is 'install'
if [ "$1" = "install" ]; then
  # Check if AUTORENTA_SKIP_INSTALL is set to '1'
  if [ "$AUTORENTA_SKIP_INSTALL" = "1" ]; then
    echo "Skipping install due to AUTORENTA_SKIP_INSTALL=1"
    exit 0
  fi
fi

# Execute the command
command="$@"

echo ". $command"

# Run the command
if ! eval "$command"; then
  echo ". $command: Failed"
  exit 1
fi

echo ". $command: Done"
