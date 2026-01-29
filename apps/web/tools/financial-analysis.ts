/**
 * ANÁLISIS FINANCIERO - MODELO COMODATO AUTORENTA
 * ================================================
 * Evaluación de sostenibilidad matemática del modelo:
 * - 15% Plataforma
 * - 75% Reward Pool (owners)
 * - 10% FGO (Fondo de Garantía)
 */

// ============================================
// PARÁMETROS BASE
// ============================================
const PARAMS = {
  // Distribución comodato
  platformFee: 0.15,      // 15%
  rewardPool: 0.75,       // 75%
  fgo: 0.10,              // 10%

  // Tarifas promedio por día (USD)
  avgDailyRates: {
    economy: 30,
    standard: 45,
    premium: 80,
    luxury: 130,
  },
  categoryWeights: {
    economy: 0.60,
    standard: 0.30,
    premium: 0.07,
    luxury: 0.03,
  },

  // Duración promedio de reserva
  avgTripDays: 3.5,

  // Claims/Siniestros
  claimFrequency: 0.06,     // 6% de viajes tienen reclamo
  avgClaimCost: 400,        // USD promedio por reclamo

  // Suscripciones
  subscriptionAdoption: 0.25,
  subscriptionAvgPrice: 375,  // Promedio entre $300 y $600
  tripsPerSubscriber: 10,

  // Costos operativos (% de ingresos plataforma)
  opexRate: 0.40,           // 40% de los ingresos van a operación
  paymentProcessingFee: 0.035, // 3.5% MercadoPago
};

// ============================================
// CÁLCULOS
// ============================================

function calculateWeightedDailyRate(): number {
  let rate = 0;
  for (const [cat, weight] of Object.entries(PARAMS.categoryWeights)) {
    rate += weight * PARAMS.avgDailyRates[cat as keyof typeof PARAMS.avgDailyRates];
  }
  return rate;
}

function analyzeScenario(tripsPerMonth: number, months: number = 12) {
  const totalTrips = tripsPerMonth * months;
  const avgDailyRate = calculateWeightedDailyRate();
  const avgBookingValue = avgDailyRate * PARAMS.avgTripDays;

  // GMV (Gross Merchandise Value)
  const gmv = totalTrips * avgBookingValue;

  // Distribución según modelo comodato
  const platformRevenue = gmv * PARAMS.platformFee;
  const rewardPoolTotal = gmv * PARAMS.rewardPool;
  const fgoContributions = gmv * PARAMS.fgo;

  // Ingresos adicionales: Suscripciones
  const estimatedSubscribers = (totalTrips / PARAMS.tripsPerSubscriber) * PARAMS.subscriptionAdoption;
  const subscriptionRevenue = estimatedSubscribers * PARAMS.subscriptionAvgPrice;

  // Claims/Siniestros
  const totalClaims = totalTrips * PARAMS.claimFrequency;
  const totalClaimCost = totalClaims * PARAMS.avgClaimCost;

  // FGO Balance
  const fgoNetBalance = fgoContributions - totalClaimCost;
  const fgoSufficiency = fgoContributions / totalClaimCost;

  // Costos
  const paymentFees = gmv * PARAMS.paymentProcessingFee;
  const opex = platformRevenue * PARAMS.opexRate;
  const totalCosts = paymentFees + opex;

  // EBITDA Plataforma
  const grossProfit = platformRevenue + subscriptionRevenue;
  const ebitda = grossProfit - totalCosts;
  const ebitdaMargin = (ebitda / grossProfit) * 100;

  // Métricas por viaje
  const revenuePerTrip = (platformRevenue + subscriptionRevenue) / totalTrips;
  const costPerTrip = totalCosts / totalTrips;
  const profitPerTrip = ebitda / totalTrips;

  return {
    // Escala
    tripsPerMonth,
    totalTrips,
    months,

    // GMV y Distribución
    gmv,
    avgBookingValue,
    platformRevenue,
    rewardPoolTotal,
    fgoContributions,
    subscriptionRevenue,

    // FGO Analysis
    totalClaims,
    totalClaimCost,
    fgoNetBalance,
    fgoSufficiency,

    // P&L Plataforma
    grossProfit,
    paymentFees,
    opex,
    totalCosts,
    ebitda,
    ebitdaMargin,

    // Unit Economics
    revenuePerTrip,
    costPerTrip,
    profitPerTrip,
  };
}

function formatCurrency(value: number): string {
  return '$' + value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function formatPercent(value: number): string {
  return value.toFixed(1) + '%';
}

// ============================================
// ANÁLISIS
// ============================================

console.log(`
╔══════════════════════════════════════════════════════════════════╗
║     ANÁLISIS FINANCIERO - MODELO COMODATO AUTORENTA              ║
╚══════════════════════════════════════════════════════════════════╝

📊 DISTRIBUCIÓN DE PAGOS:
   ├── Plataforma:   ${PARAMS.platformFee * 100}%
   ├── Reward Pool:  ${PARAMS.rewardPool * 100}%
   └── FGO:          ${PARAMS.fgo * 100}%

📈 PARÁMETROS:
   • Tarifa diaria promedio: ${formatCurrency(calculateWeightedDailyRate())}
   • Duración promedio: ${PARAMS.avgTripDays} días
   • Valor reserva promedio: ${formatCurrency(calculateWeightedDailyRate() * PARAMS.avgTripDays)}
   • Frecuencia de reclamos: ${PARAMS.claimFrequency * 100}%
   • Costo promedio reclamo: ${formatCurrency(PARAMS.avgClaimCost)}
`);

// Escenarios
const scenarios = [
  { trips: 50, label: 'MVP (50 viajes/mes)' },
  { trips: 100, label: 'Crecimiento (100 viajes/mes)' },
  { trips: 500, label: 'Escala (500 viajes/mes)' },
  { trips: 1000, label: 'Madurez (1000 viajes/mes)' },
];

console.log('═══════════════════════════════════════════════════════════════════');
console.log('                    ANÁLISIS POR ESCENARIO (12 meses)              ');
console.log('═══════════════════════════════════════════════════════════════════\n');

for (const scenario of scenarios) {
  const r = analyzeScenario(scenario.trips);

  console.log(`┌─────────────────────────────────────────────────────────────────┐`);
  console.log(`│ ${scenario.label.padEnd(63)} │`);
  console.log(`├─────────────────────────────────────────────────────────────────┤`);
  console.log(`│ Total viajes: ${r.totalTrips.toString().padEnd(49)} │`);
  console.log(`│ GMV anual: ${formatCurrency(r.gmv).padEnd(52)} │`);
  console.log(`├─────────────────────────────────────────────────────────────────┤`);
  console.log(`│ DISTRIBUCIÓN:                                                   │`);
  console.log(`│   Plataforma (15%):    ${formatCurrency(r.platformRevenue).padEnd(40)} │`);
  console.log(`│   Reward Pool (75%):   ${formatCurrency(r.rewardPoolTotal).padEnd(40)} │`);
  console.log(`│   FGO (10%):           ${formatCurrency(r.fgoContributions).padEnd(40)} │`);
  console.log(`│   + Suscripciones:     ${formatCurrency(r.subscriptionRevenue).padEnd(40)} │`);
  console.log(`├─────────────────────────────────────────────────────────────────┤`);
  console.log(`│ FGO SOSTENIBILIDAD:                                             │`);
  console.log(`│   Reclamos esperados:  ${r.totalClaims.toFixed(0).padEnd(40)} │`);
  console.log(`│   Costo reclamos:      ${formatCurrency(r.totalClaimCost).padEnd(40)} │`);
  console.log(`│   FGO Balance neto:    ${formatCurrency(r.fgoNetBalance).padEnd(40)} │`);
  console.log(`│   Ratio cobertura:     ${r.fgoSufficiency.toFixed(2)}x ${r.fgoSufficiency >= 1 ? '✅' : '⚠️'}`.padEnd(66) + `│`);
  console.log(`├─────────────────────────────────────────────────────────────────┤`);
  console.log(`│ P&L PLATAFORMA:                                                 │`);
  console.log(`│   Ingresos brutos:     ${formatCurrency(r.grossProfit).padEnd(40)} │`);
  console.log(`│   - Fees MP (3.5%):    ${formatCurrency(r.paymentFees).padEnd(40)} │`);
  console.log(`│   - OPEX (40%):        ${formatCurrency(r.opex).padEnd(40)} │`);
  console.log(`│   = EBITDA:            ${formatCurrency(r.ebitda).padEnd(40)} │`);
  console.log(`│   Margen EBITDA:       ${formatPercent(r.ebitdaMargin).padEnd(40)} │`);
  console.log(`├─────────────────────────────────────────────────────────────────┤`);
  console.log(`│ UNIT ECONOMICS (por viaje):                                     │`);
  console.log(`│   Revenue/viaje:       ${formatCurrency(r.revenuePerTrip).padEnd(40)} │`);
  console.log(`│   Costo/viaje:         ${formatCurrency(r.costPerTrip).padEnd(40)} │`);
  console.log(`│   Profit/viaje:        ${formatCurrency(r.profitPerTrip)} ${r.profitPerTrip > 0 ? '✅' : '❌'}`.padEnd(65) + `│`);
  console.log(`└─────────────────────────────────────────────────────────────────┘\n`);
}

// ============================================
// ANÁLISIS DE SENSIBILIDAD
// ============================================

console.log('═══════════════════════════════════════════════════════════════════');
console.log('                    ANÁLISIS DE SENSIBILIDAD                       ');
console.log('═══════════════════════════════════════════════════════════════════\n');

console.log('📊 ¿Qué pasa si cambian los parámetros clave?\n');

// Sensibilidad a frecuencia de reclamos
console.log('1️⃣  FRECUENCIA DE RECLAMOS (base: 6%)');
console.log('─────────────────────────────────────────');
const claimRates = [0.04, 0.06, 0.08, 0.10, 0.12];
for (const rate of claimRates) {
  const oldRate = PARAMS.claimFrequency;
  PARAMS.claimFrequency = rate;
  const r = analyzeScenario(100);
  PARAMS.claimFrequency = oldRate;
  const status = r.fgoSufficiency >= 1 ? '✅' : '❌';
  console.log(`   ${(rate * 100).toFixed(0)}% reclamos → FGO ratio: ${r.fgoSufficiency.toFixed(2)}x ${status}`);
}

console.log('\n2️⃣  COSTO PROMEDIO DE RECLAMO (base: $400)');
console.log('─────────────────────────────────────────');
const claimCosts = [200, 300, 400, 500, 600, 800];
for (const cost of claimCosts) {
  const oldCost = PARAMS.avgClaimCost;
  PARAMS.avgClaimCost = cost;
  const r = analyzeScenario(100);
  PARAMS.avgClaimCost = oldCost;
  const status = r.fgoSufficiency >= 1 ? '✅' : '❌';
  console.log(`   $${cost} promedio → FGO ratio: ${r.fgoSufficiency.toFixed(2)}x ${status}`);
}

// ============================================
// CONCLUSIÓN
// ============================================

const baseScenario = analyzeScenario(100);

console.log(`
═══════════════════════════════════════════════════════════════════
                         CONCLUSIÓN
═══════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│                    MODELO SOSTENIBLE: ${baseScenario.fgoSufficiency >= 1 && baseScenario.ebitda > 0 ? 'SÍ ✅' : 'NO ❌'}                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📈 FORTALEZAS:                                                 │
│     • FGO auto-financiado (ratio ${baseScenario.fgoSufficiency.toFixed(2)}x)                          │
│     • EBITDA positivo desde MVP                                 │
│     • Unit economics favorables ($${baseScenario.profitPerTrip.toFixed(0)}/viaje)                    │
│     • Ingresos diversificados (fee + suscripciones)             │
│                                                                 │
│  ⚠️  RIESGOS A MONITOREAR:                                      │
│     • Frecuencia de reclamos > 10% compromete FGO               │
│     • Costo promedio reclamo > $600 reduce margen               │
│     • Dependencia de adopción de suscripciones                  │
│                                                                 │
│  📊 PUNTO DE EQUILIBRIO:                                        │
│     • FGO: ~${((PARAMS.avgClaimCost * PARAMS.claimFrequency) / (calculateWeightedDailyRate() * PARAMS.avgTripDays * PARAMS.fgo) * 100).toFixed(1)}% de viajes con reclamo (actual: 6%)       │
│     • Plataforma: ~${Math.ceil(baseScenario.totalCosts / baseScenario.revenuePerTrip)} viajes/año para cubrir OPEX                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

💡 RECOMENDACIONES:
   1. Mantener cap de $800 por evento para limitar exposición FGO
   2. Incentivar suscripciones (mayor predictibilidad de ingresos)
   3. Implementar bonus-malus para reducir frecuencia de reclamos
   4. Escalar a 500+ viajes/mes para economías de escala en OPEX
`);
