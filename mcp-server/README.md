# AutoRenta MCP Server

Servidor MCP (Model Context Protocol) personalizado para la plataforma AutoRenta que proporciona acceso en tiempo real a datos y operaciones de la plataforma.

## 🚀 Características

- **Acceso en tiempo real** a datos de Supabase
- **Caché inteligente** para optimizar consultas
- **8 recursos** para lectura de datos
- **7 herramientas** para ejecutar acciones
- **Integración nativa** con Cursor y Claude Code
- **200k tokens de contexto** aprovechados eficientemente

## 📦 Instalación

```bash
# 1. Ejecutar script de setup
./setup.sh

# 2. Configurar credenciales en .env
# Editar .env con tus credenciales de Supabase
```

## 🔧 Configuración

### Variables de entorno (.env)

```env
# Supabase Configuration
SUPABASE_URL=https://obxvffplochgeiclibng.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here  # Opcional pero recomendado

# Server Configuration
MCP_DEBUG=false
MCP_LOG_LEVEL=info

# Cache Configuration
CACHE_TTL=300  # 5 minutos
ENABLE_CACHE=true
```

### Integración con Cursor/Claude

El servidor ya está configurado en `.claude/config.json`:

```json
{
  "mcpServers": {
    "autorenta-platform": {
      "command": "node",
      "args": ["/home/edu/autorenta/mcp-server/dist/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

## 📚 Recursos Disponibles

### 1. Estado de la Plataforma
```
URI: autorenta://platform/status
Descripción: Estadísticas generales y estado de salud
```

### 2. Autos Disponibles
```
URI: autorenta://cars/available
Descripción: Lista de autos activos para renta
```

### 3. Reservas Activas
```
URI: autorenta://bookings/active
Descripción: Reservas en curso
```

### 4. Reservas Pendientes
```
URI: autorenta://bookings/pending
Descripción: Reservas esperando aprobación
```

### 5. Resumen Diario
```
URI: autorenta://daily/summary
Descripción: Operaciones del día con alertas
```

### 6. Búsqueda de Autos
```
URI: autorenta://search/cars
Parámetros: brand, model, year, minPrice, maxPrice, location
```

### 7. Detalles de Auto
```
URI: autorenta://car/details
Parámetros: carId (requerido)
```

### 8. Perfil de Usuario
```
URI: autorenta://user/profile
Parámetros: userId (requerido)
```

## 🛠️ Herramientas Disponibles

### 1. approve_booking
Aprobar una reserva pendiente
```json
{
  "bookingId": "uuid"
}
```

### 2. reject_booking
Rechazar una reserva
```json
{
  "bookingId": "uuid",
  "reason": "string (opcional)"
}
```

### 3. block_car_availability
Bloquear disponibilidad de un auto
```json
{
  "carId": "uuid",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "reason": "string"
}
```

### 4. generate_revenue_report
Generar reporte de ingresos
```json
{
  "ownerId": "uuid (opcional)",
  "startDate": "YYYY-MM-DD (opcional)",
  "endDate": "YYYY-MM-DD (opcional)"
}
```

### 5. find_user
Buscar usuarios por email o nombre
```json
{
  "query": "string"
}
```

### 6. check_car_availability
Verificar disponibilidad de un auto
```json
{
  "carId": "uuid",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD"
}
```

### 7. clear_cache
Limpiar caché del servidor
```json
{
  "prefix": "string (opcional)"
}
```

## 💻 Desarrollo

### Iniciar en modo desarrollo
```bash
npm run dev
```

### Compilar TypeScript
```bash
npm run build
```

### Ejecutar cliente de prueba
```bash
npm test
# o directamente
node test-client.js
```

## 🧪 Testing

El cliente de prueba interactivo permite:
- Listar todos los recursos
- Leer cualquier recurso
- Ejecutar herramientas
- Verificar conexión con Supabase

```bash
npm test

# Menú interactivo:
1. List resources
2. Read platform status
3. Get available cars
4. Get active bookings
5. Get pending bookings
6. List tools
7. Search user
8. Check car availability
9. Clear cache
0. Exit
```

## 📊 Uso con Cursor/Claude

### Ejemplos de consultas

```
@autorenta-platform muéstrame las reservas pendientes de aprobación

@autorenta-platform ¿cuál es el estado actual de la plataforma?

@autorenta-platform busca autos disponibles con precio menor a 50000

@autorenta-platform verifica la disponibilidad del auto [UUID] para las fechas X a Y

@autorenta-platform genera un reporte de ingresos del último mes
```

### Ventajas del servidor MCP

1. **Datos en tiempo real**: Siempre información actualizada de Supabase
2. **Contexto eficiente**: No necesitas copiar/pegar datos constantemente
3. **Acciones directas**: Claude puede aprobar reservas, generar reportes, etc.
4. **Memoria persistente**: El caché mantiene datos frecuentes disponibles
5. **200k tokens aprovechados**: El contexto largo se usa para datos relevantes

## 🔍 Debugging

### Logs del servidor
```bash
# Ver logs en tiempo real durante desarrollo
npm run dev

# Los logs se muestran en stderr para no interferir con JSON-RPC
```

### Verificar conexión
```bash
# Test rápido
timeout 5 node dist/index.js
```

### Limpiar caché
```bash
# Desde el cliente de prueba, opción 9
# O programáticamente llamando a la herramienta clear_cache
```

## 📝 Arquitectura

```
mcp-server/
├── src/
│   ├── index.ts           # Entry point
│   ├── lib/
│   │   ├── server.ts      # MCP protocol implementation
│   │   └── supabase.ts    # Supabase client with cache
│   ├── resources/         # Read-only data endpoints
│   │   └── index.ts       # Resource definitions
│   └── tools/            # Action handlers
│       └── index.ts      # Tool definitions
├── dist/                 # Compiled JavaScript
├── .env                  # Configuration (not in git)
├── package.json
└── test-client.js        # Interactive test client
```

## 🚀 Próximos pasos

1. **Agregar más recursos**: Historial de transacciones, métricas detalladas
2. **Más herramientas**: Gestión de disputas, moderación de reviews
3. **Suscripciones**: Notificaciones en tiempo real de cambios
4. **Analytics**: Integración con herramientas de análisis
5. **Optimizaciones**: Paginación inteligente, compresión de respuestas

## 📄 Licencia

Propietario - AutoRenta Platform