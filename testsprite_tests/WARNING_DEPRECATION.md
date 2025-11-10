# Warning de Deprecación Node.js - TestSprite

## Problema

Cuando se ejecuta TestSprite, aparece el siguiente warning:

```
(node:857581) [DEP0060] DeprecationWarning: The `util._extend` API is deprecated. 
Please use Object.assign() instead.
```

## Impacto

- ✅ **No rompe la funcionalidad**: Solo es un aviso de deprecación
- ⚠️ **Viene de una dependencia**: Probablemente `@testsprite/testsprite-mcp` o una de sus sub-dependencias
- 🔮 **Futuro**: Puede dejar de funcionar en versiones futuras de Node.js

## Solución Temporal

### Opción 1: Silenciar el warning (no recomendado en producción)

```bash
NODE_NO_WARNINGS=1 node /home/edu/.npm/_npx/8ddf6bea01b2519d/node_modules/@testsprite/testsprite-mcp/dist/index.js generateCodeAndExecute
```

### Opción 2: Ver solo la traza cuando ocurra

```bash
NODE_OPTIONS="--trace-deprecation" node /home/edu/.npm/_npx/8ddf6bea01b2519d/node_modules/@testsprite/testsprite-mcp/dist/index.js generateCodeAndExecute
```

### Opción 3: Actualizar el paquete (recomendado)

```bash
# Verificar versión actual
npx @testsprite/testsprite-mcp@latest --version

# Si hay actualización disponible, se usará automáticamente en la próxima ejecución
# (npx siempre descarga la última versión)
```

## Identificación del Origen

Para identificar exactamente qué archivo usa `util._extend`:

```bash
node --trace-deprecation /home/edu/.npm/_npx/8ddf6bea01b2519d/node_modules/@testsprite/testsprite-mcp/dist/index.js generateCodeAndExecute
```

Esto mostrará el stack trace completo indicando el archivo exacto dentro de `node_modules`.

## Solución Permanente

Si el warning viene de una sub-dependencia de TestSprite, las opciones son:

1. **Esperar actualización**: TestSprite debería actualizar sus dependencias
2. **Reportar issue**: Abrir un issue en el repositorio de TestSprite
3. **Usar patch-package** (si el paquete está en package.json):
   ```bash
   pnpm add -D patch-package postinstall-postinstall
   # Editar el archivo problemático
   # Cambiar: const extend = require('util')._extend;
   # Por: const extend = Object.assign;
   pnpm patch-package @testsprite/testsprite-mcp
   ```

## Estado Actual

- ⏳ **Status**: Warning conocido, no bloqueante
- 📅 **Fecha**: 2025-11-06
- 🔧 **Acción requerida**: Ninguna (opcional: reportar a TestSprite)

## Referencias

- [Node.js DEP0060 Documentation](https://nodejs.org/api/deprecations.html#DEP0060)
- [TestSprite GitHub](https://github.com/TestSprite)







