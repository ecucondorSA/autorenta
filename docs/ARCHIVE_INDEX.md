# 📦 Índice de Archivos Archivados

Este directorio contiene archivos .md que fueron movidos desde el root para organizar la documentación.

**Fecha de organización**: 2025-11-06 (Consolidación Agresiva)

## Última Consolidación (2025-11-06)

✅ **Root**: Reducido de 52 → 7 archivos esenciales
✅ **apps/web**: Reducido de 29 → 1 archivo (README.md)
✅ **Archivados**: 61 archivos movidos a `sessions/2025-11/`
✅ **Eliminados**: 3 archivos redundantes (*_OLD*.md)

## Estructura

```
docs/
├── archived/
│   ├── sessions/          # Resúmenes de sesiones de trabajo
│   │   └── 2025-11/       # ⭐ Consolidación agresiva Nov 2025 (61 archivos)
│   ├── sprints/           # Resúmenes de sprints
│   ├── summaries/         # Resúmenes ejecutivos y generales
│   └── old/               # Archivos antiguos o sin categoría clara
├── implementation/
│   ├── features/          # Documentación de implementación de features
│   ├── fixes/             # Documentación de fixes y correcciones
│   └── guides/             # Guías de implementación
├── audits/
│   ├── code/              # Auditorías de código
│   ├── database/          # Auditorías de base de datos
│   ├── security/          # Auditorías de seguridad
│   └── features/          # Auditorías de features específicas
├── reports/
│   ├── status/            # Reportes de estado
│   ├── testing/           # Reportes de testing
│   ├── deployment/        # Reportes de deployment
│   └── analysis/          # Análisis y reportes de análisis
└── guides/
    ├── setup/             # Guías de setup y configuración
    ├── deployment/        # Guías de deployment (duplicados)
    └── features/          # Guías de features específicas
```

## Notas

- **Archivos críticos NO movidos**: `CLAUDE.md`, `README.md`, `CONTRIBUTING.md`, etc.
- **Referencias**: Si un archivo referenciaba otro archivo movido, puede necesitar actualización.
- **Búsqueda**: Usa `grep -r` para buscar referencias a archivos movidos.

## Búsqueda Rápida

```bash
# Buscar referencias a archivos movidos
grep -r "SESSION_\|SPRINT_\|RESUMEN_" . --include="*.md" --include="*.ts" --include="*.sh"

# Buscar archivos por nombre
find docs/archived -name "*SESSION*"
find docs/implementation -name "*IMPLEMENTATION*"
```

## Restauración

Si necesitas restaurar un archivo al root:

```bash
# Ejemplo: restaurar un archivo específico
mv docs/archived/sessions/SESSION_XXX.md ./
```

---

**Última actualización**: 2025-11-06

## Archivos Consolidados (2025-11-06)

Los siguientes 61 archivos fueron movidos desde root y apps/web a `docs/archived/sessions/2025-11/`:

**Desde root (45 archivos)**:
- ANALISIS_PRS_*.md
- BONUS_MALUS_*.md (7 archivos)
- DEPLOYMENT_*.md, DEPLOY_*.md
- MONITORING_*.md, TESTING_*.md
- SESSION_*.md, IMPLEMENTATION_*.md
- Y 30+ archivos más de sesiones/implementaciones temporales

**Desde apps/web (13 archivos archivados)**:
- ANALISIS_COMPLETO_FINAL.md, AUDIT_REPORT.md
- ERROR_ANALYSIS_UPDATED.md, ERROR_RANKING_REPORT.md
- FIX_WALLET_COMPREHENSIVE.md, WALLET_DEBUG_LAB.md
- PRODUCTION_DEPLOY_SUCCESS.md
- Y 6+ archivos más de reportes temporales

**Desde apps/web (11 archivos movidos a guides)**:
- DESIGN_SYSTEM_GUIDE.md → docs/guides/setup/
- MERCADOPAGO_SETUP.md → docs/guides/setup/
- PWA_GUIDE.md → docs/guides/setup/
- SHEPHERD_*.md → docs/guides/setup/
- WALLET_SYSTEM_DOCUMENTATION_web.md → docs/archived/sessions/2025-11/ (duplicado)
- Y 6+ archivos más de guías

**Eliminados (3 archivos redundantes)**:
- docs/reports/analysis/ANALISIS_E2E_LOCADOR_OLD.md
- docs/reports/analysis/ANALISIS_E2E_LOCADOR_OLD2.md
- docs/implementation/features/IMPLEMENTATION_SUMMARY_OLD.md







