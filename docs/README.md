# 📚 Documentación AutoRenta

**Última actualización**: 2025-11-22

## Índice

### 🚀 Operaciones y DevOps

- **[Manual de Operaciones (Runbooks)](./runbooks/OPS_MANUAL.md)** - Procedimientos operativos consolidados
- **[Manual de Despliegue](./devops/DEPLOYMENT_MANUAL.md)** - Guías de deploy
- **[Disaster Recovery Plan](./disaster-recovery-plan.md)** - Plan de recuperación ante desastres
- **[Infraestructura](./devops/infrastructure/)** - Documentación de infraestructura
- **[Monitoreo](./devops/monitoring/)** - Guías de monitoreo

### 🎨 Diseño y UX

- **[Sistema de Color](./design/COLOR_SYSTEM.md)** - Guía de colores
- **[Guía Responsiva](./design/RESPONSIVE_GUIDE.md)** - Pautas de diseño responsivo
- **[Sistema de Diseño](./design/DESIGN_SYSTEM.md)** - Componentes y tokens

### 🏗️ Arquitectura y Features

- **[Catálogo de Features](./features/FEATURE_CATALOG.md)** - Documentación de funcionalidades
- **[Flujo de Reserva](./architecture/BOOKING_FLOW.md)** - Diagrama y explicación del flujo
- **[Sistema de Pagos](./architecture/PAYMENT_SYSTEM.md)** - Arquitectura híbrida de pagos
- **[Flujo OAuth](./architecture/OAUTH_FLOW.md)** - Implementación de autenticación

### 💳 MercadoPago

- **[Guía de Integración MP](./mercadopago/MP_INTEGRATION_GUIDE.md)** - Setup, operaciones y auditoría

### 📊 Contabilidad (FGO)

- **[Manual Contable FGO](./accounting/FGO_MANUAL.md)** - Sistema, políticas y métricas

### 🔒 Seguridad

- **[Runbook: Migraciones de Seguridad](./runbooks/apply-security-migrations.md)** - ⚠️ CRÍTICO

### 📚 Guías de Desarrollo

- **[Guía de Configuración (Setup)](./guides/SETUP_MASTER.md)** - 🛠️ Índice de configuraciones
- **[Guía de Usuario Final](./guides/USER_GUIDE.md)** - Manual de usuario
- **[Workflow de Chrome](./guides/CHROME_WORKFLOW.md)** - Flujo de trabajo con Chrome
- **[Cheat Sheet MCP](./guides/MCP_CHEATSHEET.md)** - Referencia rápida de MCP
- **[Proceso de PR](./guides/PR_PROCESS.md)** - Guía para Pull Requests
- **[Comandos de Testing](./guides/TESTING.md)** - Comandos útiles

---

## Estructura de Documentación

```
docs/
├── README.md (este archivo)
├── archive.zip                    # 📦 Archivo Histórico Comprimido
├── design/                        # Guías de diseño y UI
├── devops/                        # Manual de despliegue e infraestructura
├── architecture/                  # Documentación de arquitectura
├── accounting/                    # Manual contable (FGO)
├── mercadopago/                   # Guía de integración MP
├── guides/                        # Guías generales y Setup Master
├── features/                      # Catálogo de features
└── runbooks/                      # Manual de operaciones
```


**Nota**: Se organizaron ~400 archivos .md desde el root del proyecto (2025-11-03).

---

## Contribuir a la Documentación

### Cuándo Crear Documentación

Según [CLAUDE.md](../CLAUDE.md):

- ✅ **SÍ crear**: Runbooks operativos, guías de deployment, disaster recovery
- ✅ **SÍ crear**: Cambios arquitectónicos importantes
- ❌ **NO crear**: Documentación para tareas rutinarias (Cursor es la doc viva)

### Formato

- Usar Markdown
- Incluir fecha de última actualización
- Incluir índice para documentos largos
- Incluir referencias a código relevante

---

## 🔧 Tech Debt Remediation (2025-11-18)

**Status**: En progreso (Branch: `tech-debt-remediation`)
**Progreso**: 17/25 tareas (68%)

### Logros Recientes

- ✅ **Scripts consolidados**: 5 → 1 script ESLint (-80%)
- ✅ **Tests habilitados**: +11 archivos críticos
- ✅ **Docs limpiados**: -298 archivos obsoletos (-3.7MB)
- ✅ **Security P0 fixes**: RLS + Constraints + Admin validation
- ✅ **CI/CD mejorado**: Coverage bloqueante + E2E automático

### Documentos Clave

- [Tech Debt Baseline](../TECH_DEBT_BASELINE.md) - Estado inicial
- [Security Audit](../SECURITY_AUDIT_WALLET_BOOKINGS.md) - Vulnerabilidades P0
- [Apply Security Migrations](./runbooks/apply-security-migrations.md) - Runbook crítico

### Próximos Pasos

1. Aplicar migraciones SQL en staging
2. Tests de validación (10 tests SQL)
3. Merge a `main`

---

**Mantenedor**: Equipo de Desarrollo AutoRenta

