# P0-025: User Data Export Authentication Requirement

## Status
✅ VERIFIED - No vulnerable export endpoint exists

## Current Implementation

### Frontend Export (Secure)
- **Location**: `apps/web/src/app/core/services/database-export.service.ts`
- **Authentication**: Uses `injectSupabase()` which requires authenticated session
- **Protection**: RLS policies apply to all queries
- **Access**: Only available to admin users (protected by route guards)

### Admin Page
- **Location**: `apps/web/src/app/features/admin/database-export/database-export.page.ts`
- **Protection**:
  - Route guard requires authentication
  - Uses authenticated DatabaseExportService
  - RLS policies prevent unauthorized data access

## Security Measures in Place

1. **Route Protection**: Admin routes require authentication
2. **RLS Policies**: Database queries respect Row Level Security
3. **Supabase Client**: All queries use authenticated Supabase client
4. **No Direct API**: No `/api/export/user` endpoint exists

## Requirements for Future Export Endpoints

If any user data export endpoint is created in the future, it MUST:

### 1. Authentication
```typescript
// ✅ REQUIRED: Verify auth token
const { data: { user }, error } = await supabase.auth.getUser();
if (!user) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401
  });
}
```

### 2. User ID Verification
```typescript
// ✅ REQUIRED: Verify user_id in token matches user_id in request
const requestedUserId = url.searchParams.get('user_id');
if (requestedUserId !== user.id) {
  return new Response(JSON.stringify({ error: 'Forbidden' }), {
    status: 403
  });
}
```

### 3. Rate Limiting
```typescript
// ✅ REQUIRED: Prevent abuse
import { enforceRateLimit } from '../_shared/rate-limiter.ts';

await enforceRateLimit(req, {
  endpoint: 'user-data-export',
  windowSeconds: 3600, // 1 hour
  maxRequests: 3, // Max 3 exports per hour
});
```

### 4. Audit Logging
```typescript
// ✅ REQUIRED: Log all exports for compliance
await supabase.from('audit_logs').insert({
  user_id: user.id,
  action: 'user_data_export',
  timestamp: new Date().toISOString(),
  ip_address: req.headers.get('x-forwarded-for'),
});
```

## Example Secure Implementation

```typescript
// supabase/functions/export-user-data/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { enforceRateLimit } from '../_shared/rate-limiter.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ✅ P0-025: Initialize authenticated client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // ✅ P0-025: Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ✅ P0-025: Extract and verify user_id
    const url = new URL(req.url);
    const requestedUserId = url.searchParams.get('user_id');

    if (!requestedUserId || requestedUserId !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Forbidden - can only export your own data' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ✅ P0-025: Rate limiting
    await enforceRateLimit(req, {
      endpoint: 'user-data-export',
      windowSeconds: 3600,
      maxRequests: 3,
    });

    // ✅ P0-025: Audit logging
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'user_data_export',
      timestamp: new Date().toISOString(),
      ip_address: req.headers.get('x-forwarded-for'),
    });

    // Export user data (RLS policies automatically apply)
    const { data: userData, error: exportError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (exportError) {
      return new Response(
        JSON.stringify({ error: 'Failed to export data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ data: userData }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

## GDPR Compliance

User data exports are required by GDPR. Any implementation must:
1. Complete within 30 days of request
2. Include all user data
3. Be in machine-readable format (JSON/CSV)
4. Be securely delivered (authenticated download)
5. Be logged for audit trail

## Verification Commands

```bash
# Check for any unprotected export endpoints
grep -r "export.*user" supabase/functions/*/index.ts

# Verify RLS policies on user tables
psql -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';"

# Check auth requirements in Edge Functions
grep -r "verify_jwt" supabase/config.toml
```

## Status: No Action Required
The current implementation is secure. This document serves as a reference for future implementations.
