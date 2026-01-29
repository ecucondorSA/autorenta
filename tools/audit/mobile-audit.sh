#!/bin/bash

# ============================================
# AutoRenta - Auditoría Móvil vía WiFi/ADB
# ============================================
# Realiza auditorías completas de la app en dispositivo móvil
# usando Chrome DevTools Protocol vía ADB WiFi

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Configuración
DEV_SERVER_PORT=4200
CDP_PORT=9222
AUDIT_DIR="./audit-reports/mobile-$(date +%Y%m%d-%H%M%S)"
LIGHTHOUSE_CONFIG=".lighthouserc.mobile.json"

# Banner
print_banner() {
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║     AutoRenta - Auditoría Móvil vía WiFi/ADB             ║"
    echo "║     Performance • Accessibility • Best Practices          ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Verificar dependencias
check_dependencies() {
    echo -e "${BLUE}🔍 Verificando dependencias...${NC}"
    
    local missing=0
    
    if ! command -v adb &> /dev/null; then
        echo -e "${RED}❌ ADB no encontrado. Instala Android SDK Platform Tools${NC}"
        missing=1
    fi
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js no encontrado${NC}"
        missing=1
    fi
    
    if ! command -v lighthouse &> /dev/null && ! command -v npx &> /dev/null; then
        echo -e "${YELLOW}⚠️  Lighthouse no encontrado. Se instalará automáticamente${NC}"
    fi
    
    if [ $missing -eq 1 ]; then
        exit 1
    fi
    
    echo -e "${GREEN}✅ Dependencias OK${NC}"
}

# Obtener IP del dispositivo
get_device_ip() {
    echo -e "${BLUE}📱 Detectando dispositivo...${NC}"
    
    # Intentar obtener IP de dispositivo conectado por USB
    USB_DEVICE=$(adb devices | grep -w "device" | grep -v "192.168" | head -n 1 | awk '{print $1}')
    
    if [ -z "$USB_DEVICE" ]; then
        echo -e "${YELLOW}⚠️  No hay dispositivo USB conectado${NC}"
        echo -e "${CYAN}💡 Conecta el dispositivo por USB primero para obtener la IP${NC}"
        read -p "Presiona Enter cuando el dispositivo esté conectado..."
        USB_DEVICE=$(adb devices | grep -w "device" | grep -v "192.168" | head -n 1 | awk '{print $1}')
    fi
    
    if [ -z "$USB_DEVICE" ]; then
        echo -e "${RED}❌ No se pudo detectar dispositivo${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Dispositivo detectado: $USB_DEVICE${NC}"
    
    # Obtener IP WiFi
    echo -e "${BLUE}🌐 Obteniendo IP WiFi...${NC}"
    DEVICE_IP=$(adb -s "$USB_DEVICE" shell ip -f inet addr show wlan0 2>/dev/null | grep "inet " | awk '{print $2}' | cut -d/ -f1)
    
    if [ -z "$DEVICE_IP" ]; then
        # Intentar método alternativo
        DEVICE_IP=$(adb -s "$USB_DEVICE" shell "getprop | grep 'wifi.ip'" | awk -F: '{print $2}' | tr -d '[] ')
    fi
    
    if [ -z "$DEVICE_IP" ]; then
        echo -e "${RED}❌ No se pudo obtener IP WiFi${NC}"
        echo -e "${YELLOW}💡 Asegúrate de que el dispositivo esté conectado a WiFi${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ IP WiFi: $DEVICE_IP${NC}"
    echo "$DEVICE_IP"
}

# Conectar dispositivo vía WiFi
connect_wifi() {
    local device_ip=$1
    
    echo -e "${BLUE}🔗 Configurando conexión WiFi...${NC}"
    
    # Activar TCP/IP mode
    adb tcpip 5555
    sleep 2
    
    # Conectar vía WiFi
    adb connect "$device_ip:5555"
    sleep 2
    
    # Verificar conexión
    if adb devices | grep -q "$device_ip:5555"; then
        echo -e "${GREEN}✅ Dispositivo conectado vía WiFi${NC}"
        echo -e "${CYAN}💡 Ya puedes desconectar el cable USB${NC}"
        return 0
    else
        echo -e "${RED}❌ Error al conectar vía WiFi${NC}"
        return 1
    fi
}

# Verificar que el servidor de desarrollo esté corriendo
check_dev_server() {
    echo -e "${BLUE}🔍 Verificando servidor de desarrollo...${NC}"
    
    # Obtener IP local de la máquina
    LOCAL_IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7; exit}' || \
               ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
    
    if [ -z "$LOCAL_IP" ]; then
        echo -e "${RED}❌ No se pudo obtener IP local${NC}"
        exit 1
    fi
    
    echo -e "${CYAN}📍 IP local: $LOCAL_IP${NC}"
    
    # Verificar si el servidor está corriendo
    if curl -s "http://localhost:$DEV_SERVER_PORT" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Servidor de desarrollo corriendo en puerto $DEV_SERVER_PORT${NC}"
    else
        echo -e "${YELLOW}⚠️  Servidor de desarrollo no detectado${NC}"
        echo -e "${CYAN}💡 Iniciando servidor de desarrollo...${NC}"
        echo -e "${YELLOW}   Ejecuta en otra terminal: pnpm dev${NC}"
        echo -e "${YELLOW}   O presiona Enter para continuar si ya está corriendo...${NC}"
        read -p ""
    fi
    
    # URL accesible desde el móvil
    MOBILE_URL="http://$LOCAL_IP:$DEV_SERVER_PORT"
    echo -e "${GREEN}📱 URL móvil: $MOBILE_URL${NC}"
    echo "$MOBILE_URL"
}

# Configurar Chrome DevTools Protocol
setup_cdp() {
    local device_ip=$1
    
    echo -e "${BLUE}🔧 Configurando Chrome DevTools Protocol...${NC}"
    
    # Forward del puerto CDP
    adb -s "$device_ip:5555" forward tcp:$CDP_PORT localabstract:chrome_devtools_remote
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ CDP configurado en puerto $CDP_PORT${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  CDP no disponible. Continuando sin CDP...${NC}"
        return 1
    fi
}

# Crear configuración de Lighthouse para móvil
create_lighthouse_config() {
    local mobile_url=$1
    
    cat > "$LIGHTHOUSE_CONFIG" <<EOF
{
  "ci": {
    "collect": {
      "url": ["$mobile_url/", "$mobile_url/cars", "$mobile_url/auth/login"],
      "numberOfRuns": 3,
      "settings": {
        "onlyCategories": ["performance", "accessibility", "best-practices", "seo"],
        "preset": "mobile",
        "throttling": {
          "rttMs": 150,
          "throughputKbps": 1638.4,
          "cpuSlowdownMultiplier": 4
        },
        "screenEmulation": {
          "mobile": true,
          "width": 375,
          "height": 667,
          "deviceScaleFactor": 2
        }
      }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.5 }],
        "categories:accessibility": ["error", { "minScore": 0.8 }],
        "categories:best-practices": ["error", { "minScore": 0.8 }],
        "categories:seo": ["error", { "minScore": 0.8 }],
        "first-contentful-paint": ["warn", { "maxNumericValue": 2000 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 4000 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.25 }],
        "total-blocking-time": ["warn", { "maxNumericValue": 600 }],
        "speed-index": ["warn", { "maxNumericValue": 4000 }]
      }
    }
  }
}
EOF
    
    echo -e "${GREEN}✅ Configuración Lighthouse creada${NC}"
}

# Ejecutar auditoría Lighthouse
run_lighthouse_audit() {
    local mobile_url=$1
    
    echo -e "${BLUE}🚀 Ejecutando auditoría Lighthouse...${NC}"
    echo -e "${CYAN}   Esto puede tardar varios minutos...${NC}"
    
    mkdir -p "$AUDIT_DIR"
    
    # Instalar Lighthouse si no está disponible
    if ! command -v lighthouse &> /dev/null; then
        echo -e "${YELLOW}📦 Instalando Lighthouse...${NC}"
        npm install -g lighthouse || npx lighthouse --version > /dev/null
    fi
    
    # Ejecutar Lighthouse
    lighthouse "$mobile_url/" \
        --config-path="$LIGHTHOUSE_CONFIG" \
        --output=html,json \
        --output-path="$AUDIT_DIR/lighthouse-report" \
        --chrome-flags="--headless" \
        --only-categories=performance,accessibility,best-practices,seo \
        --preset=mobile \
        --quiet || {
        echo -e "${YELLOW}⚠️  Lighthouse falló. Intentando con npx...${NC}"
        npx lighthouse "$mobile_url/" \
            --config-path="$LIGHTHOUSE_CONFIG" \
            --output=html,json \
            --output-path="$AUDIT_DIR/lighthouse-report" \
            --only-categories=performance,accessibility,best-practices,seo \
            --preset=mobile
    }
    
    if [ -f "$AUDIT_DIR/lighthouse-report.html" ]; then
        echo -e "${GREEN}✅ Auditoría Lighthouse completada${NC}"
        echo -e "${CYAN}📄 Reporte: $AUDIT_DIR/lighthouse-report.html${NC}"
    else
        echo -e "${YELLOW}⚠️  No se generó reporte HTML${NC}"
    fi
}

# Capturar métricas de performance
capture_performance_metrics() {
    local device_ip=$1
    local mobile_url=$2
    
    echo -e "${BLUE}📊 Capturando métricas de performance...${NC}"
    
    # Script Node.js para capturar métricas vía CDP
    cat > "$AUDIT_DIR/capture-metrics.js" <<'NODE_SCRIPT'
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const pages = browser.contexts()[0].pages();
    const page = pages[0] || await browser.contexts()[0].newPage();
    
    await page.goto(process.argv[2] || 'http://localhost:4200');
    
    const metrics = await page.evaluate(() => {
        const perf = performance.getEntriesByType('navigation')[0];
        return {
            domContentLoaded: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
            loadComplete: perf.loadEventEnd - perf.loadEventStart,
            firstPaint: performance.getEntriesByType('paint').find(e => e.name === 'first-paint')?.startTime || 0,
            firstContentfulPaint: performance.getEntriesByType('paint').find(e => e.name === 'first-contentful-paint')?.startTime || 0,
            memory: performance.memory ? {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            } : null
        };
    });
    
    fs.writeFileSync(process.argv[3] || 'metrics.json', JSON.stringify(metrics, null, 2));
    console.log('Métricas capturadas:', metrics);
    await browser.close();
})().catch(console.error);
NODE_SCRIPT
    
    if command -v node &> /dev/null && [ -f "$AUDIT_DIR/capture-metrics.js" ]; then
        node "$AUDIT_DIR/capture-metrics.js" "$mobile_url" "$AUDIT_DIR/performance-metrics.json" 2>/dev/null || {
            echo -e "${YELLOW}⚠️  No se pudieron capturar métricas vía CDP${NC}"
        }
    fi
}

# Generar reporte resumen
generate_summary() {
    echo -e "${BLUE}📋 Generando reporte resumen...${NC}"
    
    cat > "$AUDIT_DIR/README.md" <<EOF
# Auditoría Móvil AutoRenta

**Fecha:** $(date)
**Dispositivo:** $(adb devices | grep "device" | head -1 | awk '{print $1}')
**URL:** $MOBILE_URL

## Reportes Generados

- **Lighthouse HTML:** lighthouse-report.html
- **Lighthouse JSON:** lighthouse-report.json
- **Métricas Performance:** performance-metrics.json

## Cómo Ver los Reportes

1. Abre \`lighthouse-report.html\` en tu navegador
2. Revisa las métricas de Performance, Accessibility, Best Practices y SEO
3. Compara con los umbrales definidos en \`.lighthouserc.json\`

## Próximos Pasos

- Revisar Core Web Vitals
- Optimizar imágenes si LCP > 2.5s
- Mejorar accesibilidad si score < 90
- Verificar bundle size en Network tab
EOF
    
    echo -e "${GREEN}✅ Reporte resumen generado${NC}"
}

# Limpiar
cleanup() {
    echo -e "${BLUE}🧹 Limpiando...${NC}"
    rm -f "$LIGHTHOUSE_CONFIG"
    echo -e "${GREEN}✅ Limpieza completada${NC}"
}

# Función principal
main() {
    print_banner
    check_dependencies
    
    # Obtener IP del dispositivo
    DEVICE_IP=$(get_device_ip)
    
    # Conectar vía WiFi
    if connect_wifi "$DEVICE_IP"; then
        DEVICE_IP="$DEVICE_IP:5555"
    else
        echo -e "${YELLOW}⚠️  Continuando con conexión USB${NC}"
    fi
    
    # Verificar servidor de desarrollo
    MOBILE_URL=$(check_dev_server)
    
    # Configurar CDP
    setup_cdp "$DEVICE_IP" || true
    
    # Crear configuración Lighthouse
    create_lighthouse_config "$MOBILE_URL"
    
    # Ejecutar auditorías
    run_lighthouse_audit "$MOBILE_URL"
    capture_performance_metrics "$DEVICE_IP" "$MOBILE_URL"
    
    # Generar resumen
    generate_summary
    
    # Mostrar resultados
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              ✅ Auditoría Completada                        ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}📁 Reportes guardados en: ${BOLD}$AUDIT_DIR${NC}"
    echo -e "${CYAN}📄 Abre el reporte: ${BOLD}open $AUDIT_DIR/lighthouse-report.html${NC}"
    echo ""
    
    # Limpiar
    cleanup
}

# Trap para limpiar al salir
trap cleanup EXIT

# Ejecutar
main "$@"
