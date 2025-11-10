import { Injectable, signal } from '@angular/core';

/**
 * 📲 PWA Install Service
 *
 * Maneja la instalación de PWA con prompt personalizado
 */
@Injectable({
  providedIn: 'root',
})
export class PwaInstallService {
  private deferredPrompt: any = null;

  // Señales reactivas
  readonly canInstall = signal(false);
  readonly isInstalled = signal(false);
  readonly showInstallPrompt = signal(false);

  constructor() {
    this.initializeInstallPrompt();
    this.checkIfInstalled();
  }

  /**
   * Inicializa el evento de instalación
   */
  private initializeInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (e: unknown) => {
      // Prevenir el prompt automático de Chrome
      (e as Event).preventDefault();

      // Guardar el evento para usarlo después
      this.deferredPrompt = e;
      this.canInstall.set(true);

      console.log('✅ PWA instalable detectada');

      // Mostrar prompt personalizado después de 30 segundos
      setTimeout(() => {
        if (!this.isInstalled() && this.canInstall()) {
          this.showInstallPrompt.set(true);
        }
      }, 30000);
    });

    // Detectar cuando se instala
    window.addEventListener('appinstalled', () => {
      console.log('✅ PWA instalada exitosamente');
      this.isInstalled.set(true);
      this.canInstall.set(false);
      this.showInstallPrompt.set(false);
      this.deferredPrompt = null;

      // Vibración de éxito
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
    });
  }

  /**
   * Verifica si la app ya está instalada
   */
  private checkIfInstalled(): void {
    // Detecta si se abrió desde PWA instalada
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled.set(true);
      console.log('✅ App ya instalada (standalone mode)');
    }

    // Detecta si es iOS instalado
    if ((window.navigator as any).standalone === true) {
      this.isInstalled.set(true);
      console.log('✅ App ya instalada (iOS standalone)');
    }
  }

  /**
   * Muestra el prompt de instalación
   */
  async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) {
      console.warn('No hay prompt de instalación disponible');
      return false;
    }

    // Mostrar el prompt nativo
    this.deferredPrompt.prompt();

    // Esperar la respuesta del usuario
    const { outcome } = await this.deferredPrompt.userChoice;

    console.log(`Usuario ${outcome === 'accepted' ? 'aceptó' : 'rechazó'} la instalación`);

    // Limpiar el prompt usado
    this.deferredPrompt = null;
    this.canInstall.set(false);
    this.showInstallPrompt.set(false);

    return outcome === 'accepted';
  }

  /**
   * Oculta el prompt personalizado
   */
  dismissPrompt(): void {
    this.showInstallPrompt.set(false);

    // No mostrar de nuevo en 7 días
    const dismissedUntil = new Date();
    dismissedUntil.setDate(dismissedUntil.getDate() + 7);
    localStorage.setItem('pwa-install-dismissed', dismissedUntil.toISOString());
  }

  /**
   * Verifica si el prompt fue rechazado recientemente
   */
  private wasRecentlyDismissed(): boolean {
    const dismissedUntil = localStorage.getItem('pwa-install-dismissed');
    if (!dismissedUntil) return false;

    const dismissDate = new Date(dismissedUntil);
    return dismissDate > new Date();
  }

  /**
   * Obtiene instrucciones de instalación según el navegador
   */
  getInstallInstructions(): {
    browser: string;
    instructions: string[];
    icon: string;
  } | null {
    const ua = navigator.userAgent;

    // iOS Safari
    if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) {
      return {
        browser: 'Safari iOS',
        instructions: [
          'Toca el botón de compartir ⎙',
          'Desplázate y selecciona "Añadir a la pantalla de inicio"',
          'Toca "Añadir" en la esquina superior derecha',
        ],
        icon: '📱',
      };
    }

    // Chrome Android
    if (/Chrome/.test(ua) && /Android/.test(ua)) {
      return {
        browser: 'Chrome Android',
        instructions: [
          'Toca el menú ⋮ (tres puntos)',
          'Selecciona "Instalar app" o "Añadir a pantalla de inicio"',
          'Toca "Instalar"',
        ],
        icon: '🤖',
      };
    }

    // Edge
    if (/Edg/.test(ua)) {
      return {
        browser: 'Microsoft Edge',
        instructions: [
          'Haz clic en el ícono de instalación en la barra de direcciones',
          'O ve a Menú > Aplicaciones > Instalar este sitio como una aplicación',
        ],
        icon: '🌐',
      };
    }

    // Chrome Desktop
    if (/Chrome/.test(ua)) {
      return {
        browser: 'Chrome',
        instructions: [
          'Haz clic en el ícono de instalación en la barra de direcciones',
          'O ve a Menú > Instalar Autorentar',
        ],
        icon: '💻',
      };
    }

    return null;
  }

  /**
   * Verifica las capacidades de la plataforma
   */
  getPlatformCapabilities(): {
    notifications: boolean;
    offline: boolean;
    backgroundSync: boolean;
    fileHandling: boolean;
  } {
    return {
      notifications: 'Notification' in window && 'PushManager' in window,
      offline: 'serviceWorker' in navigator,
      backgroundSync: 'serviceWorker' in navigator && 'SyncManager' in window,
      fileHandling: 'launchQueue' in window,
    };
  }
}
