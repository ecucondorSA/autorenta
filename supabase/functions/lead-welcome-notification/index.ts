import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const WAHA_BASE_URL = Deno.env.get('WAHA_BASE_URL') || '';
const WAHA_SESSION = Deno.env.get('WAHA_SESSION') || 'default';
const WAHA_API_KEY = Deno.env.get('WAHA_API_KEY') || '';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

serve(async (req) => {
  const { record } = await req.json(); // Data from DB Trigger

  if (!record || !record.phone) {
    return new Response('No phone found', { status: 200 });
  }

  const phone = record.phone.replace(/\D/g, '');
  const name = record.full_name || 'Amigo/a';
  const carInfo = record.car_brand ? `${record.car_brand} ${record.car_model || ''}` : 'tu auto';

  // 1. Prepare Welcome Message
  const message = `¡Hola ${name}! 👋 Bienvenido a AutoRenta. 

Vimos que estás interesado en ganar dinero con ${carInfo}. Soy Edison, tu asesor de IA de AutoRenta. 🚗💰

¿Te gustaría que te ayude a dar de alta tu vehículo ahora mismo? Solo toma 2 minutos.

Quedo atento a tus dudas.`;

  try {
    // 2. Send via WhatsApp (WAHA)
    if (WAHA_BASE_URL && WAHA_API_KEY) {
      const res = await fetch(`${WAHA_BASE_URL}/api/sendText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': WAHA_API_KEY,
        },
        body: JSON.stringify({
          session: WAHA_SESSION,
          chatId: `${phone}@c.us`,
          text: message,
        }),
      });
      
      console.log(`[LeadWelcome] WhatsApp sent to ${phone}: ${res.status}`);
    }

    // 3. Notify Admin (Push Notification)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Obtenemos los admins (asumimos que el user principal es admin)
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('is_admin', true);

    if (admins) {
      for (const admin of admins) {
        await supabase.from('notifications').insert({
          user_id: admin.id,
          title: '🔥 Nuevo Lead Recibido',
          body: `${name} (${record.city || 'Desconocido'}) se interesó por su ${carInfo}.`,
          type: 'generic_announcement',
          metadata: { lead_id: record.id }
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('[LeadWelcome] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
});