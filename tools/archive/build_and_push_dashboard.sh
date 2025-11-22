#!/usr/bin/env bash
set -euo pipefail

################################################################################
# Script: build_and_push_dashboard.sh
# Purpose: automatizar install -> lint -> test -> build -> seed(opt) -> git commit -> push -> create PR
# Usage: ./scripts/build_and_push_dashboard.sh [branch-name]
# Requires: git, pnpm, (optional) psql for seed, (optional) gh for PR creation
################################################################################

BRANCH=${1:-feature/dashboard-hosts}
COMMIT_MSG=${2:-"feat(dashboard): scaffold UI + seeds + E2E owner tests (hosts/renters)"}

echo "== AutoRenta: build_and_push_dashboard.sh =="

function check_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "ERROR: required command '$1' not found in PATH" >&2
    return 1
  fi
  return 0
}

echo "Checking required commands..."
for cmd in git pnpm; do
  check_cmd "$cmd" || exit 1
done

echo "Current git branch: $(git rev-parse --abbrev-ref HEAD)"
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree has uncommitted changes.";
  read -rp "Stash/continue? (y/N): " resp
  if [[ "$resp" != "y" ]]; then
    echo "Abort: please commit or stash your changes first."; exit 1
  fi
  git stash --include-untracked
  STASHED=true
else
  STASHED=false
fi

echo "Creating branch '$BRANCH'..."
git checkout -b "$BRANCH" || git checkout "$BRANCH"

echo "Installing dependencies..."
pnpm install

echo "Running lint:fix..."
pnpm run lint:fix || echo "lint:fix returned non-zero (continuing)"

echo "Running quick unit tests..."
if pnpm run test:quick; then
  echo "Unit tests passed (test:quick)."
else
  echo "test:quick failed. Continue? (y/N)";
  read -rp "> " ans
  if [[ "$ans" != "y" ]]; then
    echo "Abort due to failing unit tests.";
    exit 1
  fi
fi

echo "Building project..."
pnpm run build

echo "Optional: running seed if DATABASE_URL defined and psql available..."
if [[ -n "${DATABASE_URL:-}" ]]; then
  if command -v psql >/dev/null 2>&1; then
    if [[ -f database/seed/owner-dashboard.sql ]]; then
      echo "Seeding database from database/seed/owner-dashboard.sql..."
      psql "$DATABASE_URL" -f database/seed/owner-dashboard.sql || echo "Seed script returned non-zero"
    else
      echo "No seed file found at database/seed/owner-dashboard.sql; skipping";
    fi
  else
    echo "psql not found; skipping seed. To run seed manually: psql \"$DATABASE_URL\" -f database/seed/owner-dashboard.sql"
  fi
else
  echo "DATABASE_URL not set; skipping DB seed.";
fi

echo "Staging changes and committing..."
git add -A
if git diff --staged --quiet; then
  echo "No changes to commit.";
else
  git commit -m "$COMMIT_MSG"
fi

echo "Pushing branch to origin..."
git push -u origin "$BRANCH"

if command -v gh >/dev/null 2>&1; then
  echo "Creating PR via gh CLI..."
  gh pr create --base main --head "$BRANCH" --title "feat: Dashboard hosts/renters (scaffold + seeds + tests)" --body "Implementa scaffold del dashboard para locadores/locatarios. Docs: apps/web/docs/dashboard-plan-hosts-renters.md\n\nChecklist:\n- Scaffold UI\n- Seed SQL added (database/seed/owner-dashboard.sql)\n- Playwright owner smoke test in tests/owner/\n\nRun locally: pnpm install && pnpm run build && npx playwright test tests/owner --project=chromium"
else
  echo "gh CLI not found. Create PR manually or install GitHub CLI (https://cli.github.com/).";
fi

if [[ "$STASHED" == true ]]; then
  echo "Restoring stashed changes..."
  git checkout -
  git stash pop || true
fi

echo "Done. Branch: $BRANCH pushed."
