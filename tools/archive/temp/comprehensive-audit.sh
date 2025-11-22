#!/bin/bash

EXCLUDE="--exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=out-tsc --exclude-dir=android --exclude-dir=test-results"

echo "📍 UBICACIONES/CIUDADES HARDCODED"
echo "======================================="
grep -rn $EXCLUDE -iE "(Buenos Aires|Córdoba|Rosario|Mendoza|La Plata|Mar del Plata)" apps/web/src --include="*.ts" | grep -v "test\|spec\|mock" | head -15

echo ""
echo "🌐 URLS/APIs HARDCODED (no environment)"
echo "======================================="
grep -rn $EXCLUDE "https://" apps/web/src --include="*.ts" | grep -v "environment\|test\|spec\|comment\|import\|//" | head -20

echo ""
echo "📱 TELÉFONOS HARDCODED"
echo "======================================="
grep -rn $EXCLUDE -E "\+54|011|[\(]?[0-9]{3}[\)]?[-. ]?[0-9]{3}[-. ]?[0-9]{4}" apps/web/src --include="*.ts" | head -10

echo ""
echo "💰 PRECIOS/MONTOS FIJOS HARDCODED"
echo "======================================="
grep -rn $EXCLUDE -E "(price|amount|total).*=.*[0-9]{4,}" apps/web/src --include="*.ts" | grep -v "test\|spec\|mock\|timeout\|ms\|px" | head -15

echo ""
echo "📅 FECHAS HARDCODED"
echo "======================================="
grep -rn $EXCLUDE -E "20[0-9]{2}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])" apps/web/src --include="*.ts" | head -10

echo ""
echo "🔑 SERVICE ROLE KEYS en scripts (CRÍTICO)"
echo "======================================="
grep -rn "SERVICE_ROLE_KEY\|service_role" . --include="*.ts" --include="*.js" --include="*.sh" | grep -v node_modules | head -15

