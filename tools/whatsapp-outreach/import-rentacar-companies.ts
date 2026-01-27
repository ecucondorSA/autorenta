/**
 * Script para importar empresas de rent-a-car con WhatsApp al CRM Girard
 * Extrae números de WhatsApp de los links y los importa como contactos
 *
 * Uso: bun run import-rentacar-companies.ts
 */

import { parse } from 'csv-parse/sync';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pisqjmoklivzpwufhscx.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY no está configurada');
  console.log('Ejecuta: export SUPABASE_SERVICE_ROLE_KEY="tu-key"');
  process.exit(1);
}

interface RentacarCSV {
  name: string;
  phone: string;
  website: string;
  rating: string;
  user_ratings_total: string;
  whatsapp_link: string;
  phone_mobile: string;
}

interface SupabaseContact {
  phone: string;
  first_name: string;
  city: string;
  province: string;
  country: string;
  region: string;
  source: string;
  status: string;
  company: string;
  notes: string;
  current_platform: string;
}

/**
 * Extrae el número de teléfono de un link de WhatsApp
 * Formatos soportados:
 * - https://wa.me/5491150082743
 * - http://wa.me/5491150082743
 * - https://api.whatsapp.com/send?phone=5491135600544
 */
function extractWhatsAppNumber(link: string): string | null {
  if (!link || link.trim() === '') return null;

  // Formato: wa.me/NUMERO
  const waMatch = link.match(/wa\.me\/(\d+)/);
  if (waMatch) return waMatch[1];

  // Formato: api.whatsapp.com/send?phone=NUMERO
  const apiMatch = link.match(/phone=(\d+)/);
  if (apiMatch) return apiMatch[1];

  return null;
}

/**
 * Normaliza el número de teléfono al formato argentino
 */
function normalizeArgentineNumber(phone: string): string {
  // Si empieza con 54, está bien
  if (phone.startsWith('54')) return phone;

  // Si empieza con 9 (mobile sin código de país)
  if (phone.startsWith('9')) return `54${phone}`;

  // Si empieza con 11 (Buenos Aires sin código de país)
  if (phone.startsWith('11')) return `549${phone}`;

  // Para números internacionales (ej: USA +1)
  if (phone.startsWith('1') && phone.length === 11) return phone;

  return phone;
}

async function main() {
  console.log('📥 Importando empresas de rent-a-car con WhatsApp...\n');

  // Leer CSV
  const csvContent = await Bun.file('/home/edu/audits/tripwip/places_amba_nearby_grid_keywords_whatsapp.csv').text();
  const records: RentacarCSV[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`Total empresas en CSV: ${records.length}`);

  // Filtrar solo las que tienen WhatsApp
  const withWhatsApp = records.filter(r => r.whatsapp_link && r.whatsapp_link.trim() !== '');
  console.log(`Empresas con WhatsApp: ${withWhatsApp.length}`);

  // Extraer números y crear contactos
  const contacts: SupabaseContact[] = [];
  const seen = new Set<string>();

  for (const r of withWhatsApp) {
    const phone = extractWhatsAppNumber(r.whatsapp_link);
    if (!phone) {
      console.log(`⚠️  No se pudo extraer número de: ${r.whatsapp_link}`);
      continue;
    }

    const normalizedPhone = normalizeArgentineNumber(phone);

    // Evitar duplicados
    if (seen.has(normalizedPhone)) {
      console.log(`⚠️  Duplicado: ${r.name} (${normalizedPhone})`);
      continue;
    }
    seen.add(normalizedPhone);

    // Determinar si es internacional
    const isInternational = !normalizedPhone.startsWith('54');

    contacts.push({
      phone: normalizedPhone,
      first_name: r.name.substring(0, 100), // Nombre de la empresa
      city: 'Buenos Aires',
      province: 'Buenos Aires',
      country: isInternational ? 'USA' : 'Argentina',
      region: isInternational ? 'USA' : 'AMBA',
      source: 'rentacar',
      status: 'new',
      company: r.name,
      notes: `Rating: ${r.rating}/5 (${r.user_ratings_total} reviews)\nWebsite: ${r.website || 'N/A'}\nTeléfono fijo: ${r.phone || 'N/A'}`,
      current_platform: 'independent',
    });
  }

  console.log(`\nContactos únicos a importar: ${contacts.length}`);

  if (contacts.length === 0) {
    console.log('❌ No hay contactos para importar');
    process.exit(0);
  }

  // Insertar en Supabase
  const batchSize = 25;
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
      console.error(`\nError en batch ${i}-${i + batchSize}: ${error}`);
      errors += batch.length;
    }

    process.stdout.write(`\rProcesados: ${Math.min(i + batchSize, contacts.length)}/${contacts.length}`);
  }

  console.log('\n\n✅ Importación completada:');
  console.log(`   - Insertados: ${inserted}`);
  console.log(`   - Duplicados (saltados): ${skipped}`);
  console.log(`   - Errores: ${errors}`);

  // Mostrar estadísticas actualizadas
  const statsResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/outreach_contacts?select=source,region`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }
  );

  if (statsResponse.ok) {
    const allContacts = await statsResponse.json();

    const bySource: Record<string, number> = {};
    const byRegion: Record<string, number> = {};

    for (const c of allContacts) {
      bySource[c.source] = (bySource[c.source] || 0) + 1;
      byRegion[c.region] = (byRegion[c.region] || 0) + 1;
    }

    console.log('\n📊 Estadísticas del CRM actualizado:');
    console.log(`   Total en BD: ${allContacts.length}`);
    console.log('\n   Por fuente:');
    Object.entries(bySource).forEach(([source, count]) => {
      console.log(`   - ${source}: ${count}`);
    });
    console.log('\n   Por región:');
    Object.entries(byRegion).forEach(([region, count]) => {
      console.log(`   - ${region}: ${count}`);
    });
  }
}

main().catch(console.error);
