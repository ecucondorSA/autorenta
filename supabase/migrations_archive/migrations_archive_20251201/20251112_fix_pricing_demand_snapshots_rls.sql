-- Fix pricing_demand_snapshots table: Add RLS policies and region_id column
-- This fixes the 400 Bad Request error when querying the table

-- Add region_id column (UUID) to match the rest of the schema
ALTER TABLE pricing_demand_snapshots
ADD COLUMN IF NOT EXISTS region_id UUID;

-- Create index on region_id for better query performance
CREATE INDEX IF NOT EXISTS idx_demand_snapshots_region_id_timestamp
    ON pricing_demand_snapshots(region_id, timestamp DESC);

-- Enable RLS
ALTER TABLE pricing_demand_snapshots ENABLE ROW LEVEL SECURITY;

-- Allow public read access (this is aggregated/anonymized data)
CREATE POLICY "Public read access to demand snapshots"
    ON pricing_demand_snapshots
    FOR SELECT
    TO PUBLIC
    USING (true);

-- Only allow service role to insert/update/delete
CREATE POLICY "Service role can manage demand snapshots"
    ON pricing_demand_snapshots
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Add helpful comment
COMMENT ON TABLE pricing_demand_snapshots IS
'Stores periodic snapshots of demand metrics by region for dynamic pricing. Public read access allowed as this is aggregated data.';
