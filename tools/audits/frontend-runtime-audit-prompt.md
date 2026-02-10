# Frontend Runtime Audit — Prompt Senior Level

> **Propósito:** Evaluación exhaustiva del frontend en runtime desde el navegador.
> **Audiencia:** Senior Frontend Engineer, QA Lead, o AI Agent (Claude in Chrome / Patchright).
> **Duración estimada:** 45-90 minutos para auditoría completa.
> **Prerequisito:** Navegador Chrome con DevTools abierto.

---

## INSTRUCCIONES PARA EL AUDITOR

Navega por TODAS las rutas principales de la plataforma aplicando cada una de las 12 categorías de este documento. Para cada hallazgo:

1. **Captura evidencia** (screenshot, console log, network request)
2. **Clasifica severidad**: P0 (blocker), P1 (crítico), P2 (importante), P3 (mejora)
3. **Documenta la ruta** donde ocurrió
4. **Propón fix** si es obvio

---

## 1. CONSOLE — El Diario del Frontend

**Abrir:** DevTools → Console → Filtrar por nivel

### 1.1 Errores (🔴 Red)
```
¿Qué buscar?
- Uncaught TypeError / ReferenceError → Bug de código, algo es null/undefined
- Failed to load resource (404, 500) → Assets rotos o APIs caídas
- CORS errors → Configuración de backend incorrecta
- Chunk load failed → Lazy loading roto, deploy parcial
- Angular/Zone.js errors → Change detection, lifecycle hooks
- "Cannot read properties of null" → Falta de null safety en templates
- Content Security Policy violations → CSP mal configurada
```

**Protocolo:**
1. Limpiar consola (Ctrl+L)
2. Navegar a la página
3. Esperar carga completa (incluyendo lazy content)
4. Interactuar con todos los elementos (clicks, forms, toggles)
5. Documentar CADA error rojo con la ruta y acción que lo provocó

### 1.2 Warnings (🟡 Yellow)
```
¿Qué buscar?
- Deprecation warnings → APIs que dejarán de funcionar
- Angular warnings (ExpressionChangedAfterItHasBeenChecked) → Bug de change detection
- Third-party SDK warnings → Versiones desactualizadas
- "Added non-passive event listener" → Performance de scroll afectado
- Cookie warnings (SameSite) → Cookies que navegadores bloquearán
- Feature Policy / Permissions Policy → APIs del navegador restringidas
```

### 1.3 Lo que NO debería estar
```
¿Qué buscar?
- console.log de debug olvidados → Señal de código no limpio
- Datos sensibles en console (tokens, emails, passwords)
- Stack traces completos expuestos al usuario
- Mensajes en idioma incorrecto (mix español/inglés/portugués)
```

**Comando útil en console:**
```javascript
// Contar errores por tipo
performance.getEntriesByType('resource')
  .filter(r => r.transferSize === 0 && r.decodedBodySize === 0)
  .map(r => r.name)
// → Assets que fallaron silenciosamente
```

---

## 2. NETWORK — La Verdad de las APIs

**Abrir:** DevTools → Network → Preserve log ✓ → Disable cache ✓

### 2.1 Requests Fallidos (filtrar por status)
```
¿Qué buscar?
- 400 Bad Request → Frontend envía datos malformados
- 401 Unauthorized → Token expirado, sesión stale
- 403 Forbidden → RLS bloquea, permisos insuficientes
- 404 Not Found → RPC/endpoint no existe, typo en URL
- 406 Not Acceptable → PostgREST schema cache desactualizado
- 409 Conflict → Race condition, datos duplicados
- 413 Payload Too Large → Upload sin validación de tamaño
- 429 Too Many Requests → Rate limiting activado (Sentry, API)
- 500 Internal Server Error → Bug en backend/Edge Function
- 502/503/504 → Infraestructura caída, timeout
```

### 2.2 Performance de Red
```
¿Qué buscar?
- Requests > 1s → APIs lentas que degradan UX
- Requests duplicados → Mismo endpoint llamado múltiples veces (rerenders)
- Waterfall largo → Requests secuenciales que podrían ser paralelos
- Payload > 100KB → Responses sin paginación o con datos innecesarios
- Requests sin cache headers → Cache-Control ausente en assets estáticos
- Preflight (OPTIONS) excesivos → CORS mal configurado duplica requests
```

### 2.3 Análisis de Payload
```
¿Qué buscar?
- Campos innecesarios en responses (select * en vez de select específico)
- Datos sensibles en responses (tokens, passwords, datos de otros usuarios)
- Images sin optimización (>500KB por imagen)
- JSON responses sin compresión (falta gzip/brotli)
- Supabase realtime: verificar que channels se desuscriben al salir de la ruta
```

### 2.4 WebSocket / Realtime
```
¿Qué buscar?
- WS connection established? (filtrar por WS en Network)
- Heartbeat regular? (mensajes periódicos)
- Reconexión automática? (desconectar WiFi 5s y reconectar)
- Channels abiertos innecesarios? (memory leak de subscriptions)
```

**Comando útil:**
```javascript
// Ver todas las requests agrupadas por dominio
performance.getEntriesByType('resource')
  .reduce((acc, r) => {
    const domain = new URL(r.name).hostname;
    acc[domain] = (acc[domain] || 0) + 1;
    return acc;
  }, {})
```

---

## 3. PERFORMANCE — Core Web Vitals en Tiempo Real

**Abrir:** DevTools → Performance → Record → Navegar → Stop

### 3.1 Lighthouse (auditoría automatizada)
```
Ejecutar: DevTools → Lighthouse → Mobile → Performance + Accessibility + Best Practices + SEO
Repetir para: Desktop

Umbrales senior:
- Performance: > 80 (ideal > 90)
- Accessibility: > 90 (ideal 100)
- Best Practices: > 90
- SEO: > 90
```

### 3.2 Core Web Vitals en campo
```
¿Qué buscar?
- LCP (Largest Contentful Paint) < 2.5s → ¿Cuál es el elemento LCP? ¿Imagen? ¿Texto?
- INP (Interaction to Next Paint) < 200ms → Clickear botones, ¿hay delay visible?
- CLS (Cumulative Layout Shift) < 0.1 → ¿Saltan elementos durante la carga?
```

**Comando para medir en vivo:**
```javascript
// CLS en tiempo real
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.hadRecentInput) continue;
    console.log('CLS shift:', entry.value, entry.sources);
  }
}).observe({ type: 'layout-shift', buffered: true });

// LCP
new PerformanceObserver((list) => {
  const entries = list.getEntries();
  const last = entries[entries.length - 1];
  console.log('LCP:', last.startTime, last.element);
}).observe({ type: 'largest-contentful-paint', buffered: true });

// INP approximation
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 200) {
      console.warn('Slow interaction:', entry.duration, 'ms', entry.name);
    }
  }
}).observe({ type: 'event', buffered: true, durationThreshold: 100 });
```

### 3.3 Runtime Performance
```
¿Qué buscar?
- Long tasks (>50ms) → Bloquean el main thread
- Excessive re-renders → Angular change detection disparándose innecesariamente
- Memory leaks → Heap crece sin parar al navegar entre rutas
- Forced reflows → Leer layout properties después de escribir estilos
- Idle time → ¿El CPU descansa cuando no hay interacción?
```

### 3.4 Memory Profiling
```
DevTools → Memory → Take heap snapshot

¿Qué buscar?
1. Tomar snapshot en página A
2. Navegar a página B
3. Volver a página A
4. Tomar snapshot 2
5. Comparar: ¿creció significativamente? → Memory leak

Señales de leak:
- Detached DOM nodes creciendo
- Event listeners acumulándose (ver: getEventListeners(document))
- Subscriptions RxJS sin unsubscribe
- setInterval/setTimeout sin clearInterval/clearTimeout
- Closures reteniendo referencias grandes
```

**Comando para detectar leaks:**
```javascript
// Contar event listeners en el documento
function countListeners() {
  const all = document.querySelectorAll('*');
  let total = 0;
  all.forEach(el => {
    const listeners = getEventListeners(el);
    total += Object.values(listeners).reduce((sum, arr) => sum + arr.length, 0);
  });
  return total;
}
console.log('Total listeners:', countListeners());
// Navegar, volver, y ejecutar de nuevo. Si crece → leak.
```

---

## 4. APPLICATION — Estado Persistente

**Abrir:** DevTools → Application

### 4.1 Storage
```
¿Qué buscar?
- LocalStorage: ¿Datos sensibles almacenados? (tokens, passwords, PII)
- SessionStorage: ¿Se limpia al cerrar sesión?
- IndexedDB: ¿Tamaño razonable? ¿Se limpia al logout?
- Cookies: ¿Flags correctos? (Secure, HttpOnly, SameSite)
- Cache Storage: ¿Service Worker cacheando lo correcto?
```

### 4.2 Service Worker
```
¿Qué buscar?
- ¿Registrado y activo?
- ¿Versión correcta? (no sirviendo cache stale post-deploy)
- ¿Estrategia de cache correcta? (Network-First para APIs, Cache-First para assets)
- ¿Update prompt funciona? (nueva versión disponible → notifica al usuario)
- ¿Offline fallback? (desconectar red → ¿qué muestra?)
```

### 4.3 Manifest (PWA)
```
¿Qué buscar?
- ¿Manifest válido? (Application → Manifest → sin warnings)
- ¿Iconos en todos los tamaños? (192x192, 512x512 mínimo)
- ¿theme_color y background_color definidos?
- ¿Instalable? (¿aparece el prompt "Agregar a pantalla de inicio"?)
```

---

## 5. ELEMENTS / DOM — Estructura Visual

**Abrir:** DevTools → Elements

### 5.1 HTML Semántico
```
¿Qué buscar?
- <div> soup → ¿Usan <header>, <nav>, <main>, <section>, <article>, <footer>?
- Headings correctos → h1 → h2 → h3 (sin saltar niveles)
- Un solo <h1> por página
- <button> para acciones, <a> para navegación (no <div onclick>)
- <img> con alt text descriptivo
- <label> asociado a cada <input>
- Tablas con <thead>/<tbody>/<th scope>
```

### 5.2 Accesibilidad (a11y)
```
¿Qué buscar?
- Tab navigation: ¿Puedo navegar todo con Tab? ¿El orden es lógico?
- Focus visible: ¿Se ve claramente qué elemento tiene foco?
- Focus trap en modales: ¿Tab queda dentro del modal?
- Skip to content link: ¿Existe para skip header/nav?
- ARIA attributes: ¿role, aria-label, aria-expanded correctos?
- Touch targets: ¿Mínimo 44x44px en elementos interactivos?
- Contraste: ¿Texto legible sobre todos los fondos? (WCAG AA: 4.5:1)
- Screen reader: ¿Los anuncios dinámicos usan aria-live?
- prefers-reduced-motion: ¿Animaciones se desactivan?
- prefers-color-scheme: ¿Dark mode funciona sin romper contraste?
```

**Test rápido de contraste:**
```javascript
// Verificar contraste de todos los textos visibles
document.querySelectorAll('*').forEach(el => {
  const style = getComputedStyle(el);
  const color = style.color;
  const bg = style.backgroundColor;
  if (color && bg && bg !== 'rgba(0, 0, 0, 0)') {
    // Comparar luminancia (simplificado)
    const textContent = el.textContent?.trim();
    if (textContent && textContent.length < 100) {
      const fontSize = parseFloat(style.fontSize);
      if (fontSize < 14) {
        // Texto pequeño necesita más contraste
        console.log('Small text:', fontSize + 'px', color, 'on', bg, '→', textContent.substring(0, 30));
      }
    }
  }
});
```

### 5.3 DOM Size
```
¿Qué buscar?
- Total DOM nodes: document.querySelectorAll('*').length
  - < 800 = bueno
  - 800-1500 = aceptable
  - > 1500 = problema de performance
- DOM depth: ¿Nesting excesivo? (>15 niveles)
- Hidden but rendered elements (display:none pero en el DOM)
```

---

## 6. UX STATES — Los 5 Estados de Toda UI

**Para CADA componente/página, verificar los 5 estados:**

### 6.1 Empty State
```
¿Qué buscar?
- Lista sin items → ¿Muestra mensaje útil o está vacío?
- ¿El mensaje guía al usuario? ("Aún no tenés reservas. Explorá el marketplace →")
- ¿Tiene ilustración/icono o es solo texto perdido?
- ¿El CTA es clickeable y funciona?
```

### 6.2 Loading State
```
¿Qué buscar?
- ¿Hay skeleton/shimmer durante carga? (no solo spinner genérico)
- ¿El skeleton refleja el layout real? (no un spinner centrado)
- ¿Loading state es proporcional? (no bloquear toda la pantalla para 1 dato)
- ¿Hay timeout? (si la API no responde en 10s, ¿qué pasa?)
- ¿Double-click prevention? (¿El botón se deshabilita al clickear?)
```

### 6.3 Partial State
```
¿Qué buscar?
- Datos parciales → ¿Se muestra lo que hay o se espera todo?
- Pagination/infinite scroll → ¿Funciona? ¿El loader es visible?
- Optimistic UI → ¿Se actualiza antes de confirmar? ¿Y si falla?
```

### 6.4 Error State
```
¿Qué buscar?
- Error de red → ¿Mensaje amigable? ¿Botón de retry?
- Error de validación → ¿Inline en el campo o toast genérico?
- Error de permisos → ¿Redirige o muestra acceso denegado?
- Error 500 → ¿Pantalla blanca o fallback graceful?
- ¿Los mensajes de error son en el idioma correcto?
- ¿Los errores técnicos están ocultos al usuario?
```

### 6.5 Success State
```
¿Qué buscar?
- ¿Feedback inmediato? (toast, animación, cambio visual)
- ¿Navegación post-success lógica? (no quedarse en el form vacío)
- ¿Los datos se reflejan inmediatamente? (sin necesidad de refresh)
```

---

## 7. RESPONSIVE — Mobile-First Audit

**Abrir:** DevTools → Toggle device toolbar (Ctrl+Shift+M)

### Viewports obligatorios:
```
- 375 × 667  (iPhone SE / small mobile)
- 390 × 844  (iPhone 14 / standard mobile)
- 768 × 1024 (iPad / tablet portrait)
- 1024 × 768 (tablet landscape)
- 1280 × 800 (laptop small)
- 1440 × 900 (desktop standard)
- 1920 × 1080 (desktop large)
```

### 7.1 Layout
```
¿Qué buscar?
- ¿Scroll horizontal? → Bug de overflow (NUNCA debe existir)
- ¿Texto truncado sin ellipsis o tooltip?
- ¿Imágenes desbordando contenedor?
- ¿Elementos superpuestos? (z-index conflicts)
- ¿Espaciado consistente? (no padding 40px en mobile)
- ¿Navegación accesible en mobile? (hamburger menu funciona?)
- ¿Bottom navigation no tapada por safe area? (iPhone notch/bar)
```

### 7.2 Touch
```
¿Qué buscar?
- Touch targets ≥ 44x44px (verificar con DevTools ruler)
- ¿Hover states tienen equivalente touch? (no info solo en hover)
- ¿Swipe gestures funcionan? (pull-to-refresh, swipe-back)
- ¿Teclado virtual no tapa inputs? (scroll automático al campo)
- ¿Landscape mode funciona? (rotar device → ¿layout se adapta?)
```

### 7.3 Texto
```
¿Qué buscar?
- Font size mínimo 16px en inputs (evita zoom automático en iOS)
- Texto legible sin zoom en mobile (mínimo 14px body)
- Líneas de texto ≤ 80 caracteres en desktop (readability)
- ¿user-select apropiado? (texto copiable donde tiene sentido)
```

---

## 8. SECURITY — Lo que el Usuario No Debe Ver

### 8.1 Datos Expuestos
```
¿Qué buscar en DevTools?
- Tokens/API keys en localStorage (inspeccionar Application → Local Storage)
- JWT decodificar (jwt.io) → ¿Contiene datos sensibles innecesarios?
- Network responses → ¿Devuelven datos de otros usuarios?
- Source maps en producción → ¿Visible el código fuente completo?
- .env values en window.__ENV__ o similar
- Supabase anon key es público (OK), pero service_role key NUNCA debe estar en frontend
```

### 8.2 Headers de Seguridad
```
¿Qué buscar en Network → Response Headers?
- Content-Security-Policy (CSP) → ¿Existe? ¿Es restrictivo?
- Strict-Transport-Security (HSTS) → ¿Fuerza HTTPS?
- X-Content-Type-Options: nosniff → ¿Previene MIME sniffing?
- X-Frame-Options: DENY → ¿Previene clickjacking?
- Referrer-Policy → ¿No leakea URLs a terceros?
- Permissions-Policy → ¿Restringe APIs del navegador?
```

**Comando para verificar CSP:**
```javascript
// Ver CSP activa
document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content
// O en response headers de la página principal
```

### 8.3 Mixed Content
```
¿Qué buscar?
- HTTP resources en página HTTPS → Bloqueados por el navegador
- Images/fonts/scripts cargados desde HTTP
- API calls a endpoints HTTP (inseguro)
```

### 8.4 Third-Party Scripts
```
¿Qué buscar?
- ¿Cuántos scripts de terceros cargan? (Network → JS)
- ¿Tienen integridad? (integrity attribute en <script>)
- ¿Cargan en el momento correcto? (defer/async)
- ¿Bloquean el rendering? (render-blocking resources en Lighthouse)
- Google Tag Manager / Analytics → ¿Configurados con consent?
```

---

## 9. SEO — Crawleabilidad y Meta Tags

### 9.1 Meta Tags
```
¿Qué buscar? (Elements → <head>)
- <title> → ¿Único por página? ¿60 caracteres max?
- <meta name="description"> → ¿Existe? ¿160 chars max? ¿Único?
- <meta name="viewport"> → ¿Existe? ¿Correcto?
- <link rel="canonical"> → ¿Existe? ¿URL correcta?
- Open Graph tags (og:title, og:description, og:image) → ¿Para social sharing?
- Twitter Card tags → ¿Configurados?
- hreflang → ¿Para sitios multiidioma?
```

### 9.2 Structured Data
```
¿Qué buscar?
- JSON-LD en <head> → ¿Schema.org válido?
- Usar: https://search.google.com/test/rich-results
- Tipos relevantes: Product, Organization, FAQ, BreadcrumbList
```

### 9.3 Crawleability
```
¿Qué buscar?
- robots.txt → ¿Existe? ¿No bloquea páginas importantes?
- sitemap.xml → ¿Existe? ¿Actualizado?
- Contenido renderizado client-side → ¿Google lo ve? (Google Cache o URL Inspection)
- Links con href (no solo routerLink sin href)
- Status codes correctos (404 real para páginas inexistentes, no soft 404)
```

---

## 10. ANIMATIONS & TRANSITIONS — Percepción de Velocidad

```
¿Qué buscar?
- ¿Transiciones suaves entre páginas? (no flash blanco)
- ¿Animaciones usan transform/opacity? (no width/height que causan reflow)
- ¿60fps? (Performance → Recording → ¿frames drops?)
- ¿Animaciones respetan prefers-reduced-motion?
- ¿Loading indicators aparecen solo si >300ms? (no flash de spinner)
- ¿Skeleton shimmer es sutil? (no distrae, sino que indica progreso)
```

**Test de jank:**
```javascript
// Detectar frame drops en tiempo real
let lastTime = performance.now();
let drops = 0;
function checkFrameRate() {
  const now = performance.now();
  const delta = now - lastTime;
  if (delta > 33) { // < 30fps
    drops++;
    console.warn(`Frame drop: ${delta.toFixed(1)}ms (${(1000/delta).toFixed(0)}fps) Total drops: ${drops}`);
  }
  lastTime = now;
  requestAnimationFrame(checkFrameRate);
}
requestAnimationFrame(checkFrameRate);
```

---

## 11. ERROR RECOVERY & EDGE CASES

### 11.1 Navegación
```
¿Qué buscar?
- Back button → ¿Funciona correctamente? ¿No loop infinito?
- Deep link → ¿URL copiada funciona al pegarla?
- Refresh en ruta protegida → ¿Mantiene sesión o redirige?
- URL manual inválida → ¿404 page o pantalla blanca?
- Hash/query params → ¿Se preservan al navegar?
```

### 11.2 Forms
```
¿Qué buscar?
- Submit vacío → ¿Validación inline o error genérico?
- Input muy largo → ¿Se trunca o rompe layout?
- Caracteres especiales → ¿XSS prevenido? (probar <script>alert(1)</script>)
- Paste de contenido formateado → ¿Se sanitiza?
- Double submit → ¿Se previene? (botón deshabilitado)
- Session timeout durante form → ¿Se pierde el progreso?
```

### 11.3 Conectividad
```
¿Qué buscar?
- Offline → ¿Mensaje de "sin conexión"? ¿O pantalla blanca?
- Slow 3G → DevTools → Network → Throttle → Slow 3G → ¿Usable?
- Intermitent → ¿Retry automático? ¿O error permanente?
- Tab en background 5+ min → ¿Funciona al volver? ¿Token refreshed?
```

### 11.4 Auth Edge Cases
```
¿Qué buscar?
- Sesión expirada → ¿Redirige a login con returnUrl?
- Múltiples tabs → ¿Logout en una afecta las otras?
- Token refresh → ¿Transparente? ¿O flash de login?
- Permisos cambiados → ¿Se reflejan sin refresh?
```

---

## 12. CROSS-BROWSER & DEVICE TESTING

### Browsers obligatorios:
```
- Chrome (latest) → Referencia
- Safari (latest) → WebKit differences, especialmente iOS
- Firefox (latest) → Gecko rendering differences
- Samsung Internet → Mayor market share en mobile Android que Chrome en LATAM
```

### Diferencias comunes:
```
- Safari: no soporta lookbehind regex, date input nativo diferente
- Firefox: scrollbar styling diferente, flexbox gaps
- iOS Safari: 100vh incluye la barra de navegación (usar 100dvh)
- Samsung Internet: viejas versiones de Chromium
```

---

## TEMPLATE DE REPORTE

```markdown
# Frontend Runtime Audit Report
**Fecha:** YYYY-MM-DD
**URL:** https://autorentar.com
**Versión:** vX.Y.Z
**Auditor:** [nombre]

## Resumen Ejecutivo
- Total hallazgos: X
- P0 (blocker): X
- P1 (crítico): X
- P2 (importante): X
- P3 (mejora): X

## Hallazgos por Categoría

### Console
| # | Severidad | Ruta | Descripción | Evidencia |
|---|-----------|------|-------------|-----------|
| 1 | P1 | /bookings | TypeError: Cannot read 'id' of null | screenshot.png |

### Network
| # | Severidad | Ruta | Endpoint | Status | Descripción |
|---|-----------|------|----------|--------|-------------|

### Performance
| Métrica | Valor | Umbral | Estado |
|---------|-------|--------|--------|
| LCP | 2.1s | <2.5s | ✅ |
| INP | 350ms | <200ms | ❌ |
| CLS | 0.05 | <0.1 | ✅ |

### [resto de categorías...]

## Recomendaciones Priorizadas
1. [P0] ...
2. [P1] ...
3. [P2] ...
```

---

## RUTAS A AUDITAR (AutoRenta)

```
Públicas:
- / (landing)
- /marketplace (listado de autos)
- /cars/:id (detalle de auto)
- /auth/login
- /auth/register

Autenticadas:
- /profile (mi perfil)
- /profile/verification (KYC)
- /bookings (hub de reservas)
- /bookings/:id (detalle de reserva)
- /wallet (billetera)
- /wallet/deposit
- /wallet/withdraw
- /dashboard (panel de owner)
- /dashboard/my-cars
- /cars/publish (publicar auto)
- /support (soporte/tickets)
- /subscriptions (planes)

Flujos críticos (end-to-end):
- Register → Verify → Browse → Book → Pay
- Login → Check bookings → Start rental → Track location
- Owner: Publish car → Receive booking → Approve → Collect
```

---

## AUTOMATIZACIÓN CON CLAUDE IN CHROME

Para ejecutar esta auditoría con Claude in Chrome, usar este prompt:

```
Ejecuta una auditoría de frontend senior en la página actual:

1. Lee los console errors y warnings (read_console_messages)
2. Lee los network requests fallidos (read_network_requests, pattern: "[45]\\d\\d")
3. Toma screenshot del estado actual
4. Verifica accesibilidad: ejecuta en consola `document.querySelectorAll('img:not([alt])').length` para imágenes sin alt
5. Verifica DOM size: `document.querySelectorAll('*').length`
6. Busca datos expuestos en localStorage: `Object.keys(localStorage)`
7. Reporta hallazgos con severidad P0-P3

Repite para cada ruta: /marketplace, /bookings, /profile, /wallet
```

---

**Última actualización:** 2026-02-10
**Versión del prompt:** 1.0
