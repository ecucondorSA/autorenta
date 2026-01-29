const SUPABASE_URL = 'https://pisqjmoklivzpwufhscx.supabase.co';

async function checkSentMessages() {
  // Get count of sent messages
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/outreach_contacts?select=phone,firstName,lastName,status,last_contact&status=eq.sent&order=last_contact.desc&limit=10`,
    {
      headers: {
        'apikey': process.env.SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
      },
    }
  );
  
  if (!response.ok) {
    console.error('Error:', await response.text());
    return;
  }
  
  const sent = await response.json();
  console.log(`\n📱 Últimos ${sent.length} mensajes enviados:\n`);
  
  for (const contact of sent) {
    const date = contact.last_contact ? new Date(contact.last_contact).toLocaleString('es-AR') : 'N/A';
    console.log(`✅ ${contact.firstName} ${contact.lastName} - ${contact.phone} - ${date}`);
  }
  
  // Get total counts
  const countResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/outreach_contacts?select=status`,
    {
      headers: {
        'apikey': process.env.SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
      },
    }
  );
  
  const all = await countResponse.json();
  const counts = {
    total: all.length,
    sent: all.filter((c: any) => c.status === 'sent').length,
    pending: all.filter((c: any) => c.status === 'pending').length,
    failed: all.filter((c: any) => c.status === 'failed').length,
  };
  
  console.log('\n📊 Resumen:');
  console.log(`   Total contactos: ${counts.total}`);
  console.log(`   ✅ Enviados: ${counts.sent}`);
  console.log(`   ⏳ Pendientes: ${counts.pending}`);
  console.log(`   ❌ Fallidos: ${counts.failed}`);
}

checkSentMessages();
