// Config
const SUPABASE_URL = "https://pisqjmoklivzpwufhscx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpc3FqbW9rbGl2enB3dWZoc2N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0ODI3ODMsImV4cCI6MjA3ODA1ODc4M30.wE2jTut2JSexoKFtHdEaIpl9MZ0sOHy9zMYBbhFbzt4";

// Public API for listing models
async function getFipeBrands() {
    const res = await fetch('https://parallelum.com.br/fipe/api/v2/cars/brands');
    return res.json();
}

async function getFipeModels(brandCode) {
    const res = await fetch(`https://parallelum.com.br/fipe/api/v2/cars/brands/${brandCode}/models`);
    return res.json();
}

async function getFipeModelYears(brandCode, modelCode) {
    const res = await fetch(`https://parallelum.com.br/fipe/api/v2/cars/brands/${brandCode}/models/${modelCode}/years`);
    return res.json();
}

async function getFipeValueExact(brandCode, modelCode, yearCode) {
    const res = await fetch(`https://parallelum.com.br/fipe/api/v2/cars/brands/${brandCode}/models/${modelCode}/years/${yearCode}`);
    if (!res.ok) return null;
    return res.json();
}

const TARGETS = [
    // Volkswagen Gol (2021)
    { dbBrand: 'Volkswagen', fipeBrand: 'VW - VolksWagen', modelName: 'Gol', year: 2021 },
    // Chevrolet Cruze (2025)
    { dbBrand: 'Chevrolet', fipeBrand: 'GM - Chevrolet', modelName: 'Cruze', year: 2024 }, // FIPE year proxy
    // Volkswagen Gol (2019)
    { dbBrand: 'Volkswagen', fipeBrand: 'VW - VolksWagen', modelName: 'Gol', year: 2019 },
];

async function explore() {
    console.log('--- Re-Exploring FIPE Models for failed cars ---');
    const allBrands = await getFipeBrands();

    for (const target of TARGETS) {
        console.log(`\n🔎 Looking for: ${target.dbBrand} ${target.modelName} (year: ${target.year}) in FIPE as "${target.fipeBrand}"...`);
        
        // 1. Find FIPE Brand
        const fipeBrandObj = allBrands.find(b => b.name === target.fipeBrand);

        if (!fipeBrandObj) {
            console.log(`❌ FIPE Brand "${target.fipeBrand}" not found.`);
            continue;
        }

        // 2. Get all Models for the FIPE Brand
        const allModelsForBrand = await getFipeModels(fipeBrandObj.code);
        
        // 3. Filter models by the general name (e.g., "Gol" or "Cruze")
        const matchingModels = allModelsForBrand.filter(m => m.name.toLowerCase().includes(target.modelName.toLowerCase()));
        
        if (matchingModels.length === 0) {
            console.log(`❌ No models found containing "${target.modelName}" for brand "${fipeBrandObj.name}".`);
            continue;
        }

        console.log(`Found ${matchingModels.length} potential FIPE models for "${target.modelName}" in "${fipeBrandObj.name}".`);
        console.log('Checking for year compatibility...');

        let foundExactModelForYear = false;
        for (const modelCandidate of matchingModels) {
            process.stdout.write(`  - Trying model "${modelCandidate.name}" (Code: ${modelCandidate.code}) for year ${target.year}... `);
            const yearsForModel = await getFipeModelYears(fipeBrandObj.code, modelCandidate.code);
            console.log('Years for model:', modelCandidate.name, yearsForModel); // Debug log
            const yearMatch = yearsForModel.find(y => parseInt(y.code.split('-')[0]) === target.year);

            if (yearMatch) {
                const fipeValue = await getFipeValueExact(fipeBrandObj.code, modelCandidate.code, yearMatch.code);
                if (fipeValue) {
                    console.log(`✅ EXACT FIPE Value found for ${modelCandidate.name} (${target.year}): ${JSON.stringify(fipeValue.Valor)}`);
                    foundExactModelForYear = true;
                } else {
                     console.log(`❌ FIPE Value not found for this specific year/model. Year code: ${yearMatch.code}`);
                }
            } else {
                console.log(`❌ Year ${target.year} not found for this model. Available years: ${yearsForModel.map(y => y.name).join(', ')}`);
            }
            if (foundExactModelForYear) break; // If we found one, we can stop for this car
        }

        if (!foundExactModelForYear) {
            console.log(`\n⚠️ Could not find an exact FIPE model for ${target.dbBrand} ${target.modelName} for year ${target.year}.`);
            console.log('Top 5 models available:');
            matchingModels.slice(0, 5).forEach(m => console.log(`  - ${m.name}`));
        }
    }
}

explore();
