/**
 * Script para corregir números de teléfono en Supabase
 * Agrega el "9" después de "54" para números argentinos móviles
 *
 * Uso: bun run fix-supabase-phones.ts
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://aceacpaockyxgogxsfyc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY no está configurada');
  console.log('Ejecuta: export SUPABASE_SERVICE_ROLE_KEY="tu-key"');
  process.exit(1);
}

function fixArgentinePhone(phone: string): string {
  // Remove any non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // Skip non-Argentine or already correct numbers
  if (!cleaned.startsWith('54')) return phone;
  if (cleaned.startsWith('549')) return phone; // Already correct

  // Fix: Insert 9 after 54
  return '549' + cleaned.slice(2);
}

async function main() {
  console.log('🔧 Corrigiendo números de teléfono en Supabase...\n');

  // Obtener todos los contactos
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/outreach_contacts?select=id,phone`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY!,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }
  );

  if (!response.ok) {
    console.error('Error obteniendo contactos:', await response.text());
    process.exit(1);
  }

  const contacts = await response.json();
  console.log(`Total contactos: ${contacts.length}`);

  // Encontrar los que necesitan corrección
  const toFix = contacts.filter((c: any) => {
    const fixed = fixArgentinePhone(c.phone);
    return fixed !== c.phone;
  });

  console.log(`Contactos a corregir: ${toFix.length}\n`);

  if (toFix.length === 0) {
    console.log('✅ No hay números que corregir');
    return;
  }

  // Actualizar cada uno
  let fixed = 0;
  let errors = 0;

  for (const contact of toFix) {
    const newPhone = fixArgentinePhone(contact.phone);

    const updateResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/outreach_contacts?id=eq.${contact.id}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY!,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ phone: newPhone }),
      }
    );

    if (updateResponse.ok) {
      console.log(`✓ ${contact.phone} -> ${newPhone}`);
      fixed++;
    } else {
      console.error(`✗ Error actualizando ${contact.phone}: ${await updateResponse.text()}`);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Corregidos: ${fixed}`);
  console.log(`❌ Errores: ${errors}`);
}

main().catch(console.error);
