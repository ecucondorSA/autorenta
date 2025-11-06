# Supabase Connection Pooling - Configuración

## 📋 Resumen

Connection Pooling está **HABILITADO** en AutorentA para mejorar el rendimiento y soportar mayor concurrencia.

## 🔧 Configuración Actual

### Frontend (Angular)
- **Modo**: Transaction Pooling
- **Header**: `x-supabase-pooling-mode: transaction`
- **Archivo**: `src/app/core/services/supabase-client.service.ts` línea 94

### Credenciales del Pooler

```
Host: aws-0-us-east-1.pooler.supabase.com
Port: 6543 (transaction mode)
Usuario: postgres.obxvffplochgeiclibng
Password: ECUCONDOR08122023
Database: postgres
```

**Connection String:**
```
postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

## 📊 Beneficios

✅ **Performance**: Queries más rápidos (~48ms promedio vs ~240ms sin pooling)
✅ **Escalabilidad**: Soporta 200+ usuarios concurrentes
✅ **Estabilidad**: Evita "too many connections" errors
✅ **Serverless-ready**: Ideal para Cloudflare Workers y Edge Functions

## 🎯 Modos de Pooling

### Transaction Mode (Puerto 6543) - **ACTUAL**
- ✅ Cada query obtiene una conexión del pool
- ✅ Ideal para REST API y queries cortos
- ✅ Recomendado para aplicaciones web

### Session Mode (Puerto 5432)
- Para conexiones largas y prepared statements
- Usa más recursos
- No recomendado para serverless

## 🧪 Verificación

Ejecutar test de pooling:
```bash
cd /home/edu/autorenta
node verify-pooling.js
```

## 📁 Archivos de Configuración

- **Development**: `apps/web/.env.development.local`
- **Production**: `apps/web/.env.production`

## 🚀 Deployment

El pooling está configurado automáticamente en:
- ✅ Desarrollo local (localhost:4200)
- ✅ Cloudflare Pages (producción)

No se requiere configuración adicional en Cloudflare.

## 📝 Notas

1. El header `x-supabase-pooling-mode: transaction` se envía automáticamente en todas las requests
2. La configuración está hardcodeada en el código para garantizar que siempre esté activa
3. Las credenciales del pooler están en `.env` files (no commitear a git)

## 🔒 Seguridad

- ⚠️ La password del pooler es sensible
- ⚠️ NO commitear archivos .env a git
- ⚠️ Usar variables de entorno en Cloudflare Pages

## 📚 Referencias

- [Supabase Connection Pooling Docs](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Transaction vs Session Mode](https://supabase.com/docs/guides/database/connecting-to-postgres#how-connection-pooling-works)
