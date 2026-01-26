-- Migration: Create Bonus Protector Functions
-- Date: 2024-11-14
-- Description: Creates the missing functions for the Bonus Protector system

-- Create bonus protector options table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.bonus_protector_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    protection_level INTEGER NOT NULL UNIQUE CHECK (protection_level BETWEEN 1 AND 3),
    price_cents INTEGER NOT NULL CHECK (price_cents > 0),
    price_usd DECIMAL(10,2) NOT NULL CHECK (price_usd > 0),
    description TEXT NOT NULL,
    validity_days INTEGER NOT NULL DEFAULT 365,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create active bonus protectors table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.active_bonus_protectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    addon_id TEXT NOT NULL,
    protection_level INTEGER NOT NULL CHECK (protection_level BETWEEN 1 AND 3),
    purchase_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    price_paid_usd DECIMAL(10,2) NOT NULL,
    remaining_protected_claims INTEGER DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, is_active) WHERE is_active = TRUE
);

-- Seed default options if table is empty
INSERT INTO public.bonus_protector_options (protection_level, price_cents, price_usd, description, validity_days)
VALUES 
    (1, 1500, 15.00, 'Protege 1 siniestro leve', 365),
    (2, 2500, 25.00, 'Protege 2 siniestros leves o 1 moderado', 365),
    (3, 4000, 40.00, 'Protege 3 siniestros leves, 2 moderados o 1 grave', 365)
ON CONFLICT (protection_level) DO NOTHING;

-- Enable RLS
ALTER TABLE public.bonus_protector_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_bonus_protectors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bonus_protector_options (public read)
CREATE POLICY "bonus_protector_options_select_all" ON public.bonus_protector_options
    FOR SELECT USING (true);

-- RLS Policies for active_bonus_protectors (users can only see their own)
CREATE POLICY "active_bonus_protectors_select_own" ON public.active_bonus_protectors
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "active_bonus_protectors_insert_own" ON public.active_bonus_protectors
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "active_bonus_protectors_update_own" ON public.active_bonus_protectors
    FOR UPDATE USING (auth.uid() = user_id);

-- Function: List bonus protector options
CREATE OR REPLACE FUNCTION public.list_bonus_protector_options()
RETURNS TABLE (
    protection_level INTEGER,
    price_cents INTEGER,
    price_usd DECIMAL(10,2),
    description TEXT,
    validity_days INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bpo.protection_level,
        bpo.price_cents,
        bpo.price_usd,
        bpo.description,
        bpo.validity_days
    FROM public.bonus_protector_options bpo
    ORDER BY bpo.protection_level;
END;
$$;

-- Function: Get active bonus protector for user
CREATE OR REPLACE FUNCTION public.get_active_bonus_protector(p_user_id UUID)
RETURNS TABLE (
    addon_id TEXT,
    protection_level INTEGER,
    purchase_date TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    days_until_expiry INTEGER,
    price_paid_usd DECIMAL(10,2),
    remaining_protected_claims INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    -- Check if user can access this data
    IF auth.uid() != p_user_id THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    RETURN QUERY
    SELECT 
        abp.addon_id,
        abp.protection_level,
        abp.purchase_date,
        abp.expires_at,
        EXTRACT(DAY FROM (abp.expires_at - NOW()))::INTEGER as days_until_expiry,
        abp.price_paid_usd,
        abp.remaining_protected_claims
    FROM public.active_bonus_protectors abp
    WHERE abp.user_id = p_user_id 
      AND abp.is_active = TRUE
      AND abp.expires_at > NOW()
    ORDER BY abp.expires_at DESC
    LIMIT 1;
END;
$$;

-- Function: Purchase bonus protector
CREATE OR REPLACE FUNCTION public.purchase_bonus_protector(
    p_user_id UUID,
    p_protection_level INTEGER
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_option_record RECORD;
    v_addon_id TEXT;
    v_expires_at TIMESTAMPTZ;
    v_wallet_balance DECIMAL(10,2);
BEGIN
    -- Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    -- Check if user can purchase for themselves
    IF auth.uid() != p_user_id THEN
        RAISE EXCEPTION 'Can only purchase for yourself';
    END IF;

    -- Validate protection level
    IF p_protection_level NOT BETWEEN 1 AND 3 THEN
        RAISE EXCEPTION 'Invalid protection level. Must be 1, 2, or 3';
    END IF;

    -- Check if user already has an active protector
    IF EXISTS (
        SELECT 1 FROM public.active_bonus_protectors 
        WHERE user_id = p_user_id 
          AND is_active = TRUE 
          AND expires_at > NOW()
    ) THEN
        RAISE EXCEPTION 'User already has an active bonus protector';
    END IF;

    -- Get option details
    SELECT * INTO v_option_record
    FROM public.bonus_protector_options
    WHERE protection_level = p_protection_level;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Protection level not found';
    END IF;

    -- Check wallet balance (simplified - in real implementation, integrate with wallet system)
    -- For now, we'll assume the purchase is successful
    
    -- Generate addon ID
    v_addon_id := 'bp_' || p_protection_level || '_' || EXTRACT(EPOCH FROM NOW())::TEXT;
    
    -- Calculate expiry date
    v_expires_at := NOW() + (v_option_record.validity_days || ' days')::INTERVAL;

    -- Insert new active protector
    INSERT INTO public.active_bonus_protectors (
        user_id,
        addon_id,
        protection_level,
        expires_at,
        price_paid_usd,
        remaining_protected_claims
    ) VALUES (
        p_user_id,
        v_addon_id,
        p_protection_level,
        v_expires_at,
        v_option_record.price_usd,
        CASE 
            WHEN p_protection_level = 1 THEN 1
            WHEN p_protection_level = 2 THEN 2
            WHEN p_protection_level = 3 THEN 3
        END
    );

    -- TODO: Integrate with wallet system to deduct payment
    -- TODO: Create ledger entry
    -- TODO: Send confirmation notification

    RETURN v_addon_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.list_bonus_protector_options() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_bonus_protector(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_bonus_protector(UUID, INTEGER) TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_active_bonus_protectors_user_active 
ON public.active_bonus_protectors(user_id, is_active, expires_at) 
WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_active_bonus_protectors_expires_at 
ON public.active_bonus_protectors(expires_at) 
WHERE is_active = TRUE;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bonus_protector_options_updated_at
    BEFORE UPDATE ON public.bonus_protector_options
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER active_bonus_protectors_updated_at
    BEFORE UPDATE ON public.active_bonus_protectors
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.bonus_protector_options IS 'Available bonus protector packages that users can purchase';
COMMENT ON TABLE public.active_bonus_protectors IS 'Active bonus protectors owned by users';
COMMENT ON FUNCTION public.list_bonus_protector_options() IS 'Returns all available bonus protector options';
COMMENT ON FUNCTION public.get_active_bonus_protector(UUID) IS 'Returns active bonus protector for a specific user';
COMMENT ON FUNCTION public.purchase_bonus_protector(UUID, INTEGER) IS 'Purchases a bonus protector for a user';