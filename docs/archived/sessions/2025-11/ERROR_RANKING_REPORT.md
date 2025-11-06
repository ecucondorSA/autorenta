╔════════════════════════════════════════════════════════════════╗
║         RANKING DE ARCHIVOS POR CANTIDAD DE ERRORES           ║
║                   (De Mayor a Menor)                           ║
╚════════════════════════════════════════════════════════════════╝

📊 TOTAL DE ERRORES: ~2,161
📁 TOTAL DE ARCHIVOS: 21

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 CRÍTICOS (>100 errores) - 6 archivos - 1,958 errores (91%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣  cars-map.component.ts                    672 errores  ███████████
    └─ Componente de mapa con markers dinámicos
    
2️⃣  car-detail.page.ts                       597 errores  ██████████
    └─ Página de detalle de auto (vista principal)
    
3️⃣  car-card.component.ts                    253 errores  █████
    └─ Componente de tarjeta de auto (usado en listas)
    
4️⃣  transfer-funds.component.ts              171 errores  ███
    └─ Componente para transferir fondos de wallet
    
5️⃣  wallet-ledger.service.ts                 166 errores  ███
    └─ Servicio de contabilidad de wallet
    
6️⃣  payment-authorization.service.ts          99 errores  ██
    └─ Servicio de autorización de pagos (original)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🟡 MODERADOS (10-99 errores) - 3 archivos - 163 errores (8%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

7️⃣  supabase-client.service.POOLING.ts       72 errores  █
    └─ Servicio alternativo de pooling de conexiones
    
8️⃣  my-cars.page.ts                          59 errores  █
    └─ Página de mis autos (owner)
    
9️⃣  type-guards.ts                           32 errores  
    └─ Utilidades de validación de tipos

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🟢 MENORES (<10 errores) - 12 archivos - 40 errores (2%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

10  ledger-history.component.ts                6 errores
11  cars-list.page.ts                          5 errores
12  tour.service.ts                            5 errores
13  card-hold-panel.component.ts               4 errores
14  deposit-modal.component.ts                 3 errores
15  wallet.service.ts                          3 errores
16  public-profile.page.ts                     2 errores
17  profile-expanded.page.ts                   2 errores
18  realtime-connection.service.ts             2 errores
19  mercadopago-oauth.service.ts               2 errores
20  profile.service.ts                         1 error
21  encryption.service.ts                      1 error

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 DISTRIBUCIÓN PARETO (80/20):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Los TOP 3 archivos concentran el 71% de los errores:
  • cars-map.component.ts        31%  ████████████
  • car-detail.page.ts           28%  ███████████
  • car-card.component.ts        12%  ████

Los TOP 6 archivos concentran el 91% de los errores.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 ESTRATEGIA RECOMENDADA:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OPCIÓN A - Impacto Máximo (arreglar 3 archivos = 71% errores):
  1. cars-map.component.ts        (672 errores)
  2. car-detail.page.ts           (597 errores)
  3. car-card.component.ts        (253 errores)
  
  Resultado: ~1,522 errores resueltos
  Tiempo estimado: 3-4 horas

OPCIÓN B - Balance (arreglar 6 archivos = 91% errores):
  1-3. Los 3 anteriores
  4. transfer-funds.component.ts  (171 errores)
  5. wallet-ledger.service.ts     (166 errores)
  6. payment-authorization.service.ts (99 errores)
  
  Resultado: ~1,958 errores resueltos
  Tiempo estimado: 5-6 horas

OPCIÓN C - Rápido (arreglar errores menores primero):
  • 12 archivos con <10 errores cada uno
  • Total: 40 errores
  • Tiempo estimado: 1 hora
  • Impacto: 2% de errores
  • Ventaja: Victorias rápidas, motivación 🚀


Generado: Sat Nov  1 06:04:36 -03 2025

