import { Injectable, signal } from '@angular/core';
import { BiometryType, NativeBiometric } from '@capgo/capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';

const CREDENTIAL_SERVER = 'app.autorentar.biometric';

export interface BiometricAvailability {
  available: boolean;
  type: number;
  typeName: 'fingerprint' | 'face' | 'iris' | 'none';
  hasCredentials: boolean;
}

@Injectable({ providedIn: 'root' })
export class BiometricAuthService {
  /** Signal que indica si la biometría está disponible y configurada */
  readonly isReady = signal(false);
  /** Signal con el tipo de biometría disponible */
  readonly biometryType = signal<number>(BiometryType.NONE);
  /** Signal que indica si hay credenciales guardadas */
  readonly hasStoredCredentials = signal(false);

  async isAvailable(): Promise<{ available: boolean; type: number }> {
    try {
      const result = await NativeBiometric.isAvailable();
      return {
        available: result.isAvailable,
        type: result.biometryType,
      };
    } catch {
      return { available: false, type: BiometryType.NONE };
    }
  }

  /**
   * Verifica disponibilidad completa: biometría + credenciales guardadas
   */
  async checkAvailability(): Promise<BiometricAvailability> {
    // Solo funciona en dispositivos nativos
    if (!Capacitor.isNativePlatform()) {
      return { available: false, type: BiometryType.NONE, typeName: 'none', hasCredentials: false };
    }

    try {
      const [biometricResult, credentialsResult] = await Promise.all([
        NativeBiometric.isAvailable(),
        NativeBiometric.isCredentialsSaved({ server: CREDENTIAL_SERVER }).catch(() => ({ hasSavedCredentials: false })),
      ]);

      const type = biometricResult.biometryType;
      const typeName = this.getTypeName(type);
      const hasCredentials = credentialsResult.hasSavedCredentials;

      // Actualizar signals
      this.biometryType.set(type);
      this.hasStoredCredentials.set(hasCredentials);
      this.isReady.set(biometricResult.isAvailable && hasCredentials);

      return {
        available: biometricResult.isAvailable,
        type,
        typeName,
        hasCredentials,
      };
    } catch {
      this.isReady.set(false);
      this.hasStoredCredentials.set(false);
      return { available: false, type: BiometryType.NONE, typeName: 'none', hasCredentials: false };
    }
  }

  /**
   * Guarda credenciales después de un login exitoso
   */
  async saveCredentials(email: string, password: string): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;

    try {
      await NativeBiometric.setCredentials({
        server: CREDENTIAL_SERVER,
        username: email,
        password: password,
      });
      this.hasStoredCredentials.set(true);
      this.isReady.set(true);
      return true;
    } catch (error) {
      console.error('Failed to save biometric credentials:', error);
      return false;
    }
  }

  /**
   * Login con biometría: verifica identidad y retorna credenciales
   */
  async loginWithBiometric(): Promise<{ email: string; password: string } | null> {
    if (!Capacitor.isNativePlatform()) return null;

    try {
      // Primero verificar identidad con biometría
      await NativeBiometric.verifyIdentity({
        reason: 'Ingresa a tu cuenta',
        title: 'AutoRenta',
        subtitle: 'Usa tu huella o rostro',
        description: 'Toca el sensor para ingresar',
        negativeButtonText: 'Cancelar',
        useFallback: true,
      });

      // Si la verificación pasó, obtener credenciales
      const credentials = await NativeBiometric.getCredentials({
        server: CREDENTIAL_SERVER,
      });

      return {
        email: credentials.username,
        password: credentials.password,
      };
    } catch (error) {
      console.error('Biometric login failed:', error);
      return null;
    }
  }

  /**
   * Elimina las credenciales guardadas (logout o desactivar biometría)
   */
  async clearCredentials(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;

    try {
      await NativeBiometric.deleteCredentials({
        server: CREDENTIAL_SERVER,
      });
      this.hasStoredCredentials.set(false);
      this.isReady.set(false);
      return true;
    } catch (error) {
      console.error('Failed to clear biometric credentials:', error);
      return false;
    }
  }

  async authenticate(reason: string): Promise<boolean> {
    try {
      await NativeBiometric.verifyIdentity({
        reason,
        title: 'AutoRenta',
        subtitle: 'Confirma tu identidad',
        description: reason,
      });
      return true;
    } catch (error) {
      console.error('Biometric auth failed:', error);
      return false;
    }
  }

  async authenticatePayment(amount: number, currency: string): Promise<boolean> {
    const formatted = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
    }).format(amount);

    return this.authenticate(`Confirmar pago de ${formatted}`);
  }

  private getTypeName(type: number): 'fingerprint' | 'face' | 'iris' | 'none' {
    switch (type) {
      case BiometryType.TOUCH_ID:
      case BiometryType.FINGERPRINT:
        return 'fingerprint';
      case BiometryType.FACE_ID:
      case BiometryType.FACE_AUTHENTICATION:
        return 'face';
      case BiometryType.IRIS_AUTHENTICATION:
        return 'iris';
      default:
        return 'none';
    }
  }

  /**
   * Retorna el nombre amigable del tipo de biometría
   */
  getBiometryLabel(): string {
    const type = this.biometryType();
    switch (type) {
      case BiometryType.TOUCH_ID:
        return 'Touch ID';
      case BiometryType.FACE_ID:
        return 'Face ID';
      case BiometryType.FINGERPRINT:
        return 'Huella digital';
      case BiometryType.FACE_AUTHENTICATION:
        return 'Reconocimiento facial';
      case BiometryType.IRIS_AUTHENTICATION:
        return 'Escáner de iris';
      case BiometryType.MULTIPLE:
        return 'Biometría';
      default:
        return 'Biometría';
    }
  }
}
