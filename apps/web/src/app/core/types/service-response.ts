/**
 * @fileoverview Defines a standard interface for API responses.
 * This wrapper ensures consistent error handling and data retrieval across the application.
 */

/**
 * Represents a standardized API response.
 * @template T The type of the data returned in a successful response.
 */
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errorCode?: string; // Optional: For specific error codes from the backend
  statusCode?: number; // Optional: HTTP status code (e.g., from Supabase error)
}

/**
 * Utility type for a successful API response.
 * @template T The type of the data returned.
 */
export interface ServiceSuccessResponse<T> extends ServiceResponse<T> {
  success: true;
  data: T;
  message?: string;
}

/**
 * Utility type for a failed API response.
 */
export interface ServiceErrorResponse extends ServiceResponse<never> {
  // 'never' indicates no data on error
  success: false;
  message: string;
  errorCode?: string;
  statusCode?: number;
}
