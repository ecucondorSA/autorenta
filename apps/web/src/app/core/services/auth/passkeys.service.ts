import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import {
  browserSupportsWebAuthn,
  browserSupportsWebAuthnAutofill,
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/types';

export type PasskeyState =
  | 'idle'
  | 'checking'
  | 'registering'
  | 'authenticating'
  | 'success'
  | 'error';

@Injectable({
  providedIn: 'root',
})
export class PasskeysService {
  private readonly supabase = injectSupabase();
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly logger = inject(LoggerService);
  private readonly router = inject(Router);

  /** Estado actual del proceso de passkeys */
  readonly state = signal<PasskeyState>('idle');

  /** Error actual si hay */
  readonly error = signal<string | null>(null);

  /** Si el dispositivo soporta WebAuthn */
  readonly isSupported = signal<boolean>(false);

  /** Si el dispositivo soporta autofill condicional */
  readonly supportsAutofill = signal<boolean>(false);

  constructor() {
    if (this.isBrowser) {
      this.checkSupport();
    }
  }

  /**
   * Verifica si el dispositivo soporta WebAuthn/Passkeys
   */
  async checkSupport(): Promise<boolean> {
    if (!this.isBrowser) {
      this.logger.debug('Passkeys: Not in browser, skipping support check', 'PasskeysService');
      return false;
    }

    this.state.set('checking');

    try {
      const supported = browserSupportsWebAuthn();
      this.isSupported.set(supported);

      if (supported) {
        const autofillSupported = await browserSupportsWebAuthnAutofill();
        this.supportsAutofill.set(autofillSupported);
        this.logger.info('Passkeys: Support detected', 'PasskeysService', {
          webauthn: supported,
          autofill: autofillSupported,
        });
      } else {
        this.logger.debug('Passkeys: Not supported on this device', 'PasskeysService');
      }

      this.state.set('idle');
      return supported;
    } catch (err) {
      this.logger.error(
        'Passkeys: Support check failed',
        'PasskeysService',
        err instanceof Error ? err : new Error(String(err)),
      );
      this.state.set('error');
      return false;
    }
  }

  /**
   * Registra una nueva passkey para el usuario actual
   * Requiere que el usuario esté autenticado
   */
  async register(): Promise<boolean> {
    if (!this.isBrowser || !this.isSupported()) {
      this.error.set('Tu dispositivo no soporta passkeys');
      return false;
    }

    this.state.set('registering');
    this.error.set(null);

    try {
      // 1. Obtener opciones de registro desde el backend
      const { data: options, error: optionsError } =
        await this.supabase.functions.invoke<PublicKeyCredentialCreationOptionsJSON>(
          'passkeys-registration-options',
        );

      if (optionsError || !options) {
        throw new Error(optionsError?.message || 'No se pudieron obtener las opciones de registro');
      }

      this.logger.debug('Passkeys: Got registration options', 'PasskeysService');

      // 2. Crear credencial usando WebAuthn API
      const credential = await startRegistration({ optionsJSON: options });

      this.logger.debug('Passkeys: Credential created', 'PasskeysService');

      // 3. Verificar y guardar credencial en el backend
      const { data: verifyResult, error: verifyError } = await this.supabase.functions.invoke<{
        success: boolean;
        error?: string;
      }>('passkeys-registration-verify', { body: { credential } });

      if (verifyError || !verifyResult?.success) {
        throw new Error(
          verifyError?.message || verifyResult?.error || 'No se pudo verificar la credencial',
        );
      }

      this.state.set('success');
      this.logger.info('Passkeys: Registration successful', 'PasskeysService');
      return true;
    } catch (err) {
      const errorMessage = this.getErrorMessage(err);
      this.error.set(errorMessage);
      this.state.set('error');

      // ✅ FIX: Use warn for expected WebAuthn errors (user cancelled, timeout, etc.)
      const isExpectedError =
        err instanceof Error &&
        ['NotAllowedError', 'AbortError', 'InvalidStateError'].includes(err.name);

      if (isExpectedError) {
        this.logger.warn('Passkeys: Registration cancelled or expected error', 'PasskeysService');
      } else {
        this.logger.error(
          'Passkeys: Registration failed',
          'PasskeysService',
          err instanceof Error ? err : new Error(String(err)),
        );
      }
      return false;
    }
  }

  /**
   * Autentica usando una passkey existente
   * Puede usarse sin estar logueado previamente
   */
  async authenticate(): Promise<boolean> {
    if (!this.isBrowser || !this.isSupported()) {
      this.error.set('Tu dispositivo no soporta passkeys');
      return false;
    }

    this.state.set('authenticating');
    this.error.set(null);

    try {
      // 1. Obtener opciones de autenticación desde el backend
      const { data: options, error: optionsError } =
        await this.supabase.functions.invoke<PublicKeyCredentialRequestOptionsJSON>(
          'passkeys-authentication-options',
        );

      if (optionsError || !options) {
        throw new Error(
          optionsError?.message || 'No se pudieron obtener las opciones de autenticación',
        );
      }

      this.logger.debug('Passkeys: Got authentication options', 'PasskeysService');

      // 2. Autenticar usando WebAuthn API
      const credential = await startAuthentication({ optionsJSON: options });

      this.logger.debug('Passkeys: Authentication credential obtained', 'PasskeysService');

      // 3. Verificar credencial en el backend y obtener sesión
      const { data: verifyResult, error: verifyError } = await this.supabase.functions.invoke<{
        success: boolean;
        session?: { access_token: string; refresh_token: string };
        error?: string;
      }>('passkeys-authentication-verify', { body: { credential } });

      if (verifyError || !verifyResult?.success) {
        throw new Error(
          verifyError?.message || verifyResult?.error || 'No se pudo verificar la autenticación',
        );
      }

      // 4. Establecer sesión en Supabase
      if (verifyResult.session) {
        const { error: setSessionError } = await this.supabase.auth.setSession({
          access_token: verifyResult.session.access_token,
          refresh_token: verifyResult.session.refresh_token,
        });

        if (setSessionError) {
          throw new Error(`Error estableciendo sesión: ${setSessionError.message}`);
        }
      }

      this.state.set('success');
      this.logger.info('Passkeys: Authentication successful', 'PasskeysService');
      return true;
    } catch (err) {
      const errorMessage = this.getErrorMessage(err);
      this.error.set(errorMessage);
      this.state.set('error');

      // ✅ FIX: Use warn for expected WebAuthn errors (user cancelled, timeout, etc.)
      const isExpectedError =
        err instanceof Error &&
        ['NotAllowedError', 'AbortError', 'InvalidStateError'].includes(err.name);

      if (isExpectedError) {
        this.logger.warn('Passkeys: Authentication cancelled or expected error', 'PasskeysService');
      } else {
        this.logger.error(
          'Passkeys: Authentication failed',
          'PasskeysService',
          err instanceof Error ? err : new Error(String(err)),
        );
      }
      return false;
    }
  }

  /**
   * Inicia autenticación condicional (autofill)
   * Permite que el usuario vea sus passkeys en el autofill del input de email
   */
  async startConditionalAuthentication(): Promise<void> {
    if (!this.isBrowser || !this.supportsAutofill()) {
      return;
    }

    try {
      // Obtener opciones para autenticación condicional
      const { data: options, error: optionsError } =
        await this.supabase.functions.invoke<PublicKeyCredentialRequestOptionsJSON>(
          'passkeys-authentication-options',
          { body: { conditional: true } },
        );

      if (optionsError || !options) {
        this.logger.debug('Passkeys: Could not get conditional auth options', 'PasskeysService');
        return;
      }

      // Iniciar autenticación condicional (no bloquea, espera que el usuario seleccione)
      const credential = await startAuthentication({
        optionsJSON: options,
        useBrowserAutofill: true,
      });

      // Si el usuario seleccionó una passkey, verificar
      if (credential) {
        this.state.set('authenticating');
        const { data: verifyResult, error: verifyError } = await this.supabase.functions.invoke<{
          success: boolean;
          session?: { access_token: string; refresh_token: string };
        }>('passkeys-authentication-verify', { body: { credential } });

        if (!verifyError && verifyResult?.success && verifyResult.session) {
          await this.supabase.auth.setSession({
            access_token: verifyResult.session.access_token,
            refresh_token: verifyResult.session.refresh_token,
          });

          this.state.set('success');
          // Redirigir a página principal
          const returnUrl =
            new URLSearchParams(window.location.search).get('returnUrl') || '/cars/list';
          await this.router.navigateByUrl(returnUrl);
        }
      }
    } catch (err) {
      // Autenticación condicional cancelada o fallida - no es un error crítico
      this.logger.debug('Passkeys: Conditional auth cancelled or failed', 'PasskeysService', err);
    }
  }

  /**
   * Lista las passkeys registradas del usuario actual
   */
  async listPasskeys(): Promise<Array<{ id: string; name: string; createdAt: string }>> {
    try {
      const { data, error } = await this.supabase.functions.invoke<{
        passkeys: Array<{ id: string; name: string; created_at: string }>;
      }>('passkeys-list');

      if (error || !data?.passkeys) {
        return [];
      }

      return data.passkeys.map((p) => ({
        id: p.id,
        name: p.name,
        createdAt: p.created_at,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Elimina una passkey registrada
   */
  async deletePasskey(passkeyId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.functions.invoke('passkeys-delete', {
        body: { passkeyId },
      });

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Convierte errores de WebAuthn a mensajes legibles
   */
  private getErrorMessage(err: unknown): string {
    if (err instanceof Error) {
      // Errores comunes de WebAuthn
      if (err.name === 'NotAllowedError') {
        return 'Operación cancelada o tiempo agotado';
      }
      if (err.name === 'InvalidStateError') {
        return 'Este dispositivo ya tiene una passkey registrada';
      }
      if (err.name === 'NotSupportedError') {
        return 'Tu dispositivo no soporta este tipo de autenticación';
      }
      if (err.name === 'SecurityError') {
        return 'Error de seguridad. Verifica que estés en HTTPS';
      }
      if (err.name === 'AbortError') {
        return 'La operación fue cancelada';
      }
      return err.message;
    }
    return 'Error desconocido al procesar passkey';
  }
}
