import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FacebookLogin, FacebookLoginResponse } from '@capacitor-community/facebook-login';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';

declare global {
  interface Window {
    FB?: {
      init: (params: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void;
      login: (callback: (response: { authResponse?: { accessToken: string } }) => void, params?: { scope: string }) => void;
      getLoginStatus: (callback: (response: { status: string; authResponse?: { accessToken: string } }) => void) => void;
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
          this.logger.warn('Facebook SDK failed to load - may be blocked by ad blocker', 'FacebookAuthService');
          reject(new Error('Facebook SDK failed to load. This may be due to an ad blocker or network issue.'));
        }
      }, 100);

      // Also set up fbAsyncInit hook as backup
      window.fbAsyncInit = function() {
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
      this.logger.warn('Failed to initialize Facebook Login - feature may be blocked by ad blocker', 'FacebookAuthService', error);
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
           throw new Error('Facebook Login no está disponible. Puede estar bloqueado por un bloqueador de anuncios o extensión del navegador.');
         }
       }

       // Double-check SDK is available (for web)
       if (isPlatformBrowser(this.platformId) && !this.isFBAvailable()) {
         throw new Error('El SDK de Facebook no está cargado. Por favor, desactiva tu bloqueador de anuncios e intenta de nuevo.');
       }

       this.logger.debug('Starting Facebook Login...', 'FacebookAuthService');

       // Facebook valid permissions: https://developers.facebook.com/docs/facebook-login/permissions
       // Removed 'email' - use 'user_email' instead for user profile data
       const FACEBOOK_PERMISSIONS = ['public_profile'];

       const result = await FacebookLogin.login({ permissions: FACEBOOK_PERMISSIONS }) as FacebookLoginResponse;

      if (!result.accessToken) {
        throw new Error('No access token received from Facebook Login');
      }

      this.logger.debug('Facebook Access Token received. Signing in with Supabase...', 'FacebookAuthService');

      // Use Supabase's native signInWithIdToken for Facebook
      // Facebook access tokens are accepted as idToken by Supabase
      const { data, error } = await this.supabase.auth.signInWithIdToken({
        provider: 'facebook',
        token: result.accessToken.token,
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
      this.logger.error('Facebook Login Failed', 'FacebookAuthService', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    await FacebookLogin.logout();
  }
}
