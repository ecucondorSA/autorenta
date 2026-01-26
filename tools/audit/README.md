# Auditoría Móvil AutoRenta

Scripts para realizar auditorías completas de la aplicación en dispositivos móviles usando ADB y Chrome DevTools Protocol.

## Requisitos

1. **ADB (Android Debug Bridge)**
   ```bash
   # Ubuntu/Debian
   sudo apt install android-tools-adb
   
   # macOS
   brew install android-platform-tools
   ```

2. **Node.js** (v20+)
   ```bash
   node --version
   ```

3. **Dispositivo Android** con:
   - Depuración USB habilitada
   - Conectado a la misma red WiFi que tu computadora

## Uso Rápido

### 1. Conectar Dispositivo

```bash
# Conectar por USB primero
adb devices

# Ejecutar script de conexión WiFi
./tools/mobile/scripts/connect-device.sh
```

### 2. Iniciar Servidor de Desarrollo

```bash
# En una terminal
pnpm dev

# O con host accesible por red
cd apps/web
ng serve --host 0.0.0.0 --port 4200
```

### 3. Ejecutar Auditoría

```bash
./tools/audit/mobile-audit.sh
```

El script:
1. ✅ Detecta tu dispositivo Android
2. ✅ Obtiene la IP WiFi
3. ✅ Conecta vía WiFi (puedes desconectar USB)
4. ✅ Verifica el servidor de desarrollo
5. ✅ Configura Chrome DevTools Protocol
6. ✅ Ejecuta Lighthouse con configuración móvil
7. ✅ Captura métricas de performance
8. ✅ Genera reportes HTML y JSON

## Reportes Generados

Los reportes se guardan en:
```
audit-reports/mobile-YYYYMMDD-HHMMSS/
├── lighthouse-report.html    # Reporte visual interactivo
├── lighthouse-report.json     # Datos estructurados
├── performance-metrics.json  # Métricas de performance
└── README.md                  # Resumen y próximos pasos
```

## Configuración

### Ajustar Umbrales de Lighthouse

Edita `.lighthouserc.mobile.json` (se genera automáticamente) o modifica los valores en el script:

```bash
# Performance mínimo aceptable
"categories:performance": ["error", { "minScore": 0.5 }]

# LCP máximo (mobile)
"largest-contentful-paint": ["error", { "maxNumericValue": 4000 }]
```

### URLs a Auditar

Por defecto audita:
- `/` (Homepage)
- `/cars` (Listado de autos)
- `/auth/login` (Login)

Modifica en el script la variable `LIGHTHOUSE_URLS`.

## Troubleshooting

### "No se pudo obtener IP WiFi"
- Asegúrate de que el dispositivo esté conectado a WiFi
- Verifica que estés en la misma red que tu computadora
- Intenta: `adb shell ip addr show wlan0`

### "Servidor de desarrollo no detectado"
- Verifica que `pnpm dev` esté corriendo
- Asegúrate de usar `--host 0.0.0.0` para acceso por red
- Verifica firewall: `sudo ufw allow 4200`

### "CDP no disponible"
- Abre Chrome en el dispositivo
- Ve a `chrome://inspect` en Chrome desktop
- Habilita "Discover USB devices"

### "Lighthouse falló"
- Instala Lighthouse: `npm install -g lighthouse`
- O usa npx: el script lo intenta automáticamente

## Métricas Clave

### Performance (Mobile)
- **LCP** (Largest Contentful Paint): < 4.0s ✅
- **FID** (First Input Delay): < 300ms ✅
- **CLS** (Cumulative Layout Shift): < 0.25 ✅
- **TBT** (Total Blocking Time): < 600ms ✅

### Accessibility
- Score mínimo: 80/100
- Touch targets: mínimo 44x44px
- Contraste: WCAG AA (4.5:1)

### Best Practices
- HTTPS habilitado
- Sin console errors
- Imágenes optimizadas
- Service Worker registrado

## Integración con CI/CD

Para ejecutar en CI (GitHub Actions):

```yaml
- name: Mobile Audit
  run: |
    # Setup Android emulator
    # Run audit
    ./tools/audit/mobile-audit.sh
```

## Referencias

- [Lighthouse Mobile Audits](https://developer.chrome.com/docs/lighthouse/)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [ADB WiFi Debugging](https://developer.android.com/studio/command-line/adb#wireless)
