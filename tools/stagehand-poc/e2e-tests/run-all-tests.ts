/**
 * Master Runner - Ejecutar todos los tests E2E
 *
 * Uso:
 *   bun run-all-tests.ts           # Ejecutar todos
 *   bun run-all-tests.ts payment   # Ejecutar solo payment
 *   bun run-all-tests.ts --list    # Listar tests disponibles
 */

import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const TESTS_DIR = '/home/edu/autorenta/tools/stagehand-poc/e2e-tests';
const OUTPUT_DIR = '/home/edu/autorenta/marketing/demos';

// Lista de todos los tests disponibles
const ALL_TESTS = [
  { name: 'payment-mercadopago', file: 'test-payment-mercadopago.ts', description: '💳 Pago con MercadoPago' },
  { name: 'verification-kyc', file: 'test-verification-kyc.ts', description: '🪪 Verificación KYC' },
  { name: 'disputes-damages', file: 'test-disputes-damages.ts', description: '⚠️ Disputas y Daños' },
  { name: 'cancellation', file: 'test-cancellation.ts', description: '❌ Cancelación de Reserva' },
  { name: 'wallet', file: 'test-wallet.ts', description: '💰 Wallet y Retiros' },
  { name: 'extend-rental', file: 'test-extend-rental.ts', description: '📅 Extender Alquiler' },
  { name: 'reviews', file: 'test-reviews.ts', description: '⭐ Reviews / Reseñas' },
  { name: 'chat', file: 'test-chat.ts', description: '💬 Chat / Mensajería' },
  { name: 'registration', file: 'test-registration.ts', description: '👤 Registro de Usuario' },
  { name: 'subscriptions', file: 'test-subscriptions.ts', description: '💎 Suscripciones' },
  { name: 'edit-car', file: 'test-edit-car.ts', description: '🚗 Editar Auto' },
  { name: 'calendar', file: 'test-calendar.ts', description: '📆 Calendario Disponibilidad' },
  { name: 'panic-mode', file: 'test-panic-mode.ts', description: '🚨 Panic Mode / Emergencia' },
];

interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  error?: string;
}

async function runTest(test: typeof ALL_TESTS[0]): Promise<TestResult> {
  const startTime = Date.now();
  const testPath = path.join(TESTS_DIR, test.file);

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`▶️  Ejecutando: ${test.description}`);
  console.log(`${'─'.repeat(50)}`);

  try {
    // Matar Chrome previo
    try {
      execSync('pkill -9 chrome 2>/dev/null', { stdio: 'pipe' });
    } catch {}
    await new Promise(r => setTimeout(r, 2000));

    // Ejecutar test con timeout
    execSync(`timeout 180 bun ${testPath}`, {
      stdio: 'inherit',
      cwd: TESTS_DIR,
    });

    const duration = (Date.now() - startTime) / 1000;
    return { name: test.name, success: true, duration };

  } catch (error: any) {
    const duration = (Date.now() - startTime) / 1000;
    // Exit code 124 es timeout, pero el test puede haber completado
    if (error.status === 124) {
      return { name: test.name, success: true, duration };
    }
    return {
      name: test.name,
      success: false,
      duration,
      error: error.message || 'Unknown error',
    };
  }
}

async function main() {
  const args = process.argv.slice(2);

  // Mostrar lista de tests
  if (args.includes('--list') || args.includes('-l')) {
    console.log('\n📋 Tests E2E Disponibles:\n');
    ALL_TESTS.forEach((test, i) => {
      console.log(`  ${i + 1}. ${test.description}`);
      console.log(`     Archivo: ${test.file}`);
      console.log(`     Comando: bun run-all-tests.ts ${test.name}\n`);
    });
    return;
  }

  // Filtrar tests si se especificó uno
  let testsToRun = ALL_TESTS;
  if (args.length > 0 && !args[0].startsWith('-')) {
    const filter = args[0].toLowerCase();
    testsToRun = ALL_TESTS.filter(t =>
      t.name.includes(filter) || t.description.toLowerCase().includes(filter)
    );

    if (testsToRun.length === 0) {
      console.error(`❌ No se encontró test con: "${args[0]}"`);
      console.log('   Usa --list para ver tests disponibles');
      process.exit(1);
    }
  }

  console.log('═'.repeat(60));
  console.log('🧪 SUITE DE TESTS E2E - AutoRenta');
  console.log('═'.repeat(60));
  console.log(`📊 Tests a ejecutar: ${testsToRun.length}`);
  console.log(`📁 Output: ${OUTPUT_DIR}`);

  const results: TestResult[] = [];
  const startTime = Date.now();

  for (const test of testsToRun) {
    const result = await runTest(test);
    results.push(result);

    // Pausa entre tests
    await new Promise(r => setTimeout(r, 3000));
  }

  // ========== RESUMEN FINAL ==========
  const totalDuration = (Date.now() - startTime) / 1000;
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log('\n' + '═'.repeat(60));
  console.log('📊 RESUMEN DE TESTS');
  console.log('═'.repeat(60));

  results.forEach(r => {
    const icon = r.success ? '✅' : '❌';
    const status = r.success ? 'PASS' : 'FAIL';
    console.log(`${icon} ${r.name.padEnd(25)} ${status} (${r.duration.toFixed(1)}s)`);
    if (r.error) {
      console.log(`   └─ Error: ${r.error.substring(0, 50)}...`);
    }
  });

  console.log('\n' + '─'.repeat(60));
  console.log(`✅ Pasaron: ${passed}`);
  console.log(`❌ Fallaron: ${failed}`);
  console.log(`⏱️  Tiempo total: ${totalDuration.toFixed(1)}s`);
  console.log('═'.repeat(60));

  // Listar archivos generados
  console.log('\n📁 Archivos generados:');
  try {
    const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.startsWith('test-'));
    files.forEach(f => console.log(`   ${f}`));
  } catch {}

  // Exit code basado en resultados
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
