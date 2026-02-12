# 🚀 Guía Rápida: Auditoría Móvil con ADB

## Paso 1: Preparar el Dispositivo

1. **Habilitar Depuración USB** en tu Android:
   - Configuración → Acerca del teléfono → Toca 7 veces "Número de compilación"
   - Configuración → Opciones de desarrollador → Activar "Depuración USB"

2. **Conectar por USB** a tu computadora

3. **Verificar conexión:**
   ```bash
   adb devices
   # Deberías ver tu dispositivo listado
   ```

## Paso 2: Conectar vía WiFi

```bash
# Opción A: Script automático
pnpm run audit:mobile:connect

# Opción B: Manual
adb tcpip 5555
adb connect <IP_DEL_DISPOSITIVO>:5555
```

**Obtener IP del dispositivo:**
```bash
adb shell ip -f inet addr show wlan0 | grep "inet " | awk '{print $2}' | cut -d/ -f1
```

## Paso 3: Iniciar Servidor de Desarrollo

En una terminal separada:

```bash
# Opción A: Servidor accesible por red
cd apps/web
ng serve --host 0.0.0.0 --port 4200

# Opción B: Usar el script del proyecto
pnpm dev
# (Asegúrate de que use --host 0.0.0.0)
```

**Obtener IP de tu computadora:**
```bash
# Linux
ip route get 1.1.1.1 | awk '{print $7; exit}'

# macOS
ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1
```

## Paso 4: Abrir la App en el Móvil

En Chrome del móvil, abre:
```
http://<IP_DE_TU_COMPUTADORA>:4200
```

Ejemplo: `http://192.168.1.100:4200`

## Paso 5: Ejecutar Auditoría

```bash
pnpm run audit:mobile
```

El script:
- ✅ Detecta tu dispositivo
- ✅ Verifica el servidor
- ✅ Ejecuta Lighthouse
- ✅ Genera reportes

## Paso 6: Ver Resultados

```bash
# Abrir reporte HTML
open artifacts/audit-reports/mobile-*/lighthouse-report.html

# O en Linux
xdg-open artifacts/audit-reports/mobile-*/lighthouse-report.html
```

## Troubleshooting Rápido

### "No se detecta dispositivo"
```bash
adb kill-server
adb start-server
adb devices
```

### "No puedo acceder desde el móvil"
- Verifica firewall: `sudo ufw allow 4200`
- Asegúrate de usar `--host 0.0.0.0`
- Verifica que estés en la misma red WiFi

### "Lighthouse falla"
```bash
npm install -g lighthouse
# O usar npx (el script lo intenta automáticamente)
```

## Métricas Esperadas (Mobile)

| Métrica | Bueno | Aceptable | Malo |
|---------|-------|-----------|------|
| **Performance** | > 75 | 50-75 | < 50 |
| **LCP** | < 2.5s | 2.5-4s | > 4s |
| **FID** | < 100ms | 100-300ms | > 300ms |
| **CLS** | < 0.1 | 0.1-0.25 | > 0.25 |
| **Accessibility** | > 90 | 80-90 | < 80 |

## Próximos Pasos

1. Revisar reporte Lighthouse
2. Identificar problemas de performance
3. Optimizar imágenes si LCP > 2.5s
4. Mejorar accesibilidad si score < 90
5. Verificar bundle size en Network tab
