#!/usr/bin/env node

/**
 * Script para testing de webhooks de wallet
 *
 * Permite:
 * - Simular webhooks de MercadoPago
 * - Confirmar depósitos pendientes manualmente
 * - Verificar estado de transacciones
 *
 * Uso:
 *   node tools/test-wallet-webhook.mjs <transaction-id> [status]
 *
 * Ejemplos:
 *   node tools/test-wallet-webhook.mjs abc-123 approved
 *   node tools/test-wallet-webhook.mjs abc-123 rejected
 *   node tools/test-wallet-webhook.mjs abc-123 pending
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI colors para consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
};

function log(message, color = '') {
  console.log(`${color}${message}${colors.reset}`);
}

function loadEnv() {
  try {
    const envPath = join(__dirname, '../apps/web/.env.development.local');
    const envContent = readFileSync(envPath, 'utf-8');

    const env = {};
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^['"]|['"]$/g, '');
        env[key] = value;
      }
    });

    return env;
  } catch (error) {
    log('⚠️  No se pudo cargar .env.development.local', colors.yellow);
    return {};
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printHelp();
    process.exit(0);
  }

  const env = loadEnv();

  const supabaseUrl = env.NG_APP_SUPABASE_URL || process.env.NG_APP_SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    log('❌ Error: Variables de entorno no configuradas', colors.red);
    log('   Configura NG_APP_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY', colors.dim);
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const command = args[0];

  if (command === 'list') {
    await listPendingDeposits(supabase);
  } else if (command === 'confirm') {
    const transactionId = args[1];
    const mpTransactionId = args[2] || `mp-${Date.now()}`;
    await confirmDeposit(supabase, transactionId, mpTransactionId);
  } else if (command === 'reject') {
    const transactionId = args[1];
    await rejectDeposit(supabase, transactionId);
  } else if (command === 'status') {
    const transactionId = args[1];
    await checkStatus(supabase, transactionId);
  } else {
    log(`❌ Comando desconocido: ${command}`, colors.red);
    printHelp();
    process.exit(1);
  }
}

function printHelp() {
  log('\n' + '='.repeat(60), colors.cyan);
  log('  WALLET WEBHOOK TESTING TOOL', colors.bright + colors.cyan);
  log('='.repeat(60) + '\n', colors.cyan);

  log('Uso:', colors.bright);
  log('  node tools/test-wallet-webhook.mjs <comando> [argumentos]\n');

  log('Comandos:', colors.bright);
  log('  list                     Lista todos los depósitos pendientes');
  log('  confirm <txid> [mpid]    Confirma un depósito pendiente');
  log('  reject <txid>            Rechaza un depósito pendiente');
  log('  status <txid>            Ver estado de una transacción\n');

  log('Ejemplos:', colors.bright);
  log('  # Listar depósitos pendientes', colors.dim);
  log('  node tools/test-wallet-webhook.mjs list\n');

  log('  # Confirmar depósito', colors.dim);
  log('  node tools/test-wallet-webhook.mjs confirm abc-123-def mp-987654\n');

  log('  # Rechazar depósito', colors.dim);
  log('  node tools/test-wallet-webhook.mjs reject abc-123-def\n');

  log('  # Ver estado de transacción', colors.dim);
  log('  node tools/test-wallet-webhook.mjs status abc-123-def\n');
}

async function listPendingDeposits(supabase) {
  log('\n📋 Listando depósitos pendientes...\n', colors.cyan);

  const { data, error } = await supabase
    .from('wallet_transactions')
    .select('*')
    .eq('type', 'deposit')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    log(`❌ Error: ${error.message}`, colors.red);
    return;
  }

  if (!data || data.length === 0) {
    log('✅ No hay depósitos pendientes', colors.green);
    return;
  }

  log(`Encontrados ${data.length} depósito(s) pendiente(s):\n`, colors.yellow);

  data.forEach((tx, index) => {
    log(`${index + 1}. Transaction ID: ${colors.bright}${tx.id}${colors.reset}`);
    log(`   Usuario: ${tx.user_id}`);
    log(`   Monto: $${tx.amount} ${tx.currency || 'USD'}`);
    log(`   Provider: ${tx.provider || 'N/A'}`);
    log(`   Creado: ${new Date(tx.created_at).toLocaleString()}`);
    log(`   Descripción: ${tx.description || 'N/A'}\n`);
  });

  log('\n💡 Para confirmar un depósito:', colors.cyan);
  log(`   node tools/test-wallet-webhook.mjs confirm ${data[0].id}\n`, colors.dim);
}

async function confirmDeposit(supabase, transactionId, mpTransactionId) {
  if (!transactionId) {
    log('❌ Error: Transaction ID requerido', colors.red);
    log('   Uso: node tools/test-wallet-webhook.mjs confirm <transaction-id> [mp-id]', colors.dim);
    return;
  }

  log('\n✅ Confirmando depósito...\n', colors.green);
  log(`Transaction ID: ${transactionId}`, colors.dim);
  log(`MP Transaction ID: ${mpTransactionId}\n`, colors.dim);

  const { data, error } = await supabase.rpc('wallet_confirm_deposit', {
    p_transaction_id: transactionId,
    p_provider_transaction_id: mpTransactionId,
    p_provider_status: 'approved'
  });

  if (error) {
    log(`❌ Error al confirmar depósito: ${error.message}`, colors.red);
    log(`   Detalles: ${error.details || 'N/A'}`, colors.dim);
    log(`   Hint: ${error.hint || 'N/A'}\n`, colors.dim);
    return;
  }

  if (!data || data.length === 0) {
    log('⚠️  La RPC no retornó datos', colors.yellow);
    return;
  }

  const result = data[0];

  if (result.success) {
    log('🎉 ¡Depósito confirmado exitosamente!\n', colors.bright + colors.green);
    log(`Transaction ID: ${result.transaction_id}`);
    log(`Nuevo Balance: $${result.new_balance} USD`);
    log(`Mensaje: ${result.message}\n`);
  } else {
    log(`❌ Error: ${result.message}`, colors.red);
  }
}

async function rejectDeposit(supabase, transactionId) {
  if (!transactionId) {
    log('❌ Error: Transaction ID requerido', colors.red);
    return;
  }

  log('\n❌ Rechazando depósito...\n', colors.red);

  const { error } = await supabase
    .from('wallet_transactions')
    .update({
      status: 'failed',
      completed_at: new Date().toISOString()
    })
    .eq('id', transactionId)
    .eq('status', 'pending');

  if (error) {
    log(`❌ Error al rechazar depósito: ${error.message}`, colors.red);
    return;
  }

  log('✅ Depósito marcado como fallido\n', colors.green);
}

async function checkStatus(supabase, transactionId) {
  if (!transactionId) {
    log('❌ Error: Transaction ID requerido', colors.red);
    return;
  }

  log('\n🔍 Verificando estado de transacción...\n', colors.cyan);

  const { data, error } = await supabase
    .from('wallet_transactions')
    .select('*')
    .eq('id', transactionId)
    .single();

  if (error) {
    log(`❌ Error: ${error.message}`, colors.red);
    return;
  }

  if (!data) {
    log('⚠️  Transacción no encontrada', colors.yellow);
    return;
  }

  const statusColors = {
    pending: colors.yellow,
    completed: colors.green,
    failed: colors.red,
    refunded: colors.cyan,
  };

  const statusColor = statusColors[data.status] || colors.reset;

  log('Información de Transacción:', colors.bright);
  log(`ID: ${data.id}`);
  log(`Tipo: ${data.type}`);
  log(`Estado: ${statusColor}${data.status.toUpperCase()}${colors.reset}`);
  log(`Monto: $${data.amount} ${data.currency || 'USD'}`);
  log(`Usuario: ${data.user_id}`);
  log(`Provider: ${data.provider || 'N/A'}`);
  log(`Provider TX ID: ${data.provider_transaction_id || 'N/A'}`);
  log(`Descripción: ${data.description || 'N/A'}`);
  log(`Creado: ${new Date(data.created_at).toLocaleString()}`);
  log(`Completado: ${data.completed_at ? new Date(data.completed_at).toLocaleString() : 'Pendiente'}\n`);

  if (data.status === 'pending') {
    log('💡 Para confirmar este depósito:', colors.cyan);
    log(`   node tools/test-wallet-webhook.mjs confirm ${data.id}\n`, colors.dim);
  }
}

main().catch(error => {
  log(`\n❌ Error fatal: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});
