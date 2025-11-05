# Repository Guidelines

## Project Structure & Module Organization
`apps/web` hosts the Angular/Ionic front end: feature code under `src/app`, shared utilities in `src/app/shared`, and static assets in `public`. Build artifacts land in `dist/web`. Payments automation sits in `functions/workers/payments_webhook`, while SQL seeds, Supabase policies, and cron helpers live under `database`, `supabase`, and `scripts`. Browser automation and regression specs are rooted in `tests`, and operational docs reside in `docs`. Reusable workflows (CI, deploy, sync) are scripted in `tools/claude-workflows.sh`.

## Build, Test & Development Commands
Install everything once with `pnpm install`; it chains into `apps/web`. Local dev server: `pnpm dev:web` (runs env generation plus `ng serve`). Payments webhook: `pnpm dev:worker`. Build for Pages via `pnpm build` or `pnpm build:web`, then push to Cloudflare with `pnpm deploy:web`. Quality gates include `pnpm lint`, `pnpm lint:fix`, `pnpm test`, `pnpm test:quick`, `pnpm test:coverage`, and focused e2e suites such as `pnpm test:e2e:wallet` or `pnpm test:e2e:booking`.

## Coding Style & Naming Conventions
Prettier (print width 100, single quotes) and Angular ESLint enforce two-space indentation, sorted imports, and strict template lint rules. Keep filenames in kebab-case and append the agreed suffixes: `.component.ts`, `.service.ts`, `.page.ts`, `.model.ts`. Feature folders should mirror route segments (e.g., `src/app/features/bookings`). Run `pnpm lint:fix` before every commit; lint-staged reuses the same stack for staged files.

## Testing Guidelines
Unit/integration specs (`*.spec.ts`) live next to the implementation inside `apps/web/src` and run with Jasmine + Karma. Use `pnpm test:coverage` to refresh reports in `apps/web/coverage` and keep new modules from dropping coverage. End-to-end coverage relies on Playwright suites in `tests/renter/...`; select targeted scripts (wallet, card, success) before merging payment or booking changes. Attach relevant artifacts from `apps/web/test-results` or `tests/output` when the PR addresses blocking paths.

## Commit & Pull Request Guidelines
Commitlint enforces Conventional Commits; prefer messages like `feat(payments): add split-authorization retry`. Each PR must include a problem summary, linked ticket, screenshots or logs for UI/payment tweaks, commands executed, and rollout notes when Supabase migrations or Cloudflare deploys are involved. Keep scope tight and flag any secrets/config follow-ups in the description so reviewers can coordinate credentials.

## Security & Configuration Notes
Secrets stay outside version control—`apps/web/scripts/generate-env.js` scaffolds local `.env` inputs and Cloudflare credentials are pulled from your shell before running `pnpm deploy:web`. When changing Supabase schemas or RLS policies, run `tools/sync-types.sh` (or `tools/sync-types.sh --remote`) to refresh generated types and document the change under `docs/` for future agents.
