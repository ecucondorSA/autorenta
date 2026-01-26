#!/bin/bash

set -e

dirname=$(dirname "${BASH_SOURCE[0]}")
cd "${dirname}/.."

if [ ! -f "./tools/utils.sh" ]; then
  echo "Error: utils.sh not found in the tools directory."
  exit 1
fi

source ./tools/utils.sh

AUTORENTA_SKIP_INSTALL=${AUTORENTA_SKIP_INSTALL:-0}

case "$1" in
  install)
    if [ "$AUTORENTA_SKIP_INSTALL" -eq 1 ]; then
      echo "Skipping install due to AUTORENTA_SKIP_INSTALL=1"
      exit 0
    fi
    install_dependencies
    ;;
  build)
    build_project
    ;;
  test)
    test_project
    ;;
  e2e)
    e2e_tests
    ;;
  format)
    format_code
    ;;
  lint)
    lint_code
    ;;
  analyze)
    analyze_code
    ;;
  *)
    echo "Usage: $0 {install|build|test|e2e|format|lint|analyze}"
    exit 1
    ;;

esac
