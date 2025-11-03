# 📊 Información del Análisis - Google Analytics 4

**Fecha**: 2025-11-03  
**ID de Google Analytics**: `G-9BVQD2S78Q`  
**Estado**: ✅ **ACTIVO Y FUNCIONANDO**

---

## 🎯 Verificación en Tiempo Real

### Requests de Google Analytics Detectados

Durante la navegación, se detectaron los siguientes eventos enviados a Google Analytics:

1. **Page View** (Inicio de sesión)
   - URL: `https://www.google-analytics.com/g/collect`
   - Evento: `page_view`
   - Status: ✅ 204 (Exitoso)
   - Timestamp: Inmediato al cargar la página

2. **Scroll Event** (Interacción del usuario)
   - Evento: `scroll`
   - Parámetro: `percent_scrolled=90`
   - Status: ✅ 204 (Exitoso)
   - Se activa cuando el usuario hace scroll hasta el 90% de la página

### Script de Google Analytics

- ✅ Script cargado correctamente desde: `https://www.googletagmanager.com/gtag/js?id=G-9BVQD2S78Q`
- ✅ Status: 200 OK
- ✅ Inicialización correcta de `gtag` en el DOM

---

## 📈 Métricas de Performance Detectadas

### LCP (Largest Contentful Paint)

**Valor medido**: `2617.60ms` (2.62 segundos)

- ⚠️ **Por encima del objetivo**: El valor está ligeramente por encima del objetivo de 2.5s
- ✅ **Detección automática**: El sistema detectó automáticamente el elemento LCP
- 📝 **Nota**: Se detectó una imagen que no está marcada como `priority` pero que es el elemento LCP

**Elemento LCP detectado**:
```
https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-photos/car-d10aad20-280a-4819-ac79-ff22b79449e6-3/4-front-1761490075780.png
```

**Recomendación**: Considerar marcar esta imagen con el atributo `priority` si es importante para la experiencia inicial.

### Web Vitals Enviados Automáticamente

El sistema está configurado para enviar automáticamente las siguientes métricas a Google Analytics:

1. **LCP** (Largest Contentful Paint) ✅
   - Se envía cuando se detecta el elemento LCP
   - Formato: Evento `web_vitals` con `event_label: 'LCP'`

2. **FID** (First Input Delay) ✅
   - Se enviará cuando el usuario interactúe por primera vez
   - Formato: Evento `web_vitals` con `event_label: 'FID'`

3. **CLS** (Cumulative Layout Shift) ✅
   - Se envía cuando hay cambios de layout
   - Formato: Evento `web_vitals` con `event_label: 'CLS'`

---

## 🔍 Configuración Actual

### Archivos Modificados

1. **`apps/web/src/index.html`**
   - Script de GA4 cargado directamente
   - ID configurado: `G-9BVQD2S78Q`
   - Configuración: `anonymize_ip: true`, `send_page_view: true`

2. **`apps/web/src/app/core/services/performance-monitoring.service.ts`**
   - Método `sendToAnalytics()` implementado
   - Envía Web Vitals a GA4 automáticamente
   - Formato compatible con el estándar de Google

3. **`apps/web/scripts/generate-env.js`**
   - ID predeterminado: `G-9BVQD2S78Q`
   - Permite override mediante variable de entorno

### Variables de Entorno

- **Local**: `NG_APP_GOOGLE_ANALYTICS_ID=G-9BVQD2S78Q` (configurado en `env.js`)
- **Producción**: Debe configurarse en Cloudflare Pages Environment Variables

---

## 📊 Cómo Ver los Datos en Google Analytics

### 1. Acceder al Dashboard

- URL: https://analytics.google.com/
- Seleccionar la propiedad con ID: `G-9BVQD2S78Q`

### 2. Ver Métricas en Tiempo Real

**Ruta**: `Reports > Realtime`

Aquí podrás ver:
- Usuarios activos en este momento
- Eventos que se están registrando en tiempo real
- Páginas vistas en los últimos 30 minutos

### 3. Ver Web Vitals

**Ruta**: `Reports > Engagement > Events`

Filtros recomendados:
- Event name: `web_vitals`
- Event category: `Web Vitals`
- Event label: `LCP`, `FID`, o `CLS`

**Vista alternativa**: `Reports > Engagement > Web Vitals`
- Vista especializada para métricas de rendimiento
- Muestra percentiles (p75, p90, p95)
- Comparación con thresholds de Google

### 4. Ver Page Views y Navegación

**Ruta**: `Reports > Engagement > Pages and screens`

Aquí encontrarás:
- Páginas más visitadas
- Tiempo promedio en página
- Tasa de rebote

### 5. Ver Scroll Events

**Ruta**: `Reports > Engagement > Events`

Filtro:
- Event name: `scroll`
- Ver parámetro `percent_scrolled` para analizar profundidad de scroll

---

## 🎯 Eventos Automáticos Configurados

| Evento | Descripción | Cuándo se Dispara |
|--------|-------------|-------------------|
| `page_view` | Vista de página | Al cargar cualquier ruta |
| `scroll` | Scroll del usuario | Al llegar al 90% de scroll |
| `web_vitals` | Métricas de rendimiento | LCP: al detectar elemento LCP<br>FID: al primera interacción<br>CLS: cuando hay layout shifts |

---

## ⚠️ Observaciones

### Performance

1. **LCP por encima del objetivo**
   - Valor: 2.62s (objetivo: ≤2.5s)
   - Diferencia: +120ms
   - **Acción recomendada**: Optimizar carga de imágenes o marcar elementos críticos con `priority`

### Tracking

1. ✅ **Google Analytics funcionando correctamente**
   - Requests exitosos a `google-analytics.com`
   - Eventos registrados correctamente
   - Script cargado sin errores

2. ✅ **Web Vitals configurados**
   - Sistema de monitoreo activo
   - Envío automático a GA4
   - Formato compatible con estándares de Google

---

## 📝 Próximos Pasos

### Para Ver Datos Históricos

1. Esperar 24-48 horas después del primer deployment
2. Los datos aparecerán en los reportes estándar de GA4
3. Los Web Vitals pueden tardar hasta 72 horas en aparecer en reportes agregados

### Para Optimizar Performance

1. Revisar imágenes que son LCP pero no tienen `priority`
2. Implementar lazy loading para imágenes no críticas
3. Considerar preload para recursos críticos
4. Monitorear tendencias en GA4 > Web Vitals

### Para Producción

1. Configurar variable de entorno `NG_APP_GOOGLE_ANALYTICS_ID` en Cloudflare Pages
2. Verificar que el ID sea el mismo: `G-9BVQD2S78Q`
3. Hacer un nuevo deployment
4. Verificar en GA4 Realtime que los eventos lleguen correctamente

---

## 🔗 Referencias

- [Google Analytics Dashboard](https://analytics.google.com/)
- [Web Vitals Documentation](https://web.dev/vitals/)
- [GA4 Event Tracking](https://developers.google.com/analytics/devguides/collection/ga4/events)

---

**Última actualización**: 2025-11-03  
**Próxima revisión**: Después del primer deployment a producción

