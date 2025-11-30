import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

console.log('DEBUG: NG_APP_SUPABASE_URL is set:', !!process.env.NG_APP_SUPABASE_URL);
console.log('DEBUG: SUPABASE_SERVICE_ROLE_KEY is set:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('DEBUG: NG_APP_SUPABASE_ANON_KEY is set:', !!process.env.NG_APP_SUPABASE_ANON_KEY);

import { McpTestClient } from '../checkpoint/mcp-client';

async function main() {
  console.log('🚀 Starting MCP Supabase Verification...');

  const client = new McpTestClient();

  try {
    console.log('🔌 Connecting to MCP Server...');
    await client.connect();
    console.log('✅ Connected!');

    // 1. List Tools to verify server capabilities
    // Note: McpTestClient doesn't expose listTools directly in the file I saw,
    // but we can try to call a tool we know exists.

    // 2. Call verify_db_record on a public table (e.g. cars or profiles)
    // We'll try to find *any* car or just check if the table exists/is accessible.
    // We'll look for a car with ID '123' (likely won't exist, but should return { exists: false } instead of error)

    console.log('🔍 Calling verify_db_record for table "cars"...');
    const result: any = await client.callTool('verify_db_record', {
      table: 'cars',
      column: 'id',
      value: '00000000-0000-0000-0000-000000000000' // Dummy UUID
    });

    console.log('📦 Result:', JSON.stringify(result, null, 2));

    if (result.error && result.error.includes('Supabase not configured')) {
      console.error('❌ Supabase is NOT configured in the MCP server.');
      process.exit(1);
    }

    if (result.exists === false && !result.error) {
      console.log('✅ MCP Supabase integration is FUNCTIONAL (Query executed successfully, record not found as expected).');
    } else if (result.exists === true) {
      console.log('✅ MCP Supabase integration is FUNCTIONAL (Record found).');
    } else {
      console.error('⚠️ Unexpected result:', result);
    }

  } catch (error) {
    console.error('❌ Error during verification:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('👋 Client closed.');
  }
}

main();
