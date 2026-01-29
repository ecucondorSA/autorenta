export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isDate(value: unknown): value is Date {
  return value instanceof Date;
}

export function isArray<T>(value: unknown, guard: (item: unknown) => item is T): value is T[] {
  return Array.isArray(value) && value.every(guard);
}

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export function isUser(obj: unknown): obj is User {
  return (
    isObject(obj) && isString(obj['id']) && isString(obj['email']) && isString(obj['created_at'])
  );
}

export interface ProfileGuard {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: 'locador' | 'locatario' | 'ambos' | 'admin';
  is_admin: boolean;
  created_at: string;
}

export function isProfile(obj: unknown): obj is ProfileGuard {
  return (
    isObject(obj) &&
    isString(obj['id']) &&
    isString(obj['email']) &&
    ['locador', 'locatario', 'ambos', 'admin'].includes(obj['role'] as string) &&
    isBoolean(obj['is_admin']) &&
    isString(obj['created_at'])
  );
}

export interface CarLocation {
  city?: string;
  latitude?: number;
  longitude?: number;
}

export function isCarLocation(obj: unknown): obj is CarLocation {
  return isObject(obj);
}

export interface CarGuard {
  id: string;
  owner_id: string;
  brand: string;
  model: string;
  year: number;
  license_plate: string;
  status: 'draft' | 'pending' | 'active' | 'suspended';
  location?: CarLocation;
  photos?: Array<{ id: string; url: string }>;
  created_at: string;
}

export function isCar(obj: unknown): obj is CarGuard {
  return (
    isObject(obj) &&
    isString(obj['id']) &&
    isString(obj['owner_id']) &&
    isString(obj['brand']) &&
    isString(obj['model']) &&
    isNumber(obj['year']) &&
    isString(obj['license_plate']) &&
    ['draft', 'pending', 'active', 'suspended'].includes(obj['status'] as string) &&
    isString(obj['created_at'])
  );
}

export interface BookingGuard {
  id: string;
  car_id: string;
  renter_id: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  start_date: string;
  end_date: string;
  total_price: number;
  created_at: string;
}

export function isBooking(obj: unknown): obj is BookingGuard {
  return (
    isObject(obj) &&
    isString(obj['id']) &&
    isString(obj['car_id']) &&
    isString(obj['renter_id']) &&
    ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].includes(
      obj['status'] as string,
    ) &&
    isString(obj['start_date']) &&
    isString(obj['end_date']) &&
    isNumber(obj['total_price']) &&
    isString(obj['created_at'])
  );
}

/**
 * Extracts error message from unknown error type
 * Used to safely convert errors to strings for logging and display
 *
 * Handles various error formats:
 * - Error instances
 * - Strings
 * - Objects with 'message' or 'error' properties
 * - Supabase/PostgreSQL error objects
 * - Nested error structures
 *
 * @param error - The error to extract a message from
 * @returns A human-readable error message, never [object Object]
 */
export function getErrorMessage(error: unknown): string {
  // Handle null/undefined
  if (error === null || error === undefined) {
    return 'Unknown error';
  }

  // Handle Error instances
  if (error instanceof Error) {
    return error.message || error.name || 'Error';
  }

  // Handle strings
  if (typeof error === 'string') {
    return error || 'Unknown error';
  }

  // Handle objects
  if (typeof error === 'object') {
    const obj = error as Record<string, unknown>;

    // Check for 'message' property (most common)
    if ('message' in obj && obj['message'] != null) {
      const msg = obj['message'];
      if (typeof msg === 'string') return msg;
      if (typeof msg === 'object') return getErrorMessage(msg);
    }

    // Check for 'error' property (Supabase format: {error: {message: "..."}})
    if ('error' in obj && obj['error'] != null) {
      return getErrorMessage(obj['error']);
    }

    // Check for 'code' and 'details' (PostgreSQL errors)
    if ('code' in obj) {
      const code = String(obj['code']);
      const details = obj['details'] ? String(obj['details']) : '';
      const hint = obj['hint'] ? String(obj['hint']) : '';
      return [code, details, hint].filter(Boolean).join(': ') || `Error code: ${code}`;
    }

    // Check for 'statusText' (HTTP errors)
    if ('statusText' in obj && typeof obj['statusText'] === 'string') {
      return obj['statusText'];
    }

    // Check for 'body' property (some API responses)
    if ('body' in obj && obj['body'] != null) {
      return getErrorMessage(obj['body']);
    }

    // Try JSON.stringify as last resort for objects
    try {
      const jsonStr = JSON.stringify(obj);
      // Only use if it's not just empty object
      if (jsonStr && jsonStr !== '{}' && jsonStr.length < 500) {
        return jsonStr;
      }
    } catch {
      // JSON.stringify failed (circular reference, etc.)
    }

    // If object has keys, list them for debugging
    const keys = Object.keys(obj);
    if (keys.length > 0) {
      return `Error object with keys: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}`;
    }
  }

  // Handle primitives (number, boolean, etc.)
  if (typeof error === 'number' || typeof error === 'boolean') {
    return String(error);
  }

  // Final fallback - avoid [object Object]
  return 'Unknown error (unable to extract message)';
}

/**
 * Serializes an error for logging, preserving structure where useful
 * Returns an object suitable for JSON serialization
 *
 * @param error - The error to serialize
 * @returns A serializable object representation of the error
 */
export function serializeError(error: unknown): Record<string, unknown> {
  if (error === null || error === undefined) {
    return { message: 'Unknown error', type: 'null' };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 5).join('\n'),
    };
  }

  if (typeof error === 'string') {
    return { message: error, type: 'string' };
  }

  if (typeof error === 'object') {
    try {
      // Try to serialize the object
      const serialized = JSON.parse(JSON.stringify(error));
      return typeof serialized === 'object' ? serialized : { value: serialized };
    } catch {
      // Circular reference or other issue
      return {
        message: getErrorMessage(error),
        type: 'object',
        keys: Object.keys(error as Record<string, unknown>).slice(0, 10),
      };
    }
  }

  return { value: String(error), type: typeof error };
}
