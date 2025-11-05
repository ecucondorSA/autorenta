import { Injectable, signal, computed, inject } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { from, Observable, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { SupabaseClientService } from './supabase-client.service';
import { LoggerService } from './logger.service';

export interface DriverProfile {
  user_id: string;
  class: number;
  driver_score: number;
  good_years: number;
  total_claims: number;
  claims_with_fault: number;
  total_bookings: number;
  clean_bookings: number;
  clean_percentage: number;
  last_claim_at: string | null;
  last_claim_with_fault: boolean | null;
  last_class_update: string;
  fee_multiplier: number;
  guarantee_multiplier: number;
  class_description: string;
  is_active: boolean;
}

export interface ClassBenefits {
  current_class: number;
  current_class_description: string;
  current_fee_multiplier: number;
  current_guarantee_multiplier: number;
  next_better_class: number;
  next_better_description: string;
  next_better_fee_multiplier: number;
  next_better_guarantee_multiplier: number;
  clean_bookings_needed: number;
  can_improve: boolean;
}

export interface ClassUpdateResult {
  old_class: number;
  new_class: number;
  class_change: number;
  reason: string;
  fee_multiplier_old: number;
  fee_multiplier_new: number;
  guarantee_multiplier_old: number;
  guarantee_multiplier_new: number;
}

@Injectable({
  providedIn: 'root',
})
export class DriverProfileService {
  private readonly supabase: SupabaseClient = inject(SupabaseClientService).getClient();
  private readonly logger = inject(LoggerService);

  readonly profile = signal<DriverProfile | null>(null);
  readonly loading = signal(false);
  readonly error = signal<{ message: string } | null>(null);

  // Computed signals for easy access
  readonly driverClass = computed(() => this.profile()?.class ?? 5);
  readonly driverScore = computed(() => this.profile()?.driver_score ?? 50);
  readonly cleanPercentage = computed(() => this.profile()?.clean_percentage ?? 0);
  readonly feeMultiplier = computed(() => this.profile()?.fee_multiplier ?? 1.0);
  readonly guaranteeMultiplier = computed(() => this.profile()?.guarantee_multiplier ?? 1.0);
  readonly classDescription = computed(() => this.profile()?.class_description ?? 'Conductor base (sin historial)');

  constructor() {
    // Auto-load profile on service init
    this.getProfile().subscribe();
  }

  /**
   * Get driver profile with class and multipliers
   */
  getProfile(userId?: string): Observable<DriverProfile> {
    this.loading.set(true);
    this.error.set(null);

    return from(
      this.supabase.rpc('get_driver_profile', userId ? { p_user_id: userId } : {})
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        if (!data || data.length === 0) {
          // No profile yet, initialize one
          throw new Error('NO_PROFILE');
        }
        const profile = data[0] as DriverProfile;
        this.profile.set(profile);
        return profile;
      }),
      catchError((err) => {
        if (err.message === 'NO_PROFILE') {
          // Initialize profile and retry
          return this.initializeProfile(userId).pipe(
            tap(() => this.logger.info('Driver profile initialized')),
            switchMap(() => this.getProfile(userId))
          );
        }
        this.handleError(err, 'Error al obtener perfil de conductor');
        return throwError(() => err);
      }),
      tap(() => this.loading.set(false))
    );
  }

  /**
   * Initialize driver profile for new user (class 5)
   */
  initializeProfile(userId?: string): Observable<string> {
    this.loading.set(true);
    this.error.set(null);

    return from(
      this.supabase.rpc('initialize_driver_profile', userId ? { p_user_id: userId } : {})
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data as string;
      }),
      catchError((err) => {
        this.handleError(err, 'Error al inicializar perfil');
        return throwError(() => err);
      }),
      tap(() => this.loading.set(false))
    );
  }

  /**
   * Update driver class after booking or claim
   */
  updateClassOnEvent(params: {
    userId: string;
    bookingId?: string;
    claimId?: string;
    claimWithFault?: boolean;
    claimSeverity?: number;
  }): Observable<ClassUpdateResult> {
    this.loading.set(true);
    this.error.set(null);

    return from(
      this.supabase.rpc('update_driver_class_on_event', {
        p_user_id: params.userId,
        p_booking_id: params.bookingId ?? null,
        p_claim_id: params.claimId ?? null,
        p_claim_with_fault: params.claimWithFault ?? false,
        p_claim_severity: params.claimSeverity ?? 1,
      })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        const result = data[0] as ClassUpdateResult;

        // Refresh profile after update
        this.getProfile(params.userId).subscribe();

        return result;
      }),
      catchError((err) => {
        this.handleError(err, 'Error al actualizar clase de conductor');
        return throwError(() => err);
      }),
      tap(() => this.loading.set(false))
    );
  }

  /**
   * Get class benefits and requirements for next class
   */
  getClassBenefits(userId?: string): Observable<ClassBenefits> {
    this.loading.set(true);
    this.error.set(null);

    return from(
      this.supabase.rpc('get_user_class_benefits', userId ? { p_user_id: userId } : {})
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        if (!data || data.length === 0) {
          throw new Error('No se pudieron obtener beneficios de clase');
        }
        return data[0] as ClassBenefits;
      }),
      catchError((err) => {
        this.handleError(err, 'Error al obtener beneficios de clase');
        return throwError(() => err);
      }),
      tap(() => this.loading.set(false))
    );
  }

  /**
   * Refresh profile (useful after changes)
   */
  refresh(): void {
    this.getProfile().subscribe();
  }

  private handleError(error: any, defaultMessage: string): void {
    const message = error?.message || defaultMessage;
    this.error.set({ message });
    this.loading.set(false);
    this.logger.error(defaultMessage, error);
  }
}
