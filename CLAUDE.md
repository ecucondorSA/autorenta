# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AutoRenta is a car rental marketplace for Argentina built with Angular 20, Supabase, and MercadoPago. The platform connects car owners (locadores) with renters (locatarios) through a wallet-based payment system with bilateral guarantees.

## Commands

All commands run through `./tools/run.sh` or via npm scripts in root `package.json`.

### Development
```bash
npm run dev                 # Start Angular (4200) + payment webhook worker (8787)
npm run dev:web             # Angular only
npm run dev:worker          # Payment worker only
npm run dev:stop            # Stop all dev servers
```

### Testing
```bash
npm run test:quick          # Unit tests without coverage (Karma + Jasmine)
npm run test:coverage       # Unit tests with coverage reports
npm run test:e2e            # Playwright E2E tests
npm run test:e2e:ui         # Playwright interactive UI mode
npm run test:e2e:debug      # Playwright debug mode
npm run test:e2e:booking    # Booking flow tests only
npm run test:e2e:wallet     # Wallet payment tests
npm run test:e2e:card       # Card payment tests
```

### Build & Deploy
```bash
npm run build               # Build web + worker
npm run build:web           # Build web only
npm run deploy              # Deploy all to production
npm run deploy:web          # Deploy to Cloudflare Pages
```

### Quality
```bash
npm run lint                # Run ESLint
npm run lint:fix            # Auto-fix linting issues
npm run ci                  # Full CI: lint → test → build
```

### Utilities
```bash
npm run sync:types          # Regenerate Supabase TypeScript types locally
npm run sync:types:remote   # Sync types from remote Supabase project
npm run status              # Project health check
npm run clean               # Clean build artifacts
```

## Architecture

### Stack
- **Frontend**: Angular 20 (standalone components) + Tailwind CSS + PrimeNG + Ionic
- **Backend**: Supabase (Auth, PostgreSQL, Storage, Edge Functions, Realtime)
- **Payments**: MercadoPago (production), mock webhook (development)
- **Hosting**: Cloudflare Pages (web) + Workers (webhooks)
- **Maps**: Mapbox GL JS with clustering

### Directory Structure
```
autorenta/
├── apps/web/src/app/           # Angular application
│   ├── core/                   # Services, guards, interceptors, models
│   │   ├── guards/             # AuthGuard, AdminGuard, OnboardingGuard
│   │   ├── interceptors/       # JWT injection, HTTP cache, error handling
│   │   ├── models/             # TypeScript interfaces
│   │   └── services/           # Business logic (~100+ services)
│   ├── features/               # Lazy-loaded feature modules
│   │   ├── auth/               # Login, register, password reset
│   │   ├── bookings/           # Booking wizard, check-in/out, history
│   │   ├── cars/               # List, detail, publish, availability
│   │   ├── wallet/             # Deposits, withdrawals, transfers
│   │   ├── admin/              # Dashboard, verifications, settlements
│   │   └── ...                 # marketplace, profile, messages, etc.
│   └── shared/                 # Reusable components, pipes, utils
├── supabase/
│   ├── migrations/             # SQL migrations (YYYYMMDD_name.sql)
│   ├── functions/              # Edge Functions (Deno)
│   │   ├── mercadopago-*/      # Payment processing
│   │   ├── wallet-*/           # Wallet operations
│   │   └── ...                 # 40+ edge functions
│   └── helpers/                # Ad-hoc SQL scripts
├── functions/workers/          # Cloudflare Workers
│   ├── payments_webhook/       # Dev payment mock
│   ├── ai-car-generator/       # AI image generation
│   └── google-calendar-sync/   # Calendar integration
├── tests/                      # Playwright E2E tests
│   ├── renter/                 # Renter user flows
│   ├── owner/                  # Owner user flows
│   ├── admin/                  # Admin flows
│   ├── critical/               # Critical path tests
│   └── e2e/                    # Integration tests
└── tools/                      # Build scripts and utilities
    └── run.sh                  # Main command runner
```

### Data Flow
1. **Routes** (`app.routes.ts`) → lazy load feature pages
2. **Guards** (`core/guards/`) → protect routes with auth/role checks
3. **Services** (`core/services/`) → business logic, Supabase SDK calls
4. **Supabase** → RLS policies enforce row-level security

### Key Patterns

**Standalone Components** - All components are standalone with explicit imports:
```typescript
@Component({
  selector: 'app-feature',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './feature.component.html'
})
```

**Signal-based State** - Prefer signals over BehaviorSubject:
```typescript
private dataSignal = signal<Data[]>([]);
readonly data = this.dataSignal.asReadonly();
readonly count = computed(() => this.data().length);
```

**Supabase Client Injection** - Use the shared client service:
```typescript
private readonly supabase = inject(SupabaseClientService).getClient();
```

**Storage Paths** - Never include bucket name in path:
```typescript
// ✅ Correct
const path = `${userId}/${filename}`;
await supabase.storage.from('avatars').upload(path, file);

// ❌ Wrong - will fail RLS
const path = `avatars/${userId}/${filename}`;
```

### Payment System (Dual Mode)

**Development**: Mock webhook at `localhost:8787` auto-approves payments after 2s delay.

**Production**: Real MercadoPago via Supabase Edge Functions:
- `mercadopago-create-preference` → Creates payment preferences
- `mercadopago-webhook` → Processes IPN notifications
- `mercadopago-process-deposit-payment` → Handles wallet deposits
- `wallet-transfer` → Splits payments 85% owner / 15% platform

### Database

**Migrations**: Located in `supabase/migrations/` with format `YYYYMMDD_description.sql`

```bash
supabase db push           # Apply pending migrations
supabase migration list    # List migration status
```

**Type Generation**: After schema changes:
```bash
npm run sync:types:remote  # Regenerate supabase.types.generated.ts
```

## Conventions

### File Naming
- Components: `{feature}-{type}.component.ts` (e.g., `car-card.component.ts`)
- Pages: `{feature}.page.ts` (e.g., `car-detail.page.ts`)
- Services: `{domain}.service.ts` (e.g., `bookings.service.ts`)
- Models: `{entity}.model.ts` (e.g., `wallet.model.ts`)

### Code Style
- Single quotes, no trailing semicolons
- Print width: 100 characters
- Alphabetical imports (auto-sorted by Prettier)
- Explicit return types on public methods
- Tailwind utilities over custom CSS

### Build Error Philosophy
NEVER remove template bindings to fix compilation. Instead:
1. Add missing imports to component
2. Implement missing methods/properties
3. Make private properties public or add getters

## Security Rules

**Never do:**
- Commit secrets or tokens (use `.env.development.local`)
- Disable RLS on Supabase tables
- Use `SUPABASE_SERVICE_ROLE_KEY` in frontend
- Bypass Supabase SDK with raw SQL in frontend

**Always do:**
- Validate user input (files, forms)
- Use RLS policies for data protection
- Verify auth in protected routes
- Limit uploads to 2MB for images

## Environment Variables

Required in `.env.development.local` (gitignored):
```
NG_APP_SUPABASE_URL=
NG_APP_SUPABASE_ANON_KEY=
NG_APP_MAPBOX_ACCESS_TOKEN=
NG_APP_MERCADOPAGO_PUBLIC_KEY=
```

Production variables are set in Cloudflare Pages dashboard and Supabase secrets.

## Database Access (Testing/Development)

**Supabase Project:** `pisqjmoklivzpwufhscx`
**Dashboard:** https://supabase.com/dashboard/project/pisqjmoklivzpwufhscx

**Direct PostgreSQL Connection:**
```bash
PGPASSWORD="Ab.12345" psql -h aws-1-sa-east-1.pooler.supabase.com -p 6543 -U postgres.pisqjmoklivzpwufhscx -d postgres
```

**Service Role Key:** `sb_secret_qRFh5RZGAEyJgVf9B4HwQQ_91fSDRoF`

## Test Users

| Role | Email | Password | User ID |
|------|-------|----------|---------|
| Super Admin | admin-test@autorenta.com | AdminTest123! | f7c68d1d-b514-4204-b022-9b3b7731b41e |
