#!/usr/bin/env tsx

/**
 * Script para auditar funciones SECURITY_DEFINER
 * Usa queries directas a information_schema y pg_catalog
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { writeFileSync } from 'fs';

config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NG_APP_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NG_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Faltan credenciales de Supabase');
  console.error('   Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface SecurityDefinerFunction {
  function_name: string;
  schema: string;
  risk_level: 'critical' | 'high' | 'medium';
  recommendation: string;
}

function calculateRisk(functionName: string): 'critical' | 'high' | 'medium' {
  const criticalPatterns = [
    'encrypt', 'decrypt', 'payout', 'withdraw', 'payment', 'transfer',
    'confirm_deposit', 'wallet_charge', 'wallet_lock', 'wallet_refund'
  ];
  const highPatterns = [
    'wallet', 'accounting', 'security', 'auth', 'validate', 'booking',
    'split', 'mercadopago', 'admin'
  ];

  const nameLower = functionName.toLowerCase();

  if (criticalPatterns.some(p => nameLower.includes(p))) {
    return 'critical';
  }

  if (highPatterns.some(p => nameLower.includes(p))) {
    return 'high';
  }

  return 'medium';
}

async function main() {
  console.log('🔍 Iniciando auditoría de funciones SECURITY_DEFINER...\n');

  try {
    // Query directa a pg_proc para obtener funciones SECURITY_DEFINER
    const query = `
      SELECT
        p.proname as function_name,
        n.nspname as schema_name,
        CASE
          WHEN p.prosecdef THEN 'DEFINER'
          ELSE 'INVOKER'
        END as security_type
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE p.prosecdef = true
        AND n.nspname = 'public'
      ORDER BY p.proname;
    `;

    console.log('📊 Consultando base de datos...');

    const { data, error } = await supabase.rpc('exec_sql', { query });

    if (error) {
      // Fallback: usar información del schema
      console.log('⚠️  RPC exec_sql no disponible, usando método alternativo...\n');
      await auditWithAlternativeMethod();
      return;
    }

    if (!data || data.length === 0) {
      console.log('✅ No se encontraron funciones SECURITY_DEFINER');
      return;
    }

    const functions: SecurityDefinerFunction[] = data.map((row: any) => ({
      function_name: row.function_name,
      schema: row.schema_name,
      risk_level: calculateRisk(row.function_name),
      recommendation: 'Auditar función para validación de roles'
    }));

    processAndSaveResults(functions);

  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\n⚠️  Intentando método alternativo...\n');
    await auditWithAlternativeMethod();
  }
}

async function auditWithAlternativeMethod() {
  console.log('📊 Usando lista conocida de funciones SECURITY_DEFINER...\n');

  // Lista conocida de funciones SECURITY_DEFINER del proyecto
  const knownFunctions: SecurityDefinerFunction[] = [
    // Wallet functions (CRÍTICAS)
    { function_name: 'wallet_confirm_deposit_admin', schema: 'public', risk_level: 'critical', recommendation: '✅ YA AUDITADA - Tiene validación de roles' },
    { function_name: 'wallet_lock_rental_payment', schema: 'public', risk_level: 'critical', recommendation: 'Auditar - Bloqueo de fondos' },
    { function_name: 'wallet_charge_rental', schema: 'public', risk_level: 'critical', recommendation: 'Auditar - Cargo de alquiler' },
    { function_name: 'wallet_refund', schema: 'public', risk_level: 'critical', recommendation: 'Auditar - Reembolsos' },
    { function_name: 'wallet_transfer_to_owner', schema: 'public', risk_level: 'critical', recommendation: 'Auditar - Transferencias a owners' },
    { function_name: 'wallet_withdraw', schema: 'public', risk_level: 'critical', recommendation: 'Auditar - Retiros' },

    // Payment functions (CRÍTICAS)
    { function_name: 'process_payment', schema: 'public', risk_level: 'critical', recommendation: 'Auditar - Procesamiento de pagos' },
    { function_name: 'split_payment', schema: 'public', risk_level: 'critical', recommendation: 'Auditar - División de pagos' },
    { function_name: 'process_mercadopago_webhook', schema: 'public', risk_level: 'critical', recommendation: 'Auditar - Webhooks de MercadoPago' },

    // Booking functions (ALTAS)
    { function_name: 'request_booking', schema: 'public', risk_level: 'high', recommendation: 'Auditar - Creación de bookings' },
    { function_name: 'approve_booking', schema: 'public', risk_level: 'high', recommendation: 'Auditar - Aprobación de bookings' },
    { function_name: 'cancel_booking', schema: 'public', risk_level: 'high', recommendation: 'Auditar - Cancelación de bookings' },

    // Accounting functions (ALTAS)
    { function_name: 'create_journal_entry', schema: 'public', risk_level: 'high', recommendation: 'Auditar - Entradas contables' },
    { function_name: 'close_accounting_period', schema: 'public', risk_level: 'high', recommendation: 'Auditar - Cierre de períodos' },
  ];

  processAndSaveResults(knownFunctions);
}

function processAndSaveResults(functions: SecurityDefinerFunction[]) {
  console.log(`✅ Encontradas ${functions.length} funciones SECURITY_DEFINER\n`);

  // Clasificar por riesgo
  const critical = functions.filter(f => f.risk_level === 'critical');
  const high = functions.filter(f => f.risk_level === 'high');
  const medium = functions.filter(f => f.risk_level === 'medium');

  console.log('📈 Clasificación por riesgo:');
  console.log(`   🔴 CRÍTICAS: ${critical.length}`);
  console.log(`   🟡 ALTAS: ${high.length}`);
  console.log(`   🟢 MEDIAS: ${medium.length}\n`);

  // Mostrar top 10 críticas
  console.log('🔴 TOP 10 FUNCIONES CRÍTICAS:\n');
  critical.slice(0, 10).forEach((fn, idx) => {
    console.log(`${idx + 1}. ${fn.schema}.${fn.function_name}`);
    console.log(`   Riesgo: ${fn.risk_level.toUpperCase()}`);
    console.log(`   Recomendación: ${fn.recommendation}\n`);
  });

  // Generar SQL de remediación
  const remediationSQL = generateRemediationSQL(critical);

  // Guardar reporte
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total_functions: functions.length,
      critical: critical.length,
      high: high.length,
      medium: medium.length,
      audited: 1, // wallet_confirm_deposit_admin
      pending: critical.length - 1
    },
    critical_functions: critical.map(f => ({
      name: f.function_name,
      schema: f.schema,
      risk_level: f.risk_level,
      recommendation: f.recommendation,
      status: f.function_name === 'wallet_confirm_deposit_admin' ? 'AUDITADA' : 'PENDIENTE'
    })),
    high_functions: high.map(f => ({
      name: f.function_name,
      schema: f.schema,
      risk_level: f.risk_level,
      recommendation: f.recommendation
    })),
    next_steps: [
      `Auditar ${critical.length - 1} funciones críticas restantes`,
      `Tiempo estimado: ${Math.ceil((critical.length - 1) * 10 / 60)} horas`,
      'Aplicar validación de roles en cada función',
      'Ejecutar tests para verificar funcionalidad'
    ]
  };

  writeFileSync(
    'SECURITY_DEFINER_AUDIT_REPORT.json',
    JSON.stringify(report, null, 2)
  );

  writeFileSync(
    'SECURITY_DEFINER_REMEDIATION.sql',
    remediationSQL
  );

  console.log('✅ Reporte guardado en:');
  console.log('   - SECURITY_DEFINER_AUDIT_REPORT.json');
  console.log('   - SECURITY_DEFINER_REMEDIATION.sql\n');

  console.log('🎯 PRÓXIMOS PASOS:\n');
  console.log('1. Revisar SECURITY_DEFINER_AUDIT_REPORT.json');
  console.log('2. Revisar SECURITY_DEFINER_REMEDIATION.sql');
  console.log('3. Aplicar validaciones de roles en top 5 funciones críticas');
  console.log('4. Ejecutar tests para verificar funcionalidad');
  console.log('5. Aplicar SQL en Supabase\n');

  console.log(`⏱️  Tiempo estimado: ${Math.ceil((critical.length - 1) * 10 / 60)} horas (${critical.length - 1} funciones × 10 min)\n`);
  console.log(`📊 Progreso actual: 1/${critical.length} funciones críticas auditadas (${Math.round(1 / critical.length * 100)}%)\n`);
}

function generateRemediationSQL(criticalFunctions: SecurityDefinerFunction[]): string {
  let sql = `-- ============================================
-- REMEDIACIÓN: Funciones SECURITY_DEFINER Críticas
-- Fecha: ${new Date().toISOString().split('T')[0]}
-- Total funciones: ${criticalFunctions.length}
-- Auditadas: 1 (wallet_confirm_deposit_admin)
-- Pendientes: ${criticalFunctions.length - 1}
-- ============================================

-- INSTRUCCIONES:
-- 1. Revisar cada función individualmente
-- 2. Agregar validación de roles según el patrón
-- 3. Ejecutar tests antes de aplicar
-- 4. Aplicar en Supabase

`;

  criticalFunctions.forEach((fn, idx) => {
    if (fn.function_name === 'wallet_confirm_deposit_admin') {
      sql += `
-- ============================================
-- ${idx + 1}. ${fn.function_name} ✅ AUDITADA
-- Riesgo: ${fn.risk_level.toUpperCase()}
-- Estado: COMPLETADA
-- ============================================

-- Esta función YA tiene validación de roles implementada.
-- Ver: supabase/migrations/20251118_wallet_constraints_and_admin_validation_p0.sql

`;
      return;
    }

    sql += `
-- ============================================
-- ${idx + 1}. ${fn.function_name}
-- Riesgo: ${fn.risk_level.toUpperCase()}
-- Estado: PENDIENTE
-- ============================================

-- PATRÓN DE VALIDACIÓN (ajustar según función):
CREATE OR REPLACE FUNCTION ${fn.schema}.${fn.function_name}(...)
SECURITY DEFINER
AS $$
DECLARE
  v_caller_role TEXT;
  v_user_id UUID;
BEGIN
  -- ⭐ VALIDACIÓN P0: Verificar rol del caller
  SELECT role, id INTO v_caller_role, v_user_id
  FROM profiles
  WHERE id = auth.uid();

  -- Ajustar condición según función:
  -- Para funciones admin: v_caller_role != 'admin'
  -- Para funciones owner: v_caller_role NOT IN ('admin', 'owner', 'ambos')
  -- Para funciones wallet: verificar que user_id = auth.uid()

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Ejemplo para funciones de wallet:
  -- IF v_caller_role != 'admin' AND p_user_id != v_user_id THEN
  --   RAISE EXCEPTION 'Solo puedes operar tu propia wallet';
  -- END IF;

  -- ... resto de la lógica original ...
END;
$$;

-- COMENTARIO:
COMMENT ON FUNCTION ${fn.schema}.${fn.function_name} IS
  'P0 Security: Requiere validación de roles. Auditado ${new Date().toISOString().split('T')[0]}';

`;
  });

  sql += `
-- ============================================
-- VERIFICACIÓN POST-APLICACIÓN
-- ============================================

-- Verificar que las funciones tienen validación:
SELECT
  p.proname as function_name,
  CASE
    WHEN pg_get_functiondef(p.oid) LIKE '%v_caller_role%'
      AND pg_get_functiondef(p.oid) LIKE '%profiles%'
    THEN '✅ Validación implementada'
    ELSE '❌ Validación NO implementada'
  END as status
FROM pg_proc p
WHERE p.proname IN (${criticalFunctions.map(f => `'${f.function_name}'`).join(', ')})
ORDER BY p.proname;

-- ============================================
-- AUDIT LOG
-- ============================================

INSERT INTO wallet_audit_log (user_id, action, details)
VALUES (
  NULL,
  'security_definer_audit_${new Date().toISOString().split('T')[0]}',
  jsonb_build_object(
    'total_functions', ${criticalFunctions.length},
    'audited', 1,
    'pending', ${criticalFunctions.length - 1},
    'timestamp', NOW()
  )
);
`;

  return sql;
}

main().catch(console.error);
