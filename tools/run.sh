#!/bin/bash

set -e

command="$1"
shift

case "${command}" in
  build)
    pnpm -r build
    ;;
  lint)
    pnpm -r lint "$@"
    ;;
  test)
    pnpm -r test "$@"
    ;;
  format)
    pnpm -r format "$@"
    ;;
  ci)
    pnpm -r ci "$@"
    ;;
  *)
    echo "Unknown command: ${command}"
    exit 1
    ;;
esac