# Configuración MCP para Supabase - AutorentA

## Estado Actual

✅ Servidor MCP de PostgreSQL instalado (`@modelcontextprotocol/server-postgres`)
✅ Configuración MCP creada en `~/.claude/.mcp.json`
⚠️  **Falta completar las credenciales de Supabase**

## Pasos para completar la configuración

### 1. Obtener credenciales de Supabase

Ve a tu proyecto de Supabase para AutorentA:

1. Abre [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto AutorentA
3. Ve a **Settings** → **Database**
4. En la sección **Connection string**, selecciona **Connection pooling**
5. Copia la cadena de conexión que tiene este formato:
   ```
   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```

### 2. Actualizar configuración MCP

Edita el archivo `~/.claude/.mcp.json` y reemplaza `CONTRASEÑA_AQUI` con tu contraseña real:

```json
{
  "mcpServers": {
    "supabase-autorenta": {
      "comment": "Supabase MCP para proyecto AutorentA - PostgreSQL directo",
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://postgres.[TU-PROJECT-REF]:[TU-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
      ]
    }
  }
}
```

### 3. Alternativa: Usar variables de entorno

Para mayor seguridad, puedes configurar variables de entorno:

**Opción A: Archivo .env local del proyecto**

Crea `/home/edu/autorenta/.env.mcp`:
```bash
SUPABASE_DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

Luego actualiza `~/.claude/.mcp.json`:
```json
{
  "mcpServers": {
    "supabase-autorenta": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "$SUPABASE_DATABASE_URL"],
      "env": {
        "SUPABASE_DATABASE_URL": "${SUPABASE_DATABASE_URL}"
      }
    }
  }
}
```

### 4. Verificar la conexión

Una vez configurado, reinicia Claude Code y verifica la conexión:

```bash
# Desde Claude Code CLI, deberías poder ejecutar queries como:
# "Muéstrame todas las tablas de la base de datos"
# "Describe la estructura de la tabla profiles"
```

## Información del proyecto de Supabase

Basado en la configuración actual:
- **Project Ref**: `gtyvdircfhmdjiaelqkg`
- **URL**: `https://gtyvdircfhmdjiaelqkg.supabase.co`
- **Región**: US East 1 (por defecto)

## Tablas esperadas en la base de datos

Según el proyecto AutorentA, estas son las tablas que deberíamos tener:

- `profiles` - Perfiles de usuario con roles (locador/locatario/ambos)
- `cars` - Listados de autos
- `car_photos` - Fotos de los autos
- `bookings` - Reservas de alquiler
- `payments` - Registros de pagos
- `payment_intents` - Intenciones de pago

## Próximos pasos después de conectar

1. ✅ Verificar estructura de tablas existente
2. 📝 Crear migraciones para tablas faltantes
3. 🔐 Configurar Row Level Security (RLS)
4. 🔄 Crear funciones RPC necesarias (ej: `request_booking`)
5. 📊 Poblar datos de prueba

## Notas de seguridad

- ⚠️ **NO** commits la cadena de conexión con la contraseña en Git
- ⚠️ Usa **Connection Pooling** (puerto 6543) para mejor rendimiento
- ⚠️ La cadena de conexión usa el usuario `postgres` con privilegios completos
- ✅ Considera crear un usuario de base de datos con permisos limitados para desarrollo

## Troubleshooting

**Error: "Connection refused"**
- Verifica que la región sea correcta (puede ser `sa-east-1` para Sudamérica)
- Verifica que Connection Pooling esté habilitado en Supabase

**Error: "Authentication failed"**
- Verifica que la contraseña sea correcta
- Asegúrate de no tener espacios extra en la cadena de conexión

**Error: "npx command not found"**
- Asegúrate de tener Node.js y npm instalados
- Ejecuta: `npm install -g npx`
