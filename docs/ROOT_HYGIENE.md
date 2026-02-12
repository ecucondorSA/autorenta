# Root Hygiene Policy

Last update: 2026-02-12

## Objective
Keep the repository root focused on runtime-critical files only.

## What belongs in root
- Workspace and tool configs (`package.json`, `pnpm-workspace.yaml`, `tsconfig.json`, `turbo.json`, `.gitignore`, etc.)
- Core entry docs (`README.md`, `AGENTS.md`, `AGENTS-2.md`, `CHANGELOG.md`, `LICENSE`)
- Product/runtime top-level directories (`apps/`, `supabase/`, `docs/`, `scripts/`, `tools/`, etc.)

## What should NOT remain in root
- Runtime/debug logs (`*.log`, `*.pid`)
- One-off SQL scripts not part of `supabase/migrations/`
- Temporary plans, reports, and scratch files
- Binary assets/screenshots/videos used for ad-hoc analysis

## Archive convention
- Historical cleanup batch moved to:
  - `docs/archived-reports/root-cleanup-2026-02-12/reports/`
  - `docs/archived-reports/root-cleanup-2026-02-12/sql-manual/`
  - `docs/archived-reports/root-cleanup-2026-02-12/artifacts/`
  - `docs/archived-reports/root-cleanup-2026-02-12/runtime/`

## Operational rules
- New DB changes must be done through `supabase/migrations/*.sql`.
- Keep local/runtime outputs ignored in `.gitignore`.
- If a file is not used by CI, runtime, or onboarding, move it under `docs/` or remove it.

## TTL Auto-Archive
- Objective: prevent stale documents from accumulating in active documentation folders.
- Policy: docs older than `180` days are candidates for archive unless explicitly allowlisted.
- Keep-list file: `docs/.ttl-keep`.
- Check mode (fails if stale docs are found):
  - `pnpm docs:ttl:check`
- Apply mode (archives with `git mv`):
  - `pnpm docs:ttl:apply`
- Archive destination pattern:
  - `docs/archived-reports/ttl-archive-YYYY-MM-DD/`
