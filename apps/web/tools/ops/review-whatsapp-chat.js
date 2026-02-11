import https from 'https';

const SUPABASE_URL = process.env.NG_APP_SUPABASE_URL || 'https://aceacpaockyxgogxsfyc.supabase.co';
const SUPABASE_ANON_KEY = process.env.NG_APP_SUPABASE_ANON_KEY;
if (!SUPABASE_ANON_KEY) { console.error('NG_APP_SUPABASE_ANON_KEY env var required'); process.exit(1); }

const QUERY_URL = `${SUPABASE_URL}/rest/v1/outreach_messages?select=content,direction,created_at,outreach_contacts(phone)&order=created_at.desc&limit=200`;

const options = {
  headers: {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
  }
};

https.get(QUERY_URL, options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const messages = JSON.parse(data);
      if (messages.error) {
        console.error('Error fetching messages:', messages.error);
        return;
      }

      console.log('--- ÚLTIMOS 50 MENSAJES DE WHATSAPP ---\n');

      // Group by conversation (phone) is harder with a flat list sorted by time, 
      // but we can just show them chronologically.
      
      messages.forEach(msg => {
        const phone = msg.outreach_contacts?.phone || 'Desconocido';
        const date = new Date(msg.created_at).toLocaleString('es-AR');
        const direction = msg.direction === 'outbound' ? '🤖 BOT' : '👤 USUARIO';
        const color = msg.direction === 'outbound' ? '\x1b[36m' : '\x1b[32m'; // Cyan for bot, Green for user
        const reset = '\x1b[0m';

        console.log(`[${date}] ${phone}`);
        console.log(`${color}${direction}:${reset} ${msg.content.replace(/\n/g, '\n      ')}`);
        console.log('--------------------------------------------------');
      });

    } catch (e) {
      console.error('Error parsing response:', e);
      console.log('Raw data:', data);
    }
  });

}).on('error', (e) => {
  console.error('Error fetching data:', e);
});
