# GitHub Copilot Instructions for Autorenta

## TL;DR
- Angular 17 standalone web (`apps/web`) backed by Supabase (auth/db/storage) plus Cloudflare workers under `functions/workers`.
- Data flows: guards/services in `core/` → signals stores (e.g., `core/stores/profile.store.ts`) → standalone feature pages under `features/*`.
- Always run tasks through `pnpm run <task>` which delegates to `tools/run.sh`; it coordinates Angular + worker dev servers, CI phases, and deployments.

## Codebase map
- `apps/web/src/app/app.routes.ts` defines all routes with lazy `loadComponent` imports; each route maps to a page in `features/*` (auth, cars, bookings, wallet, marketplace, etc.).
- `core/` structure: `services/` (business logic), `stores/` (signal-based state), `guards/` (CanMatchFn route protection), `interceptors/` (JWT injection), `models/` (TypeScript interfaces), `repositories/` (data access).
- Workers in `functions/workers`: `payments_webhook` (dev mock), `ai-car-generator`, `doc-verifier`, `google-calendar-sync`. Production payments use Supabase edge functions in `supabase/functions/mercadopago-*`.
- SQL lives in `database/` (setup scripts) and `supabase/migrations/` (versioned migrations). Always run `pnpm run sync:types` after schema changes to update `supabase.types.generated.ts`.

## Day-to-day workflow
- `pnpm install` (top level) bootstraps workspace; `postinstall` hook installs `apps/web` dependencies automatically.
- `pnpm run dev` starts Angular dev server (`localhost:4200`) + payments worker (`localhost:8787`) in parallel background processes. Stop with `pnpm run dev:stop` or Ctrl+C.
- Test commands: `pnpm run test:quick` (no coverage), `pnpm run test:coverage` (with reports), `pnpm run test:e2e` (Playwright), `pnpm run test:e2e:ui` (interactive).
- Quality gates before PR: `pnpm run ci` runs lint → test → build pipeline. Fix linting with `pnpm run lint:fix`.
- Deployment: `pnpm run build` (builds web + worker), `pnpm run deploy:web` (Cloudflare Pages), `pnpm run deploy:worker` (Cloudflare Workers). Check status with `pnpm run status`.

## Implementation patterns
- Components are standalone; declare `imports` explicitly and call `inject()` for dependencies (see `features/*/*.page.ts`). Tailwind utility classes are preferred over bespoke CSS.
- Services in `core/services` wrap Supabase SDK access; reuse `injectSupabase()` from `supabase-client.service.ts` so Navigator Locks + auth refresh stay consistent and errors bubble with helpful messages.
- Stores (`core/stores`) expose `signal` + `computed` state with optimistic updates and cache windows; they orchestrate related services (e.g., `ProfileStore` kicks wallet balance fetches and guards template reads).
- Routing sticks to lazy `loadComponent` plus guards in `core/guards`; never remove template bindings to “fix” build errors—add the missing import/method instead.
- Supabase Storage paths never include the bucket name (`const path = `${userId}/${resourceId}/${file.name}`; supabase.storage.from('avatars').upload(path, file)`), otherwise RLS fails.
- Payments & bookings rely on both the worker and Supabase edge functions; when changing those flows inspect `functions/workers/payments_webhook` and the matching files in `supabase/functions/mercadopago-*`.

## Integration cautions
- `environment.*` must declare `supabaseUrl`, `supabaseAnonKey`, Mapbox tokens, and payments keys; `SupabaseClientService` throws early if they’re missing.
- Keep RLS intact: never bypass the Supabase client or embed service-role keys in the frontend. Generated types live in `supabase.types.generated.ts`—import them for table-safe code.
- File uploads must validate size (<2 MB) and clean up storage when deleting resources; surface translated errors like in `ProfileStore`.
- Cross-layer tasks (schema changes, deployments, worker rollouts) should be delegated to the Claude CLI agent per `.cursorrules`.

## Critical "gotchas" discovered from build errors
- **Build errors philosophy**: NEVER remove template bindings or components to "fix" compilation. Instead: (1) add missing imports, (2) implement missing methods, (3) make private properties public or add getters. See debugging section in `CLAUDE.md`.
- **Template syntax limitations**: No spread operators in templates (`{...data()}`). Extract to component methods. No complex inline logic—keep templates declarative.
- **Private property access**: Angular templates can't access private/protected properties. Use `public` or create public getters. Example: `get mapInstance() { return this.#map; }`.
- **Type synchronization**: After Supabase schema changes, always run `pnpm run sync:types` or `:remote`. Import types from `supabase.types.generated.ts` (e.g., `Database['public']['Tables']['cars']['Row']`).
- **Import organization**: ESLint enforces alphabetical imports grouped by type (Angular, 3rd party, local). Run `pnpm run lint:fix` to auto-sort. Prettier plugin `prettier-plugin-organize-imports` handles this on save.

## Payment system architecture (dual-mode)
- **Development**: Mock webhook in `functions/workers/payments_webhook` simulates MercadoPago on `localhost:8787`. Auto-approves payments after 2s delay.
- **Production**: Real MercadoPago via Supabase edge functions: `mercadopago-create-preference`, `mercadopago-webhook`, `mercadopago-oauth-*`. Worker is NOT deployed to production.
- **Wallet flow**: User deposits → `wallet_initiate_deposit` RPC → creates payment intent → webhook confirms → `wallet_confirm_deposit` credits balance. Never call `markAsPaid()` in production—webhook handles it.
- **Booking payments**: Lock funds with `wallet_lock_funds`, split 85%/15% to locador/platform on completion via `wallet-transfer` edge function.

## Testing conventions
- **Unit tests**: Karma + Jasmine in `*.spec.ts` files next to source. Mocks in `testing/` directories. Run subset: `npm run test -- --include="**/profile.service.spec.ts"`.
- **E2E tests**: Playwright in `tests/` directory. Organized by user role: `tests/renter/`, `tests/owner/`, `tests/admin/`. Suite shortcuts: `pnpm run test:e2e:booking`, `:wallet`, `:card`. Debug with `pnpm run test:e2e:debug`.
- **Coverage target**: 80%+ per module. Reports in `apps/web/coverage/`. View with `pnpm run test:coverage:report`.
- **Visual regression**: Screenshots in `playwright-report/`. Re-run failed tests with `--headed` flag to see browser.

## Environment & secrets
- **Local dev**: `.env.development.local` (gitignored) must define: `NG_APP_SUPABASE_URL`, `NG_APP_SUPABASE_ANON_KEY`, `NG_APP_MAPBOX_ACCESS_TOKEN`, `NG_APP_PAYPAL_CLIENT_ID`. Copy from `.env.local.example`.
- **Supabase secrets**: Set via `npx supabase secrets set KEY=value`. Check with `npx supabase secrets list`. Used by edge functions for service-role access and MercadoPago integration.
- **Cloudflare Worker secrets**: Set via `wrangler secret put KEY --name payments_webhook`. Never commit secrets—CI/CD injects from GitHub Secrets.
- **GitHub Secrets**: Configured in repo settings for Actions: `CF_API_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, `MERCADOPAGO_ACCESS_TOKEN`, etc. See `CLAUDE_WORKFLOWS.md#secrets-configuration`.

## Tools & scripts orchestration
- **Single runner**: `tools/run.sh` consolidates all commands. Provides parallel execution, background process management, consistent error handling, and 15-min timeout for long tasks.
- **Debug helpers**: `pnpm run status` (project health), `pnpm run check:auth` (verify CLI auth), `pnpm run monitor:health` (system checks), `pnpm run monitor:wallet` (deposit monitoring).
- **Accessibility**: `pnpm run check:contrast` (color contrast), `pnpm run check:font-sizes` (typography), `pnpm run check:a11y` (combined).
- **Database utilities**: `tools/run.sh sync:types[:remote]` regenerates TS types from Supabase. Setup scripts in `database/` (one-time), migrations in `supabase/migrations/` (versioned).

## Multi-agent coordination (Cursor + Claude Code)
- This file guides **GitHub Copilot** and **Cursor AI**. For Claude Code CLI workflows, see `.cursorrules` (defines delegation boundaries) and `CLAUDE.md` (architecture reference).
- **Cursor specialization**: Fast inline edits (1-3 files), build error fixes, PR reviews, test writing. Autonomous merge authority on PRs after validation.
- **Claude delegation**: Multi-file refactors (5+ files), architecture changes, deployment automation, RLS policy design, vertical stack debugging. Invoke via `claude` CLI.
- **Vertical debugging pattern**: For cross-layer bugs (UI → Service → DB → RLS), create `audit/feature-name` branch, trace full stack, document in `*_AUDIT.md`, fix all layers, merge with `--no-ff`.

## References for deep dives
- Architecture overview: `CLAUDE.md` (main), `CLAUDE_ARCHITECTURE.md` (technical), `CLAUDE_STORAGE.md` (buckets/RLS), `CLAUDE_PAYMENTS.md` (MercadoPago/wallet).
- Workflows & commands: `CLAUDE_WORKFLOWS.md`, `tools/run.sh` (source of truth), `tools/claude-workflows.sh` (automation scripts).
- Operational guides: `docs/runbooks/troubleshooting.md`, `docs/deployment-guide.md`, `docs/disaster-recovery-plan.md`.
- Multi-agent rules: `.cursorrules` (Cursor config), `docs/archived/old/AGENTS.md` (legacy context).
