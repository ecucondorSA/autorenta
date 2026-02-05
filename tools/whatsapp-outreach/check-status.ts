const SUPABASE_URL = 'https://aceacpaockyxgogxsfyc.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpc3FqbW9rbGl2enB3dWZoc2N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0ODI3ODMsImV4cCI6MjA3ODA1ODc4M30.wE2jTut2JSexoKFtHdEaIpl9MZ0sOHy9zMYBbhFbzt4';

async function checkStatus() {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/outreach_contacts?select=*`,
    {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
      },
    }
  );

  if (!response.ok) {
    console.error('Error:', await response.text());
    return;
  }

  const contacts = await response.json();

  // Count by status
  const contacted = contacts.filter((c: any) => c.status === 'contacted');
  const newContacts = contacts.filter((c: any) => c.status === 'new');

  console.log('\n📊 ESTADO DE LA CAMPAÑA WHATSAPP\n');
  console.log(`   Total contactos: ${contacts.length}`);
  console.log(`   ✅ Contactados: ${contacted.length}`);
  console.log(`   ⏳ Pendientes: ${newContacts.length}`);

  // Show contacted
  if (contacted.length > 0) {
    const sorted = contacted.sort((a: any, b: any) =>
      new Date(b.last_message_sent_at).getTime() - new Date(a.last_message_sent_at).getTime()
    );

    console.log('\n📱 MENSAJES ENVIADOS HOY:\n');
    for (const c of sorted) {
      const date = new Date(c.last_message_sent_at).toLocaleString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        hour: '2-digit',
        minute: '2-digit'
      });
      console.log(`   ✅ ${c.first_name} ${c.last_name} (${c.phone}) - ${date}hs`);
    }
  }

  // Calculate rate
  const rate = ((contacted.length / contacts.length) * 100).toFixed(1);
  console.log(`\n📈 Progreso: ${contacted.length}/${contacts.length} (${rate}%)`);
  console.log(`⏱️  A este ritmo (1 cada 5 min): ~${Math.ceil(newContacts.length * 5 / 60)} horas restantes`);
}

checkStatus();
