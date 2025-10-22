# 🚀 QuickStart - AutoRenta E2E Tests

## ✅ Lo que ya está hecho

Se ha creado la **arquitectura completa** de testing E2E con Playwright:

- ✅ **11 archivos** de configuración, fixtures, page objects y documentación
- ✅ **2 suites completas** implementadas (Auth + Wallet)
- ✅ **26 suites planificadas** con roadmap de 4 semanas
- ✅ **Seed data SQL** para base de datos de pruebas
- ✅ **Playwright instalado** con dependencias

## 📦 Instalación Completada

```bash
# ✅ Ya ejecutado
npm install --save-dev @playwright/test@1.56.1
npm install --save-dev @supabase/supabase-js uuid @types/uuid
```

## ⚙️ Configuración Necesaria (ANTES DE EJECUTAR)

### 1. Variables de Entorno

Crear `.env.test` en la raíz del proyecto:

```bash
# Copiar el ejemplo
cp .env.test.example .env.test

# Editar con tus valores reales
nano .env.test
```

**Contenido de `.env.test`**:
```bash
# Supabase (copiar de apps/web/.env)
NG_APP_SUPABASE_URL=https://gtyvdircfhmdjiaelqkg.supabase.co
NG_APP_SUPABASE_ANON_KEY=<tu-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<tu-service-role-key>

# Test config
PLAYWRIGHT_BASE_URL=http://localhost:4200
DATABASE_URL=postgresql://postgres:<password>@<host>:5432/autorenta
```

### 2. Seed Data en Supabase

Ejecutar el script SQL para crear usuarios y autos de prueba:

```bash
# Usando psql
psql -U postgres -d autorenta -f tests/data/seeds.sql

# O desde Supabase Dashboard
# SQL Editor → Copiar contenido de tests/data/seeds.sql → Run
```

**Esto creará**:
- 4 usuarios de prueba (renter, owner, admin, both)
- 7 autos de prueba (economy, premium, luxury)
- Wallets con saldo inicial
- Función de cleanup

### 3. Instalar Navegadores de Playwright

```bash
npx playwright install
```

## 🧪 Ejecutar Tests

### Validación de Sintaxis

```bash
# Listar todos los tests sin ejecutarlos
npx playwright test --list
```

**Deberías ver**:
```
Listing tests:
  [chromium:visitor] › tests/auth/01-register.spec.ts:7:3 › User Registration › should display registration form
  [chromium:visitor] › tests/auth/01-register.spec.ts:20:3 › User Registration › should show validation errors
  [chromium:renter] › tests/wallet/01-deposit-mp.spec.ts:12:3 › Wallet Deposit › should display deposit button
  ...
Total: XX tests in 2 files
```

### Ejecutar Tests Implementados

```bash
# Suite de registro
npx playwright test tests/auth/01-register.spec.ts

# Suite de wallet/deposit
npx playwright test tests/wallet/01-deposit-mp.spec.ts

# Todos los tests (solo 2 implementados)
npx playwright test

# UI Mode (recomendado para debugging)
npx playwright test --ui
```

### Ver Reporte

```bash
# Después de ejecutar tests
npx playwright show-report
```

## 📂 Estructura Creada

```
/home/edu/autorenta/
├── playwright.config.ts           ✅ 12 proyectos (roles × browsers)
├── .env.test.example              ✅ Template de variables
├── tests/
│   ├── fixtures/
│   │   └── auth.setup.ts          ✅ Auth por rol
│   ├── helpers/
│   │   └── test-data.ts           ✅ Generadores de datos
│   ├── pages/
│   │   ├── auth/
│   │   │   └── LoginPage.ts       ✅ Page Object
│   │   └── wallet/
│   │       └── WalletPage.ts      ✅ Page Object
│   ├── data/
│   │   └── seeds.sql              ✅ Seed data DB
│   ├── auth/
│   │   └── 01-register.spec.ts    ✅ 11 test cases
│   ├── wallet/
│   │   └── 01-deposit-mp.spec.ts  ✅ 10 test cases
│   ├── E2E_TEST_PLAN.md           ✅ Plan maestro
│   ├── README.md                  ✅ Documentación
│   ├── IMPLEMENTATION_SUMMARY.md  ✅ Resumen
│   └── QUICKSTART.md              ✅ Este archivo
```

## 🎯 Próximos Pasos

### Semana 1 (Actual) - Foundation ✅
- [x] Arquitectura base
- [x] Auth fixtures
- [x] Seed data
- [x] 2 suites de ejemplo
- [x] Documentación
- [ ] **Ejecutar tests** (tú debes hacer esto)

### Semana 2 - Critical Path
- [ ] 6 suites de Renter (search, booking)
- [ ] 5 suites de Owner (publish car)
- [ ] 3 suites de Auth restantes

### Semana 3 - Completitud
- [ ] 3 suites de Admin
- [ ] 4 suites de Wallet restantes
- [ ] 3 suites de Visitor

### Semana 4 - CI/CD
- [ ] GitHub Actions workflow
- [ ] Visual regression
- [ ] Performance benchmarks

## 🔍 Troubleshooting

### Error: "supabaseUrl is required"
**Solución**: Crear `.env.test` con las variables de Supabase

### Error: "Cannot find module '@playwright/test'"
**Solución**: Ya resuelto - npm install ejecutado

### Error: "Test data not found"
**Solución**: Ejecutar `psql -f tests/data/seeds.sql`

### Tests timeout
**Solución**: Aumentar timeout en `playwright.config.ts` (ya configurado en 60s)

### App no levanta en localhost:4200
**Solución**:
```bash
cd apps/web
npm run start
```

## 📊 Tests Implementados

### 1. Auth - Registration (11 cases)
- ✅ Form display
- ✅ Validation errors
- ✅ Email format
- ✅ Password requirements
- ✅ Password confirmation
- ✅ Register renter
- ✅ Register owner
- ✅ Register both
- ✅ Duplicate email
- ✅ Terms acceptance
- ✅ Navigation to login

### 2. Wallet - Deposit (10 cases)
- ✅ Display wallet info
- ✅ Navigate to deposit
- ✅ Amount validation
- ✅ Create MP preference
- ✅ Full deposit flow (mock)
- ✅ Payment pending
- ✅ Payment rejected
- ✅ Transaction history
- ✅ Prevent concurrent deposits
- ✅ Network errors

## 🎓 Aprender por Ejemplos

**Ver**:
- `tests/auth/01-register.spec.ts` - Ejemplo completo de suite de formulario
- `tests/wallet/01-deposit-mp.spec.ts` - Ejemplo de integración con API externa
- `tests/pages/auth/LoginPage.ts` - Page Object Model pattern
- `tests/helpers/test-data.ts` - Data factories

## 🆘 Soporte

**Documentación**:
- `tests/README.md` - Guía completa
- `tests/E2E_TEST_PLAN.md` - Plan de 26 suites
- `tests/IMPLEMENTATION_SUMMARY.md` - Progreso y métricas
- `/home/edu/autorenta/CLAUDE.md` - Arquitectura del proyecto

**Comandos útiles**:
```bash
npx playwright test --help
npx playwright codegen localhost:4200  # Generar tests
npx playwright show-trace <trace.zip>  # Debug traces
```

---

## ✨ Resumen Ejecutivo

**Progreso**: 40% foundation completado
**Listo para**: Ejecutar 2 suites + implementar 24 restantes
**Estimado total**: 2-3 semanas para 100%

**Siguiente acción INMEDIATA**:
1. Crear `.env.test` con variables de Supabase
2. Ejecutar seed data SQL
3. Ejecutar `npx playwright test --ui`

**Created**: 2025-10-20
**Status**: Ready to Run ✅
