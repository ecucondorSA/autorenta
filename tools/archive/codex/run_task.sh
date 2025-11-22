#!/usr/bin/env bash
set -euo pipefail

PROMPT="$*"
cd "${HOME}/autorenta"
codex --sandbox danger-full-access -a never "$PROMPT"
