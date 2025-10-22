#!/bin/bash

# =========================================
# MERCADOPAGO DEPOSIT INVESTIGATION SCRIPT
# =========================================

PAYMENT_ID="130624829514"
TRANSACTION_ID="${1:-}" # Pasar como argumento si se conoce

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     INVESTIGATING MERCADOPAGO DEPOSIT ISSUE               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Payment ID: $PAYMENT_ID"
echo "Transaction ID: ${TRANSACTION_ID:-NOT PROVIDED}"
echo "Timestamp: 2025-10-20 14:33 UTC"
echo ""

# Database connection
DB_URL="postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  SEARCHING FOR TRANSACTION BY PAYMENT ID"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

PGPASSWORD="ECUCONDOR08122023" psql "$DB_URL" -c "
SELECT
  id,
  user_id,
  type,
  amount,
  status,
  is_withdrawable,
  provider_transaction_id,
  created_at,
  completed_at,
  provider_metadata->>'status' as mp_status,
  provider_metadata->>'status_detail' as mp_status_detail
FROM wallet_transactions
WHERE provider_transaction_id = '$PAYMENT_ID'
   OR provider_metadata->>'id' = '$PAYMENT_ID'
ORDER BY created_at DESC
LIMIT 5;
"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  RECENT PENDING DEPOSITS (Last 24 hours)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

PGPASSWORD="ECUCONDOR08122023" psql "$DB_URL" -c "
SELECT
  id,
  user_id,
  type,
  amount,
  status,
  is_withdrawable,
  provider_transaction_id,
  created_at,
  provider_metadata->>'status' as mp_status
FROM wallet_transactions
WHERE type = 'deposit'
  AND status = 'pending'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 10;
"

if [ -n "$TRANSACTION_ID" ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "3️⃣  TRANSACTION DETAILS: $TRANSACTION_ID"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  PGPASSWORD="ECUCONDOR08122023" psql "$DB_URL" -c "
  SELECT
    id,
    user_id,
    type,
    amount,
    status,
    is_withdrawable,
    provider_transaction_id,
    created_at,
    completed_at,
    provider_metadata
  FROM wallet_transactions
  WHERE id = '$TRANSACTION_ID'::uuid;
  "

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "4️⃣  USER WALLET BALANCE"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Get user_id from transaction
  USER_ID=$(PGPASSWORD="ECUCONDOR08122023" psql "$DB_URL" -t -c "
    SELECT user_id FROM wallet_transactions WHERE id = '$TRANSACTION_ID'::uuid;
  " | xargs)

  if [ -n "$USER_ID" ]; then
    echo "User ID: $USER_ID"

    PGPASSWORD="ECUCONDOR08122023" psql "$DB_URL" -c "
    SELECT
      user_id,
      available_balance,
      locked_balance,
      (available_balance + locked_balance) as total_balance,
      non_withdrawable_floor,
      updated_at
    FROM user_wallets
    WHERE user_id = '$USER_ID'::uuid;
    "

    echo ""
    echo "Using wallet_get_balance function:"
    PGPASSWORD="ECUCONDOR08122023" psql "$DB_URL" -c "
    SELECT * FROM wallet_get_balance('$USER_ID'::uuid);
    "
  fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  MERCADOPAGO API CHECK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

MP_TOKEN="APP_USR-4340262352975191-101722-3fc884850841f34c6f83bd4e29b3134c-2302679571"

echo "Fetching payment $PAYMENT_ID from MercadoPago API..."
curl -s -X GET \
  "https://api.mercadopago.com/v1/payments/$PAYMENT_ID" \
  -H "Authorization: Bearer $MP_TOKEN" | python3 -m json.tool

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ INVESTIGATION COMPLETE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "1. Check if payment status is 'approved' in MercadoPago"
echo "2. If approved and transaction is pending, reinject webhook manually"
echo "3. If transaction needs to be withdrawable, run convert function"
echo ""
