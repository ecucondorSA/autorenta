# 🚀 GUÍA RÁPIDA: Aplicar Migraciones Manualmente

**Tiempo estimado**: 5 minutos

---

## 📝 PASOS SIMPLES

### 1. Ir al SQL Editor de Supabase

Abrir en tu navegador:
```
https://supabase.com/dashboard/project/obxvffplochgeiclibng/sql
```

---

### 2. Aplicar Primera Migración: Tabla Messages

**Archivo**: `supabase/migrations/20251028_create_messages_table_complete.sql`

1. ✅ Abrir el archivo en tu editor de código
2. ✅ Copiar **TODO** el contenido (Ctrl+A, Ctrl+C)
3. ✅ Pegar en el SQL Editor de Supabase
4. ✅ Click en botón **"Run"** (abajo a la derecha)
5. ✅ Esperar mensaje de éxito (2-3 segundos)

**Verificar**:
```sql
-- Ejecutar esta query para verificar:
SELECT * FROM information_schema.tables WHERE table_name = 'messages';

-- Debe retornar 1 fila
```

---

### 3. Aplicar Segunda Migración: Cifrado

**Archivo**: `supabase/migrations/20251028_encrypt_messages_server_side.sql`

1. ✅ Limpiar el SQL Editor (seleccionar todo y borrar)
2. ✅ Abrir el archivo de cifrado en tu editor
3. ✅ Copiar **TODO** el contenido
4. ✅ Pegar en el SQL Editor de Supabase
5. ✅ Click en **"Run"**
6. ✅ Esperar mensaje de éxito (5-10 segundos)

**Verificar**:
```sql
-- Ejecutar para verificar:
SELECT id, algorithm, is_active FROM public.encryption_keys;

-- Debe retornar 1 fila: messages-v1 | AES-256-GCM | true
```

---

### 4. Verificar Todo Funciona

Ejecutar estas queries para validar:

```sql
-- 1. Verificar tabla messages
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'messages'
ORDER BY ordinal_position;

-- Debe mostrar: id, booking_id, car_id, sender_id, recipient_id, body, etc.


-- 2. Verificar Realtime habilitado
SELECT tablename FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' AND tablename = 'messages';

-- Debe retornar: messages


-- 3. Verificar RLS policies
SELECT policyname FROM pg_policies WHERE tablename = 'messages';

-- Debe retornar: 3 policies


-- 4. Verificar extensión pgcrypto
SELECT * FROM pg_extension WHERE extname = 'pgcrypto';

-- Debe retornar: 1 fila
```

---

## ✅ ¡LISTO!

Si todas las queries de verificación retornan resultados, las migraciones se aplicaron correctamente.

---

## 🧪 Test Rápido

Probar que el cifrado funciona:

```sql
-- Enviar mensaje cifrado
SELECT encrypt_message('Hola, este es un mensaje de prueba!');

-- Debe retornar algo como: "wcBMA+Gk8BS0aRBqAQf/RbA..."


-- Descifrar
SELECT decrypt_message(encrypt_message('Hola mundo'));

-- Debe retornar: "Hola mundo"
```

---

## 🚨 Si Hay Errores

### Error: "relation 'messages' already exists"

✅ **Solución**: La tabla ya existe. Puedes ignorar este error o ejecutar:
```sql
DROP TABLE IF EXISTS public.messages CASCADE;
```
Y volver a ejecutar la migración.

### Error: "extension 'pgcrypto' already exists"

✅ **Solución**: Normal. La extensión ya estaba habilitada. Continúa con el resto.

### Error: "function already exists"

✅ **Solución**: Ejecutar antes de la migración:
```sql
DROP FUNCTION IF EXISTS encrypt_message(TEXT);
DROP FUNCTION IF EXISTS decrypt_message(TEXT);
```

---

## 📱 Próximos Pasos Después de Aplicar

1. ✅ **Build frontend**:
   ```bash
   cd apps/web
   npm run build
   ```

2. ✅ **Deploy**:
   ```bash
   npm run deploy:pages
   ```

3. ✅ **Verificar en producción**:
   - Ir a tu app
   - Navegar a un auto
   - Click "Contactar Anfitrión"
   - Debe abrir /messages
   - Enviar mensaje de prueba
   - Verificar que llega en tiempo real

---

## 📞 Soporte

Si tienes problemas:

1. Revisar logs en Supabase Dashboard → Logs
2. Verificar que Realtime está habilitado en proyecto
3. Consultar `MESSAGING_IMPLEMENTATION_GUIDE.md` para más detalles

---

**Generado por**: Claude Code
**Fecha**: 2025-10-28
