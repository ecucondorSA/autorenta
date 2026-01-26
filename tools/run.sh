#!/bin/bash

set -e

COMMAND="$1"
shift

echo ". ${COMMAND}: Running command: ${COMMAND} $@"

if [ "${COMMAND}" = "install" ]; then
  pnpm install
else
  ${COMMAND} $@
fi