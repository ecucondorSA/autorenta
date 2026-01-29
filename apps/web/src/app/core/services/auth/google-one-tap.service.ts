import { isPlatformBrowser } from '@angular/common';
import { Injectable, NgZone, PLATFORM_ID, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { environment } from '@environment';

/**
 * Google Identity Services types
 * @see https://developers.google.com/identity/gsi/web/reference/js-reference
 */
interface GoogleCredentialResponse {
  credential: string;
  select_by:
    | 'auto'
    | 'user'
    | 'user_1tap'
    | 'user_2tap'
    | 'btn'
    | 'btn_confirm'
    | 'btn_add_session'
    | 'btn_confirm_add_session';
  clientId: string;
}

interface GooglePromptMomentNotification {
  isDisplayMoment(): boolean;
  isDisplayed(): boolean;
  isNotDisplayed(): boolean;
  getNotDisplayedReason():
    | 'browser_not_supported'
    | 'invalid_client'
    | 'missing_client_id'
    | 'opt_out_or_no_session'
    | 'secure_http_required'
    | 'suppressed_by_user'
    | 'unregistered_origin'
    | 'unknown_reason';
  isSkippedMoment(): boolean;
  getSkippedReason(): 'auto_cancel' | 'user_cancel' | 'tap_outside' | 'issuing_failed';
  isDismissedMoment(): boolean;
  getDismissedReason(): 'credential_returned' | 'cancel_called' | 'flow_restarted';
  getMomentType(): 'display' | 'skipped' | 'dismissed';
}

interface GoogleIdConfiguration {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  context?: 'signin' | 'signup' | 'use';
  prompt_parent_id?: string;
  nonce?: string;
  state_cookie_domain?: string;
  ux_mode?: 'popup' | 'redirect';
  login_uri?: string;
  native_callback?: (response: { id: string; password: string }) => void;
  itp_support?: boolean;
  use_fedcm_for_prompt?: boolean;
}

interface Google {
  accounts: {
    id: {
      initialize: (config: GoogleIdConfiguration) => void;
      prompt: (callback?: (notification: GooglePromptMomentNotification) => void) => void;
      cancel: () => void;
      disableAutoSelect: () => void;
      storeCredential: (
        credential: { id: string; password: string },
        callback?: () => void,
      ) => void;
      revoke: (
        hint: string,
        callback?: (response: { successful: boolean; error?: string }) => void,
      ) => void;
    };
  };
}

declare global {
  interface Window {
    google?: Google;
  }
}

export type OneTapState =
  | 'idle'
  | 'initializing'
  | 'ready'
  | 'showing'
  | 'success'
  | 'error'
  | 'cancelled';

@Injectable({
  providedIn: 'root',
})
export class GoogleOneTapService {
  private readonly supabase = injectSupabase();
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly logger = inject(LoggerService);
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);

  private initialized = false;
  private scriptLoaded = false;

  /** Estado actual del One-Tap */
  readonly state = signal<OneTapState>('idle');

  /** Error actual si hay */
  readonly error = signal<string | null>(null);

  /** Si One-Tap está disponible (client ID configurado) */
  readonly isAvailable = !!environment.googleOneTap?.clientId;

  /**
   * Inicializa Google One-Tap si está disponible
   * Debe llamarse una vez al inicio de la app o cuando se muestra el login
   */
  async initialize(): Promise<boolean> {
    if (!this.isBrowser) {
      this.logger.debug('One-Tap: Skipping initialization (not browser)', 'GoogleOneTap');
      return false;
    }

    if (!this.isAvailable) {
      this.logger.debug('One-Tap: Client ID not configured', 'GoogleOneTap');
      return false;
    }

    if (this.initialized) {
      this.logger.debug('One-Tap: Already initialized', 'GoogleOneTap');
      return true;
    }

    this.state.set('initializing');

    try {
      // Esperar a que el script de Google esté cargado
      await this.waitForGoogleScript();

      const clientId = environment.googleOneTap!.clientId!;

      window.google!.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => this.handleCredentialResponse(response),
        auto_select: environment.googleOneTap?.autoSelect ?? true,
        cancel_on_tap_outside: environment.googleOneTap?.cancelOnTapOutside ?? true,
        context: 'signin',
        itp_support: true,
        use_fedcm_for_prompt: true, // Usar FedCM para mejor compatibilidad
      });

      this.initialized = true;
      this.state.set('ready');
      this.logger.info('One-Tap: Initialized successfully', 'GoogleOneTap');
      return true;
    } catch (err) {
      this.state.set('error');
      this.error.set(err instanceof Error ? err.message : 'Error initializing One-Tap');
      this.logger.error(
        'One-Tap: Initialization failed',
        'GoogleOneTap',
        err instanceof Error ? err : new Error(String(err)),
      );
      return false;
    }
  }

  /**
   * Muestra el prompt de One-Tap
   * Si el usuario tiene sesión de Google, verá el popup automáticamente
   */
  showPrompt(): void {
    if (!this.isBrowser || !this.initialized || !window.google) {
      this.logger.warn('One-Tap: Cannot show prompt - not initialized', 'GoogleOneTap');
      return;
    }

    this.state.set('showing');
    this.error.set(null);

    window.google.accounts.id.prompt((notification) => {
      this.ngZone.run(() => {
        this.handlePromptMoment(notification);
      });
    });
  }

  /**
   * Cancela el prompt de One-Tap si está visible
   */
  cancel(): void {
    if (!this.isBrowser || !window.google) return;

    window.google.accounts.id.cancel();
    this.state.set('cancelled');
  }

  /**
   * Deshabilita auto-select para la sesión actual
   * Útil después de que el usuario cierra sesión manualmente
   */
  disableAutoSelect(): void {
    if (!this.isBrowser || !window.google) return;

    window.google.accounts.id.disableAutoSelect();
    this.logger.debug('One-Tap: Auto-select disabled', 'GoogleOneTap');
  }

  /**
   * Revoca el consentimiento de One-Tap para un usuario
   */
  async revoke(email: string): Promise<void> {
    if (!this.isBrowser || !window.google) return;

    return new Promise((resolve, reject) => {
      window.google!.accounts.id.revoke(email, (response) => {
        if (response.successful) {
          this.logger.info('One-Tap: Consent revoked', 'GoogleOneTap', { email });
          resolve();
        } else {
          this.logger.error('One-Tap: Revoke failed', 'GoogleOneTap', new Error(response.error));
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * Espera a que el script de Google Identity Services esté cargado
   */
  private waitForGoogleScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.google?.accounts?.id) {
        this.scriptLoaded = true;
        resolve();
        return;
      }

      // El script puede tardar en cargar
      let attempts = 0;
      const maxAttempts = 50; // 5 segundos máximo
      const interval = setInterval(() => {
        attempts++;

        if (window.google?.accounts?.id) {
          clearInterval(interval);
          this.scriptLoaded = true;
          resolve();
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          reject(new Error('Google Identity Services script failed to load'));
        }
      }, 100);
    });
  }

  /**
   * Maneja la respuesta de credencial de Google (JWT)
   */
  private async handleCredentialResponse(response: GoogleCredentialResponse): Promise<void> {
    this.logger.info('One-Tap: Credential received', 'GoogleOneTap', {
      selectBy: response.select_by,
    });

    try {
      // El credential es un JWT que contiene la información del usuario
      // Necesitamos enviarlo a Supabase para crear/vincular la sesión
      const { data, error } = await this.supabase.auth.signInWithIdToken({
        provider: 'google',
        token: response.credential,
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        this.state.set('success');
        this.logger.info('One-Tap: Login successful', 'GoogleOneTap', {
          userId: data.user?.id,
        });

        // Navegar a la página principal o returnUrl
        const returnUrl =
          new URLSearchParams(window.location.search).get('returnUrl') || '/cars/list';
        await this.router.navigateByUrl(returnUrl);
      }
    } catch (err) {
      this.state.set('error');
      const errorMessage = err instanceof Error ? err.message : 'Error processing credential';
      this.error.set(errorMessage);
      this.logger.error(
        'One-Tap: Credential processing failed',
        'GoogleOneTap',
        err instanceof Error ? err : new Error(String(err)),
      );
    }
  }

  /**
   * Maneja las notificaciones del prompt (display, skipped, dismissed)
   */
  private handlePromptMoment(notification: GooglePromptMomentNotification): void {
    if (notification.isDisplayMoment()) {
      if (notification.isDisplayed()) {
        this.logger.debug('One-Tap: Prompt displayed', 'GoogleOneTap');
      } else {
        const reason = notification.getNotDisplayedReason();
        this.logger.debug('One-Tap: Prompt not displayed', 'GoogleOneTap', { reason });

        // No es un error, simplemente no hay sesión de Google disponible
        if (reason === 'opt_out_or_no_session') {
          this.state.set('idle');
        } else {
          this.state.set('error');
          this.error.set(this.getNotDisplayedReasonMessage(reason));
        }
      }
    }

    if (notification.isSkippedMoment()) {
      const reason = notification.getSkippedReason();
      this.logger.debug('One-Tap: Prompt skipped', 'GoogleOneTap', { reason });
      this.state.set('cancelled');
    }

    if (notification.isDismissedMoment()) {
      const reason = notification.getDismissedReason();
      this.logger.debug('One-Tap: Prompt dismissed', 'GoogleOneTap', { reason });

      if (reason === 'credential_returned') {
        // El usuario seleccionó una cuenta - handleCredentialResponse se encargará
      } else {
        this.state.set('cancelled');
      }
    }
  }

  /**
   * Convierte razones de no-display a mensajes legibles
   */
  private getNotDisplayedReasonMessage(reason: string): string {
    const messages: Record<string, string> = {
      browser_not_supported: 'Tu navegador no soporta One-Tap',
      invalid_client: 'Configuración de cliente inválida',
      missing_client_id: 'Client ID no configurado',
      opt_out_or_no_session: 'No hay sesión de Google activa',
      secure_http_required: 'Se requiere HTTPS',
      suppressed_by_user: 'One-Tap deshabilitado por el usuario',
      unregistered_origin: 'Origen no registrado en Google Cloud',
      unknown_reason: 'Error desconocido',
    };
    return messages[reason] || reason;
  }
}
