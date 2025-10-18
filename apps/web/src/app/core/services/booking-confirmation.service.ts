import { Injectable, signal, computed, inject } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';

/**
 * Interfaces para las respuestas de las funciones RPC de confirmación bilateral
 */

export interface MarkAsReturnedResponse {
  success: boolean;
  message: string;
  completion_status: string;
}

export interface ConfirmAndReleaseResponse {
  success: boolean;
  message: string;
  completion_status: string;
  funds_released: boolean;
  owner_confirmed: boolean;
  renter_confirmed: boolean;
  waiting_for: 'owner' | 'renter' | 'both' | 'none';
}

export interface MarkAsReturnedParams {
  booking_id: string;
  returned_by: string; // user_id del que marca como devuelto
}

export interface OwnerConfirmParams {
  booking_id: string;
  confirming_user_id: string;
  has_damages?: boolean;
  damage_amount?: number;
  damage_description?: string;
}

export interface RenterConfirmParams {
  booking_id: string;
  confirming_user_id: string;
}

/**
 * Estado de carga del servicio
 */
export interface ConfirmationLoadingState {
  markingAsReturned: boolean;
  confirmingOwner: boolean;
  confirmingRenter: boolean;
}

/**
 * Error estandarizado del servicio
 */
export interface ConfirmationError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * BookingConfirmationService
 *
 * Servicio para gestionar el sistema de confirmación bilateral:
 * - Marcar booking como devuelto
 * - Confirmación del propietario (puede reportar daños)
 * - Confirmación del locatario (liberar pago)
 * - Liberación automática de fondos cuando ambos confirman
 *
 * Integrado con:
 * - Sistema de wallet (rental + deposit)
 * - Sistema de reviews/calificaciones
 * - Gestión de daños y cobros
 *
 * Usa signals de Angular 17+ para state management reactivo.
 */
@Injectable({
  providedIn: 'root',
})
export class BookingConfirmationService {
  private readonly supabase = inject(SupabaseClientService);

  // ==================== SIGNALS ====================

  /**
   * Estado de la última confirmación procesada
   */
  readonly lastConfirmation = signal<ConfirmAndReleaseResponse | null>(null);

  /**
   * Estados de carga para operaciones asíncronas
   */
  readonly loading = signal<ConfirmationLoadingState>({
    markingAsReturned: false,
    confirmingOwner: false,
    confirmingRenter: false,
  });

  /**
   * Error actual (si existe)
   */
  readonly error = signal<ConfirmationError | null>(null);

  // ==================== COMPUTED SIGNALS ====================

  /**
   * Indica si hay alguna operación en progreso
   */
  readonly isLoading = computed(() => {
    const loadingState = this.loading();
    return (
      loadingState.markingAsReturned ||
      loadingState.confirmingOwner ||
      loadingState.confirmingRenter
    );
  });

  /**
   * Indica si los fondos fueron liberados en la última confirmación
   */
  readonly fundsWereReleased = computed(() => this.lastConfirmation()?.funds_released ?? false);

  /**
   * Indica si aún faltan confirmaciones
   */
  readonly isPendingConfirmations = computed(() => {
    const confirmation = this.lastConfirmation();
    return confirmation?.waiting_for && confirmation.waiting_for !== 'none';
  });

  // ==================== PUBLIC METHODS ====================

  /**
   * Marca un booking como devuelto físicamente
   * Este es el primer paso antes de las confirmaciones bilaterales
   *
   * @param params - Parámetros con booking_id y user_id del que marca como devuelto
   * @returns Resultado de la operación
   *
   * @example
   * await confirmationService.markAsReturned({
   *   booking_id: 'booking-uuid',
   *   returned_by: 'user-uuid'
   * });
   */
  async markAsReturned(params: MarkAsReturnedParams): Promise<MarkAsReturnedResponse> {
    this.setLoadingState('markingAsReturned', true);
    this.clearError();

    try {
      if (!params.booking_id) {
        throw this.createError('MISSING_BOOKING_ID', 'El ID del booking es requerido');
      }

      if (!params.returned_by) {
        throw this.createError('MISSING_USER_ID', 'El ID del usuario es requerido');
      }

      const { data, error } = await this.supabase.getClient().rpc('booking_mark_as_returned', {
        p_booking_id: params.booking_id,
        p_returned_by: params.returned_by,
      });

      if (error) {
        throw this.createError('MARK_AS_RETURNED_ERROR', error.message, error);
      }

      if (!data || data.length === 0) {
        throw this.createError('MARK_AS_RETURNED_EMPTY', 'No se pudo marcar como devuelto');
      }

      const result = data[0] as MarkAsReturnedResponse;

      if (!result.success) {
        throw this.createError('MARK_AS_RETURNED_FAILED', result.message);
      }

      return result;
    } catch (err) {
      throw this.handleError(err, 'Error al marcar booking como devuelto');
    } finally {
      this.setLoadingState('markingAsReturned', false);
    }
  }

  /**
   * Confirmación del propietario (locador)
   * Puede reportar daños opcionalmente
   *
   * Si ambos (owner + renter) ya confirmaron, libera fondos automáticamente
   *
   * @param params - Parámetros de confirmación del propietario
   * @returns Resultado de la confirmación con estado de liberación de fondos
   *
   * @example
   * // Sin daños
   * await confirmationService.confirmOwner({
   *   booking_id: 'booking-uuid',
   *   confirming_user_id: 'owner-uuid'
   * });
   *
   * // Con daños
   * await confirmationService.confirmOwner({
   *   booking_id: 'booking-uuid',
   *   confirming_user_id: 'owner-uuid',
   *   has_damages: true,
   *   damage_amount: 100,
   *   damage_description: 'Rayón en puerta trasera'
   * });
   */
  async confirmOwner(params: OwnerConfirmParams): Promise<ConfirmAndReleaseResponse> {
    this.setLoadingState('confirmingOwner', true);
    this.clearError();

    try {
      if (!params.booking_id) {
        throw this.createError('MISSING_BOOKING_ID', 'El ID del booking es requerido');
      }

      if (!params.confirming_user_id) {
        throw this.createError('MISSING_USER_ID', 'El ID del usuario es requerido');
      }

      // Validar daños si se reportaron
      if (params.has_damages) {
        if (!params.damage_amount || params.damage_amount <= 0) {
          throw this.createError(
            'INVALID_DAMAGE_AMOUNT',
            'El monto de daños debe ser mayor a 0 cuando has_damages es true'
          );
        }

        if (params.damage_amount > 250) {
          throw this.createError(
            'DAMAGE_AMOUNT_EXCEEDS_DEPOSIT',
            'El monto de daños no puede exceder la garantía de $250 USD'
          );
        }
      }

      const { data, error } = await this.supabase.getClient().rpc('booking_confirm_and_release', {
        p_booking_id: params.booking_id,
        p_confirming_user_id: params.confirming_user_id,
        p_has_damages: params.has_damages ?? false,
        p_damage_amount: params.damage_amount ?? 0,
        p_damage_description: params.damage_description ?? null,
      });

      if (error) {
        throw this.createError('CONFIRM_OWNER_ERROR', error.message, error);
      }

      if (!data || data.length === 0) {
        throw this.createError('CONFIRM_OWNER_EMPTY', 'No se pudo procesar la confirmación');
      }

      const result = data[0] as ConfirmAndReleaseResponse;

      if (!result.success) {
        throw this.createError('CONFIRM_OWNER_FAILED', result.message);
      }

      // Guardar estado de la confirmación
      this.lastConfirmation.set(result);

      return result;
    } catch (err) {
      throw this.handleError(err, 'Error al confirmar como propietario');
    } finally {
      this.setLoadingState('confirmingOwner', false);
    }
  }

  /**
   * Confirmación del locatario (renter)
   * Confirma liberar el pago al propietario
   *
   * Si ambos (owner + renter) ya confirmaron, libera fondos automáticamente
   *
   * @param params - Parámetros de confirmación del locatario
   * @returns Resultado de la confirmación con estado de liberación de fondos
   *
   * @example
   * await confirmationService.confirmRenter({
   *   booking_id: 'booking-uuid',
   *   confirming_user_id: 'renter-uuid'
   * });
   */
  async confirmRenter(params: RenterConfirmParams): Promise<ConfirmAndReleaseResponse> {
    this.setLoadingState('confirmingRenter', true);
    this.clearError();

    try {
      if (!params.booking_id) {
        throw this.createError('MISSING_BOOKING_ID', 'El ID del booking es requerido');
      }

      if (!params.confirming_user_id) {
        throw this.createError('MISSING_USER_ID', 'El ID del usuario es requerido');
      }

      const { data, error } = await this.supabase.getClient().rpc('booking_confirm_and_release', {
        p_booking_id: params.booking_id,
        p_confirming_user_id: params.confirming_user_id,
        p_has_damages: false,
        p_damage_amount: 0,
        p_damage_description: null,
      });

      if (error) {
        throw this.createError('CONFIRM_RENTER_ERROR', error.message, error);
      }

      if (!data || data.length === 0) {
        throw this.createError('CONFIRM_RENTER_EMPTY', 'No se pudo procesar la confirmación');
      }

      const result = data[0] as ConfirmAndReleaseResponse;

      if (!result.success) {
        throw this.createError('CONFIRM_RENTER_FAILED', result.message);
      }

      // Guardar estado de la confirmación
      this.lastConfirmation.set(result);

      return result;
    } catch (err) {
      throw this.handleError(err, 'Error al confirmar como locatario');
    } finally {
      this.setLoadingState('confirmingRenter', false);
    }
  }

  /**
   * Limpia el estado del servicio
   */
  clear(): void {
    this.lastConfirmation.set(null);
    this.clearError();
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Actualiza un estado de carga específico
   */
  private setLoadingState(key: keyof ConfirmationLoadingState, value: boolean): void {
    this.loading.update((state) => ({ ...state, [key]: value }));
  }

  /**
   * Crea un objeto de error estandarizado
   */
  private createError(code: string, message: string, details?: unknown): ConfirmationError {
    const error: ConfirmationError = { code, message, details };
    this.error.set(error);
    return error;
  }

  /**
   * Maneja errores genéricos y los convierte a ConfirmationError
   */
  private handleError(err: unknown, defaultMessage: string): ConfirmationError {
    if (this.isConfirmationError(err)) {
      return err;
    }

    if (err instanceof Error) {
      return this.createError('UNKNOWN_ERROR', err.message || defaultMessage, err);
    }

    return this.createError('UNKNOWN_ERROR', defaultMessage, err);
  }

  /**
   * Type guard para ConfirmationError
   */
  private isConfirmationError(err: unknown): err is ConfirmationError {
    return (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      'message' in err &&
      typeof (err as ConfirmationError).code === 'string' &&
      typeof (err as ConfirmationError).message === 'string'
    );
  }

  /**
   * Limpia el error actual
   */
  private clearError(): void {
    this.error.set(null);
  }
}
