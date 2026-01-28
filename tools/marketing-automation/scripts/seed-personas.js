#!/usr/bin/env node

/**
 * Seed Personas to Database
 * 
 * Popula la tabla marketing_personas con los 32 perfiles desde personas.json
 */

import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function loadPersonas() {
    const personasPath = path.join(__dirname, '../config/personas.json');
    const data = await fs.readFile(personasPath, 'utf-8');
    return JSON.parse(data);
}

async function seedPersonas() {
    console.log('🌱 Starting persona seeding...\n');

    try {
        // Cargar personas desde JSON
        const personas = await loadPersonas();
        console.log(`📋 Loaded ${personas.length} personas from config\n`);

        // Verificar si ya existen personas
        const { count } = await supabase
            .from('marketing_personas')
            .select('*', { count: 'exact', head: true });

        if (count && count > 0) {
            console.log(`⚠️  Warning: ${count} personas already exist in database`);
            const readline = await import('readline');
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
            });

            const answer = await new Promise(resolve => {
                rl.question('Continue and add more? (y/n): ', resolve);
            });
            rl.close();

            if (answer.toLowerCase() !== 'y') {
                console.log('❌ Seeding cancelled');
                process.exit(0);
            }
        }

        // Insertar cada persona
        let successCount = 0;
        let errorCount = 0;

        for (const persona of personas) {
            const personaData = {
                name: persona.name,
                profile_metadata: persona.profile_metadata,
                facebook_account_id: null, // Configurar manualmente después
                instagram_account_id: null,
                twitter_account_id: null,
                cookies_encrypted: null, // Agregar cookies manualmente después
                proxy_assigned: null,
                is_active: true,
            };

            const { data, error } = await supabase
                .from('marketing_personas')
                .insert(personaData)
                .select()
                .single();

            if (error) {
                console.error(`❌ Error inserting ${persona.name}:`, error.message);
                errorCount++;
            } else {
                console.log(`✅ Inserted ${persona.name} (${data.id})`);
                successCount++;
            }
        }

        console.log('\n📊 Summary:');
        console.log(`   ✅ Success: ${successCount}`);
        console.log(`   ❌ Errors: ${errorCount}`);
        console.log(`   📝 Total: ${personas.length}\n`);

        if (successCount === personas.length) {
            console.log('🎉 All personas seeded successfully!');
        } else {
            console.log('⚠️  Some personas failed to seed. Check errors above.');
        }

    } catch (error) {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
    seedPersonas().then(() => process.exit(0));
}

export { seedPersonas };
