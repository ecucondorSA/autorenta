# 🏗️ Implementation Plan: SEO Programático (Nivel 10)

> **Objetivo:** Dominar las búsquedas "long-tail" generando automáticamente miles de landing pages transaccionales (ej: "Alquiler Toyota Palermo", "Autos en Córdoba Capital") sin crear archivos manuales.

## 1. 📐 Arquitectura de URLs y Routing

### Estrategia de Rutas
Usaremos una estructura jerárquica bajo el prefijo `/alquiler/` para evitar colisiones con otras páginas.

- **Ruta Base:** `/alquiler` (Landing General)
- **Nivel 1 (Categoría o Marca):** `/alquiler/:category` (ej: `/alquiler/suv`, `/alquiler/toyota`)
- **Nivel 2 (Ubicación):** `/alquiler/:category/:location` (ej: `/alquiler/toyota/palermo`, `/alquiler/suv/bariloche`)

### Angular Implementation (`app.routes.ts`)
```typescript
{
  path: 'alquiler',
  children: [
    {
      path: ':segment1', // Puede ser marca (toyota) o ubicación (palermo)
      component: SeoLandingPageComponent,
      resolve: { pageData: seoPageResolver }
    },
    {
      path: ':segment1/:segment2', // Marca + Ubicación (toyota/palermo)
      component: SeoLandingPageComponent,
      resolve: { pageData: seoPageResolver }
    }
  ]
}
```

---

## 2. 🗄️ Arquitectura de Datos (Supabase)

No crearemos páginas estáticas en HTML. Los datos vivirán en la base de datos y se servirán vía RPC.

### A. Materialized View (`mv_seo_pages`)
Para rendimiento extremo (<50ms), pre-calcularemos las combinaciones válidas. No queremos páginas vacías (Soft 404s).

```sql
-- Ejemplo conceptual
CREATE MATERIALIZED VIEW public.mv_seo_pages AS
SELECT
  'brand_location' as type,
  c.brand || '-' || c.location_city as slug,
  c.brand,
  c.location_city,
  count(*) as car_count,
  min(c.price_per_day) as min_price
FROM cars c
WHERE c.status = 'active'
GROUP BY c.brand, c.location_city
HAVING count(*) > 0;
```

### B. Edge Function / RPC (`get_seo_page_data`)
Una función que recibe los segmentos de URL y determina qué mostrar.

- **Input:** `segment1`, `segment2`
- **Logic:**
  1. Detectar si `segment1` es marca, tipo o ciudad.
  2. Construir la query dinámica.
  3. Retornar:
     - `meta_title`: "Alquiler de Toyota en Palermo | Desde $30 USD"
     - `meta_description`: "Encontrá 5 Toyota disponibles en Palermo..."
     - `h1_title`: "Toyota en Palermo"
     - `description_text`: Texto generado con templates (Spintax).
     - `cars`: Array de autos top para esa búsqueda.

---

## 3. 🧩 Componente Frontend (`SeoLandingPageComponent`)

Este componente será un "camaleón". Su estructura cambiará sutilmente según el tipo de página, pero mantendrá una base sólida de SEO.

### Estructura del Template
1. **Hero Section:**
   - H1 Dinámico con keywords fuertes.
   - Buscador pre-llenado con los filtros de la página.
   - Imagen de fondo contextual (Mapa de la ciudad o foto de la marca).
2. **Stats Bar:** "5 autos encontrados", "Precio promedio $45", "Sin tarjeta de crédito".
3. **Grid de Resultados:** Los autos reales (usando `app-car-card` optimizado).
4. **Content Block (SEO Text):**
   - Texto generado dinámicamente para dar contexto a Google.
   - FAQ Schema (Preguntas frecuentes generadas).
   - Internal Linking: Links a ciudades cercanas o marcas similares.

### MetaService Integration
Actualización crítica de `MetaService` para soportar Canonical URLs dinámicas y Schema.org estructurado (Product, AggregateRating).

---

## 4. 🗺️ Sitemap Generation (Technical SEO)

Google no puede "adivinar" estas miles de páginas. Necesitamos un `sitemap.xml`.

### Estrategia: Edge Function Dynamic Sitemap
Crearemos una Edge Function en Supabase (`/functions/v1/sitemap-seo`) que:
1. Consulta `mv_seo_pages`.
2. Genera el XML al vuelo.
3. Se cachea fuertemente (CDN Cache).

**Cloudflare Worker (Opcional):** Si Supabase Edge Functions es lento, usamos un Worker para servir el XML.

---

## 5. 📝 Plan de Ejecución (Paso a Paso)

1.  **DB Migration:** Crear la vista materializada y la función RPC. (Prioridad Alta)
2.  **Angular Core:** Crear el `SeoLandingPageComponent` y configurar el Router.
3.  **Service Layer:** Implementar `SeoService` para conectar con el RPC.
4.  **UI/UX:** Diseñar el template "Master" con Tailwind.
5.  **SEO Glue:** Implementar Meta Tags y Schema.org.
6.  **Sitemap:** Configurar la generación del XML.

---

## ✅ Definición de Éxito (KPIs)

- [ ] **LCP < 1.2s** en estas landing pages.
- [ ] **Zero "Soft 404s":** Si no hay autos, redirigir a una búsqueda general o mostrar "Similares".
- [ ] **Indexación:** Google empieza a indexar combinaciones "Marca + Ciudad".
