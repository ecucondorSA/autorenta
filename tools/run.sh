#!/bin/bash

set -e

COMMAND=$1

if [ "$AUTORENTA_SKIP_INSTALL" = "1" ]; then
  echo ". install: Skipping install due to AUTORENTA_SKIP_INSTALL=1"
  exit 0
fi

echo ". ${COMMAND}: Running command: ${COMMAND}"

case "${COMMAND}" in
  install)
    pnpm install
    ;;
  build)
    pnpm -r build
    ;;
  *)
    echo "Unknown command: ${COMMAND}"
    exit 1
    ;;

esac

echo ". ${COMMAND}: Done"
