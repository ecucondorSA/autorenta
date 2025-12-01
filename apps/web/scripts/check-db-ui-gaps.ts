#!/usr/bin/env node
/**
 * Quick checker to find Supabase tables that have no string literal references in the web app code.
 *
 * How it works:
 * 1. Parses apps/web/src/types/supabase.types.ts to collect table names.
 * 2. For each table, runs `rg` over apps/web/src looking for `'table_name'` or "table_name".
 * 3. Prints a summary and the list of tables with zero hits (UI gaps).
 *
 * Note: This is heuristic. A table might be used via variables/consts or the PostgREST RPC layer
 * without a literal name in code. Use the list as a starting point for manual review.
 */

import { readFileSync } from 'fs';
import { spawnSync } from 'child_process';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '..');
const SUPABASE_TYPES = resolve(ROOT, 'apps/web/src/types/supabase.types.ts');
const CODE_GLOB = 'apps/web/src/**';

function fail(msg: string): never {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

function collectTables(): string[] {
  const file = readFileSync(SUPABASE_TYPES, 'utf8');
  const tablesPart = file.split('Tables:')[1];
  if (!tablesPart) fail('Could not find "Tables:" section in supabase.types.ts');

  const names = [...tablesPart.matchAll(/\n\s*([a-zA-Z0-9_]+):\s*{\s*Row:/g)].map((m) => m[1]);
  if (!names.length) fail('No tables parsed from supabase.types.ts');
  return names;
}

function hasLiteralUsage(table: string): boolean {
  const pattern = `['\\"]${table}['\\"]`;
  const res = spawnSync('rg', ['--no-heading', '--hidden', '--glob', CODE_GLOB, '-e', pattern, '.'], {
    encoding: 'utf8',
  });
  // rg returns 1 on no matches, 0 on matches
  return res.status === 0 && (res.stdout?.trim().length ?? 0) > 0;
}

function main() {
  const tables = collectTables();
  const unused: string[] = [];

  for (const table of tables) {
    if (!hasLiteralUsage(table)) unused.push(table);
  }

  console.log(`Total tables: ${tables.length}`);
  console.log(`Without literal hits in ${CODE_GLOB}: ${unused.length}`);
  console.log(unused.sort().join(', '));
}

main();

