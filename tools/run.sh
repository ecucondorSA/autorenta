#!/bin/bash

set -e

# Load utils
if [ ! -f ./tools/utils.sh ]; then
  echo "Error: ./tools/utils.sh not found. Please ensure it exists."
  echo "Failed"
  exit 1
fi

source ./tools/utils.sh

ACTION=$1
shift

case "$ACTION" in
install)
  install_dependencies "$@"
  ;;
lint)
  run_lint "$@"
  ;;
format)
  run_format "$@"
  ;;
build)
  run_build "$@"
  ;;
test)
  run_tests "$@"
  ;;
*)
  echo "Usage: ./tools/run.sh [install|lint|format|build|test]"
  exit 1
  ;;
esac
