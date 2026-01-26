#!/bin/bash

set -e

COMMAND=$1

echo "Running command: $COMMAND"

if [ "$COMMAND" = "install" ]; then
  if [ -z "${AUTORENTA_SKIP_INSTALL}" ]; then
    install
  else
    echo "Skipping install command due to AUTORENTA_SKIP_INSTALL being set."
  fi
else
  $COMMAND
fi