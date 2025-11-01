
BEGIN;
SELECT plan(8);

-- Tablas/columnas mínimas
SELECT has_table('public','bookings','bookings existe');
SELECT has_table('public','wallet_ledger','wallet_ledger existe');
SELECT has_column('public','bookings','status','status existe');

-- Enum status esperado
SELECT col_type_is('public','bookings','status','booking_status','status es enum booking_status');

-- Relación ledger ↔ booking (pago confirmado crea asiento)
SELECT ok(
  (SELECT COUNT(*) FROM wallet_ledger wl
    JOIN bookings b ON wl.booking_id = b.id
    WHERE b.status = 'confirmed') >= 1,
  'Hay asientos vinculados a bookings confirmados'
);

-- Doble partida: sum(debit)=sum(credit) en asientos por booking
SELECT results_eq(
  $$ SELECT SUM(debit_cents) - SUM(credit_cents) FROM wallet_ledger $$,
  $$ VALUES (0) $$,
  'Doble partida balanceada'
);

-- Vista de historial expone booking_id
SELECT has_column('public','v_wallet_history','booking_id','v_wallet_history.booking_id existe');

-- No hay columnas ajenas inesperadas (ej.: full_name) en messages (del chat del post-checkout)
SELECT hasnt_column('public','messages','full_name','messages no tiene full_name');

SELECT * FROM finish();
ROLLBACK;
