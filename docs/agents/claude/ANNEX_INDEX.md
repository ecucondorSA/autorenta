# Claude Annex Index

Objetivo: mantener `CLAUDE.md` como manual operativo corto y mover detalle extenso a anexos.

## Canonical Full Snapshot
- `docs/agents/claude/CLAUDE_REFERENCE_FULL_2026-02-12.md`
- `AGENTS-2.md` (hardening protocol source of truth shared across agents)

## Thematic References
- Engineering API/reference: `docs/engineering/API_REFERENCE.md`
- Engineering database/schema: `docs/engineering/DATABASE_SCHEMA.md`
- Engineering edge functions: `docs/engineering/EDGE_FUNCTIONS.md`
- Engineering testing: `docs/engineering/TESTING.md`
- Engineering deployment: `docs/engineering/DEPLOYMENT.md`
- Engineering troubleshooting: `docs/engineering/TROUBLESHOOTING.md`
- Security: `docs/security/SECURITY.md`
- Repo hygiene policy: `docs/ROOT_HYGIENE.md`

## Migration Rule (CLAUDE.md size budget)
- `CLAUDE.md` target: <= 700 lines.
- Hard cap: 800 lines.
- If a new section exceeds the budget, add it as an annex under `docs/agents/claude/` and keep only a short pointer in `CLAUDE.md`.

## What was extracted from CLAUDE.md
- Detailed browser automation techniques (Claude in Chrome, Stagehand, Patchright, JS hacks)
- Long project inventory lists (features, services, models, workflows)
- Historical audits and CI lessons learned

Use the full snapshot for forensic/historical detail; use compact `CLAUDE.md` for daily execution.
