/**
 * @fileoverview Utility functions for wrapping Supabase API calls with a standardized response format.
 */

import {
  ServiceResponse,
  ServiceErrorResponse,
  ServiceSuccessResponse,
} from '@core/types/service-response';

/**
 * Wraps an asynchronous Supabase API call to return a standardized ServiceResponse.
 * This function handles common error patterns from Supabase and transforms them
 * into a consistent success/error object.
 * @template T The expected data type from a successful Supabase call.
 * @param {() => PromiseLike<{ data: T | null; error: any }>} apiCall The Supabase API call function.
 * @returns {Promise<ServiceResponse<T>>} A promise that resolves to a ServiceResponse.
 */
export async function wrapSupabaseCall<T>(
  apiCall: () => PromiseLike<{
    data: T | null;
    error: import('@supabase/supabase-js').PostgrestError | null;
  }>,
): Promise<ServiceResponse<T>> {
  try {
    const { data, error } = await apiCall();

    if (error) {
      console.error('Supabase API Error:', error);
      return {
        success: false,
        message: error.message || 'An unexpected error occurred from Supabase.',
        errorCode: error.code || 'SUPABASE_ERROR',
        statusCode: (error as { status?: number })?.status ?? 500,
      } as ServiceErrorResponse;
    }

    // Supabase returns data as null if no records are found for single fetches, which is not an error.
    // We consider it a success with null data if T allows null, or if it's an empty array for lists.
    return {
      success: true,
      data: data as T, // Cast data to T, as error is checked above
      message: 'Operation successful',
      statusCode: 200, // Assuming 200 for successful operations
    } as ServiceSuccessResponse<T>;
  } catch (e: unknown) {
    console.error('Unexpected API Call Exception:', e);
    const message = e instanceof Error ? e.message : 'An unexpected client-side error occurred.';
    return {
      success: false,
      message,
      errorCode: 'CLIENT_ERROR',
      statusCode: 500,
    } as ServiceErrorResponse;
  }
}
