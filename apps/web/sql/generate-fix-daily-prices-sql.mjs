
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Config
const SUPABASE_URL = "https://pisqjmoklivzpwufhscx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpc3FqbW9rbGl2enB3dWZoc2N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0ODI3ODMsImV4cCI6MjA3ODA1ODc4M30.wE2jTut2JSexoKFtHdEaIpl9MZ0sOHy9zMYBbhFbzt4";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const OUTPUT_FILE = 'database/fix_daily_prices.sql';
const DAILY_RATE_FACTOR = 0.003; // 0.3% of estimated_value_usd

async function generateFixDailyPricesSql() {
  console.log('--- Generating SQL to Fix Daily Prices ---');
  
  // Clear/Create output file
  fs.writeFileSync(OUTPUT_FILE, `-- Daily Prices Fix Generated at ${new Date().toISOString()}\n\n`);

  // Fetch all cars that have an estimated_value_usd
  const { data: cars, error } = await supabase
    .from('cars')
    .select('id, estimated_value_usd, price_per_day')
    .not('estimated_value_usd', 'is', null)
    .gt('estimated_value_usd', 0)
    .is('deleted_at', null); // Only active cars

  if (error) {
    console.error('Error fetching cars:', error);
    return;
  }

  console.log(`Found ${cars.length} cars to fix daily prices for.`);

  let updatedCount = 0;

  for (const car of cars) {
    if (!car.estimated_value_usd) continue;

    const newPricePerDay = (car.estimated_value_usd * DAILY_RATE_FACTOR);
    
    // Round to 2 decimal places for currency
    const roundedPrice = parseFloat(newPricePerDay.toFixed(2));

    if (roundedPrice !== car.price_per_day) { // Only update if it's actually changing
        process.stdout.write(`Fixing Car ID ${car.id}: Estimated USD ${car.estimated_value_usd} -> New Daily Price $${roundedPrice} (was $${car.price_per_day || 'N/A'})... `);
        
        const sql = `UPDATE public.cars SET 
  price_per_day = ${roundedPrice}
WHERE id = '${car.id}';\n`;

        fs.appendFileSync(OUTPUT_FILE, sql);
        console.log('✅ Generated');
        updatedCount++;
    } else {
        process.stdout.write(`Skipping Car ID ${car.id}: Price already correct ($${roundedPrice})... `);
        console.log('⏩ Skipped');
    }
  }

  console.log('\n--- Daily Prices Fix Generation Complete ---');
  console.log(`SQL written to: ${OUTPUT_FILE}`);
  console.log(`Updated SQL statements generated: ${updatedCount}`);
}

generateFixDailyPricesSql();
