
-- tests/database/accounting_integrity.spec.sql

BEGIN;

-- Plan the tests
SELECT plan(3);

-- 1. Test: The sum of all wallet ledger entries should be zero
SELECT is(
    (SELECT sum(case when kind like '%_payment' then amount_cents else -amount_cents end) FROM public.wallet_ledger),
    0::numeric,
    'The sum of all wallet ledger entries should be zero'
);

-- 2. Test: Foreign key from wallet_ledger to users should be valid
SELECT fk_ok(
    'public',
    'wallet_ledger',
    'user_id',
    'public',
    'users',
    'id',
    'Foreign key from wallet_ledger to users should be valid'
);

-- 3. Test: The v_wallet_history view should not be empty
SELECT is_not_empty(
    'SELECT * FROM public.v_wallet_history',
    'The v_wallet_history view should not be empty'
);


SELECT * FROM finish();

ROLLBACK;
