# 📚 Documentación AutoRenta

**Última actualización**: 2025-11-05

## Índice

### 🚀 Operaciones

- **[Guía de Deployment](./deployment-guide.md)** - Cómo desplegar la aplicación
- **[Disaster Recovery Plan](./disaster-recovery-plan.md)** - Plan de recuperación ante desastres
- **[Runbooks](./runbooks/)** - Procedimientos operativos específicos

### 🔧 Runbooks

- **[Troubleshooting General](./runbooks/troubleshooting.md)** - Solución de problemas comunes
- **[Split Payment Failure](./runbooks/split-payment-failure.md)** - Problemas con pagos divididos
- **[Database Backup & Restore](./runbooks/database-backup-restore.md)** - Backup y restauración de DB
- **[Secret Rotation](./runbooks/secret-rotation.md)** - Rotación de secrets

### 📊 Contabilidad

- **[Política Contable](./accounting/POLITICA_CONTABLE_AUTORENTA.md)** - Políticas contables
- **[Estados Financieros Template](./accounting/ESTADOS_FINANCIEROS_TEMPLATE.md)** - Templates contables

### 🏗️ Roadmap de Producción

- **[Resumen Ejecutivo](./production-roadmap/00-RESUMEN-EJECUTIVO.md)** - Estado general
- **[Fases de Implementación](./production-roadmap/)** - Fases 1-7 del roadmap

### 📋 Especificaciones Técnicas

- **[Especificaciones](./technical-specs/)** - Specs de features específicas

### 🧪 Testing y QA

- **[Plan de Testing de la Plataforma](./testing/TESTING_PLAN.md)** - Plan completo de testing (Unit, Integration, E2E)
- **[Resumen Ejecutivo - Testing](./testing/TESTING_PLAN_SUMMARY.md)** - Resumen ejecutivo del plan de testing
- **[TestSprite MCP Integration](./implementation/TESTSPRITE_MCP_INTEGRATION_SPEC.md)** - Integración de testing automatizado con IA
- **[PRD Template](./templates/testsprite-prd-template.md)** - Template para Product Requirements Documents
- **[E2E Tests README](../tests/e2e/README.md)** - Guía de tests E2E automatizados
- **[Testing Commands](./TESTING_COMMANDS.md)** - Comandos de testing disponibles

### 📝 Product Requirements Documents (PRDs)

**PRDs P0 (Críticos)**:
- **[Booking Flow (Locatario)](./prd/booking-flow-locatario.md)** - Flujo completo de reserva de autos
- **[Wallet Deposit Flow](./prd/wallet-deposit-flow.md)** - Depósito de fondos con MercadoPago

**PRDs de Ejemplo**:
- **[Homepage Validation Test](./prd/homepage-validation-test.md)** - Test de validación básico

### 📐 Templates

- **[PRD Template](./templates/testsprite-prd-template.md)** - Template para documentar features
- **[Config Example](../.claude/config.json.example)** - Ejemplo de configuración MCP

### 📈 Reportes

- **[Reportes](./reports/)** - Análisis y reportes del proyecto

---

## Guía Rápida

### Para Developers

1. **Primera vez**: Lee [CLAUDE.md](../CLAUDE.md) para entender la arquitectura
2. **Deploy**: Consulta [Guía de Deployment](./deployment-guide.md)
3. **Testing**: Consulta [TestSprite MCP Integration](./implementation/TESTSPRITE_MCP_INTEGRATION_SPEC.md)
4. **Problemas**: Consulta [Troubleshooting](./runbooks/troubleshooting.md)

### Para DevOps

1. **Deployment**: [Guía de Deployment](./deployment-guide.md)
2. **Incidentes**: [Disaster Recovery Plan](./disaster-recovery-plan.md)
3. **Backups**: [Database Backup & Restore](./runbooks/database-backup-restore.md)

### Para QA

1. **Testing automatizado**: [TestSprite MCP Integration](./implementation/TESTSPRITE_MCP_INTEGRATION_SPEC.md)
2. **Crear PRDs**: Usa [PRD Template](./templates/testsprite-prd-template.md)
3. **PRDs P0 existentes**: [Booking Flow](./prd/booking-flow-locatario.md), [Wallet Deposit](./prd/wallet-deposit-flow.md)
4. **Testing manual**: [Testing Commands](./TESTING_COMMANDS.md)

### Para Management

1. **Estado**: [Roadmap de Producción](./production-roadmap/00-RESUMEN-EJECUTIVO.md)
2. **Contabilidad**: [Política Contable](./accounting/POLITICA_CONTABLE_AUTORENTA.md)

---

## Estructura de Documentación

```
docs/
├── README.md (este archivo)
├── ARCHIVE_INDEX.md              # Índice de archivos archivados
├── deployment-guide.md            # Guía de deployment
├── disaster-recovery-plan.md      # Plan de recuperación
├── runbooks/                      # Procedimientos operativos
│   ├── troubleshooting.md
│   ├── split-payment-failure.md
│   ├── database-backup-restore.md
│   └── secret-rotation.md
├── archived/                      # Archivos históricos organizados
│   ├── sessions/                  # Resúmenes de sesiones
│   ├── sprints/                   # Resúmenes de sprints
│   ├── summaries/                 # Resúmenes ejecutivos
│   └── old/                       # Archivos antiguos
├── implementation/                # Documentación de implementación
│   ├── TESTSPRITE_MCP_INTEGRATION_SPEC.md  # Spec de integración TestSprite
│   ├── features/                  # Features implementadas
│   ├── fixes/                     # Fixes y correcciones
│   └── guides/                    # Guías de implementación
├── templates/                     # Templates reutilizables
│   └── testsprite-prd-template.md # Template para PRDs
├── audits/                        # Auditorías
│   ├── code/                      # Auditorías de código
│   ├── database/                  # Auditorías de DB
│   ├── security/                  # Auditorías de seguridad
│   └── features/                  # Auditorías de features
├── reports/                       # Reportes
│   ├── status/                    # Reportes de estado
│   ├── testing/                   # Reportes de testing
│   ├── deployment/                # Reportes de deployment
│   └── analysis/                  # Análisis
├── guides/                        # Guías
│   ├── setup/                     # Guías de setup
│   ├── deployment/                # Guías de deployment
│   └── features/                  # Guías de features
├── accounting/                    # Documentación contable
├── production-roadmap/            # Roadmap de producción
├── technical-specs/               # Especificaciones técnicas
└── reports/                       # Reportes y análisis (legacy)
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

**Mantenedor**: Equipo de Desarrollo AutoRenta

