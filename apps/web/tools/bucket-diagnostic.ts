
import { readFileSync } from 'fs';

// Simulamos la lógica de buckets del archivo original pero con desglose
const BUCKETS = {
  economy: { weight: 0.60, carValue: 12000, dailyRate: 30, deposit: 300 },
  standard: { weight: 0.30, carValue: 22000, dailyRate: 45, deposit: 500 },
  premium: { weight: 0.07, carValue: 35000, dailyRate: 80, deposit: 500 },
  luxury: { weight: 0.03, carValue: 60000, dailyRate: 130, deposit: 500 },
};

const CONFIG = {
  fgoRate: 0.10,
  alphaRate: 0.15,
  fundingRate: 0.80,
  claimFreq: 0.06,
  repairFactor: 0.04,
  fgoCap: 800,
  avgDays: 4
};

console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║     DIAGNÓSTICO DE RENTABILIDAD POR CATEGORÍA (UNIT ECONOMICS)           ║
╚══════════════════════════════════════════════════════════════════════════╝
`);

console.log(`| Categoría | Valor Auto | Ingreso FGO/trip | Costo FGO/trip | NETO/TRIP | ROI FGO |`);
console.log(`|-----------|------------|------------------|----------------|-----------|---------|`);

for (const [name, b] of Object.entries(BUCKETS)) {
  // INGRESO
  const fgoFromBooking = b.dailyRate * CONFIG.avgDays * CONFIG.fgoRate;
  const fgoFromAlpha = b.deposit * CONFIG.fundingRate * CONFIG.alphaRate;
  const totalIncome = fgoFromBooking + fgoFromAlpha;

  // COSTO (Basado en el waterfall)
  const claimCost = b.carValue * CONFIG.repairFactor;
  const coveredByUser = b.deposit; // Simplificado: el usuario pone su depósito
  const remainingForFgo = Math.max(0, claimCost - coveredByUser);
  const fgoPays = Math.min(remainingForFgo, CONFIG.fgoCap);
  
  const costPerTrip = fgoPays * CONFIG.claimFreq;
  const netPerTrip = totalIncome - costPerTrip;
  const roi = (totalIncome / costPerTrip).toFixed(2);

  console.log(`| ${name.padEnd(9)} | $${b.carValue.toString().padEnd(8)} | $${totalIncome.toFixed(2).padEnd(14)} | $${costPerTrip.toFixed(2).padEnd(12)} | $${netPerTrip.toFixed(2).padEnd(8)} | ${roi}x  |`);
}

console.log(`
⚠️ OBSERVACIÓN CRÍTICA:
Si el ROI baja de 1.0x, esa categoría está PERDIENDO dinero y es subsidiada por las demás.
`);
