import { Injectable, inject } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import {
  UserProfile,
  Role,
  UserDocument,
  DocumentKind,
  NotificationPrefs,
  ProfileAudit,
} from '../models';
import { SupabaseClientService } from './supabase-client.service';

export interface UpdateProfileData {
  full_name?: string;
  role?: Role;
  avatar_url?: string;
  phone?: string;
  whatsapp?: string;
  dni?: string; // Backward compatibility
  gov_id_type?: string;
  gov_id_number?: string;
  driver_license_number?: string;
  driver_license_country?: string;
  driver_license_expiry?: string;
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
  tos_accepted_at?: boolean; // Si es true, se marca como aceptado con now()
}

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private readonly supabase = inject(SupabaseClientService).getClient();

  /**
   * Obtiene el perfil del usuario actual
   */
  async getCurrentProfile(): Promise<UserProfile | null> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    if (!user) {
      const errMsg = 'Usuario no autenticado - getUser() retornó null';
      console.error('[ProfileService] Error:', errMsg);
      throw new Error(errMsg);
    }

    console.log('[ProfileService] Fetching profile for user:', user.id);

    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('[ProfileService] Query error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });

      if (error.code === 'PGRST116') {
        // Profile doesn't exist yet, create one
        console.log('[ProfileService] Profile not found (PGRST116), creating new profile...');
        return this.createProfile(user.id, user.email ?? '');
      }

      // Check if it's a RLS policy violation (code 42501)
      if (error.code === '42501') {
        const rrlsError =
          `RLS Policy violation: Usuario ${user.id} no tiene acceso a su propio perfil. ` +
          `Error: ${error.message}`;
        console.error('[ProfileService]', rrlsError);
        throw new Error(rrlsError);
      }

      // Re-throw with more context
      const detailedError = `Error cargando perfil (${error.code}): ${error.message}`;
      console.error('[ProfileService]', detailedError);
      throw new Error(detailedError);
    }

    console.log('[ProfileService] Profile loaded successfully:', {
      id: data?.id,
      full_name: data?.full_name,
    });
    return data as UserProfile;
  }

  /**
   * Obtiene un perfil por ID
   */
  async getProfileById(userId: string): Promise<UserProfile | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data as UserProfile;
  }

  /**
   * Actualiza el perfil del usuario actual
   */
  async updateProfile(updates: UpdateProfileData): Promise<UserProfile> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    const { data, error } = await this.supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as UserProfile;
  }

  /**
   * Sube un avatar y actualiza el perfil
   */
  async uploadAvatar(file: File): Promise<string> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      throw new Error('El archivo debe ser una imagen');
    }

    // Validar tamaño (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      throw new Error('La imagen no debe superar 2MB');
    }

    const extension = file.name.split('.').pop() ?? 'jpg';
    const filePath = `${user.id}/${uuidv4()}.${extension}`;

    // Subir archivo
    const { error: uploadError } = await this.supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    // Obtener URL pública
    const {
      data: { publicUrl },
    } = this.supabase.storage.from('avatars').getPublicUrl(filePath);

    // Actualizar perfil con nueva URL
    await this.updateProfile({ avatar_url: publicUrl });

    return publicUrl;
  }

  /**
   * Elimina el avatar del usuario
   */
  async deleteAvatar(): Promise<void> {
    const profile = await this.getCurrentProfile();

    if (!profile?.avatar_url) {
      return;
    }

    // Extraer path del storage de la URL
    const url = new URL(profile.avatar_url);
    const pathParts = url.pathname.split('/avatars/');
    if (pathParts.length > 1) {
      const storagePath = pathParts[1];

      // Eliminar del storage
      await this.supabase.storage.from('avatars').remove([storagePath]);
    }

    // Actualizar perfil
    await this.updateProfile({ avatar_url: '' });
  }

  /**
   * Crea un perfil inicial (llamado automáticamente si no existe)
   */
  private async createProfile(userId: string, email: string): Promise<UserProfile> {
    const newProfile: Partial<UserProfile> = {
      id: userId,
      full_name: email.split('@')[0], // Nombre inicial basado en email
      role: 'renter', // Rol por defecto (renter = locatario)
      country: 'AR', // País por defecto Argentina
    };

    console.log('[ProfileService] Creating new profile:', { userId, email, profile: newProfile });

    const { data, error } = await this.supabase
      .from('profiles')
      .insert(newProfile)
      .select()
      .single();

    if (error) {
      const detailedError =
        `Error creando perfil (${error.code}): ${error.message}. ` +
        `Details: ${error.details}. Hint: ${error.hint}`;
      console.error('[ProfileService]', detailedError);
      throw new Error(detailedError);
    }

    console.log('[ProfileService] Profile created successfully:', {
      id: data?.id,
      full_name: data?.full_name,
    });
    return data as UserProfile;
  }

  /**
   * Verifica si el usuario puede publicar autos (es owner o both)
   */
  async canPublishCars(): Promise<boolean> {
    const profile = await this.getCurrentProfile();
    return profile?.role === 'owner' || profile?.role === 'both';
  }

  /**
   * Verifica si el usuario puede reservar autos (es renter o both)
   */
  async canBookCars(): Promise<boolean> {
    const profile = await this.getCurrentProfile();
    return profile?.role === 'renter' || profile?.role === 'both';
  }

  // ========================================
  // MÉTODOS EXPANDIDOS - PERFIL COMPLETO
  // ========================================

  /**
   * Obtiene el perfil enriquecido del usuario actual (vista me_profile)
   * Incluye permisos derivados (can_publish_cars, can_book_cars)
   */
  async getMe(): Promise<UserProfile> {
    const { data, error } = await this.supabase.from('me_profile').select('*').single();

    if (error) {
      throw error;
    }

    return data as UserProfile;
  }

  /**
   * Actualiza el perfil usando la función segura (RPC)
   * Solo permite actualizar campos whitelisted
   */
  async updateProfileSafe(payload: Partial<UpdateProfileData>): Promise<UserProfile> {
    const { data, error } = await this.supabase.rpc('update_profile_safe', {
      _payload: payload,
    });

    if (error) {
      throw error;
    }

    return data as UserProfile;
  }

  /**
   * Actualiza solo la URL del avatar usando RPC dedicado
   */
  async setAvatar(publicUrl: string): Promise<void> {
    const { error } = await this.supabase.rpc('set_avatar', {
      _public_url: publicUrl,
    });

    if (error) {
      throw error;
    }
  }

  /**
   * Sube un documento de verificación al storage privado
   */
  async uploadDocument(file: File, kind: DocumentKind): Promise<UserDocument> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Formato no permitido. Use JPG, PNG o PDF');
    }

    // Validar tamaño (max 5MB para documentos)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('El archivo no debe superar 5MB');
    }

    const extension = file.name.split('.').pop() ?? 'jpg';
    const filename = `${uuidv4()}-${kind}.${extension}`;
    const filePath = `${user.id}/${filename}`;

    // Subir a storage privado
    const { error: uploadError } = await this.supabase.storage
      .from('documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    // Crear registro en user_documents
    const { data, error: insertError } = await this.supabase
      .from('user_documents')
      .insert({
        user_id: user.id,
        kind,
        storage_path: filePath,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      // Limpiar archivo si falla el insert
      await this.supabase.storage.from('documents').remove([filePath]);
      throw insertError;
    }

    // Disparar verificación automatizada (no bloquear si falla)
    try {
      await this.supabase.functions.invoke('verify-user-docs', {
        body: {
          document_id: data.id,
          kind,
          trigger: 'document-upload',
        },
      });
    } catch (verificationError) {
      console.warn(
        '[ProfileService] No se pudo iniciar la verificación automática:',
        verificationError,
      );
    }

    return data as UserDocument;
  }

  /**
   * Obtiene todos los documentos del usuario actual
   */
  async getMyDocuments(): Promise<UserDocument[]> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    const { data, error } = await this.supabase
      .from('user_documents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data as UserDocument[]) ?? [];
  }

  /**
   * Obtiene un documento específico del usuario
   */
  async getDocument(documentId: string): Promise<UserDocument | null> {
    const { data, error } = await this.supabase
      .from('user_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data as UserDocument;
  }

  /**
   * Elimina un documento (archivo y registro)
   */
  async deleteDocument(documentId: string): Promise<void> {
    const document = await this.getDocument(documentId);

    if (!document) {
      throw new Error('Documento no encontrado');
    }

    // Eliminar archivo del storage
    await this.supabase.storage.from('documents').remove([document.storage_path]);

    // Eliminar registro de la base de datos
    const { error } = await this.supabase.from('user_documents').delete().eq('id', documentId);

    if (error) {
      throw error;
    }
  }

  /**
   * Obtiene la URL firmada de un documento privado (válida por 1 hora)
   */
  async getDocumentSignedUrl(storagePath: string): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from('documents')
      .createSignedUrl(storagePath, 3600); // 1 hora

    if (error) {
      throw error;
    }

    return data.signedUrl;
  }

  /**
   * Verifica si el usuario completó el onboarding
   */
  async hasCompletedOnboarding(): Promise<boolean> {
    const profile = await this.getMe();
    return profile.onboarding === 'complete';
  }

  /**
   * Verifica si el usuario aceptó los términos y condiciones
   */
  async hasAcceptedTOS(): Promise<boolean> {
    const profile = await this.getMe();
    return profile.tos_accepted_at !== null;
  }

  /**
   * Marca el onboarding como completo
   */
  async completeOnboarding(): Promise<void> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    const { error } = await this.supabase
      .from('profiles')
      .update({ onboarding: 'complete' })
      .eq('id', user.id);

    if (error) {
      throw error;
    }
  }

  /**
   * Obtiene el historial de auditoría del perfil del usuario
   */
  async getProfileAudit(): Promise<ProfileAudit[]> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    const { data, error } = await this.supabase
      .from('profile_audit')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      throw error;
    }

    return (data as ProfileAudit[]) ?? [];
  }

  /**
   * Obtiene el perfil público de un usuario (solo datos visibles públicamente)
   */
  async getPublicProfile(userId: string): Promise<Partial<UserProfile> | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select(
        `
        id,
        full_name,
        avatar_url,
        role,
        is_email_verified,
        is_phone_verified,
        is_driver_verified,
        kyc,
        created_at
      `,
      )
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data as Partial<UserProfile>;
  }

  /**
   * Obtiene las estadísticas públicas de un usuario
   */
  async getUserStats(userId: string): Promise<unknown> {
    const { data, error } = await this.supabase.rpc('get_user_public_stats', {
      target_user_id: userId,
    });

    if (error) {
      console.error('[ProfileService] Error obteniendo stats:', error);
      // Retornar stats vacías si falla
      return {
        owner_rating_avg: null,
        owner_reviews_count: 0,
        owner_trips_count: 0,
        renter_rating_avg: null,
        renter_reviews_count: 0,
        renter_trips_count: 0,
        total_cars: 0,
      };
    }

    return (
      data || {
        owner_rating_avg: null,
        owner_reviews_count: 0,
        owner_trips_count: 0,
        renter_rating_avg: null,
        renter_reviews_count: 0,
        renter_trips_count: 0,
        total_cars: 0,
      }
    );
  }
}
