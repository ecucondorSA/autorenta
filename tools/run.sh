#!/bin/bash

set -e

if [ "$AUTORENTA_SKIP_INSTALL" = "1" ]; then
  echo "AUTORENTA_SKIP_INSTALL is set, skipping install"
  exit 0
fi

COMMAND="$1"
shift

echo ". ${COMMAND}: Running command: ${COMMAND}"
${COMMAND} "$@"

if [ $? -ne 0 ]; then
  echo ". ${COMMAND}: Failed"
  exit 1
fi

echo ". ${COMMAND}: Done"
