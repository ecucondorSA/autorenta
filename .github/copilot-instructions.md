# GitHub Copilot Instructions for Autorenta

## Project Context
- **Stack**: Angular 17+ (Standalone), Ionic 8, Capacitor 7, TailwindCSS.
- **Backend**: Supabase (Auth, DB, Storage, Edge Functions).
- **Infrastructure**: Cloudflare Pages (Web) & Workers (Background tasks).
- **Payments**: MercadoPago (Argentina) & PayPal. Dual-mode: Mock in Dev, Real in Prod.

## Codebase Map
- **`apps/web/src/app/`**:
  - `app.routes.ts`: Central routing with lazy `loadComponent`.
  - `features/*`: Standalone pages (auth, cars, bookings, wallet).
  - `core/`: Singleton services, guards, interceptors, and **Signal Stores**.
  - `shared/`: Reusable UI components (dumb components).
- **`functions/workers/`**: Cloudflare Workers (e.g., `payments_webhook` mock).
- **`supabase/`**:
  - `migrations/`: SQL schema changes.
  - `functions/`: Edge Functions (production payments, business logic).
- **`tools/run.sh`**: Central orchestration script for all tasks.

## Critical Workflows
**ALWAYS use `pnpm run <task>`** which delegates to `tools/run.sh`.

- **Dev**: `pnpm run dev` (Starts Web + Worker). Stop with `pnpm run dev:stop`.
- **Test**:
  - `pnpm run test:quick` (Unit tests, no coverage).
  - `pnpm run test:e2e` (Playwright full suite).
  - `pnpm run test:e2e:booking` / `:wallet` / `:card` (Targeted E2E).
- **Build & Deploy**:
  - `pnpm run build` (Builds all).
  - `pnpm run deploy:web` / `pnpm run deploy:worker`.
- **DB Sync**: `pnpm run sync:types` (Regenerate TypeScript types from Supabase).

## Architecture & Patterns

### Angular & State
- **Standalone Components**: MUST use `standalone: true`, explicit `imports`, and `inject()` for deps.
- **Signals**: Use `signal()` for state and `computed()` for derived values. Avoid `BehaviorSubject` where possible.
- **Stores**: Logic lives in `core/stores/*.store.ts`. Components should be reactive consumers of stores.
- **Private Props**: Templates cannot access private members. Use `public` getters (e.g., `get map() { return this.#map; }`).

### Supabase & Data
- **Service Wrapper**: Access Supabase ONLY via `core/services/*.service.ts`.
- **Type Safety**: Import types from `supabase.types.generated.ts`.
  - Example: `import { Database } from '../../core/models/supabase.types.generated';`
- **RLS**: Never bypass RLS. Do not use service-role keys in the frontend.
- **Storage**: Paths must NOT include bucket name. `userId/file.ext`, not `avatars/userId/file.ext`.

### Payments (Dual-Mode)
- **Dev**: `functions/workers/payments_webhook` mocks MercadoPago on port 8787.
- **Prod**: Supabase Edge Functions (`mercadopago-*`) handle real payments.
- **Logic**: Never call `markAsPaid()` directly. Webhooks must drive state changes.

## "Gotchas" & Rules
1.  **Build Errors**: Never remove template bindings to fix errors. Add the missing imports/methods.
2.  **Environment**: `environment.ts` must have `supabaseUrl`, `supabaseAnonKey`, `mapboxToken`.
3.  **Imports**: Keep imports organized. `pnpm run lint:fix` auto-sorts them.
4.  **Files**: Uploads < 2MB. Always clean up storage when deleting records.
