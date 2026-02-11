import { inject, Injectable } from '@angular/core';
import { AuthService } from '@core/services/auth/auth.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import type { AuthOtpResponse, Session, User } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root',
})
export class SessionFacadeService {
  private readonly authService = inject(AuthService);
  private readonly supabase = injectSupabase();

  async getCurrentUser(): Promise<User | null> {
    const {
      data: { user },
      error,
    } = await this.supabase.auth.getUser();

    if (error) {
      throw error;
    }

    return user;
  }

  async getCurrentUserId(): Promise<string | null> {
    return (await this.getCurrentUser())?.id ?? null;
  }

  async getSession(): Promise<Session | null> {
    return this.authService.ensureSession();
  }

  async getSessionAccessToken(): Promise<string | null> {
    const session = await this.getSession();
    return session?.access_token ?? null;
  }

  async signInWithOtp(params: {
    email: string;
    emailRedirectTo?: string;
    data?: Record<string, unknown>;
  }): Promise<AuthOtpResponse> {
    return this.supabase.auth.signInWithOtp({
      email: params.email,
      options: {
        emailRedirectTo: params.emailRedirectTo,
        data: params.data,
      },
    });
  }

  async getAuthorizationDetails(id: string): Promise<unknown> {
    const oauth = (
      this.supabase.auth as unknown as {
        oauth?: {
          getAuthorizationDetails?: (
            authId: string,
          ) => Promise<{ data?: unknown; error?: { message?: string } }>;
        };
      }
    ).oauth;

    if (!oauth?.getAuthorizationDetails) {
      throw new Error('OAuth getAuthorizationDetails is not available.');
    }

    const { data, error } = await oauth.getAuthorizationDetails(id);

    if (error) {
      throw new Error(error.message || 'No se pudo obtener la autorización OAuth.');
    }

    if (!data) {
      throw new Error('La solicitud de autorización no existe o expiró.');
    }

    return data;
  }

  async approveAuthorization(id: string): Promise<string | null> {
    const oauth = (
      this.supabase.auth as unknown as {
        oauth?: {
          approveAuthorization?: (
            authId: string,
          ) => Promise<{ data?: { redirect_to?: string }; error?: { message?: string } }>;
        };
      }
    ).oauth;

    if (!oauth?.approveAuthorization) {
      throw new Error('OAuth approveAuthorization is not available.');
    }

    const { data, error } = await oauth.approveAuthorization(id);

    if (error) {
      throw new Error(error.message || 'Error al aprobar la autorización OAuth.');
    }

    return data?.redirect_to ?? null;
  }

  async denyAuthorization(id: string): Promise<string | null> {
    const oauth = (
      this.supabase.auth as unknown as {
        oauth?: {
          denyAuthorization?: (
            authId: string,
          ) => Promise<{ data?: { redirect_to?: string }; error?: { message?: string } }>;
        };
      }
    ).oauth;

    if (!oauth?.denyAuthorization) {
      throw new Error('OAuth denyAuthorization is not available.');
    }

    const { data, error } = await oauth.denyAuthorization(id);

    if (error) {
      throw new Error(error.message || 'Error al denegar la autorización OAuth.');
    }

    return data?.redirect_to ?? null;
  }
}
