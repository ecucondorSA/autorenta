
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Config
const SUPABASE_URL = "https://pisqjmoklivzpwufhscx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpc3FqbW9rbGl2enB3dWZoc2N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0ODI3ODMsImV4cCI6MjA3ODA1ODc4M30.wE2jTut2JSexoKFtHdEaIpl9MZ0sOHy9zMYBbhFbzt4";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const OUTPUT_FILE = 'database/update_prices_manual_fix.sql';

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

// List of cars that failed, with their original DB info and target FIPE model
const FAILED_CARS_TO_FIX = [
    { dbBrand: 'Ford', dbModel: 'Ka', dbYear: 2023, fipeBrand: 'Ford', targetFipeModel: 'Ka 1.0 SE/SE Plus TiVCT Flex 5p', targetFipeYear: 2021 }, // Using 2021 as a proxy
    { dbBrand: 'Volkswagen', dbModel: 'Gol', dbYear: 2021, fipeBrand: 'VW - VolksWagen', targetFipeModel: 'Gol 1.0 Flex 12V 5p', targetFipeYear: 2021 },
    { dbBrand: 'Fiat', dbModel: 'Toro', dbYear: 2025, fipeBrand: 'Fiat', targetFipeModel: 'Toro Freedom 1.3 T270 4x2 Flex Aut.', targetFipeYear: 2024 }, // Using 2024 as a proxy
    { dbBrand: 'Chevrolet', dbModel: 'Cruze', dbYear: 2025, fipeBrand: 'GM - Chevrolet', targetFipeModel: 'CRUZE LT 1.4 16V Turbo Flex 4p Aut.', targetFipeYear: 2023 }, // Using 2023 as a proxy for 2025
    { dbBrand: 'Volkswagen', dbModel: 'Gol', dbYear: 2019, fipeBrand: 'VW - VolksWagen', targetFipeModel: 'Gol 1.0 Flex 12V 5p', targetFipeYear: 2019 },
    { dbBrand: 'Honda', dbModel: 'City', dbYear: 2021, fipeBrand: 'Honda', targetFipeModel: 'CITY Sedan EX 1.5 Flex 16V 4p Aut.', targetFipeYear: 2021 },
];

async function generateManualFixSql() {
    console.log('--- Generating SQL for Manual FIPE Fixes ---');
    
    // Clear/Create output file
    fs.writeFileSync(OUTPUT_FILE, `-- Manual FIPE Fixes Generated at ${new Date().toISOString()}\n\n`);

    let successCount = 0;
    let failCount = 0;

    for (const carToFix of FAILED_CARS_TO_FIX) {
        // 1. Find the actual car ID from the DB
        process.stdout.write(`Finding car in DB: ${carToFix.dbBrand} ${carToFix.dbModel} (${carToFix.dbYear})... `);
        const { data: dbCar, error: dbError } = await supabase
            .from('cars')
            .select('id, brand, model, year')
            .ilike('brand', `%${carToFix.dbBrand}%`)
            .ilike('model', `%${carToFix.dbModel}%`)
            .eq('year', carToFix.dbYear)
            .is('deleted_at', null)
            .maybeSingle(); // Use maybeSingle to get null if no match or multiple

        if (dbError || !dbCar) {
            console.log(`❌ DB car not found for: ${carToFix.dbBrand} ${carToFix.dbModel} (${carToFix.dbYear})`);
            fs.appendFileSync(OUTPUT_FILE, `-- DB car not found for: ${carToFix.dbBrand} ${carToFix.dbModel} (${carToFix.dbYear})\n`);
            failCount++;
            continue;
        }

        console.log(`DB Car ID found: ${dbCar.id}`);
        process.stdout.write(`Fetching FIPE for: ${carToFix.fipeBrand} "${carToFix.targetFipeModel}" (${carToFix.targetFipeYear})... `);

        // 2. Fetch FIPE Value with the target model/year
        const fipeResult = await getFipeValue(carToFix.fipeBrand, carToFix.targetFipeModel, carToFix.targetFipeYear);

        if (fipeResult && fipeResult.success && fipeResult.data) {
            const { value_usd, value_brl, value_ars, fipe_code } = fipeResult.data;
            console.log(`✅ FOUND: $${value_usd}`);
            
            const sql = `UPDATE public.cars SET 
  estimated_value_usd = ${value_usd},
  value_usd = ${value_usd},
  value_brl = ${value_brl},
  value_ars = ${value_ars},
  fipe_code = '${fipe_code}',
  fipe_last_sync = NOW(),
  value_usd_source = 'fipe_manual_fix_script'
WHERE id = '${dbCar.id}';\n`;

            fs.appendFileSync(OUTPUT_FILE, sql);
            successCount++;
        } else {
            console.log(`❌ FAILED`);
            fs.appendFileSync(OUTPUT_FILE, `-- FAILED to find FIPE price for DB car ID ${dbCar.id} (searching for ${carToFix.fipeBrand} "${carToFix.targetFipeModel}" ${carToFix.targetFipeYear})\n`);
            failCount++;
        }

        // Small delay
        await new Promise(r => setTimeout(r, 200));
    }

    console.log('\n--- Manual Fix Generation Complete ---');
    console.log(`SQL written to: ${OUTPUT_FILE}`);
    console.log(`Success: ${successCount}`);
    console.log(`Failed: ${failCount}`);
}

generateManualFixSql();
