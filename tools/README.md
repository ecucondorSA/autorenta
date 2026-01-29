# Tools - Scripts de Utilidad

## Scripts Activos

### fix-eslint.js

**Script oficial para fixes automáticos de ESLint**

```bash
node tools/fix-eslint.js
```

**Qué hace**:
- Parsea output de `npm run lint`
- Aplica fixes automáticos para errores comunes:
  - `no-unused-vars` → Prefija con `_`
  - `no-explicit-any` → Cambia a `unknown`
  - `no-empty-object-type` → Cambia `{}` a `object`
  - `import/order` → Reorganiza imports

**Cuándo usarlo**:
- ⚠️ **SOLO en emergencias** - No es reemplazo de `eslint --fix`
- Después de merges grandes con muchos conflictos
- Cuando ESLint tiene > 100 errores acumulados

**NO usar**:
- ❌ En desarrollo normal (usar `npm run lint:fix`)
- ❌ Antes de entender los errores
- ❌ Sin backup previo (`git commit` primero)

**Tests**: Ejecutar `npm test tools/fix-eslint.spec.js` para verificar

---

## Scripts Deprecados

**Ubicación**: `tools/deprecated/`

### ⛔ comprehensive-fix.py
### ⛔ smart-fix.py
### ⛔ final-fix.sh

**Estado**: DEPRECADOS (2025-11-18)

**Razón**: Lógica duplicada, sin tests, modificaban código sin verificación

**NO USAR** - Mantenerlos solo como referencia histórica

Si necesitas fix-eslint automático, usar `tools/fix-eslint.js`

---

## Mejores Prácticas

### Orden de preferencia para arreglar ESLint:

1. **Manual** - Entender y arreglar cada error
2. **eslint --fix** - Usar herramienta oficial: `npm run lint:fix`
3. **fix-eslint.js** - Solo en emergencias (> 100 errores)

### Antes de usar cualquier script:

```bash
# 1. Commit actual
git add -A
git commit -m "wip: before running fix script"

# 2. Ejecutar script
node tools/fix-eslint.js

# 3. Verificar cambios
git diff

# 4. Verificar que lint mejoró
npm run lint

# 5. Verificar que tests pasan
npm run test:quick
```

---

## Agregar Nuevo Script

1. Crear archivo en `tools/` con nombre descriptivo
2. Agregar shebang si es ejecutable: `#!/usr/bin/env node`
3. Documentar en este README
4. Agregar tests en `tools/*.spec.js`
5. No hardcodear paths (usar `path.join(__dirname, ...)`)

---

**Última actualización**: 2025-11-18 (Tech Debt Remediation)
