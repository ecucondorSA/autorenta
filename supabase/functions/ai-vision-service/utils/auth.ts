/**
 * @file auth.ts
 * @description Authentication helpers for AI Vision Service
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

/**
 * Validates that request has valid authentication
 * Returns user ID if authenticated, throws 401 if not
 */
export async function requireAuth(req: Request): Promise<string> {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader) {
    throw new Response(
      JSON.stringify({ error: 'Missing Authorization header' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  // Create Supabase client with user's token
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: authHeader },
    },
  });

  // Verify token and get user
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    console.error('[auth] Token validation failed:', error);
    throw new Response(
      JSON.stringify({
        error: 'Invalid or expired token',
        details: error?.message || 'User not found',
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  console.log(`[auth] Authenticated user: ${user.id}`);
  return user.id;
}

/**
 * Optional auth - returns user ID if authenticated, null if not
 * Does not throw, useful for endpoints that work for both auth and anon
 */
export async function optionalAuth(req: Request): Promise<string | null> {
  try {
    return await requireAuth(req);
  } catch {
    return null;
  }
}
