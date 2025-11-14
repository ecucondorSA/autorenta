# 🔍 Guía de Depuración con Playwright CDP

Esta guía explica cómo usar Chrome DevTools Protocol (CDP) para depuración en vivo de tests de Playwright en AutoRenta.

## 🚀 Inicio Rápido

```bash
# Iniciar flujo completo de depuración
npm run depurar:cdp

# O paso a paso:
npm run depurar:chrome    # Iniciar Chrome con CDP
npm run dev:web          # Iniciar servidor de desarrollo
npm run tests:cdp:ui     # Ejecutar tests con UI de Playwright
```

## 🛠️ Comandos Disponibles

### Comandos de Depuración
```bash
npm run depurar:chrome     # Iniciar Chrome con CDP en puerto 9222
npm run depurar:cdp        # Flujo interactivo de depuración
npm run debug:ws           # Obtener endpoint WebSocket para CDP
```

### Comandos de Tests
```bash
npm run tests:cdp          # Ejecutar tests con conexión CDP
npm run tests:cdp:ui       # Ejecutar tests con UI de Playwright + CDP
npm run generar:tests      # Generar tests interactivamente con Chrome en vivo
npm run generar:tests:simple # Generación simple de tests
```

## 🎯 Generación de Tests con Chrome en Vivo

### Comando Principal
```bash
npm run generar:tests
```

Este comando:
1. ✅ Verifica que Chrome CDP esté ejecutándose
2. ✅ Verifica que el servidor de desarrollo esté activo
3. 🎬 Abre Chrome conectado para grabación
4. 📝 Genera código de test automáticamente
5. 💾 Guarda el test en `tests/generados/`

### Flujo de Trabajo

#### 1. Preparación
```bash
# Terminal 1: Iniciar Chrome con CDP
npm run depurar:chrome

# Terminal 2: Iniciar servidor de desarrollo
npm run dev:web

# Terminal 3: Generar tests
npm run generar:tests
```

#### 2. Navegación y Grabación
- 🖱️ **Navega normalmente**: Haz clic, escribe, navega como usuario
- 📹 **Grabación automática**: Playwright captura todas las acciones
- 🎯 **Selectores inteligentes**: Genera selectores robustos automáticamente
- ✅ **Verificaciones**: Incluye assertions cuando sea apropiado

#### 3. Tipos de Tests Disponibles

**1. Test de Flujo Completo**
```bash
# Selecciona opción 1 en el menú
# Ideal para: publicar auto → reservar → pagar
```

**2. Test de Componente Específico**
```bash
# Selecciona opción 2 en el menú
# Ideal para: formularios, modales, dropdowns
```

**3. Test de Navegación**
```bash
# Selecciona opción 3 en el menú
# Ideal para: menús, links, breadcrumbs
```

**4. Test Personalizado**
```bash
# Selecciona opción 4 en el menú
# Define nombre y ruta específica
```

### Ejemplo de Uso

```bash
$ npm run generar:tests

🎯 ¿Qué tipo de test quieres generar?

1. Test de flujo completo (publicar auto, reservar, etc.)
2. Test de componente específico (formulario, modal, etc.)
3. Test de navegación (menú, links, etc.)
4. Test personalizado

Selecciona una opción (1-4): 1

🎬 Iniciando generación de test...
📁 Archivo de salida: tests/generados/flujo-completo-20241114-083000.spec.ts

# Se abre Chrome, navegas por la app...
# Al cerrar, se genera el test automáticamente

✅ Test generado exitosamente!
```

## 📁 Archivos Generados

Los tests se guardan en `tests/generados/` con nombres descriptivos:

```
tests/generados/
├── flujo-completo-20241114-083000.spec.ts
├── formulario-publicar-20241114-084500.spec.ts
├── navegacion-20241114-090000.spec.ts
└── reserva-auto-20241114-091500.spec.ts
```

### Ejemplo de Test Generado

```typescript
import { test, expect } from '@playwright/test';

test('flujo completo de publicación y reserva', async ({ page }) => {
  // Navegar a la página de publicar
  await page.goto('http://localhost:4200/publicar');
  
  // Llenar formulario de publicación
  await page.getByPlaceholder('Marca del vehículo').fill('Toyota');
  await page.getByPlaceholder('Modelo').fill('Corolla');
  await page.getByPlaceholder('Año').fill('2020');
  
  // Subir imagen
  await page.getByRole('button', { name: 'Subir fotos' }).click();
  
  // Establecer precio
  await page.getByPlaceholder('Precio por día').fill('50');
  
  // Publicar
  await page.getByRole('button', { name: 'Publicar Auto' }).click();
  
  // Verificar publicación exitosa
  await expect(page.getByText('Auto publicado exitosamente')).toBeVisible();
});
```

## 🎮 Técnicas de Depuración

### 1. Depuración en Tiempo Real
```bash
# Ejecutar test con UI interactiva
npm run tests:cdp:ui

# Pausar en puntos específicos
await page.pause(); // En tu código de test
```

### 2. Inspección de DevTools
```bash
# Abrir DevTools mientras el test corre
# URL: http://localhost:9222
```

### 3. Grabación de Trazas
```bash
# Los tests con CDP siempre graban trazas
# Ver después: npx playwright show-trace test-results/artifacts/trace.zip
```

## 💡 Consejos para Mejores Tests

### ✅ Buenas Prácticas
1. **Navega despacio**: Permite que Playwright capture mejor los selectores
2. **Usa nombres descriptivos**: Facilita el mantenimiento posterior
3. **Incluye verificaciones**: Agrega `expect()` al final de acciones importantes
4. **Evita elementos dinámicos**: No hagas clic en timestamps o IDs únicos
5. **Prueba en diferentes estados**: Login/logout, datos/sin datos, etc.

### 🚨 Evitar
1. ❌ Hacer clic muy rápido
2. ❌ Usar elementos con texto que cambia
3. ❌ Depender de datos específicos que pueden no existir
4. ❌ Tests muy largos (más de 20 acciones)

## 🔧 Personalización Avanzada

### Selectores Personalizados
```bash
# Generar con selectores específicos
npx playwright codegen \
  --target=playwright \
  --output="mi-test.spec.ts" \
  --viewport-size=1920,1080 \
  http://localhost:4200
```

### Variables de Entorno
```bash
# Personalizar puertos
export CHROME_DEVTOOLS_PORT=9223
export DEV_SERVER_PORT=4201

npm run generar:tests
```

### Configuración de Test
```typescript
// En tu test generado, puedes agregar:
test.use({
  locale: 'es-AR',
  timezoneId: 'America/Argentina/Buenos_Aires',
  colorScheme: 'dark' // o 'light'
});
```

## 🚨 Solución de Problemas

### Chrome no se Conecta
```bash
# Verificar que Chrome CDP esté corriendo
curl http://localhost:9222/json/version

# Si no responde, reiniciar
pkill -f "chrome.*remote-debugging"
npm run depurar:chrome
```

### Servidor de Desarrollo no Responde
```bash
# Verificar servidor
curl http://localhost:4200

# Si no responde
npm run dev:web
```

### Tests Generados no Funcionan
```bash
# Verificar selectores en DevTools
# Ejecutar paso a paso con:
npx playwright test mi-test.spec.ts --debug
```

## 📖 Comandos de Referencia Rápida

```bash
# Configurar entorno
npm run depurar:chrome         # Iniciar Chrome CDP
npm run dev:web               # Iniciar servidor

# Generar tests
npm run generar:tests         # Generación interactiva
npm run generar:tests:simple  # Generación directa

# Ejecutar tests
npm run tests:cdp            # Ejecutar con CDP
npm run tests:cdp:ui         # Ejecutar con UI

# Depurar tests
npx playwright test --debug                    # Modo debug
npx playwright test --ui                       # UI interactiva  
npx playwright show-trace trace.zip            # Ver trazas
npx playwright show-report                     # Ver reporte
```

## 🎯 Casos de Uso Comunes

### Flujo de Publicación de Auto
1. Navegar a `/publicar`
2. Llenar formulario paso a paso
3. Subir imágenes
4. Configurar precio y disponibilidad
5. Publicar y verificar éxito

### Flujo de Reserva
1. Buscar autos disponibles
2. Seleccionar auto
3. Elegir fechas
4. Procesar pago
5. Confirmar reserva

### Tests de Componentes
1. Abrir modal específico
2. Interactuar con elementos
3. Verificar comportamiento
4. Cerrar modal

¡Ahora puedes generar tests fácilmente navegando tu aplicación! 🎉