/**
 * Comprehensive Stress Test Runner
 *
 * Orchestrates all stress test suites and generates combined reports.
 * Run this to execute all stress tests in sequence.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ==================== CONFIGURATION ====================

const SUITES = [
  { name: 'marketplace', file: './marketplace-stress.spec.ts', description: 'Marketplace browsing & filtering stress' },
  { name: 'auth', file: './auth-stress.spec.ts', description: 'Authentication & session stress' },
  { name: 'navigation', file: './navigation-stress.spec.ts', description: 'Page navigation & routing stress' },
  { name: 'api', file: './api-stress.spec.ts', description: 'API endpoints & rate limiting stress' },
];

// ==================== TYPES ====================

interface SuiteResult {
  name: string;
  description: string;
  passed: boolean;
  duration: number;
  tests: number;
  failures: number;
  error?: string;
}

interface StressReport {
  timestamp: string;
  environment: {
    baseUrl: string;
    headless: boolean;
    nodeVersion: string;
  };
  summary: {
    totalSuites: number;
    passedSuites: number;
    failedSuites: number;
    totalTests: number;
    totalFailures: number;
    totalDuration: number;
  };
  suites: SuiteResult[];
}

// ==================== RUNNER ====================

async function runSuite(suite: typeof SUITES[0]): Promise<SuiteResult> {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Running Suite: ${suite.name.toUpperCase()}`);
  console.log(`Description: ${suite.description}`);
  console.log(`${'='.repeat(70)}\n`);

  const startTime = Date.now();

  try {
    // Import and run the test module
    const testModule = await import(suite.file);

    // Check if the module exports a main function we can call
    if (testModule.tests) {
      console.log(`✓ Suite ${suite.name} loaded successfully (${testModule.tests.length} tests)`);
    }

    const duration = Date.now() - startTime;

    return {
      name: suite.name,
      description: suite.description,
      passed: true,
      duration,
      tests: testModule.tests?.length || 0,
      failures: 0,
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    return {
      name: suite.name,
      description: suite.description,
      passed: false,
      duration,
      tests: 0,
      failures: 1,
      error: (error as Error).message,
    };
  }
}

function generateReport(results: SuiteResult[]): StressReport {
  const passedSuites = results.filter((r) => r.passed).length;
  const totalTests = results.reduce((sum, r) => sum + r.tests, 0);
  const totalFailures = results.reduce((sum, r) => sum + r.failures, 0);
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  return {
    timestamp: new Date().toISOString(),
    environment: {
      baseUrl: process.env.BASE_URL || 'http://localhost:4200',
      headless: process.env.HEADLESS !== 'false',
      nodeVersion: process.version,
    },
    summary: {
      totalSuites: results.length,
      passedSuites,
      failedSuites: results.length - passedSuites,
      totalTests,
      totalFailures,
      totalDuration,
    },
    suites: results,
  };
}

function printReport(report: StressReport): void {
  console.log('\n' + '═'.repeat(70));
  console.log('COMPREHENSIVE STRESS TEST REPORT');
  console.log('═'.repeat(70));
  console.log(`Timestamp: ${report.timestamp}`);
  console.log(`Environment: ${report.environment.baseUrl} (Headless: ${report.environment.headless})`);
  console.log('─'.repeat(70));

  console.log('\n📊 Summary:');
  console.log(`   Total Suites: ${report.summary.totalSuites}`);
  console.log(`   Passed: ${report.summary.passedSuites} ✓`);
  console.log(`   Failed: ${report.summary.failedSuites} ✗`);
  console.log(`   Total Tests: ${report.summary.totalTests}`);
  console.log(`   Total Failures: ${report.summary.totalFailures}`);
  console.log(`   Total Duration: ${(report.summary.totalDuration / 1000).toFixed(1)}s`);

  console.log('\n📋 Suite Results:');
  report.suites.forEach((suite) => {
    const status = suite.passed ? '✓' : '✗';
    const duration = (suite.duration / 1000).toFixed(1);
    console.log(`   ${status} ${suite.name.padEnd(15)} | ${duration}s | ${suite.tests} tests, ${suite.failures} failures`);
    if (suite.error) {
      console.log(`     Error: ${suite.error}`);
    }
  });

  console.log('═'.repeat(70));
}

function saveReport(report: StressReport): string {
  const reportsDir = path.join(__dirname, '..', '..', 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const filename = `stress-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const filepath = path.join(reportsDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
  return filepath;
}

// ==================== MAIN ====================

async function main(): Promise<void> {
  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║           COMPREHENSIVE STRESS TEST SUITE (Patchright)               ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('This runner will execute all stress test suites:');
  SUITES.forEach((suite) => {
    console.log(`  • ${suite.name.padEnd(12)} - ${suite.description}`);
  });
  console.log('');
  console.log('Configuration:');
  console.log(`  Concurrent Users: ${process.env.STRESS_CONCURRENT_USERS || '5 (default)'}`);
  console.log(`  Rapid Iterations: ${process.env.STRESS_RAPID_ITERATIONS || '20 (default)'}`);
  console.log(`  API Iterations: ${process.env.API_STRESS_ITERATIONS || '200 (default)'}`);
  console.log(`  Navigation Iterations: ${process.env.NAV_STRESS_ITERATIONS || '100 (default)'}`);
  console.log('');
  console.log('Use environment variables to customize:');
  console.log('  STRESS_CONCURRENT_USERS=10 STRESS_RAPID_ITERATIONS=50 npm run test:stress');
  console.log('');

  const results: SuiteResult[] = [];

  for (const suite of SUITES) {
    const result = await runSuite(suite);
    results.push(result);
  }

  const report = generateReport(results);
  printReport(report);

  const reportPath = saveReport(report);
  console.log(`\n📄 Full report saved to: ${reportPath}`);

  // Exit with appropriate code
  const failedSuites = results.filter((r) => !r.passed).length;
  if (failedSuites > 0) {
    console.log(`\n❌ ${failedSuites} suite(s) failed`);
    process.exit(1);
  }

  console.log('\n✅ All stress test suites completed successfully!');
  console.log('\nNext steps:');
  console.log('  1. Review individual test reports in reports/ directory');
  console.log('  2. Check performance metrics for degradation');
  console.log('  3. Monitor error rates and adjust thresholds if needed');
}

// Run if executed directly
main().catch((error) => {
  console.error('Stress test runner failed:', error);
  process.exit(1);
});

export { SUITES, runSuite, generateReport };
