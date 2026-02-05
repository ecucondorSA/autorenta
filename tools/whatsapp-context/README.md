# WhatsApp Context Extractor

**READ-ONLY tool** para extraer historial de chats de WhatsApp y dar contexto a la IA.

## ⚠️ IMPORTANTE

Este tool es **100% read-only**. NO envía mensajes automáticamente. Solo lee el historial de chats para dar contexto a la IA.

## Uso

### Exportar todos los chats

```bash
bun extract-wa-context.ts export
```

Esto:
1. Extrae la base de datos de WhatsApp del teléfono vía ADB
2. Parsea todos los chats y mensajes
3. Exporta a `/tmp/wa_context_export.json`

### Ver estadísticas

```bash
bun extract-wa-context.ts stats
```

Muestra:
- Total de chats
- Total de mensajes
- Top 10 chats más activos
- Grupos vs chats directos

### Buscar en chats

```bash
bun extract-wa-context.ts search "autorentar"
```

Busca la palabra clave en todos los mensajes.

### Leer chat específico

```bash
bun extract-wa-context.ts read "Grupo Uber"
```

Muestra los últimos 20 mensajes del chat.

## Requisitos

### Opción A: Android con ADB (Recomendado)

1. **Habilitar USB Debugging:**
   - Ajustes → Acerca del teléfono → Tocar "Número de compilación" 7 veces
   - Ajustes → Sistema → Opciones de desarrollador → Depuración USB

2. **Conectar teléfono:**
   ```bash
   adb devices
   # Debe mostrar: List of devices attached
   #                XXXXXXXX  device
   ```

3. **Verificar acceso a WhatsApp:**
   ```bash
   adb shell ls /data/data/com.whatsapp/databases/
   ```

   Si falla (requiere root), usar **Opción B**.

### Opción B: Backup Manual (Sin Root)

1. **Crear backup de WhatsApp:**
   - WhatsApp → Ajustes → Chats → Copia de seguridad

2. **Extraer backup:**
   ```bash
   adb backup -f /tmp/whatsapp.ab com.whatsapp
   # Confirmar en el teléfono
   ```

3. **Desempaquetar:**
   ```bash
   dd if=/tmp/whatsapp.ab bs=1 skip=24 | python -m zlib -d > /tmp/whatsapp.tar
   tar -xf /tmp/whatsapp.tar
   cp apps/com.whatsapp/db/msgstore.db /tmp/msgstore.db
   ```

4. **Ejecutar extracción:**
   ```bash
   bun extract-wa-context.ts export
   ```

### Opción C: Export Chat Manual (Más Simple)

1. **Exportar chat desde WhatsApp:**
   - Abrir chat → Menú (⋮) → Más → Exportar chat
   - Elegir "Sin archivos multimedia"
   - Enviar el .txt por email

2. **Descargar archivo y parsear:**
   ```bash
   # (Falta implementar parser de .txt - TODO)
   ```

## Estructura del Export

```json
{
  "exportDate": "2026-02-04T...",
  "totalChats": 150,
  "totalMessages": 12500,
  "chats": [
    {
      "id": "123",
      "name": "Grupo Uber",
      "isGroup": true,
      "messageCount": 250,
      "lastMessageTime": "2026-02-04T...",
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

## Integración con OpenClaw/Edison

Una vez exportado el contexto, la IA puede leerlo para entender:
- Historial de conversaciones
- Temas discutidos en grupos
- Contactos y sus interacciones

**La IA NUNCA enviará mensajes automáticamente**. Solo usará el contexto cuando el usuario pregunte algo manualmente.

## Troubleshooting

### "No Android device connected"

Verificar:
```bash
adb devices
```

Si no aparece:
- Revisar que USB debugging esté habilitado
- Cambiar cable USB
- Reinstalar drivers ADB

### "Could not extract database"

El teléfono necesita root o usar Opción B (backup manual).

### "Database not found"

Colocar `msgstore.db` manualmente en `/tmp/msgstore.db`.

## Frecuencia Recomendada

Exportar contexto:
- **Diario:** Si hay conversaciones activas importantes
- **Semanal:** Para mantener contexto actualizado
- **Manual:** Cuando necesites que la IA tenga contexto de nuevas conversaciones

## Seguridad

- El export JSON contiene TODOS tus mensajes
- Guardarlo en `/tmp/` (se borra al reiniciar)
- NO commitear a git
- NO compartir públicamente

## Prevención de Spam Ban

Este tool es READ-ONLY. Para evitar spam ban en WhatsApp:

1. ✅ **Usar este tool** para leer contexto
2. ❌ **NO usar** edison-wa-heartbeat.ts (envía mensajes automáticamente)
3. ❌ **NO configurar** cron jobs para enviar mensajes
4. ✅ **Solo responder** manualmente cuando el usuario lo pida

## Archivos

- `extract-wa-context.ts` - Script principal
- `README.md` - Esta documentación
- `/tmp/msgstore.db` - Database local (temporal)
- `/tmp/wa_context_export.json` - Export final (temporal)
