# ✅ Conexión MCP a Supabase - EXITOSA

## Estado de la Configuración

### ✅ Completado

1. **Servidor MCP PostgreSQL instalado**
   - Paquete: `@modelcontextprotocol/server-postgres`
   - Ubicación: `/usr/bin/mcp-server-postgres`

2. **Configuración MCP actualizada**
   - Archivo: `~/.claude/.mcp.json`
   - Servidor: `supabase-autorenta`
   - Conexión: Pool mode (puerto 6543)

3. **Conexión verificada**
   - ✅ PostgreSQL client conecta exitosamente
   - ✅ Schemas de Supabase disponibles
   - ⚠️  **Schema `public` está vacío (sin tablas de aplicación)**

## Información de Conexión

```
Host: aws-1-us-east-2.pooler.supabase.com
Port: 6543 (Connection Pooling)
Database: postgres
User: postgres.obxvffplochgeiclibng
Project URL: https://obxvffplochgeiclibng.supabase.co
```

## Schemas Disponibles

La base de datos tiene 9 schemas:

| Schema | Owner | Propósito |
|--------|-------|-----------|
| `auth` | supabase_admin | Autenticación (usuarios, sesiones, tokens) |
| `extensions` | postgres | Extensiones PostgreSQL |
| `graphql` | supabase_admin | API GraphQL |
| `graphql_public` | supabase_admin | API GraphQL pública |
| `pgbouncer` | pgbouncer | Connection pooler |
| **`public`** | pg_database_owner | **Schema de aplicación (VACÍO)** |
| `realtime` | supabase_admin | Subscripciones en tiempo real |
| `storage` | supabase_admin | Almacenamiento de archivos |
| `vault` | supabase_admin | Secretos encriptados |

## Próximos Pasos

### 1. Crear estructura de base de datos

Necesitamos crear las tablas en el schema `public`:

```sql
-- Tabla de perfiles de usuario
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  default_currency TEXT DEFAULT 'ARS',
  role TEXT CHECK (role IN ('locador', 'locatario', 'ambos')) NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de autos
CREATE TABLE public.cars (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES public.profiles(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  daily_price DECIMAL(10,2) NOT NULL,
  price_per_day DECIMAL(10,2) NOT NULL,
  status TEXT CHECK (status IN ('draft', 'pending', 'active', 'suspended')) DEFAULT 'draft',
  location_city TEXT NOT NULL,
  location_state TEXT NOT NULL,
  location_province TEXT NOT NULL,
  seats INTEGER NOT NULL,
  transmission TEXT CHECK (transmission IN ('manual', 'automatic')) NOT NULL,
  fuel_type TEXT CHECK (fuel_type IN ('nafta', 'diesel', 'electrico', 'hibrido', 'gnc')) NOT NULL,
  mileage INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de fotos de autos
CREATE TABLE public.car_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  car_id UUID REFERENCES public.cars(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  stored_path TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de reservas
CREATE TABLE public.bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  car_id UUID REFERENCES public.cars(id) NOT NULL,
  renter_id UUID REFERENCES public.profiles(id) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')) DEFAULT 'pending',
  total_amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'ARS',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de intenciones de pago
CREATE TABLE public.payment_intents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) UNIQUE NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de pagos
CREATE TABLE public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) UNIQUE NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Configurar Row Level Security (RLS)

```sql
-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Políticas de ejemplo para profiles
CREATE POLICY "Usuarios pueden ver todos los perfiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Usuarios pueden actualizar su propio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);
```

### 3. Crear funciones RPC

```sql
-- Función para solicitar una reserva
CREATE OR REPLACE FUNCTION request_booking(
  p_car_id UUID,
  p_renter_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_total_amount DECIMAL
)
RETURNS UUID AS $$
DECLARE
  v_booking_id UUID;
BEGIN
  -- Validar fechas, disponibilidad, etc.
  -- Crear booking
  INSERT INTO public.bookings (car_id, renter_id, start_date, end_date, total_amount)
  VALUES (p_car_id, p_renter_id, p_start_date, p_end_date, p_total_amount)
  RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4. Configurar Storage Buckets

```sql
-- Crear bucket para fotos de autos
INSERT INTO storage.buckets (id, name, public)
VALUES ('car-photos', 'car-photos', true);

-- Políticas de storage
CREATE POLICY "Cualquiera puede ver fotos de autos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'car-photos');

CREATE POLICY "Locadores pueden subir fotos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'car-photos' AND
    auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('locador', 'ambos'))
  );
```

## Cómo usar el MCP en Claude Code

Una vez configurado, podrás hacer queries directamente desde Claude Code:

```
# Ejemplos de comandos que podrás usar:
"Muéstrame todas las tablas en el schema public"
"Describe la estructura de la tabla profiles"
"Cuántos usuarios hay registrados?"
"Muéstrame los últimos 10 autos publicados"
"Crea una migración para agregar un campo email a profiles"
```

## Variables de Entorno Configuradas

### Aplicación Angular (`apps/web/.env.development.local`)
```bash
NG_APP_SUPABASE_URL=https://obxvffplochgeiclibng.supabase.co
NG_APP_SUPABASE_ANON_KEY=TU_ANON_KEY_AQUI  # ⚠️ Falta completar
NG_APP_DEFAULT_CURRENCY=ARS
NG_APP_PAYMENTS_WEBHOOK_URL=http://localhost:8787/webhooks/payments
```

### Cloudflare Worker (via wrangler secrets)
```bash
# Ejecutar en functions/workers/payments_webhook/:
wrangler secret put SUPABASE_URL
# Valor: https://obxvffplochgeiclibng.supabase.co

wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# Valor: [OBTENER DE SUPABASE DASHBOARD]
```

## Obtener ANON_KEY y SERVICE_ROLE_KEY

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona el proyecto AutorentA
3. Ve a **Settings** → **API**
4. Copia:
   - **anon / public**: Para la app Angular
   - **service_role**: Para el Cloudflare Worker (admin)

## Testing de Conexión

```bash
# Test directo con psql
PGPASSWORD="5jEWdz26QWsA1hE4" psql \
  -h aws-1-us-east-2.pooler.supabase.com \
  -p 6543 \
  -U postgres.obxvffplochgeiclibng \
  -d postgres \
  -c "SELECT version();"

# Listar schemas
PGPASSWORD="5jEWdz26QWsA1hE4" psql \
  -h aws-1-us-east-2.pooler.supabase.com \
  -p 6543 \
  -U postgres.obxvffplochgeiclibng \
  -d postgres \
  -c "\dn"

# Listar tablas en public
PGPASSWORD="5jEWdz26QWsA1hE4" psql \
  -h aws-1-us-east-2.pooler.supabase.com \
  -p 6543 \
  -U postgres.obxvffplochgeiclibng \
  -d postgres \
  -c "\dt public.*"
```

## Notas de Seguridad

- ✅ Usando connection pooling (puerto 6543) para mejor performance
- ⚠️ Las credenciales NO están en Git (añadidas a .gitignore)
- ⚠️ Cambiar contraseñas antes de producción
- ✅ RLS debe estar habilitado en todas las tablas de aplicación
- ✅ Usar `service_role_key` solo en backend (Worker)
- ✅ Usar `anon_key` en frontend (Angular)

---

**Siguiente paso**: Crear la estructura de la base de datos ejecutando las migraciones SQL.
