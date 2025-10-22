-- ============================================================================
-- MIGRATION 004: Wallet Account Numbers (WAN)
-- ============================================================================
-- Purpose: Add unique account numbers to user wallets for transfers
-- Similar to: CVU/CBU/Alias in banking systems
-- Date: 2025-10-21
-- ============================================================================

-- 1. Add wallet_account_number column to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS wallet_account_number VARCHAR(16) UNIQUE;

-- 2. Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_wallet_account_number 
ON profiles(wallet_account_number);

-- 3. Function to generate unique 16-digit wallet account numbers
CREATE OR REPLACE FUNCTION generate_wallet_account_number()
RETURNS VARCHAR(16)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_number VARCHAR(16);
  collision_count INT := 0;
  max_attempts INT := 10;
BEGIN
  LOOP
    -- Generate 16-digit number: AR + 14 random digits
    -- Format: AR + XXXXXXXXXXXXXX
    -- Example: AR12345678901234
    new_number := 'AR' || LPAD(FLOOR(RANDOM() * 99999999999999)::TEXT, 14, '0');
    
    -- Check if number already exists
    IF NOT EXISTS (
      SELECT 1 FROM profiles WHERE wallet_account_number = new_number
    ) THEN
      RETURN new_number;
    END IF;
    
    collision_count := collision_count + 1;
    
    IF collision_count >= max_attempts THEN
      RAISE EXCEPTION 'Unable to generate unique wallet account number after % attempts', max_attempts;
    END IF;
  END LOOP;
END;
$$;

-- 4. Function to assign wallet account number to user (if they don't have one)
CREATE OR REPLACE FUNCTION assign_wallet_account_number(p_user_id UUID)
RETURNS VARCHAR(16)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_number VARCHAR(16);
  new_number VARCHAR(16);
BEGIN
  -- Check if user already has a number
  SELECT wallet_account_number INTO existing_number
  FROM profiles
  WHERE id = p_user_id;
  
  IF existing_number IS NOT NULL THEN
    RETURN existing_number;
  END IF;
  
  -- Generate new number
  new_number := generate_wallet_account_number();
  
  -- Assign to user
  UPDATE profiles
  SET wallet_account_number = new_number
  WHERE id = p_user_id;
  
  RETURN new_number;
END;
$$;

-- 5. Trigger to auto-assign wallet account number when user_wallets is created
CREATE OR REPLACE FUNCTION auto_assign_wallet_account_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Assign number if user doesn't have one
  PERFORM assign_wallet_account_number(NEW.user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_assign_wallet_account_number ON user_wallets;
CREATE TRIGGER trigger_assign_wallet_account_number
  AFTER INSERT ON user_wallets
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_wallet_account_number();

-- 6. RPC function to search users by wallet account number
CREATE OR REPLACE FUNCTION search_users_by_wallet_number(
  p_query TEXT
)
RETURNS TABLE(
  id UUID,
  full_name TEXT,
  email VARCHAR(255),
  wallet_account_number VARCHAR(16),
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    u.email::VARCHAR(255),
    p.wallet_account_number,
    p.avatar_url
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE
    -- Exact match on wallet account number
    p.wallet_account_number = UPPER(TRIM(p_query))
    -- Exclude current user (they can't transfer to themselves)
    AND p.id != auth.uid()
  LIMIT 1;
END;
$$;

-- 7. Grant permissions
GRANT EXECUTE ON FUNCTION generate_wallet_account_number() TO authenticated;
GRANT EXECUTE ON FUNCTION assign_wallet_account_number(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION search_users_by_wallet_number(TEXT) TO authenticated;

-- 8. Backfill existing users with wallet account numbers
-- This will assign numbers to all users who already have wallets
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT DISTINCT user_id 
    FROM user_wallets 
    WHERE user_id NOT IN (
      SELECT id FROM profiles WHERE wallet_account_number IS NOT NULL
    )
  LOOP
    PERFORM assign_wallet_account_number(user_record.user_id);
  END LOOP;
END;
$$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check that all users with wallets now have account numbers
-- SELECT 
--   COUNT(*) as total_wallets,
--   COUNT(p.wallet_account_number) as wallets_with_numbers
-- FROM user_wallets uw
-- LEFT JOIN profiles p ON p.id = uw.user_id;

-- Example: Search for user by wallet account number
-- SELECT * FROM search_users_by_wallet_number('AR12345678901234');

-- Example: Manually assign number to specific user
-- SELECT assign_wallet_account_number('user-uuid-here');

COMMENT ON COLUMN profiles.wallet_account_number IS 'Unique 16-character wallet account number for transfers (format: ARXXXXXXXXXXXXXX)';
COMMENT ON FUNCTION generate_wallet_account_number() IS 'Generates a unique 16-digit wallet account number with AR prefix';
COMMENT ON FUNCTION assign_wallet_account_number(UUID) IS 'Assigns a wallet account number to a user if they dont have one';
COMMENT ON FUNCTION search_users_by_wallet_number(TEXT) IS 'Search users by exact wallet account number match';
