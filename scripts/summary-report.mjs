#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

// Usage: node scripts/summary-report.mjs [path/to/results.json]
const inFile = process.argv[2] || path.resolve('test-results/results.json');
if (!fs.existsSync(inFile)) {
  console.error('results.json not found at', inFile);
  process.exit(2);
}

const raw = JSON.parse(fs.readFileSync(inFile, 'utf-8'));

const stats = raw.stats || {};
const suites = raw.suites || [];

const summary = {
  startTime: stats.startTime || null,
  durationMs: stats.duration || null,
  total: stats.expected || 0,
  passed: 0,
  failed: 0,
  skipped: stats.skipped || 0,
  unexpected: stats.unexpected || 0,
  flaky: stats.flaky || 0,
  failures: [],
  slowTests: [],
  byProject: {}
};

// Aggregate per project
for (const suite of suites) {
  for (const spec of suite.specs || []) {
    for (const t of spec.tests || []) {
      for (const r of (t.results || [])) {
        const proj = r.projectName || r.projectId || 'unknown';
        if (!summary.byProject[proj]) summary.byProject[proj] = { total: 0, passed: 0, failed: 0, skipped: 0, durations: [] };
        const pj = summary.byProject[proj];
        pj.total += 1;
        if (r.status === 'passed') { pj.passed += 1; summary.passed += 1; }
        else if (r.status === 'skipped') { pj.skipped += 1; }
        else { pj.failed += 1; summary.failed += 1; summary.failures.push({ project: proj, file: suite.file, title: spec.title, status: r.status, durationMs: r.duration, errors: r.errors || [] }); }
        if (r.duration) { pj.durations.push(r.duration); summary.slowTests.push({ project: proj, file: suite.file, title: spec.title, durationMs: r.duration }); }
      }
    }
  }
}

// Compute percentages and averages
for (const [proj, pj] of Object.entries(summary.byProject)) {
  pj.passRate = pj.total ? Math.round((pj.passed / pj.total) * 10000) / 100 : 0;
  pj.avgDurationMs = pj.durations.length ? Math.round((pj.durations.reduce((a,b) => a+b,0) / pj.durations.length)) : 0;
}

summary.slowTests.sort((a,b) => (b.durationMs||0)-(a.durationMs||0));
summary.slowTests = summary.slowTests.slice(0,10);

const outFile = path.resolve('test-results/summary.json');
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(summary, null, 2), 'utf-8');

// Print a human readable summary
console.log('Playwright summary:');
console.log(`  total: ${summary.total}, passed: ${summary.passed}, failed: ${summary.failed}, skipped: ${summary.skipped}`);

if (Object.keys(summary.byProject).length) {
  console.log('\nBy project:');
  for (const [p, pj] of Object.entries(summary.byProject)) {
    console.log(` - ${p}: total=${pj.total} passed=${pj.passed} failed=${pj.failed} passRate=${pj.passRate}% avgDuration=${pj.avgDurationMs}ms`);
  }
}

if (summary.failed > 0) {
  console.log('\nFailures:');
  for (const f of summary.failures) console.log(` - [${f.project}] ${f.file} :: ${f.title} (${f.status}) ${f.errors.length ? '- errors: ' + f.errors.length : ''}`);
}

if (summary.slowTests.length) {
  console.log('\nTop slow tests:');
  for (const s of summary.slowTests) console.log(` - [${s.project}] ${s.file} :: ${s.title} -> ${s.durationMs}ms`);
}

console.log('\nHTML report (local):', path.resolve('test-results/html-report/index.html'));
  console.log('\nWrote', outFile);
