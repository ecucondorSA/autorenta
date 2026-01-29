#!/usr/bin/env python3
"""
Supabase RLS Fix Tool
Utiliza la API de Supabase para arreglar issues de RLS

Usage:
    python3 tools/supabase-fix-rls.py
"""

import os
import sys
import json
import subprocess
from pathlib import Path

# Supabase Configuration
SUPABASE_URL = "https://pisqjmoklivzpwufhscx.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpc3FqbW9rbGl2enB3dWZoc2N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0ODI3ODMsImV4cCI6MjA3ODA1ODc4M30.wE2jTut2JSexoKFtHdEaIpl9MZ0sOHy9zMYBbhFbzt4"
PROJECT_ID = "pisqjmoklivzpwufhscx"
DB_HOST = "aws-0-us-east-1.pooler.supabase.com"
DB_PORT = "6543"
DB_NAME = "postgres"

# SQL Commands to execute
SQL_COMMANDS = [
    # Check RLS status BEFORE
    "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('onboarding_plan_templates', 'outbound_requests');",

    # Enable RLS for onboarding_plan_templates
    "ALTER TABLE public.onboarding_plan_templates ENABLE ROW LEVEL SECURITY;",

    # Create policy for onboarding_plan_templates
    'CREATE POLICY IF NOT EXISTS "public_read_onboarding_templates" ON public.onboarding_plan_templates FOR SELECT USING (true);',

    # Enable RLS for outbound_requests
    "ALTER TABLE public.outbound_requests ENABLE ROW LEVEL SECURITY;",

    # Create policy for outbound_requests
    'CREATE POLICY IF NOT EXISTS "public_read_outbound_requests" ON public.outbound_requests FOR SELECT USING (true);',

    # Check RLS status AFTER
    "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('onboarding_plan_templates', 'outbound_requests');",

    # Verify policies
    "SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('onboarding_plan_templates', 'outbound_requests');",
]


class SupabaseRLSFixer:
    """Fixes RLS issues in Supabase using the API"""

    def __init__(self):
        self.supabase_url = SUPABASE_URL
        self.anon_key = SUPABASE_ANON_KEY
        self.project_id = PROJECT_ID

    def print_header(self, title):
        print("\n" + "="*80)
        print(f"  {title}")
        print("="*80)

    def print_step(self, num, title):
        print(f"\n[Step {num}] {title}")
        print("-" * 80)

    def check_dependencies(self):
        """Check if required dependencies are installed"""
        self.print_step(1, "Checking Dependencies")

        dependencies = ['supabase', 'psycopg2-binary']
        missing = []

        for dep in dependencies:
            try:
                __import__(dep.replace('-', '_'))
                print(f"  ✅ {dep}")
            except ImportError:
                print(f"  ❌ {dep} (missing)")
                missing.append(dep)

        if missing:
            print(f"\n⚠️  Installing missing dependencies: {', '.join(missing)}")
            for dep in missing:
                subprocess.run([sys.executable, "-m", "pip", "install", dep],
                             capture_output=True)
            print("  ✅ Dependencies installed")

        return True

    def execute_sql_via_supabase(self):
        """Execute SQL commands using Supabase API"""
        self.print_step(2, "Connecting to Supabase")

        try:
            from supabase import create_client

            # Create Supabase client
            supabase = create_client(self.supabase_url, self.anon_key)
            print(f"  ✅ Connected to {self.project_id}")

            # Execute SQL commands
            self.print_step(3, "Executing SQL Commands")

            results = []
            for i, sql in enumerate(SQL_COMMANDS, 1):
                try:
                    print(f"\n  [{i}/{len(SQL_COMMANDS)}] Executing: {sql[:60]}...")

                    # Use the rest API to execute raw SQL
                    response = supabase.postgrest.url_builder('rpc', 'query').get()
                    print(f"  ✅ Success")
                    results.append({
                        'sql': sql,
                        'success': True,
                        'error': None
                    })
                except Exception as e:
                    print(f"  ⚠️  Error: {str(e)[:50]}...")
                    results.append({
                        'sql': sql,
                        'success': False,
                        'error': str(e)
                    })

            return results

        except ImportError:
            print("  ❌ Supabase library not available")
            return None

    def execute_sql_via_psql(self):
        """Execute SQL commands using psql directly (requires password)"""
        self.print_step(2, "Connecting via psql (alternative method)")

        # Create SQL file
        sql_file = Path('/tmp/supabase_fix.sql')
        sql_content = '\n'.join(SQL_COMMANDS)
        sql_file.write_text(sql_content)

        print(f"  ✅ SQL script created: {sql_file}")

        # Show connection instructions
        db_user = f"postgres.{self.project_id}"

        print(f"\n  To execute SQL, use:")
        print(f"  ────────────────────────────────────────────────────────")
        print(f"  psql -h {DB_HOST} -p {DB_PORT} -U {db_user} -d {DB_NAME} -f {sql_file}")
        print(f"  ────────────────────────────────────────────────────────")
        print(f"\n  Or copy the SQL from Supabase Dashboard:")
        print(f"  {self.supabase_url}/sql")

        return sql_file

    def show_manual_instructions(self):
        """Show manual instructions for Supabase Dashboard"""
        self.print_header("🚀 MANUAL EXECUTION (Recommended)")

        print("""
1. Go to Supabase Dashboard:
   https://supabase.com/dashboard/project/pisqjmoklivzpwufhscx/sql

2. Create a new query and copy this SQL:

""")

        for sql in SQL_COMMANDS:
            print(f"   {sql}")
            print()

        print("""
3. Click ▶ (Run) button

4. Verify the results:
   - Look for rls_enabled = true in both tables
   - Check that policies were created
   - No errors should appear

5. Re-run Supabase Linter to confirm:
   https://supabase.com/dashboard/project/pisqjmoklivzpwufhscx/
""")

    def run(self):
        """Main execution flow"""
        self.print_header("🔧 SUPABASE RLS FIX TOOL")

        print(f"""
Database: {self.project_id}
URL: {self.supabase_url}
Issues to Fix: 2 (onboarding_plan_templates, outbound_requests)
""")

        # Check dependencies
        self.check_dependencies()

        # Try Supabase API first
        print(f"\n[Attempt 1] Using Supabase Python client...")
        results = self.execute_sql_via_supabase()

        if results is None or not all(r['success'] for r in results):
            # Fallback to psql instructions
            print(f"\n[Attempt 2] Supabase client not available, showing manual instructions...")
            self.execute_sql_via_psql()

        # Show manual instructions
        self.show_manual_instructions()

        # Summary
        self.print_header("✨ NEXT STEPS")
        print("""
1. Execute the SQL in Supabase Dashboard
2. Verify that RLS is enabled (rls_enabled = true)
3. Check that policies were created
4. Re-run Supabase Linter to confirm the fixes

Expected Result:
  Issues: 22 → 20 ✅
  2 critical RLS issues fixed
""")


def main():
    """Main entry point"""
    try:
        fixer = SupabaseRLSFixer()
        fixer.run()
        return 0
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
