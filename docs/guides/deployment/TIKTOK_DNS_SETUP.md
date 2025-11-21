# 🎵 Configuración de DNS para TikTok Developers

**Dominio**: `autorentar.com`
**Fecha**: 2025-11-20

## 📋 Información del Registro TXT

| Campo | Valor |
|-------|-------|
| **Tipo** | TXT |
| **Nombre** | `@` (dominio raíz) |
| **Contenido** | `tiktok-developers-site-verification=933WGFWSl55S6GpQilNQXer0Fbl7ggl3` |
| **TTL** | Automático |
| **Proxy Status** | **Solo DNS** (⚠️ IMPORTANTE: NO usar proxy) |

## 🚀 Método Rápido (Recomendado)

### Opción 1: Script Interactivo

```bash
./tools/add-tiktok-dns-quick.sh
```

Este script:
- Abre el dashboard de Cloudflare automáticamente
- Muestra los pasos a seguir
- Te lleva directamente a la página de DNS

### Opción 2: Manual en Dashboard

1. **Abrir Dashboard**: https://dash.cloudflare.com/5b448192fe4b369642b68ad8f53a7603/domains/autorentar.com/dns
2. **Click en "Agregar registro"** (botón azul, esquina superior derecha)
3. **Completar campos**:
   - Tipo: `TXT`
   - Nombre: `@`
   - Contenido: `tiktok-developers-site-verification=933WGFWSl55S6GpQilNQXer0Fbl7ggl3`
   - TTL: `Automático`
   - Proxy Status: `Solo DNS` ⚠️
4. **Click en "Guardar"**
5. **Esperar 5-10 minutos** para propagación
6. **Verificar en TikTok Developers**: Click en "Verify"

## 🤖 Método Automático (Requiere API Token)

Si tienes un API Token de Cloudflare configurado:

```bash
# 1. Exportar token
export CLOUDFLARE_API_TOKEN='tu-token-aqui'

# 2. Ejecutar script automático
./tools/add-tiktok-dns-record.sh
```

### Crear API Token

1. Ve a: https://dash.cloudflare.com/profile/api-tokens
2. Click en "Create Token"
3. Usa template "Edit zone DNS" o crea custom:
   - Permisos: `Zone` → `DNS` → `Edit`
   - Zone Resources: `Include` → `Specific zone` → `autorentar.com`
4. Copia el token generado

## ✅ Verificación

Después de agregar el registro:

1. **Espera 5-10 minutos** para propagación DNS
2. **Verifica en Cloudflare**: El registro debe aparecer en la lista DNS
3. **Verifica en TikTok**:
   - Regresa a TikTok Developers
   - Click en "Verify"
   - Debe mostrar "Verified" ✅

## 🔍 Troubleshooting

### El registro no aparece en TikTok

- **Verifica TTL**: Debe ser "Automático" o bajo (1 hora)
- **Verifica Proxy Status**: Debe ser "Solo DNS" (NO proxy)
- **Espera más tiempo**: DNS puede tardar hasta 24 horas (normalmente 5-10 min)
- **Verifica el contenido**: Debe ser exactamente: `tiktok-developers-site-verification=933WGFWSl55S6GpQilNQXer0Fbl7ggl3`

### Verificar registro DNS

```bash
# Verificar desde terminal
dig TXT autorentar.com +short

# Debe mostrar:
# "tiktok-developers-site-verification=933WGFWSl55S6GpQilNQXer0Fbl7ggl3"
```

## 📝 Notas

- ⚠️ **CRÍTICO**: El Proxy Status debe ser "Solo DNS". Si usas "Proxied", TikTok no podrá verificar el registro.
- El registro TXT puede coexistir con otros registros TXT (SPF, etc.)
- No afecta otros registros DNS existentes



