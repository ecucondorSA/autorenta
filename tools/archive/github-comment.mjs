#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

// Usage:
// GITHUB_TOKEN must be provided via env, PR_NUMBER via env or arg
const token = process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPOSITORY; // owner/repo
const prNumber = process.argv[2] || process.env.PR_NUMBER;

if (!token) {
  console.error('GITHUB_TOKEN required');
  process.exit(2);
}
if (!repo) {
  console.error('GITHUB_REPOSITORY not found');
  process.exit(2);
}
if (!prNumber) {
  console.error('PR number required as arg or PR_NUMBER env');
  process.exit(2);
}

const summaryPath = path.resolve('test-results/summary.json');
let body = '';
if (fs.existsSync(summaryPath)) {
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
  body += `## Playwright E2E summary\n`;
  body += `- total: ${summary.total}  \n`;
  body += `- passed: ${summary.passed}  \n`;
  body += `- failed: ${summary.failed}  \n`;
  body += `- skipped: ${summary.skipped}  \n`;
  body += `\n### By project\n`;
  for (const [p, pj] of Object.entries(summary.byProject || {})) {
    body += `- **${p}** — total=${pj.total} passed=${pj.passed} failed=${pj.failed} passRate=${pj.passRate}% avgDuration=${pj.avgDurationMs}ms  \n`;
  }
  if ((summary.failures || []).length) {
    body += `\n### Failures\n`;
    for (const f of summary.failures) body += `- [${f.project}] ${f.file} :: ${f.title} — ${f.status}  \n`;
  }
  body += `\nArtifacts & HTML report available in workflow run artifacts (see Actions tab).`;
} else {
  body = 'No summary.json found in test-results/';
}

const [owner, repoName] = repo.split('/');

const url = `https://api.github.com/repos/${owner}/${repoName}/issues/${prNumber}/comments`;

const res = await fetch(url, {
  method: 'POST',
  headers: {
    Authorization: `token ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/vnd.github+json'
  },
  body: JSON.stringify({ body })
});

if (!res.ok) {
  const text = await res.text();
  console.error('Failed to post comment', res.status, text);
  process.exit(3);
}

console.log('Comment posted to PR', prNumber);
