#!/bin/bash

# 🎯 SCRIPT RÁPIDO: Ver estado de tareas pendientes para producción
# Uso: ./ver-tareas.sh
# O: bash ver-tareas.sh

clear

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║    🚀 AUTORENTA - TAREAS PENDIENTES PARA PRODUCCIÓN           ║"
echo "║                                                                ║"
echo "║    Estado Actual: 47% ████████░░░░░░░░░░░░░░░░░░░░░░ 100%    ║"
echo "║    Timeline: 2-3 semanas para GO-LIVE                         ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"

echo ""
echo "📋 DOCUMENTOS PRINCIPALES:"
echo "─────────────────────────"
echo ""
echo "1. 📊 RESUMEN EJECUTIVO (5 min)"
echo "   → less +'/BLOQUEADORES CRÍTICOS' RESUMEN_EJECUTIVO_TAREAS_PENDIENTES.md"
echo ""
echo "2. 🎯 TAREAS DETALLADAS (15 min)"  
echo "   → less TAREAS_PENDIENTES_PRODUCCION_2025-10-28.md"
echo ""
echo "3. 📚 ÍNDICE COMPLETO (Búsqueda rápida)"
echo "   → less INDICE_TAREAS_PRODUCCION.md"
echo ""

echo "═════════════════════════════════════════════════════════════════"
echo "🔴 BLOQUEADORES CRÍTICOS (0-6 horas)"
echo "═════════════════════════════════════════════════════════════════"
echo ""
echo "❌ #1 TypeScript Errors (130 errores)"
echo "   Comando: cd apps/web && npm run build 2>&1 | head -50"
echo "   Esfuerzo: 2-4 horas"
echo "   Criticidad: MÁXIMA - Bloquea todo build"
echo ""
echo "❌ #2 Secrets Configuration (0% setup)"
echo "   Comando: wrangler secret list"
echo "   Esfuerzo: 1.5 horas"
echo "   Criticidad: MÁXIMA - Sin esto, pagos no funcionan"
echo ""
echo "❌ #3 MercadoPago Webhook (Sin validar)"
echo "   Comando: curl -X POST http://localhost:8787/webhooks/payments"
echo "   Esfuerzo: 1 hora"
echo "   Criticidad: MÁXIMA - Seguridad en riesgo"
echo ""

echo "═════════════════════════════════════════════════════════════════"
echo "🟠 TAREAS ALTA PRIORIDAD (11-16 horas)"
echo "═════════════════════════════════════════════════════════════════"
echo ""
echo "⏳ #4 Split Payment (Locadores cobren)"
echo "   Estado: 30% completado"
echo "   Esfuerzo: 5-7 horas"
echo ""
echo "⏳ #5 E2E Tests (90%+ coverage)"
echo "   Estado: 40% completado"
echo "   Esfuerzo: 3-4 horas"
echo "   Comando: npm run test:e2e"
echo ""
echo "⏳ #6 CI/CD GitHub Actions"
echo "   Estado: 40% completado"
echo "   Esfuerzo: 2-3 horas"
echo ""

echo "═════════════════════════════════════════════════════════════════"
echo "⚪ TAREAS IMPORTANTES (6-7.5 horas)"
echo "═════════════════════════════════════════════════════════════════"
echo ""
echo "📋 #7 Cloudflare Pages Auto-Deploy (1-1.5h)"
echo "📋 #8 Monitoreo & Alertas (1-2h)"
echo "📋 #9 Documentación Operativa (2h)"
echo ""

echo "═════════════════════════════════════════════════════════════════"
echo "⚡ ACCIONES INMEDIATAS (HOY)"
echo "═════════════════════════════════════════════════════════════════"
echo ""
echo "1️⃣  Ver errores TypeScript:"
echo "   cd apps/web && npm run build 2>&1 | tee build-errors.log"
echo ""
echo "2️⃣  Contar errores por tipo:"
echo "   npm run build 2>&1 | grep 'error TS' | wc -l"
echo ""
echo "3️⃣  Archivos afectados:"
echo "   npm run build 2>&1 | grep 'error TS' | cut -d: -f1 | sort -u"
echo ""
echo "4️⃣  Ver documentación detallada:"
echo "   less TAREAS_PENDIENTES_PRODUCCION_2025-10-28.md"
echo ""

echo "═════════════════════════════════════════════════════════════════"
echo "📊 ESTADO ACTUAL"
echo "═════════════════════════════════════════════════════════════════"

if [ -f "TAREAS_PENDIENTES_PRODUCCION_2025-10-28.md" ]; then
    echo ""
    echo "✅ Documentación de tareas: PRESENTE"
    echo "   Archivo: TAREAS_PENDIENTES_PRODUCCION_2025-10-28.md"
    echo "   Tamaño: $(wc -l < TAREAS_PENDIENTES_PRODUCCION_2025-10-28.md) líneas"
else
    echo ""
    echo "⚠️  Documentación de tareas: NO ENCONTRADA"
fi

echo ""

if [ -f "RESUMEN_EJECUTIVO_TAREAS_PENDIENTES.md" ]; then
    echo "✅ Resumen ejecutivo: PRESENTE"
    echo "   Archivo: RESUMEN_EJECUTIVO_TAREAS_PENDIENTES.md"
else
    echo "⚠️  Resumen ejecutivo: NO ENCONTRADO"
fi

echo ""

if [ -f ".git/config" ]; then
    echo "✅ Repositorio Git: PRESENTE"
    echo "   Rama actual: $(git branch --show-current)"
    echo "   Commits pendientes: $(git log --oneline origin/main.. 2>/dev/null | wc -l)"
else
    echo "⚠️  Repositorio Git: NO ENCONTRADO"
fi

echo ""
echo "═════════════════════════════════════════════════════════════════"
echo "🎯 RECOMENDACIÓN SIGUIENTE"
echo "═════════════════════════════════════════════════════════════════"
echo ""
echo "▸ Lee RESUMEN_EJECUTIVO_TAREAS_PENDIENTES.md (5 minutos)"
echo "▸ Luego TAREAS_PENDIENTES_PRODUCCION_2025-10-28.md (15 minutos)"
echo "▸ Comienza con Bloqueador #1 (TypeScript fixes)"
echo ""
echo "═════════════════════════════════════════════════════════════════"
