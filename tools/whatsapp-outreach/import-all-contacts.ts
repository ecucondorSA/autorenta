/**
 * Import ALL contacts from CSV to Supabase outreach_contacts
 * Senior approach: Direct, simple, works.
 */

const SUPABASE_URL = 'https://aceacpaockyxgogxsfyc.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  console.error('❌ Set SUPABASE_SERVICE_ROLE_KEY first');
  process.exit(1);
}

const csvContent = await Bun.file('./contacts/argentina_owners.csv').text();
const lines = csvContent.trim().split('\n').slice(1); // Skip header

console.log(`📥 Importing ${lines.length} contacts...\n`);

let imported = 0;
let errors = 0;

// Process in batches of 25
const batchSize = 25;

for (let i = 0; i < lines.length; i += batchSize) {
  const batch = lines.slice(i, i + batchSize);

  const contacts = batch.map(line => {
    const [email, phone, whatsappId, firstName, lastName, fullName, city, province, region] = line.split(',');
    return {
      phone: phone?.trim(),
      whatsapp_id: whatsappId?.trim(),
      first_name: firstName?.trim() || null,
      full_name: fullName?.trim() || null,
      source: 'csv_import',
      status: 'new',
      notes: `${city?.trim() || ''}, ${province?.trim() || ''}`.replace(/^, |, $/g, ''),
      is_active: true,
      metadata: { email: email?.trim(), region: region?.trim() }
    };
  }).filter(c => c.phone && c.phone.length > 5);

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/outreach_contacts`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=ignore-duplicates'
      },
      body: JSON.stringify(contacts)
    });

    if (res.ok) {
      imported += contacts.length;
    } else {
      const err = await res.text();
      console.error(`Batch ${i} error: ${err.substring(0, 100)}`);
      errors += contacts.length;
    }
  } catch (e) {
    console.error(`Batch ${i} exception:`, e);
    errors += batch.length;
  }

  process.stdout.write(`\r✓ Processed: ${Math.min(i + batchSize, lines.length)}/${lines.length}`);
}

console.log('\n\n✅ Import complete:');
console.log(`   Imported: ${imported}`);
console.log(`   Errors: ${errors}`);

// Verify
const countRes = await fetch(`${SUPABASE_URL}/rest/v1/outreach_contacts?select=count`, {
  headers: {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Prefer': 'count=exact'
  }
});
const count = countRes.headers.get('content-range')?.split('/')[1];
console.log(`   Total in DB: ${count}`);
