import { Injectable, inject } from '@angular/core';
import { FacebookLogin, FacebookLoginResponse } from '@capacitor-community/facebook-login';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';

@Injectable({
  providedIn: 'root',
})
export class FacebookAuthService {
  private readonly supabase = injectSupabase();
  private readonly logger = inject(LoggerService);

  constructor() {
    this.initialize();
  }

  /**
   * Initialize Facebook Login (required for Web)
   */
  async initialize(): Promise<void> {
    try {
      await FacebookLogin.initialize({ appId: '4435998730015502' });
    } catch (error) {
      this.logger.error('Failed to initialize Facebook Login', 'FacebookAuthService', error);
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
      this.logger.debug('Starting Facebook Login...', 'FacebookAuthService');

      const FACEBOOK_PERMISSIONS = ['email', 'public_profile'];

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
