import { isPlatformBrowser } from '@angular/common';
import {Component, inject, OnInit, PLATFORM_ID, signal,
  ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NotificationManagerService } from '../../../core/services/notification-manager.service';
import { NotificationsService } from '../../../core/services/user-notifications.service';

/**
 * NotificationsSettingsPage
 *
 * Página de configuración de preferencias de notificaciones.
 *
 * Características:
 * - Habilitar/deshabilitar notificaciones push del navegador
 * - Configurar tipos de notificaciones a recibir
 * - Preferencias por canal (email, push, in-app)
 * - Configurar sonido de notificaciones
 *
 * Ruta: /profile/notifications-settings
 */
@Component({
  selector: 'app-notifications-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './notifications-settings.page.html',
  styleUrls: ['./notifications-settings.page.css'],
})
export class NotificationsSettingsPage implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly router = inject(Router);
  private readonly notificationsService = inject(NotificationsService);
  private readonly toastService = inject(NotificationManagerService);

  // Estado de configuración
  readonly settings = signal({
    // Notificaciones push del navegador
    browserPushEnabled: false,
    browserPushPermission: 'default' as NotificationPermission,

    // Tipos de notificaciones
    bookingUpdates: true,
    paymentNotifications: true,
    messageNotifications: true,
    promotionsAndOffers: false,
    systemUpdates: true,

    // Canales
    inAppNotifications: true,
    emailNotifications: true,

    // Sonido
    soundEnabled: true,
  });

  readonly saving = signal(false);

  async ngOnInit() {
    // Cargar preferencias del usuario desde localStorage o backend
    this.loadSettings();

    // Check browser push permission
    if ('Notification' in window) {
      this.settings.update((s) => ({
        ...s,
        browserPushPermission: Notification.permission,
        browserPushEnabled: Notification.permission === 'granted',
      }));
    }
  }

  private loadSettings() {
    if (!this.isBrowser) return;
    // TODO: Cargar desde backend o localStorage
    const savedSettings = localStorage.getItem('notification_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        this.settings.set({ ...this.settings(), ...parsed });
      } catch (e) {
        console.error('Error loading notification settings', e);
      }
    }
  }

  async toggleBrowserPush() {
    const current = this.settings();

    if (current.browserPushEnabled) {
      // Deshabilitar
      this.settings.update((s) => ({ ...s, browserPushEnabled: false }));
      this.saveSettings();
      this.toastService.info('Notificaciones push deshabilitadas', '');
    } else {
      // Solicitar permiso
      const granted = await this.notificationsService.requestNotificationPermission();

      if (granted) {
        this.settings.update((s) => ({
          ...s,
          browserPushEnabled: true,
          browserPushPermission: 'granted',
        }));
        this.saveSettings();
        this.toastService.success('Notificaciones push habilitadas', '');
      } else {
        this.toastService.info(
          'No se pudo habilitar notificaciones push. Verifica los permisos del navegador.',
          '',
        );
      }
    }
  }

  toggleSetting(setting: keyof typeof this.settings extends () => infer T ? keyof T : never) {
    this.settings.update((s) => ({
      ...s,
      [setting]: !(s as Record<string, unknown>)[setting],
    }));
    this.saveSettings();
  }

  async saveSettings() {
    this.saving.set(true);

    try {
      // Guardar en localStorage (en producción, enviar a backend)
      const settings = this.settings();
      if (this.isBrowser) localStorage.setItem('notification_settings', JSON.stringify(settings));

      // TODO: Enviar a backend
      // await this.notificationsService.updateSettings(settings);

      await new Promise((resolve) => setTimeout(resolve, 300)); // Simulate API call
      this.toastService.success('Configuración guardada', '');
    } catch (error) {
      console.error('Error saving settings', error);
      this.toastService.error('Error al guardar configuración', '');
    } finally {
      this.saving.set(false);
    }
  }

  goBack() {
    this.router.navigate(['/profile']);
  }

  openBrowserSettings() {
    // Instrucciones para abrir configuración del navegador
    alert(
      'Para cambiar los permisos de notificaciones:\n\n' +
        '1. Chrome/Edge: Haz clic en el ícono de candado en la barra de direcciones\n' +
        '2. Firefox: Haz clic en el ícono de escudo\n' +
        '3. Safari: Preferencias > Sitios web > Notificaciones',
    );
  }
}
