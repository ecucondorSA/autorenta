#!/bin/bash

set -e

# Check if utils.sh exists
if [ ! -f "./utils.sh" ]; then
  echo "Error: utils.sh not found in the tools directory."
  exit 1
fi

# Source utils.sh
. ./utils.sh

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"

  case $key in
    install)
      install_dependencies
      ;;
    build)
      build_project
      ;;
    test)
      test_project
      ;;
    lint)
      lint_project
      ;;
    format)
      format_project
      ;;
    deploy)
      deploy_project
      ;;
    *)
      echo "Unknown command: $key"
      exit 1
      ;;
  esac
  shift
done
