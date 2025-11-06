# 🚀 Quick Start - Code Review Setup

**Tiempo estimado**: 10 minutos

## ✅ Paso 1: Configurar Branch Protection (5 min)

### Opción A: GitHub UI (RECOMENDADO)

1. Ir a: https://github.com/ecucondorSA/autorenta/settings/branches
2. Click en "Add rule"
3. Branch name: `main`
4. Marcar:
   - ✅ Require 1 approval
   - ✅ Require status checks to pass
   - ✅ Require conversation resolution
   - ✅ Include administrators
5. Click "Create"

### Opción B: GitHub CLI

```bash
# Ejecutar desde el repositorio
cd /home/edu/autorenta

# Crear script de configuración
cat > setup-branch-protection.sh << 'EOF'
#!/bin/bash
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
  -f 'required_conversation_resolution=true' \
  -f 'allow_force_pushes=false' \
  -f 'allow_deletions=false'
EOF

chmod +x setup-branch-protection.sh
./setup-branch-protection.sh
```

---

## ✅ Paso 2: Verificar (2 min)

```bash
# Verificar que branch protection está activa
gh api repos/ecucondorSA/autorenta/branches/main/protection

# Debería mostrar configuración de protección
```

---

## ✅ Paso 3: Probar (3 min)

1. Crear un PR de prueba
2. Verificar que no se puede mergear sin aprobación
3. Aprobar el PR
4. Verificar que ahora se puede mergear

---

## 📚 Documentación Completa

- **Branch Protection Setup**: `.github/BRANCH_PROTECTION_SETUP.md`
- **Code Review Guidelines**: `.github/CODE_REVIEW_GUIDELINES.md`
- **PR Process**: `docs/PR_PROCESS.md`
- **PR Template**: `.github/pull_request_template.md`

---

## 🎯 Resultado

Después de estos 3 pasos:

- ✅ Code review obligatorio activo
- ✅ PRs no se pueden mergear sin aprobación
- ✅ CI checks deben pasar
- ✅ Proceso de PR mejorado

---

**¡Listo!** 🎉


