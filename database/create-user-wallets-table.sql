/**
 * Create user_wallets table
 * Stores the balance for each user
 */

CREATE TABLE IF NOT EXISTS user_wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  available_balance NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (available_balance >= 0),
  locked_balance NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (locked_balance >= 0),
  currency TEXT NOT NULL DEFAULT 'ARS',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON user_wallets(user_id);

COMMENT ON TABLE user_wallets IS 'Wallet balance for each user';

-- RLS Policies
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet"
ON user_wallets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallet"
ON user_wallets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wallet"
ON user_wallets FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_user_wallets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_wallets_updated_at
BEFORE UPDATE ON user_wallets
FOR EACH ROW
EXECUTE FUNCTION update_user_wallets_updated_at();
