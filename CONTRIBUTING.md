# Contributing

## Requisitos
- Node.js 20
- pnpm 9
- Supabase CLI
- Cloudflare Wrangler

## Flujo de ramas
- `main`: rama estable
- `feat/*`, `fix/*`: ramas de trabajo que se fusionan mediante PR

## Commits
Usar Conventional Commits (`build`, `ci`, `chore`, `docs`, `feat`, `fix`, `perf`, `refactor`, `test`).

## Desarrollo local
```
pnpm install
pnpm -C apps/web start
pnpm -C apps/workers/payment-webhook dev
```

## Migraciones Supabase
1. Crear archivos en `supabase/migrations` (formato `yyyyMMddHHmm_nombre.sql`).
2. Validar con `supabase db lint`.
3. Abrir PR y revisar el workflow de migraciones.
