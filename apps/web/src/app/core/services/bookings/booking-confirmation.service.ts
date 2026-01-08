import { computed, inject, Injectable, signal } from '@angular/core';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';

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

export interface InspectionParams {
  booking_id: string;
  inspector_id: string;
  has_damage: boolean;
  damage_amount?: number;
  damage_description?: string;
  evidence?: unknown[];
}

export interface ResolveConclusionParams {
  booking_id: string;
  renter_id: string;
  accept_damage: boolean;
}

/**
 * Estado de carga del servicio
 */
export interface ConfirmationLoadingState {
  markingAsReturned: boolean;
  confirmingOwner: boolean; // Legacy/Wrapper
  confirmingRenter: boolean; // Legacy/Wrapper
  submittingInspection: boolean;
  resolvingConclusion: boolean;
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
    submittingInspection: false,
    resolvingConclusion: false,
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
      loadingState.submittingInspection ||
      loadingState.resolvingConclusion ||
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
      if (!params.booking_id) throw this.createError('MISSING_ID', 'ID requerido');

      // Use V2 RPC
      const { error } = await this.supabase.getClient().rpc('booking_v2_return_vehicle', {
        p_booking_id: params.booking_id,
        p_returned_by: params.returned_by,
      });

      if (error) throw this.createError('RPC_ERROR', error.message, error);

      return {
        success: true,
        message: 'Vehículo marcado como devuelto',
        completion_status: 'RETURNED',
      };
    } catch (err) {
      throw this.handleError(err, 'Error al marcar devuelto');
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
  /**
   * V2: Submit Inspection (Owner)
   */
  async submitInspection(params: InspectionParams): Promise<ConfirmAndReleaseResponse> {
    this.setLoadingState('submittingInspection', true);
    this.clearError();
    try {
      const { data, error } = await this.supabase.getClient().rpc('booking_v2_submit_inspection', {
        p_booking_id: params.booking_id,
        p_inspector_id: params.inspector_id,
        p_has_damage: params.has_damage,
        p_damage_amount_cents: params.damage_amount ? Math.round(params.damage_amount * 100) : 0,
        p_description: params.damage_description,
        p_evidence: params.evidence ?? [],
      });

      if (error) throw this.createError('INSPECTION_ERROR', error.message);
      return data;
    } catch (err) {
      throw this.handleError(err, 'Error al enviar inspección');
    } finally {
      this.setLoadingState('submittingInspection', false);
    }
  }

  /**
   * V2: Resolve Conclusion (Renter)
   */
  async resolveConclusion(params: ResolveConclusionParams): Promise<ConfirmAndReleaseResponse> {
    this.setLoadingState('resolvingConclusion', true);
    this.clearError();
    try {
      const { data, error } = await this.supabase.getClient().rpc('booking_v2_resolve_conclusion', {
        p_booking_id: params.booking_id,
        p_renter_id: params.renter_id,
        p_accept_damage: params.accept_damage,
      });

      if (error) throw this.createError('RESOLUTION_ERROR', error.message);
      return data;
    } catch (err) {
      throw this.handleError(err, 'Error al resolver conclusión');
    } finally {
      this.setLoadingState('resolvingConclusion', false);
    }
  }

  // Legacy adaptations or keep for backward compatibility if needed
  async confirmOwner(params: OwnerConfirmParams): Promise<ConfirmAndReleaseResponse> {
    // Map to new V2 inspection
    return this.submitInspection({
      booking_id: params.booking_id,
      inspector_id: params.confirming_user_id,
      has_damage: params.has_damages ?? false,
      damage_amount: params.damage_amount,
      damage_description: params.damage_description,
    }) as unknown as ConfirmAndReleaseResponse;
  }

  async confirmRenter(params: RenterConfirmParams): Promise<ConfirmAndReleaseResponse> {
    // Assume 'release funds' means accepting inspection/conclusion
    // In V2, renter usually only acts if damaged.
    // If Good, funds auto-release or can use resolveConclusion(accept=true)
    return this.resolveConclusion({
      booking_id: params.booking_id,
      renter_id: params.confirming_user_id,
      accept_damage: true, // Implicit acceptance for legacy calls
    }) as unknown as ConfirmAndReleaseResponse;
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
