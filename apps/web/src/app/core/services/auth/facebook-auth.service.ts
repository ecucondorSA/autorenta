import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FacebookLogin, FacebookLoginResponse } from '@capacitor-community/facebook-login';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';

@Injectable({
  providedIn: 'root',
})
export class FacebookAuthService {
  private readonly supabase = injectSupabase();
  private readonly logger = inject(LoggerService);
  private readonly platformId = inject(PLATFORM_ID);
  private initialized = false;

  constructor() {
    // Don't initialize in constructor - wait for explicit call or first login
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

      // If FB is already defined, resolve immediately
      if (typeof (window as unknown as { FB?: unknown }).FB !== 'undefined') {
        resolve();
        return;
      }

      // Wait for fbAsyncInit
      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        if (typeof (window as unknown as { FB?: unknown }).FB !== 'undefined') {
          clearInterval(checkInterval);
          resolve();
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          reject(new Error('Facebook SDK failed to load within timeout'));
        }
      }, 100);
    });
  }

  /**
   * Initialize Facebook Login (required for Web)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Wait for FB SDK to be ready on web
      if (isPlatformBrowser(this.platformId)) {
        await this.waitForFacebookSDK();
      }

      await FacebookLogin.initialize({ appId: '4435998730015502' });
      this.initialized = true;
      this.logger.debug('Facebook Login initialized successfully', 'FacebookAuthService');
    } catch (error) {
      this.logger.warn('Failed to initialize Facebook Login - feature disabled', 'FacebookAuthService', error);
    }
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
         await this.initialize();
       }

       this.logger.debug('Starting Facebook Login...', 'FacebookAuthService');

       // Facebook valid permissions: https://developers.facebook.com/docs/facebook-login/permissions
       // Removed 'email' - use 'user_email' instead for user profile data
       const FACEBOOK_PERMISSIONS = ['public_profile'];

       const result = await FacebookLogin.login({ permissions: FACEBOOK_PERMISSIONS }) as FacebookLoginResponse;

      if (!result.accessToken) {
        throw new Error('No access token received from Facebook Login');
      }

      this.logger.debug('Facebook Access Token received. Verifying with backend...', 'FacebookAuthService');

      // Exchange token for Supabase Session
      const { data, error } = await this.supabase.functions.invoke('facebook-native-login', {
        body: { accessToken: result.accessToken.token },
      });

      if (error) {
        throw new Error(`Edge Function Error: ${error.message}`);
      }

      if (!data.success || !data.session) {
        throw new Error(data.error || 'Failed to create session from Facebook token');
      }

      this.logger.debug('Session created. Setting Supabase session...', 'FacebookAuthService');

      // Set Session in Supabase Client
      const { error: setSessionError } = await this.supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      if (setSessionError) {
        throw new Error(`Failed to set session: ${setSessionError.message}`);
      }

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
