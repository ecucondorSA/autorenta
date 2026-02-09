/**
 * Reusable authentication helpers for Supabase Edge Functions.
 *
 * Usage:
 * ```typescript
 * import { requireAuth, requireAdmin, requireOwnership } from '../_shared/auth-helpers.ts';
 *
 * Deno.serve(async (req) => {
 *   try {
 *     const { user, supabase } = await requireAuth(req);
 *     await requireAdmin(user.id, supabase); // Only if admin operation
 *
 *     // Your logic here
 *
 *   } catch (error) {
 *     if (error instanceof Response) return error;
 *     throw error;
 *   }
 * });
 * ```
 *
 * @module auth-helpers
 */

import { createClient, SupabaseClient, User } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

// ============================================================================
// Types
// ============================================================================

export interface AuthResult {
  user: User;
  supabase: SupabaseClient;
}

// ============================================================================
// Auth Functions
// ============================================================================

/**
 * Validates Authorization header and returns authenticated user.
 * Throws Response (401) if auth fails - catch and return it.
 *
 * @param req - The incoming HTTP request
 * @returns Promise with user and supabase client
 * @throws Response with 401 status if authentication fails
 *
 * @example
 * ```typescript
 * try {
 *   const { user, supabase } = await requireAuth(req);
 *   console.log(`Authenticated user: ${user.id}`);
 *   // ... your logic
 * } catch (error) {
 *   if (error instanceof Response) return error;
 *   throw error;
 * }
 * ```
 */
export async function requireAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader) {
    throw new Response(
      JSON.stringify({
        error: 'Missing Authorization header',
        code: 'AUTH_REQUIRED',
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    console.error('[auth-helpers] Token validation failed:', error);
    throw new Response(
      JSON.stringify({
        error: 'Invalid or expired token',
        code: 'AUTH_INVALID',
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  console.log(`[auth-helpers] Authenticated user: ${user.id}`);
  return { user, supabase };
}

/**
 * Validates that user has admin role in admin_users table.
 * Throws Response (403) if not admin.
 *
 * @param userId - The user ID to check
 * @param supabase - The Supabase client (must have user's auth context)
 * @throws Response with 403 status if user is not admin
 *
 * @example
 * ```typescript
 * const { user, supabase } = await requireAuth(req);
 * await requireAdmin(user.id, supabase);
 * // User is admin, proceed with admin operation
 * ```
 */
export async function requireAdmin(userId: string, supabase: SupabaseClient): Promise<void> {
  const { data: isAdmin, error } = await supabase.schema('public').rpc<boolean>('is_admin', {
    check_user_id: userId,
  });

  if (error) {
    console.error(`[auth-helpers] Admin check failed for user ${userId}:`, error);
    throw new Response(
      JSON.stringify({
        error: 'Could not verify admin access',
        code: 'ADMIN_CHECK_FAILED',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  if (!isAdmin) {
    console.warn(`[auth-helpers] User ${userId} attempted admin operation without role`);
    throw new Response(
      JSON.stringify({
        error: 'Admin access required',
        code: 'FORBIDDEN',
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  console.log(`[auth-helpers] Admin user verified: ${userId}`);
}

/**
 * Validates that user owns the specified resource.
 * Admins bypass ownership checks automatically.
 * Throws Response (403) if not owner and not admin.
 * Throws Response (404) if resource not found.
 *
 * @param tableName - The table containing the resource
 * @param resourceId - The ID of the resource to check
 * @param userId - The user ID to verify ownership for
 * @param supabase - The Supabase client
 * @param ownerColumn - The column name for owner ID (default: 'owner_id')
 * @throws Response with 403 if not owner, 404 if resource not found
 *
 * @example
 * ```typescript
 * const { user, supabase } = await requireAuth(req);
 * await requireOwnership('cars', carId, user.id, supabase);
 * // User owns the car, proceed with update/delete
 * ```
 *
 * @example
 * ```typescript
 * // Custom owner column
 * await requireOwnership('bookings', bookingId, user.id, supabase, 'renter_id');
 * ```
 */
export async function requireOwnership(
  tableName: string,
  resourceId: string,
  userId: string,
  supabase: SupabaseClient,
  ownerColumn: string = 'owner_id'
): Promise<void> {
  // Check if user is admin (admins bypass ownership checks)
  try {
    const { data: isAdmin, error } = await supabase.schema('public').rpc<boolean>('is_admin', {
      check_user_id: userId,
    });

    if (!error && isAdmin) {
      console.log(`[auth-helpers] Admin ${userId} bypassing ownership check for ${tableName}/${resourceId}`);
      return; // Admins can access any resource
    }
  } catch {
    // Not admin, continue with ownership check
  }

  // Check ownership
  const { data: resource, error } = await supabase
    .from(tableName)
    .select(ownerColumn)
    .eq('id', resourceId)
    .single();

  if (error || !resource) {
    console.warn(`[auth-helpers] Resource not found: ${tableName}/${resourceId}`);
    throw new Response(
      JSON.stringify({
        error: 'Resource not found',
        code: 'NOT_FOUND',
      }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  if (resource[ownerColumn] !== userId) {
    console.warn(
      `[auth-helpers] User ${userId} attempted to access resource ${resourceId} without ownership`
    );
    throw new Response(
      JSON.stringify({
        error: 'Not authorized to access this resource',
        code: 'FORBIDDEN_RESOURCE',
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  console.log(`[auth-helpers] Ownership verified: ${userId} owns ${tableName}/${resourceId}`);
}

/**
 * Optional auth - returns user or null, does not throw.
 * Useful for endpoints that work for both authenticated and anonymous users.
 *
 * @param req - The incoming HTTP request
 * @returns Promise with AuthResult or null if not authenticated
 *
 * @example
 * ```typescript
 * const authResult = await optionalAuth(req);
 * if (authResult) {
 *   // User is authenticated
 *   const { user, supabase } = authResult;
 *   // Return personalized results
 * } else {
 *   // Anonymous user
 *   // Return public results
 * }
 * ```
 */
export async function optionalAuth(req: Request): Promise<AuthResult | null> {
  try {
    return await requireAuth(req);
  } catch (error) {
    // If auth failed with 401, treat as anonymous
    if (error instanceof Response && error.status === 401) {
      return null;
    }
    // Other errors should still bubble up
    throw error;
  }
}

/**
 * Creates a Supabase client with the service role key.
 * Use sparingly - prefer user-scoped clients from requireAuth().
 *
 * @returns SupabaseClient with service role privileges
 *
 * @example
 * ```typescript
 * // Only use for operations that truly require service role
 * const serviceClient = createServiceClient();
 * await serviceClient.from('sensitive_table').select('*');
 * ```
 */
export function createServiceClient(): SupabaseClient {
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
  }

  return createClient(SUPABASE_URL, serviceRoleKey);
}
