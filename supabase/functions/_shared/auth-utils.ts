/**
 * Shared authentication utilities for Supabase Edge Functions
 *
 * P0-013 FIX: Server-side email verification enforcement
 */

import { SupabaseClient, User } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

export interface EmailVerificationResult {
  isVerified: boolean;
  user: User | null;
  error?: string;
}

/**
 * P0-013 FIX: Verify that the authenticated user has confirmed their email
 *
 * This prevents bypassing email verification requirements on critical operations
 * like bookings, payments, and sensitive data access.
 *
 * @param supabaseClient - Authenticated Supabase client with user JWT
 * @returns EmailVerificationResult with verification status
 *
 * @example
 * ```typescript
 * const result = await requireEmailVerification(supabaseClient);
 * if (!result.isVerified) {
 *   return new Response(
 *     JSON.stringify({ error: result.error }),
 *     { status: 403 }
 *   );
 * }
 * ```
 */
export async function requireEmailVerification(
  supabaseClient: SupabaseClient
): Promise<EmailVerificationResult> {
  try {
    // Get the authenticated user
    const { data: { user }, error } = await supabaseClient.auth.getUser();

    if (error) {
      return {
        isVerified: false,
        user: null,
        error: 'Authentication failed'
      };
    }

    if (!user) {
      return {
        isVerified: false,
        user: null,
        error: 'User not found'
      };
    }

    // Check if email is confirmed
    if (!user.email_confirmed_at) {
      return {
        isVerified: false,
        user,
        error: 'Email verification required. Please verify your email before proceeding.'
      };
    }

    return {
      isVerified: true,
      user,
    };
  } catch (error) {
    return {
      isVerified: false,
      user: null,
      error: error instanceof Error ? error.message : 'Verification check failed'
    };
  }
}

/**
 * Check if user has verified email (non-throwing version)
 *
 * @param supabaseClient - Authenticated Supabase client
 * @returns true if email is verified, false otherwise
 */
export async function isEmailVerified(
  supabaseClient: SupabaseClient
): Promise<boolean> {
  const result = await requireEmailVerification(supabaseClient);
  return result.isVerified;
}

/**
 * Get verification status for a user ID (admin/system use)
 *
 * @param supabaseClient - Supabase client with service role
 * @param userId - User ID to check
 * @returns boolean indicating verification status
 */
export async function checkUserEmailVerification(
  supabaseClient: SupabaseClient,
  userId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabaseClient.auth.admin.getUserById(userId);

    if (error || !data.user) {
      console.error('Failed to fetch user for verification check:', error);
      return false;
    }

    return !!data.user.email_confirmed_at;
  } catch (error) {
    console.error('Error checking email verification:', error);
    return false;
  }
}
