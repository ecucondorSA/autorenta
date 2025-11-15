/**
 * PROFILE VALIDATORS
 *
 * Centralized validation logic for all profile fields.
 * Provides reusable validator functions for FormControls and FormGroups.
 *
 * Usage:
 * ```typescript
 * this.form = this.fb.group({
 *   date_of_birth: ['', [ProfileValidators.minAge(18)]],
 *   phone: ['', [ProfileValidators.phone()]],
 *   home_latitude: ['', [ProfileValidators.latitude()]],
 * });
 * ```
 */

import { AbstractControl, ValidationErrors, ValidatorFn} from '@angular/forms';

export class ProfileValidators {
  /**
   * Validates minimum age based on date of birth
   * @param minAge Minimum required age (default: 18)
   * @returns Validator function
   */
  static minAge(minAge: number = 18): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null; // Don't validate empty values (use Validators.required separately)
      }

      try {
        const birthDate = new Date(control.value);
        const today = new Date();

        // Calculate age
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        // Adjust age if birthday hasn't occurred yet this year
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }

        // Check if age meets minimum requirement
        if (age < minAge) {
          return {
            minAge: {
              required: minAge,
              actual: age,
              message: `Debes tener al menos ${minAge} años para usar AutoRenta`,
            },
          };
        }

        return null;
      } catch {
        return {
          invalidDate: {
            message: 'Fecha de nacimiento inválida',
          },
        };
      }
    };
  }

  /**
   * Validates maximum age based on date of birth
   * @param maxAge Maximum allowed age (default: 100)
   * @returns Validator function
   */
  static maxAge(maxAge: number = 100): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      try {
        const birthDate = new Date(control.value);
        const today = new Date();

        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }

        if (age > maxAge) {
          return {
            maxAge: {
              required: maxAge,
              actual: age,
              message: `La edad máxima permitida es ${maxAge} años`,
            },
          };
        }

        return null;
      } catch {
        return { invalidDate: { message: 'Fecha de nacimiento inválida' } };
      }
    };
  }

  /**
   * Validates phone number in E.164 format (international format)
   * Examples: +5491112345678, +12125551234
   * @returns Validator function
   */
  static phone(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const phoneStr = String(control.value).trim();

      // E.164 format: +[country code][number] (1-15 digits total)
      const e164Regex = /^\+?[1-9]\d{1,14}$/;

      if (!e164Regex.test(phoneStr)) {
        return {
          phone: {
            message: 'Número de teléfono inválido. Debe incluir código de país (ej: +549111234567)',
          },
        };
      }

      return null;
    };
  }

  /**
   * Validates latitude coordinate (-90 to 90)
   * @returns Validator function
   */
  static latitude(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (control.value === null || control.value === undefined || control.value === '') {
        return null;
      }

      const lat = Number(control.value);

      if (isNaN(lat)) {
        return {
          latitude: {
            message: 'Latitud debe ser un número',
          },
        };
      }

      if (lat < -90 || lat > 90) {
        return {
          latitude: {
            min: -90,
            max: 90,
            actual: lat,
            message: 'Latitud debe estar entre -90 y 90 grados',
          },
        };
      }

      return null;
    };
  }

  /**
   * Validates longitude coordinate (-180 to 180)
   * @returns Validator function
   */
  static longitude(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (control.value === null || control.value === undefined || control.value === '') {
        return null;
      }

      const lng = Number(control.value);

      if (isNaN(lng)) {
        return {
          longitude: {
            message: 'Longitud debe ser un número',
          },
        };
      }

      if (lng < -180 || lng > 180) {
        return {
          longitude: {
            min: -180,
            max: 180,
            actual: lng,
            message: 'Longitud debe estar entre -180 y 180 grados',
          },
        };
      }

      return null;
    };
  }

  /**
   * Validates search radius (5-100 km)
   * @param min Minimum radius in km (default: 5)
   * @param max Maximum radius in km (default: 100)
   * @returns Validator function
   */
  static searchRadius(min: number = 5, max: number = 100): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (control.value === null || control.value === undefined || control.value === '') {
        return null;
      }

      const radius = Number(control.value);

      if (isNaN(radius)) {
        return {
          searchRadius: {
            message: 'Radio de búsqueda debe ser un número',
          },
        };
      }

      if (radius < min || radius > max) {
        return {
          searchRadius: {
            min,
            max,
            actual: radius,
            message: `Radio de búsqueda debe estar entre ${min} y ${max} km`,
          },
        };
      }

      return null;
    };
  }

  /**
   * Validates postal code based on country
   * @param country Country code (ISO 3166-1 alpha-2)
   * @returns Validator function
   */
  static postalCode(country?: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const postalCode = String(control.value).trim();

      // Basic patterns for supported countries
      const patterns: Record<string, RegExp> = {
        AR: /^[A-Z]?\d{4}$/, // Argentina: 1234 or C1234
        UY: /^\d{5}$/, // Uruguay: 12345
        CL: /^\d{7}$/, // Chile: 1234567
        US: /^\d{5}(-\d{4})?$/, // USA: 12345 or 12345-6789
      };

      // If no country specified, accept any alphanumeric postal code
      if (!country) {
        const genericPattern = /^[A-Z0-9]{3,10}$/i;
        if (!genericPattern.test(postalCode)) {
          return {
            postalCode: {
              message: 'Código postal inválido',
            },
          };
        }
        return null;
      }

      const pattern = patterns[country.toUpperCase()];
      if (!pattern) {
        // Country not supported, accept any format
        return null;
      }

      if (!pattern.test(postalCode)) {
        return {
          postalCode: {
            message: `Código postal inválido para ${country}`,
          },
        };
      }

      return null;
    };
  }

  /**
   * Conditional required validator
   * Field is required only if condition function returns true
   * @param condition Function that returns true if field should be required
   * @returns Validator function
   */
  static conditionallyRequired(condition: () => boolean): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!condition()) {
        return null; // Not required, skip validation
      }

      // Check if value is empty
      const value = control.value;
      if (value === null || value === undefined || value === '') {
        return {
          required: {
            message: 'Este campo es requerido',
          },
        };
      }

      return null;
    };
  }

  /**
   * Both or neither validator for FormGroups
   * Validates that both fields have values or both are empty
   * Useful for lat/lng pairs
   *
   * Usage:
   * ```typescript
   * this.form = this.fb.group({
   *   home_latitude: [''],
   *   home_longitude: ['']
   * }, {
   *   validators: [ProfileValidators.bothOrNeither('home_latitude', 'home_longitude')]
   * });
   * ```
   *
   * @param fieldA First field name
   * @param fieldB Second field name
   * @returns Validator function for FormGroup
   */
  static bothOrNeither(fieldA: string, fieldB: string): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const controlA = group.get(fieldA);
      const controlB = group.get(fieldB);

      if (!controlA || !controlB) {
        return null; // Controls don't exist
      }

      const valueA = controlA.value;
      const valueB = controlB.value;

      const hasA = valueA !== null && valueA !== undefined && valueA !== '';
      const hasB = valueB !== null && valueB !== undefined && valueB !== '';

      // Both present or both absent = OK
      if ((hasA && hasB) || (!hasA && !hasB)) {
        // Clear any previous errors from this validator
        if (controlA.hasError('requiredWith')) {
          const errors = { ...controlA.errors };
          delete errors['requiredWith'];
          controlA.setErrors(Object.keys(errors).length > 0 ? errors : null);
        }
        if (controlB.hasError('requiredWith')) {
          const errors = { ...controlB.errors };
          delete errors['requiredWith'];
          controlB.setErrors(Object.keys(errors).length > 0 ? errors : null);
        }
        return null;
      }

      // One present, one absent = ERROR
      const error = {
        requiredWith: {
          field: hasA ? fieldB : fieldA,
          message: `Ambos ${fieldA} y ${fieldB} deben estar presentes o ambos vacíos`,
        },
      };

      // Set error on the empty field
      if (hasA && !hasB) {
        controlB.setErrors({ ...controlB.errors, ...error });
      } else if (hasB && !hasA) {
        controlA.setErrors({ ...controlA.errors, ...error });
      }

      return error;
    };
  }

  /**
   * Validates full name format
   * Must contain at least first name and last name
   * @param minLength Minimum length (default: 3)
   * @returns Validator function
   */
  static fullName(minLength: number = 3): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const name = String(control.value).trim();

      if (name.length < minLength) {
        return {
          fullName: {
            message: `El nombre debe tener al menos ${minLength} caracteres`,
          },
        };
      }

      // Check for at least two words (first name + last name)
      const words = name.split(/\s+/).filter((w) => w.length > 0);
      if (words.length < 2) {
        return {
          fullName: {
            message: 'Debes ingresar nombre y apellido completos',
          },
        };
      }

      // Check for valid characters (letters, spaces, hyphens, apostrophes)
      const validPattern = /^[a-zA-ZÀ-ÿ\s'-]+$/;
      if (!validPattern.test(name)) {
        return {
          fullName: {
            message: 'El nombre solo puede contener letras, espacios, guiones y apóstrofes',
          },
        };
      }

      return null;
    };
  }

  /**
   * Validates timezone format
   * @returns Validator function
   */
  static timezone(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const timezone = String(control.value);

      // Check if timezone is valid using Intl API
      try {
        Intl.DateTimeFormat(undefined, { timeZone: timezone });
        return null;
      } catch {
        return {
          timezone: {
            message: 'Zona horaria inválida',
          },
        };
      }
    };
  }

  /**
   * Validates locale format (e.g., es-AR, en-US)
   * @returns Validator function
   */
  static locale(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const locale = String(control.value);

      // Basic locale format: language-COUNTRY
      const localePattern = /^[a-z]{2}-[A-Z]{2}$/;
      if (!localePattern.test(locale)) {
        return {
          locale: {
            message: 'Formato de locale inválido (ej: es-AR, en-US)',
          },
        };
      }

      return null;
    };
  }

  /**
   * Validates currency code (ISO 4217)
   * @returns Validator function
   */
  static currency(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const currency = String(control.value).toUpperCase();

      // Common currencies for AutoRenta
      const validCurrencies = ['ARS', 'UYU', 'CLP', 'USD', 'EUR'];

      if (!validCurrencies.includes(currency)) {
        return {
          currency: {
            message: 'Código de moneda inválido',
            valid: validCurrencies,
          },
        };
      }

      return null;
    };
  }

  /**
   * Validates government ID number format
   * @param idType Type of ID ('DNI', 'Passport', etc.)
   * @returns Validator function
   */
  static govIdNumber(idType?: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const idNumber = String(control.value).trim();

      // If no type specified, just check it's not empty and has reasonable length
      if (!idType) {
        if (idNumber.length < 6 || idNumber.length > 20) {
          return {
            govIdNumber: {
              message: 'Número de documento inválido (debe tener entre 6 y 20 caracteres)',
            },
          };
        }
        return null;
      }

      // Type-specific validation
      switch (idType.toUpperCase()) {
        case 'DNI':
          // Argentina DNI: 7-8 digits
          if (!/^\d{7,8}$/.test(idNumber)) {
            return {
              govIdNumber: {
                message: 'DNI inválido (debe tener 7-8 dígitos)',
              },
            };
          }
          break;

        case 'PASSPORT':
        case 'PASAPORTE':
          // Passport: alphanumeric, 6-12 chars
          if (!/^[A-Z0-9]{6,12}$/i.test(idNumber)) {
            return {
              govIdNumber: {
                message: 'Número de pasaporte inválido (6-12 caracteres alfanuméricos)',
              },
            };
          }
          break;
      }

      return null;
    };
  }
}
