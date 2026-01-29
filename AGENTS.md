# AGENTS.md - AI Agent Guidelines for AutoRenta

> Concise operational guide for AI coding agents. For detailed docs, see CLAUDE.md.

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

---

## 1. Testing Commands

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

## 2. Code Style

### TypeScript
- **Strict mode** - No `any` without justification
- **Explicit return types** on public functions
- **Use `inject()`** instead of constructor injection

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
- Single quotes, 100 char width, trailing commas ES5
- Run `pnpm lint:fix` to auto-format

---

## 3. Angular Patterns

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

## 4. Project Structure

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

## 5. Supabase

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

---

## 6. Frozen Code (DO NOT MODIFY)

MercadoPago Edge Functions are production-critical:
- `supabase/functions/mercadopago-*`
- `supabase/functions/process-payment-queue/`

Only modify if user explicitly requests. Never add MercadoPago SDK.

---

## 7. Anti-Patterns

| Avoid | Use Instead |
|-------|-------------|
| Step-by-step wizards | Single-page forms |
| Modals for forms | Bottom sheets or pages |
| `console.log` in prod | LoggerService |
| Unsubscribed observables | `takeUntilDestroyed()` |
| `any` type | Proper typing |

---

## 8. Pre-Commit Checklist

- [ ] `pnpm lint` passes
- [ ] `pnpm test:unit` passes  
- [ ] `pnpm build:web` succeeds
- [ ] Conventional commit (`feat:`, `fix:`, `docs:`, `refactor:`)

---

## 9. Copilot/Cursor Notes

From `.cursorrules` and `.github/copilot-instructions.md`:

- Access Supabase only via `core/services/*.service.ts`
- Import types from `supabase.types.generated.ts`
- Never use service-role keys in frontend
- File uploads < 2MB
- Use Signals over BehaviorSubject for state
- All components must be standalone with explicit imports
