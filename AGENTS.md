# AGENTS.md - AI Agent Guidelines for AutoRenta

> Senior-level operating guide for AI coding agents. This is the primary source of truth.

## Quick Reference

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server (port 4200) |
| `pnpm lint` / `pnpm lint:fix` | Lint / auto-fix |
| `pnpm test:unit` | Run unit tests (Vitest) |
| `pnpm test:unit -t "name"` | Run single unit test |
| `pnpm test:e2e` | Run E2E tests (Playwright) |
| `playwright test path/to/test.spec.ts` | Run single E2E test |
| `pnpm build:web` | Production build |

**Package Manager**: `pnpm` only (NEVER npm/yarn)

**Active Supabase Project**: `aceacpaockyxgogxsfyc`

**Deprecated Supabase Project**: `pisqjmoklivzpwufhscx` (do not use)

---

## 1. Engineering Principles (Senior Default)

- **NO Future Optimization (Zero Laziness):** Code must be production-ready immediately. No "I'll fix this later". If you see a bug in the file you're touching, fix it NOW. Forbidden to leave `TODO` in critical logic.
- Prefer small, atomic changes that are easy to verify.
- When a change affects data, add validation and explicit error handling.
- Treat migrations and Edge Functions as production systems.
- Avoid cleverness. Optimize for clarity and debuggability.
- If a change touches more than 3 files, re-scope or explain why.

---

## 2. Testing Commands

```bash
# Unit Tests (Vitest - functions/)
pnpm test:unit                      # All tests
pnpm test:unit -t "payment"         # Match pattern
pnpm test:unit:watch                # Watch mode

# E2E Tests (Playwright - apps/web)
pnpm test:e2e                       # Full suite
pnpm test:e2e:headed                # Browser visible
playwright test tests/renter/booking/payment-wallet.spec.ts  # Single file
```

---

## 3. Code Style

### TypeScript
- **Strict mode** - No `any`. Use `unknown` + validation.
- **Explicit return types** on public functions.
- **Use `inject()`** instead of constructor injection.
- **Null vs Undefined**: `undefined` for not loaded, `null` for explicit empty/reset.

```typescript
// Correct
private readonly authService = inject(AuthService);
readonly user = signal<User | null>(null);

// Avoid
constructor(private authService: AuthService) {}
```

### Naming Conventions
| Type | Pattern | Example |
|------|---------|---------|
| Components | `{name}.component.ts` | `car-card.component.ts` |
| Pages | `{name}.page.ts` | `cars-list.page.ts` |
| Services | `{domain}.service.ts` | `booking.service.ts` |
| Models | `{entity}.model.ts` | `car.model.ts` |

### Formatting
- Single quotes, 100 char width, trailing commas ES5.
- Run `pnpm lint:fix` to auto-format.

---

## 4. Architecture & Ownership

### Domains (Service Facade)
- All Supabase access goes through `apps/web/src/app/core/services/*.service.ts`.
- Keep domain logic in services; pages orchestrate; components present.
- Typed RPC calls: `supabase.rpc<T>()` and use explicit schema (`public.fn_name`).

### Project Structure
```
apps/web/src/app/
├── core/       # Services, guards, models
├── features/   # Lazy-loaded pages
├── shared/     # Reusable UI components
└── utils/      # Pure functions

supabase/
├── functions/  # Edge Functions (Deno)
└── migrations/ # SQL (YYYYMMDDHHMMSS_name.sql)
```

---

## 5. Angular Patterns

### Standalone Components (Required)
```typescript
@Component({
  standalone: true,
  imports: [CommonModule, IonicModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeatureComponent {}
```

### Signals (Preferred)
```typescript
readonly count = signal(0);
readonly doubled = computed(() => this.count() * 2);
```

### Template Syntax
```html
@if (user()) { <span>{{ user()!.name }}</span> }
@for (item of items(); track item.id) { <app-item [data]="item" /> }
```

---

## 6. Product & UX Constraints (Non-Negotiable)

- Avoid step-by-step wizards; use single-page flows.
- Avoid modals for forms; use bottom sheets or full pages.
- Do not show technical terms in UI (FIPE, Binance, API, RPC).
- Prefer optimistic UI with rollback on error.

---

## 7. Supabase (DB + Edge Functions)

### Storage Paths
```typescript
// CORRECT - no bucket prefix
await supabase.storage.from('avatars').upload(`${userId}/file.jpg`, file);

// WRONG - breaks RLS
await supabase.storage.from('avatars').upload(`avatars/${userId}/file.jpg`, file);
```

### Error Handling
```typescript
const { data, error } = await supabase.from('table').select();
if (error) {
  this.logger.error('Query failed', error);
  throw error;
}
```

### RPC & Queries
```typescript
// Correct
const { data } = await supabase.rpc('public.get_user_bookings', { user_id });

// Incorrect
const { data } = await supabase.rpc('get_user_bookings', { user_id });
```

### Migrations
- Naming: `YYYYMMDDHHMMSS_name.sql`.
- Idempotent: use `IF NOT EXISTS` and existence checks before `DROP`.
- New tables require RLS policies.

### Edge Functions
- Always return semantic HTTP errors (400/404/409), not generic 500.
- Never hardcode secrets; use `Deno.env.get(...)`.
- Logging must include context (function + request scope).
- Logs are viewed in the Supabase Dashboard, not via CLI.

### Two-Plane Debugging (UI vs DB) (Critical)
- There are always two planes:
  - UI/Client gating: what the UI allows, filters, disables, or hides (guards, filters, disabled states).
  - DB enforcement: what the database truly allows (enum values, triggers, constraints, RLS policies).
- If a bug looks like "it saved but I can't see it" or "it disappeared", assume RLS and/or query filters first.
- Business-critical rules MUST be enforced in the DB (trigger/constraint/RLS) and mirrored in UI for clarity (not the other way around).
- Always validate the real DB schema before coding against it (generated DB types or `information_schema`).
  - Example: production `profiles` has NO `kyc` column; document KYC lives in `user_documents.status` (`kyc_status` enum).
- **Auth context (Edge Functions) is part of DB enforcement:**
  - `auth.uid()` is only set when the request includes a **user JWT** (forwarded `Authorization` header).
  - Calling an RPC that checks `auth.uid()` with a **service role** client usually fails (`auth.uid()` becomes NULL).
  - Pattern: in Edge Functions, use 2 clients:
    - service role for privileged reads/writes
    - anon key + forwarded `Authorization` for user-scoped RPCs.
- When changing a `status` semantics, ship it as a single atomic change:
  - DB enum + migration
  - RLS policies (visibility)
  - Queries/filters in services
  - UI rendering (disabled/overlay)
  - One verification query in production that proves the behavior
  - Include a legacy-data check (SQL) for rows created before the change and a backfill plan if needed.

### Senior Prompt Template (Debug + Hardening)
```text
Context: AutoRenta. Analyze [BUG/FEATURE] at senior level. Goal: fix root cause without whack-a-mole.

Rule: split the analysis into 2 planes and validate both:
1) UI/Client gating: guards, filters, disabled/overlay states, service queries, routing, feature flags.
2) DB enforcement: enum values, triggers/constraints, RLS policies, RPCs, PostgREST schema cache.

Pre-checks (mandatory):
- Confirm the real production schema (generated DB types or information_schema). Do NOT assume columns.
- List invariants (business rules) and identify legacy data that violates them (SQL checks).
- Confirm caller auth context for each RPC (user JWT vs service role, and whether the function uses `auth.uid()`).

Deliverables:
- Hypotheses per plane + concrete validation steps (SQL commands, app routes to test).
- Confirmed root cause.
- Minimal fix (DB first if it's business-critical) + UI mirror for clarity.
- Verification checklist (prod SQL, unit/E2E, visual evidence).
```

### Drift Detection Checklist (Production vs Code)
- Confirm `status` enums match DB (`database.types.ts` vs `pg_enum`).
- Confirm every RPC used in code exists in DB (`supabase.rpc('public.fn')` vs `pg_proc`).
- Confirm tables/views referenced in services exist (and are in the right schema).
- Confirm visibility rules are enforced in DB (RLS/policies) and reflected in UI (filters/overlays).

### Platform Hardening Rules (10/10)

- Contracts are explicit at boundaries (DB <-> RPC <-> Edge <-> UI):
  - For every RPC/Edge touched, document: name, args, auth context, return type, and error codes.
  - Never guess columns or payload shapes; regenerate DB types (`pnpm types:db:gen`) before refactors.
- Money is stored and computed in integer minor units:
  - DB stores integer cents (or equivalent minor units); UI formats for display only. Never store floats.
  - Always carry currency with the amount across boundaries (DB, RPC, Edge, UI).
- Time is always `timestamptz` in DB + ISO strings in code:
  - Never store local times; UI converts for display only.
- Status/state machines are canonical and enforced:
  - If a table has `status`, define allowed transitions and enforce them in DB.
  - UI mirrors the rules with disabled states/overlays and queries include every visible status.
- RLS visibility is a testable contract:
  - For public listings, define the visibility matrix (anon/auth/owner/admin) and verify with SQL.
  - If something "disappears", check RLS and query filters before touching UI.
- View/function changes must be migration-safe:
  - Views: use DROP+CREATE when changing output columns; re-apply GRANTs.
  - RPCs: schema-qualified names, stable signatures, no duplicate overloads unless intentional.
- Deploy definition of done for DB changes:
  - Migrations must run in production; never "baseline" or mark as applied unless explicitly requested.
  - After deploy, validate with a production query that proves the new behavior.

### Cars: Status + Verification Policy (2026-02-08)
- `public.cars.status` uses enum `public.car_status`: `draft`, `pending`, `active`, `paused`, `deleted`.
- Marketplace visibility (public): `status IN ('active','pending')`.
- `pending` is used when the owner lacks identity verification level 2:
  - Rule: `profiles.id_verified = false` => car must not be `active`.
  - Email/phone are NOT part of the gating rule unless explicitly requested.
- `active` requires `profiles.id_verified = true` and is enforced in DB via trigger.
- UI requirement: `pending` cars are visible to everyone, but not bookable/clickable (grey overlay).
- Key migrations:
  - `supabase/migrations/20260208043450_add_pending_status_and_marketplace_policies.sql`
  - `supabase/migrations/20260208050301_enforce_active_requires_id_verified.sql`
- Key frontend touchpoints:
  - Publish: `apps/web/src/app/features/cars/publish/publish-car-v2.page.ts`
  - Publish: `apps/web/src/app/features/cars/publish/publish-conversational/publish-conversational.page.ts`
  - Marketplace list: `apps/web/src/app/core/services/cars/cars.service.ts`
  - Card gating: `apps/web/src/app/shared/components/car-card/car-card.component.ts`

---

## 8. Frozen Code (DO NOT MODIFY)

MercadoPago Edge Functions are production-critical:
- `supabase/functions/mercadopago-*`
- `supabase/functions/process-payment-queue/`

Only modify if user explicitly requests. Never add MercadoPago SDK.

---

## 9. Anti-Patterns

| Avoid | Use Instead |
|-------|-------------|
| Step-by-step wizards | Single-page forms |
| Modals for forms | Bottom sheets or pages |
| `console.log` in prod | LoggerService |
| Unsubscribed observables | `takeUntilDestroyed()` |
| `any` type | Proper typing |
| `.toPromise()` | `firstValueFrom()` |
| Hardcoded strings | Constants or i18n |

---

## 10. Performance Checklist (Ship-Ready)

- Lazy loading on main routes (`loadComponent`).
- `@for` uses `track`.
- Presentational components use `OnPush`.
- Search inputs use debounce >= 300ms.
- Images use `loading="lazy"` and modern formats.

---

## 11. Security Checklist (Ship-Ready)

- RLS on all new tables.
- No service-role keys in frontend.
- Validate external input at the boundary.
- CORS configured correctly in Edge Functions.

---

## 12. Anti-Regression Protocol (Senior Standard)

1. One domain at a time. Do not mix payments/bookings/auth in a single change.
2. Small commits as checkpoints. If it breaks, `git diff HEAD~1` tells you why.
3. Keep tests running when touching core logic.
4. If a change requires touching 3+ files, re-scope or explain why.

---

## 13. Automation & E2E Policy

- New E2E flows: validate manually first, then automate.
- Prefer reliable, repeatable steps over brittle UI selectors.
- For anti-bot targets, use Patchright Streaming with persistent profile at `/home/edu/.patchright-profile`.
- Default is headed (NOT headless). Use headless only when the user explicitly requests it.
- Keep the browser session persistent: do not reset/close unless explicitly requested.

---

## 14. Pre-Commit Checklist

- [ ] `pnpm lint` passes
- [ ] `pnpm test:unit` passes
- [ ] `pnpm build:web` succeeds
- [ ] Conventional commit (`feat:`, `fix:`, `docs:`, `refactor:`)

---

## 15. Copilot/Cursor Notes

From `.cursorrules` and `.github/copilot-instructions.md`:

- Access Supabase only via `core/services/*.service.ts`
- DB types source of truth: `apps/web/src/app/core/types/database.types.ts` (regenerate with `pnpm types:db:gen`)
- Never use service-role keys in frontend
- File uploads < 2MB
- Use Signals over BehaviorSubject for state
- All components must be standalone with explicit imports

---

## 16. Senior Prompt Template (Hardening + Two Planes)

```text
Context: AutoRenta. I need you to debug/implement [FEATURE/BUG] with production-grade hardening.

Goal:
- [what should happen]

Repro steps:
1) ...
2) ...

Expected vs Actual:
- Expected: ...
- Actual: ...

Non-negotiables:
- Check BOTH planes:
  - UI gating (guards, filters, disabled state, overlays)
  - DB enforcement (enum values, triggers, constraints, RLS policies)
- Pre-check:
  - Confirm real DB schema (generated DB types or `information_schema`). Do not assume columns.
  - List invariants and find legacy rows that violate them (SQL).
- If the behavior is business-critical, enforce it in DB and mirror it in UI.
- Provide:
  - Root cause summary split by plane (UI vs DB)
  - Minimal fix plan (max 1 domain)
  - Code/migration changes
  - Verification steps (queries/tests/screenshots)
```
