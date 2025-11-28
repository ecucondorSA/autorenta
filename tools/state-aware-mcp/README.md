# State-Aware MCP Server

MCP Server para E2E Testing con interrogación forense del estado de la aplicación.

## Problema que Resuelve

Los tests E2E tradicionales fallan y debemos diagnosticar "a ciegas" mirando screenshots. Este MCP permite:
- **Interrogar** el estado real de la base de datos
- **Analizar** logs de consola y tráfico de red
- **Inspeccionar** código fuente de componentes
- **Aplicar** correcciones quirúrgicas a los tests

## Instalación

```bash
cd tools/state-aware-mcp
npm install
```

## Configuración

Ya configurado en `.mcp.json`:

```json
{
  "state-aware-testing": {
    "command": "node",
    "args": ["/home/edu/autorenta/tools/state-aware-mcp/server.js"],
    "env": {
      "NG_APP_SUPABASE_URL": "${NG_APP_SUPABASE_URL}",
      "SUPABASE_SERVICE_ROLE_KEY": "${SUPABASE_SERVICE_ROLE_KEY}",
      "PROJECT_ROOT": "/home/edu/autorenta"
    }
  }
}
```

## Herramientas Disponibles

### Capa de Datos (Supabase)

| Herramienta | Descripción |
|-------------|-------------|
| `verify_db_record` | Verifica si existe un registro en la DB |
| `reset_test_state` | Limpia y siembra datos usando fixtures predefinidas |
| `get_user_state` | Obtiene estado completo de un usuario (profile, wallet, bookings, cars) |
| `query_db` | Ejecuta consultas SQL de solo lectura |

### Capa de Ejecución (Playwright)

| Herramienta | Descripción |
|-------------|-------------|
| `get_browser_console_logs` | Lee logs de consola de un trace de Playwright |
| `analyze_trace_network` | Analiza tráfico de red para encontrar requests fallidos |
| `get_test_artifacts` | Lista screenshots, videos y traces de tests |
| `parse_playwright_report` | Parsea reporte HTML/JSON de Playwright |

### Capa de Código

| Herramienta | Descripción |
|-------------|-------------|
| `read_component_source` | Busca código fuente de un componente Angular por nombre o selector |
| `find_selector_definition` | Encuentra dónde se define un selector CSS/data-testid |
| `patch_test_file` | Aplica correcciones quirúrgicas a un archivo de test |
| `analyze_test_structure` | Analiza la estructura de un test (describes, tests, hooks, locators) |

## Ejemplos de Uso

### 1. Verificar usuario en DB
```
Usar verify_db_record con:
- table: "profiles"
- column: "email"
- value: "renter@test.com"
```

### 2. Resetear estado para test
```
Usar reset_test_state con:
- fixture: "user_with_wallet"
- user_id: "abc-123"
```

### 3. Obtener estado completo de usuario
```
Usar get_user_state con:
- user_id: "abc-123"
```

### 4. Buscar por qué falló un test
```
1. Usar parse_playwright_report para encontrar tests fallidos
2. Usar get_test_artifacts para obtener screenshots del test
3. Usar get_browser_console_logs para ver errores en consola
4. Usar analyze_trace_network para ver requests 4xx/5xx
```

### 5. Corregir un selector roto
```
1. Usar find_selector_definition para encontrar dónde se define
2. Usar read_component_source para ver el código del componente
3. Usar patch_test_file para actualizar el selector en el test
```

## Fixtures Predefinidas

| Fixture | Descripción |
|---------|-------------|
| `empty_cart` | Carrito vacío para usuario de test |
| `cart_with_3_items` | Carrito con 3 autos disponibles |
| `user_with_wallet` | Usuario con balance en wallet (1000 ARS) |
| `booking_pending_payment` | Booking pendiente de pago |
| `booking_confirmed` | Booking confirmado listo para check-in |

## Integración con Checkpoint Architecture

Este MCP complementa la arquitectura Checkpoint & Hydrate:

1. **Checkpoint** guarda estado del navegador
2. **State-Aware MCP** interroga estado de la DB
3. **Juntos** permiten diagnóstico completo sin adivinar

## Variables de Entorno

| Variable | Descripción |
|----------|-------------|
| `NG_APP_SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key para acceso completo |
| `PROJECT_ROOT` | Directorio raíz del proyecto |
