import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { injectSupabase } from '../../../core/services/supabase-client.service';

interface NotificationPreference {
  type: string;
  label: string;
  description: string;
  enabled: boolean;
  icon: string;
}

/**
 * ⚙️ Preferencias de notificaciones
 * Permite al usuario habilitar/deshabilitar tipos de notificaciones
 */
@Component({
  selector: 'app-notification-preferences',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
      <!-- Header -->
      <div class="sticky top-0 z-10 bg-white shadow dark:bg-gray-800">
        <div class="mx-auto max-w-4xl px-4 py-4">
          <div class="flex items-center gap-3">
            <button
              (click)="goBack()"
              class="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
              type="button"
            >
              <svg class="h-6 w-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Preferencias de notificaciones</h1>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                Personaliza qué notificaciones quieres recibir
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="mx-auto max-w-4xl p-4">
        @if (loading()) {
          <div class="flex h-96 items-center justify-center">
            <div class="text-center">
              <div
                class="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-500"
              ></div>
              <p class="text-gray-600 dark:text-gray-400">Cargando preferencias...</p>
            </div>
          </div>
        } @else {
          <!-- Browser notifications -->
          <div class="mb-6 rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-4">
                <div class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-2xl dark:bg-blue-900/30">
                  🔔
                </div>
                <div>
                  <h3 class="font-semibold text-gray-900 dark:text-white">
                    Notificaciones del navegador
                  </h3>
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    Recibe notificaciones incluso cuando no estés en la app
                  </p>
                </div>
              </div>
              <button
                (click)="toggleBrowserNotifications()"
                [disabled]="browserNotificationsPermission() === 'denied'"
                [class.bg-blue-600]="browserNotificationsEnabled()"
                [class.bg-gray-300]="!browserNotificationsEnabled()"
                class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
              >
                <span
                  [class.translate-x-5]="browserNotificationsEnabled()"
                  [class.translate-x-0]="!browserNotificationsEnabled()"
                  class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                ></span>
              </button>
            </div>
            @if (browserNotificationsPermission() === 'denied') {
              <div class="mt-3 rounded-lg bg-yellow-50 p-3 dark:bg-yellow-900/20">
                <p class="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ Has bloqueado las notificaciones del navegador. Para habilitarlas, ve a la configuración de tu navegador.
                </p>
              </div>
            }
          </div>

          <!-- Sound preferences -->
          <div class="mb-6 rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-4">
                <div class="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-2xl dark:bg-purple-900/30">
                  🔊
                </div>
                <div>
                  <h3 class="font-semibold text-gray-900 dark:text-white">
                    Sonido de notificaciones
                  </h3>
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    Reproducir un sonido cuando llegue una notificación
                  </p>
                </div>
              </div>
              <button
                (click)="toggleSound()"
                [class.bg-purple-600]="soundEnabled()"
                [class.bg-gray-300]="!soundEnabled()"
                class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                type="button"
              >
                <span
                  [class.translate-x-5]="soundEnabled()"
                  [class.translate-x-0]="!soundEnabled()"
                  class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                ></span>
              </button>
            </div>
          </div>

          <!-- Notification types -->
          <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Tipos de notificaciones
            </h2>
            <p class="mb-6 text-sm text-gray-600 dark:text-gray-400">
              Selecciona qué tipos de notificaciones quieres recibir
            </p>

            <div class="space-y-4">
              @for (pref of preferences(); track pref.type) {
                <div class="flex items-center justify-between rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50">
                  <div class="flex items-center gap-4">
                    <div class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-xl dark:bg-gray-700">
                      {{ pref.icon }}
                    </div>
                    <div class="flex-1">
                      <h3 class="font-medium text-gray-900 dark:text-white">
                        {{ pref.label }}
                      </h3>
                      <p class="text-sm text-gray-600 dark:text-gray-400">
                        {{ pref.description }}
                      </p>
                    </div>
                  </div>
                  <button
                    (click)="togglePreference(pref)"
                    [class.bg-blue-600]="pref.enabled"
                    [class.bg-gray-300]="!pref.enabled"
                    class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    type="button"
                  >
                    <span
                      [class.translate-x-5]="pref.enabled"
                      [class.translate-x-0]="!pref.enabled"
                      class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                    ></span>
                  </button>
                </div>
              }
            </div>
          </div>

          <!-- Save button -->
          <div class="mt-6 flex justify-end gap-3">
            <button
              (click)="goBack()"
              class="rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              type="button"
            >
              Cancelar
            </button>
            <button
              (click)="savePreferences()"
              [disabled]="saving()"
              class="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
            >
              @if (saving()) {
                Guardando...
              } @else {
                Guardar cambios
              }
            </button>
          </div>
        }
      </div>
    </div>
  `,
})
export class NotificationPreferencesPage implements OnInit {
  private readonly supabase = injectSupabase();
  private readonly router = inject(Router);

  loading = signal(true);
  saving = signal(false);
  browserNotificationsEnabled = signal(false);
  browserNotificationsPermission = signal<NotificationPermission>('default');
  soundEnabled = signal(true);

  preferences = signal<NotificationPreference[]>([
    {
      type: 'new_booking_for_owner',
      label: 'Nuevas reservas',
      description: 'Cuando alguien solicita reservar tu auto',
      enabled: true,
      icon: '🚗',
    },
    {
      type: 'booking_cancelled_for_owner',
      label: 'Cancelaciones (propietario)',
      description: 'Cuando un inquilino cancela una reserva de tu auto',
      enabled: true,
      icon: '❌',
    },
    {
      type: 'booking_cancelled_for_renter',
      label: 'Cancelaciones (inquilino)',
      description: 'Cuando un propietario cancela tu reserva',
      enabled: true,
      icon: '❌',
    },
    {
      type: 'new_chat_message',
      label: 'Mensajes nuevos',
      description: 'Cuando recibes un nuevo mensaje en el chat',
      enabled: true,
      icon: '💬',
    },
    {
      type: 'payment_successful',
      label: 'Pagos exitosos',
      description: 'Cuando se procesa un pago correctamente',
      enabled: true,
      icon: '💳',
    },
    {
      type: 'payout_successful',
      label: 'Pagos recibidos',
      description: 'Cuando recibes un pago en tu wallet',
      enabled: true,
      icon: '💰',
    },
    {
      type: 'inspection_reminder',
      label: 'Recordatorios de inspección',
      description: 'Recordatorios para realizar inspecciones de vehículos',
      enabled: true,
      icon: '🔍',
    },
    {
      type: 'generic_announcement',
      label: 'Anuncios generales',
      description: 'Actualizaciones y anuncios de la plataforma',
      enabled: true,
      icon: '📢',
    },
  ]);

  async ngOnInit() {
    await this.loadPreferences();
    this.checkBrowserNotifications();
  }

  async loadPreferences() {
    this.loading.set(true);
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return;

      // Load preferences from localStorage for now
      // TODO: Move to database table if needed
      const savedPrefs = localStorage.getItem(`notification_prefs_${user.id}`);
      if (savedPrefs) {
        const parsed = JSON.parse(savedPrefs);

        // Update preferences
        this.preferences.update(prefs =>
          prefs.map(p => ({
            ...p,
            enabled: parsed.types?.[p.type] ?? true,
          }))
        );

        this.soundEnabled.set(parsed.soundEnabled ?? true);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      this.loading.set(false);
    }
  }

  checkBrowserNotifications() {
    if ('Notification' in window) {
      this.browserNotificationsPermission.set(Notification.permission);
      this.browserNotificationsEnabled.set(Notification.permission === 'granted');
    }
  }

  async toggleBrowserNotifications() {
    if (!('Notification' in window)) {
      alert('Tu navegador no soporta notificaciones');
      return;
    }

    if (Notification.permission === 'denied') {
      alert('Has bloqueado las notificaciones. Por favor, habilítalas en la configuración de tu navegador.');
      return;
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      this.browserNotificationsPermission.set(permission);
      this.browserNotificationsEnabled.set(permission === 'granted');
    } else {
      // Already granted, toggle the setting
      this.browserNotificationsEnabled.update(v => !v);
    }
  }

  toggleSound() {
    this.soundEnabled.update(v => !v);
  }

  togglePreference(pref: NotificationPreference) {
    this.preferences.update(prefs =>
      prefs.map(p => p.type === pref.type ? { ...p, enabled: !p.enabled } : p)
    );
  }

  async savePreferences() {
    this.saving.set(true);
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return;

      // Save to localStorage for now
      const prefsToSave = {
        soundEnabled: this.soundEnabled(),
        browserNotificationsEnabled: this.browserNotificationsEnabled(),
        types: this.preferences().reduce((acc, p) => {
          acc[p.type] = p.enabled;
          return acc;
        }, {} as Record<string, boolean>),
      };

      localStorage.setItem(`notification_prefs_${user.id}`, JSON.stringify(prefsToSave));

      // Show success message
      alert('✅ Preferencias guardadas correctamente');

      // Go back
      this.goBack();
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('❌ Error al guardar las preferencias');
    } finally {
      this.saving.set(false);
    }
  }

  goBack() {
    void this.router.navigate(['/notifications']);
  }
}
