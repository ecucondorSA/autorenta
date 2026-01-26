#!/bin/bash

set -e

# Source the utils.sh script
source "$(dirname "${BASH_SOURCE[0]}")/utils.sh"

COMMAND="$1"
shift

case "${COMMAND}" in
  install)
    # Skip install if AUTORENTA_SKIP_INSTALL is set
    if [ -n "${AUTORENTA_SKIP_INSTALL}" ]; then
      echo "Skipping install"
      exit 0
    fi

    install_dependencies
    ;;
  format)
    format_code
    ;;
  lint)
    lint_code
    ;;
  build)
    build_project "$@"
    ;;
  test)
    test_project "$@"
    ;;
  e2e)
    e2e_tests "$@"
    ;;
  *) # Default case
    echo "Usage: $0 {install|format|lint|build|test|e2e} [options]"
    exit 1
    ;;

esac
