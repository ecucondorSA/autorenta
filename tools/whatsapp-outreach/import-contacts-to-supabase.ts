/**
 * Script para importar contactos del CSV a Supabase CRM
 * Sistema Girard - Cada contacto es una relación
 *
 * Uso: bun run import-contacts-to-supabase.ts
 */

import { parse } from 'csv-parse/sync';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://aceacpaockyxgogxsfyc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY no está configurada');
  console.log('Ejecuta: export SUPABASE_SERVICE_ROLE_KEY="tu-key"');
  process.exit(1);
}

interface CSVContact {
  email: string;
  phone: string;
  whatsappId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  city: string;
  province: string;
  region: string;
}

interface SupabaseContact {
  phone: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  city: string | null;
  province: string | null;
  country: string;
  region: string;
  source: string;
  status: string;
}

async function main() {
  console.log('📥 Importando contactos a Supabase CRM...\n');

  // Leer CSV
  const csvContent = await Bun.file('./contacts/argentina_owners.csv').text();
  const records: CSVContact[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`Total contactos en CSV: ${records.length}`);

  // Transformar al formato de Supabase
  const contacts: SupabaseContact[] = records.map(r => ({
    phone: r.phone,
    email: r.email || null,
    first_name: r.firstName || null,
    last_name: r.lastName || null,
    city: r.city || null,
    province: r.province || null,
    country: r.region === 'USA' ? 'USA' : 'Argentina',
    region: r.region,
    source: 'rentennials',
    status: 'new',
  }));

  // Insertar en batches de 50
  const batchSize = 50;
  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < contacts.length; i += batchSize) {
    const batch = contacts.slice(i, i + batchSize);

    const response = await fetch(`${SUPABASE_URL}/rest/v1/outreach_contacts`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=ignore-duplicates,return=representation',
      },
      body: JSON.stringify(batch),
    });

    if (response.ok) {
      const result = await response.json();
      inserted += result.length;
      skipped += batch.length - result.length;
    } else {
      const error = await response.text();
      console.error(`Error en batch ${i}-${i + batchSize}: ${error}`);
      errors += batch.length;
    }

    // Progreso
    process.stdout.write(`\rProcesados: ${Math.min(i + batchSize, contacts.length)}/${contacts.length}`);
  }

  console.log('\n');
  console.log('✅ Importación completada:');
  console.log(`   - Insertados: ${inserted}`);
  console.log(`   - Duplicados (saltados): ${skipped}`);
  console.log(`   - Errores: ${errors}`);

  // Mostrar estadísticas
  const statsResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/outreach_contacts?select=region,status&limit=1000`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }
  );

  if (statsResponse.ok) {
    const allContacts = await statsResponse.json();
    const byRegion = allContacts.reduce((acc: Record<string, number>, c: any) => {
      acc[c.region] = (acc[c.region] || 0) + 1;
      return acc;
    }, {});

    console.log('\n📊 Estadísticas del CRM:');
    console.log(`   Total en BD: ${allContacts.length}`);
    Object.entries(byRegion).forEach(([region, count]) => {
      console.log(`   - ${region}: ${count}`);
    });
  }
}

main().catch(console.error);
