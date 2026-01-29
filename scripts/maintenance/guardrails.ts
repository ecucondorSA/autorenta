#!/usr/bin/env npx tsx
/**
 * Guardrails - Prevents duplication/regressions in components, services, pages, types and RPCs.
 *
 * Usage:
 *   npx tsx scripts/guardrails.ts
 *   npx tsx scripts/guardrails.ts --strict
 *   npx tsx scripts/guardrails.ts --update-baseline
 */

import { globSync } from 'glob';
import * as fs from 'fs';
import * as path from 'path';

const APP_PATH = 'apps/web/src/app';
const MIGRATIONS_PATH = 'supabase/migrations';
const BASELINE_PATH = 'scripts/maintenance/guardrails.baseline.json';
const ALLOWLIST_PATH = 'scripts/maintenance/guardrails.allowlist.json';

const args = new Set(process.argv.slice(2));
const isStrict = args.has('--strict');
const updateBaseline = args.has('--update-baseline');

interface DuplicateGroup {
  key: string;
  files: string[];
}

interface Baseline {
  generatedAt: string;
  categories: Record<string, string[]>;
}

interface Allowlist {
  versionedFiles?: string[];
}

function readFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}

function normalizeSelector(selector: string): string {
  return selector
    .replace(/^app-/, '')
    .replace(/-v\d+$/, '')
    .replace(/-\d+$/, '')
    .trim();
}

function toRelative(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

function isVersionedName(name: string): boolean {
  const versionPattern = /(?:^|[-_.])v\d+(?:$|[-_.])/i;
  const copyPattern = /(?:^|[-_.])(copy|duplicate|dup|tmp|temp|draft)(?:$|[-_.])/i;
  return versionPattern.test(name) || copyPattern.test(name);
}

function groupDuplicates(items: Array<{ key: string; file: string }>): DuplicateGroup[] {
  const map = new Map<string, string[]>();
  for (const item of items) {
    if (!map.has(item.key)) map.set(item.key, []);
    map.get(item.key)!.push(item.file);
  }
  const groups: DuplicateGroup[] = [];
  for (const [key, files] of map.entries()) {
    if (files.length > 1) {
      groups.push({ key, files: [...new Set(files)] });
    }
  }
  return groups.sort((a, b) => a.key.localeCompare(b.key));
}

function collectComponents() {
  const files = globSync(`${APP_PATH}/**/*.component.ts`);
  const selectors: Array<{ key: string; file: string }> = [];
  const classes: Array<{ key: string; file: string }> = [];
  const normalized: Array<{ key: string; file: string }> = [];

  for (const file of files) {
    const content = readFile(file);
    const selectorMatch = content.match(/selector:\s*['"]([^'"]+)['"]/);
    if (selectorMatch) {
      const selector = selectorMatch[1];
      selectors.push({ key: selector, file });
      normalized.push({ key: normalizeSelector(selector), file });
    }
    const classMatch = content.match(/export\s+class\s+(\w+Component)/);
    if (classMatch) {
      classes.push({ key: classMatch[1], file });
    }
  }

  return {
    selectorDuplicates: groupDuplicates(selectors),
    classDuplicates: groupDuplicates(classes),
    normalizedDuplicates: groupDuplicates(normalized)
  };
}

function collectServices() {
  const files = globSync(`${APP_PATH}/**/*.service.ts`);
  const classes: Array<{ key: string; file: string }> = [];

  for (const file of files) {
    const content = readFile(file);
    const classMatch = content.match(/export\s+class\s+(\w+Service)/);
    if (classMatch) {
      classes.push({ key: classMatch[1], file });
    }
  }

  return {
    classDuplicates: groupDuplicates(classes)
  };
}

function collectPages() {
  const files = globSync(`${APP_PATH}/**/*.page.ts`);
  const baseNames: Array<{ key: string; file: string }> = [];

  for (const file of files) {
    const base = path.basename(file, '.page.ts')
      .replace(/-v\d+$/, '')
      .replace(/\d+$/, '')
      .toLowerCase();
    baseNames.push({ key: base, file });
  }

  return {
    baseNameDuplicates: groupDuplicates(baseNames)
  };
}

function collectTypes() {
  const files = globSync(`${APP_PATH}/**/*.ts`);
  const types: Array<{ key: string; file: string }> = [];

  for (const file of files) {
    const content = readFile(file);
    const matches = content.matchAll(/export\s+(?:interface|type)\s+(\w+)\s*[{=<]/g);
    for (const match of matches) {
      const name = match[1];
      types.push({ key: name, file });
    }
  }

  return {
    typeDuplicates: groupDuplicates(types)
  };
}

function stripMultilineComments(content: string): string {
  // Remove /* ... */ block comments (including nested)
  return content.replace(/\/\*[\s\S]*?\*\//g, '');
}

function collectRpcs() {
  const files = globSync(`${MIGRATIONS_PATH}/**/*.sql`);
  const funcs: Array<{ key: string; file: string }> = [];

  for (const file of files) {
    const content = readFile(file);
    // Strip multiline comments before searching for functions
    const cleanContent = stripMultilineComments(content);
    const matches = cleanContent.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?(\w+)\s*\(/gi);
    for (const match of matches) {
      funcs.push({ key: match[1].toLowerCase(), file });
    }
  }

  return {
    rpcDuplicates: groupDuplicates(funcs)
  };
}

function collectVersionedFiles(): string[] {
  const targets = [
    ...globSync(`${APP_PATH}/**/*.component.ts`),
    ...globSync(`${APP_PATH}/**/*.service.ts`),
    ...globSync(`${APP_PATH}/**/*.page.ts`)
  ];

  const matches: string[] = [];
  for (const file of targets) {
    const baseName = path.basename(file).replace(/\.ts$/, '');
    if (isVersionedName(baseName)) {
      matches.push(toRelative(file));
    }
  }

  return [...new Set(matches)].sort();
}

function loadBaseline(): Baseline | null {
  if (!fs.existsSync(BASELINE_PATH)) return null;
  try {
    const raw = fs.readFileSync(BASELINE_PATH, 'utf-8');
    return JSON.parse(raw) as Baseline;
  } catch {
    return null;
  }
}

function loadAllowlist(): Allowlist {
  if (!fs.existsSync(ALLOWLIST_PATH)) return {};
  try {
    const raw = fs.readFileSync(ALLOWLIST_PATH, 'utf-8');
    return JSON.parse(raw) as Allowlist;
  } catch {
    return {};
  }
}

function saveBaseline(categories: Record<string, DuplicateGroup[]>) {
  const baseline: Baseline = {
    generatedAt: new Date().toISOString(),
    categories: Object.fromEntries(
      Object.entries(categories).map(([key, groups]) => [key, groups.map(g => g.key)])
    )
  };
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2));
}

function diffKeys(current: DuplicateGroup[], baselineKeys: Set<string>): DuplicateGroup[] {
  return current.filter(group => !baselineKeys.has(group.key));
}

function printGroups(title: string, groups: DuplicateGroup[]) {
  if (groups.length === 0) return;
  console.log(`\n${title}`);
  for (const group of groups) {
    console.log(`  - ${group.key}`);
    for (const file of group.files) {
      console.log(`      ${file}`);
    }
  }
}

function main() {
  console.log('🛡️  Guardrails - Checking for duplicates and drift...');

  const components = collectComponents();
  const services = collectServices();
  const pages = collectPages();
  const types = collectTypes();
  const rpcs = collectRpcs();
  const versionedFiles = collectVersionedFiles();

  const categories: Record<string, DuplicateGroup[]> = {
    componentSelectors: components.selectorDuplicates,
    componentClasses: components.classDuplicates,
    componentNormalized: components.normalizedDuplicates,
    serviceClasses: services.classDuplicates,
    pageBaseNames: pages.baseNameDuplicates,
    typeNames: types.typeDuplicates,
    rpcFunctions: rpcs.rpcDuplicates
  };

  if (updateBaseline) {
    saveBaseline(categories);
    console.log(`✅ Baseline updated at ${BASELINE_PATH}`);
    return;
  }

  const baseline = loadBaseline();
  if (!baseline) {
    console.error(`❌ Baseline not found: ${BASELINE_PATH}`);
    console.error('   Run: npx tsx scripts/guardrails.ts --update-baseline');
    process.exit(1);
  }

  const allowlist = loadAllowlist();
  const allowedVersioned = new Set((allowlist.versionedFiles ?? []).map(toRelative));
  const versionedIssues = versionedFiles.filter(file => !allowedVersioned.has(file));

  const baselineKeys: Record<string, Set<string>> = {};
  for (const [key, list] of Object.entries(baseline.categories)) {
    baselineKeys[key] = new Set(list);
  }

  const newIssues: Record<string, DuplicateGroup[]> = {};
  for (const [key, groups] of Object.entries(categories)) {
    const keys = baselineKeys[key] ?? new Set<string>();
    newIssues[key] = diffKeys(groups, keys);
  }

  const errors: Record<string, DuplicateGroup[]> = {
    componentSelectors: newIssues.componentSelectors,
    componentClasses: newIssues.componentClasses,
    serviceClasses: newIssues.serviceClasses,
    pageBaseNames: newIssues.pageBaseNames
  };

  const warnings: Record<string, DuplicateGroup[]> = {
    componentNormalized: newIssues.componentNormalized,
    typeNames: newIssues.typeNames,
    rpcFunctions: newIssues.rpcFunctions
  };

  const errorCount = Object.values(errors).reduce((sum, groups) => sum + groups.length, 0) + (versionedIssues.length > 0 ? 1 : 0);
  const warningCount = Object.values(warnings).reduce((sum, groups) => sum + groups.length, 0);

  if (errorCount === 0 && warningCount === 0) {
    console.log('✅ Guardrails passed (no new duplicates detected).');
    return;
  }

  if (errorCount > 0) {
    console.log('\n❌ New duplicate errors detected:');
    printGroups('Component selectors', errors.componentSelectors);
    printGroups('Component classes', errors.componentClasses);
    printGroups('Service classes', errors.serviceClasses);
    printGroups('Page base names', errors.pageBaseNames);
    if (versionedIssues.length > 0) {
      console.log('\nVersioned/copy file names (not allowlisted):');
      for (const file of versionedIssues) {
        console.log(`  - ${file}`);
      }
    }
  }

  if (warningCount > 0) {
    console.log('\n⚠️  New duplicate warnings detected:');
    printGroups('Normalized component names', warnings.componentNormalized);
    printGroups('Types/interfaces', warnings.typeNames);
    printGroups('RPC functions', warnings.rpcFunctions);
  }

  if (errorCount > 0 || (isStrict && warningCount > 0)) {
    console.error(`\n❌ Guardrails failed (errors: ${errorCount}, warnings: ${warningCount}).`);
    process.exit(1);
  }

  console.log(`\n⚠️  Guardrails warnings: ${warningCount}. Run with --strict to fail on warnings.`);
}

main();
