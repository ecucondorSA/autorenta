# 🚀 Plan de Migración: Angular → Next.js 16 + Supabase

**Fecha**: 2025-10-28
**Decisión**: Reboot completo con stack moderno
**Stack nuevo**: Next.js 16 (App Router) + TypeScript + Supabase + Tailwind

---

## 🎯 Objetivos del Reboot

1. ✅ **Eliminar deuda técnica TypeScript** → Next.js con tipos nativos de Supabase
2. ✅ **Stack moderno y mantenible** → Next.js 16 (última versión)
3. ✅ **Tipos 100% correctos** → Generados automáticamente desde Supabase
4. ✅ **Mejor DX (Developer Experience)** → App Router, Server Components, RSC
5. ✅ **Performance optimizada** → SSR, ISR, Streaming, React Server Components

---

## 📊 Comparación: Angular 17 vs Next.js 16

| Aspecto | Angular 17 | Next.js 16 | Ventaja |
|---------|-----------|------------|---------|
| **Tipos TS** | Manual, desactualizados | Auto-generados desde Supabase | ⚡ Next.js |
| **Errores actuales** | 2,227 errores | 0 (empezar limpio) | ⚡ Next.js |
| **Rendering** | CSR only | SSR + CSR + RSC | ⚡ Next.js |
| **Bundle size** | ~2MB | ~500KB (optimizado) | ⚡ Next.js |
| **Learning curve** | Alta (RxJS, Standalone) | Media (React hooks) | ⚡ Next.js |
| **Ecosystem** | Angular | React (más grande) | ⚡ Next.js |
| **Supabase integration** | Manual | Primera clase (SSR) | ⚡ Next.js |
| **Deployment** | Cloudflare Pages | Vercel (nativo) | ⚡ Next.js |

---

## 🗂️ Estructura del Proyecto Next.js 16

```
autorenta/
├── apps/
│   └── web-next/                    # Nueva app Next.js 16
│       ├── src/
│       │   ├── app/                 # App Router (Next.js 16)
│       │   │   ├── (auth)/          # Grupo de rutas autenticadas
│       │   │   │   ├── login/
│       │   │   │   ├── register/
│       │   │   │   └── layout.tsx
│       │   │   ├── (dashboard)/     # Dashboard protegido
│       │   │   │   ├── cars/
│       │   │   │   ├── bookings/
│       │   │   │   ├── wallet/
│       │   │   │   └── layout.tsx
│       │   │   ├── (public)/        # Rutas públicas
│       │   │   │   ├── page.tsx     # Homepage
│       │   │   │   └── cars/[id]/   # Detalle de auto
│       │   │   ├── api/             # API Routes
│       │   │   │   ├── auth/
│       │   │   │   └── webhooks/
│       │   │   ├── layout.tsx       # Root layout
│       │   │   └── page.tsx         # Home
│       │   ├── components/          # Componentes reutilizables
│       │   │   ├── ui/              # Componentes UI básicos
│       │   │   ├── cars/            # Componentes de autos
│       │   │   ├── bookings/        # Componentes de reservas
│       │   │   └── wallet/          # Componentes de wallet
│       │   ├── lib/                 # Utilidades y configuración
│       │   │   ├── supabase/        # Cliente Supabase
│       │   │   │   ├── client.ts    # Cliente browser
│       │   │   │   ├── server.ts    # Cliente server
│       │   │   │   └── types.ts     # Tipos auto-generados
│       │   │   ├── utils/
│       │   │   └── hooks/           # Custom React hooks
│       │   ├── types/               # Tipos TypeScript adicionales
│       │   └── styles/              # Estilos globales
│       ├── public/                  # Assets estáticos
│       ├── supabase/                # Migraciones y config Supabase
│       │   ├── migrations/
│       │   └── config.toml
│       ├── .env.local               # Variables de entorno
│       ├── next.config.ts           # Configuración Next.js
│       ├── tailwind.config.ts       # Configuración Tailwind
│       ├── tsconfig.json            # Configuración TypeScript
│       └── package.json
├── apps/web/                        # Angular app (preservar temporalmente)
└── docs/
    └── angular-legacy/              # Documentación Angular
```

---

## 🚀 Plan de Ejecución (Fase por Fase)

### Fase 0: Preservar Trabajo Angular (15 minutos)

**Objetivo**: No perder la investigación realizada

```bash
# 1. Commit estado actual
git add -A
git commit -m "docs: Complete Angular investigation before Next.js migration"

# 2. Crear rama de documentación Angular
git checkout -b docs/angular-legacy
git push origin docs/angular-legacy

# 3. Volver a main
git checkout main

# 4. Crear rama de migración
git checkout -b feat/nextjs-16-migration
```

**Resultado**: ✅ Investigación Angular preservada en `docs/angular-legacy`

---

### Fase 1: Setup Next.js 16 Base (30 minutos)

**Objetivo**: Crear proyecto Next.js 16 limpio con TypeScript

```bash
# 1. Crear app Next.js 16 en apps/web-next
cd /home/edu/autorenta
npx create-next-app@latest apps/web-next \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --use-pnpm

# Respuestas interactivas:
# ✔ Would you like to use TypeScript? … Yes
# ✔ Would you like to use ESLint? … Yes
# ✔ Would you like to use Tailwind CSS? … Yes
# ✔ Would you like to use `src/` directory? … Yes
# ✔ Would you like to use App Router? … Yes
# ✔ Would you like to customize the default import alias? … Yes (@/*)

# 2. Verificar instalación
cd apps/web-next
npm run dev  # Debe arrancar en http://localhost:3000
```

**Dependencias instaladas automáticamente**:
- `next@16.x`
- `react@19.x`
- `react-dom@19.x`
- `typescript@5.x`
- `tailwindcss@3.x`
- `eslint@9.x`

**Resultado**: ✅ Next.js 16 funcionando en `apps/web-next/`

---

### Fase 2: Configurar Supabase (20 minutos)

**Objetivo**: Conectar Supabase y generar tipos TypeScript

```bash
# 1. Instalar dependencias Supabase
cd apps/web-next
pnpm add @supabase/supabase-js @supabase/ssr
pnpm add -D supabase

# 2. Inicializar configuración Supabase
npx supabase init

# 3. Configurar variables de entorno
cat > .env.local << EOF
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://obxvffplochgeiclibng.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF

# 4. Generar tipos TypeScript desde base de datos
npx supabase gen types typescript \
  --project-id obxvffplochgeiclibng \
  --schema public \
  > src/lib/supabase/types.ts

# 5. Crear clientes Supabase (browser y server)
```

**Archivos a crear**:

**`src/lib/supabase/client.ts`** (Cliente browser):
```typescript
import { createBrowserClient } from '@supabase/ssr'
import { Database } from './types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**`src/lib/supabase/server.ts`** (Cliente server):
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from './types'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

**Resultado**: ✅ Supabase configurado con tipos TypeScript auto-generados

---

### Fase 3: Migrar Autenticación (45 minutos)

**Objetivo**: Sistema de auth con Supabase Auth

**Estructura**:
```
src/app/(auth)/
├── login/
│   └── page.tsx          # Página de login
├── register/
│   └── page.tsx          # Página de registro
├── reset-password/
│   └── page.tsx          # Recuperar contraseña
└── layout.tsx            # Layout para rutas de auth
```

**Componentes clave**:
1. Middleware de autenticación
2. Server Actions para login/register
3. Protected routes con redirect

**Resultado**: ✅ Auth funcionando con Supabase

---

### Fase 4: Migrar Módulos Core (2-3 horas)

**Prioridad de migración**:

1. **Cars (Autos)** → Módulo principal
   - Lista de autos
   - Detalle de auto
   - Publicar auto
   - Mis autos

2. **Bookings (Reservas)** → Segunda prioridad
   - Crear reserva
   - Mis reservas
   - Estado de reserva

3. **Wallet (Billetera)** → Tercera prioridad
   - Balance
   - Depositar
   - Historial

4. **Profile (Perfil)** → Cuarta prioridad
   - Ver perfil
   - Editar perfil
   - Documentos

**Resultado**: ✅ Módulos principales funcionando

---

### Fase 5: Migrar Componentes UI (1-2 horas)

**Componentes a migrar**:
- Car card
- Car map (Mapbox GL)
- Date range picker
- Payment forms
- Wallet components

**Estrategia**: Usar shadcn/ui para componentes base

```bash
# Instalar shadcn/ui
npx shadcn@latest init

# Agregar componentes necesarios
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add form
# ... etc
```

**Resultado**: ✅ UI componentes migrados y funcionando

---

### Fase 6: Testing y Optimización (1 hora)

1. Tests unitarios con Vitest
2. Tests E2E con Playwright
3. Optimización de performance
4. SEO y metadata

**Resultado**: ✅ App probada y optimizada

---

## 📋 Checklist Completo

### Fase 0: Preservación
- [ ] Commit estado actual Angular
- [ ] Crear rama `docs/angular-legacy`
- [ ] Push de documentación
- [ ] Crear rama `feat/nextjs-16-migration`

### Fase 1: Setup Next.js
- [ ] Instalar Next.js 16
- [ ] Verificar que arranca
- [ ] Configurar ESLint y Prettier
- [ ] Configurar Tailwind CSS

### Fase 2: Supabase
- [ ] Instalar dependencias Supabase
- [ ] Configurar variables de entorno
- [ ] Generar tipos TypeScript
- [ ] Crear clientes (browser + server)
- [ ] Probar conexión

### Fase 3: Autenticación
- [ ] Middleware de auth
- [ ] Páginas de login/register
- [ ] Server Actions
- [ ] Protected routes
- [ ] Session management

### Fase 4: Módulos Core
- [ ] Cars module
- [ ] Bookings module
- [ ] Wallet module
- [ ] Profile module

### Fase 5: UI Components
- [ ] Instalar shadcn/ui
- [ ] Migrar car-card
- [ ] Migrar car-map
- [ ] Migrar forms
- [ ] Migrar modals

### Fase 6: Testing
- [ ] Setup Vitest
- [ ] Setup Playwright
- [ ] Tests unitarios
- [ ] Tests E2E
- [ ] Performance audit

---

## ⏱️ Timeline Estimado

| Fase | Duración | Acumulado |
|------|----------|-----------|
| 0. Preservación | 15 min | 15 min |
| 1. Setup Next.js | 30 min | 45 min |
| 2. Supabase | 20 min | 1h 5min |
| 3. Autenticación | 45 min | 1h 50min |
| 4. Módulos Core | 3 hrs | 4h 50min |
| 5. UI Components | 2 hrs | 6h 50min |
| 6. Testing | 1 hr | 7h 50min |

**Total estimado**: ~8 horas de trabajo (1-2 días)

---

## 🎯 Ventajas de la Migración

### Técnicas
✅ **0 errores TypeScript** (tipos auto-generados)
✅ **SSR nativo** (mejor SEO y performance)
✅ **React Server Components** (menos JavaScript al cliente)
✅ **Optimización automática** (imágenes, fonts, bundles)
✅ **Hot Module Replacement** (DX superior)

### Negocio
✅ **Más rápido para usuarios** (carga inicial optimizada)
✅ **Mejor SEO** (SSR + metadata dinámica)
✅ **Más fácil de mantener** (menos código, mejor estructura)
✅ **Más fácil de escalar** (Edge runtime, ISR)

### Equipo
✅ **Menos deuda técnica** (empezar limpio)
✅ **Más rápido para desarrollar** (App Router + Server Actions)
✅ **Más fácil de contratar** (React > Angular en mercado)
✅ **Mejor documentación** (Next.js tiene docs excelentes)

---

## 🚀 Comando para Empezar

```bash
# Ejecutar plan completo automático
cd /home/edu/autorenta
bash tools/migrate-to-nextjs.sh

# O ejecutar fase por fase manualmente
# Fase 0: Preservar
git checkout -b docs/angular-legacy
git push origin docs/angular-legacy

# Fase 1: Setup Next.js
npx create-next-app@latest apps/web-next --typescript --tailwind --app

# Continuar con fases 2-6...
```

---

## 📝 Notas Importantes

1. **No borrar Angular todavía**: Mantener `apps/web/` como referencia
2. **Migración incremental**: Probar cada módulo antes de siguiente
3. **Documentar decisiones**: Actualizar este doc con cambios
4. **Commits frecuentes**: Commit después de cada fase

---

🤖 **Generated with [Claude Code](https://claude.com/claude-code)**
📅 **Fecha**: 2025-10-28
🎯 **Stack**: Next.js 16 + TypeScript + Supabase + Tailwind
