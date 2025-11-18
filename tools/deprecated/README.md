# Scripts Deprecados

⛔ **NO USAR ESTOS SCRIPTS**

## Por Qué Están Aquí

Estos scripts fueron creados durante desarrollo para fix masivo de ESLint, pero:

- ❌ Lógica duplicada (4 implementaciones del mismo problema)
- ❌ Sin tests automatizados
- ❌ Modifican código sin verificación
- ❌ Pueden romper funcionalidad

## Scripts en Este Directorio

### comprehensive-fix.py (230 líneas)
- **Creado**: 2025-11
- **Problema**: Fix masivo de ESLint con regex
- **Reemplazo**: `tools/fix-eslint.js` O `npm run lint:fix`

### smart-fix.py (232 líneas)
- **Creado**: 2025-11
- **Problema**: Versión "inteligente" de comprehensive-fix.py
- **Reemplazo**: `tools/fix-eslint.js` O `npm run lint:fix`

### final-fix.sh (33 líneas)
- **Creado**: 2025-11
- **Problema**: Bash + Perl in-place replacement
- **Reemplazo**: `tools/fix-eslint.js` O `npm run lint:fix`

## ¿Qué Usar en Su Lugar?

### Para fixes automáticos de ESLint:

```bash
# Opción 1: Herramienta oficial (RECOMENDADO)
npm run lint:fix

# Opción 2: Script consolidado (emergencias)
node tools/fix-eslint.js
```

### Para fixes manuales:

1. Ver errores: `npm run lint`
2. Entender cada error
3. Arreglar manualmente
4. Verificar: `npm run test:quick`

## Historia

Estos scripts se crearon cuando el proyecto acumuló > 500 errores de ESLint por:
- Cambio a TypeScript strict mode
- Upgrade de Angular 17
- Nuevas reglas de ESLint

En lugar de arreglar la causa raíz, se crearon "parches de desesperación".

**Lección aprendida**: No crear scripts de fix masivo sin tests automatizados.

---

**Deprecados**: 2025-11-18 (Tech Debt Remediation)
**Mantener hasta**: 2026-01-01 (luego eliminar completamente)
