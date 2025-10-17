#!/bin/bash

###############################################################################
# CLAUDE CODE WORKFLOWS FOR AUTORENTA
###############################################################################
# Script que aprovecha las nuevas funcionalidades de Claude Code:
# - Auto-background para comandos largos
# - Ejecución paralela de procesos
# - Workflows automatizados para desarrollo y CI/CD
#
# Uso:
#   source tools/claude-workflows.sh
#   ci_pipeline              # Ejecuta pipeline completo
#   dev_setup                # Inicia entorno de desarrollo
#   quick_test               # Tests rápidos
#   full_deploy              # Deploy completo a producción
###############################################################################

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Obtener directorio raíz del proyecto
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

###############################################################################
# FUNCIÓN: ci_pipeline
# Descripción: Pipeline completo de CI/CD con validaciones
# Tiempo estimado: ~5-8 minutos (en background)
###############################################################################
function ci_pipeline() {
    echo -e "${BLUE}🚀 Iniciando CI/CD Pipeline para AutoRenta...${NC}\n"

    cd "$PROJECT_ROOT" || exit 1

    # Fase 1: Linting y Tests (paralelo)
    echo -e "${YELLOW}📋 Fase 1: Quality Checks (paralelo)${NC}"

    (
        cd apps/web || exit 1
        echo -e "${BLUE}  → Ejecutando ESLint...${NC}"
        npm run lint
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}  ✅ Lint passed${NC}"
        else
            echo -e "${RED}  ❌ Lint failed${NC}"
            exit 1
        fi
    ) &
    LINT_PID=$!

    (
        cd apps/web || exit 1
        echo -e "${BLUE}  → Ejecutando tests unitarios...${NC}"
        npm run test -- --watch=false --browsers=ChromeHeadless
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}  ✅ Tests passed${NC}"
        else
            echo -e "${RED}  ❌ Tests failed${NC}"
            exit 1
        fi
    ) &
    TEST_PID=$!

    # Esperar a que termine fase 1
    wait $LINT_PID
    LINT_RESULT=$?
    wait $TEST_PID
    TEST_RESULT=$?

    if [ $LINT_RESULT -ne 0 ] || [ $TEST_RESULT -ne 0 ]; then
        echo -e "${RED}❌ Fase 1 falló. Abortando pipeline.${NC}"
        return 1
    fi

    echo -e "${GREEN}✅ Fase 1 completada\n${NC}"

    # Fase 2: Build (secuencial después de fase 1)
    echo -e "${YELLOW}📦 Fase 2: Build${NC}"

    (
        cd apps/web || exit 1
        echo -e "${BLUE}  → Building Angular app...${NC}"
        npm run build
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}  ✅ Build web completed${NC}"
        else
            echo -e "${RED}  ❌ Build web failed${NC}"
            exit 1
        fi
    )
    WEB_BUILD_RESULT=$?

    (
        cd functions/workers/payments_webhook || exit 1
        echo -e "${BLUE}  → Building payment worker...${NC}"
        npm run build
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}  ✅ Build worker completed${NC}"
        else
            echo -e "${RED}  ❌ Build worker failed${NC}"
            exit 1
        fi
    )
    WORKER_BUILD_RESULT=$?

    if [ $WEB_BUILD_RESULT -ne 0 ] || [ $WORKER_BUILD_RESULT -ne 0 ]; then
        echo -e "${RED}❌ Fase 2 falló. Abortando pipeline.${NC}"
        return 1
    fi

    echo -e "${GREEN}✅ Fase 2 completada\n${NC}"
    echo -e "${GREEN}🎉 CI/CD Pipeline completado exitosamente${NC}"
    echo -e "${YELLOW}💡 Listo para deploy: usa 'full_deploy' para desplegar${NC}"
}

###############################################################################
# FUNCIÓN: dev_setup
# Descripción: Inicia entorno de desarrollo completo
# Componentes: Web app (port 4200) + Payment worker (port 8787)
###############################################################################
function dev_setup() {
    echo -e "${BLUE}🔧 Iniciando entorno de desarrollo AutoRenta...${NC}\n"

    cd "$PROJECT_ROOT" || exit 1

    # Verificar que node_modules existan
    if [ ! -d "apps/web/node_modules" ]; then
        echo -e "${YELLOW}📦 Instalando dependencias de web...${NC}"
        cd apps/web && npm install && cd ../..
    fi

    if [ ! -d "functions/workers/payments_webhook/node_modules" ]; then
        echo -e "${YELLOW}📦 Instalando dependencias de worker...${NC}"
        cd functions/workers/payments_webhook && npm install && cd ../../..
    fi

    echo -e "${GREEN}✅ Dependencias verificadas${NC}\n"

    # Iniciar servers en background
    echo -e "${YELLOW}🚀 Iniciando servers...${NC}"

    (
        cd apps/web || exit 1
        echo -e "${BLUE}  → Angular dev server iniciando en http://localhost:4200${NC}"
        npm run start
    ) &
    WEB_PID=$!

    (
        cd functions/workers/payments_webhook || exit 1
        echo -e "${BLUE}  → Payment webhook worker iniciando en http://localhost:8787${NC}"
        npm run dev
    ) &
    WORKER_PID=$!

    echo -e "${GREEN}✅ Entorno de desarrollo iniciado${NC}"
    echo -e "${YELLOW}📝 Web App: http://localhost:4200${NC}"
    echo -e "${YELLOW}📝 Worker: http://localhost:8787/webhooks/payments${NC}"
    echo -e "${BLUE}💡 Para detener: Ctrl+C o usa 'kill $WEB_PID $WORKER_PID'${NC}"

    # Guardar PIDs para cleanup
    echo $WEB_PID > /tmp/autorenta-web.pid
    echo $WORKER_PID > /tmp/autorenta-worker.pid

    # Esperar a que termine (mantiene shells activos)
    wait
}

###############################################################################
# FUNCIÓN: dev_stop
# Descripción: Detiene todos los procesos de desarrollo
###############################################################################
function dev_stop() {
    echo -e "${YELLOW}🛑 Deteniendo entorno de desarrollo...${NC}"

    if [ -f /tmp/autorenta-web.pid ]; then
        WEB_PID=$(cat /tmp/autorenta-web.pid)
        kill $WEB_PID 2>/dev/null && echo -e "${GREEN}  ✅ Web server detenido${NC}"
        rm /tmp/autorenta-web.pid
    fi

    if [ -f /tmp/autorenta-worker.pid ]; then
        WORKER_PID=$(cat /tmp/autorenta-worker.pid)
        kill $WORKER_PID 2>/dev/null && echo -e "${GREEN}  ✅ Worker detenido${NC}"
        rm /tmp/autorenta-worker.pid
    fi

    echo -e "${GREEN}✅ Entorno de desarrollo detenido${NC}"
}

###############################################################################
# FUNCIÓN: quick_test
# Descripción: Tests rápidos sin coverage (más rápido para desarrollo)
###############################################################################
function quick_test() {
    echo -e "${BLUE}🧪 Ejecutando tests rápidos...${NC}\n"

    cd "$PROJECT_ROOT/apps/web" || exit 1

    npm run test -- --watch=false --browsers=ChromeHeadless --code-coverage=false

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Tests passed${NC}"
    else
        echo -e "${RED}❌ Tests failed${NC}"
        return 1
    fi
}

###############################################################################
# FUNCIÓN: full_test
# Descripción: Tests completos con coverage
###############################################################################
function full_test() {
    echo -e "${BLUE}🧪 Ejecutando tests completos con coverage...${NC}\n"

    cd "$PROJECT_ROOT/apps/web" || exit 1

    npm run test -- --watch=false --browsers=ChromeHeadless --code-coverage=true

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Tests passed${NC}"
        echo -e "${YELLOW}📊 Coverage report: apps/web/coverage/index.html${NC}"
    else
        echo -e "${RED}❌ Tests failed${NC}"
        return 1
    fi
}

###############################################################################
# FUNCIÓN: full_deploy
# Descripción: Deploy completo a producción (web + worker)
# ADVERTENCIA: Solo ejecutar después de ci_pipeline exitoso
###############################################################################
function full_deploy() {
    echo -e "${BLUE}🚀 Iniciando deploy a producción...${NC}\n"

    cd "$PROJECT_ROOT" || exit 1

    # Confirmación
    echo -e "${YELLOW}⚠️  Estás a punto de desplegar a PRODUCCIÓN${NC}"
    echo -e "${YELLOW}   ¿Ejecutaste 'ci_pipeline' exitosamente? (y/n)${NC}"
    read -r confirmation

    if [ "$confirmation" != "y" ] && [ "$confirmation" != "Y" ]; then
        echo -e "${RED}❌ Deploy cancelado${NC}"
        return 1
    fi

    # Deploy web app
    echo -e "${YELLOW}📦 Deploying web app a Cloudflare Pages...${NC}"
    (
        cd apps/web || exit 1
        npm run deploy:pages
    )
    WEB_DEPLOY_RESULT=$?

    if [ $WEB_DEPLOY_RESULT -ne 0 ]; then
        echo -e "${RED}❌ Deploy web falló${NC}"
        return 1
    fi

    echo -e "${GREEN}✅ Web app deployed${NC}\n"

    # Deploy worker
    echo -e "${YELLOW}📦 Deploying payment webhook worker...${NC}"
    (
        cd functions/workers/payments_webhook || exit 1
        npm run deploy
    )
    WORKER_DEPLOY_RESULT=$?

    if [ $WORKER_DEPLOY_RESULT -ne 0 ]; then
        echo -e "${RED}❌ Deploy worker falló${NC}"
        return 1
    fi

    echo -e "${GREEN}✅ Worker deployed${NC}\n"
    echo -e "${GREEN}🎉 Deploy completo a producción exitoso${NC}"
}

###############################################################################
# FUNCIÓN: lint_fix
# Descripción: Auto-fix de linting issues
###############################################################################
function lint_fix() {
    echo -e "${BLUE}🔧 Auto-fixing lint issues...${NC}\n"

    cd "$PROJECT_ROOT/apps/web" || exit 1

    echo -e "${YELLOW}  → Ejecutando Prettier...${NC}"
    npm run format

    echo -e "${YELLOW}  → Ejecutando ESLint --fix...${NC}"
    npm run lint -- --fix

    echo -e "${GREEN}✅ Lint fix completado${NC}"
}

###############################################################################
# FUNCIÓN: install_all
# Descripción: Instala todas las dependencias (web + worker)
###############################################################################
function install_all() {
    echo -e "${BLUE}📦 Instalando todas las dependencias...${NC}\n"

    cd "$PROJECT_ROOT" || exit 1

    echo -e "${YELLOW}  → Instalando dependencias de web...${NC}"
    (cd apps/web && npm install) &
    WEB_INSTALL_PID=$!

    echo -e "${YELLOW}  → Instalando dependencias de worker...${NC}"
    (cd functions/workers/payments_webhook && npm install) &
    WORKER_INSTALL_PID=$!

    wait $WEB_INSTALL_PID
    wait $WORKER_INSTALL_PID

    echo -e "${GREEN}✅ Todas las dependencias instaladas${NC}"
}

###############################################################################
# FUNCIÓN: build_all
# Descripción: Build de todos los componentes (paralelo)
###############################################################################
function build_all() {
    echo -e "${BLUE}📦 Building todos los componentes...${NC}\n"

    cd "$PROJECT_ROOT" || exit 1

    (
        cd apps/web || exit 1
        echo -e "${YELLOW}  → Building web app...${NC}"
        npm run build
        echo -e "${GREEN}  ✅ Web build completed${NC}"
    ) &
    WEB_BUILD_PID=$!

    (
        cd functions/workers/payments_webhook || exit 1
        echo -e "${YELLOW}  → Building worker...${NC}"
        npm run build
        echo -e "${GREEN}  ✅ Worker build completed${NC}"
    ) &
    WORKER_BUILD_PID=$!

    wait $WEB_BUILD_PID
    wait $WORKER_BUILD_PID

    echo -e "${GREEN}✅ Builds completados${NC}"
}

###############################################################################
# FUNCIÓN: status
# Descripción: Muestra estado del proyecto
###############################################################################
function status() {
    echo -e "${BLUE}📊 Estado del proyecto AutoRenta${NC}\n"

    cd "$PROJECT_ROOT" || exit 1

    # Git status
    echo -e "${YELLOW}Git:${NC}"
    git status -sb
    echo ""

    # Build artifacts
    echo -e "${YELLOW}Build artifacts:${NC}"
    [ -d "apps/web/dist" ] && echo -e "${GREEN}  ✅ Web build exists${NC}" || echo -e "${RED}  ❌ Web build missing${NC}"
    [ -d "functions/workers/payments_webhook/dist" ] && echo -e "${GREEN}  ✅ Worker build exists${NC}" || echo -e "${RED}  ❌ Worker build missing${NC}"
    echo ""

    # Dev servers
    echo -e "${YELLOW}Dev servers:${NC}"
    if [ -f /tmp/autorenta-web.pid ]; then
        WEB_PID=$(cat /tmp/autorenta-web.pid)
        if ps -p $WEB_PID > /dev/null 2>&1; then
            echo -e "${GREEN}  ✅ Web server running (PID: $WEB_PID)${NC}"
        else
            echo -e "${RED}  ❌ Web server stopped${NC}"
            rm /tmp/autorenta-web.pid
        fi
    else
        echo -e "${RED}  ❌ Web server not running${NC}"
    fi

    if [ -f /tmp/autorenta-worker.pid ]; then
        WORKER_PID=$(cat /tmp/autorenta-worker.pid)
        if ps -p $WORKER_PID > /dev/null 2>&1; then
            echo -e "${GREEN}  ✅ Worker running (PID: $WORKER_PID)${NC}"
        else
            echo -e "${RED}  ❌ Worker stopped${NC}"
            rm /tmp/autorenta-worker.pid
        fi
    else
        echo -e "${RED}  ❌ Worker not running${NC}"
    fi
}

###############################################################################
# FUNCIÓN: help
# Descripción: Muestra ayuda de comandos disponibles
###############################################################################
function workflows_help() {
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║         CLAUDE CODE WORKFLOWS - AUTORENTA                     ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}\n"

    echo -e "${YELLOW}📋 Comandos Disponibles:${NC}\n"

    echo -e "${GREEN}Development:${NC}"
    echo -e "  ${BLUE}dev_setup${NC}       - Inicia entorno completo (web + worker)"
    echo -e "  ${BLUE}dev_stop${NC}        - Detiene entorno de desarrollo"
    echo -e "  ${BLUE}status${NC}          - Muestra estado del proyecto\n"

    echo -e "${GREEN}Testing:${NC}"
    echo -e "  ${BLUE}quick_test${NC}      - Tests rápidos sin coverage"
    echo -e "  ${BLUE}full_test${NC}       - Tests completos con coverage\n"

    echo -e "${GREEN}Building:${NC}"
    echo -e "  ${BLUE}build_all${NC}       - Build de todos los componentes"
    echo -e "  ${BLUE}lint_fix${NC}        - Auto-fix de linting issues\n"

    echo -e "${GREEN}CI/CD:${NC}"
    echo -e "  ${BLUE}ci_pipeline${NC}     - Pipeline completo (lint + test + build)"
    echo -e "  ${BLUE}full_deploy${NC}     - Deploy a producción (requiere ci_pipeline)\n"

    echo -e "${GREEN}Utilities:${NC}"
    echo -e "  ${BLUE}install_all${NC}     - Instala todas las dependencias"
    echo -e "  ${BLUE}workflows_help${NC}  - Muestra esta ayuda\n"

    echo -e "${YELLOW}💡 Uso:${NC}"
    echo -e "  1. ${BLUE}source tools/claude-workflows.sh${NC}"
    echo -e "  2. ${BLUE}ci_pipeline${NC} o ${BLUE}dev_setup${NC}\n"

    echo -e "${YELLOW}⏱️  Timeouts configurados: 900 segundos (15 min)${NC}"
    echo -e "${YELLOW}🔄 Auto-background: Activado para comandos largos${NC}\n"
}

###############################################################################
# AUTO-EXPORT DE FUNCIONES
###############################################################################

# Export all functions
export -f ci_pipeline
export -f dev_setup
export -f dev_stop
export -f quick_test
export -f full_test
export -f full_deploy
export -f lint_fix
export -f install_all
export -f build_all
export -f status
export -f workflows_help

# Mostrar ayuda al cargar
echo -e "${GREEN}✅ Claude Code Workflows cargados${NC}"
echo -e "${YELLOW}💡 Ejecuta 'workflows_help' para ver comandos disponibles${NC}\n"
