#!/bin/bash
# AutoRenta - Claude Code Launcher
# Uso: ./scripts/dev/claude-autorenta.sh [modo]
#
# Modos:
#   dev       - Desarrollo con Chrome (default)
#   test      - Testing con agente tester
#   debug     - Debugging con agente debugger
#   scrape    - Scraping con agente scraper
#   review    - Code review con agente reviewer
#   deploy    - Deployment con agente deployer
#   turbo     - Modo turbo: bypassPermissions + Chrome
#   headless  - Sin Chrome, solo terminal

cd /home/edu/autorenta

MODE=${1:-dev}

case $MODE in
  dev)
    echo "🚀 Iniciando Claude Code en modo desarrollo..."
    claude --chrome --model opus
    ;;
  test)
    echo "🧪 Iniciando Claude Code con agente tester..."
    claude --chrome --agent tester --model sonnet
    ;;
  debug)
    echo "🔍 Iniciando Claude Code con agente debugger..."
    claude --chrome --agent debugger --model sonnet
    ;;
  scrape)
    echo "🕷️ Iniciando Claude Code con agente scraper..."
    claude --chrome --agent scraper --model haiku
    ;;
  review)
    echo "👀 Iniciando Claude Code con agente reviewer..."
    claude --agent reviewer --model opus
    ;;
  deploy)
    echo "🚢 Iniciando Claude Code con agente deployer..."
    claude --agent deployer --model sonnet
    ;;
  turbo)
    echo "⚡ Iniciando Claude Code en modo TURBO..."
    claude --chrome --dangerously-skip-permissions --model opus
    ;;
  headless)
    echo "💻 Iniciando Claude Code sin Chrome..."
    claude --no-chrome --model opus
    ;;
  *)
    echo "Modo no reconocido: $MODE"
    echo "Modos disponibles: dev, test, debug, scrape, review, deploy, turbo, headless"
    exit 1
    ;;
esac
