# 🔒 Branch Protection Rules Setup

Este documento explica cómo configurar branch protection rules en GitHub para implementar code review obligatorio.

## 🎯 Objetivo

Configurar protecciones de branch para `main` que requieran:
- ✅ Code review obligatorio (mínimo 1 aprobación)
- ✅ CI checks deben pasar
- ✅ No merge directo a main
- ✅ No force push
- ✅ No deletion

---

## 📋 Configuración Manual en GitHub (RECOMENDADO)

### Paso 1: Acceder a Settings

1. Ir a: `https://github.com/ecucondorSA/autorenta/settings/branches`
2. O: Settings → Branches → Branch protection rules

### Paso 2: Agregar Regla para `main`

1. Click en "Add rule" o "Add branch protection rule"
2. Branch name pattern: `main`
3. Configurar las siguientes opciones:

#### ✅ Protecciones Requeridas

**Require a pull request before merging**:
- ✅ Require approvals: `1` (mínimo)
- ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ Require review from Code Owners (opcional, si CODEOWNERS está configurado)
- ✅ Require last push approval (opcional, pero recomendado)

**Require status checks to pass before merging**:
- ✅ Require branches to be up to date before merging
- ✅ Status checks requeridos (seleccionar después de primera ejecución):
  - `ci` (CI workflow)
  - `build` (Build workflow)
  - `lint` (Lint check)
  - `test` (Tests)
  - `pr-validation` (PR Validation workflow - nuevo)

**Require conversation resolution before merging**:
- ✅ Require all conversations on code to be resolved

**Require signed commits** (Opcional pero recomendado):
- ✅ Require signed commits

**Require linear history** (Opcional):
- ✅ Require linear history

**Include administrators**:
- ✅ ✅ Include administrators (aplicar reglas también a admins)

**Restrict who can push to matching branches**:
- ❌ No marcar (dejar que todos puedan crear PRs)

**Allow force pushes**:
- ❌ ❌ No permitir force push

**Allow deletions**:
- ❌ ❌ No permitir deletion

### Paso 3: Guardar

1. Click en "Create" o "Save changes"
2. Verificar que la regla aparece en la lista

---

## 🔧 Configuración Automática (GitHub CLI)

Si tienes GitHub CLI configurado, puedes usar este script:

```bash
#!/bin/bash

# Crear archivo JSON temporal con la configuración
cat > /tmp/branch-protection.json << 'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "ci",
      "build",
      "lint",
      "test",
      "pr-validation"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true,
  "require_linear_history": false
}
EOF

# Aplicar configuración
gh api repos/ecucondorSA/autorenta/branches/main/protection \
  --method PUT \
  --input /tmp/branch-protection.json

# Limpiar
rm /tmp/branch-protection.json
```

**Nota**: Requiere permisos de administrador en el repositorio.

**Alternativa más simple** (usando formato correcto):

```bash
gh api repos/ecucondorSA/autorenta/branches/main/protection \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  -f 'required_status_checks[strict]=true' \
  -f 'required_status_checks[contexts][]=ci' \
  -f 'required_status_checks[contexts][]=build' \
  -f 'required_status_checks[contexts][]=lint' \
  -f 'required_status_checks[contexts][]=test' \
  -f 'required_status_checks[contexts][]=pr-validation' \
  -f 'enforce_admins=true' \
  -f 'required_pull_request_reviews[required_approving_review_count]=1' \
  -f 'required_pull_request_reviews[dismiss_stale_reviews]=true' \
  -f 'required_pull_request_reviews[require_code_owner_reviews]=false' \
  -f 'required_conversation_resolution=true' \
  -f 'allow_force_pushes=false' \
  -f 'allow_deletions=false'
```

---

## 📝 Configuración de CODEOWNERS

Para que funcione "Require review from Code Owners", actualiza `.github/CODEOWNERS`:

```bash
# .github/CODEOWNERS

# Default owners for everything
*       @ecucondorSA

# Frontend code
/apps/web/   @ecucondorSA

# Backend/Database
/supabase/   @ecucondorSA
/apps/web/database/   @ecucondorSA

# Workflows
/.github/workflows/   @ecucondorSA

# Documentation
/docs/   @ecucondorSA
*.md   @ecucondorSA
```

Ya está configurado en el repositorio ✅

---

## ✅ Verificación

### Verificar que Funciona

1. Crear un PR de prueba
2. Intentar mergear sin aprobación → **Debería fallar**
3. Agregar aprobación
4. Intentar mergear con aprobación → **Debería funcionar**

### Verificar Protecciones Activas

```bash
# Ver protección actual
gh api repos/ecucondorSA/autorenta/branches/main/protection

# Ver status checks requeridos
gh api repos/ecucondorSA/autorenta/branches/main/protection/required_status_checks
```

### Verificar en GitHub UI

1. Ir a: `https://github.com/ecucondorSA/autorenta/settings/branches`
2. Verificar que `main` aparece en la lista de branches protegidos
3. Click en `main` para ver detalles de protección

---

## 🚨 Troubleshooting

### Problema: "No se puede mergear aunque tengo aprobación"

**Solución**:
1. Verificar que todos los CI checks pasan
2. Verificar que no hay conflictos
3. Verificar que todas las conversaciones están resueltas
4. Verificar que el branch está actualizado con main

### Problema: "CI checks no aparecen como requeridos"

**Solución**:
1. Los checks deben ejecutarse al menos una vez en el branch
2. Ir a Settings → Branches → Editar regla
3. Buscar los checks en la lista y marcarlos como requeridos
4. Los checks aparecerán después de la primera ejecución del workflow

### Problema: "Admins pueden mergear sin aprobación"

**Solución**:
1. Ir a Settings → Branches → Editar regla
2. Marcar "Include administrators"
3. Guardar cambios

### Problema: "GitHub CLI dice 'Invalid request'"

**Solución**:
1. Usar configuración manual en GitHub UI (más confiable)
2. O usar el script JSON proporcionado arriba
3. Verificar que tienes permisos de administrador

---

## 📊 Impacto Esperado

Después de implementar estas protecciones:

- ✅ **0 PRs mergeados sin review** (vs actual: 100%)
- ✅ **Todos los PRs tienen CI passing** antes de merge
- ✅ **Mejor calidad de código** (revisión obligatoria)
- ✅ **Menos bugs en producción** (detección temprana)

---

## 🔄 Rollback (Si es Necesario)

Si necesitas desactivar temporalmente las protecciones:

```bash
# Desactivar protección (requiere admin)
gh api repos/ecucondorSA/autorenta/branches/main/protection \
  --method DELETE
```

**⚠️ ADVERTENCIA**: Solo hacer esto en emergencias. Siempre reactivar después.

---

## 📚 Referencias

- [GitHub Docs: Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub Docs: CODEOWNERS](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- [GitHub API: Branch Protection](https://docs.github.com/en/rest/branches/branch-protection)

---

**Última actualización**: 2025-11-05  
**Mantenedor**: AutoRenta Team
