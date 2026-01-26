#!/bin/bash

set -e

source "$(dirname "${BASH_SOURCE[0]}")/utils.sh"

COMMAND=$1

case $COMMAND in
  install)
    echo "Running install..."
    # Add install logic here
    pnpm install
    ;;
  build)
    echo "Running build..."
    # Add build logic here
    pnpm build
    ;;
  test)
    echo "Running test..."
    # Add test logic here
    pnpm test
    ;;
  *)
    echo "Usage: ./tools/run.sh [install|build|test]"
    exit 1
    ;;

esac

echo "Done."
