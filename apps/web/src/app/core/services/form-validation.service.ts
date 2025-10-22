import { Injectable } from '@angular/core';
import { AbstractControl } from '@angular/forms';

/**
 * Servicio centralizado para mensajes de validación de formularios
 * Elimina duplicación de lógica de validación en componentes
 */
@Injectable({
  providedIn: 'root',
})
export class FormValidationService {
  /**
   * Obtiene el mensaje de error para un control de formulario
   * @param control El control a validar
   * @param fieldName Nombre del campo (opcional, para mensajes específicos)
   * @param customMessages Mensajes personalizados por tipo de error
   * @returns Mensaje de error o cadena vacía si no hay error
   */
  getErrorMessage(
    control: AbstractControl | null,
    fieldName?: string,
    customMessages?: Partial<Record<string, string>>
  ): string {
    if (!control || !control.touched || !control.errors) {
      return '';
    }

    const errors = control.errors;

    // Verificar mensajes personalizados primero
    if (customMessages) {
      for (const errorType in errors) {
        if (customMessages[errorType]) {
          return customMessages[errorType];
        }
      }
    }

    // Mensajes estándar
    if (errors['required']) {
      return 'Este campo es requerido';
    }

    if (errors['email']) {
      return 'Email inválido';
    }

    if (errors['minlength']) {
      const min = errors['minlength'].requiredLength;
      return `Mínimo ${min} caracteres`;
    }

    if (errors['maxlength']) {
      const max = errors['maxlength'].requiredLength;
      return `Máximo ${max} caracteres`;
    }

    if (errors['min']) {
      const min = errors['min'].min;
      return `El valor mínimo es ${min}`;
    }

    if (errors['max']) {
      const max = errors['max'].max;
      return `El valor máximo es ${max}`;
    }

    if (errors['pattern']) {
      return 'Formato inválido';
    }

    return 'Campo inválido';
  }

  /**
   * Versión simplificada que acepta FormGroup y nombre de campo
   * @param form FormGroup que contiene el control
   * @param fieldName Nombre del campo a validar
   * @param customMessages Mensajes personalizados opcionales
   */
  getFieldError(
    form: { get: (name: string) => AbstractControl | null },
    fieldName: string,
    customMessages?: Partial<Record<string, string>>
  ): string {
    const control = form.get(fieldName);
    return this.getErrorMessage(control, fieldName, customMessages);
  }
}
