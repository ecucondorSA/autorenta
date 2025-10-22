/**
 * Fix wallet_transactions table to support withdrawals
 * - Add 'ARS' currency support
 * - Add 'withdrawal' transaction type
 * - Change default currency to ARS
 */

-- 1. Drop existing constraints
ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_currency_check;
ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;

-- 2. Add new constraints with ARS and withdrawal support
ALTER TABLE wallet_transactions
ADD CONSTRAINT wallet_transactions_currency_check
CHECK (currency IN ('USD', 'UYU', 'ARS'));

ALTER TABLE wallet_transactions
ADD CONSTRAINT wallet_transactions_type_check
CHECK (type IN (
  'deposit',
  'lock',
  'unlock',
  'charge',
  'refund',
  'bonus',
  'withdrawal',
  'rental_payment_lock',
  'rental_payment_transfer',
  'security_deposit_lock',
  'security_deposit_release',
  'security_deposit_charge'
));

-- 3. Change default currency to ARS
ALTER TABLE wallet_transactions
ALTER COLUMN currency SET DEFAULT 'ARS';

COMMENT ON TABLE wallet_transactions IS 'Wallet transactions - Updated to support ARS currency and withdrawal type';
