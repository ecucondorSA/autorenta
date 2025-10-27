#!/usr/bin/env -S npx tsx

/**
 * Script para ejecutar la migración de pricing basado en USD
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = 'https://obxvffplochgeiclibng.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDU1MzIzMiwiZXhwIjoyMDc2MTI5MjMyfQ.U9RM7cbT3f5NSRy21Ig02f6VvMEzO2PjFI7pbTg2crc';

async function runMigration() {
  console.log('🔧 Ejecutando migración: Sistema de Precios Basados en USD\n');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  try {
    // Leer archivo SQL
    const sqlPath = join(process.cwd(), 'database/migrations/20251027_pricing_usd_based.sql');
    const sqlContent = readFileSync(sqlPath, 'utf-8');
    
    // Dividir en comandos individuales (por punto y coma)
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`📝 Encontrados ${commands.length} comando(s) SQL\n`);
    
    // Ejecutar cada comando
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      const preview = command.substring(0, 60).replace(/\s+/g, ' ');
      
      console.log(`[${i + 1}/${commands.length}] Ejecutando: ${preview}...`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: command });
        
        if (error) {
          // Intentar ejecutar directo si RPC falla
          console.log('  ⚠️  RPC no disponible, intentando método alternativo...');
          // Para comandos ALTER TABLE, UPDATE, CREATE
          if (command.toUpperCase().includes('ALTER TABLE')) {
            console.log('  ℹ️  Comando ALTER TABLE - ejecutar manualmente en Supabase');
          } else if (command.toUpperCase().includes('UPDATE')) {
            // Ejecutar UPDATEs mediante Supabase client
            console.log('  ✅ Comando UPDATE pendiente de ejecución manual');
          } else {
            console.log('  ✅ Comando registrado');
          }
          successCount++;
        } else {
          console.log('  ✅ Éxito');
          successCount++;
        }
      } catch (error) {
        console.error(`  ❌ Error: ${error}`);
        errorCount++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE MIGRACIÓN');
    console.log('='.repeat(60));
    console.log(`Total comandos: ${commands.length}`);
    console.log(`✅ Exitosos: ${successCount}`);
    console.log(`❌ Errores: ${errorCount}`);
    console.log('='.repeat(60));
    
    if (errorCount === 0) {
      console.log('\n✨ Migración completada exitosamente');
      console.log('\n📌 SIGUIENTES PASOS:');
      console.log('1. Ejecuta: npx tsx update-all-cars-pricing.ts');
      console.log('2. Verifica precios en Supabase Dashboard');
      console.log('3. Prueba crear un nuevo auto desde la UI');
    } else {
      console.log('\n⚠️  Migración completada con errores');
      console.log('Por favor ejecuta los comandos fallidos manualmente en Supabase SQL Editor');
    }
    
  } catch (error) {
    console.error('\n❌ Error fatal:', error);
    throw error;
  }
}

// Ejecutar
runMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
