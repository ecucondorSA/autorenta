/**
 * AUTORENTA FGO SIMULATOR (Solo modelo COMODATO)
 * =================================================
 * AutoRenta opera exclusivamente bajo modelo comodato:
 * - FGO se financia desde DEPÓSITOS en wallet (alpha %) + 10% de cada booking.
 * - Distribución: 15% plataforma + 75% reward pool + 10% FGO.
 * - Owner no recibe pago directo, solo rewards mensuales por puntos.
 * - Waterfall actual: hold/wallet primero, FGO cubre el resto (sin cap duro).
 * - Suscripciones: $300/$600 con cobertura $500/$1000, NO aportan al FGO.
 */

type Bucket = 'economy' | 'standard' | 'premium' | 'luxury';

const CONFIG = {
  seed: 12345,
  iterations: 2000,
  months: 12,
  tripsPerMonth: 100,

  // Pricing y plataforma
  platformFeeRate: 0.15, // 15% plataforma (default actual)

  // FGO funding
  fgo: {
    alpha: 0.15, // fgo_metrics.alpha_percentage (default 15%)
    eventCapUsd: 800, // política (no se aplica duro en ejecución)
    recoveryRate: 0.0, // % recupero posterior (0 = no recupero)
    hardCap: true, // si true, FGO NO paga más que eventCapUsd
  },

  // Wallet / Card mix
  paymentMix: {
    walletShare: 0.30, // % de reservas con wallet (sin tarjeta)
    depositFundingRate: 0.80, // % del depósito que proviene de un TOPUP nuevo (si ya tiene saldo, <1)
  },

  // Suscripciones
  subscription: {
    adoptionRate: 0.25, // % de usuarios con suscripción activa
    premiumTierRate: 0.25, // % de suscriptores en Club Black
    annualTripsPerSubscriber: 10,
    tiers: {
      standard: { priceUsd: 300, coverageUsd: 500 },
      premium: { priceUsd: 600, coverageUsd: 1000 },
    },
  },

  // Comodato (si aplica)
  comodato: {
    share: 1.0, // % de reservas comodato (todo el sistema)
    fgoRate: 0.10, // 10% al FGO
  },

  // Fleet + rates
  buckets: {
    economy: { weight: 0.60, valueRange: [6000, 15000], dailyRate: 30 },
    standard: { weight: 0.30, valueRange: [15001, 25000], dailyRate: 45 },
    premium: { weight: 0.07, valueRange: [25001, 40000], dailyRate: 80 },
    luxury: { weight: 0.03, valueRange: [40001, 70000], dailyRate: 130 },
  } as Record<Bucket, { weight: number; valueRange: [number, number]; dailyRate: number }>,

  // Claims
  claims: {
    frequency: 0.06,
    repairCostFactor: 0.04, // % del valor del auto como daño medio base
    severity: {
      minor: { prob: 0.70, multiplier: 0.6 },
      medium: { prob: 0.25, multiplier: 1.2 },
      major: { prob: 0.05, multiplier: 2.5 },
    },
  },

  // FX para hold mínimo (ARS -> USD)
  fxRate: 1748,
};

// =======================
// Franquicias (code actual)
// =======================
const FRANCHISE_BANDS = [
  { maxValue: 10000, standardUsd: 500 },
  { maxValue: 20000, standardUsd: 800 },
  { maxValue: 40000, standardUsd: 1200 },
  { maxValue: Infinity, standardUsd: 1800 },
];

const HOLD_PERCENTAGE = 0.05;
const ROLLOVER_MULTIPLIER = 2.0;

// =======================
// RNG
// =======================
function makeRng(seed: number) {
  let _seed = seed >>> 0;
  return () => {
    const a = 1664525;
    const c = 1013904223;
    const m = 2 ** 32;
    _seed = (a * _seed + c) % m;
    return _seed / m;
  };
}

// =======================
// Helpers
// =======================
function pickBucket(rng: () => number): Bucket {
  const roll = rng();
  let acc = 0;
  const buckets: Bucket[] = ['economy', 'standard', 'premium', 'luxury'];
  for (const bucket of buckets) {
    acc += CONFIG.buckets[bucket].weight;
    if (roll <= acc) return bucket;
  }
  return 'standard';
}

function sampleCarValue(bucket: Bucket, rng: () => number): number {
  const [min, max] = CONFIG.buckets[bucket].valueRange;
  return Math.round(min + (max - min) * (0.15 + 0.7 * rng()));
}

function getStandardFranchiseUsd(carValueUsd: number): number {
  const band = FRANCHISE_BANDS.find((b) => carValueUsd <= b.maxValue);
  return band ? band.standardUsd : FRANCHISE_BANDS[FRANCHISE_BANDS.length - 1].standardUsd;
}

function getRolloverFranchiseUsd(carValueUsd: number): number {
  return getStandardFranchiseUsd(carValueUsd) * ROLLOVER_MULTIPLIER;
}

function getSecurityCreditUsd(carValueUsd: number): number {
  return carValueUsd <= 20000 ? 300 : 500;
}

function calcHoldUsd(carValueUsd: number, bucket: Bucket, _fxRate: number): number {
  void bucket; // Se mantiene para compatibilidad del simulador
  return carValueUsd * HOLD_PERCENTAGE;
}

function sampleTripDays(rng: () => number): number {
  return 2 + Math.floor(rng() * 5); // 2 a 6 días
}

function sampleClaimCost(carValueUsd: number, rng: () => number): number {
  const base = carValueUsd * CONFIG.claims.repairCostFactor;
  const roll = rng();
  let multiplier = CONFIG.claims.severity.major.multiplier;
  if (roll < CONFIG.claims.severity.minor.prob) {
    multiplier = CONFIG.claims.severity.minor.multiplier;
  } else if (roll < CONFIG.claims.severity.minor.prob + CONFIG.claims.severity.medium.prob) {
    multiplier = CONFIG.claims.severity.medium.multiplier;
  }
  const jitter = 0.8 + rng() * 0.4;
  return Math.max(50, base * multiplier * jitter);
}

function getSubscriptionCoveragePerTrip(rng: () => number): number {
  if (rng() >= CONFIG.subscription.adoptionRate) return 0;
  const isPremium = rng() < CONFIG.subscription.premiumTierRate;
  const tier = isPremium ? CONFIG.subscription.tiers.premium : CONFIG.subscription.tiers.standard;
  return tier.coverageUsd / CONFIG.subscription.annualTripsPerSubscriber;
}

function getAvgSubscriptionRevenuePerTrip(): number {
  const avgPrice =
    CONFIG.subscription.tiers.standard.priceUsd * (1 - CONFIG.subscription.premiumTierRate) +
    CONFIG.subscription.tiers.premium.priceUsd * CONFIG.subscription.premiumTierRate;
  return (CONFIG.subscription.adoptionRate * avgPrice) / CONFIG.subscription.annualTripsPerSubscriber;
}

// =======================
// Simulation
// =======================
interface SimResult {
  fgoFinalBalance: number;
  totalFgoContrib: number;
  totalFgoPaid: number;
  totalFgoRecovered: number;
  platformRevenue: number;
  subscriptionRevenue: number;
  totalTrips: number;
  totalClaims: number;
  aboveCapEvents: number;
  aboveCapAmount: number;
  totalUncovered: number;
  uncoveredEvents: number;
  bankrupt: boolean;
}

function simulateIteration(rng: () => number): SimResult {
  let fgoBalance = 5000; // Fondo inicial
  let totalFgoContrib = 0;
  let totalFgoPaid = 0;
  let totalFgoRecovered = 0;
  let platformRevenue = 0;
  let subscriptionRevenue = 0;
  let totalTrips = 0;
  let totalClaims = 0;
  let aboveCapEvents = 0;
  let aboveCapAmount = 0;
  let totalUncovered = 0;
  let uncoveredEvents = 0;
  let bankrupt = false;

  const avgSubRevenuePerTrip = getAvgSubscriptionRevenuePerTrip();

  for (let m = 0; m < CONFIG.months; m++) {
    for (let t = 0; t < CONFIG.tripsPerMonth; t++) {
      totalTrips++;

      const bucket = pickBucket(rng);
      const carValue = sampleCarValue(bucket, rng);
      const tripDays = sampleTripDays(rng);
      const dailyRate = CONFIG.buckets[bucket].dailyRate;
      const totalRental = dailyRate * tripDays;

      const isComodato = rng() < CONFIG.comodato.share;
      const usesWallet = rng() < CONFIG.paymentMix.walletShare;

      // Platform fee
      platformRevenue += totalRental * CONFIG.platformFeeRate;

      // Subscription revenue (aprox, prorrateado por viaje)
      subscriptionRevenue += avgSubRevenuePerTrip;

      // FGO contribution
      const subCoveragePerTrip = getSubscriptionCoveragePerTrip(rng);
      const securityCreditUsd = getSecurityCreditUsd(carValue);
      const walletDepositUsd = usesWallet
        ? Math.max(0, securityCreditUsd - subCoveragePerTrip)
        : 0;

      const depositFundingUsd = walletDepositUsd * CONFIG.paymentMix.depositFundingRate;
      const fgoFromDeposit = depositFundingUsd * CONFIG.fgo.alpha;
      const fgoFromComodato = isComodato ? totalRental * CONFIG.comodato.fgoRate : 0;
      const fgoContribution = fgoFromDeposit + fgoFromComodato;

      totalFgoContrib += fgoContribution;
      fgoBalance += fgoContribution;

      // Claim?
      const hasClaim = rng() < CONFIG.claims.frequency;
      if (!hasClaim) continue;

      totalClaims++;
      const claimCost = sampleClaimCost(carValue, rng);

      // Waterfall actual: hold/wallet primero, FGO cubre resto
      let coveredByDeposit = 0;
      if (usesWallet) {
        coveredByDeposit = Math.min(claimCost, walletDepositUsd);
      } else {
        const holdUsd = calcHoldUsd(carValue, bucket, CONFIG.fxRate);
        coveredByDeposit = Math.min(claimCost, holdUsd);
      }

      const remaining = Math.max(0, claimCost - coveredByDeposit);
      const fgoPaid = CONFIG.fgo.hardCap
        ? Math.min(remaining, CONFIG.fgo.eventCapUsd)
        : remaining;
      const uncovered = Math.max(0, remaining - fgoPaid);

      totalFgoPaid += fgoPaid;
      fgoBalance -= fgoPaid;

      if (remaining > CONFIG.fgo.eventCapUsd) {
        aboveCapEvents++;
        aboveCapAmount += remaining - CONFIG.fgo.eventCapUsd;
      }

      if (uncovered > 0) {
        totalUncovered += uncovered;
        uncoveredEvents++;
      }

      // Recupero (si aplica)
      if (CONFIG.fgo.recoveryRate > 0) {
        const recovered = fgoPaid * CONFIG.fgo.recoveryRate;
        totalFgoRecovered += recovered;
        fgoBalance += recovered;
      }

      if (fgoBalance < 0) bankrupt = true;
    }
  }

  return {
    fgoFinalBalance: fgoBalance,
    totalFgoContrib,
    totalFgoPaid,
    totalFgoRecovered,
    platformRevenue,
    subscriptionRevenue,
    totalTrips,
    totalClaims,
    aboveCapEvents,
    aboveCapAmount,
    totalUncovered,
    uncoveredEvents,
    bankrupt,
  };
}

function runSimulation() {
  console.log(`\n📌 SIMULACIÓN FGO (Modelo actual de plataforma)`);
  console.log(`---------------------------------------------------------------`);
  console.log(`INPUTS:`);
  console.log(`• Trips/mes: ${CONFIG.tripsPerMonth} | Meses: ${CONFIG.months}`);
  console.log(`• Wallet share: ${(CONFIG.paymentMix.walletShare * 100).toFixed(0)}%`);
  console.log(`• Alpha FGO (depósitos): ${(CONFIG.fgo.alpha * 100).toFixed(0)}%`);
  console.log(`• Suscripciones: ${(CONFIG.subscription.adoptionRate * 100).toFixed(0)}% adopción`);
  console.log(`• Comodato: ${(CONFIG.comodato.share * 100).toFixed(0)}% (FGO ${
    CONFIG.comodato.fgoRate * 100
  }%)`);
  console.log('---------------------------------------------------------------');

  const results: SimResult[] = [];

  for (let i = 0; i < CONFIG.iterations; i++) {
    const rng = makeRng(CONFIG.seed + i * 999);
    results.push(simulateIteration(rng));
  }

  // Aggregates
  const bankruptcies = results.filter((r) => r.bankrupt).length;
  const risk = (bankruptcies / CONFIG.iterations) * 100;

  const avgFinal =
    results.reduce((sum, r) => sum + r.fgoFinalBalance, 0) / CONFIG.iterations;
  const avgFgoContrib =
    results.reduce((sum, r) => sum + r.totalFgoContrib, 0) / CONFIG.iterations;
  const avgFgoPaid =
    results.reduce((sum, r) => sum + r.totalFgoPaid, 0) / CONFIG.iterations;
  const avgFgoRecovered =
    results.reduce((sum, r) => sum + r.totalFgoRecovered, 0) / CONFIG.iterations;

  const totalTrips = results.reduce((sum, r) => sum + r.totalTrips, 0) / CONFIG.iterations;
  const avgFgoContribPerTrip = avgFgoContrib / totalTrips;
  const avgFgoPaidPerTrip = avgFgoPaid / totalTrips;
  const avgFgoNetPerTrip = (avgFgoContrib - (avgFgoPaid - avgFgoRecovered)) / totalTrips;

  const avgPlatformRevenue =
    results.reduce((sum, r) => sum + r.platformRevenue, 0) / CONFIG.iterations;
  const avgSubRevenue =
    results.reduce((sum, r) => sum + r.subscriptionRevenue, 0) / CONFIG.iterations;

  const avgAboveCapEvents =
    results.reduce((sum, r) => sum + r.aboveCapEvents, 0) / CONFIG.iterations;
  const avgAboveCapAmount =
    results.reduce((sum, r) => sum + r.aboveCapAmount, 0) / CONFIG.iterations;
  const avgUncovered =
    results.reduce((sum, r) => sum + r.totalUncovered, 0) / CONFIG.iterations;
  const avgUncoveredEvents =
    results.reduce((sum, r) => sum + r.uncoveredEvents, 0) / CONFIG.iterations;

  // Percentiles
  const sorted = [...results].sort((a, b) => a.fgoFinalBalance - b.fgoFinalBalance);
  const p5 = sorted[Math.floor(CONFIG.iterations * 0.05)]?.fgoFinalBalance ?? 0;

  console.log(`\n📊 RESULTADOS (promedio por viaje)`);
  console.log(`• FGO ingreso:   $${avgFgoContribPerTrip.toFixed(2)}`);
  console.log(`• FGO payout:    $${avgFgoPaidPerTrip.toFixed(2)}`);
  console.log(`• FGO neto:      $${avgFgoNetPerTrip.toFixed(2)} / viaje`);

  console.log(`\n💰 INGRESOS PLATAFORMA (promedio mensual)`);
  console.log(`• Plataforma (15%): $${avgPlatformRevenue.toFixed(0)}`);
  console.log(`• Suscripciones:     $${avgSubRevenue.toFixed(0)}`);

  console.log(`\n📉 RIESGO FGO`);
  console.log(`• Riesgo quiebra: ${risk.toFixed(1)}%`);
  console.log(`• Fondo final (avg): $${avgFinal.toFixed(0)}`);
  console.log(`• P5 (peor 5%): $${p5.toFixed(0)}`);

  console.log(`\n⚠️ EXCESOS SOBRE CAP (${CONFIG.fgo.eventCapUsd} USD)`);
  console.log(`• Eventos > cap (avg): ${avgAboveCapEvents.toFixed(1)} / período`);
  console.log(`• Monto sobre cap (avg): $${avgAboveCapAmount.toFixed(0)}`);

  console.log(`\n🧾 NO CUBIERTO (CAP DURO)`);
  console.log(`• Eventos con gap (avg): ${avgUncoveredEvents.toFixed(1)} / período`);
  console.log(`• Monto no cubierto (avg): $${avgUncovered.toFixed(0)}`);

  console.log(`\n🔎 Nota:`);
  console.log(
    `• Cap duro ${CONFIG.fgo.hardCap ? 'ACTIVO' : 'INACTIVO'} en la simulación.`,
  );
}

runSimulation();
