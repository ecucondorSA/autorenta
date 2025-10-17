#!/bin/bash

###############################################################################
# 🌟 DEPLOY SISTEMA DE REVIEWS
# Script de despliegue completo del sistema de calificaciones estilo Airbnb
###############################################################################

set -e  # Salir en caso de error

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Funciones de output
info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

###############################################################################
# CONFIGURACIÓN
###############################################################################

DB_CONNECTION="${DATABASE_URL:-postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres}"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

###############################################################################
# VERIFICAR DEPENDENCIAS
###############################################################################

check_dependencies() {
    header "Verificando Dependencias"

    if command -v psql &> /dev/null; then
        success "psql encontrado"
    else
        error "psql no está instalado"
        info "Instalar: sudo apt-get install postgresql-client"
        exit 1
    fi

    if [[ -f "$SCRIPT_DIR/setup-reviews-system.sql" ]]; then
        success "Script SQL principal encontrado"
    else
        error "setup-reviews-system.sql no encontrado"
        exit 1
    fi

    if [[ -f "$SCRIPT_DIR/setup-reviews-cron.sql" ]]; then
        success "Script SQL de cron encontrado"
    else
        warning "setup-reviews-cron.sql no encontrado (opcional)"
    fi
}

###############################################################################
# EJECUTAR MIGRACIÓN PRINCIPAL
###############################################################################

deploy_main_schema() {
    header "Desplegando Schema Principal"

    info "Ejecutando setup-reviews-system.sql..."

    if PGPASSWORD='ECUCONDOR08122023' psql "$DB_CONNECTION" -f "$SCRIPT_DIR/setup-reviews-system.sql" 2>&1 | tee /tmp/reviews-deploy.log; then
        success "Schema desplegado exitosamente"

        # Verificar tablas creadas
        info "Verificando tablas..."

        if PGPASSWORD='ECUCONDOR08122023' psql "$DB_CONNECTION" -c "\d reviews" &> /dev/null; then
            success "Tabla 'reviews' creada"
        else
            error "Tabla 'reviews' no encontrada"
            exit 1
        fi

        if PGPASSWORD='ECUCONDOR08122023' psql "$DB_CONNECTION" -c "\d user_stats" &> /dev/null; then
            success "Tabla 'user_stats' creada"
        else
            error "Tabla 'user_stats' no encontrada"
            exit 1
        fi

        if PGPASSWORD='ECUCONDOR08122023' psql "$DB_CONNECTION" -c "\d car_stats" &> /dev/null; then
            success "Tabla 'car_stats' creada"
        else
            error "Tabla 'car_stats' no encontrada"
            exit 1
        fi
    else
        error "Error ejecutando setup-reviews-system.sql"
        error "Ver logs en /tmp/reviews-deploy.log"
        exit 1
    fi
}

###############################################################################
# CONFIGURAR CRON JOBS (OPCIONAL)
###############################################################################

deploy_cron_jobs() {
    header "Configurando Cron Jobs (Opcional)"

    warning "Los cron jobs requieren la extensión pg_cron"
    warning "Esto debe habilitarse en el dashboard de Supabase"
    echo ""
    read -p "¿Deseas configurar cron jobs ahora? (y/n): " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        info "Ejecutando setup-reviews-cron.sql..."

        if PGPASSWORD='ECUCONDOR08122023' psql "$DB_CONNECTION" -f "$SCRIPT_DIR/setup-reviews-cron.sql" 2>&1 | tee -a /tmp/reviews-deploy.log; then
            success "Cron jobs configurados"
        else
            warning "Error configurando cron jobs (esto es opcional)"
            warning "Puedes configurarlo manualmente después"
        fi
    else
        info "Saltando configuración de cron jobs"
        info "Puedes ejecutar manualmente: psql ... -f setup-reviews-cron.sql"
    fi
}

###############################################################################
# POBLAR DATOS DE PRUEBA (OPCIONAL)
###############################################################################

seed_test_data() {
    header "Poblar Datos de Prueba (Opcional)"

    read -p "¿Deseas poblar datos de prueba? (y/n): " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        info "Creando reviews de prueba..."

        PGPASSWORD='ECUCONDOR08122023' psql "$DB_CONNECTION" << 'EOF'
-- Insertar stats iniciales para usuarios existentes
INSERT INTO user_stats (user_id)
SELECT id FROM profiles
ON CONFLICT (user_id) DO NOTHING;

-- Insertar stats iniciales para autos existentes
INSERT INTO car_stats (car_id)
SELECT id FROM cars
ON CONFLICT (car_id) DO NOTHING;

-- Mensaje
SELECT 'Stats inicializadas para ' || COUNT(*) || ' usuarios' as message
FROM user_stats;

SELECT 'Stats inicializadas para ' || COUNT(*) || ' autos' as message
FROM car_stats;
EOF

        success "Datos de prueba creados"
    else
        info "Saltando datos de prueba"
    fi
}

###############################################################################
# VERIFICAR INSTALACIÓN
###############################################################################

verify_installation() {
    header "Verificando Instalación"

    info "Verificando funciones SQL..."

    local functions=(
        "create_review"
        "publish_reviews_if_both_completed"
        "publish_pending_reviews"
        "update_user_stats"
        "update_car_stats"
        "flag_review"
    )

    for func in "${functions[@]}"; do
        if PGPASSWORD='ECUCONDOR08122023' psql "$DB_CONNECTION" -c "SELECT '$func'::regproc" &> /dev/null; then
            success "Función $func existe"
        else
            warning "Función $func no encontrada"
        fi
    done

    info "Verificando RLS policies..."

    local policy_count=$(PGPASSWORD='ECUCONDOR08122023' psql "$DB_CONNECTION" -tAc "SELECT COUNT(*) FROM pg_policies WHERE tablename IN ('reviews', 'user_stats', 'car_stats')")

    if [[ $policy_count -gt 0 ]]; then
        success "$policy_count RLS policies configuradas"
    else
        warning "No se encontraron RLS policies"
    fi
}

###############################################################################
# MOSTRAR RESUMEN
###############################################################################

show_summary() {
    header "Resumen de Instalación"

    echo -e "${GREEN}✅ Sistema de Reviews instalado exitosamente${NC}"
    echo ""
    echo "📊 Tablas creadas:"
    echo "   - reviews (calificaciones y comentarios)"
    echo "   - user_stats (estadísticas de usuarios)"
    echo "   - car_stats (estadísticas de autos)"
    echo ""
    echo "⚙️  Funciones SQL:"
    echo "   - create_review() - Crear nueva review"
    echo "   - publish_reviews_if_both_completed() - Publicar si ambos califican"
    echo "   - publish_pending_reviews() - Publicar reviews expiradas"
    echo "   - update_user_stats() - Actualizar estadísticas de usuario"
    echo "   - update_car_stats() - Actualizar estadísticas de auto"
    echo "   - flag_review() - Reportar review inapropiada"
    echo ""
    echo "🔒 RLS Policies:"
    echo "   - Habilitadas en todas las tablas"
    echo "   - Reviews visibles solo si published"
    echo "   - Users pueden crear/ver sus propias reviews"
    echo ""
    echo "📅 Próximos pasos:"
    echo "   1. Implementar ReviewsService en Angular"
    echo "   2. Crear componentes de UI (ReviewForm, ReviewCard)"
    echo "   3. Integrar en flujo de bookings"
    echo "   4. (Opcional) Configurar cron jobs en Supabase Dashboard"
    echo ""
    echo "📖 Documentación:"
    echo "   - Plan completo: PLAN_SISTEMA_REVIEWS.md"
    echo "   - Migración SQL: setup-reviews-system.sql"
    echo "   - Cron jobs: setup-reviews-cron.sql"
    echo ""
}

###############################################################################
# MENÚ PRINCIPAL
###############################################################################

main() {
    header "🌟 DEPLOY SISTEMA DE REVIEWS"

    check_dependencies
    deploy_main_schema
    deploy_cron_jobs
    seed_test_data
    verify_installation
    show_summary
}

# Ejecutar
main "$@"
