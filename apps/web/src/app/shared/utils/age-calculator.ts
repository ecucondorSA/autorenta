import { UserProfile } from '../../core/models';

/**
 * Calculate age in years from a birth date
 * @param birthDate Date object or ISO string (YYYY-MM-DD)
 * @returns Age in years, or null if birthDate is invalid
 * @example
 * calculateAge('1990-01-15') // Returns 34 (in 2024)
 * calculateAge(new Date('1990-01-15')) // Returns 34
 * calculateAge(null) // Returns null
 */
export function calculateAge(birthDate: Date | string | null | undefined): number | null {
  if (!birthDate) {
    return null;
  }

  try {
    const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;

    // Validate date
    if (isNaN(birth.getTime())) {
      console.warn('[AgeCalculator] Invalid birth date:', birthDate);
      return null;
    }

    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    // Adjust age if birthday hasn't occurred this year
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    // Sanity check: age should be between 0 and 150
    if (age < 0 || age > 150) {
      console.warn('[AgeCalculator] Calculated age out of range:', age, 'from', birthDate);
      return null;
    }

    return age;
  } catch (error) {
    console.error('[AgeCalculator] Error calculating age:', error);
    return null;
  }
}

/**
 * Check if a person is at least 18 years old
 * @param birthDate Date object or ISO string (YYYY-MM-DD)
 * @returns true if 18 or older, false otherwise
 * @example
 * isAtLeast18('2000-01-01') // true
 * isAtLeast18('2010-01-01') // false
 */
export function isAtLeast18(birthDate: Date | string | null | undefined): boolean {
  const age = calculateAge(birthDate);
  return age !== null && age >= 18;
}

/**
 * Get age from a user profile
 * Returns age if date_of_birth is set, otherwise returns fallback (default: 30)
 * @param profile User profile object
 * @param fallback Fallback age if date_of_birth is not set (default: 30)
 * @returns Age in years
 * @example
 * getAgeFromProfile(profile) // Returns calculated age or 30
 * getAgeFromProfile(profile, 25) // Returns calculated age or 25
 */
export function getAgeFromProfile(profile: UserProfile | null | undefined, fallback = 30): number {
  if (!profile || !profile.date_of_birth) {
    console.warn('[AgeCalculator] No date_of_birth in profile, using fallback:', fallback);
    return fallback;
  }

  const age = calculateAge(profile.date_of_birth);

  if (age === null) {
    console.warn('[AgeCalculator] Could not calculate age from profile, using fallback:', fallback);
    return fallback;
  }

  return age;
}

/**
 * Format birth date for display
 * @param birthDate Date object or ISO string
 * @param locale Locale for formatting (default: 'es-AR')
 * @returns Formatted date string or empty string if invalid
 * @example
 * formatBirthDate('1990-01-15') // "15/01/1990"
 */
export function formatBirthDate(
  birthDate: Date | string | null | undefined,
  locale = 'es-AR',
): string {
  if (!birthDate) {
    return '';
  }

  try {
    const date = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;

    if (isNaN(date.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return '';
  }
}

/**
 * Get minimum birth date for 18+ requirement
 * @returns Date object representing the maximum birth date for someone to be 18
 * @example
 * getMin18BirthDate() // Returns date 18 years ago from today
 */
export function getMin18BirthDate(): Date {
  const today = new Date();
  const minDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  return minDate;
}

/**
 * Get maximum birth date for reasonable age (e.g., 100 years old)
 * @param maxAge Maximum reasonable age (default: 100)
 * @returns Date object representing the minimum birth date
 * @example
 * getMaxAgeBirthDate() // Returns date 100 years ago from today
 */
export function getMaxAgeBirthDate(maxAge = 100): Date {
  const today = new Date();
  const maxDate = new Date(today.getFullYear() - maxAge, today.getMonth(), today.getDate());
  return maxDate;
}

/**
 * Validate birth date for booking requirements
 * @param birthDate Date to validate
 * @returns Object with validation result and error message if invalid
 * @example
 * validateBirthDate('2010-01-01') // { valid: false, error: '...' }
 * validateBirthDate('1990-01-01') // { valid: true }
 */
export function validateBirthDate(birthDate: Date | string | null | undefined): {
  valid: boolean;
  error?: string;
} {
  if (!birthDate) {
    return { valid: false, error: 'La fecha de nacimiento es requerida' };
  }

  const age = calculateAge(birthDate);

  if (age === null) {
    return { valid: false, error: 'Fecha de nacimiento inválida' };
  }

  if (age < 18) {
    return {
      valid: false,
      error: 'Debes tener al menos 18 años para usar la plataforma',
    };
  }

  if (age > 100) {
    return {
      valid: false,
      error: 'Por favor verifica la fecha de nacimiento ingresada',
    };
  }

  return { valid: true };
}
