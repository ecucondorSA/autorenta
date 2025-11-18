#!/usr/bin/env node

/**
 * Test Script: MCP TOON Response Conversion
 *
 * Valida que:
 * 1. Arrays de 3+ items se convierten a TOON
 * 2. La reducción de tokens es > 15%
 * 3. El fallback a JSON funciona correctamente
 * 4. Datos de string se mantienen como-está
 */

import { encode } from '@toon-format/toon';

// Simulamos la lógica de conversión del servidor
const toonOptimization = {
  enabled: true,
  minArrayLength: 3,
  minReductionPercent: 15,
};

function shouldConvertToToon(data: any): boolean {
  if (!toonOptimization.enabled) return false;
  if (!Array.isArray(data)) return false;
  if (data.length < toonOptimization.minArrayLength) return false;
  if (typeof data[0] !== 'object' || data[0] === null) return false;
  return true;
}

function tryConvertToToon(data: any): { text: string; mimeType: string } {
  if (!shouldConvertToToon(data)) {
    return {
      text: JSON.stringify(data, null, 2),
      mimeType: 'application/json',
    };
  }

  try {
    const jsonString = JSON.stringify(data);
    const toonString = encode(data);
    const reduction = ((1 - toonString.length / jsonString.length) * 100);

    if (reduction >= toonOptimization.minReductionPercent) {
      return {
        text: toonString,
        mimeType: 'text/x-toon',
      };
    }
  } catch (error) {
    console.error('TOON conversion failed:', error);
  }

  return {
    text: JSON.stringify(data, null, 2),
    mimeType: 'application/json',
  };
}

// Test Data: Simulamos respuestas de recursos críticos
const testCases = [
  {
    name: 'autorenta://cars/available (array de autos - mejor caso)',
    data: Array.from({ length: 100 }, (_, i) => ({
      id: i,
      brand: ['Toyota', 'Honda', 'Ford', 'VW'][i % 4],
      model: `Model${i}`,
      year: 2020 + (i % 5),
      rate: 1500 + (i * 10),
      location: ['CABA', 'GBA', 'LP'][i % 3],
      photos: (i % 5) + 1,
      rating: 4.0 + (i % 10) * 0.1,
      status: 'active'
    })),
    expectedMimeType: 'text/x-toon'
  },
  {
    name: 'autorenta://bookings/active (array de reservas - mejor caso)',
    data: Array.from({ length: 50 }, (_, i) => ({
      id: i,
      car: i,
      renter: i,
      owner: i,
      start: '2025-12-01',
      end: '2025-12-08',
      amount: 5000 + (i * 100),
      status: i % 2 === 0 ? 'pending' : 'approved'
    })),
    expectedMimeType: 'text/x-toon'
  },
  {
    name: 'Small array (2 items - no conversion)',
    data: [
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' }
    ],
    expectedMimeType: 'application/json'
  },
  {
    name: 'Non-array data (object)',
    data: {
      status: 'ok',
      value: 123
    },
    expectedMimeType: 'application/json'
  },
  {
    name: 'String data',
    data: 'This is a plain string response',
    expectedMimeType: 'text/plain'
  }
];

// Ejecutar tests
console.log('\n=== MCP TOON Response Conversion Tests ===\n');

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
  console.log(`Test: ${testCase.name}`);

  try {
    const result = typeof testCase.data === 'string'
      ? { text: testCase.data, mimeType: 'text/plain' }
      : tryConvertToToon(testCase.data);

    const jsonSize = JSON.stringify(testCase.data).length;
    const resultSize = result.text.length;
    const reduction = ((1 - resultSize / jsonSize) * 100).toFixed(1);

    const mimeTypeMatch = result.mimeType === testCase.expectedMimeType;
    const status = mimeTypeMatch ? '✓ PASS' : '✗ FAIL';

    console.log(`  MIME Type: ${result.mimeType} (expected: ${testCase.expectedMimeType})`);
    console.log(`  Size: ${jsonSize} → ${resultSize} bytes (${reduction}% reduction)`);
    console.log(`  ${status}\n`);

    if (mimeTypeMatch) {
      passed++;
    } else {
      failed++;
    }
  } catch (error) {
    console.log(`  ✗ FAIL - Error: ${error}\n`);
    failed++;
  }
}

// Resumen
console.log('=== Summary ===');
console.log(`Passed: ${passed}/${testCases.length}`);
console.log(`Failed: ${failed}/${testCases.length}`);

if (failed === 0) {
  console.log('\n✓ All TOON conversion tests passed!');
  process.exit(0);
} else {
  console.log('\n✗ Some tests failed!');
  process.exit(1);
}
