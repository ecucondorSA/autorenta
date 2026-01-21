#!/usr/bin/env bun
/**
 * AutoRenta - Analizador de Resultados k6
 *
 * Analiza los resultados del test de saturación y genera un reporte con:
 * - Punto de saturación estimado
 * - Recomendaciones de escalamiento
 * - Cuellos de botella identificados
 *
 * Uso:
 *   bun run tools/load-test/analyze-results.ts <results-file.json>
 */

interface K6Metric {
  type: string;
  contains?: string;
  values: {
    count?: number;
    rate?: number;
    avg?: number;
    min?: number;
    max?: number;
    med?: number;
    'p(90)'?: number;
    'p(95)'?: number;
    'p(99)'?: number;
    passes?: number;
    fails?: number;
  };
}

interface K6Results {
  metrics: Record<string, K6Metric>;
  thresholds?: Record<string, { ok: boolean }>;
  root_group?: {
    checks?: Array<{ name: string; passes: number; fails: number }>;
  };
}

interface SaturationAnalysis {
  maxConcurrentUsers: number;
  saturationPoint: number;
  peakThroughput: number;
  avgLatencyAtPeak: number;
  p95LatencyAtPeak: number;
  errorRateAtPeak: number;
  bottlenecks: string[];
  recommendations: string[];
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

async function loadResults(filePath: string): Promise<K6Results> {
  const file = Bun.file(filePath);
  const content = await file.text();
  return JSON.parse(content);
}

function analyzeResults(results: K6Results): SaturationAnalysis {
  const metrics = results.metrics;
  const thresholds = results.thresholds || {};

  // Extraer métricas principales
  const httpReqs = metrics.http_reqs?.values || {};
  const httpDuration = metrics.http_req_duration?.values || {};
  const httpFailed = metrics.http_req_failed?.values || {};
  const vus = metrics.vus?.values || {};

  // Métricas por endpoint
  const marketplaceLatency = metrics.marketplace_latency?.values || {};
  const edgeFunctionLatency = metrics.edge_function_latency?.values || {};
  const marketplaceErrors = metrics.marketplace_errors?.values || {};
  const edgeFunctionErrors = metrics.edge_function_errors?.values || {};

  // Calcular punto de saturación
  const p95Latency = httpDuration['p(95)'] || 0;
  const errorRate = (httpFailed.rate || 0) * 100;
  const throughput = httpReqs.rate || 0;
  const maxVUs = vus.max || 0;

  // Estimar punto de saturación basado en latencia y errores
  let saturationPoint = maxVUs;
  if (p95Latency > 3000) {
    // Saturación cuando latencia > 3s
    saturationPoint = Math.floor(maxVUs * (3000 / p95Latency));
  }
  if (errorRate > 5) {
    // O cuando error rate > 5%
    saturationPoint = Math.min(saturationPoint, Math.floor(maxVUs * (5 / errorRate)));
  }

  // Identificar cuellos de botella
  const bottlenecks: string[] = [];

  if ((marketplaceLatency['p(95)'] || 0) > 1500) {
    bottlenecks.push('🐌 Marketplace API: Latencia alta en listados. Considerar índices adicionales en PostgreSQL.');
  }

  if ((edgeFunctionLatency['p(95)'] || 0) > 3000) {
    bottlenecks.push('🐌 Edge Functions: Latencia alta. Considerar optimización de código o aumento de memoria.');
  }

  if ((marketplaceErrors.rate || 0) > 0.05) {
    bottlenecks.push('❌ Marketplace: Tasa de errores elevada. Verificar connection pool de DB.');
  }

  if ((edgeFunctionErrors.rate || 0) > 0.05) {
    bottlenecks.push('❌ Edge Functions: Tasa de errores elevada. Verificar timeouts y cold starts.');
  }

  if (throughput < 50) {
    bottlenecks.push('⚡ Throughput bajo. Posible rate limiting de Supabase o saturación de DB.');
  }

  // Generar recomendaciones
  const recommendations: string[] = [];

  if (saturationPoint < 50) {
    recommendations.push('🔴 Capacidad muy limitada. Considerar upgrade a Supabase Pro o optimización agresiva.');
    recommendations.push('🔧 Revisar queries N+1 en el frontend.');
    recommendations.push('🔧 Implementar caching con Redis/Upstash.');
  } else if (saturationPoint < 100) {
    recommendations.push('🟡 Capacidad moderada. Suficiente para MVPs pero limitado para escala.');
    recommendations.push('🔧 Optimizar Edge Functions más usadas.');
    recommendations.push('🔧 Considerar CDN para assets estáticos.');
  } else if (saturationPoint < 200) {
    recommendations.push('🟢 Buena capacidad para producción inicial.');
    recommendations.push('🔧 Monitorear durante picos de tráfico.');
    recommendations.push('🔧 Preparar plan de escalamiento horizontal.');
  } else {
    recommendations.push('💚 Excelente capacidad. Sistema bien optimizado.');
    recommendations.push('🔧 Mantener monitoreo continuo.');
    recommendations.push('🔧 Documentar configuración actual como baseline.');
  }

  // Calcular grade
  let grade: 'A' | 'B' | 'C' | 'D' | 'F';
  const score =
    (saturationPoint >= 200 ? 40 : saturationPoint >= 100 ? 30 : saturationPoint >= 50 ? 20 : 10) +
    (p95Latency < 1000 ? 30 : p95Latency < 2000 ? 20 : p95Latency < 3000 ? 10 : 0) +
    (errorRate < 1 ? 30 : errorRate < 3 ? 20 : errorRate < 5 ? 10 : 0);

  if (score >= 90) grade = 'A';
  else if (score >= 75) grade = 'B';
  else if (score >= 60) grade = 'C';
  else if (score >= 40) grade = 'D';
  else grade = 'F';

  return {
    maxConcurrentUsers: maxVUs,
    saturationPoint,
    peakThroughput: throughput,
    avgLatencyAtPeak: httpDuration.avg || 0,
    p95LatencyAtPeak: p95Latency,
    errorRateAtPeak: errorRate,
    bottlenecks,
    recommendations,
    grade,
  };
}

function printReport(analysis: SaturationAnalysis): void {
  console.log('\n' + '═'.repeat(60));
  console.log('  🚗 AUTORENTA - ANÁLISIS DE SATURACIÓN');
  console.log('═'.repeat(60) + '\n');

  // Grade
  const gradeEmoji =
    analysis.grade === 'A' ? '🏆' :
    analysis.grade === 'B' ? '👍' :
    analysis.grade === 'C' ? '😐' :
    analysis.grade === 'D' ? '⚠️' : '🚨';

  console.log(`  CALIFICACIÓN: ${gradeEmoji} ${analysis.grade}\n`);

  // Métricas principales
  console.log('  📊 MÉTRICAS PRINCIPALES');
  console.log('  ' + '─'.repeat(40));
  console.log(`  │ VUs Máximos Testeados:  ${analysis.maxConcurrentUsers}`);
  console.log(`  │ Punto de Saturación:    ${analysis.saturationPoint} usuarios`);
  console.log(`  │ Throughput Pico:        ${analysis.peakThroughput.toFixed(2)} req/s`);
  console.log(`  │ Latencia Promedio:      ${analysis.avgLatencyAtPeak.toFixed(0)} ms`);
  console.log(`  │ Latencia p95:           ${analysis.p95LatencyAtPeak.toFixed(0)} ms`);
  console.log(`  │ Tasa de Errores:        ${analysis.errorRateAtPeak.toFixed(2)}%`);
  console.log('  ' + '─'.repeat(40) + '\n');

  // Cuellos de botella
  if (analysis.bottlenecks.length > 0) {
    console.log('  🔍 CUELLOS DE BOTELLA IDENTIFICADOS');
    console.log('  ' + '─'.repeat(40));
    analysis.bottlenecks.forEach((b) => console.log(`  ${b}`));
    console.log('');
  }

  // Recomendaciones
  console.log('  💡 RECOMENDACIONES');
  console.log('  ' + '─'.repeat(40));
  analysis.recommendations.forEach((r) => console.log(`  ${r}`));
  console.log('');

  // Interpretación del punto de saturación
  console.log('  📈 INTERPRETACIÓN');
  console.log('  ' + '─'.repeat(40));
  console.log(`  Tu sistema puede soportar aproximadamente ${analysis.saturationPoint}`);
  console.log(`  usuarios concurrentes antes de degradación significativa.`);
  console.log('');

  if (analysis.saturationPoint < 100) {
    console.log('  ⚠️  Con el plan actual de Supabase, considera:');
    console.log('     - Upgrade a plan Pro ($25/mes) para mejor performance');
    console.log('     - Implementar caching agresivo');
    console.log('     - Optimizar queries más pesadas');
  }

  console.log('\n' + '═'.repeat(60) + '\n');
}

// Main
async function main() {
  const args = Bun.argv.slice(2);

  if (args.length === 0) {
    console.log('Uso: bun run analyze-results.ts <results-file.json>');
    console.log('');
    console.log('Ejemplo:');
    console.log('  bun run tools/load-test/analyze-results.ts tools/load-test/results/summary-2026-01-20.json');
    process.exit(1);
  }

  const filePath = args[0];

  try {
    const results = await loadResults(filePath);
    const analysis = analyzeResults(results);
    printReport(analysis);

    // Guardar análisis como JSON
    const outputPath = filePath.replace('.json', '-analysis.json');
    await Bun.write(outputPath, JSON.stringify(analysis, null, 2));
    console.log(`  📁 Análisis guardado en: ${outputPath}\n`);
  } catch (error) {
    console.error('❌ Error al analizar resultados:', error);
    process.exit(1);
  }
}

main();
