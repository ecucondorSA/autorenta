# 🚀 Instagram Setup - Quick Start

## 3 Pasos Simples

### PASO 1: Instalar Chrome Extension (2 minutos)

```
1. Abre Chrome
2. Ve a: chrome://extensions/
3. Activa "Developer mode" (esquina superior derecha)
4. Haz clic en "Load unpacked"
5. Selecciona: /home/edu/autorentar/chrome-extension-instagram-setup/
6. ✅ ¡Listo! Verás el icono en la barra superior
```

### PASO 2: Extraer Credenciales (2 minutos)

```
1. Ve a: https://developers.facebook.com/apps/
2. Selecciona app "AutoRenta"
3. Ve a: Instagram Graph API → Settings
4. Haz clic en el icono de la extensión 📸
5. Haz clic en "Configurar en AutoRenta"
6. ✅ Credenciales copiadas al portapapeles
```

### PASO 3: Guardar en Supabase (2 minutos)

```bash
# Terminal
cd /home/edu/autorentar

# Ejecuta
bun scripts/setup-instagram-credentials.ts

# Ingresa los 3 valores cuando se pida
# ✅ ¡Listo! Instagram está configurado
```

---

## ✨ Ya Está

Ahora puedes publicar en Instagram automáticamente:

```bash
gh workflow run campaign-renter-acquisition.yml \
  -f template=free_credit_300 \
  -f platform=instagram \
  -f dry_run=false
```

---

## 📖 Documentación Completa

- 📘 [Chrome Extension Guide](./chrome-extension-instagram-setup/README.md)
- 📘 [Instagram Setup Guide](./docs/INSTAGRAM_SETUP_GUIDE.md)
- 📘 [Marketing Campaigns Guide](./docs/MARKETING_CAMPAIGNS_GUIDE.md)

---

**Tiempo total: ~6 minutos**
