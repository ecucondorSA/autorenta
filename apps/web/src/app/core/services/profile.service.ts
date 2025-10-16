import { Injectable, inject } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import { SupabaseClientService } from './supabase-client.service';
import { UserProfile, Role } from '../models';

export interface UpdateProfileData {
  full_name?: string;
  role?: Role;
  avatar_url?: string;
  phone?: string;
  dni?: string;
  country?: string;
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
      throw new Error('Usuario no autenticado');
    }

    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Profile doesn't exist yet, create one
        return this.createProfile(user.id, user.email ?? '');
      }
      throw error;
    }

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

    const { data, error } = await this.supabase
      .from('profiles')
      .insert(newProfile)
      .select()
      .single();

    if (error) {
      throw error;
    }

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
}
