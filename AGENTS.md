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
- Import types from `supabase.types.generated.ts`
- Never use service-role keys in frontend
- File uploads < 2MB
- Use Signals over BehaviorSubject for state
- All components must be standalone with explicit imports
