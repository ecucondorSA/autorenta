# WhatsApp Automation - Status Report

**Fecha:** 2026-02-05 00:02
**Estado:** ✅ TODOS LOS BOTS DETENIDOS - READ-ONLY MODE ACTIVO

---

## 🔴 SITUACIÓN CRÍTICA RESUELTA

### Problema
- WhatsApp amenazó con bloquear el número por spam
- Mensajes automáticos se enviaban cada 30 minutos vía `edison-wa-heartbeat.ts`
- Múltiples dispositivos vinculados (OpenClaw + WAHA) causando conflictos

### Solución Implementada
- ✅ **OpenClaw:** Systemd service deshabilitado (`openclaw-gateway.service`)
- ✅ **WAHA:** Docker container detenido
- ✅ **Cron Jobs:** Heartbeat de WhatsApp eliminado de `/etc/cron.d/edison-ecosystem`
- ✅ **Scripts:** `edison-wa-heartbeat.ts` no se ejecutará automáticamente

---

## ✅ VERIFICACIÓN DEL SISTEMA

### Procesos
```bash
$ ps aux | grep -E "openclaw|edison|waha"
# Resultado: Ningún proceso en ejecución ✓
```

### Servicios Systemd
```bash
$ systemctl --user status openclaw-gateway.service
# Estado: inactive (dead), disabled ✓
```

### Docker Containers
```bash
$ docker ps -a | grep -E "waha|n8n"
# waha: Exited (137) ✓
# n8n: Exited (0) ✓
```

### Cron Jobs
```bash
$ cat /etc/cron.d/edison-ecosystem
# Facebook Scraper: Activo (no afecta WhatsApp)
# WhatsApp Heartbeat: ELIMINADO ✓
```

---

## 🟢 NUEVA ARQUITECTURA - READ ONLY

### Objetivo
Obtener contexto de TODOS los chats de WhatsApp para que la IA pueda responder inteligentemente, **SIN enviar mensajes automáticamente**.

### Herramienta Creada
**`extract-wa-context.ts`** - Extractor de contexto READ-ONLY

**Ubicación:** `/home/edu/autorenta/tools/whatsapp-context/`

### Uso

#### 1. Exportar Contexto Completo
```bash
cd /home/edu/autorenta/tools/whatsapp-context
bun extract-wa-context.ts export
```

**Resultado:**
- Extrae base de datos de WhatsApp vía ADB
- Parsea todos los chats y mensajes
- Guarda en `/tmp/wa_context_export.json`

#### 2. Ver Estadísticas
```bash
bun extract-wa-context.ts stats
```

**Muestra:**
- Total de chats
- Total de mensajes
- Top 10 chats más activos
- Grupos vs chats directos

#### 3. Buscar en Chats
```bash
bun extract-wa-context.ts search "autorentar"
```

Busca la palabra clave en todos los mensajes exportados.

#### 4. Leer Chat Específico
```bash
bun extract-wa-context.ts read "Grupo Uber"
```

Muestra los últimos 20 mensajes del chat.

---

## 📋 REQUISITOS

### Opción A: Android con ADB (Recomendado)

**1. Habilitar USB Debugging:**
- Ajustes → Acerca del teléfono
- Tocar "Número de compilación" 7 veces
- Ajustes → Sistema → Opciones de desarrollador
- Activar "Depuración USB"

**2. Conectar teléfono y verificar:**
```bash
adb devices
# Debe mostrar: XXXXXXXX  device
```

**3. Ejecutar extracción:**
```bash
bun extract-wa-context.ts export
```

### Opción B: Backup Manual (Sin Root)

Si el teléfono no tiene root, usar backup de WhatsApp:

```bash
# 1. Crear backup
adb backup -f /tmp/whatsapp.ab com.whatsapp

# 2. Desempaquetar
dd if=/tmp/whatsapp.ab bs=1 skip=24 | python -m zlib -d > /tmp/whatsapp.tar
tar -xf /tmp/whatsapp.tar

# 3. Copiar database
cp apps/com.whatsapp/db/msgstore.db /tmp/msgstore.db

# 4. Exportar
bun extract-wa-context.ts export
```

### Opción C: Export Chat Manual (Más Simple)

1. WhatsApp → Abrir chat → Menú (⋮) → Más → Exportar chat
2. Elegir "Sin archivos multimedia"
3. Enviar el .txt por email
4. (Requiere parser de .txt - TODO)

---

## 📊 FORMATO DEL EXPORT

El archivo `/tmp/wa_context_export.json` tiene esta estructura:

```json
{
  "exportDate": "2026-02-05T03:02:15.234Z",
  "totalChats": 150,
  "totalMessages": 12500,
  "chats": [
    {
      "id": "123",
      "name": "Grupo Uber",
      "isGroup": true,
      "messageCount": 250,
      "lastMessageTime": "2026-02-04T22:30:00Z",
      "messages": [
        {
          "id": "msg1",
          "from": "Juan",
          "text": "Hola, cómo están?",
          "timestamp": "2026-02-04T10:30:00Z",
          "isFromMe": false,
          "chatId": "123"
        }
      ]
    }
  ]
}
```

---

## 🔒 SEGURIDAD

### Datos Sensibles
- El export JSON contiene **TODOS** tus mensajes de WhatsApp
- Se guarda en `/tmp/` (se borra al reiniciar el sistema)
- **NO commitear** a git
- **NO compartir** públicamente

### Gitignore
Agregar a `.gitignore`:
```
/tmp/msgstore.db
/tmp/wa_context_export.json
tools/whatsapp-context/*.db
tools/whatsapp-context/*.json
```

---

## 🚫 PREVENCIÓN DE SPAM BAN

### Reglas Estrictas

1. ✅ **SÍ:** Usar `extract-wa-context.ts` para leer chats
2. ❌ **NO:** Ejecutar `edison-wa-heartbeat.ts` (envía mensajes automáticamente)
3. ❌ **NO:** Configurar cron jobs para WhatsApp
4. ✅ **SÍ:** Responder SOLO manualmente cuando el usuario lo pida
5. ❌ **NO:** Vincular múltiples bots al mismo número

### Si WhatsApp Ya Te Bloqueó

1. Ir a: Configuración → Ayuda → Contactar Soporte
2. Explicar que fue un error técnico y que ya desconectaste los bots
3. Desconectar TODOS los dispositivos vinculados
4. Esperar 72 horas sin enviar mensajes
5. No intentar automatizar nuevamente

---

## 🔄 FRECUENCIA RECOMENDADA

### Exportar Contexto

| Frecuencia | Cuándo Usar |
|------------|-------------|
| **Diario** | Si hay conversaciones activas importantes con clientes |
| **Semanal** | Para mantener contexto general actualizado |
| **Manual** | Cuando necesites que la IA tenga contexto de nuevas conversaciones específicas |

### Comando Diario Sugerido

```bash
# Agregar a cron (SOLO lectura, seguro):
0 8 * * * cd /home/edu/autorenta/tools/whatsapp-context && bun extract-wa-context.ts export >> /var/log/wa-context.log 2>&1
```

Este cron job es **SEGURO** porque:
- Solo **lee** chats, no envía nada
- Se ejecuta 1 vez al día (8 AM)
- No hay riesgo de spam ban

---

## 🔧 INTEGRACIÓN CON IA

### OpenClaw + Edison (Manual)

Una vez exportado el contexto, la IA puede:
1. Leer el archivo `/tmp/wa_context_export.json`
2. Entender el historial de conversaciones
3. Responder SOLO cuando el usuario escriba manualmente a Edison

**OpenClaw NO enviará mensajes automáticamente.**

### Configuración Futura (Opcional)

Si en el futuro quieres que OpenClaw tenga acceso al contexto:

```typescript
// En el agente de OpenClaw
const waContext = await loadWhatsAppContext('/tmp/wa_context_export.json');

// Cuando el usuario pregunta algo, Edison tiene acceso a:
// - Historial de conversaciones
// - Temas discutidos en grupos
// - Contactos y sus datos
```

---

## 📝 ARCHIVOS IMPORTANTES

| Archivo | Descripción |
|---------|-------------|
| `tools/whatsapp-context/extract-wa-context.ts` | Script principal de extracción |
| `tools/whatsapp-context/README.md` | Documentación completa |
| `tools/whatsapp-context/STATUS.md` | Este archivo de estado |
| `/tmp/msgstore.db` | Database de WhatsApp (temporal) |
| `/tmp/wa_context_export.json` | Export final (temporal) |
| `/etc/cron.d/edison-ecosystem` | Cron jobs (heartbeat eliminado) |
| `~/.config/systemd/user/openclaw-gateway.service` | Systemd service (deshabilitado) |

---

## ⚠️ ARCHIVOS PELIGROSOS (NO USAR)

| Archivo | Por Qué NO Usar |
|---------|-----------------|
| `tools/marketing-automation/scripts/edison-wa-heartbeat.ts` | Envía mensajes automáticamente → Spam ban |
| `tools/marketing-automation/scripts/edison-autonomous.ts` | Scraper de Facebook (OK, no afecta WhatsApp) |

---

## ✅ CHECKLIST DE SEGURIDAD

Antes de dormir tranquilo, verificar:

- [ ] `ps aux | grep openclaw` → Vacío
- [ ] `docker ps | grep waha` → Vacío
- [ ] `systemctl --user status openclaw-gateway` → inactive (dead)
- [ ] `/etc/cron.d/edison-ecosystem` → Sin líneas de `edison-wa-heartbeat`
- [ ] WhatsApp → Configuración → Dispositivos vinculados → Máximo 1-2 (no 4+)

---

## 🎯 PRÓXIMOS PASOS

1. **Conectar teléfono Android** vía USB
2. **Habilitar USB Debugging** en ajustes de desarrollador
3. **Ejecutar:** `bun extract-wa-context.ts export`
4. **Verificar:** `bun extract-wa-context.ts stats`
5. **Probar búsqueda:** `bun extract-wa-context.ts search "autorentar"`

---

## 🆘 SOPORTE

Si algo falla, revisar:

```bash
# Logs del script
tail -f /var/log/wa-context.log

# Estado de ADB
adb devices

# Base de datos manual
ls -lh /tmp/msgstore.db
```

---

**© 2026 AutoRenta | Sistema READ-ONLY para WhatsApp Context**

**Última actualización:** 2026-02-05 00:02
**Estado:** ✅ Operativo - Sin riesgo de spam ban
