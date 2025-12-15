import { Injectable } from '@angular/core';
import { BiometryType, NativeBiometric } from '@capgo/capacitor-native-biometric';

@Injectable({ providedIn: 'root' })
export class BiometricAuthService {
  async isAvailable(): Promise<{ available: boolean; type: number }> {
    try {
      const result = await NativeBiometric.isAvailable();
      return {
        available: result.isAvailable,
        type: result.biometryType // fingerprint, face, iris
      };
    } catch {
      return { available: false, type: BiometryType.NONE };
    }
  }

  async authenticate(reason: string): Promise<boolean> {
    try {
      await NativeBiometric.verifyIdentity({
        reason,
        title: 'AutoRenta',
        subtitle: 'Confirma tu identidad',
        description: reason
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
      currency
    }).format(amount);

    return this.authenticate(`Confirmar pago de ${formatted}`);
  }
}
