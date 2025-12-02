-- Enable RLS on conversion_events table
ALTER TABLE conversion_events ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to insert their own conversion events
CREATE POLICY "Users can insert own conversion events"
ON conversion_events
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Allow anonymous users to insert conversion events (for marketing tracking)
CREATE POLICY "Anonymous users can insert conversion events"
ON conversion_events
FOR INSERT
TO anon
WITH CHECK (true);

-- Policy: Users can read their own conversion events
CREATE POLICY "Users can read own conversion events"
ON conversion_events
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Service role can read all conversion events (for analytics)
CREATE POLICY "Service role can read all conversion events"
ON conversion_events
FOR SELECT
TO service_role
USING (true);

COMMENT ON POLICY "Users can insert own conversion events" ON conversion_events IS 
'Allows authenticated users to track their own conversion events for analytics';

COMMENT ON POLICY "Anonymous users can insert conversion events" ON conversion_events IS 
'Allows anonymous users to track conversion events for marketing attribution';

COMMENT ON POLICY "Users can read own conversion events" ON conversion_events IS 
'Allows authenticated users to view their own conversion history';

COMMENT ON POLICY "Service role can read all conversion events" ON conversion_events IS 
'Allows backend services to access all conversion events for analytics dashboards';
