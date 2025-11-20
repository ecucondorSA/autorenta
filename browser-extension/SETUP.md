# 🚀 Setup Completo: Playwright MCP + Chrome Extension

Guía para instalar y configurar el sistema completo de browser automation.

---

## ⚡ Setup Rápido (5 minutos)

### Paso 1: Instalar Playwright MCP en Claude Code

```bash
cd /home/edu/autorenta

# Opción 1: Instalar con comando Claude Code
claude mcp add playwright npx @playwright/mcp@latest

# Opción 2: Verificar que se instaló
ls -la ~/.claude.json | grep playwright
```

✅ **Resultado esperado**: `playwright` aparece en `~/.claude.json`

### Paso 2: Iniciar Bridge Server

```bash
# Terminal 1 (Dedicada al bridge)
cd /home/edu/autorenta/browser-extension
npm install                    # Solo si no está instalado
npm run bridge                 # Inicia servidor en puerto 9222
```

📊 **Resultado esperado**:
```
[Bridge Server] Escuchando en ws://localhost:9222
[Bridge Server] Esperando:
  - Chrome Extension (chrome://extensions → Load unpacked)
  - Claude Code con Playwright MCP
```

### Paso 3: Instalar Chrome Extension

1. **Abre Chrome**:
   ```
   chrome://extensions
   ```

2. **Activa "Developer mode"** (esquina superior derecha)

3. **Click en "Load unpacked"**

4. **Selecciona carpeta**:
   ```
   /home/edu/autorenta/browser-extension
   ```

5. **Verifica que aparece en toolbar** con ícono 🤖

✅ **Resultado esperado**:
- Extensión visible en toolbar
- Badge con ✓ (verde) cuando bridge está conectado
- Badge con ✕ (naranja) si bridge está desconectado

### Paso 4: Verificar Conexiones

**En Chrome** (DevTools):
```
1. F12 → Console
2. Busca: "[Background] ✅ Connected to bridge server"
```

**En Terminal** (Bridge):
```
[Bridge] ✅ Chrome Extension conectada
```

**En Claude Code**:
```bash
# Prueba rápida
claude code "Toma un screenshot de google.com"
```

---

## 🎯 Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────┐
│                   Claude Code (CLI)                      │
│              + Playwright MCP installed                  │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/WS
                     ↓
┌─────────────────────────────────────────────────────────┐
│          Bridge Server (Node.js WebSocket)               │
│     localhost:9222 (npm run bridge)                      │
└────┬────────────────────────────────────────────────────┘
     │ WebSocket
     ├─→ Chrome Extension (background.js)
     │
     └─→ Content Script (content.js)
          ↓
     Browser Actions (click, scroll, type, navigate, screenshot)
```

### Flujo de Ejecución

1. **Claude Code**: "Click en #button"
2. **Playwright MCP**: Convierte a WebSocket message
3. **Bridge Server**: Recibe mensaje, rutea a Extension
4. **Background Worker**: Recibe execute command
5. **Content Script**: Ejecuta acción (click, scroll, etc)
6. **Result**: Vuelve por mismo camino

---

## 💻 Usando el Sistema

### Opción 1: Con Claude Code CLI

```bash
# Terminal dedicada a desarrollo
cd /home/edu/autorenta
npm run dev

# En otra terminal, usar Claude Code
claude code "Abre http://localhost:4200 y toma un screenshot"
```

**Claude Code ejecutará**:
```
1. Abre navegador Chrome
2. Navega a localhost:4200
3. Toma screenshot
4. Retorna imagen y descripción
```

### Opción 2: Con Tests Automatizados

```bash
# Crear test de integración
cat > test-integration.js << 'EOF'
const WebSocket = require('ws');

async function testBridge() {
  const ws = new WebSocket('ws://localhost:9222');

  ws.on('open', () => {
    console.log('✅ Connected to bridge');

    // Enviar acción
    ws.send(JSON.stringify({
      action: { type: 'screenshot' },
      clientType: 'playwright'
    }));
  });

  ws.on('message', (data) => {
    console.log('📸 Response:', data);
    ws.close();
  });
}

testBridge();
EOF

node test-integration.js
```

### Opción 3: Manual en DevTools

```javascript
// Abre DevTools (F12) en cualquier página y pega esto:

chrome.runtime.sendMessage({
  type: 'execute',
  action: { type: 'scroll', options: { direction: 'down', amount: 500 } }
}, (response) => {
  console.log('✅ Scroll complete');
});
```

---

## 🔍 Debug

### Ver Logs de la Extension

```
1. chrome://extensions
2. Find "Claude Code Browser Control"
3. Click "Inspect views: background page"
4. Ver console
```

**Busca estos patterns**:
```
[Background] ✅ Connected to bridge server     ← Bridge OK
[Background] Forwarding action to content script ← Action en progreso
[Content] Executed: click                       ← Acción completada
```

### Ver Logs del Bridge

**Terminal donde corre `npm run bridge`**:

```bash
[Bridge Server] Escuchando en ws://localhost:9222
[Bridge] ✅ Chrome Extension conectada
[Bridge] Playwright → Action: screenshot
[Bridge] Extension → Message: action-result
```

### Troubleshooting

| Problema | Solución |
|----------|----------|
| Extension no aparece en Chrome | Reload: chrome://extensions |
| Badge muestra ✕ (desconectado) | Bridge no está corriendo: `npm run bridge` |
| "Extension not connected" error | Instala extension primero (paso 3) |
| Acciones timeout | Verificar que página está activa y visible |
| Bridge no inicia | `npm install` en browser-extension/ |

---

## 📋 Checklist Final

- [ ] Playwright MCP instalado (`claude mcp` tiene playwright)
- [ ] Bridge server corriendo en puerto 9222
- [ ] Chrome Extension instalada en chrome://extensions
- [ ] Extension badge muestra ✓ (verde)
- [ ] Logs en DevTools muestran "Connected to bridge"
- [ ] Prueba rápida: screenshot funciona

---

## 🎓 Casos de Uso

### 1. Investigación Web Automatizada

```bash
# Claude Code puede hacer esto automáticamente:
claude code "
Ve a amazon.com
Busca 'laptop'
Toma screenshot del resultado
Extrae títulos y precios de los 5 primeros productos
"
```

### 2. Testing Automatizado

```bash
# E2E test con browser control
claude code "
Abre localhost:4200
Login con usuario test@example.com / password123
Navega a /dashboard
Verifica que aparece el heading 'Welcome'
Toma screenshot
"
```

### 3. Scraping Responsable

```bash
# Recolectar datos de página con permiso
claude code "
Abre https://example.com/data
Espera 2 segundos
Extrae todos los textos de <h2>
Retorna como JSON
"
```

---

## 🔐 Seguridad

- Bridge server escucha en `localhost:9222` (no accesible remotamente)
- Extension requiere permisos específicos en manifest.json
- Todas las acciones están logged en console
- Solo funciona con tabs activos

---

## 🚫 Limitaciones Conocidas

- Solo funciona en Chrome/Chromium (no Firefox/Safari)
- Requiere que tab esté visible (no background tabs)
- Screenshot captura tab actual (no todo el monitor)
- Max 10 intentos de reconexión automática

---

## 📝 Próximos Pasos (Roadmap)

- [ ] Soporte para Firefox via Playwright MCP
- [ ] Recording/Replay de sesiones
- [ ] Assertions y wait conditions avanzadas
- [ ] Dashboard web para monitoreo de bridge
- [ ] Rate limiting y throttling

---

## ❓ Preguntas Frecuentes

**Q: ¿Puedo usar solo Chrome Extension sin Playwright MCP?**
A: Sí, funciona en modo standalone (ver content.js button de test)

**Q: ¿Puedo usar solo Playwright MCP sin Extension?**
A: Sí, Playwright MCP funciona independientemente (pero no con tu extension)

**Q: ¿Cuál es mejor?**
A: Ambos juntos = máximo poder. Extension sola = testing manual. Playwright sola = testing E2E estándar.

**Q: ¿El bridge puede fallar?**
A: Sí, pero auto-reconecta. Si no se reconecta después de 10 intentos (30 segundos), funciona en modo standalone.

---

**Setup actualizado**: 2025-11-20
**Versión**: 1.0.0
