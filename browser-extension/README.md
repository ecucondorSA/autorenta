# Claude Code Browser Control - Chrome Extension

Extensión de Chrome para automatizar el navegador desde Claude Code (similar a Antigravity Browser Control).

## ⚡ Instalación Rápida (3 pasos)

### 1. Abrir Chrome Extensions

Abre Chrome y navega a:
```
chrome://extensions
```

### 2. Activar Developer Mode

En la esquina superior derecha, activa **"Developer mode"** (Modo desarrollador)

### 3. Cargar la extensión

1. Click en **"Load unpacked"** (Cargar extensión sin empaquetar)
2. Navega a: `/home/edu/autorenta/browser-extension`
3. Click **"Select Folder"**

✅ **¡Listo!** La extensión aparecerá en tu toolbar.

---

## 🧪 Probar la Extensión

### Opción 1: Botón de Test (Más fácil)

1. Ve a `http://localhost:4200` (AutoRenta dev)
2. Verás un botón naranja: **"🤖 Test Browser Control"** (abajo a la derecha)
3. Click en el botón
4. La página hará scroll automáticamente y tomará un screenshot

### Opción 2: Desde el Popup

1. Click en el ícono de la extensión (🤖) en el toolbar
2. Click **"🧪 Test Extension"**
3. La página actual hará scroll

### Opción 3: Desde Console

Abre DevTools (F12) y ejecuta:

```javascript
// Ejemplo 1: Scroll down
chrome.runtime.sendMessage({
  type: 'execute',
  action: { type: 'scroll', options: { direction: 'down', amount: 500 } }
});

// Ejemplo 2: Click en elemento
chrome.runtime.sendMessage({
  type: 'execute',
  action: { type: 'click', selector: '#search-button' }
});

// Ejemplo 3: Escribir en input
chrome.runtime.sendMessage({
  type: 'execute',
  action: {
    type: 'type',
    selector: 'input[name="email"]',
    value: 'test@example.com'
  }
});
```

---

## 🎯 Acciones Disponibles

| Acción | Descripción | Ejemplo |
|--------|-------------|---------|
| **navigate** | Navegar a URL | `{ type: 'navigate', value: 'http://localhost:4200' }` |
| **click** | Click en elemento | `{ type: 'click', selector: '#button' }` |
| **type** | Escribir en input | `{ type: 'type', selector: 'input', value: 'text' }` |
| **scroll** | Scroll de página | `{ type: 'scroll', options: { direction: 'down', amount: 500 } }` |
| **screenshot** | Captura de pantalla | `{ type: 'screenshot' }` |

---

## 🔍 Ver Logs

### Extension Logs (Background Worker)

1. `chrome://extensions`
2. Find "Claude Code Browser Control"
3. Click **"Inspect views: background page"**
4. Ver console logs: `[Background] ...`

### Content Script Logs

1. F12 en cualquier página web
2. Console tab
3. Ver logs: `[Claude Code Browser Control] ...` y `[Content] ...`

---

## 🚀 Características

✅ **Visual Overlay** - Muestra acción actual en tiempo real (naranja, arriba a la derecha)
✅ **Element Highlighting** - Resalta elementos antes de interactuar (borde naranja con glow)
✅ **Auto-testing** - Botón de test en `localhost:4200`
✅ **Screenshot Capture** - Toma screenshots vía background worker
✅ **Error Handling** - Mensajes de error claros en console

---

## 🔧 Bridge Server (Opcional)

Para control total desde Claude Code, necesitas el bridge server:

```bash
# En desarrollo...
# El bridge server conecta Claude Code CLI con la extensión vía WebSocket
```

Sin bridge server, la extensión funciona **standalone** para testing manual.

---

## 🐛 Troubleshooting

### Extensión no aparece en toolbar
- Verifica que está en `chrome://extensions`
- Check que está **Enabled** (switch azul ON)
- Reload la extensión

### Overlay no aparece
- Abre DevTools (F12) → Console
- Busca: `[Claude Code Browser Control] Content script loaded`
- Si no aparece, refresh la página

### Actions no funcionan
- Check console para errores
- Verifica que el selector es correcto
- Prueba con acciones simples primero (scroll)

### Botón de test no aparece
- Solo aparece en `localhost:4200`
- Wait 2 segundos después de page load
- Check console: `[Content] Running on AutoRenta dev server`

---

## 📝 Archivos

```
browser-extension/
├── manifest.json          # Chrome extension config
├── background.js          # Service worker (WebSocket bridge)
├── content.js            # Content script (DOM actions)
├── popup.html            # Extension popup UI
├── overlay.css           # Visual overlay styles
├── icon.png              # Extension icon (48x48)
└── README.md             # This file
```

---

## ✨ Demo en AutoRenta

1. Start dev server: `npm run dev` (en otra terminal)
2. Abre Chrome con la extensión instalada
3. Ve a `http://localhost:4200`
4. Click en el botón **"🤖 Test Browser Control"**
5. Ver:
   - Overlay naranja aparece
   - Página hace scroll
   - Screenshot tomado (check console)
   - Popup de éxito

---

## 🎨 Personalización

### Cambiar color del overlay

Edit `content.js` línea 8:
```javascript
color: '#FF6B00'  // Cambia a tu color
```

### Cambiar posición del overlay

Edit `content.js` línea 6:
```javascript
top: 20px; right: 20px;  // Cambia posición
```

### Deshabilitar test button

Comment líneas 125-156 en `content.js`

---

## 🔒 Permisos

La extensión requiere:
- `activeTab` - Acceso a tab activo
- `tabs` - Gestión de tabs
- `storage` - Guardar settings
- `scripting` - Ejecutar scripts
- `<all_urls>` - Funcionar en cualquier sitio

---

## 📚 Próximos Pasos

1. ✅ Instalar y probar extensión
2. 🔜 Implementar bridge server
3. 🔜 Integrar con Claude Code CLI
4. 🔜 Agregar más acciones (wait, assertions)
5. 🔜 Recording/replay de sesiones

---

**Status**: ✅ Funcionando (standalone mode)
**Version**: 1.0.0
**Creado**: 2025-11-19
