import { Injectable, inject } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import {
  DocumentKind,
  NotificationPrefs,
  ProfileAudit,
  Role,
  UserDocument,
  UserProfile,
} from '@core/models';
import { isNotFoundError, isPermissionError, handleSupabaseError, AuthError } from '@core/errors';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { AuthService } from '@core/services/auth/auth.service';

// Re-export UserProfile for convenience
export type { UserProfile };

export interface UpdateProfileData {
  full_name?: string;
  role?: Role;
  avatar_url?: string;
  phone?: string;
  whatsapp?: string;
  dni?: string;
  gov_id_type?: string;
  gov_id_number?: string;
  driver_license_number?: string;
  driver_license_country?: string;
  driver_license_expiry?: string;
  driver_license_class?: string;
  driver_license_professional?: boolean;
  driver_license_points?: number | null;
  date_of_birth?: string | null; // ISO date string YYYY-MM-DD
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  timezone?: string;
  locale?: string;
  currency?: string;
  marketing_opt_in?: boolean;
  notif_prefs?: NotificationPrefs;
  tos_accepted_at?: boolean;
  preferred_search_radius_km?: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private readonly logger = inject(LoggerService);
  private readonly supabase = injectSupabase();
  private readonly authService = inject(AuthService);

  /** In-flight deduplication: reuse the same promise if getCurrentProfile() is already running */
  private currentProfileRequest: Promise<UserProfile | null> | null = null;

  /**
   * Get the authenticated user or throw a user-friendly error.
   * The error message intentionally avoids the 'no autenticado' pattern
   * so it surfaces as a toast instead of triggering the auth redirect loop.
   */
  private async requireUser(): Promise<{ id: string; email?: string }> {
    const user = await this.authService.getCachedUser();
    if (!user) {
      this.logger.warn('requireUser() — sesión expirada', 'ProfileService');
      throw new Error('Tu sesión expiró. Por favor, iniciá sesión nuevamente.');
    }
    return user;
  }

  async getCurrentProfile(): Promise<UserProfile | null> {
    // Deduplicate concurrent calls — return the same in-flight promise
    if (this.currentProfileRequest) {
      return this.currentProfileRequest;
    }

    this.currentProfileRequest = this.fetchCurrentProfile();

    try {
      return await this.currentProfileRequest;
    } finally {
      this.currentProfileRequest = null;
    }
  }

  private async fetchCurrentProfile(): Promise<UserProfile | null> {
    const user = await this.authService.getCachedUser();

    if (!user) {
      this.logger.warn('getCachedUser() retornó null — sesión expirada o no autenticado', 'ProfileService');
      return null;
    }

    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', user['id'])
      .single();

    if (error) {
      // Profile not found - create a new one
      if (isNotFoundError(error)) {
        return this.createProfile(user['id'], user['email'] ?? '');
      }

      // RLS policy violation - user can't access their own profile
      if (isPermissionError(error)) {
        throw AuthError.permissionDenied(`RLS Policy: Usuario ${user['id']} sin acceso a perfil`);
      }

      // Other errors - use centralized handler
      throw handleSupabaseError(error, 'cargando perfil');
    }

    return data as UserProfile;
  }

  async getProfileById(userId: string): Promise<UserProfile | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (isNotFoundError(error)) return null;
      throw handleSupabaseError(error, 'obteniendo perfil por ID');
    }

    return data as UserProfile;
  }

  async updateProfile(updates: UpdateProfileData): Promise<UserProfile> {
    const user = await this.requireUser();

    const payload: Record<string, unknown> = { ...updates };

    if (updates['tos_accepted_at'] === true) {
      payload['tos_accepted_at'] = new Date().toISOString();
    } else {
      delete payload['tos_accepted_at'];
    }

    const { data, error } = await this.supabase
      .from('profiles')
      .update(payload)
      .eq('id', user['id'])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as UserProfile;
  }

  async uploadAvatar(file: File): Promise<string> {
    const user = await this.requireUser();

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Formato no permitido. Use JPG, PNG o WEBP');
    }

    if (file.size > 2 * 1024 * 1024) {
      throw new Error('La imagen no debe superar 2MB');
    }

    const extension = file.name.split('.').pop() ?? 'jpg';
    const filename = `${uuidv4()}.${extension}`;
    const filePath = `${user['id']}/${filename}`;

    const { error: uploadError } = await this.supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const {
      data: { publicUrl },
    } = this.supabase.storage.from('avatars').getPublicUrl(filePath);

    await this.updateProfile({ avatar_url: publicUrl });

    return publicUrl;
  }

  async deleteAvatar(): Promise<void> {
    const profile = await this.getCurrentProfile();

    if (!profile?.avatar_url) {
      return;
    }

    const url = new URL(profile.avatar_url);
    const pathParts = url.pathname.split('/avatars/');
    if (pathParts.length > 1) {
      const storagePath = pathParts[1];
      await this.supabase.storage.from('avatars').remove([storagePath]);
    }

    await this.updateProfile({ avatar_url: '' });
  }

  private async createProfile(userId: string, email: string): Promise<UserProfile> {
    const newProfile: Partial<UserProfile> = {
      id: userId,
      full_name: email.split('@')[0],
      role: 'renter',
      country: 'AR',
    };

    const { data, error } = await this.supabase
      .from('profiles')
      .insert(newProfile)
      .select()
      .single();

    if (error) {
      throw handleSupabaseError(error, 'creando perfil');
    }

    this.logger.debug('✅ Perfil creado:', {
      id: data?.['id'],
      full_name: data?.['full_name'],
    });

    return data as UserProfile;
  }

  async canPublishCars(): Promise<boolean> {
    const profile = await this.getCurrentProfile();
    return (profile?.['role'] as string) === 'owner' || (profile?.['role'] as string) === 'both';
  }

  async canBookCars(): Promise<boolean> {
    const profile = await this.getCurrentProfile();
    return (profile?.['role'] as string) === 'renter' || (profile?.['role'] as string) === 'both';
  }

  async getMe(): Promise<UserProfile> {
    const profile = await this.getCurrentProfile();
    if (!profile) throw new Error('Tu sesión expiró. Por favor, iniciá sesión nuevamente.');

    const role = (profile['role'] as string) ?? 'renter';

    // Keep backwards-compat: some code expects these derived flags on the profile object.
    return {
      ...profile,
      can_publish_cars: role === 'owner' || role === 'both',
      can_book_cars: role === 'renter' || role === 'both',
    } as UserProfile;
  }

  async safeUpdateProfile(updates: UpdateProfileData): Promise<UserProfile> {
    const { data, error } = await this.supabase.rpc('update_my_profile', {
      payload: updates,
    });

    if (error) {
      throw error;
    }

    return data as UserProfile;
  }

  async uploadDocument(file: File, kind: DocumentKind): Promise<UserDocument> {
    const user = await this.requireUser();

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Formato no permitido. Use JPG, PNG o PDF');
    }

    if (file.size > 2 * 1024 * 1024) {
      throw new Error('El archivo no debe superar 2MB');
    }

    const extension = file.name.split('.').pop() ?? 'jpg';
    const filename = `${uuidv4()}-${kind}.${extension}`;
    const filePath = `${user['id']}/${filename}`;

    const { error: uploadError } = await this.supabase.storage
      .from('documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data, error: insertError } = await this.supabase
      .from('user_documents')
      .insert({
        user_id: user['id'],
        kind,
        storage_path: filePath,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      await this.supabase.storage.from('documents').remove([filePath]);
      throw insertError;
    }

    try {
      const headers = await this.buildEdgeFunctionAuthHeaders();
      const { error: verificationInvokeError } = await this.supabase.functions.invoke(
        'verify-user-docs',
        {
        body: {
          document_id: data['id'],
          kind,
          trigger: 'document-upload',
        },
          headers,
        },
      );

      if (verificationInvokeError) {
        throw verificationInvokeError;
      }
    } catch (verificationError) {
      this.logger.warn(`Document verification failed (non-blocking): ${verificationError}`, 'ProfileService');
    }

    return data as UserDocument;
  }

  private async buildEdgeFunctionAuthHeaders(): Promise<Record<string, string>> {
    let session = await this.authService.ensureSession();

    if (!session?.access_token) {
      session = await this.authService.refreshSession();
    }

    if (!session?.access_token) {
      throw new Error('Tu sesión expiró. Por favor, iniciá sesión nuevamente.');
    }

    return {
      Authorization: `Bearer ${session.access_token}`,
    };
  }

  async getMyDocuments(): Promise<UserDocument[]> {
    const user = await this.requireUser();

    const { data, error } = await this.supabase
      .from('user_documents')
      .select('*')
      .eq('user_id', user['id'])
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data as UserDocument[]) ?? [];
  }

  async getDocument(documentId: string): Promise<UserDocument | null> {
    const { data, error } = await this.supabase
      .from('user_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (error) {
      if (isNotFoundError(error)) return null;
      throw handleSupabaseError(error, 'obteniendo documento');
    }

    return data as UserDocument;
  }

  async deleteDocument(documentId: string): Promise<void> {
    const document = await this.getDocument(documentId);

    if (!document) {
      throw new Error('Documento no encontrado');
    }

    await this.supabase.storage.from('documents').remove([document.storage_path]);

    const { error } = await this.supabase.from('user_documents').delete().eq('id', documentId);

    if (error) {
      throw error;
    }
  }

  async getDocumentSignedUrl(storagePath: string): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from('documents')
      .createSignedUrl(storagePath, 3600);

    if (error) {
      throw error;
    }

    return data.signedUrl;
  }

  async hasCompletedOnboarding(): Promise<boolean> {
    try {
      const profile = await this.getCurrentProfile();
      return profile?.onboarding === 'complete';
    } catch (error) {
      this.logger.warn(`Error checking onboarding status: ${error}`, 'ProfileService');
      return false;
    }
  }

  async hasAcceptedTOS(): Promise<boolean> {
    const profile = await this.getMe();
    return profile['tos_accepted_at'] !== null;
  }

  async completeOnboarding(): Promise<void> {
    const user = await this.requireUser();

    const { error } = await this.supabase
      .from('profiles')
      .update({ onboarding: 'complete' })
      .eq('id', user['id']);

    if (error) {
      console['error']('Error completing onboarding:', error);
      throw error;
    }
  }

  async acceptTOS(): Promise<void> {
    const user = await this.requireUser();

    const { error } = await this.supabase
      .from('profiles')
      .update({ tos_accepted_at: new Date().toISOString() })
      .eq('id', user['id']);

    if (error) {
      throw error;
    }
  }

  async getAuditLog(): Promise<ProfileAudit[]> {
    const user = await this.requireUser();

    const { data, error } = await this.supabase
      .from('profile_audit_log')
      .select('*')
      .eq('user_id', user['id'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    return (data as ProfileAudit[]) ?? [];
  }

  async requestDataExport(): Promise<void> {
    const user = await this.requireUser();

    await this.supabase.functions.invoke('export-user-data', {
      body: { user_id: user['id'] },
    });
  }

  async requestAccountDeletion(reason?: string): Promise<void> {
    const user = await this.requireUser();

    const { error } = await this.supabase.from('account_deletion_requests').insert({
      user_id: user['id'],
      reason: reason ?? 'User requested deletion',
      status: 'pending',
    });

    if (error) {
      throw error;
    }
  }

  /**
   * Registra una infracción (strike) contra un usuario
   * Útil para penalizar dueños por autos sucios o cancelaciones injustificadas
   */
  async addStrike(userId: string, reason: string, bookingId?: string): Promise<void> {
    try {
      // Intentar insertar en tabla de strikes
      // Nota: Si la tabla no existe, esto fallará silenciosamente en el catch
      const { error } = await this.supabase.from('user_strikes').insert({
        user_id: userId,
        reason,
        booking_id: bookingId,
        created_at: new Date().toISOString(),
      });

      if (error) {
        this.logger.warn('Could not record strike (table might not exist)', error.message);
      } else {
        this.logger.debug(`Strike added to user ${userId}: ${reason}`);
      }
    } catch (err) {
      this.logger.error('Error adding strike', err);
    }
  }
}
