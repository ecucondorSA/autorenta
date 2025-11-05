# 🚀 Instrucciones de Configuración - AutorentA

## 1️⃣ Crear Tabla mp_onboarding_states en Supabase

### Paso a paso:

1. **Ir a Supabase Dashboard**: https://supabase.com/dashboard/project/obxvffplochgeiclibng
2. **Ir a SQL Editor** (menú lateral)
3. **Crear nueva query**
4. **Copiar y pegar** el siguiente SQL:

```sql
-- Tabla para estados de onboarding de Mercado Pago
CREATE TABLE IF NOT EXISTS public.mp_onboarding_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    state TEXT NOT NULL UNIQUE,
    redirect_uri TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_mp_onboarding_user_id ON public.mp_onboarding_states(user_id);
CREATE INDEX IF NOT EXISTS idx_mp_onboarding_state ON public.mp_onboarding_states(state);
CREATE INDEX IF NOT EXISTS idx_mp_onboarding_completed ON public.mp_onboarding_states(completed);

-- RLS policies
ALTER TABLE public.mp_onboarding_states ENABLE ROW LEVEL SECURITY;

-- Policy: Los usuarios pueden ver sus propios estados
CREATE POLICY "Users can view own onboarding states"
    ON public.mp_onboarding_states FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Los usuarios pueden insertar sus propios estados
CREATE POLICY "Users can insert own onboarding states"
    ON public.mp_onboarding_states FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Los usuarios pueden actualizar sus propios estados
CREATE POLICY "Users can update own onboarding states"
    ON public.mp_onboarding_states FOR UPDATE
    USING (auth.uid() = user_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_mp_onboarding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_mp_onboarding_states_updated_at
    BEFORE UPDATE ON public.mp_onboarding_states
    FOR EACH ROW
    EXECUTE FUNCTION public.update_mp_onboarding_updated_at();
```

5. **Ejecutar** (botón Run o Ctrl+Enter)
6. **Verificar** que dice "Success"

### ✅ Verificar que funcionó:

```sql
SELECT * FROM mp_onboarding_states LIMIT 1;
```

Debe retornar vacío sin errores.

---

## 2️⃣ Activar Onboarding de Mercado Pago (OPCIONAL)

Una vez creada la tabla, puedes activar el onboarding:

**Archivo**: `apps/web/src/app/features/cars/publish/publish-car-v2.page.ts`

**Línea 542** - Cambiar:
```typescript
if (false && !canList) {
```

Por:
```typescript
if (!canList) {
```

---

## 3️⃣ Problema: No puedo eliminar autos

### ✅ SOLUCIONADO

**Causa**: Los autos con reservas (activas o históricas) no pueden eliminarse debido a foreign key constraints.

**Solución implementada**:
- El sistema ahora verifica TODAS las reservas antes de intentar eliminar
- Muestra un mensaje claro explicando que el auto no puede eliminarse
- Sugiere desactivar el auto en su lugar

**Mensaje que verás**:
```
❌ No se puede eliminar este auto

Este auto tiene X reservas en el historial.

Los autos con reservas no pueden eliminarse para mantener el historial.
Podés desactivar el auto en su lugar.
```

### Alternativa: Desactivar el auto

En lugar de eliminar, puedes desactivar un auto para que no aparezca en búsquedas:

1. Ve a "Mis Autos"
2. Busca el toggle "Activo/Inactivo"
3. Cambia el estado a "Inactivo"

El auto seguirá en tu perfil pero no será visible para otros usuarios.

---

## 4️⃣ Deployment a Cloudflare Pages

### URLs de deployment:

- **Última versión**: https://22dee42e.autorenta-web.pages.dev
- **Anterior**: https://0e1a4a05.autorenta-web.pages.dev

### Hacer nuevo deployment:

```bash
cd /home/edu/autorenta/apps/web
npm run build
npm run deploy:pages
```

---

## 5️⃣ Verificar Connection Pooling

El pooling ya está configurado y activo. Para verificar:

```bash
cd /home/edu/autorenta
node verify-pooling.js
```

Deberías ver:
```
✅ CON Pooling: ~50ms promedio
⚡ Mejora con pooling en queries simultáneas
```

---

## 📝 Notas Adicionales

### Variables de entorno necesarias:

```env
NG_APP_SUPABASE_URL=https://obxvffplochgeiclibng.supabase.co
NG_APP_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_DB_URL=postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

### Archivos importantes:

- `.env.development.local` - Configuración local
- `.env.production` - Configuración producción  
- `SUPABASE_POOLING_CONFIG.md` - Documentación pooling
- `create-mp-onboarding-table.sql` - SQL para tabla MP

---

## 🆘 Soporte

Si tienes problemas:

1. Verifica los logs de consola del navegador
2. Revisa que el usuario esté autenticado
3. Verifica RLS policies en Supabase
4. Consulta la documentación en `/home/edu/autorenta/*.md`

