#!/bin/bash

echo "🔍 BUSCANDO TODO LO HARDCODED EN EL CÓDIGO..."
echo ""

# Excluir node_modules, .git, dist, out-tsc
EXCLUDE="--exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=out-tsc --exclude-dir=android"

echo "1️⃣ CREDENCIALES Y TOKENS HARDCODEADOS"
echo "======================================="
grep -rn $EXCLUDE -E "(password|secret|token|api_key|apiKey|apikey).*=.*['\"]" apps/web/src --include="*.ts" --include="*.js" | head -20

echo ""
echo "2️⃣ URLS HARDCODEADAS"
echo "======================================="
grep -rn $EXCLUDE -E "https?://[a-zA-Z0-9\.\-/]+" apps/web/src --include="*.ts" --include="*.js" | grep -v "import\|//" | head -30

echo ""
echo "3️⃣ COORDENADAS/UBICACIONES HARDCODEADAS"
echo "======================================="
grep -rn $EXCLUDE -E "lat.*=.*-?[0-9]+\.[0-9]+|lng.*=.*-?[0-9]+\.[0-9]+|latitude|longitude" apps/web/src --include="*.ts" --include="*.js" | head -20

echo ""
echo "4️⃣ EMAILS HARDCODEADOS"
echo "======================================="
grep -rn $EXCLUDE -E "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}" apps/web/src --include="*.ts" --include="*.js" | head -20

echo ""
echo "5️⃣ IDs/UUIDS HARDCODEADOS"
echo "======================================="
grep -rn $EXCLUDE -E "(userId|carId|bookingId|id).*=.*['\"][a-f0-9-]{20,}['\"]" apps/web/src --include="*.ts" --include="*.js" | head -20

echo ""
echo "6️⃣ NOMBRES/MARCAS HARDCODEADAS"
echo "======================================="
grep -rn $EXCLUDE -E "(Chevrolet|Toyota|Ford|Honda|Nissan|Hyundai|Cruze|Onix|Creta)" apps/web/src --include="*.ts" --include="*.js" | grep -v "test\|spec\|mock" | head -20

echo ""
echo "7️⃣ SUPABASE KEYS HARDCODEADAS"
echo "======================================="
grep -rn $EXCLUDE "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" . --include="*.ts" --include="*.js" | head -10

