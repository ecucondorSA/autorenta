
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Config
const SUPABASE_URL = "https://pisqjmoklivzpwufhscx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpc3FqbW9rbGl2enB3dWZoc2N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0ODI3ODMsImV4cCI6MjA3ODA1ODc4M30.wE2jTut2JSexoKFtHdEaIpl9MZ0sOHy9zMYBbhFbzt4";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const OUTPUT_FILE = 'database/update_prices_bulk.sql';

// Helper to interact with the Edge Function
async function getFipeValue(brand, model, year, country = 'AR') {
  const url = `${SUPABASE_URL}/functions/v1/get-fipe-value`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ brand, model, year, country }),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    return null;
  }
}

// Helper to find generic models if exact match fails
// e.g. "Fiat Toro Volcano..." -> try "Fiat Toro"
function getModelVariants(modelName) {
    const variants = [modelName];
    const parts = modelName.split(' ');
    if (parts.length > 1) {
        variants.push(parts[0]); // "Toro"
        variants.push(`${parts[0]} ${parts[1]}`); // "Fiat Toro" (if brand included) or "Toro Volcano"
    }
    return variants;
}

async function generateSql() {
  console.log('--- Generating SQL for Bulk Price Update ---');
  
  // Clear/Create output file
  fs.writeFileSync(OUTPUT_FILE, `-- Bulk Update Generated at ${new Date().toISOString()}\n\n`);

  const { data: cars, error } = await supabase
    .from('cars')
    .select('id, brand, model, year, fipe_code, estimated_value_usd')
    .is('deleted_at', null);

  if (error) {
    console.error('Error fetching cars:', error);
    return;
  }

  console.log(`Found ${cars.length} active cars.`);

  let successCount = 0;
  let failCount = 0;

  for (const car of cars) {
    if (!car.brand || !car.model || !car.year) {
        console.warn(`Skipping Car ID ${car.id}: Missing info`);
        continue;
    }

    process.stdout.write(`Processing: ${car.brand} ${car.model} (${car.year})... `);

    // 1. Try Exact Match
    let result = await getFipeValue(car.brand, car.model, car.year);
    
    // 2. Retry with simplified model name if failed
    if (!result || !result.success) {
        const simplified = car.model.split(' ')[0]; // e.g. "Gol" from "Gol 1.0..."
        if (simplified !== car.model) {
            // process.stdout.write(`(retrying as ${simplified})... `);
            result = await getFipeValue(car.brand, simplified, car.year);
        }
    }

    if (result && result.success && result.data) {
        const { value_usd, value_brl, value_ars, fipe_code } = result.data;
        console.log(`✅ FOUND: $${value_usd}`);
        
        const sql = `UPDATE public.cars SET 
  estimated_value_usd = ${value_usd},
  value_usd = ${value_usd},
  value_brl = ${value_brl},
  value_ars = ${value_ars},
  fipe_code = '${fipe_code}',
  fipe_last_sync = NOW(),
  value_usd_source = 'fipe_bulk_script'
WHERE id = '${car.id}';\n`;

        fs.appendFileSync(OUTPUT_FILE, sql);
        successCount++;
    } else {
        console.log(`❌ FAILED`);
        fs.appendFileSync(OUTPUT_FILE, `-- FAILED to find price for: ${car.brand} ${car.model} (${car.year})\n`);
        failCount++;
    }

    // Rate limiting
    await new Promise(r => setTimeout(r, 200));
  }

  console.log('\n--- Generation Complete ---');
  console.log(`SQL written to: ${OUTPUT_FILE}`);
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);
}

generateSql();
