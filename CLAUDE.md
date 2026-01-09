# 🤖 CLAUDE.md: Instructions for Claude Agent

> **This document is the source of truth for Claude (Anthropic) when working on the Autorenta project.**

## 1. Technical Conventions
- **Package Management:** Use `pnpm` for everything: `pnpm install`, `pnpm add`, `pnpm dev`, `pnpm build`.
- **TypeScript:** Mandatory strict mode. Avoid `any` and `unknown`.
- **Styling:** Tailwind CSS only. Do not duplicate classes; create reusable components instead.
- **Icons:** Use the internal `<app-icon>` component. Use explicit imports, never barrels.
- **Syntax:** Modern Angular syntax (`@if`, `@for`, `inject()`).

## 2. Project & Component Creation
- **Framework:** Angular 18+ (Standalone Components).
- **Generation:** Use `ng generate component ... --standalone`.
- **Dependencies:** Do not add libraries until strictly necessary. Check `package.json` first.

## 3. Organization & Architecture
- **Responsibility:** Small components with a single responsibility (SRP).
- **Patterns:** Prefer composition over complex configurations.
- **Structure:**
  - `src/app/core/`: Singleton services, guards, global models.
  - `src/app/features/`: Functional modules (Pages and Components).
  - `src/app/shared/`: UI Kit and reusable components.
  - `src/app/utils/`: Pure functions and constants.

## 4. TypeScript & State Management
- **Type Safety:** If types are unclear, stop and clarify. No `any`.
- **Signals:** Use Angular Signals (`signal`, `computed`, `effect`) for reactive state.
- **RxJS:** Reserved for complex streams or Supabase Realtime integrations.

## 5. UI & UX
- **Tailwind CSS:** The only allowed styling solution.
- **Readability:** Prioritize readability over micro-optimizations.
- **Accessibility:** Semantic HTML, ARIA roles, and focus management are mandatory.

## 6. Testing & Quality Control
- **CI/CD:** Always check `.github/workflows`.
- **Execution:**
  - Unit Tests: `pnpm test:unit` (Vitest).
  - E2E Tests: `pnpm test:e2e` (Playwright).
- **Pre-commit:** Run `pnpm lint` after moving files or changing imports.
- **Proactivity:** Add or update tests when changing business logic.

## 7. Performance
- **Metrics:** Measure performance; do not guess.
- **Lazy Loading:** Mandatory for all main routes using `loadComponent`.
- **Validation:** Validate changes in a small scope before scaling.

## 8. Commits & Pull Requests
- **Standard:** Use Conventional Commits (`feat:`, `fix:`, `chore:`).
- **Scope:** Small, focused PRs.
- **Verification:** Run lint and unit tests before committing.

## 9. Agent Behavior
- **Ambiguity:** Ask concrete questions if a request is unclear.
- **Direct Action:** Execute simple, well-defined tasks immediately.
- **Confirmation:** Complex changes (refactors, DB migrations) require a plan and user approval.
- **Knowledge:** Do not assume requirements. Read `docs/` first.

## 10. FROZEN CODE - DO NOT MODIFY

The following files are **production-critical** and **FROZEN**. Do NOT modify them unless the user EXPLICITLY requests changes to these specific files AND provides a clear reason.

### MercadoPago Edge Functions (v12 - 2026-01-09)
These functions use direct `fetch()` to MercadoPago API. The SDK was removed due to Deno incompatibility.

```
supabase/functions/_shared/mercadopago-token.ts
supabase/functions/mercadopago-webhook/index.ts
supabase/functions/mercadopago-process-brick-payment/index.ts
supabase/functions/mercadopago-process-deposit-payment/index.ts
supabase/functions/mercadopago-create-preference/index.ts
supabase/functions/mercadopago-create-booking-preference/index.ts
supabase/functions/mercadopago-process-booking-payment/index.ts
supabase/functions/process-payment-queue/index.ts
```

**Rules for frozen code:**
1. **READ-ONLY by default** - Only read these files for context, never modify.
2. **Explicit permission required** - User must say "modify [filename]" or "fix [filename]".
3. **No refactoring** - Do not "improve", "clean up", or "optimize" frozen code.
4. **No SDK changes** - Never add `mercadopago` npm package back. Use `fetch()` only.
5. **Report issues** - If you find a bug, report it to the user instead of fixing.

### Why frozen?
- MercadoPago SDK v2 is incompatible with Deno Edge Runtime (causes BOOT_ERROR)
- Current implementation uses direct REST API calls which work correctly
- v12 is tested and deployed in production

---
**© 2026 Autorenta | Claude Agent Config**