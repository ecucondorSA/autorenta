import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FacebookLogin, FacebookLoginResponse } from '@capacitor-community/facebook-login';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';

declare global {
  interface Window {
    FB?: {
      init: (params: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void;
      login: (
        callback: (response: { authResponse?: { accessToken: string } }) => void,
        params?: { scope?: string; config_id?: string },
      ) => void;
      getLoginStatus: (
        callback: (response: { status: string; authResponse?: { accessToken: string } }) => void,
      ) => void;
      AppEvents: { logPageView: () => void };
    };
    fbAsyncInit?: () => void;
  }
}

@Injectable({
  providedIn: 'root',
})
export class FacebookAuthService {
  private readonly supabase = injectSupabase();
  private readonly logger = inject(LoggerService);
  private readonly platformId = inject(PLATFORM_ID);
  private initialized = false;
  private sdkReady = false;
  private readonly FB_APP_ID = '4435998730015502';
  // Facebook Login for Business config_id (created in Meta Developer Console)
  // This replaces the traditional scope/permissions approach
  private readonly FB_CONFIG_ID = '1694279408246423';

  constructor() {
    // Don't initialize in constructor - wait for explicit call or first login
  }

  /**
   * Check if Facebook SDK is available
   */
  private isFBAvailable(): boolean {
    return isPlatformBrowser(this.platformId) && typeof window.FB !== 'undefined';
  }

  /**
   * Detect expected/benign Facebook errors (ad blockers, user cancellation, SDK blocked)
   * These errors should NOT be sent to Sentry as they are user-environment issues
   */
  private isExpectedFacebookError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error ?? '');
    const lowerMessage = message.toLowerCase();

    // Comprehensive list of expected Facebook error patterns
    const expectedPatterns = [
      'ad blocker',
      'bloqueador',
      'sdk',
      'fb is not defined',
      'fb not defined',
      'not available',
      'no está disponible',
      'cancelled',
      'canceled',
      'cancelado',
      'blocked',
      'bloqueado',
      'timeout',
      'network',
      'failed to load',
      'not loaded',
      'no cargado',
      'popup',
      'window closed',
      'user denied',
      'permission denied',
      'access denied',
      'login was cancelled',
      'login failed',
      'not initialized',
      'initialization failed',
      'config_id',
      'fblogin',
      'facebook login',
    ];

    return expectedPatterns.some(pattern => lowerMessage.includes(pattern));
  }

  /**
   * Create a user-friendly error that won't be sent to Sentry
   * by marking it as an expected error
   */
  private createExpectedError(message: string): Error {
    const error = new Error(message);
    error.name = 'FacebookExpectedError';
    return error;
  }

  /**
   * Wait for Facebook SDK to be loaded (web only)
   */
  private waitForFacebookSDK(timeout = 10000): Promise<void> {
    return new Promise((resolve, reject) => {
      // If not in browser, resolve immediately
      if (!isPlatformBrowser(this.platformId)) {
        resolve();
        return;
      }

      // If FB is already defined and initialized, resolve immediately
      if (this.isFBAvailable()) {
        this.sdkReady = true;
        resolve();
        return;
      }

      this.logger.debug('Waiting for Facebook SDK to load...', 'FacebookAuthService');

      // Hook into fbAsyncInit if not already called
      const originalFbAsyncInit = window.fbAsyncInit;
      const startTime = Date.now();

      // Check periodically for FB object
      const checkInterval = setInterval(() => {
        if (this.isFBAvailable()) {
          clearInterval(checkInterval);
          this.sdkReady = true;
          this.logger.debug('Facebook SDK loaded successfully', 'FacebookAuthService');
          resolve();
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          this.logger.info(
            'Facebook SDK failed to load - may be blocked by ad blocker',
            'FacebookAuthService',
          );
          reject(
            new Error(
              'Facebook SDK failed to load. This may be due to an ad blocker or network issue.',
            ),
          );
        }
      }, 100);

      // Also set up fbAsyncInit hook as backup
      window.fbAsyncInit = function () {
        // Call original if exists
        if (originalFbAsyncInit) {
          originalFbAsyncInit();
        }
        // Our hook will be picked up by the interval check
      };
    });
  }

  /**
   * Initialize Facebook Login (required for Web)
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    try {
      // Wait for FB SDK to be ready on web
      if (isPlatformBrowser(this.platformId)) {
        await this.waitForFacebookSDK();

        // Double-check FB is available after waiting
        if (!this.isFBAvailable()) {
          throw new Error('Facebook SDK not available after initialization');
        }
      }

      await FacebookLogin.initialize({ appId: this.FB_APP_ID });
      this.initialized = true;
      this.logger.debug('Facebook Login initialized successfully', 'FacebookAuthService');
      return true;
    } catch (error) {
      if (this.isExpectedFacebookError(error)) {
        this.logger.info(
          'Failed to initialize Facebook Login - feature may be blocked by ad blocker',
          'FacebookAuthService',
          error,
        );
      } else {
        this.logger.warn(
          'Failed to initialize Facebook Login - feature may be blocked by ad blocker',
          'FacebookAuthService',
          error,
        );
      }
      this.initialized = false;
      return false;
    }
  }

  /**
   * Check if Facebook Login is available and ready
   */
  isAvailable(): boolean {
    return this.initialized && this.sdkReady;
  }

  /**
   * Login with Facebook (Native)
   * 1. Request Native Login
   * 2. Get Access Token
   * 3. Exchange for Supabase Session via Edge Function
   */
  async login(): Promise<void> {
    try {
      // Ensure initialized before login
      if (!this.initialized) {
        const success = await this.initialize();
        if (!success) {
          throw this.createExpectedError(
            'Facebook Login no está disponible. Puede estar bloqueado por un bloqueador de anuncios o extensión del navegador.',
          );
        }
      }

      // Double-check SDK is available (for web)
      if (isPlatformBrowser(this.platformId) && !this.isFBAvailable()) {
        throw this.createExpectedError(
          'El SDK de Facebook no está cargado. Por favor, desactiva tu bloqueador de anuncios e intenta de nuevo.',
        );
      }

      this.logger.debug('Starting Facebook Login...', 'FacebookAuthService');

      // Facebook Login for Business uses config_id instead of permissions
      // See: https://developers.facebook.com/docs/facebook-login/facebook-login-for-business/
      let token: string;

      if (isPlatformBrowser(this.platformId) && window.FB) {
        // Web: Use native FB SDK with config_id for Business Login
        this.logger.debug('Using FB SDK with config_id for Business Login', 'FacebookAuthService');

        const fbResponse = await new Promise<{ authResponse?: { accessToken: string } }>(
          (resolve, reject) => {
            window.FB!.login(
              (response) => {
                if (response.authResponse?.accessToken) {
                  resolve(response);
                } else {
                  reject(new Error('Facebook login was cancelled or failed'));
                }
              },
              {
                config_id: this.FB_CONFIG_ID,
              },
            );
          },
        );

        if (!fbResponse.authResponse?.accessToken) {
          throw new Error('No access token received from Facebook Login');
        }

        token = fbResponse.authResponse.accessToken;
      } else {
        // Native (Android/iOS): Use Capacitor plugin with permissions fallback
        const FACEBOOK_PERMISSIONS = ['public_profile'];
        const result = (await FacebookLogin.login({
          permissions: FACEBOOK_PERMISSIONS,
        })) as FacebookLoginResponse;

        if (!result.accessToken) {
          throw new Error('No access token received from Facebook Login');
        }

        // Extract token - handle both web SDK and native formats
        token =
          result.accessToken.token ||
          (result.accessToken as unknown as { tokenString?: string }).tokenString ||
          '';

        if (!token) {
          this.logger.error('Token structure:', 'FacebookAuthService', result.accessToken);
          throw new Error('Could not extract token from Facebook response');
        }
      }

      this.logger.debug(
        `Facebook Access Token received (${token.substring(0, 20)}...). Signing in with Supabase...`,
        'FacebookAuthService',
      );

      // Use Supabase's native signInWithIdToken for Facebook
      // Facebook access tokens are accepted as idToken by Supabase
      const { data, error } = await this.supabase.auth.signInWithIdToken({
        provider: 'facebook',
        token: token,
      });

      if (error) {
        throw new Error(`Supabase Auth Error: ${error.message}`);
      }

      if (!data.session) {
        throw new Error('Failed to create session from Facebook token');
      }

      this.logger.debug('Session created successfully', 'FacebookAuthService');

      this.logger.info('Facebook Login Successful', 'FacebookAuthService');
    } catch (error) {
      if (this.isExpectedFacebookError(error)) {
        this.logger.info('Facebook Login Failed (expected)', 'FacebookAuthService', error);
      } else {
        this.logger.error('Facebook Login Failed', 'FacebookAuthService', error);
      }
      throw error;
    }
  }

  async logout(): Promise<void> {
    await FacebookLogin.logout();
  }
}
