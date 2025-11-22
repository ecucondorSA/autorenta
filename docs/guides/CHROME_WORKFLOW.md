# Chrome Development Workflow

Guía completa para desarrollo con hot reload y debugging en vivo usando Chrome CDP.

## Setup Inicial

### 1. Iniciar Chrome con CDP

```bash
./scripts/chrome-dev.sh
```

Esto abre Chrome con:
- Remote debugging en puerto 9222
- Perfil aislado para desarrollo
- DevTools Protocol habilitado

### 2. Iniciar Dev Server

```bash
npm run dev:web
# o simplemente
npm run dev
```

Esto inicia:
- Angular dev server en http://localhost:4200
- Hot reload automático al guardar archivos
- Live recompilation

## Workflows Disponibles

### Workflow 1: Hot Reload Manual (como Cursor)

**Usa esto para**: Desarrollo normal con recarga automática

```bash
# 1. Chrome ya abierto con ./scripts/chrome-dev.sh
# 2. Dev server corriendo con npm run dev:web
# 3. Navega a http://localhost:4200 en Chrome
# 4. Edita archivos y guarda - el navegador se recarga automáticamente
```

### Workflow 2: Script Demo Automatizado

**Usa esto para**: Probar navegación automatizada con Playwright

```bash
# Ejecuta acciones automáticas en el Chrome abierto
node scripts/playwright-click-demo.js
```

Este script:
- Se conecta al Chrome vía CDP (puerto 9222)
- Navega a localhost:4200
- Hace clicks automáticos
- Toma screenshots

**Personalizar**: Edita `scripts/playwright-click-demo.js` para cambiar las acciones

### Workflow 3: Codegen Interactivo

**Usa esto para**: Grabar acciones y generar código de tests

```bash
./scripts/codegen-live.sh

# O directamente:
npx playwright codegen --target=chrome --port=9222 http://localhost:4200
```

Esto abre:
- Tu app en el Chrome ya abierto
- Una ventana de Playwright Inspector que graba tus clicks
- Código generado automáticamente basado en tus acciones

**Cómo usar**:
1. Interactúa con tu app normalmente
2. Playwright graba cada acción
3. Copia el código generado para crear tests

### Workflow 4: Tests E2E en Vivo

**Usa esto para**: Correr tests Playwright y ver la ejecución en Chrome

```bash
# Correr test específico
./scripts/test-with-cdp.sh tests/e2e/complete-porsche-publication-flow.spec.ts

# Correr con UI (recomendado)
./scripts/test-with-cdp.sh --ui

# Correr todos los tests
./scripts/test-with-cdp.sh
```

Ventajas:
- Ves la ejecución en el Chrome abierto
- Debugging en tiempo real
- Traces y screenshots automáticos

## Debugging Tips

### Ver logs de Chrome CDP

```bash
curl http://localhost:9222/json
```

### Ver WebSocket endpoint

```bash
curl -s http://localhost:9222/json/version | grep webSocketDebuggerUrl
```

### Verificar dev server

```bash
curl -I http://localhost:4200
```

## Troubleshooting

### "Error: connect ECONNREFUSED localhost:9222"

Chrome no está corriendo con CDP. Ejecuta:
```bash
./scripts/chrome-dev.sh
```

### "Error: net::ERR_CONNECTION_REFUSED at http://localhost:4200"

Dev server no está corriendo. Ejecuta:
```bash
npm run dev:web
```

### El navegador no se recarga automáticamente

Verifica que el dev server esté en modo watch:
```bash
# Deberías ver: "Watch mode enabled. Watching for file changes..."
tail -20 app_start.log
```

## Comparación con Cursor

| Feature | Cursor | Chrome CDP Workflow |
|---------|--------|-------------------|
| Hot Reload | ✅ | ✅ |
| Ver cambios en vivo | ✅ | ✅ |
| Debugging visual | ✅ | ✅ (con DevTools) |
| Grabar acciones | ❌ | ✅ (Codegen) |
| Tests automáticos | ❌ | ✅ (Playwright) |
