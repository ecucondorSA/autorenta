# Revisión de Selectores Rotos - Categorización

## Resumen

**Total de selectores rotos**: 136
**Fecha de revisión**: 2025-01-20

## Categorización

### 1. ✅ Selectores Dinámicos Válidos (No Requieren Acción)

Estos selectores son válidos en tests E2E pero no se pueden verificar estáticamente porque se generan dinámicamente:

#### Componentes Ionic (14+)
- `ion-alert` (14 ocurrencias) - Alertas generadas dinámicamente
- `ion-popover` (2 ocurrencias) - Popovers generados dinámicamente
- `ion-item` (2 ocurrencias) - Items generados dinámicamente
- `ion-modal` - Modales generados dinámicamente
- `ion-toast` - Toasts generados dinámicamente

**Acción**: ✅ Ya agregados a la lista de selectores dinámicos

#### Elementos HTML Nativos Generados Dinámicamente (9+)
- `canvas` (7 ocurrencias) - Canvas generado por librerías de mapas/graphs
- `option` (2 ocurrencias) - Opciones de select generadas dinámicamente

**Acción**: ✅ Ya agregados a la lista de selectores dinámicos

#### Flatpickr (6+)
- `date-to` (3 ocurrencias) - Clase generada por Flatpickr
- `date-from` (3 ocurrencias) - Clase generada por Flatpickr

**Acción**: ✅ Agregados data-testid a date-range-picker.component.html

#### Autocompletado (2)
- `.autocomplete-option` - Opciones de autocompletado generadas dinámicamente
- `.suggestion-item` - Sugerencias generadas dinámicamente

**Acción**: ✅ Ya agregados a la lista de selectores dinámicos

#### Chat/WhatsApp (2)
- `.whatsapp-chat-container` - Widget de WhatsApp generado dinámicamente

**Acción**: ✅ Ya agregado a la lista de selectores dinámicos

### 2. ⚠️ Selectores que Necesitan Mejora en Mapeo (Requieren Acción)

Estos selectores existen pero el script busca en HTMLs incorrectos:

#### Deposit Modal (18+)
- `deposit-submit` (9 ocurrencias) - Busca en wallet.page.html pero está en deposit-modal.component.html
- `amount-input` (9 ocurrencias) - Busca en wallet.page.html pero está en deposit-modal.component.html
- `deposit-modal` (2 ocurrencias) - Busca en wallet.page.html pero está en deposit-modal.component.html
- `deposit-amount-input` (2 ocurrencias) - Busca en wallet.page.html pero está en deposit-modal.component.html
- `deposit-error` (2 ocurrencias) - Busca en wallet.page.html pero está en deposit-modal.component.html
- `creating-preference` (2 ocurrencias) - Busca en wallet.page.html pero está en deposit-modal.component.html

**Estado**: ✅ Ya tienen data-testid en deposit-modal.component.html
**Problema**: El script busca en wallet.page.html en lugar de deposit-modal.component.html
**Solución**: ✅ Mejorado el mapeo en el script para buscar en componentes compartidos

#### Transaction History (3)
- `transaction-amount` (1 ocurrencia) - Busca en wallet.page.html pero está en transaction-history.component.html
- `transaction-date` (1 ocurrencia) - Busca en wallet.page.html pero está en transaction-history.component.html
- `transaction-status` (1 ocurrencia) - Busca en wallet.page.html pero está en transaction-history.component.html

**Estado**: ✅ Ya tienen data-testid en transaction-history.component.html
**Problema**: El script busca en wallet.page.html en lugar de transaction-history.component.html
**Solución**: ✅ Mejorado el mapeo en el script

#### Car Card (7)
- `app-car-card` (7 ocurrencias) - Busca en HTMLs incorrectos

**Estado**: ✅ Ya tiene data-testid="car-card" en car-card.component.html
**Problema**: El script busca en booking-wizard.page.html o vehicle-documents.page.html
**Solución**: ✅ Mejorado el mapeo en el script

#### Cars Map (7)
- `app-cars-map` (7 ocurrencias) - Busca en HTMLs incorrectos

**Estado**: ✅ Ya tiene data-testid="cars-map" y id="map-container" en cars-map.component.html
**Problema**: El script busca en publish-car-v2.page.html o vehicle-documents.page.html
**Solución**: ✅ Mejorado el mapeo en el script

#### User Menu (4)
- `user-menu` (4 ocurrencias) - Busca en HTMLs incorrectos

**Estado**: ✅ Ya tiene data-testid="user-menu" en app.component.html
**Problema**: El script busca en reset-password.page.html o booking-wizard.page.html
**Solución**: ✅ Mejorado el mapeo en el script

### 3. 🔧 Selectores que Necesitan data-testid (Requieren Acción)

#### Car Card Enhanced (2)
- `.car-card-enhanced` (2 ocurrencias)

**Acción**: Agregar data-testid="car-card-enhanced" o clase CSS

#### Map Container (2)
- `#map-container, .map-container` (2 ocurrencias)

**Estado**: ✅ Ya agregado id="map-container" y data-testid="map-container" en cars-map.component.html

#### Data Car ID (2)
- `[data-car-id]` (2 ocurrencias)

**Estado**: ✅ Ya existe en car-card.component.html como `[attr.data-car-id]="car.id"`

### 4. 📝 Selectores de Componentes Compartidos (Requieren Mapeo)

#### Inspection Uploader (2)
- `app-inspection-uploader` (2 ocurrencias)

**Acción**: Agregar a la lista de componentes compartidos en el script

## Resumen de Acciones

### ✅ Completadas
1. Agregados selectores dinámicos a la lista (ion-alert, canvas, option, etc.)
2. Agregados data-testid a date-range-picker (date-from, date-to)
3. Agregados data-testid e id a cars-map (map-container)
4. Mejorado el mapeo en el script para buscar en componentes compartidos
5. Integrado en CI/CD con workflow de GitHub Actions

### 🔄 Pendientes
1. Verificar que el mapeo mejorado funcione correctamente
2. Agregar data-testid a componentes faltantes si es necesario
3. Ejecutar tests E2E para validar

## Estadísticas Finales

- **Selectores dinámicos válidos**: ~50+ (no requieren acción)
- **Selectores con mapeo mejorado**: ~30+ (deberían funcionar ahora)
- **Selectores que necesitan data-testid**: ~5 (menor prioridad)
- **Selectores sin mapeo claro**: ~51 (tests de integración o componentes complejos)

---

**Última actualización**: 2025-01-20


