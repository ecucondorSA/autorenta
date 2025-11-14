import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

/**
 * TikTok Events Service
 *
 * Servicio para enviar eventos de tracking a TikTok Pixel vía Edge Function.
 * Todos los eventos se envían desde el servidor para mayor seguridad.
 *
 * @example
 * ```typescript
 * // Track cuando un usuario ve un auto
 * tiktokEvents.trackViewContent({
 *   contentId: car.id,
 *   contentName: car.title,
 *   value: car.pricePerDay,
 *   currency: 'ARS'
 * });
 *
 * // Track cuando un usuario completa el registro
 * tiktokEvents.trackCompleteRegistration({
 *   value: 0,
 *   currency: 'ARS'
 * });
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class TikTokEventsService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly edgeFunctionUrl = `${environment.supabaseUrl}/functions/v1/tiktok-events`;
  private readonly isEnabled = environment.production; // ✅ ENABLED in production

  /**
   * Track ViewContent event
   * Cuando un usuario ve una página importante (detalle de auto, comparación, etc.)
   */
  async trackViewContent(params: {
    contentId: string;
    contentName: string;
    contentType?: string;
    value?: number;
    currency?: string;
    url?: string;
  }): Promise<void> {
    await this.sendEvent('ViewContent', {
      content_id: params.contentId,
      content_name: params.contentName,
      content_type: params.contentType || 'product',
      value: params.value,
      currency: params.currency || 'ARS',
      url: params.url || window.location.href,
    });
  }

  /**
   * Track AddToWishlist event
   * Cuando un usuario agrega un auto a favoritos
   */
  async trackAddToWishlist(params: {
    contentId: string;
    contentName: string;
    value?: number;
    currency?: string;
  }): Promise<void> {
    await this.sendEvent('AddToWishlist', {
      content_id: params.contentId,
      content_name: params.contentName,
      content_type: 'product',
      value: params.value,
      currency: params.currency || 'ARS',
      url: window.location.href,
    });
  }

  /**
   * Track Search event
   * Cuando un usuario realiza una búsqueda
   */
  async trackSearch(params: {
    searchString: string;
    value?: number;
    currency?: string;
  }): Promise<void> {
    await this.sendEvent('Search', {
      search_string: params.searchString,
      value: params.value,
      currency: params.currency || 'ARS',
      url: window.location.href,
    });
  }

  /**
   * Track AddPaymentInfo event
   * Cuando un usuario agrega su información de pago
   */
  async trackAddPaymentInfo(params: {
    value: number;
    currency?: string;
    contentId?: string;
  }): Promise<void> {
    await this.sendEvent('AddPaymentInfo', {
      value: params.value,
      currency: params.currency || 'ARS',
      content_id: params.contentId,
      url: window.location.href,
    });
  }

  /**
   * Track AddToCart event
   * Cuando un usuario inicia el proceso de booking (equivalente a agregar al carrito)
   */
  async trackAddToCart(params: {
    contentId: string;
    contentName: string;
    value: number;
    currency?: string;
    quantity?: number;
  }): Promise<void> {
    await this.sendEvent('AddToCart', {
      content_id: params.contentId,
      content_name: params.contentName,
      content_type: 'product',
      value: params.value,
      currency: params.currency || 'ARS',
      contents: [
        {
          content_id: params.contentId,
          content_name: params.contentName,
          quantity: params.quantity || 1,
          price: params.value,
        },
      ],
      url: window.location.href,
    });
  }

  /**
   * Track InitiateCheckout event
   * Cuando un usuario confirma la reserva y procede al pago
   */
  async trackInitiateCheckout(params: {
    contentId: string;
    contentName: string;
    value: number;
    currency?: string;
    contents?: Array<{
      content_id: string;
      content_name: string;
      quantity: number;
      price: number;
    }>;
  }): Promise<void> {
    await this.sendEvent('InitiateCheckout', {
      content_id: params.contentId,
      content_name: params.contentName,
      content_type: 'product',
      value: params.value,
      currency: params.currency || 'ARS',
      contents: params.contents || [
        {
          content_id: params.contentId,
          content_name: params.contentName,
          quantity: 1,
          price: params.value,
        },
      ],
      url: window.location.href,
    });
  }

  /**
   * Track PlaceAnOrder event
   * Cuando un usuario formaliza el pedido (crea la reserva)
   */
  async trackPlaceAnOrder(params: {
    contentId: string;
    contentName: string;
    value: number;
    currency?: string;
  }): Promise<void> {
    await this.sendEvent('PlaceAnOrder', {
      content_id: params.contentId,
      content_name: params.contentName,
      content_type: 'product',
      value: params.value,
      currency: params.currency || 'ARS',
      url: window.location.href,
    });
  }

  /**
   * Track CompleteRegistration event
   * Cuando un usuario completa el registro
   */
  async trackCompleteRegistration(params?: {
    value?: number;
    currency?: string;
  }): Promise<void> {
    await this.sendEvent('CompleteRegistration', {
      value: params?.value || 0,
      currency: params?.currency || 'ARS',
      url: window.location.href,
    });
  }

  /**
   * Track Purchase event
   * Cuando un usuario completa el pago de la reserva
   */
  async trackPurchase(params: {
    contentId: string;
    contentName: string;
    value: number;
    currency?: string;
    contents?: Array<{
      content_id: string;
      content_name: string;
      quantity: number;
      price: number;
    }>;
  }): Promise<void> {
    await this.sendEvent('Purchase', {
      content_id: params.contentId,
      content_name: params.contentName,
      content_type: 'product',
      value: params.value,
      currency: params.currency || 'ARS',
      contents: params.contents || [
        {
          content_id: params.contentId,
          content_name: params.contentName,
          quantity: 1,
          price: params.value,
        },
      ],
      url: window.location.href,
    });
  }

  /**
   * Send event to Edge Function
   */
  private async sendEvent(
    event: string,
    properties: Record<string, unknown>
  ): Promise<void> {
    if (!this.isEnabled) {
      console.log('[TikTok Events] Disabled in development');
      return;
    }

    try {
      const user = await this.authService.getCurrentUser();

      // Get ttclid from URL parameters (TikTok click ID)
      const urlParams = new URLSearchParams(window.location.search);
      const ttclid = urlParams.get('ttclid');

      const payload = {
        event,
        event_time: Date.now(),
        user: {
          external_id: user?.id,
          email: user?.email,
          ttclid: ttclid || undefined,
        },
        properties,
      };

      await firstValueFrom(
        this.http.post(this.edgeFunctionUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );

      console.log(`[TikTok Events] ${event} sent successfully`);
    } catch (error) {
      // Fail silently to not break user experience
      console.error(`[TikTok Events] Error sending ${event}:`, error);
    }
  }
}
