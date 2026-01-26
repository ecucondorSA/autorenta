#!/bin/bash

set -e

# Source the utils script
if [ -f "./tools/utils.sh" ]; then
  source "./tools/utils.sh"
else
  echo "Error: ./tools/utils.sh not found. Please ensure it exists in the repository."
  exit 1
fi

ACTION=$1
shift

case "$ACTION" in
  install)
    install_dependencies "$@"
    ;;
  *)
    echo "Usage: ./tools/run.sh install"
    exit 1
    ;;
esac
