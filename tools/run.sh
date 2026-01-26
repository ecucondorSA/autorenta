#!/bin/bash

set -e

# Source the utils.sh script
if [ -f "./utils.sh" ]; then
  source "./utils.sh"
else
  echo "Error: utils.sh not found in the tools directory."
  exit 1
fi

# Determine the command to execute based on the first argument
command="$1"
shift

# Execute the command
case "$command" in
  install)
    install_dependencies "$@"
    ;;
  *)
    echo "Usage: ./run.sh install"
    exit 1
    ;;
esac
