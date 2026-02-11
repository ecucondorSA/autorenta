// Config — use env vars, never hardcode keys
const SUPABASE_URL = process.env.SUPABASE_URL || "https://aceacpaockyxgogxsfyc.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
if (!SUPABASE_ANON_KEY) { console.error('SUPABASE_ANON_KEY env var required'); process.exit(1); }

async function getFipeValueRealtime(brand, model, year, country = 'AR') {
  console.log(`
--- Fetching FIPE Value for: ${brand} ${model} (${year}) [${country}] ---`);
  const url = `${SUPABASE_URL}/functions/v1/get-fipe-value`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        brand,
        model,
        year,
        country
      }),
    });

    if (!response.ok) {
      console.error(`Error: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error('Response:', text);
      return null;
    }

    const result = await response.json();
    console.log('Success:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('Fetch error:', error);
    return null;
  }
}

async function getPublicBrands() {
    console.log('\n--- Fetching Public Brands (Parallelum API) ---');
    try {
        const res = await fetch('https://parallelum.com.br/fipe/api/v2/cars/brands');
        const data = await res.json();
        console.log(`Found ${data.length} brands.`);
        // Show first 5
        console.log('Sample:', data.slice(0, 5));
        return data;
    } catch (e) {
        console.error('Error fetching brands:', e);
    }
}

async function getPublicModels(brandCode) {
    console.log(`\n--- Fetching Models for Brand Code: ${brandCode} ---`);
    try {
        const res = await fetch(`https://parallelum.com.br/fipe/api/v2/cars/brands/${brandCode}/models`);
        const data = await res.json();
        console.log(`Found ${data.length} models.`);
        // Show first 5
        console.log('Sample:', data.slice(0, 5));
        return data;
    } catch (e) {
        console.error('Error fetching models:', e);
    }
}

// Main execution
(async () => {
    // 1. List some brands
    const brands = await getPublicBrands();
    
    // 2. Pick 'Toyota' (usually code 56 or similar, let's find it)
    const toyota = brands.find(b => b.name.toLowerCase() === 'toyota');
    if (toyota) {
        console.log(`Selected Brand: ${toyota.name} (Code: ${toyota.code})`);
        
        // 3. Get models for Toyota
        const models = await getPublicModels(toyota.code);
        
        // 4. Try to find 'Corolla'
        const corolla = models.find(m => m.name.toLowerCase().includes('corolla xei 2.0') && m.name.includes('Flex'));
        
        if (corolla) {
            console.log(`Selected Model: ${corolla.name}`);
            
            // 5. Get Price via Supabase Edge Function
            // Note: The Edge Function might expect the EXACT name or handle it.
            // Let's try with the exact name found from the public API.
            await getFipeValueRealtime(toyota.name, corolla.name, 2022);
        } else {
            console.log('Could not find specific Corolla model in public list, trying generic query...');
            await getFipeValueRealtime('Toyota', 'Corolla XEi 2.0 Flex 16V Aut.', 2022);
        }
    } else {
        console.log('Toyota not found?');
    }

})();
