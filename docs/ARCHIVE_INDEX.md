# 📦 Índice de Archivos Archivados

Este directorio contiene archivos .md que fueron movidos desde el root para organizar la documentación.

**Fecha de organización**: 2025-11-03

## Estructura

```
docs/
├── archived/
│   ├── sessions/          # Resúmenes de sesiones de trabajo
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

**Última actualización**: 2025-11-03





