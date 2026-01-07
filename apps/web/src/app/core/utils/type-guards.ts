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
  return isObject(obj) && isString(obj['id']) && isString(obj['email']) && isString(obj['created_at']);
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
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as Record<string, unknown>)['message']);
  }
  return String(error);
}
