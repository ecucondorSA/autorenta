# Autorenta Data MCP Server

MCP Server especializado en **Gestión de Datos de Prueba y Desarrollo** para Autorenta.

## Problema que Resuelve

Permite interactuar con la base de datos (Supabase) de forma segura y estructurada durante el desarrollo, sin necesidad de scripts SQL manuales. Es ideal para:
- **Generar escenarios de datos** (fixtures) al instante.
- **Verificar el estado real** de usuarios y transacciones.
- **Consultar código fuente** de componentes Angular rápidamente.

## Instalación

```bash
cd tools/state-aware-mcp
npm install
```

## Configuración en .mcp.json

```json
{
  "autorenta-data": {
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

### 1. Gestión de Datos (Supabase)

| Herramienta | Descripción |
|-------------|-------------|
| `reset_test_state` | **🔥 La más importante.** Limpia y siembra datos usando escenarios predefinidos. |
| `verify_db_record` | Verifica si existe un registro específico en la DB. |
| `get_user_state` | Obtiene un reporte completo de un usuario (perfil, wallet, bookings, autos). |
| `wait_for_db_record` | Espera (polling) a que un registro aparezca en la DB. |
| `query_db` | Ejecuta consultas SQL de solo lectura (SELECT). |

### 2. Exploración de Código

| Herramienta | Descripción |
|-------------|-------------|
| `read_component_source` | Busca código fuente de un componente Angular por nombre o selector. |
| `find_selector_definition` | Encuentra dónde se define un selector CSS/data-testid. |

## Fixtures Predefinidas

Estos escenarios se pueden cargar con `reset_test_state`:

| Fixture | Descripción |
|---------|-------------|
| `empty_cart` | Usuario limpio sin reservas. |
| `cart_with_3_items` | Prepara 3 autos disponibles en la DB. |
| `user_with_wallet` | Usuario con 100.000 ARS en su wallet. |
| `booking_pending_payment` | Crea una reserva en estado pendiente de pago. |
| `booking_confirmed` | Crea una reserva confirmada lista para usar. |

## Ejemplos de Uso Común

### Preparar entorno para probar pagos
```
Usar reset_test_state con:
- fixture_name: "booking_pending_payment"
- user_id: "mi-uuid-local"
```

### Verificar por qué un usuario no puede reservar
```
Usar get_user_state con:
- email: "usuario@test.com"
(Muestra si tiene saldo, bookings pendientes o bloqueos)
```