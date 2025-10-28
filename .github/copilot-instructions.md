# GitHub Copilot Instructions for Autorenta

## Project Overview
Autorenta is a car rental platform built with Angular standalone components and Supabase backend, deployed to Cloudflare Pages.

## Tech Stack
- **Frontend**: Angular (standalone architecture)
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Deployment**: Cloudflare Pages + Cloudflare Workers
- **Testing**: Jasmine/Karma (unit), Playwright (e2e)
- **Package Manager**: pnpm

## Architecture Patterns
- Use **standalone components** (no NgModules)
- Use **inject()** pattern for dependency injection
- Implement **lazy loading** for all routes
- Use **Angular Signals** for state management
- Follow **RLS policies** for database security

## Naming Conventions
- **Files**: kebab-case
- **Components**: `*.component.ts`
- **Services**: `*.service.ts`
- **Pages**: `*.page.ts`
- **Models**: `*.model.ts`

## Development Workflow

### Setup
```bash
pnpm install
pnpm run dev  # Runs full development setup
```

### Testing
```bash
pnpm run test          # Unit tests
pnpm run test:quick    # Quick unit tests
pnpm run test:e2e      # E2E tests
pnpm run test:coverage # Coverage report
```

### Building
```bash
pnpm run build        # Build web app
pnpm run build:web    # Build web only
```

### Deployment
```bash
pnpm run deploy       # Full deployment
pnpm run deploy:web   # Deploy web app
pnpm run deploy:worker # Deploy workers
```

### Quality Checks
```bash
pnpm run lint         # Lint code
pnpm run lint:fix     # Fix lint issues
pnpm run ci           # Run CI pipeline
```

### Utilities
```bash
pnpm run sync:types         # Sync types from Supabase
pnpm run sync:types:remote  # Sync from remote
pnpm run check:skills       # Check Claude skills
```

## Autonomous Behavior Guidelines

### When Creating Components
1. Always create standalone components
2. Use inject() for services, not constructor injection
3. Implement OnInit if needed
4. Add proper TypeScript types
5. Create corresponding test file
6. Use signals for component state

### When Creating Services
1. Use @Injectable({ providedIn: 'root' })
2. Use inject() for dependencies
3. Return Observables or Promises
4. Handle errors properly
5. Create unit tests
6. Document public methods

### When Working with Supabase
1. Always verify RLS policies exist
2. Use TypeScript types from generated files
3. Handle authentication states
4. Test database queries
5. Use realtime subscriptions when needed

### When Writing Tests
1. Test component creation
2. Test user interactions
3. Mock external dependencies
4. Test error scenarios
5. Maintain >80% coverage

### Pre-Commit Checklist
- [ ] Run `pnpm run lint`
- [ ] Run `pnpm run test:quick`
- [ ] Check TypeScript compilation
- [ ] Verify no console errors

### Pre-Deployment Checklist
- [ ] Run `pnpm run ci`
- [ ] Run `pnpm run test:e2e`
- [ ] Sync Supabase types
- [ ] Build successfully
- [ ] Check environment variables

## Code Style Rules
- Use TypeScript strict mode
- Prefer const over let
- Use async/await over promises chains
- Use template literals for strings
- Document complex logic
- Keep functions small and focused
- Follow single responsibility principle

## Security Rules
- Never commit secrets or API keys
- Always use RLS policies
- Validate user inputs
- Sanitize data before display
- Use HTTPS only
- Implement proper CORS policies

## Features to Consider
- **Auth**: Registration, login, password reset
- **Cars**: CRUD operations, availability, pricing
- **Bookings**: Reservations, cancellations, modifications
- **Payments**: Integration, webhooks, refunds
- **Admin**: Dashboard, reports, user management

## Documentation References
- Architecture: See `CLAUDE.md`
- Patterns: See `PATTERNS.md`
- Skills Guide: See `CLAUDE_SKILLS_GUIDE.md`
- Workflows: See `tools/claude-workflows.sh`

## Common Tasks

### Scaffold New Component
```bash
ng generate component features/[feature-name]/[component-name] --standalone
```

### Scaffold New Service
```bash
ng generate service services/[service-name]
```

### Generate Types from Supabase
```bash
pnpm run sync:types
```

### Run Specific E2E Test
```bash
pnpm run test:e2e:[test-name]
```

## Monorepo Structure
```
autorenta/
├── apps/
│   └── web/              # Main Angular app
├── functions/
│   └── workers/          # Cloudflare Workers
├── database/             # Database schemas
├── supabase/             # Supabase migrations
├── tests/                # E2E tests
├── tools/                # Utility scripts
└── config/               # Configuration files
```

## When in Doubt
1. Check existing code patterns
2. Refer to CLAUDE.md for architecture
3. Check PATTERNS.md for best practices
4. Run `pnpm run workflows` for available commands
5. Ask for clarification before making breaking changes
