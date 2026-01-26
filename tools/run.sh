#!/bin/bash

set -e

COMMAND="$1"
shift
ARGS="$@"

# Check if AUTORENTA_SKIP_INSTALL is set and the command is 'install'
if [ "$AUTORENTA_SKIP_INSTALL" = "1" ] && [ "$COMMAND" = "install" ]; then
  echo ". install: Skipping install due to AUTORENTA_SKIP_INSTALL=1"
  exit 0
fi

echo ". install: Running command: $COMMAND"

# Execute the command with arguments
$COMMAND $ARGS

if [ $? -ne 0 ]; then
  echo ". install: Failed"
  exit 1
else
  echo ". install: Done"
fi