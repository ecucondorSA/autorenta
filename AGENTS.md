# Repository Guidelines

## Project Structure & Module Organization
- Monorepo with `pnpm`; task wrappers live in `tools/` (`./tools/run.sh help`).
- Web app: `apps/web` (Angular). Key paths: `src/app` (features), `src/assets`, `src/environments`, `src/testing`, `public/`.
- Tests: `tests/` (Playwright suites, `tests/runner` CLI) plus `e2e/` helpers; reports in `playwright-report/` and `test-results/`.
- Cloudflare workers in `functions/workers/*`; data assets in `supabase/` and `database/`.

## Build, Test & Development Commands
Run from repo root.
- `npm run install` — install web + worker deps.
- `npm run dev` — start Angular (localhost:4200) + payments worker (localhost:8787); stop with `npm run dev:stop`.
- `npm run lint` / `npm run lint:fix` / `npm run format` — ESLint + Prettier.
- `npm run test`, `npm run test:quick`, `npm run test:coverage` — Karma/Jasmine; coverage at `apps/web/coverage/index.html`.
- `npm run test:e2e` or `npm run test:e2e:ui` — Playwright (`e2e/playwright.config.ts`).
- `npm run build` / `npm run build:web` / `npm run build:worker` — bundles to `apps/web/dist/web` and `functions/workers/*/dist`.

## Coding Style & Naming Conventions
- Prettier: width 100, single quotes; run `npm run format` before committing.
- ESLint (`@angular-eslint`, `@typescript-eslint`) is authoritative; avoid `any` outside tests and prefix intentional unused vars with `_`.
- File names in kebab-case; suffixes `.component.ts`, `.service.ts`, `.page.ts`, `.model.ts`. Prefer standalone components and lazy routes.
- Tailwind utility classes are fine; keep feature styles near their components.

## Testing Guidelines
- Unit specs end with `.spec.ts` under `apps/web/src/**`; mock network calls and keep fixtures in `src/testing` or `tests/fixtures`.
- Playwright suites live in `tests/`; use shared page objects (`tests/page-objects`) and `npm run test:e2e:ui` when debugging.
- Aim to maintain or improve coverage; run `npm run test:coverage` before PR. Attach `playwright-report/` artifacts for flaky runs.

## Commit & Pull Request Guidelines
- Conventional Commits (`feat|fix|chore|refactor|test|docs|build(scope): summary`) enforced by commitlint; subject ≤72 chars.
- Keep commits focused; separate infra/config from feature code.
- PRs should state scope, tests run, and env/config impact. Link issues/tickets; attach screenshots or short clips for UI changes.

## Security & Configuration Tips
- Never commit secrets. Keep `.env.*` local; Mapbox/MercadoPago/Supabase keys belong in environment vars. `apps/web/scripts/generate-env.js` produces safe build-time stubs.
- Run `npm run setup:auth` once to configure CLI auth; keep `functions/workers/payments_webhook` env values in sync with Cloudflare.
- Deploy only after `npm run ci` passes; production uses `npm run deploy:web` (Cloudflare Pages) and `npm run deploy:worker`.
