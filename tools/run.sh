#!/bin/bash

set -e

source ./tools/utils.sh

ACTION=$1

case "${ACTION}" in
  install)
    install_dependencies
    ;;
  *)
    echo "Unknown action: ${ACTION}"
    exit 1
    ;;
esac
