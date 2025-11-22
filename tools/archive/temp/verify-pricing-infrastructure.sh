#!/bin/bash

# ╔══════════════════════════════════════════════════════════════════════╗
# ║   🔧 VERIFICACIÓN Y SETUP DE INFRAESTRUCTURA BACKEND                ║
# ║   Sistema de Precios Dinámicos en Tiempo Real                       ║
# ╚══════════════════════════════════════════════════════════════════════╝

set -e

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  🔍 VERIFICACIÓN DE INFRAESTRUCTURA BACKEND"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ISSUES_FOUND=0
FIXES_NEEDED=()

# ═══════════════════════════════════════════════════════════════
# 1. VERIFICAR ARCHIVOS SQL DE PRICING DINÁMICO
# ═══════════════════════════════════════════════════════════════

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📁 1. Verificando archivos SQL de pricing..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

SQL_FILES=(
  "apps/web/database/setup-dynamic-pricing.sql"
  "apps/web/database/migrations/004-exchange-rates-and-usd-migration.sql"
)

for file in "${SQL_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "${GREEN}✓${NC} Encontrado: $file"
  else
    echo -e "${RED}✗${NC} Faltante: $file"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
    FIXES_NEEDED+=("Crear $file")
  fi
done

# ═══════════════════════════════════════════════════════════════
# 2. VERIFICAR SERVICIOS DE ANGULAR
# ═══════════════════════════════════════════════════════════════

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 2. Verificando servicios de Angular..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

SERVICES=(
  "apps/web/src/app/core/services/dynamic-pricing.service.ts"
  "apps/web/src/app/core/services/exchange-rate.service.ts"
)

for service in "${SERVICES[@]}"; do
  if [ -f "$service" ]; then
    echo -e "${GREEN}✓${NC} Encontrado: $(basename $service)"
  else
    echo -e "${RED}✗${NC} Faltante: $(basename $service)"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
    FIXES_NEEDED+=("Crear $service")
  fi
done

# ═══════════════════════════════════════════════════════════════
# 3. VERIFICAR EDGE FUNCTIONS (OPCIONAL)
# ═══════════════════════════════════════════════════════════════

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚡ 3. Verificando Edge Functions..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

EDGE_FUNCTIONS_DIR="supabase/functions"

if [ -d "$EDGE_FUNCTIONS_DIR" ]; then
  echo -e "${BLUE}ℹ${NC}  Directorio de Edge Functions encontrado"
  
  # Buscar función de pricing dinámico
  if [ -d "$EDGE_FUNCTIONS_DIR/calculate-dynamic-price" ]; then
    echo -e "${GREEN}✓${NC} Edge Function: calculate-dynamic-price"
  else
    echo -e "${YELLOW}⚠${NC}  Edge Function 'calculate-dynamic-price' no encontrada (opcional, se usa RPC function)"
  fi
  
  # Buscar función de exchange rates
  if [ -d "$EDGE_FUNCTIONS_DIR/update-exchange-rates" ]; then
    echo -e "${GREEN}✓${NC} Edge Function: update-exchange-rates"
  else
    echo -e "${YELLOW}⚠${NC}  Edge Function 'update-exchange-rates' no encontrada (se recomienda crear)"
    FIXES_NEEDED+=("Crear Edge Function para actualizar tasas de Binance cada 5 minutos")
  fi
else
  echo -e "${YELLOW}⚠${NC}  Directorio de Edge Functions no encontrado"
  echo -e "${BLUE}ℹ${NC}  Se puede usar RPC functions en su lugar"
fi

# ═══════════════════════════════════════════════════════════════
# 4. VERIFICAR VARIABLES DE ENTORNO
# ═══════════════════════════════════════════════════════════════

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 4. Verificando variables de entorno..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ENV_FILE="apps/web/.env.development.local"

if [ -f "$ENV_FILE" ]; then
  echo -e "${GREEN}✓${NC} Archivo .env encontrado"
  
  # Verificar Supabase URL
  if grep -q "NG_APP_SUPABASE_URL" "$ENV_FILE"; then
    SUPABASE_URL=$(grep "NG_APP_SUPABASE_URL" "$ENV_FILE" | cut -d'=' -f2)
    echo -e "${GREEN}✓${NC} SUPABASE_URL configurado: ${SUPABASE_URL:0:30}..."
  else
    echo -e "${RED}✗${NC} SUPABASE_URL no configurado"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
    FIXES_NEEDED+=("Configurar NG_APP_SUPABASE_URL en $ENV_FILE")
  fi
  
  # Verificar Supabase Anon Key
  if grep -q "NG_APP_SUPABASE_ANON_KEY" "$ENV_FILE"; then
    echo -e "${GREEN}✓${NC} SUPABASE_ANON_KEY configurado"
  else
    echo -e "${RED}✗${NC} SUPABASE_ANON_KEY no configurado"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
    FIXES_NEEDED+=("Configurar NG_APP_SUPABASE_ANON_KEY en $ENV_FILE")
  fi
else
  echo -e "${RED}✗${NC} Archivo $ENV_FILE no encontrado"
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
  FIXES_NEEDED+=("Crear $ENV_FILE basado en .env.development.local.example")
fi

# ═══════════════════════════════════════════════════════════════
# 5. INSTRUCCIONES PARA SETUP EN SUPABASE
# ═══════════════════════════════════════════════════════════════

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🗄️  5. Setup requerido en Supabase (MANUAL)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo -e "${BLUE}ℹ${NC}  Las siguientes tablas y funciones deben existir en Supabase:"
echo ""

REQUIRED_TABLES=(
  "pricing_regions - Regiones con precios base"
  "pricing_day_factors - Factores por día de la semana"
  "pricing_hour_factors - Factores por hora del día"
  "pricing_user_factors - Descuentos por tipo de usuario"
  "pricing_demand_snapshots - Snapshots de demanda (actualizado cada 15 min)"
  "pricing_special_events - Eventos especiales que afectan precio"
  "exchange_rates - Tasas de cambio de Binance"
)

for table in "${REQUIRED_TABLES[@]}"; do
  echo "   📊 $table"
done

echo ""
echo -e "${BLUE}ℹ${NC}  Funciones RPC requeridas:"
echo "   ⚙️  calculate_dynamic_price() - Calcula precio con todos los factores"
echo "   ⚙️  update_demand_snapshot() - Actualiza snapshot de demanda"
echo "   ⚙️  get_latest_exchange_rate() - Obtiene última tasa de Binance"

# ═══════════════════════════════════════════════════════════════
# 6. VERIFICAR SI LAS TABLAS EXISTEN (usando API REST)
# ═══════════════════════════════════════════════════════════════

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 6. Verificando tablas en Supabase (via REST API)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "$ENV_FILE" ]; then
  SUPABASE_URL=$(grep "NG_APP_SUPABASE_URL" "$ENV_FILE" | cut -d'=' -f2)
  SUPABASE_KEY=$(grep "NG_APP_SUPABASE_ANON_KEY" "$ENV_FILE" | cut -d'=' -f2)
  
  if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_KEY" ]; then
    echo -e "${BLUE}ℹ${NC}  Probando conexión a Supabase..."
    
    # Test pricing_regions table
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
      "${SUPABASE_URL}/rest/v1/pricing_regions?select=id&limit=1" \
      -H "apikey: ${SUPABASE_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_KEY}")
    
    if [ "$RESPONSE" -eq 200 ]; then
      echo -e "${GREEN}✓${NC} Tabla 'pricing_regions' existe y es accesible"
      
      # Count regions
      COUNT=$(curl -s "${SUPABASE_URL}/rest/v1/pricing_regions?select=count" \
        -H "apikey: ${SUPABASE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_KEY}" \
        -H "Prefer: count=exact" | jq -r '.[0].count // 0')
      
      if [ "$COUNT" -gt 0 ]; then
        echo -e "${GREEN}✓${NC} Hay $COUNT regiones configuradas"
      else
        echo -e "${YELLOW}⚠${NC}  No hay regiones configuradas (necesitas agregar al menos una)"
        FIXES_NEEDED+=("Insertar regiones en pricing_regions (ej: Montevideo, Buenos Aires)")
      fi
    elif [ "$RESPONSE" -eq 404 ]; then
      echo -e "${RED}✗${NC} Tabla 'pricing_regions' NO existe"
      ISSUES_FOUND=$((ISSUES_FOUND + 1))
      FIXES_NEEDED+=("Ejecutar setup-dynamic-pricing.sql en Supabase")
    else
      echo -e "${YELLOW}⚠${NC}  No se pudo verificar (HTTP $RESPONSE)"
    fi
    
    # Test exchange_rates table
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
      "${SUPABASE_URL}/rest/v1/exchange_rates?select=id&limit=1" \
      -H "apikey: ${SUPABASE_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_KEY}")
    
    if [ "$RESPONSE" -eq 200 ]; then
      echo -e "${GREEN}✓${NC} Tabla 'exchange_rates' existe y es accesible"
    elif [ "$RESPONSE" -eq 404 ]; then
      echo -e "${RED}✗${NC} Tabla 'exchange_rates' NO existe"
      ISSUES_FOUND=$((ISSUES_FOUND + 1))
      FIXES_NEEDED+=("Ejecutar migration 004-exchange-rates-and-usd-migration.sql")
    fi
  else
    echo -e "${YELLOW}⚠${NC}  No se pudo verificar (credenciales faltantes)"
  fi
else
  echo -e "${YELLOW}⚠${NC}  No se pudo verificar (archivo .env no encontrado)"
fi

# ═══════════════════════════════════════════════════════════════
# 7. CRON JOB PARA ACTUALIZAR PRECIOS (OPCIONAL)
# ═══════════════════════════════════════════════════════════════

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⏰ 7. Cron Jobs recomendados"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo -e "${BLUE}ℹ${NC}  Para que los precios se actualicen automáticamente, configura:"
echo ""
echo "   📅 Cada 15 minutos: update_demand_snapshot()"
echo "      → Actualiza demanda de cada región"
echo ""
echo "   📅 Cada 5 minutos: Llamada a Binance API"
echo "      → Actualiza tasas de cambio ARS/USD"
echo ""
echo -e "${YELLOW}⚠${NC}  Esto se hace con Edge Functions + Supabase Cron o con servicio externo"

# ═══════════════════════════════════════════════════════════════
# RESUMEN FINAL
# ═══════════════════════════════════════════════════════════════

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  📊 RESUMEN DE VERIFICACIÓN"
echo "═══════════════════════════════════════════════════════════════"
echo ""

if [ $ISSUES_FOUND -eq 0 ]; then
  echo -e "${GREEN}✅ TODO CONFIGURADO CORRECTAMENTE${NC}"
  echo ""
  echo "El sistema de precios dinámicos está listo para funcionar."
  echo ""
else
  echo -e "${YELLOW}⚠️  SE ENCONTRARON $ISSUES_FOUND PROBLEMAS${NC}"
  echo ""
  echo "Acciones requeridas:"
  echo ""
  
  for i in "${!FIXES_NEEDED[@]}"; do
    echo "   $((i+1)). ${FIXES_NEEDED[$i]}"
  done
  echo ""
fi

# ═══════════════════════════════════════════════════════════════
# PASOS SIGUIENTES
# ═══════════════════════════════════════════════════════════════

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 PASOS SIGUIENTES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. 📝 Ejecutar SQL en Supabase:"
echo "   → Ve a Supabase Dashboard > SQL Editor"
echo "   → Ejecuta: apps/web/database/setup-dynamic-pricing.sql"
echo "   → Ejecuta: apps/web/database/migrations/004-exchange-rates-and-usd-migration.sql"
echo ""
echo "2. 🌍 Insertar regiones iniciales:"
echo "   → INSERT INTO pricing_regions (name, country_code, currency, base_price_per_hour)"
echo "     VALUES ('Montevideo', 'UY', 'USD', 5.00);"
echo ""
echo "3. 💱 Insertar tasa de cambio inicial:"
echo "   → INSERT INTO exchange_rates (pair, source, binance_rate, platform_rate)"
echo "     VALUES ('USDTARS', 'manual', 1015.0, 1116.5);"
echo ""
echo "4. 🚗 Asignar region_id a los autos existentes:"
echo "   → UPDATE cars SET region_id = (SELECT id FROM pricing_regions LIMIT 1)"
echo "     WHERE region_id IS NULL;"
echo ""
echo "5. ⚡ (Opcional) Configurar Edge Function para Binance:"
echo "   → Crear supabase/functions/update-exchange-rates/index.ts"
echo "   → Deploy: supabase functions deploy update-exchange-rates"
echo "   → Cron: cada 5 minutos"
echo ""
echo "6. ✅ Testing:"
echo "   → npm run dev"
echo "   → Navegar a /search"
echo "   → Verificar que precios se muestran correctamente"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
