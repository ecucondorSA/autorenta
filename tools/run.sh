#!/bin/bash

set -e

COMMAND=$1
shift

if [ "$COMMAND" = "install" ]; then
  if [ -z "$AUTORENTA_SKIP_INSTALL" ]; then
    echo ". install: Running command: $COMMAND $@"
    command $COMMAND $@
  else
    echo ". install: Skipping install command due to AUTORENTA_SKIP_INSTALL=1"
  fi
else
  echo ". $COMMAND: Running command: $COMMAND $@"
  command $COMMAND $@
fi