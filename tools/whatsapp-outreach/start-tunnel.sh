#!/bin/bash
# AutoRenta - Start ngrok tunnel and update Supabase trigger
# Run this after restarting ngrok to update the webhook URL

set -e

echo "🚀 Starting ngrok tunnel for n8n..."

# Kill existing ngrok
pkill -f "ngrok http 5678" 2>/dev/null || true
sleep 2

# Start ngrok in background
ngrok http 5678 --log=stdout > /tmp/ngrok-n8n.log 2>&1 &
sleep 5

# Get the new URL
TUNNEL_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url')

if [ -z "$TUNNEL_URL" ] || [ "$TUNNEL_URL" == "null" ]; then
    echo "❌ Failed to get ngrok URL"
    exit 1
fi

echo "✅ Tunnel URL: $TUNNEL_URL"

# Update Supabase trigger function
echo "📝 Updating Supabase trigger..."

# Use Supabase CLI or direct SQL
WEBHOOK_URL="${TUNNEL_URL}/webhook/booking-status-change"

cat << SQL > /tmp/update-trigger.sql
CREATE OR REPLACE FUNCTION public.notify_booking_status_change()
RETURNS TRIGGER AS \$\$
DECLARE
  payload jsonb;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  payload := jsonb_build_object(
    'type', 'UPDATE',
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', row_to_json(NEW)::jsonb,
    'old_record', row_to_json(OLD)::jsonb
  );

  PERFORM net.http_post(
    url := '${WEBHOOK_URL}',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'ngrok-skip-browser-warning', 'true'
    ),
    body := payload
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'notify_booking_status_change failed: %', SQLERRM;
    RETURN NEW;
END;
\$\$ LANGUAGE plpgsql SECURITY DEFINER;
SQL

echo "🔄 Applying to Supabase..."
# Note: This requires supabase CLI to be linked
supabase db execute --file /tmp/update-trigger.sql --project-ref aceacpaockyxgogxsfyc 2>/dev/null || \
    echo "⚠️  Run manually: supabase db execute --file /tmp/update-trigger.sql"

echo ""
echo "✅ Done! Webhook URL: $WEBHOOK_URL"
echo ""
echo "Test with: curl -X POST '$WEBHOOK_URL' -H 'Content-Type: application/json' -d '{\"test\": true}'"
