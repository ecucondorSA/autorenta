#!/bin/bash

###############################################################################
# Script de Testing: Atomicidad en Creación de Reservas
# Verifica que el sistema NO cree reservas fantasma
###############################################################################

set -e

echo "🧪 TESTING: Atomicidad en Creación de Reservas"
echo "=============================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

DB_URL="postgresql://postgres:AutoRenta2025Segura!@db.obxvffplochgeiclibng.supabase.co:5432/postgres"

###############################################################################
# Test 1: Verificar que la función RPC existe
###############################################################################

echo "📋 Test 1: Verificar función RPC create_booking_atomic"
echo "------------------------------------------------------"

FUNCTION_EXISTS=$(PGPASSWORD="AutoRenta2025Segura!" psql "$DB_URL" -t -c "
  SELECT COUNT(*) 
  FROM information_schema.routines 
  WHERE routine_name = 'create_booking_atomic' 
    AND routine_schema = 'public';
" 2>/dev/null | tr -d ' ')

if [ "$FUNCTION_EXISTS" -eq 1 ]; then
  echo -e "${GREEN}✅ Función RPC existe${NC}"
else
  echo -e "${RED}❌ Función RPC NO existe${NC}"
  echo "   Ejecuta: database/fix-atomic-booking.sql"
  exit 1
fi

echo ""

###############################################################################
# Test 2: Verificar estructura de la tabla bookings
###############################################################################

echo "📋 Test 2: Verificar columna risk_snapshot_id en bookings"
echo "----------------------------------------------------------"

COLUMN_EXISTS=$(PGPASSWORD="AutoRenta2025Segura!" psql "$DB_URL" -t -c "
  SELECT COUNT(*) 
  FROM information_schema.columns 
  WHERE table_name = 'bookings' 
    AND column_name = 'risk_snapshot_id';
" 2>/dev/null | tr -d ' ')

if [ "$COLUMN_EXISTS" -eq 1 ]; then
  echo -e "${GREEN}✅ Columna risk_snapshot_id existe${NC}"
else
  echo -e "${RED}❌ Columna risk_snapshot_id NO existe${NC}"
  exit 1
fi

echo ""

###############################################################################
# Test 3: Buscar reservas sin risk_snapshot (reservas fantasma)
###############################################################################

echo "📋 Test 3: Buscar reservas sin risk_snapshot (reservas fantasma)"
echo "-----------------------------------------------------------------"

ORPHAN_BOOKINGS=$(PGPASSWORD="AutoRenta2025Segura!" psql "$DB_URL" -t -c "
  SELECT COUNT(*) 
  FROM bookings 
  WHERE risk_snapshot_id IS NULL 
    AND status NOT IN ('cancelled', 'completed')
    AND created_at > NOW() - INTERVAL '7 days';
" 2>/dev/null | tr -d ' ')

if [ "$ORPHAN_BOOKINGS" -eq 0 ]; then
  echo -e "${GREEN}✅ No hay reservas fantasma recientes${NC}"
else
  echo -e "${YELLOW}⚠️  Se encontraron $ORPHAN_BOOKINGS reservas sin risk_snapshot${NC}"
  echo "   Estas podrían ser reservas fantasma o reservas de testing"
  
  # Mostrar detalles
  echo ""
  echo "   Detalles de reservas huérfanas:"
  PGPASSWORD="AutoRenta2025Segura!" psql "$DB_URL" -c "
    SELECT 
      id, 
      car_id, 
      status, 
      created_at,
      total_amount
    FROM bookings 
    WHERE risk_snapshot_id IS NULL 
      AND status NOT IN ('cancelled', 'completed')
      AND created_at > NOW() - INTERVAL '7 days'
    ORDER BY created_at DESC
    LIMIT 5;
  " 2>/dev/null
fi

echo ""

###############################################################################
# Test 4: Verificar integridad referencial
###############################################################################

echo "📋 Test 4: Verificar integridad entre bookings y risk_snapshots"
echo "----------------------------------------------------------------"

INTEGRITY_ISSUES=$(PGPASSWORD="AutoRenta2025Segura!" psql "$DB_URL" -t -c "
  SELECT COUNT(*) 
  FROM bookings b
  WHERE b.risk_snapshot_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM risk_snapshots rs 
      WHERE rs.id = b.risk_snapshot_id
    )
    AND b.created_at > NOW() - INTERVAL '7 days';
" 2>/dev/null | tr -d ' ')

if [ "$INTEGRITY_ISSUES" -eq 0 ]; then
  echo -e "${GREEN}✅ Integridad referencial OK${NC}"
else
  echo -e "${RED}❌ Se encontraron $INTEGRITY_ISSUES bookings con risk_snapshot_id inválido${NC}"
fi

echo ""

###############################################################################
# Test 5: Verificar que risk_snapshots están asociados a bookings
###############################################################################

echo "📋 Test 5: Verificar risk_snapshots huérfanos"
echo "----------------------------------------------"

ORPHAN_RISKS=$(PGPASSWORD="AutoRenta2025Segura!" psql "$DB_URL" -t -c "
  SELECT COUNT(*) 
  FROM risk_snapshots rs
  WHERE NOT EXISTS (
    SELECT 1 FROM bookings b 
    WHERE b.risk_snapshot_id = rs.id
  )
  AND rs.created_at > NOW() - INTERVAL '7 days';
" 2>/dev/null | tr -d ' ')

if [ "$ORPHAN_RISKS" -eq 0 ]; then
  echo -e "${GREEN}✅ No hay risk_snapshots huérfanos${NC}"
else
  echo -e "${YELLOW}⚠️  Se encontraron $ORPHAN_RISKS risk_snapshots no asociados${NC}"
  echo "   Esto podría indicar fallas en el proceso de creación"
fi

echo ""

###############################################################################
# Test 6: Estadísticas de bookings recientes
###############################################################################

echo "📋 Test 6: Estadísticas de bookings (últimos 7 días)"
echo "-----------------------------------------------------"

PGPASSWORD="AutoRenta2025Segura!" psql "$DB_URL" -c "
  SELECT 
    status,
    COUNT(*) as total,
    COUNT(risk_snapshot_id) as con_risk,
    COUNT(*) - COUNT(risk_snapshot_id) as sin_risk,
    ROUND(100.0 * COUNT(risk_snapshot_id) / COUNT(*), 2) as porcentaje_ok
  FROM bookings
  WHERE created_at > NOW() - INTERVAL '7 days'
  GROUP BY status
  ORDER BY status;
" 2>/dev/null

echo ""

###############################################################################
# Resumen Final
###############################################################################

echo "=============================================="
echo "📊 RESUMEN DE TESTING"
echo "=============================================="
echo ""

if [ "$FUNCTION_EXISTS" -eq 1 ] && \
   [ "$COLUMN_EXISTS" -eq 1 ] && \
   [ "$INTEGRITY_ISSUES" -eq 0 ]; then
  echo -e "${GREEN}✅ TODOS LOS TESTS CRÍTICOS PASARON${NC}"
  echo ""
  
  if [ "$ORPHAN_BOOKINGS" -eq 0 ] && [ "$ORPHAN_RISKS" -eq 0 ]; then
    echo -e "${GREEN}✅ SISTEMA COMPLETAMENTE SALUDABLE${NC}"
    echo "   No se detectaron reservas fantasma ni inconsistencias"
    exit 0
  else
    echo -e "${YELLOW}⚠️  HAY ADVERTENCIAS NO CRÍTICAS${NC}"
    echo "   Revisa los detalles arriba para más información"
    exit 0
  fi
else
  echo -e "${RED}❌ ALGUNOS TESTS FALLARON${NC}"
  echo "   Revisa los errores arriba y corrige los problemas"
  exit 1
fi
