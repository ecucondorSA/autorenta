import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { SupabaseClientService } from './supabase-client.service';
import { AuthService } from './auth.service';

/**
 * Tipos de eventos de conversión que trackeamos
 */
export type ConversionEventType =
  // Date Picker Events
  | 'date_preset_clicked'
  | 'date_range_selected'
  | 'date_availability_checked'
  | 'date_unavailable_error'
  | 'date_autosuggest_applied'
  | 'alternative_dates_suggested'
  | 'alternative_date_applied'
  // Social Proof Events
  | 'social_proof_viewed'
  | 'urgency_indicator_viewed'
  // CTA Events
  | 'cta_clicked'
  | 'cta_hovered'
  // Booking Events
  | 'booking_initiated'
  | 'booking_completed'
  | 'booking_failed'
  // Owner Events
  | 'owner_profile_viewed'
  | 'owner_contact_clicked'
  // Review Events
  | 'review_viewed'
  | 'review_section_clicked'
  // Wallet Events
  | 'wallet_page_viewed'
  | 'wallet_onboarding_banner_viewed'
  | 'wallet_onboarding_cta_clicked'
  | 'wallet_deposit_modal_opened'
  | 'wallet_deposit_initiated'
  | 'wallet_deposit_completed'
  | 'wallet_deposit_failed'
  | 'wallet_protected_credit_milestone'
  | 'wallet_cta_clicked'
  | 'wallet_benefits_section_expanded'
  | 'wallet_transaction_filter_applied'
  | 'wallet_retry_deposit_clicked';

export interface ConversionEventData {
  // Common fields
  car_id?: string;
  user_id?: string | null;

  // Date picker specific
  preset_type?: 'weekend' | '1week' | '2weeks' | '1month';
  days_count?: number;
  total_price?: number;
  is_available?: boolean;
  from_date?: string;
  to_date?: string;
  source?: string;

  // CTA specific
  has_dates?: boolean;
  express_mode?: boolean;

  // Booking specific
  payment_method?: string;
  total_amount?: number;

  // Social proof specific
  indicator_type?: 'viewers' | 'bookings' | 'availability' | 'badge';
  badge_type?: 'popular' | 'high_demand' | 'superhost';

  // Wallet specific
  deposit_amount?: number;
  deposit_type?: 'protected_credit' | 'withdrawable';
  deposit_provider?: 'mercadopago' | 'stripe' | 'bank_transfer';
  protected_credit_balance?: number;
  protected_credit_progress?: number;
  milestone_percentage?: number;
  transaction_filter?: string;
  cta_type?: string;
  error_message?: string;
  failure_reason?: string;

  // Additional metadata
  [key: string]: unknown;
}

// Declaración global para gtag (Google Analytics)
declare global {
  interface Window {
    gtag?: (command: string, eventName: string | Date, params?: Record<string, unknown>) => void;
    dataLayer?: unknown[];
  }
}

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  private readonly supabase = inject(SupabaseClientService).getClient();
  private readonly authService = inject(AuthService);
  private readonly isEnabled = environment.enableAnalytics;
  private readonly ga4MeasurementId = environment.googleAnalyticsMeasurementId;

  /**
   * Track de evento principal - envía a GA4 y Supabase
   */
  trackEvent(eventType: ConversionEventType, data: ConversionEventData = {}): void {
    if (!this.isEnabled) return;

    // Track en GA4
    this.trackGA4Event(eventType, data);

    // Track en Supabase (async, no bloqueante)
    void this.trackSupabaseEvent(eventType, data);
  }

  /**
   * Track de evento en Google Analytics 4
   */
  private trackGA4Event(eventType: ConversionEventType, data: ConversionEventData): void {
    if (!this.ga4MeasurementId || typeof window === 'undefined' || !window.gtag) {
      return;
    }

    try {
      // Mapear nuestros eventos a eventos GA4 estándar o custom
      const ga4EventName = this.mapToGA4EventName(eventType);

      // Preparar parámetros para GA4
      const params: Record<string, unknown> = {
        ...data,
        // Agregar metadata adicional
        timestamp: new Date().toISOString(),
        user_authenticated: this.authService.isAuthenticated(),
      };

      // Enviar a GA4
      window.gtag!('event', ga4EventName, params);
    } catch (error) {
      console.error('Error tracking GA4 event:', error);
    }
  }

  /**
   * Track de evento en Supabase
   */
  private async trackSupabaseEvent(
    eventType: ConversionEventType,
    data: ConversionEventData,
  ): Promise<void> {
    try {
      const userId = data.user_id ?? (await this.getCurrentUserId());

      const { error } = await this.supabase.from('conversion_events').insert({
        event_type: eventType,
        car_id: data.car_id ?? null,
        user_id: userId,
        event_data: data,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error('Error tracking Supabase event:', error);
      }
    } catch (error) {
      console.error('Error in trackSupabaseEvent:', error);
    }
  }

  /**
   * Mapea nuestros eventos custom a eventos GA4 estándar o custom
   */
  private mapToGA4EventName(eventType: ConversionEventType): string {
    const mapping: Record<ConversionEventType, string> = {
      // Date Picker
      date_preset_clicked: 'select_content',
      date_range_selected: 'begin_checkout',
      date_availability_checked: 'view_item',
      date_unavailable_error: 'exception',
      date_autosuggest_applied: 'select_content',
      alternative_dates_suggested: 'select_content',
      alternative_date_applied: 'select_content',

      // Social Proof
      social_proof_viewed: 'view_promotion',
      urgency_indicator_viewed: 'view_promotion',

      // CTA
      cta_clicked: 'add_to_cart',
      cta_hovered: 'select_promotion',

      // Booking
      booking_initiated: 'begin_checkout',
      booking_completed: 'purchase',
      booking_failed: 'exception',

      // Owner
      owner_profile_viewed: 'view_item_list',
      owner_contact_clicked: 'generate_lead',

      // Reviews
      review_viewed: 'view_item',
      review_section_clicked: 'select_content',

      // Wallet
      wallet_page_viewed: 'page_view',
      wallet_onboarding_banner_viewed: 'view_promotion',
      wallet_onboarding_cta_clicked: 'select_promotion',
      wallet_deposit_modal_opened: 'begin_checkout',
      wallet_deposit_initiated: 'add_payment_info',
      wallet_deposit_completed: 'purchase',
      wallet_deposit_failed: 'exception',
      wallet_protected_credit_milestone: 'level_up',
      wallet_cta_clicked: 'select_content',
      wallet_benefits_section_expanded: 'view_item',
      wallet_transaction_filter_applied: 'search',
      wallet_retry_deposit_clicked: 'refund',
    };

    return mapping[eventType] || eventType;
  }

  /**
   * Obtiene el ID del usuario actual
   */
  private async getCurrentUserId(): Promise<string | null> {
    try {
      const { data } = await this.supabase.auth.getUser();
      return data.user?.id ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Track de pageview (para Single Page Applications)
   */
  trackPageView(path: string, title?: string): void {
    if (!this.isEnabled || !this.ga4MeasurementId || !window.gtag) return;

    try {
      window.gtag('event', 'page_view', {
        page_path: path,
        page_title: title,
      });
    } catch (error) {
      console.error('Error tracking pageview:', error);
    }
  }

  /**
   * Set user properties en GA4
   */
  setUserProperties(properties: Record<string, unknown>): void {
    if (!this.isEnabled || !this.ga4MeasurementId || !window.gtag) return;

    try {
      window.gtag('set', 'user_properties', properties);
    } catch (error) {
      console.error('Error setting user properties:', error);
    }
  }
}
