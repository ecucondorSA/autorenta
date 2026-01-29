-- Enable Realtime for wallet_transactions table
-- This allows clients to subscribe to INSERT and UPDATE events in real-time
--
-- Use case: Show toast notifications when deposits are confirmed
-- without requiring polling or manual refresh

-- Enable realtime for wallet_transactions
ALTER PUBLICATION supabase_realtime ADD TABLE wallet_transactions;

-- Verify publication (for debugging)
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
