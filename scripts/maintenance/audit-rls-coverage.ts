#!/usr/bin/env bun
/**
 * RLS Coverage Audit Script
 *
 * Checks for tables and storage buckets without proper RLS (Row Level Security) policies.
 * This prevents unauthorized data access and ensures all user data is protected.
 *
 * Usage: bun scripts/maintenance/audit-rls-coverage.ts
 *
 * Exit codes:
 * 0 = Full RLS coverage (all tables and buckets protected)
 * 1 = Missing coverage (warnings found)
 *
 * Example issues this catches:
 * - Tables without RLS enabled (anyone can read/write)
 * - Tables with RLS enabled but no policies (nobody can access)
 * - Storage buckets without policies (uploads will fail)
 */

import { createClient } from '@supabase/supabase-js';

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

interface UnprotectedTable {
  table_schema: string;
  table_name: string;
  table_type?: string;
  rls_enabled?: boolean;
}

interface UnprotectedBucket {
  bucket_name: string;
  is_public: boolean;
}

interface CoverageReport {
  tables: {
    total: number;
    with_rls: number;
    with_policies: number;
    coverage_percent: number;
  };
  buckets: {
    total: number;
    with_policies: number;
    coverage_percent: number;
  };
  generated_at: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

async function getCoverageSummary(): Promise<CoverageReport | null> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data, error } = await supabase.rpc('get_rls_coverage_report');

  if (error) {
    console.error('Failed to get coverage summary:', error.message);
    return null;
  }

  return data as CoverageReport;
}

async function getTablesWithoutRLS(): Promise<UnprotectedTable[]> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data, error } = await supabase.rpc('get_tables_without_rls');

  if (error) {
    console.error('Failed to get tables without RLS:', error.message);
    return [];
  }

  return data as UnprotectedTable[];
}

async function getTablesMissingPolicies(): Promise<UnprotectedTable[]> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data, error } = await supabase.rpc('get_tables_missing_policies');

  if (error) {
    console.error('Failed to get tables missing policies:', error.message);
    return [];
  }

  return data as UnprotectedTable[];
}

async function getBucketsWithoutPolicies(): Promise<UnprotectedBucket[]> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data, error } = await supabase.rpc('get_buckets_without_policies');

  if (error) {
    console.error('Failed to get buckets without policies:', error.message);
    return [];
  }

  return data as UnprotectedBucket[];
}

// ============================================================================
// Main Audit
// ============================================================================

async function main() {
  console.log('🔒 RLS Coverage Audit');
  console.log('=====================\n');
  console.log(`Database: ${SUPABASE_URL}\n`);

  let hasIssues = false;

  // ============================================================================
  // 1. Coverage Summary
  // ============================================================================

  const summary = await getCoverageSummary();

  if (summary) {
    console.log('📊 Coverage Summary:');
    console.log(
      `   Tables: ${summary.tables.with_policies}/${summary.tables.total} (${summary.tables.coverage_percent}%)`
    );
    console.log(
      `   Buckets: ${summary.buckets.with_policies}/${summary.buckets.total} (${summary.buckets.coverage_percent}%)\n`
    );
  }

  // ============================================================================
  // 2. Tables without RLS enabled
  // ============================================================================

  const unprotectedTables = await getTablesWithoutRLS();

  if (unprotectedTables.length > 0) {
    console.log('❌ Tables WITHOUT RLS enabled:');
    console.log('   (These tables are accessible without any restrictions!)\n');
    unprotectedTables.forEach((t) => {
      console.log(`   - public.${t.table_name}`);
    });
    console.log('\n   Action: Add "ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY;"\n');
    hasIssues = true;
  }

  // ============================================================================
  // 3. Tables with RLS but no policies
  // ============================================================================

  const missingPolicies = await getTablesMissingPolicies();

  if (missingPolicies.length > 0) {
    console.log('⚠️  Tables WITH RLS but NO policies:');
    console.log('   (RLS is enabled but no policies defined - nobody can access!)\n');
    missingPolicies.forEach((t) => {
      console.log(`   - public.${t.table_name}`);
    });
    console.log('\n   Action: Create policies for SELECT, INSERT, UPDATE, DELETE\n');
    hasIssues = true;
  }

  // ============================================================================
  // 4. Storage buckets without policies
  // ============================================================================

  const bucketsWithoutPolicies = await getBucketsWithoutPolicies();

  if (bucketsWithoutPolicies.length > 0) {
    console.log('⚠️  Storage buckets WITHOUT policies:');
    console.log('   (Users cannot upload/access files in these buckets)\n');
    bucketsWithoutPolicies.forEach((b) => {
      console.log(`   - ${b.bucket_name} (public: ${b.is_public})`);
    });
    console.log('\n   Action: Create policies on storage.objects for this bucket\n');
    hasIssues = true;
  }

  // ============================================================================
  // 5. Final Report
  // ============================================================================

  if (!hasIssues) {
    console.log('✅ ALL TABLES AND BUCKETS HAVE PROPER RLS COVERAGE!');
    console.log('   No action required.\n');
    process.exit(0);
  }

  console.log('📝 Recommendations:');
  console.log('   1. Review each unprotected resource');
  console.log('   2. Determine if it needs RLS (most user data does)');
  console.log('   3. Create migration with RLS policies');
  console.log('   4. Use templates from AGENTS-2.md section 19.1\n');
  console.log('   5. Re-run this script to verify:\n');
  console.log('      bun scripts/maintenance/audit-rls-coverage.ts\n');

  console.log('❌ RLS COVERAGE AUDIT FAILED\n');
  process.exit(1);
}

// ============================================================================
// Execute
// ============================================================================

main().catch((error) => {
  console.error('❌ Audit script crashed:', error);
  process.exit(1);
});
