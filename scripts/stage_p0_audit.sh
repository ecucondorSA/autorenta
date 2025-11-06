#!/bin/bash
set -euo pipefail

echo "▶️ Auditoría P0: framework / tests / workers / RLS"
command -v rg >/dev/null 2>&1 || { echo "⚠️ Instalá ripgrep (rg) para mejores resultados"; }

# 1) Framework & build
echo ""
echo "=== 1) Framework & Build ==="
if [ -f angular.json ]; then
  echo "✅ Angular detectado"
else
  echo "⚠️ No se detectó angular.json"
fi

echo "Node: $(node -v 2>/dev/null || echo 'NOT FOUND')"
echo "npm: $(npm -v 2>/dev/null || echo 'NOT FOUND')"

# 2) Playwright
echo ""
echo "=== 2) Playwright E2E ==="
if [ -f playwright.config.ts ]; then
  echo "✅ Playwright config detectado"
  echo "Specs encontradas:"
  find tests -name "*.spec.ts" 2>/dev/null | head -10 || echo "  (ninguna)"
else
  echo "⚠️ Playwright no detectado (instalar)"
fi

# 3) Workers (MP webhook)
echo ""
echo "=== 3) Workers (MP Webhook) ==="
if [ -d functions/workers ]; then
  echo "✅ Directorio workers detectado:"
  ls -1 functions/workers/ 2>/dev/null || echo "  (vacío)"
else
  echo "⚠️ Sin directorio functions/workers"
fi

# Buscar referencias a mercadopago
echo "Referencias a mercadopago/webhook:"
rg -l "mercadopago|webhook" functions 2>/dev/null | head -5 || echo "  (ninguna)"

# 4) Auth guard / rutas protegidas
echo ""
echo "=== 4) Auth Guards ==="
if rg -l "canActivate|AuthGuard|authGuard" apps/web/src 2>/dev/null | head -3; then
  echo "✅ Guards detectados"
else
  echo "⚠️ No se encontraron guards (Auth)"
fi

# 5) Adapter de pagos (mock vs real)
echo ""
echo "=== 5) Payment Adapter ==="
if rg -l "payments.*service|payment.*adapter" apps/web/src/app/core/services 2>/dev/null | head -3; then
  echo "✅ Payment service detectado"
  rg "USE_PAYMENT_MOCK|mockPayment" apps/web/src 2>/dev/null | head -3 || echo "  (sin mock flag detectado)"
else
  echo "⚠️ Payment service no detectado"
fi

# 6) Supabase types
echo ""
echo "=== 6) Supabase Types ==="
if [ -f apps/web/src/app/core/types/database.types.ts ]; then
  echo "✅ Types database.types.ts encontrado"
  echo "Última modificación: $(stat -c %y apps/web/src/app/core/types/database.types.ts 2>/dev/null | cut -d' ' -f1)"
else
  echo "⚠️ Falta apps/web/src/app/core/types/database.types.ts"
fi

# 7) RLS / policies duplicadas
echo ""
echo "=== 7) RLS Queries ==="
cat > /tmp/dupe_policies.sql <<'SQL'
-- Ejecutar en psql para ver policies
select schemaname, tablename, polname, roles, cmd, permissive
from pg_policies
order by schemaname, tablename, polname;

-- hint: revisar múltiples 'permissive=true' para mismo rol/cmd
SQL
echo "ℹ️ Query SQL generada en /tmp/dupe_policies.sql"
echo "Ejecutá: psql \$DATABASE_URL -f /tmp/dupe_policies.sql"

# 8) Environment files
echo ""
echo "=== 8) Environment Config ==="
if [ -f apps/web/.env.development.local ]; then
  echo "✅ .env.development.local existe"
else
  echo "⚠️ Falta apps/web/.env.development.local"
fi

if [ -f apps/web/src/environments/environment.ts ]; then
  echo "✅ environment.ts existe"
else
  echo "⚠️ Falta environment.ts"
fi

# 9) Tests existentes
echo ""
echo "=== 9) Tests Actuales ==="
echo "E2E tests:"
find tests -name "*.spec.ts" 2>/dev/null | wc -l | xargs echo "  Total specs:"
echo ""
echo "Unit tests:"
find apps/web/src -name "*.spec.ts" 2>/dev/null | wc -l | xargs echo "  Total specs:"

# 10) Resumen
echo ""
echo "=== RESUMEN P0 ==="
echo "✅ = Listo | ⚠️ = Falta | ℹ️ = Info"
echo ""
echo "Recomendado próximo paso:"
echo "1. npx playwright install --with-deps"
echo "2. npm run build (verificar que compile)"
echo "3. npm run e2e (ejecutar tests existentes)"
echo ""
echo "🏁 Auditoría completada"
