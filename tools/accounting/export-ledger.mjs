#!/usr/bin/env node

/**
 * AutoRenta - Exportador de Ledger Contable
 *
 * Genera reportes CSV y JSON del libro mayor, balance general
 * e indicadores clave directamente desde las vistas contables
 * de Supabase. Pensado para conciliaciones NIIF y auditorías.
 *
 * Uso:
 *   node tools/accounting/export-ledger.mjs --start=2025-01-01 --end=2025-01-31
 *
 * Requiere variables de entorno:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (recomendado) o SUPABASE_SERVICE_KEY
 */

import { mkdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};

  for (const arg of args) {
    const [key, value] = arg.split('=');
    if (!key.startsWith('--')) continue;
    parsed[key.substring(2)] = value ?? true;
  }

  return parsed;
}

function getEnvConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_KEY ??
    process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error(
      '❌ Faltan credenciales Supabase. Configurá SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.'
    );
    process.exit(1);
  }

  return { url, key };
}

function normaliseDateInput(input, fallback) {
  if (!input) return fallback;
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    console.warn(`⚠️ Fecha inválida "${input}". Se usará ${fallback.toISOString().slice(0, 10)}.`);
    return fallback;
  }
  return date;
}

function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((key) => {
          const value = row[key];
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') {
            return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          }
          const text = String(value);
          return text.includes(',') ? `"${text.replace(/"/g, '""')}"` : text;
        })
        .join(',')
    ),
  ];
  return lines.join('\n');
}

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function formatCurrency(value) {
  return (value / 100).toFixed(2);
}

function formatDate(date, pattern) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  switch (pattern) {
    case 'yyyy-MM':
      return `${year}-${month}`;
    case 'yyyyMMdd':
      return `${year}${month}${day}`;
    case 'yyyy-MM-dd':
    default:
      return `${year}-${month}-${day}`;
  }
}

// -----------------------------------------------------------------------------
// Main process
// -----------------------------------------------------------------------------

async function main() {
  const args = parseArgs();
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const startDate = normaliseDateInput(args.start, startOfMonth);
  const endDate = normaliseDateInput(args.end, today);
  const periodLabel = args.period ?? formatDate(startDate, 'yyyy-MM');

  const outputDir = resolve(
    __dirname,
    '../../reports/accounting',
    `${periodLabel}-${formatDate(endDate, 'yyyyMMdd')}`
  );
  ensureDir(outputDir);

  const { url, key } = getEnvConfig();
  const supabase = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('📦 Generando exportación contable...');
  console.log(`   Período: ${startDate.toISOString().slice(0, 10)} → ${endDate.toISOString().slice(0, 10)}`);
  console.log(`   Directorio: ${outputDir}`);

  // ---------------------------------------------------------------------------
  // 1. Ledger detallado
  // ---------------------------------------------------------------------------
  const ledgerQuery = supabase
    .from('accounting_ledger')
    .select(
      `
        entry_number,
        entry_date,
        transaction_type,
        reference_id,
        reference_table,
        description,
        account_code,
        account_name,
        account_type,
        debit_cents,
        credit_cents,
        currency,
        meta
      `
    )
    .gte('entry_date', formatDate(startDate, 'yyyy-MM-dd'))
    .lte('entry_date', formatDate(endDate, 'yyyy-MM-dd'))
    .order('entry_date', { ascending: true })
    .order('entry_number', { ascending: true });

  const { data: ledgerRows, error: ledgerError } = await ledgerQuery;

  if (ledgerError) {
    console.error('❌ Error al consultar accounting_ledger:', ledgerError);
    process.exit(1);
  }

  const ledgerCsvPath = resolve(outputDir, `ledger_${periodLabel}.csv`);
  writeFileSync(ledgerCsvPath, toCsv(ledgerRows ?? []), 'utf8');

  // ---------------------------------------------------------------------------
  // 2. Balance general e ingreso
  // ---------------------------------------------------------------------------
  const [{ data: balanceSheet, error: balanceError }, { data: incomeStatement, error: incomeError }] =
    await Promise.all([
      supabase
        .from('accounting_balance_sheet')
        .select('*')
        .order('code'),
      supabase
        .from('accounting_income_statement')
        .select('*')
        .order('period', { ascending: false })
        .order('code'),
    ]);

  if (balanceError) {
    console.error('❌ Error al consultar accounting_balance_sheet:', balanceError);
    process.exit(1);
  }

  if (incomeError) {
    console.error('❌ Error al consultar accounting_income_statement:', incomeError);
    process.exit(1);
  }

  const balanceCsvPath = resolve(outputDir, `balance_sheet_${periodLabel}.csv`);
  writeFileSync(balanceCsvPath, toCsv(balanceSheet ?? []), 'utf8');

  const incomeCsvPath = resolve(outputDir, `income_statement_${periodLabel}.csv`);
  writeFileSync(incomeCsvPath, toCsv(incomeStatement ?? []), 'utf8');

  // ---------------------------------------------------------------------------
  // 3. Métricas de conciliación
  // ---------------------------------------------------------------------------
  const { data: reconciliation, error: reconciliationError } = await supabase
    .from('accounting_wallet_reconciliation')
    .select('*');

  if (reconciliationError) {
    console.error('❌ Error al consultar accounting_wallet_reconciliation:', reconciliationError);
    process.exit(1);
  }

  // ---------------------------------------------------------------------------
  // 4. Resumen JSON
  // ---------------------------------------------------------------------------
  const totalDebit = (ledgerRows ?? []).reduce((acc, row) => acc + (row.debit_cents ?? 0), 0);
  const totalCredit = (ledgerRows ?? []).reduce((acc, row) => acc + (row.credit_cents ?? 0), 0);

  const summary = {
    period: periodLabel,
    range: {
      start: format(startDate, 'yyyy-MM-dd'),
      end: format(endDate, 'yyyy-MM-dd'),
    },
    ledger: {
      entries: ledgerRows?.length ?? 0,
      totalDebitCents: totalDebit,
      totalCreditCents: totalCredit,
      balanced: totalDebit === totalCredit,
    },
    balanceSheet: {
      rows: balanceSheet?.length ?? 0,
    },
    incomeStatement: {
      rows: incomeStatement?.length ?? 0,
    },
    reconciliation,
    generatedAt: new Date().toISOString(),
  };

  const summaryPath = resolve(outputDir, `summary_${periodLabel}.json`);
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');

  console.log('✅ Exportación contable generada con éxito.');
  console.log(`   Ledger: ${ledgerCsvPath}`);
  console.log(`   Balance: ${balanceCsvPath}`);
  console.log(`   Resultado: ${incomeCsvPath}`);
  console.log(`   Resumen: ${summaryPath}`);
  console.log(
    `   Balance débito/crédito: ${formatCurrency(totalDebit)} / ${formatCurrency(totalCredit)}`
  );
}

main().catch((err) => {
  console.error('❌ Error inesperado durante la exportación:', err);
  process.exit(1);
});

