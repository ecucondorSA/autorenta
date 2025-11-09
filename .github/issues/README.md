# GitHub Issues - Launch Checklist Templates

Estos son los 4 issues que debes crear manualmente en GitHub para trackear tu lanzamiento.

---

## 📝 Cómo Crear los Issues

### Método Manual (Recomendado):

1. Ve a: https://github.com/ecucondorSA/autorenta/issues
2. Click: **New Issue**
3. Copia el contenido de cada sección abajo
4. Pega en el issue
5. Asigna labels correspondientes
6. Asígnate el issue a ti mismo
7. Click: **Submit new issue**

### Método con gh CLI:

Si prefieres usar terminal (necesitas permisos configurados):

```bash
# Issue 1
gh issue create --title "🔒 Día 1: Seguridad y Deployment Crítico" \
  --label "P0,deployment,security" \
  --assignee @me \
  --body-file .github/issues/issue-1-day-1.md

# Issue 2
gh issue create --title "📚 Día 2: Documentación y Preparación" \
  --label "documentation,P1" \
  --assignee @me \
  --body-file .github/issues/issue-2-day-2.md

# Y así para los demás...
```

---

## 🔒 ISSUE #1: Día 1 - Seguridad y Deployment Crítico

**Title**: `🔒 Día 1: Seguridad y Deployment Crítico (Launch Checklist)`

**Labels**: `P0`, `deployment`, `security`

**Assignees**: @me

**Body**: (Ver archivo `.github/issues/issue-1-day-1.md`)

---

## 📚 ISSUE #2: Día 2 - Documentación y Preparación

**Title**: `📚 Día 2: Documentación y Preparación (Launch Checklist)`

**Labels**: `documentation`, `P1`

**Assignees**: @me

**Body**: (Ver archivo `.github/issues/issue-2-day-2.md`)

---

## 🚀 ISSUE #3: Día 3 - Lanzamiento

**Title**: `🚀 Día 3: Lanzamiento (Launch Checklist)`

**Labels**: `P0`, `launch`

**Assignees**: @me

**Body**: (Ver archivo `.github/issues/issue-3-day-3.md`)

---

## 📊 ISSUE #4: Post-Lanzamiento - Primera Semana

**Title**: `📊 Post-Lanzamiento: Primera Semana (Monitoring)`

**Labels**: `monitoring`, `P1`

**Assignees**: @me

**Body**: (Ver archivo `.github/issues/issue-4-post-launch.md`)

---

## 🎯 Workflow Sugerido

```
1. Crear los 4 issues
2. Marcar Issue #1 como "In Progress"
3. Ir checkeando cada tarea
4. Al completar Día 1 → Cerrar Issue #1
5. Abrir Issue #2 y repetir
```

---

## 📱 Notificaciones

Para recibir notificaciones cuando marques checkboxes:

1. GitHub → Settings → Notifications
2. Enable: "Participating and @mentions"
3. Recibirás email cada vez que checkees una tarea

---

## 🔗 Links Útiles

- [Documentación completa](../LAUNCH_CHECKLIST.md)
- [Production Readiness Report](../PRODUCTION_READINESS_FINAL_REPORT.md)
- [Code Analysis](../CODE_ANALYSIS_REPORT.md)
