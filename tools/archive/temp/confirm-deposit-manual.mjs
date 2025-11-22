#!/usr/bin/env node

/**
 * Manual Deposit Confirmation Script
 *
 * Uses Supabase service role to manually confirm a pending deposit
 * when the MercadoPago webhook failed to process.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://obxvffplochgeiclibng.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDU1MzIzMiwiZXhwIjoyMDc2MTI5MjMyfQ.U9RM7cbT3f5NSRy21Ig02f6VvMEzO2PjFI7pbTg2crc';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const TRANSACTION_ID = 'de0d1150-f237-4f42-95ef-1333cd9db21f';
const PAYMENT_ID = '130624829514';

const paymentMetadata = {
  id: '130624829514',
  status: 'approved',
  status_detail: 'accredited',
  payment_type_id: 'account_money',
  transaction_amount: 250.00,
  net_amount: 239.75,
  date_approved: '2025-10-20T11:33:00.000Z',
  external_reference: 'de0d1150-f237-4f42-95ef-1333cd9db21f',
  payer: {
    email: 'reinamosquera2003@gmail.com',
    first_name: 'Reina Shakira',
    last_name: 'Mosquera Borja'
  }
};

console.log('═══════════════════════════════════════════════════════');
console.log('       MANUAL DEPOSIT CONFIRMATION');
console.log('═══════════════════════════════════════════════════════');
console.log('');
console.log(`Transaction ID: ${TRANSACTION_ID}`);
console.log(`Payment ID: ${PAYMENT_ID}`);
console.log(`Amount: $${paymentMetadata.transaction_amount}`);
console.log('');

try {
  console.log('Calling wallet_confirm_deposit...');

  const { data, error } = await supabase.rpc('wallet_confirm_deposit', {
    p_transaction_id: TRANSACTION_ID,
    p_provider_transaction_id: PAYMENT_ID,
    p_provider_metadata: paymentMetadata
  });

  if (error) {
    console.error('');
    console.error('❌ ERROR confirming deposit:');
    console.error(JSON.stringify(error, null, 2));
    process.exit(1);
  }

  console.log('');
  console.log('✅ DEPOSIT CONFIRMED SUCCESSFULLY!');
  console.log('');
  console.log('Result:', JSON.stringify(data, null, 2));
  console.log('');

  // Verify transaction status
  console.log('Verifying transaction...');
  const { data: txData, error: txError } = await supabase
    .from('wallet_transactions')
    .select('id, amount, status, is_withdrawable, completed_at')
    .eq('id', TRANSACTION_ID)
    .single();

  if (txError) {
    console.error('Error fetching transaction:', txError);
  } else {
    console.log('');
    console.log('Transaction verified:');
    console.log(`  Status: ${txData.status}`);
    console.log(`  Amount: $${txData.amount}`);
    console.log(`  Withdrawable: ${txData.is_withdrawable}`);
    console.log(`  Completed at: ${txData.completed_at}`);
  }

  // Get user balance
  console.log('');
  console.log('Getting user balance...');
  const { data: userData, error: userError } = await supabase
    .from('wallet_transactions')
    .select('user_id')
    .eq('id', TRANSACTION_ID)
    .single();

  if (!userError && userData) {
    const { data: balanceData, error: balanceError } = await supabase
      .rpc('wallet_get_balance', { p_user_id: userData.user_id });

    if (!balanceError) {
      console.log('');
      console.log('User wallet balance:');
      console.log(`  Available: $${balanceData.available_balance}`);
      console.log(`  Locked: $${balanceData.locked_balance}`);
      console.log(`  Total: $${balanceData.total_balance}`);
      console.log(`  Non-withdrawable floor: $${balanceData.non_withdrawable_floor}`);
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ OPERATION COMPLETED SUCCESSFULLY');
  console.log('═══════════════════════════════════════════════════════');

} catch (err) {
  console.error('');
  console.error('❌ UNEXPECTED ERROR:');
  console.error(err);
  process.exit(1);
}
