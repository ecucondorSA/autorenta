# 🚗 Test E2E: Flujo Completo Porsche Carrera con IA

## 📋 Descripción

Test E2E completo que cubre el flujo end-to-end de:
1. **Registro** de usuario nuevo
2. **Login** con el usuario creado
3. **Publicación** de auto Porsche Carrera
4. **Generación de fotos con IA**
5. **Verificación** de publicación exitosa

## 🎯 Características

### ✅ Captura Completa de Información

El test captura automáticamente:

- **Screenshots**: Un screenshot después de cada paso exitoso
- **Console Logs**: Todos los logs de consola (info, warnings, errors)
- **Network Errors**: Errores de red (status >= 400)
- **JavaScript Errors**: Errores de JavaScript en la página
- **Request Failures**: Requests que fallaron
- **Performance**: Timestamps de cada paso

### 📊 Reporte Detallado

Al finalizar, el test genera un reporte completo con:
- Estado de cada paso (✅ éxito / ❌ error)
- Resumen de console logs por tipo
- Lista de errores de red
- Lista de errores de JavaScript
- Información del auto creado (ID, marca, modelo)

## 🚀 Cómo Ejecutar

### Opción 1: Ejecutar solo este test

```bash
# Desde la raíz del proyecto
npx playwright test tests/e2e/complete-porsche-publication-flow.spec.ts
```

### Opción 2: Ejecutar con UI (recomendado para debugging)

```bash
npx playwright test tests/e2e/complete-porsche-publication-flow.spec.ts --ui
```

### Opción 3: Ejecutar en modo headed (ver el navegador)

```bash
npx playwright test tests/e2e/complete-porsche-publication-flow.spec.ts --headed
```

### Opción 4: Ejecutar con más detalles

```bash
npx playwright test tests/e2e/complete-porsche-publication-flow.spec.ts --reporter=list --verbose
```

## 📁 Archivos Generados

Después de ejecutar el test, encontrarás:

```
test-results/
├── screenshots/
│   ├── 1.-registro-de-usuario.png
│   ├── 2.-login-de-usuario.png
│   ├── 3.-navegar-a-publicar-auto.png
│   ├── 4.-completar-formulario---porsche-carrera.png
│   ├── 5.-generar-fotos-con-ia.png
│   ├── 6.-verificar-subir-fotos.png
│   ├── 7.-publicar-auto.png
│   └── 8.-verificar-publicación-exitosa.png
├── html-report/          # Reporte HTML interactivo
├── results.json          # Resultados en JSON
└── junit.xml            # Resultados en formato JUnit
```

## 🔍 Ver Resultados

### Reporte HTML (Recomendado)

```bash
# Abrir reporte HTML interactivo
npx playwright show-report
```

El reporte HTML incluye:
- Timeline de ejecución
- Screenshots de cada paso
- Console logs
- Network requests
- Errores capturados

### Ver Logs en Consola

El test imprime logs detallados en la consola durante la ejecución:

```
📸 Paso: 1. Registro de Usuario
[CONSOLE log]: User registered successfully
✅ Paso completado

📸 Paso: 2. Login de Usuario
[CONSOLE log]: User logged in
✅ Paso completado

...
```

## ⚙️ Configuración

### Variables de Entorno

Asegúrate de tener configurado `.env.test`:

```bash
NG_APP_SUPABASE_URL=https://pisqjmoklivzpwufhscx.supabase.co
NG_APP_SUPABASE_ANON_KEY=tu-anon-key
PLAYWRIGHT_BASE_URL=http://localhost:4200
```

### Pre-requisitos

1. **Servidor de desarrollo corriendo**:
   ```bash
   npm run dev
   ```

2. **Base de datos configurada**:
   - Migrations aplicadas
   - Tablas creadas

3. **Servicio de IA funcionando** (opcional):
   - Cloudflare Worker `ai-car-generator` desplegado
   - O usar fotos manuales como fallback

## 🐛 Troubleshooting

### Error: "Cannot find module"

```bash
# Instalar dependencias
npm install
```

### Error: "Test timeout"

El test tiene timeout de 60 segundos por paso. Si falla:

1. Verificar que el servidor esté corriendo
2. Verificar conexión a Supabase
3. Aumentar timeout en `playwright.config.ts`

### Error: "Screenshots not found"

```bash
# Crear directorio de screenshots
mkdir -p test-results/screenshots
```

### Fotos IA no se generan

Si la generación de fotos IA falla:
- El test continuará automáticamente
- Usará fotos manuales como fallback
- Revisar logs de consola para detalles

## 📝 Estructura del Test

```
test.describe('Flujo Completo...')
├── beforeEach: Setup (captura de logs, errores)
├── test('Flujo completo...')
│   ├── Paso 1: Registro de Usuario
│   ├── Paso 2: Login (si necesario)
│   ├── Paso 3: Navegar a Publicar
│   ├── Paso 4: Completar Formulario (Porsche Carrera)
│   ├── Paso 5: Generar Fotos con IA
│   ├── Paso 6: Verificar/Subir Fotos
│   ├── Paso 7: Publicar Auto
│   └── Paso 8: Verificar Publicación
└── afterEach: Reporte Final
```

## 🎨 Datos del Test

### Usuario Creado

- **Email**: `test.locador.{uuid}@autorenta.test`
- **Password**: Generado automáticamente
- **Rol**: Locador
- **Nombre**: Generado automáticamente

### Auto Creado

- **Marca**: Porsche
- **Modelo**: Carrera (o 911 Carrera)
- **Año**: 2023
- **Color**: Blanco
- **Precio**: 120,000 ARS/día
- **Categoría**: Lujo
- **Transmisión**: Automática
- **Combustible**: Nafta
- **Asientos**: 2
- **Ubicación**: Buenos Aires, Av. Corrientes 1234

## 📊 Métricas Capturadas

- **Tiempo de ejecución**: Timestamp de cada paso
- **Console logs**: Tipo y mensaje
- **Network errors**: URL, status code, mensaje
- **JS errors**: Mensaje y stack trace
- **Screenshots**: Full page de cada paso

## 🔄 Ejecución Continua

Para ejecutar el test múltiples veces:

```bash
# Ejecutar 5 veces
for i in {1..5}; do
  echo "Ejecución $i..."
  npx playwright test tests/e2e/complete-porsche-publication-flow.spec.ts
done
```

## 📚 Referencias

- [Playwright Documentation](https://playwright.dev/)
- [Test Helpers](../helpers/test-data.ts)
- [Auth Setup](../fixtures/auth.setup.ts)

---

**Última actualización**: 2025-11-12
**Estado**: ✅ Test completo y funcional




