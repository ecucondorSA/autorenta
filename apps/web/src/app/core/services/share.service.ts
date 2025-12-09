import { Injectable } from '@angular/core';

type NavigatorWithAdvancedShare = Navigator & {
  canShare?: (data?: ShareData | { files: File[] }) => boolean;
};

/**
 * 📤 Share Service
 *
 * Maneja la funcionalidad de compartir usando Web Share API
 * Fallback a clipboard si no está disponible
 */
@Injectable({
  providedIn: 'root',
})
export class ShareService {
  /**
   * Verifica si Web Share API está disponible
   */
  get canShare(): boolean {
    return 'share' in navigator;
  }

  /**
   * Comparte contenido usando Web Share API
   */
  async share(data: ShareData): Promise<boolean> {
    if (!this.canShare) {
      console.warn('Web Share API no disponible');
      return this.fallbackShare(data);
    }

    try {
      await navigator.share(data);
      console.log('✅ Compartido exitosamente');
      return true;
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('Usuario canceló compartir');
        return false;
      }
      console.error('❌ Error al compartir:', error);
      return this.fallbackShare(data);
    }
  }

  /**
   * Comparte un auto específico
   */
  async shareCar(carId: string, carTitle: string, price: number): Promise<boolean> {
    const url = `${window.location.origin}/cars/${carId}`;
    const text = `Mira este ${carTitle} por $${price.toLocaleString()}/día en Autorentar`;

    return this.share({
      title: carTitle,
      text: text,
      url: url,
    });
  }

  /**
   * Comparte la app completa
   */
  async shareApp(): Promise<boolean> {
    return this.share({
      title: 'Autorentar - Alquiler de Autos',
      text: '🚗 Encontrá el auto perfecto para tu próximo viaje',
      url: window.location.origin,
    });
  }

  /**
   * Comparte una reserva
   */
  async shareBooking(bookingId: string, details: string): Promise<boolean> {
    const url = `${window.location.origin}/bookings/${bookingId}`;

    return this.share({
      title: 'Mi Reserva - Autorentar',
      text: `📅 ${details}`,
      url: url,
    });
  }

  /**
   * Fallback: copia al clipboard
   */
  private async fallbackShare(data: ShareData): Promise<boolean> {
    try {
      const textToCopy = `${data.title}\n${data.text}\n${data.url}`;

      if ('clipboard' in navigator) {
        await navigator.clipboard.writeText(textToCopy);
        this.showToast('¡Enlace copiado al portapapeles!');
        return true;
      }

      // Fallback más antiguo
      const textArea = document.createElement('textarea');
      textArea.value = textToCopy;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);

      this.showToast('¡Enlace copiado!');
      return true;
    } catch (error) {
      console.error('❌ Error en fallback:', error);
      this.showToast('No se pudo copiar el enlace');
      return false;
    }
  }

  /**
   * Verifica si puede compartir archivos
   */
  canShareFiles(files: File[]): boolean {
    if (!this.canShare) return false;

    try {
      const navigatorWithShare = navigator as NavigatorWithAdvancedShare;
      return navigatorWithShare.canShare?.({ files }) ?? false;
    } catch {
      return false;
    }
  }

  /**
   * Comparte archivos (imágenes, PDFs, etc)
   */
  async shareFiles(files: File[], title?: string, text?: string): Promise<boolean> {
    if (!this.canShareFiles(files)) {
      console.warn('No se pueden compartir archivos');
      return false;
    }

    try {
      await navigator.share({
        files,
        title,
        text,
      });
      return true;
    } catch (error) {
      console.error('❌ Error al compartir archivos:', error);
      return false;
    }
  }

  /**
   * Toast simple para feedback
   */
  private showToast(message: string): void {
    // Crear toast element
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 24px;
      border-radius: 24px;
      font-size: 14px;
      z-index: 50;
      animation: fadeInOut 2s ease-in-out;
    `;

    // Agregar animación
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeInOut {
        0%, 100% { opacity: 0; }
        10%, 90% { opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(toast);

    setTimeout(() => {
      document.body.removeChild(toast);
      document.head.removeChild(style);
    }, 2000);
  }
}

/**
 * Interfaces auxiliares
 */
export interface ShareData {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}
