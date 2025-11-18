#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get lint output
const lintOutput = execSync('npm run lint 2>&1', { encoding: 'utf-8' });

// Parse lint output for file paths and issues
const issues = new Map();

const lines = lintOutput.split('\n');
let currentFile = null;

for (const line of lines) {
  // Match file path lines
  if (line.startsWith('/home/edu/autorenta/apps/web/src/')) {
    currentFile = line.trim();
    if (!issues.has(currentFile)) {
      issues.set(currentFile, []);
    }
  }
  // Match error/warning lines
  else if (currentFile && /^\s+\d+:\d+/.test(line)) {
    const match = line.match(/(\d+):(\d+)\s+(warning|error)\s+(.+?)\s+([@\w/-]+)$/);
    if (match) {
      const [, lineNum, col, type, message, rule] = match;
      issues.get(currentFile).push({
        line: parseInt(lineNum),
        col: parseInt(col),
        type,
        message,
        rule
      });
    }
  }
}

console.log(`Found ${issues.size} files with issues`);

let fixedCount = 0;
let totalIssues = 0;

// Fix each file
for (const [filePath, fileIssues] of issues) {
  if (!fs.existsSync(filePath)) continue;

  totalIssues += fileIssues.length;
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;

  // Fix unused error variables
  const errorMatches = [...content.matchAll(/catch\s*\(\s*error\s*\)/g)];
  if (errorMatches.length > 0) {
    content = content.replace(/catch\s*\(\s*error\s*\)/g, 'catch (_error)');
    modified = true;
    fixedCount += errorMatches.length;
  }

  // Fix unused err variables
  const errMatches = [...content.matchAll(/catch\s*\(\s*err\s*\)/g)];
  if (errMatches.length > 0) {
    content = content.replace(/catch\s*\(\s*err\s*\)/g, 'catch (_err)');
    modified = true;
    fixedCount += errMatches.length;
  }

  // Fix unused e variables
  const eMatches = [...content.matchAll(/catch\s*\(\s*e\s*\)\s*{[^}]*\/\/[^}]*}/g)];
  if (eMatches.length > 0) {
    content = content.replace(/catch\s*\(\s*e\s*\)/g, 'catch (_e)');
    modified = true;
    fixedCount += eMatches.length;
  }

  // Fix : any to : unknown (simple cases)
  const anyMatches = [...content.matchAll(/:\s*any(?=[,;\)\]])/g)];
  if (anyMatches.length > 0 && !filePath.includes('test')) {
    content = content.replace(/:\s*any(?=[,;\)\]])/g, ': unknown');
    modified = true;
    fixedCount += anyMatches.length;
  }

  // Fix {} to object (in type positions)
  const emptyObjMatches = [...content.matchAll(/:\s*{}\s*(?=[,;\)\]])/g)];
  if (emptyObjMatches.length > 0) {
    content = content.replace(/:\s*{}\s*(?=[,;\)\]])/g, ': object');
    modified = true;
    fixedCount += emptyObjMatches.length;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Fixed ${filePath}`);
  }
}

console.log(`\nFixed ${fixedCount} issues across ${issues.size} files`);
console.log(`Total issues found: ${totalIssues}`);
