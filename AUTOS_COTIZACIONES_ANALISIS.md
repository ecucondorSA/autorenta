# 📊 Análisis de Cotizaciones y UX de Inventario (Media/Alta Gama vs Cercanos y Económicos)

## 1. Resumen Ejecutivo

- La pantalla de resultados combina **mapa interactivo** + **listado premium** + **carrusel de sugerencias económicas**, buscando cubrir tanto autos de media/alta gama como opciones más accesibles.
- La segmentación premium/económico se calcula en el frontend usando precio y reputación del host; hoy no existe una lista estática de 6 modelos, sino un subconjunto dinámico que alimenta la etiqueta «_X modelos media/alta gama_» `apps/web/src/app/features/cars/list/cars-list.page.html:134`.
- Las cotizaciones **no se actualizan en tiempo real** contra Supabase; se refrescan al cargar la página o al variar filtros/orden. No hay suscripciones live, por lo que nuevos autos requieren recarga manual `apps/web/src/app/features/cars/list/cars-list.page.ts:397`.
- El carrusel “Cercanos y económicos” se pinta sobre el mapa en desktop y queda arriba del listado en mobile, desplazando los artículos premium hacia abajo cuando aparece `apps/web/src/app/features/cars/list/cars-list.page.html:96`.
- La navegación principal (mapa, filtros, ordenamiento y tarjetas) es consistente, pero el tour guiado automático dispara errores de timeout cuando los selectores no existen, generando ruido en consola (`guided-search`) `apps/web/src/app/core/services/tour.service.ts:72`.

## 2. Cómo se calculan las cotizaciones

### 2.1 Segmentación de media/alta gama

1. Se descarga el inventario activo desde Supabase (precio por día, rating del host, fotos, ubicación) `apps/web/src/app/core/services/cars.service.ts:110`.
2. El componente normaliza **precio** y **rating** (70% y 30% del score respectivamente) y calcula una puntuación para cada auto `apps/web/src/app/features/cars/list/cars-list.page.ts:199`.
3. La frontera premium se fija en el **percentil 60** del score; todo lo que queda por encima integra la lista principal `apps/web/src/app/features/cars/list/cars-list.page.ts:214`.
4. El listado premium respeta el ordenamiento seleccionado (distancia por defecto, pero se puede cambiar a precio asc/desc, rating o más nuevos) `apps/web/src/app/features/cars/list/cars-list.page.ts:240` y `apps/web/src/app/features/cars/list/cars-list.page.html:141`.

### 2.2 Sugerencias cercanas y económicas

- Se filtran autos dentro de un radio de **50 km** respecto a la ubicación del usuario (si la tenemos) `apps/web/src/app/features/cars/list/cars-list.page.ts:299`.
- Se descartan los que ya están marcados como premium; si no hay suficientes, se rellena con los más baratos del inventario completo `apps/web/src/app/features/cars/list/cars-list.page.ts:314`.
- El carrusel se limita a un máximo de **12 vehículos** y prioriza: distancia → precio → título `apps/web/src/app/features/cars/list/cars-list.page.ts:331`.
- En desktop se muestra como overlay inferior sobre el mapa con apariencia tipo “pill” `apps/web/src/app/features/cars/list/cars-list.page.html:96`; en mobile se vuelve un carrusel horizontal independiente que empuja el listado premium hacia abajo `apps/web/src/app/features/cars/list/cars-list.page.html:116`.

### 2.3 Etiquetas y texto de apoyo

- El copy “6 modelos media/alta gama” es dinámico: la cifra proviene de `premiumCars().length`, por lo que puede mostrarse cualquier número; el diseño presupone seis tarjetas pero no las limita `apps/web/src/app/features/cars/list/cars-list.page.html:134`.
- Cada tarjeta premium expone precio por día, badges (premium, automático, carrocería), rating del host y CTA primarias (Comparar / Ver ficha) `apps/web/src/app/features/cars/list/cars-list.page.html:175`.
- Las tarjetas económicas reutilizan la misma plantilla que el carrusel y priorizan el precio + distancia `apps/web/src/app/features/cars/list/cars-list.page.html:27`.

## 3. Experiencia de navegación

| Área | Observación | Impacto |
|------|-------------|---------|
| **Mapa** | Ocupa el panel izquierdo en desktop; pins sincronizados con tarjetas premium. El overlay del carrusel económico mantiene el mapa visible pero puede tapar controles al abrir filtros | Medio |
| **Filtros** | Sección persistente encima del mapa; incluye rango de precio, transmisión, combustible, features `apps/web/src/app/features/cars/list/cars-list.page.ts:118`. Ajustar filtros recalcula ambos segmentos sin esperar al backend | Alto |
| **Ordenamiento** | Dropdown duplicado (mapa y listado). Persistencia en `localStorage` para recordar preferencia `apps/web/src/app/features/cars/list/cars-list.page.ts:85` | Alto |
| **Responsive** | En mobile, mapa pasa arriba, carrusel económico queda inmediatamente debajo y las tarjetas premium van al final, lo que obliga a scrollear más para ver autos de alta gama | Medio |
| **Tour guiado** | Se dispara automáticamente tras 2 s aunque los elementos marcados como `data-tour-step` todavía no están montados, generando errores `apps/web/src/app/core/services/tour.service.ts:375` | Alto |

## 4. Actualización y comportamiento dinámico

- **Sincronización con Supabase:** el fetch se hace vía `carsService.listActiveCars`. No hay `onSnapshot` ni canales en tiempo real, por lo que los nuevos vehículos o cambios de precio requerirán volver a llamar `loadCars()` manualmente `apps/web/src/app/features/cars/list/cars-list.page.ts:397`.
- **Reactividad interna:** todos los cálculos (segmentación, distancia, carrusel) son señales de Angular, así que cualquier cambio en filtros, orden o ubicación del usuario refresca la UI al instante sin recargar la página `apps/web/src/app/features/cars/list/cars-list.page.ts:71`.
- **Desplazamiento de publicaciones:** cuando el carrusel económico está activo, en desktop flota sobre el mapa sin afectar las tarjetas premium; en mobile se renderiza antes del listado y efectivamente “empuja” las publicaciones principales hacia abajo `apps/web/src/app/features/cars/list/cars-list.page.html:112`.

## 5. Riesgos detectados

1. **Tour guiado con timeouts:** el selector `[data-tour-step="guided-search"]` no siempre existe y dispara errores en consola, degradando DX y pudiendo afectar análisis `apps/web/src/app/core/services/tour.service.ts:70`.
2. **Copy desalineado con el dataset:** el texto «6 modelos» puede mostrar otros valores; convendría actualizar el copy o limitar explícitamente a seis tarjetas premium.
3. **Carrusel económico sin paginación:** al mostrar hasta 12 ítems en scroll horizontal largo, se vuelve poco accesible con teclado/lector de pantalla.
4. **Ausencia de actualización en vivo:** si se pretende reflejar cotizaciones “en tiempo real”, habría que agregar canales Supabase o WebSockets.

## 6. Recomendaciones

1. **Afinar la segmentación:** permitir ajustar el percentil (60%) desde configuración o backend para reaccionar a inventarios con menor dispersión de precios.
2. **Copy & límites:** cambiar el mensaje a «{{count}} modelos destacados» o limitar el listado premium a 6 tarjetas cuando haya más (con botón “Ver todos”).
3. **Tour resiliente:** antes de iniciar el guided tour, validar que todos los selectores existan o retrasar el arranque hasta que `CarsListPage` emita un evento `inventoryReady`.
4. **Real-time opcional:** habilitar `supabase.channel('cars')` para recibir inserts/updates y resegmentar al vuelo; mostrar un toast al usuario cuando haya nuevos autos.
5. **Carrusel UX:** agregar controles laterales y paginación accesible, y permitir anclar el carrusel para no tapar los filtros en pantallas pequeñas.
6. **Métricas de pricing:** capturar en analytics los rangos de precio resultantes (mínimo/máximo premium vs. económico) para validar que la segmentación cumple con las expectativas del equipo comercial.

## 7. Próximos pasos sugeridos (Ultrathink)

- Crear un endpoint en Supabase/Edge que devuelva la segmentación ya procesada para poder auditar cómo quedan los precios y detectar outliers sin depender del frontend.
- Probar una variante A/B donde el carrusel económico viva en una pestaña separada debajo de los filtros, reduciendo la fricción para usuarios que llegan buscando lujo.
- Generar un monitoreo scheduled que verifique cada hora si hay al menos 6 modelos premium activos y alerte a operaciones cuando el stock caiga por debajo de ese umbral.
- Documentar en un FAQ interno qué requisitos debe cumplir un auto para ser considerado “media/alta gama” (precio mínimo, rating promedio, carrocería, etc.) Al día de hoy lo decide el algoritmo automáticamente.

---

> Elaborado tras revisar el código de `CarsListPage` y servicios relacionados en `apps/web`. Última actualización: 24 de octubre de 2025.
