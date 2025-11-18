import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../../.env') });

export interface SecurityDefinerFunction {
  function_name: string;
  schema: string;
  risk_level: 'critical' | 'high' | 'medium';
  recommendation: string;
}

export interface RLSPolicy {
  table_name: string;
  has_rls: boolean;
  policies_count: number;
  policy_names: string[];
}

export interface IndexOpportunity {
  table_name: string;
  seq_scans: number;
  index_scan_ratio: number;
  suggested_indexes: string[];
}

export interface SchemaAnalysis {
  total_tables: number;
  total_functions: number;
  security_issues: number;
  rls_gaps: number;
  missing_indexes: number;
}

export class AuditClient {
  private client;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials in environment variables');
    }

    this.client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  /**
   * Audit functions using SECURITY DEFINER
   */
  async auditSecurityDefinerFunctions(): Promise<SecurityDefinerFunction[]> {
    const { data, error } = await this.client.rpc('get_security_definer_functions');

    if (error) {
      console.error('Error auditing SECURITY DEFINER functions:', error);
      throw error;
    }

    // If RPC doesn't exist, fallback to information_schema query
    if (!data) {
      return this.querySecurityDefinerFunctions();
    }

    return data.map((fn: any) => ({
      function_name: fn.function_name,
      schema: fn.schema,
      risk_level: this.calculateFunctionRisk(fn.function_name),
      recommendation: `Audit function for least privilege; consider SECURITY INVOKER or set search_path/owner`
    }));
  }

  /**
   * Query SECURITY DEFINER functions via SQL
   */
  private async querySecurityDefinerFunctions(): Promise<SecurityDefinerFunction[]> {
    const { data, error } = await this.client
      .from('information_schema.routines')
      .select('*')
      .eq('security_type', 'DEFINER');

    if (error) {
      console.error('Error querying security definer functions:', error);
      return [];
    }

    return (data || []).map((fn: any) => ({
      function_name: fn.routine_name,
      schema: fn.routine_schema,
      risk_level: this.calculateFunctionRisk(fn.routine_name),
      recommendation: `Audit function for least privilege; consider SECURITY INVOKER or set search_path/owner`
    }));
  }

  /**
   * Calculate risk level based on function name patterns
   */
  private calculateFunctionRisk(functionName: string): 'critical' | 'high' | 'medium' {
    const criticalPatterns = ['encrypt', 'decrypt', 'payout', 'withdraw', 'payment', 'transfer'];
    const highPatterns = ['wallet', 'accounting', 'security', 'auth', 'validate'];

    const nameLower = functionName.toLowerCase();

    if (criticalPatterns.some(p => nameLower.includes(p))) {
      return 'critical';
    }

    if (highPatterns.some(p => nameLower.includes(p))) {
      return 'high';
    }

    return 'medium';
  }

  /**
   * Audit RLS policies on tables
   */
  async auditRLSPolicies(): Promise<RLSPolicy[]> {
    const { data: tables, error: tablesError } = await this.client
      .from('information_schema.tables')
      .select('*')
      .eq('table_schema', 'public');

    if (tablesError) {
      console.error('Error fetching tables:', tablesError);
      return [];
    }

    const policies: RLSPolicy[] = [];

    for (const table of (tables || []) as any[]) {
      const tableName = table.table_name;

      // Check if RLS is enabled
      const { data: rlsData, error: rlsError } = await this.client
        .from('information_schema.table_privileges')
        .select('*')
        .eq('table_name', tableName);

      if (rlsError) continue;

      // Count policies
      const { count, error: countError } = await this.client
        .from('pg_policies')
        .select('*', { count: 'exact', head: true })
        .eq('tablename', tableName);

      if (countError) {
        policies.push({
          table_name: tableName,
          has_rls: false,
          policies_count: 0,
          policy_names: []
        });
        continue;
      }

      const { data: policyNames, error: nameError } = await this.client
        .from('pg_policies')
        .select('policyname')
        .eq('tablename', tableName);

      policies.push({
        table_name: tableName,
        has_rls: (count || 0) > 0,
        policies_count: count || 0,
        policy_names: (policyNames || []).map((p: any) => p.policyname)
      });
    }

    return policies;
  }

  /**
   * Find tables with high sequential scans
   */
  async findHighSeqScans(threshold: number = 1000): Promise<IndexOpportunity[]> {
    const { data, error } = await this.client.rpc('get_table_scan_statistics', {
      min_seq_scans: threshold
    });

    if (error) {
      console.error('Error getting scan statistics:', error);
      return this.queryHighSeqScansManually(threshold);
    }

    return (data || []).map((stat: any) => ({
      table_name: stat.table_name,
      seq_scans: stat.seq_scans,
      index_scan_ratio: stat.seq_scans > 0 ? stat.idx_scans / stat.seq_scans : 0,
      suggested_indexes: this.suggestIndexes(stat.table_name)
    }));
  }

  /**
   * Manual query for high seq scans
   */
  private async queryHighSeqScansManually(threshold: number): Promise<IndexOpportunity[]> {
    // This would require access to pg_stat_user_tables
    // For now, return empty array or mock data
    console.warn('pg_stat_user_tables not accessible. Returning empty results.');
    return [];
  }

  /**
   * Suggest indexes based on table structure
   */
  private suggestIndexes(tableName: string): string[] {
    const suggestions: Record<string, string[]> = {
      'bookings': [
        'CREATE INDEX idx_bookings_status_dates ON bookings(status, start_date, end_date)',
        'CREATE INDEX idx_bookings_car_id ON bookings(car_id)',
        'CREATE INDEX idx_bookings_renter_id ON bookings(renter_id)'
      ],
      'cars': [
        'CREATE INDEX idx_cars_status ON cars(status)',
        'CREATE INDEX idx_cars_owner_id ON cars(owner_id)'
      ],
      'profiles': [
        'CREATE INDEX idx_profiles_email ON profiles(email)',
        'CREATE INDEX idx_profiles_role ON profiles(role)'
      ],
      'wallet_transactions': [
        'CREATE INDEX idx_wallet_tx_user_id_date ON wallet_transactions(user_id, created_at)',
        'CREATE INDEX idx_wallet_tx_status ON wallet_transactions(status)'
      ]
    };

    return suggestions[tableName] || [];
  }

  /**
   * Comprehensive schema analysis
   */
  async analyzeSchema(): Promise<SchemaAnalysis> {
    const [functions, policies, scans] = await Promise.all([
      this.auditSecurityDefinerFunctions(),
      this.auditRLSPolicies(),
      this.findHighSeqScans()
    ]);

    const rlsGaps = policies.filter(p => !p.has_rls || p.policies_count === 0).length;
    const missingIndexes = scans.filter(s => s.seq_scans > 10000).length;

    return {
      total_tables: policies.length,
      total_functions: functions.length,
      security_issues: functions.filter(f => f.risk_level === 'critical').length,
      rls_gaps: rlsGaps,
      missing_indexes: missingIndexes
    };
  }

  /**
   * Generate RLS policy boilerplate for a table
   */
  generateRLSPolicyBoilerplate(tableName: string, userId: string = 'auth.uid()'): string {
    return `-- RLS Policies for ${tableName}

-- Enable RLS
ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;

-- Select policy: users can only see their own records
CREATE POLICY "Users can view their own ${tableName}" ON ${tableName}
  FOR SELECT USING (user_id = ${userId});

-- Insert policy: users can only insert their own records
CREATE POLICY "Users can insert own ${tableName}" ON ${tableName}
  FOR INSERT WITH CHECK (user_id = ${userId});

-- Update policy: users can only update their own records
CREATE POLICY "Users can update own ${tableName}" ON ${tableName}
  FOR UPDATE USING (user_id = ${userId}) WITH CHECK (user_id = ${userId});

-- Delete policy: users can only delete their own records
CREATE POLICY "Users can delete own ${tableName}" ON ${tableName}
  FOR DELETE USING (user_id = ${userId});

-- Admin bypass (if needed)
CREATE POLICY "Admins have full access" ON ${tableName}
  USING ((SELECT role FROM profiles WHERE id = ${userId}) = 'admin');
`;
  }

  /**
   * Generate index creation SQL
   */
  generateIndexSQL(tableName: string): string[] {
    const suggestions = this.suggestIndexes(tableName);
    return suggestions;
  }

  /**
   * Get detailed audit report
   */
  async generateAuditReport(): Promise<any> {
    const [analysis, securityIssues, rlsGaps, highScans] = await Promise.all([
      this.analyzeSchema(),
      this.auditSecurityDefinerFunctions(),
      this.auditRLSPolicies(),
      this.findHighSeqScans()
    ]);

    return {
      summary: analysis,
      security_definer_functions: securityIssues.length,
      critical_functions: securityIssues.filter(f => f.risk_level === 'critical'),
      rls_tables_without_policies: rlsGaps.filter(p => !p.has_rls || p.policies_count === 0),
      high_seq_scans: highScans.filter(s => s.seq_scans > 10000),
      recommendations: {
        security: `Review and audit ${securityIssues.length} SECURITY DEFINER functions`,
        rls: `Create RLS policies for ${rlsGaps.filter(p => !p.has_rls).length} tables`,
        performance: `Add indexes to ${highScans.filter(s => s.seq_scans > 10000).length} tables with high sequential scans`
      }
    };
  }
}
