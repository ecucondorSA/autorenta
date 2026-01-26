#!/bin/bash

set -e

# Check if AUTORENTA_SKIP_INSTALL is set to 1
if [ "$AUTORENTA_SKIP_INSTALL" = "1" ]; then
  echo "AUTORENTA_SKIP_INSTALL is set, skipping install step"
  exit 0
fi

COMMAND="$1"
shift

echo ". ${COMMAND}: Running command: ${COMMAND}"

case "${COMMAND}" in
  install)
    # The install command should have at least two arguments: source and destination.
    # If no arguments are provided, it will fail.
    # Add your install logic here if needed.
    install "$@"
    ;;
  *)
    echo "Unknown command: ${COMMAND}"
    exit 1
    ;;
esac
