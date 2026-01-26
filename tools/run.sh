#!/bin/bash

set -e

source "$(dirname "${BASH_SOURCE[0]}")/utils.sh"

ACTION=$1
shift

case "${ACTION}" in
  install)
    install_dependencies
    ;;
  *)
    echo "Unknown action: ${ACTION}"
    exit 1
    ;;
esac
