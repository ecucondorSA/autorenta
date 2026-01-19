# Analisis GitHub - AutoRenta

Fecha de analisis: 2026-01-19
Alcance: estado del repositorio, estructura, workflows de GitHub Actions, ejecuciones recientes y PRs.

## 1) Datos del repositorio
- Repo: ecucondorSA/autorenta
- URL remoto: https://github.com/ecucondorSA/autorenta.git
- Rama por defecto: main
- Visibilidad: public
- Licencia: MIT
- Descripcion (GitHub): "Marketplace MVP para alquiler de autos en Argentina - Angular 20 + Supabase + Cloudflare"
- Creado: 2025-10-16T19:10:33Z
- Actualizado: 2026-01-19T06:08:55Z
- Lenguaje primario: TypeScript
- Features habilitadas: issues, projects, wiki
- Discussions: deshabilitado
- Release mas reciente: v3.2.3 (publicado 2026-01-19T06:08:53Z)

## 2) Estado local y versionado
- Ultimo commit en main (local): 21ec67fc "fix(db): correct column names in public_owner_info view" (2026-01-19 03:07:45 -0300)
- Version en package.json (root): 2.19.3
- Release tags recientes (GitHub): v3.2.3, v3.2.2, v3.2.1, v3.2.0, v3.1.4, v3.1.3, v3.1.2, v3.1.1, v3.1.0, v3.0.0

## 3) Estructura del repo (alto nivel)
- apps/web: frontend Angular 20 + Ionic 8, PWA + Capacitor Android
- apps/social-publisher: tooling para publicacion/marketing
- supabase/functions: 90 funciones Edge (excluye _shared)
- supabase/migrations: 99 migraciones SQL
- workers/autorent-pdf-generator: Cloudflare Worker
- docs: documentacion extensa (operaciones, seguridad, marketing, legal, auditorias)

## 4) Dependabot y ownership
- dependabot.yml:
  - NPM root y /apps/web: semanal (lunes AM, zona America/Argentina/Buenos_Aires)
  - GitHub Actions: mensual (dia 1, 10:00)
- CODEOWNERS: asigna @ecucondorSA a todo el repo y rutas criticas

## 5) GitHub Actions - inventario y triggers
- Total workflows: 61
- Con schedule: 32
- Con push: 14
- Con pull_request: 16
- Con workflow_dispatch: 49

### 5.1) Workflows core (CI/PR)
- ci.yml: gates de build, lint, E2E; unit tests informativos; bundle analysis
- pr-validation.yml: size check, secrets check, console.log, lint, typecheck, orphan lint
- code-coverage.yml: coverage en PR/push
- validate-lockfile.yml: valida lockfile en PR
- sql-tests.yml y contracts.yml: validaciones DB
- audit-on-pr.yml: auditoria DB y lint de migraciones
- types-sync-check.yml: sincronizacion de tipos
- verify-selectors.yml: verificacion de selectores

### 5.2) Release/Deploy
- build-and-deploy.yml: valida, aplica migraciones, build web, despliegue Cloudflare Pages, smoke tests
- deploy-workers.yml: despliegue Workers
- semantic-release.yml: semantic-release y trigger Android build
- release.yml / release-production.yml / production-release.yml: pipeline de release
- android-pre-submit-check.yml / build-android.yml / android-release.yml: Android build/release

### 5.3) Monitoreo/operaciones y marketing (schedule)
- uptime-monitoring.yml: cada 30 min
- mercadopago-api-health.yml: cada 4h
- error-rate-monitoring.yml: cada 8h
- fraud-detection-alerts.yml: cada 6h
- update-exchange-rates.yml: cada 6h
- cleanup-expired-data.yml: diario 07:00 UTC
- database-backup-verify.yml: diario 04:00 UTC
- edge-function-performance.yml: diario 06:00 UTC
- daily-metrics-report.yml: diario 11:00 UTC
- daily-social-media-post.yml: diario 13:00 UTC
- storage-usage-alert.yml: diario 05:00 UTC
- notification-delivery-audit.yml: diario 10:00 UTC
- wallet-balance-audit.yml: diario 08:00 UTC
- pending-payouts-alert.yml: diario 13:00 UTC
- weekly-business-summary.yml: lunes 12:00 UTC
- weekly-content-batch.yml: domingo 23:00 UTC
- newsletter-weekly.yml: viernes 14:00 UTC
- commission-reconciliation.yml: domingo 09:00 UTC
- monthly-marketing-campaign.yml: dia 1 12:00 UTC
- sync-fipe-prices-monthly.yml: dia 1 03:00 UTC

## 6) Estado de ejecuciones recientes (2026-01-19)
### 6.1) CI (run 21127159490)
- Evento: push (commit "fix(db): correct column names in public_owner_info view")
- Fecha: 2026-01-19T06:08:04Z
- Resultado: failure
- Fallas principales:
  - Lint Gate: uso de any y variables sin uso en
    apps/web/src/app/shared/components/selfie-capture/selfie-capture.component.ts
    Lineas reportadas: 279, 413, 453, 454, 455, 489, 494
  - E2E Gate: fallo al ejecutar tests criticos
  - Unit Tests: fallo (marcado como tech debt)

### 6.2) Production Readiness (run 21129928066)
- Evento: schedule
- Fecha: 2026-01-19T08:09:49Z
- Resultado: failure
- Fallas principales:
  - Quality Gate: mismo error de lint en selfie-capture.component.ts
  - Unit Tests & Coverage: fallo
  - E2E Smoke Tests: se ejecuto con continue-on-error; job OK, pero el step reporto exit code 1

### 6.3) Semantic Release (run 21127159551)
- Evento: push
- Fecha: 2026-01-19T06:08:04Z
- Resultado: failure
- Motivo: workflow usa npm ci pero no existe package-lock.json en el repo (se usa pnpm)

### 6.4) Workflows con "workflow file issue"
- Se reportaron fallas por validacion de workflow en ejecuciones con evento push.
- Ejemplos:
  - .github/workflows/error-rate-monitoring.yml (run 21127159003)
  - .github/workflows/fraud-detection-alerts.yml (run 21127159146)

## 7) PRs abiertas (al 2026-01-19)
- #205 (DRAFT) Fix Android build failure - Add minimal capacitor-cordova-android-plugins structure
- #204 (DRAFT) fix(ci): add required permissions to release workflow
- #203 (DRAFT) Implement complete e2e testing infrastructure with Playwright including booking and payment flow tests
- #190 (DRAFT) Complete Porsche Publication E2E Test
- #189 (OPEN) feat: UI Implementation - Design System & Flow Refactoring (Issue #186)

## 8) Hallazgos y acciones sugeridas
1) Corregir lint en selfie-capture.component.ts (remover any, ajustar tipos y variables sin uso) para desbloquear CI y Production Readiness.
2) Unificar el package manager en workflows: reemplazar npm ci por pnpm en semantic-release.yml y pr-validation.yml, o agregar lockfile npm (recomendado: pnpm).
3) Revisar workflows que fallan con "workflow file issue" para validar sintaxis y activar nuevamente los jobs de monitoreo.

Fin del informe.
