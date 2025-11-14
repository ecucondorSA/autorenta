-- Script to initialize Google Calendar entries for existing cars
-- This creates placeholder calendar entries that will be populated by the Edge Function

DO $$
DECLARE
  car_record RECORD;
  calendar_id TEXT;
  calendar_name TEXT;
BEGIN
  -- Get the user who has Google Calendar connected
  FOR car_record IN 
    SELECT c.id, c.owner_id, c.brand, c.model, c.year
    FROM cars c
    INNER JOIN google_calendar_tokens gct ON gct.user_id = c.owner_id
    WHERE c.id NOT IN (SELECT car_id FROM car_google_calendars)
  LOOP
    -- Generate a placeholder calendar ID (will be replaced by real Google Calendar ID)
    calendar_id := 'pending_' || car_record.id::text;
    calendar_name := COALESCE(car_record.brand, 'Auto') || ' ' || COALESCE(car_record.model, 'Sin modelo') || ' ' || COALESCE(car_record.year::text, 'S/A');
    
    -- Insert the calendar entry
    INSERT INTO car_google_calendars (
      car_id,
      google_calendar_id,
      calendar_name,
      owner_id,
      sync_enabled,
      created_at,
      updated_at
    ) VALUES (
      car_record.id,
      calendar_id,
      calendar_name,
      car_record.owner_id,
      false, -- Disabled until real calendar is created
      now(),
      now()
    );
    
    RAISE NOTICE 'Created placeholder calendar for car %: %', car_record.id, calendar_name;
  END LOOP;
  
  RAISE NOTICE 'Initialization complete. Call the Edge Function to create real Google Calendars.';
END $$;

-- Show the results
SELECT 
  c.brand || ' ' || c.model || ' ' || c.year as car_name,
  cgc.calendar_name,
  cgc.google_calendar_id,
  cgc.sync_enabled,
  CASE 
    WHEN cgc.google_calendar_id LIKE 'pending_%' THEN 'Needs Google Calendar creation'
    ELSE 'Ready'
  END as status
FROM car_google_calendars cgc
JOIN cars c ON c.id = cgc.car_id
ORDER BY c.created_at DESC;
