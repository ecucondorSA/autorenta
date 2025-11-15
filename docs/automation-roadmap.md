# Automatización del flujo de Issues → PR → Merge

Este documento describe cómo delegar la mayor parte del ciclo de desarrollo a agentes (GitHub Actions, Copilot, ChatGPT) dejando la decisión de merge final en un humano responsable.

## 🎯 Objetivo
- Crear issues estandarizados que contengan el contexto mínimo para que un bot pueda preparar la rama y un PR _draft_.
- Ejecutar validaciones (lint, tests, build) de forma automática en cada commit.
- Notificar al dueño responsable cuando el PR esté listo para revisión humana y merge.

## 🧩 Componentes
1. **Plantilla `auto-task`** (`.github/ISSUE_TEMPLATE/auto-task.yml`)
   - Obliga a detallar alcance, criterios de aceptación, pruebas y responsable humano.
   - Añade labels `auto-task` + `needs-scope` para que los workflows sepan qué hacer.
2. **Workflow `auto-task.yml`** (`.github/workflows/auto-task.yml`)
   - Se dispara cuando un issue recibe la etiqueta `auto-task`.
   - Crea/actualiza la rama `auto/issue-<n>` y genera `tasks/ISSUE-<n>.md` con el contexto.
   - Abre (o actualiza) un PR draft enlazado al issue y deja comentario informativo.
3. **Workflows de validación existentes** (`pr-validation.yml`, `ci.yml`, etc.)
   - Corren lint, type-check, tests y build. Su resultado debe ser requerido en branch protection.
4. **Merge humano + Merge Queue** (opcional)
   - El humano designado (`Dueño responsable`) revisa el PR, quita la etiqueta `needs-scope` y aprueba.
   - Se puede habilitar merge automático (squash) una vez que haya aprobación + checks verdes.

## 🛠️ Cómo usarlo paso a paso
1. **Crear Issue con la plantilla**
   - `Issues → New issue → ⚙️ Auto Task`.
   - Rellenar todos los campos y asignar la etiqueta `auto-task` (puede llegar por defecto si se configura en la plantilla).
2. **Workflow ejecuta bootstrap**
   - Crea/actualiza rama `auto/issue-<n>`.
   - Genera `tasks/ISSUE-<n>.md` con checklist inicial.
   - Abre PR draft `[auto] <titulo del issue>` y comenta en el issue con enlaces.
3. **Agentes trabajan en la rama**
   - Copilot Workspace, ChatGPT Agents o scripts personalizados pueden clonar la rama y subir commits.
   - Cada push dispara `pr-validation.yml` y workflows existentes.
4. **Revisión y merge**
   - Dueño responsable revisa resumen en el PR.
   - Si todo está OK, quita `needs-scope`, aprueba y ejecuta merge (o activa automerge si se desea).

## ✅ Buenas prácticas
- **Checklist en `tasks/ISSUE-<n>.md`**: Actualízalo con notas de progreso para dejar trazabilidad.
- **Protecciones de rama**: Configura `Settings → Branches` para exigir `pr-validation`, `ci` y `code-coverage` antes de merge.
- **Automerge controlado**: Solo habilita `gh pr merge --auto --squash` si el PR tiene etiqueta `automerge` + aprobación humana.
- **Agentes con permisos mínimos**: Usa PATs o tokens con alcance limitado (`contents:write`, `pull_request:write`). No compartas secrets de producción.

## 🚀 Próximos pasos sugeridos
- Añadir workflow que quite `needs-scope` automáticamente cuando haya al menos una aprobación humana.
- Integrar `danger-js` o `reviewdog` para aplicar reglas adicionales de revisión.
- Explorar GitHub Merge Queue para serializar merges y evitar regresiones.

## 🛠️ Crear issues automáticamente desde los borradores
Si ya tienes los borradores en `docs/auto-task-issues.md`, puedes crear issues automáticamente desde esa fuente usando el script y workflow proporcionados.

- Ejecutar local (recomendado primero en dry-run):
```
python3 scripts/create_issues_from_docs.py --dry-run
```

- Crear issues reales (local):
```
python3 scripts/create_issues_from_docs.py --dry-run false --repo ecucondorSA/autorenta --assignee @ecucondorSA
```

- Ejecutar a través de GitHub Actions:
1. Ve a Actions → "Auto Issues Create" → Run workflow.
2. Deja el valor `create` por defecto (false) para hacer dry-run o pon `true` para crear realmente los issues.

Usa este flujo con cautela y revisa los resultados del dry-run antes de crear issues reales.

> Mantén este documento actualizado cuando cambie el proceso de automatización.
