# AutoRenta – Instrucciones para GitHub Copilot

## Contexto del Proyecto
**AutoRenta** es un marketplace P2P de alquiler de autos para Argentina construido con Angular 17 (standalone), Supabase y Cloudflare.

### Stack Principal
- **Frontend**: Angular 17 standalone + Tailwind CSS + PWA
- **Backend**: Supabase (Postgres + RLS + Edge Functions)
- **Deploy**: Cloudflare Pages (web) + Workers (webhooks)
- **Pagos**: MercadoPago (prod) via Supabase Edge Functions, Mock local (dev)

### Dominios Clave
Vehículos • Reservas • Pricing • Wallet • FGO/Riesgo • KYC

## Arquitectura y Flujo de Datos

### Estructura Crítica
```
apps/web/src/app/
├── core/
│   ├── services/       # Lógica negocio (pricing, wallet, bookings)
│   ├── stores/         # Estado reactivo (signals)
│   ├── guards/         # Protección rutas
│   └── models/         # Interfaces TypeScript
├── features/           # Páginas lazy-loaded
└── shared/             # Componentes reutilizables

supabase/migrations/    # Schema SQL versionado
supabase/functions/     # Edge Functions (mercadopago-*)
functions/workers/      # CF Workers (payments_webhook dev)
```

### Flujo de Datos
1. Guard verifica auth → 2. Service ejecuta lógica → 3. Store actualiza signals → 4. Component renderiza → 5. RLS valida permisos

## Comandos Esenciales

### Setup (Una Vez)
```bash
pnpm install                      # Instala + postinstall
cp .env.local.example .env.local  # Secrets locales
pnpm run check:auth               # Verificar CLI
```

### Desarrollo Diario
```bash
pnpm run dev          # Angular:4200 + Worker:8787
pnpm run test:quick   # Unit tests rápidos
pnpm run test:e2e     # E2E Playwright
pnpm run lint:fix     # Auto-fix linting
pnpm run ci           # ANTES de PR: lint+test+build
```

### Database
```bash
pnpm run sync:types              # Regenerar tipos Supabase
supabase migration new nombre    # Nueva migración
```

## Patrones de Código

### Componentes Standalone
```typescript
@Component({
  standalone: true,
  imports: [CommonModule],
  template: '...'
})
export class FeaturePage {
  private service = inject(FeatureService); // inject() > constructor
}
```

### Services y Stores
```typescript
// Service: lógica pura
export class BookingService {
  private supabase = inject(SupabaseClientService).getClient();

  async getBooking(id: string) {
    const { data, error } = await this.supabase
      .from('bookings').select('*').eq('id', id).single();
    if (error) throw new Error(`Fetch failed: ${error.message}`);
    return data;
  }
}

// Store: estado reactivo
export class ProfileStore {
  private profileSignal = signal<Profile | null>(null);
  readonly profile = this.profileSignal.asReadonly();
  readonly isVerified = computed(() => this.profile()?.is_verified ?? false);
}
```

### Routing Lazy
```typescript
{
  path: 'bookings',
  canMatch: [authGuard],
  loadComponent: () => import('./features/bookings/bookings.page')
}
```

## Reglas Críticas

### Supabase Storage (⚠️ NUNCA incluir bucket en path)
```typescript
// ✅ CORRECTO
const path = `${userId}/${file.name}`;
await supabase.storage.from('avatars').upload(path, file);

// ❌ INCORRECTO - RLS fallará
const path = `avatars/${userId}/${file.name}`;
```

### Build Errors Philosophy
- ❌ NUNCA remover bindings de template para "arreglar"
- ✅ Agregar imports faltantes
- ✅ Implementar métodos faltantes
- ✅ Hacer propiedades públicas o crear getters

### Type Sync
```bash
# DESPUÉS de cambios en schema
pnpm run sync:types
# Importar de: supabase.types.generated.ts
```

### Payments (Dual Mode)
- **Dev**: Mock worker `localhost:8787` (auto-aprueba después 2s)
- **Prod**: Supabase Edge Functions (`mercadopago-*`)
- ⚠️ Cambios requieren revisar AMBOS sistemas

## Testing

- **Unit**: Karma + Jasmine en `*.spec.ts`
- **E2E**: Playwright en `tests/` (por rol: renter, owner, admin)
- **Coverage**: 80%+ target, reportes en `apps/web/coverage/`
- **Shortcuts**: `test:e2e:booking`, `:wallet`, `:card`

## Secrets & Environment

### Local Dev
```bash
# .env.development.local (gitignored)
NG_APP_SUPABASE_URL=...
NG_APP_SUPABASE_ANON_KEY=...
NG_APP_MAPBOX_ACCESS_TOKEN=...
```

### Producción
- **Supabase**: `npx supabase secrets set KEY=value`
- **Cloudflare**: `wrangler secret put KEY`
- **GitHub**: Repo settings → Secrets (CF_API_TOKEN, etc.)

## Multi-Agent Coordinación

### Cursor (tú)
- ✅ Edits rápidos (1-3 archivos)
- ✅ Fixes de build/linting
- ✅ Tests unitarios
- ✅ **PR reviews autónomos** (puedes mergear)

### Claude Code CLI (delegar)
- ❌ Refactors 5+ archivos
- ❌ Arquitectura vertical (UI→DB→RLS)
- ❌ Deployment automation
- ❌ RLS policy design

Invocar: `claude` en terminal

## Referencias

- **Arquitectura**: `CLAUDE.md`, `CLAUDE_ARCHITECTURE.md`
- **Workflows**: `CLAUDE_WORKFLOWS.md`, `tools/run.sh`
- **Pagos**: `CLAUDE_PAYMENTS.md`
- **Storage**: `CLAUDE_STORAGE.md`
- **Multi-agent**: `.cursorrules`
