# 📱 INSTRUCCIONES PARA EXTRAER WHATSAPP

## 🚀 Ejecutá Esto en tu Terminal

```bash
cd ~/autorenta/tools/whatsapp-context/extractor
python3 wa_kdbe.py --allow-reboot
```

## 📋 Qué Va a Pasar (Paso a Paso)

### 1. Selección de Dispositivo
Te va a mostrar:
```
1. 096143732G00108 device   Infinix X6826C
2. adb-096143732G0 device   Infinix X6826C
Enter device number (for ex: 2):
```

**→ Escribí: `1` y presioná Enter**

### 2. Confirmación de Usuario
Te va a preguntar tu nombre/username para organizar los archivos.

**→ Escribí: `edu` y presioná Enter**

### 3. Backup de WhatsApp Business
El script va a:
- ✅ Hacer backup de tu WhatsApp Business actual
- ✅ Desinstalar WhatsApp Business temporalmente
- ✅ Instalar versión legacy de WhatsApp
- ✅ Hacer backup via ADB (incluye la key + msgstore.db)
- ✅ Restaurar WhatsApp Business original

**⚠️ IMPORTANTE:**
- Durante este proceso (10-15 min) vas a ver pantallas en tu teléfono
- **Aceptá TODAS las confirmaciones** que aparezcan
- **NO uses WhatsApp** durante el proceso
- Mensajes que lleguen durante estos 10 min los vas a recibir después

### 4. Confirmaciones en el Teléfono

El teléfono va a mostrar:
1. "Hacer backup de datos?" → **ACEPTAR**
2. "Permitir USB debugging?" → **PERMITIR**
3. "Instalar aplicación?" → **INSTALAR**
4. "Hacer backup?" → **ACEPTAR** (de nuevo)
5. Puede que pida "Permitir acceso a almacenamiento" → **PERMITIR**

### 5. Proceso Completo
Cuando termine vas a ver:
```
✅ Extraction completed successfully!
Files saved in: extracted/edu/
```

## 📁 Archivos Extraídos

Después de ejecutar, vas a tener:
```
extracted/edu/
├── key                    # Key de desencriptación
├── msgstore.db           # Base de datos SQLite (SIN encriptar)
├── wa.db                 # Database de WhatsApp
└── ... otros archivos
```

## 🔓 Cómo Leer los Mensajes Después

Una vez que tengas `msgstore.db`, ejecutá:

```bash
cd ~/autorenta/tools/whatsapp-context
sqlite3 extracted/edu/msgstore.db "SELECT * FROM messages LIMIT 10;"
```

O mejor, yo te creo un parser bonito después.

## ⚠️ Si Algo Sale Mal

### Error: "Device not found"
```bash
adb devices
# Si no aparece, desconectá y volvé a conectar el USB
```

### Error: "Backup failed"
- Asegurate que USB Debugging esté habilitado
- Revisá que la pantalla del teléfono esté desbloqueada
- Aceptá todos los permisos que pida

### WhatsApp no se restauró
```bash
cd ~/autorenta/tools/whatsapp-context/extractor
python3 restore_whatsapp.py
```

## ⏱️ Tiempo Total: ~15 minutos

1. Configuración inicial: 2 min
2. Backup original: 2 min
3. Instalación legacy: 2 min
4. Backup de datos: 5 min
5. Restauración: 3 min
6. Verificación: 1 min

---

**¿Listo para ejecutar?**
Abrí tu terminal y ejecutá el comando de arriba 👆
