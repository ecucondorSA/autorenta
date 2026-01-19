#!/bin/bash
# =============================================================================
# Install Git Hooks
# =============================================================================
# This script installs the git hooks from scripts/hooks to .git/hooks
#
# Usage:
#   ./scripts/hooks/install-hooks.sh
#
# This is automatically run by: pnpm prepare (via husky alternative)
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
GIT_HOOKS_DIR="$PROJECT_ROOT/.git/hooks"

echo "📦 Installing git hooks..."

# Check if we're in a git repo
if [ ! -d "$PROJECT_ROOT/.git" ]; then
  echo "⚠️  Not a git repository. Skipping hook installation."
  exit 0
fi

# Install pre-commit hook
if [ -f "$SCRIPT_DIR/pre-commit" ]; then
  cp "$SCRIPT_DIR/pre-commit" "$GIT_HOOKS_DIR/pre-commit"
  chmod +x "$GIT_HOOKS_DIR/pre-commit"
  echo "✅ Installed pre-commit hook"
else
  echo "⚠️  pre-commit hook not found in scripts/hooks/"
fi

# Add more hooks here as needed
# e.g., commit-msg, pre-push, etc.

echo ""
echo "🎉 Git hooks installed successfully!"
echo ""
echo "The following hooks are now active:"
echo "  - pre-commit: Detects secrets before commits"
echo ""
echo "To bypass hooks (use with caution): git commit --no-verify"
