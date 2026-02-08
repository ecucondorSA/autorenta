#!/usr/bin/env bun
/**
 * Enum Sync Validation Script
 *
 * Validates that TypeScript enum types match database enum values.
 * This prevents runtime errors from using invalid enum values in code.
 *
 * Usage: bun scripts/maintenance/validate-enum-sync.ts
 *
 * Exit codes:
 * 0 = All enums are in sync
 * 1 = Mismatches found (TypeScript has values not in DB, or vice versa)
 *
 * Example errors this catches:
 * - CarStatus has 'suspended' but DB has 'paused'
 * - PaymentStatus has 'authorized' but DB doesn't have it
 * - SubscriptionStatus has 'upgraded' but DB doesn't have it
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NG_APP_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   SUPABASE_URL or NG_APP_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// ============================================================================
// Types
// ============================================================================

interface EnumCheck {
  tsType: string;
  dbEnum: string;
  file: string;
  linePattern: RegExp;
}

interface EnumRow {
  enumlabel: string;
}

// ============================================================================
// Critical Enums to Validate
// ============================================================================

const CRITICAL_ENUMS: EnumCheck[] = [
  {
    tsType: 'CarStatus',
    dbEnum: 'car_status',
    file: 'apps/web/src/app/core/models/index.ts',
    linePattern: /export type CarStatus\s*=\s*([^;]+);/,
  },
  {
    tsType: 'BookingStatus',
    dbEnum: 'booking_status',
    file: 'apps/web/src/app/core/models/index.ts',
    linePattern: /export type BookingStatus\s*=\s*([^;]+);/,
  },
  {
    tsType: 'PaymentStatus',
    dbEnum: 'payment_status',
    file: 'apps/web/src/app/core/models/index.ts',
    linePattern: /export type PaymentStatus\s*=\s*([^;]+);/,
  },
  {
    tsType: 'SubscriptionStatus',
    dbEnum: 'subscription_status',
    file: 'apps/web/src/app/core/models/subscription.model.ts',
    linePattern: /export type SubscriptionStatus\s*=\s*([^;]+);/,
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get enum values from database via RPC call
 */
async function getDbEnumValues(enumName: string): Promise<Set<string>> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data, error } = await supabase.rpc('get_enum_values', { enum_name: enumName });

  if (error) {
    console.error(`❌ Failed to get enum values for ${enumName}:`, error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.error(`❌ Enum ${enumName} not found in database`);
    process.exit(1);
  }

  return new Set(data.map((row: EnumRow) => row.enumlabel));
}

/**
 * Extract enum values from TypeScript union type
 */
function getTsTypeValues(filePath: string, pattern: RegExp): Set<string> {
  const fullPath = resolve(process.cwd(), filePath);

  let content: string;
  try {
    content = readFileSync(fullPath, 'utf-8');
  } catch (error: any) {
    console.error(`❌ Failed to read file ${filePath}:`, error.message);
    process.exit(1);
  }

  const match = content.match(pattern);

  if (!match) {
    console.error(`❌ Pattern not found in ${filePath}`);
    console.error(`   Looking for pattern: ${pattern}`);
    process.exit(1);
  }

  // Extract union type values: 'draft' | 'active' | 'paused'
  const unionString = match[1];
  const values = unionString
    .split('|')
    .map((v) => v.trim().replace(/['"]/g, ''))
    .filter((v) => v.length > 0);

  return new Set(values);
}

/**
 * Compare TypeScript and database enum values
 */
function compareEnums(
  tsValues: Set<string>,
  dbValues: Set<string>,
  enumName: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Find values in TypeScript but NOT in database (will cause runtime errors)
  const inTsNotInDb = [...tsValues].filter((v) => !dbValues.has(v));
  if (inTsNotInDb.length > 0) {
    errors.push(`Values in TypeScript but NOT in DB: ${inTsNotInDb.join(', ')}`);
    errors.push('⚠️  These will cause runtime errors when used!');
  }

  // Find values in database but NOT in TypeScript (TypeScript code can't use them)
  const inDbNotInTs = [...dbValues].filter((v) => !tsValues.has(v));
  if (inDbNotInTs.length > 0) {
    errors.push(`Values in DB but NOT in TypeScript: ${inDbNotInTs.join(', ')}`);
    errors.push('⚠️  TypeScript code cannot use these values.');
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// Main Validation
// ============================================================================

async function main() {
  console.log('🔍 Enum Sync Validation');
  console.log('========================\n');
  console.log(`Database: ${SUPABASE_URL}\n`);

  let hasErrors = false;

  for (const check of CRITICAL_ENUMS) {
    console.log(`Checking ${check.tsType} (${check.dbEnum})...`);

    try {
      // Get values from both sources
      const dbValues = await getDbEnumValues(check.dbEnum);
      const tsValues = getTsTypeValues(check.file, check.linePattern);

      // Compare
      const { valid, errors } = compareEnums(tsValues, dbValues, check.tsType);

      if (!valid) {
        console.log(`  ❌ MISMATCH DETECTED`);
        errors.forEach((err) => console.log(`     ${err}`));
        hasErrors = true;
      } else {
        console.log(`  ✅ Synced (${tsValues.size} values: ${[...tsValues].join(', ')})`);
      }

      console.log('');
    } catch (error: any) {
      console.error(`  ❌ Error checking ${check.tsType}:`, error.message);
      hasErrors = true;
      console.log('');
    }
  }

  // ============================================================================
  // Final Report
  // ============================================================================

  if (hasErrors) {
    console.log('❌ ENUM SYNC VALIDATION FAILED\n');
    console.log('To fix:');
    console.log('1. Update DB enum first (migration):');
    console.log('   ALTER TYPE enum_name ADD VALUE \'new_value\';');
    console.log('   -- OR --');
    console.log('   Remove invalid values from TypeScript if they should not exist\n');
    console.log('2. Then update TypeScript type to match');
    console.log('3. Search and replace all usages of old values:');
    console.log('   git grep "old_value" apps/web/src\n');
    console.log('4. Re-run this script to verify:');
    console.log('   bun scripts/maintenance/validate-enum-sync.ts\n');
    process.exit(1);
  }

  console.log('✅ ALL ENUMS ARE IN SYNC!\n');
  console.log('No action required.\n');
  process.exit(0);
}

// ============================================================================
// Execute
// ============================================================================

main().catch((error) => {
  console.error('❌ Validation script crashed:', error);
  process.exit(1);
});
