#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$HOME/autorenta}"
SESSION="${SESSION:-codex}"

if tmux has-session -t "$SESSION" 2>/dev/null; then
  echo "La sesión tmux '$SESSION' ya existe."
else
  tmux new-session -d -s "$SESSION" "cd \"$ROOT\" && exec bash"
  echo "Sesión tmux '$SESSION' creada en $ROOT"
fi

tmux send-keys -t "$SESSION" "codex --sandbox danger-full-access -a never" C-m
echo "Codex lanzado dentro de tmux. Adjunta con: tmux attach -t $SESSION"
