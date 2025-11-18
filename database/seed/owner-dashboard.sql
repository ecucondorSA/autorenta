-- Seed para Owner Dashboard (owner con 2 vehículos, 3 bookings y saldo)
BEGIN;

-- Owner user
INSERT INTO users (id, email, full_name)
VALUES ('owner-dashboard-1', 'owner.dashboard@example.com', 'Owner Dashboard')
ON CONFLICT (id) DO NOTHING;

-- Vehicles
INSERT INTO cars (id, owner_id, title, plate)
VALUES
  ('car-1', 'owner-dashboard-1', 'Fiat 500', 'ABC123'),
  ('car-2', 'owner-dashboard-1', 'Toyota Corolla', 'DEF456')
ON CONFLICT (id) DO NOTHING;

-- Bookings: confirmed, pending, cancelled
INSERT INTO bookings (id, car_id, owner_id, renter_id, start_date, end_date, status, total_amount)
VALUES
  ('b1', 'car-1', 'owner-dashboard-1', 'renter-1', now() + interval '3 days', now() + interval '5 days', 'confirmed', 150.00),
  ('b2', 'car-2', 'owner-dashboard-1', 'renter-2', now() + interval '10 days', now() + interval '12 days', 'pending', 200.00),
  ('b3', 'car-1', 'owner-dashboard-1', 'renter-3', now() - interval '20 days', now() - interval '18 days', 'cancelled', 100.00)
ON CONFLICT (id) DO NOTHING;

-- Wallet transactions (simple)
INSERT INTO wallet_transactions (id, account_owner, amount, currency, type, created_at)
VALUES
  ('t1', 'owner-dashboard-1', 12760.00, 'ARS', 'credit', now()),
  ('t2', 'owner-dashboard-1', -5000.00, 'ARS', 'payout', now() - interval '5 days')
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- Nota: adapta campos a tu esquema real si difieren (nombres/constraints). Ejecutar con psql o supabase sql.
