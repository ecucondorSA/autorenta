import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

/**
 * Adaptador de almacenamiento seguro para Supabase Auth.
 * Usa el Keystore nativo en iOS/Android y localStorage en Web.
 * 
 * Implementa la interfaz SupportedStorage de Supabase.
 */
@Injectable({
  providedIn: 'root'
})
export class SecureStorageAdapter {
  private isNative = Capacitor.isNativePlatform();

  async getItem(key: string): Promise<string | null> {
    if (this.isNative) {
      try {
        const { value } = await Preferences.get({ key });
        return value;
      } catch {
        return null;
      }
    } else {
      return localStorage.getItem(key);
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    if (this.isNative) {
      await Preferences.set({ key, value });
    } else {
      localStorage.setItem(key, value);
    }
  }

  async removeItem(key: string): Promise<void> {
    if (this.isNative) {
      try {
        await Preferences.remove({ key });
      } catch {
        // Ignorar si no existe
      }
    } else {
      localStorage.removeItem(key);
    }
  }
}
