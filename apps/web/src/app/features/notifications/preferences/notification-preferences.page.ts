import {
  Component,
  OnInit,
  inject,
  signal,
  effect,
  PLATFORM_ID,
  ChangeDetectionStrategy,
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { NotificationSoundService } from '@core/services/infrastructure/notification-sound.service';
import { NotificationManagerService } from '@core/services/infrastructure/notification-manager.service';
import {
  SmartNotificationService,
  NotificationCategory,
} from '@core/services/notifications/smart-notification.service';

interface CategoryPreference {
  category: NotificationCategory;
  label: string;
  description: string;
  enabled: boolean;
  icon: string;
}

/**
 * Preferencias de notificaciones inteligentes
 * Permite al usuario configurar canales, horarios silenciosos y categorias
 */
@Component({
  selector: 'app-notification-preferences',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, CommonModule],
  template: `
    <div class="min-h-screen bg-surface-base">
      <!-- Header -->
      <div class="sticky top-0 z-10 bg-surface-raised shadow">
        <div class="mx-auto max-w-4xl px-4 py-4">
          <div class="flex items-center gap-3">
            <button (click)="goBack()" class="rounded-lg p-2 hover:bg-surface-raised" type="button" aria-label="Volver">
              <svg
                class="h-6 w-6 text-text-secondary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <div>
              <h1 class="text-2xl font-bold text-text-primary">Preferencias de notificaciones</h1>
              <p class="text-sm text-text-secondary">
                Personaliza cómo y cuándo recibir notificaciones
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="mx-auto max-w-4xl p-4 space-y-6">
        @if (loading()) {
          <div class="flex h-96 items-center justify-center">
            <div class="text-center">
              <div
                class="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-border-muted border-t-blue-500"
              ></div>
              <p class="text-text-secondary">Cargando preferencias...</p>
            </div>
          </div>
        } @else {
          <!-- Canales de notificación -->
          <section class="rounded-xl bg-surface-raised p-6 shadow-sm">
            <h2 class="mb-4 text-lg font-semibold text-text-primary flex items-center gap-2">
              <span class="text-2xl">📱</span>
              Canales de notificación
            </h2>
            <p class="mb-6 text-sm text-text-secondary">
              Elige cómo quieres recibir las notificaciones
            </p>

            <div class="space-y-4">
              <!-- Push -->
              <div
                class="flex items-center justify-between p-4 rounded-lg border border-border-default hover:bg-surface-base transition-colors"
              >
                <div class="flex items-center gap-4">
                  <div
                    class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-xl"
                  >
                    🔔
                  </div>
                  <div>
                    <h3 class="font-medium text-text-primary">Push (navegador/app)</h3>
                    <p class="text-sm text-text-secondary">Notificaciones instantáneas</p>
                  </div>
                </div>
                <button
                  (click)="toggleChannel('push')"
                  [disabled]="browserNotificationsPermission() === 'denied'"
                  [class.bg-cta-default]="pushEnabled()"
                  [class.bg-surface-pressed]="!pushEnabled()"
                  class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cta-default focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                >
                  <span
                    [class.translate-x-5]="pushEnabled()"
                    [class.translate-x-0]="!pushEnabled()"
                    class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface-raised shadow ring-0 transition duration-200 ease-in-out"
                  ></span>
                </button>
              </div>

              @if (browserNotificationsPermission() === 'denied') {
                <div class="rounded-lg bg-warning-bg p-3 ml-14">
                  <p class="text-sm text-warning-strong">
                    Has bloqueado las notificaciones. Habilitalas en la configuración del navegador.
                  </p>
                </div>
              }

              <!-- Email -->
              <div
                class="flex items-center justify-between p-4 rounded-lg border border-border-default hover:bg-surface-base transition-colors"
              >
                <div class="flex items-center gap-4">
                  <div
                    class="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-xl"
                  >
                    📧
                  </div>
                  <div>
                    <h3 class="font-medium text-text-primary">Email</h3>
                    <p class="text-sm text-text-secondary">Resumen y confirmaciones importantes</p>
                  </div>
                </div>
                <button
                  (click)="toggleChannel('email')"
                  [class.bg-purple-600]="emailEnabled()"
                  [class.bg-surface-pressed]="!emailEnabled()"
                  class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                  type="button"
                >
                  <span
                    [class.translate-x-5]="emailEnabled()"
                    [class.translate-x-0]="!emailEnabled()"
                    class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface-raised shadow ring-0 transition duration-200 ease-in-out"
                  ></span>
                </button>
              </div>

              <!-- In-App -->
              <div
                class="flex items-center justify-between p-4 rounded-lg border border-border-default hover:bg-surface-base transition-colors"
              >
                <div class="flex items-center gap-4">
                  <div
                    class="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-xl"
                  >
                    🏠
                  </div>
                  <div>
                    <h3 class="font-medium text-text-primary">En la app</h3>
                    <p class="text-sm text-text-secondary">
                      Notificaciones dentro de la aplicación
                    </p>
                  </div>
                </div>
                <button
                  (click)="toggleChannel('in_app')"
                  [class.bg-green-600]="inAppEnabled()"
                  [class.bg-surface-pressed]="!inAppEnabled()"
                  class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  type="button"
                >
                  <span
                    [class.translate-x-5]="inAppEnabled()"
                    [class.translate-x-0]="!inAppEnabled()"
                    class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface-raised shadow ring-0 transition duration-200 ease-in-out"
                  ></span>
                </button>
              </div>

              <!-- Sound -->
              <div
                class="flex items-center justify-between p-4 rounded-lg border border-border-default hover:bg-surface-base transition-colors"
              >
                <div class="flex items-center gap-4">
                  <div
                    class="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-xl"
                  >
                    🔊
                  </div>
                  <div>
                    <h3 class="font-medium text-text-primary">Sonido</h3>
                    <p class="text-sm text-text-secondary">
                      Reproducir sonido con las notificaciones
                    </p>
                  </div>
                </div>
                <button
                  (click)="toggleSound()"
                  [class.bg-orange-600]="soundEnabled()"
                  [class.bg-surface-pressed]="!soundEnabled()"
                  class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                  type="button"
                >
                  <span
                    [class.translate-x-5]="soundEnabled()"
                    [class.translate-x-0]="!soundEnabled()"
                    class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface-raised shadow ring-0 transition duration-200 ease-in-out"
                  ></span>
                </button>
              </div>
            </div>
          </section>

          <!-- Horario silencioso -->
          <section class="rounded-xl bg-surface-raised p-6 shadow-sm">
            <h2 class="mb-4 text-lg font-semibold text-text-primary flex items-center gap-2">
              <span class="text-2xl">🌙</span>
              Horario silencioso
            </h2>
            <p class="mb-6 text-sm text-text-secondary">
              No recibirás notificaciones push durante estas horas (excepto emergencias)
            </p>

            <div class="flex items-center gap-4 mb-4">
              <button
                (click)="toggleQuietHours()"
                [class.bg-indigo-600]="quietHoursEnabled()"
                [class.bg-surface-pressed]="!quietHoursEnabled()"
                class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                type="button"
              >
                <span
                  [class.translate-x-5]="quietHoursEnabled()"
                  [class.translate-x-0]="!quietHoursEnabled()"
                  class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface-raised shadow ring-0 transition duration-200 ease-in-out"
                ></span>
              </button>
              <span class="text-text-primary">{{
                quietHoursEnabled() ? 'Activado' : 'Desactivado'
              }}</span>
            </div>

            @if (quietHoursEnabled()) {
              <div class="grid grid-cols-2 gap-4 pl-14">
                <div>
                  <label class="block text-sm font-medium text-text-secondary mb-1">Desde</label>
                  <input
                    type="time"
                    [ngModel]="quietHoursStart()"
                    (ngModelChange)="setQuietHoursStart($event)"
                    class="w-full rounded-lg border border-border-default bg-surface-base px-3 py-2 text-text-primary focus:border-cta-default focus:outline-none focus:ring-1 focus:ring-cta-default"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-text-secondary mb-1">Hasta</label>
                  <input
                    type="time"
                    [ngModel]="quietHoursEnd()"
                    (ngModelChange)="setQuietHoursEnd($event)"
                    class="w-full rounded-lg border border-border-default bg-surface-base px-3 py-2 text-text-primary focus:border-cta-default focus:outline-none focus:ring-1 focus:ring-cta-default"
                  />
                </div>
              </div>
            }
          </section>

          <!-- Modo de entrega -->
          <section class="rounded-xl bg-surface-raised p-6 shadow-sm">
            <h2 class="mb-4 text-lg font-semibold text-text-primary flex items-center gap-2">
              <span class="text-2xl">⏱️</span>
              Modo de entrega
            </h2>
            <p class="mb-6 text-sm text-text-secondary">
              Elige cómo quieres recibir las notificaciones no urgentes
            </p>

            <div class="space-y-3">
              @for (mode of digestModes; track mode.value) {
                <label
                  class="flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors"
                  [class.border-cta-default]="digestMode() === mode.value"
                  [class.bg-cta-default/5]="digestMode() === mode.value"
                  [class.border-border-default]="digestMode() !== mode.value"
                  [class.hover:bg-surface-base]="digestMode() !== mode.value"
                >
                  <input
                    type="radio"
                    name="digestMode"
                    [value]="mode.value"
                    [checked]="digestMode() === mode.value"
                    (change)="setDigestMode(mode.value)"
                    class="h-4 w-4 text-cta-default focus:ring-cta-default"
                  />
                  <div class="flex-1">
                    <div class="flex items-center gap-2">
                      <span class="text-lg">{{ mode.icon }}</span>
                      <span class="font-medium text-text-primary">{{ mode.label }}</span>
                    </div>
                    <p class="text-sm text-text-secondary">{{ mode.description }}</p>
                  </div>
                </label>
              }
            </div>
          </section>

          <!-- Categorías -->
          <section class="rounded-xl bg-surface-raised p-6 shadow-sm">
            <h2 class="mb-4 text-lg font-semibold text-text-primary flex items-center gap-2">
              <span class="text-2xl">📋</span>
              Categorías de notificación
            </h2>
            <p class="mb-6 text-sm text-text-secondary">
              Selecciona qué tipos de notificaciones quieres recibir
            </p>

            <div class="space-y-3">
              @for (cat of categoryPreferences(); track cat.category) {
                <div
                  class="flex items-center justify-between p-4 rounded-lg border border-border-default hover:bg-surface-base transition-colors"
                >
                  <div class="flex items-center gap-4">
                    <div
                      class="flex h-10 w-10 items-center justify-center rounded-full bg-surface-base text-xl"
                    >
                      {{ cat.icon }}
                    </div>
                    <div>
                      <h3 class="font-medium text-text-primary">{{ cat.label }}</h3>
                      <p class="text-sm text-text-secondary">{{ cat.description }}</p>
                    </div>
                  </div>
                  <button
                    (click)="toggleCategory(cat)"
                    [class.bg-cta-default]="cat.enabled"
                    [class.bg-surface-pressed]="!cat.enabled"
                    class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cta-default focus:ring-offset-2"
                    type="button"
                  >
                    <span
                      [class.translate-x-5]="cat.enabled"
                      [class.translate-x-0]="!cat.enabled"
                      class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface-raised shadow ring-0 transition duration-200 ease-in-out"
                    ></span>
                  </button>
                </div>
              }
            </div>
          </section>

          <!-- Test notification -->
          <section class="rounded-xl bg-surface-raised p-6 shadow-sm">
            <h2 class="mb-4 text-lg font-semibold text-text-primary flex items-center gap-2">
              <span class="text-2xl">🧪</span>
              Probar notificaciones
            </h2>
            <p class="mb-4 text-sm text-text-secondary">
              Envía una notificación de prueba para verificar la configuración
            </p>
            <button
              (click)="sendTestNotification()"
              [disabled]="sendingTest()"
              class="inline-flex items-center gap-2 rounded-lg bg-cta-default px-4 py-2 text-cta-text font-medium hover:bg-cta-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              @if (sendingTest()) {
                <div
                  class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                ></div>
                Enviando...
              } @else {
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                Enviar notificación de prueba
              }
            </button>
          </section>

          <!-- Save button -->
          <div class="flex justify-end gap-3 pb-8">
            <button
              (click)="goBack()"
              class="rounded-lg border border-border-muted px-6 py-3 font-medium text-text-primary hover:bg-surface-base transition-colors"
              type="button"
            >
              Cancelar
            </button>
            <button
              (click)="savePreferences()"
              [disabled]="saving()"
              class="rounded-lg bg-cta-default px-6 py-3 text-cta-text font-medium hover:bg-cta-hover disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              type="button"
            >
              @if (saving()) {
                <span class="inline-flex items-center gap-2">
                  <div
                    class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                  ></div>
                  Guardando...
                </span>
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
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly supabase = injectSupabase();
  private readonly router = inject(Router);
  private readonly notificationSound = inject(NotificationSoundService);
  private readonly notifications = inject(NotificationManagerService);
  private readonly smartNotifications = inject(SmartNotificationService);

  // State signals
  loading = signal(true);
  saving = signal(false);
  sendingTest = signal(false);
  browserNotificationsPermission = signal<NotificationPermission>('default');

  // Channel signals
  pushEnabled = signal(true);
  emailEnabled = signal(true);
  inAppEnabled = signal(true);
  soundEnabled = signal(true);

  // Quiet hours
  quietHoursEnabled = signal(true);
  quietHoursStart = signal('22:00');
  quietHoursEnd = signal('08:00');

  // Digest mode
  digestMode = signal<'instant' | 'hourly' | 'daily'>('instant');

  readonly digestModes = [
    {
      value: 'instant' as const,
      label: 'Instantáneo',
      description: 'Recibir cada notificación inmediatamente',
      icon: '⚡',
    },
    {
      value: 'hourly' as const,
      label: 'Resumen cada hora',
      description: 'Agrupar notificaciones y enviar un resumen cada hora',
      icon: '🕐',
    },
    {
      value: 'daily' as const,
      label: 'Resumen diario',
      description: 'Recibir un resumen de notificaciones una vez al día',
      icon: '📅',
    },
  ];

  // Category preferences
  categoryPreferences = signal<CategoryPreference[]>([
    {
      category: 'booking',
      label: 'Reservas',
      description: 'Nuevas reservas, confirmaciones, cancelaciones',
      enabled: true,
      icon: '🚗',
    },
    {
      category: 'payment',
      label: 'Pagos',
      description: 'Confirmaciones de pago, depósitos, reembolsos',
      enabled: true,
      icon: '💳',
    },
    {
      category: 'message',
      label: 'Mensajes',
      description: 'Nuevos mensajes en el chat',
      enabled: true,
      icon: '💬',
    },
    {
      category: 'review',
      label: 'Reseñas',
      description: 'Nuevas reseñas y respuestas',
      enabled: true,
      icon: '⭐',
    },
    {
      category: 'reminder',
      label: 'Recordatorios',
      description: 'Recordatorios de viajes, inspecciones, documentos',
      enabled: true,
      icon: '⏰',
    },
    {
      category: 'promotion',
      label: 'Promociones',
      description: 'Ofertas especiales y descuentos',
      enabled: false,
      icon: '🎁',
    },
    {
      category: 'system',
      label: 'Sistema',
      description: 'Actualizaciones de la plataforma y mantenimiento',
      enabled: true,
      icon: '⚙️',
    },
  ]);

  constructor() {
    // Sync sound with service
    effect(() => {
      const soundState = this.notificationSound.isSoundEnabledSignal()();
      this.soundEnabled.set(soundState);
    });
  }

  async ngOnInit() {
    await this.loadPreferences();
    this.checkBrowserNotifications();
  }

  async loadPreferences() {
    this.loading.set(true);
    try {
      // Load from SmartNotificationService
      const prefs = await this.smartNotifications.loadPreferences();

      if (prefs) {
        this.pushEnabled.set(prefs.push_enabled);
        this.emailEnabled.set(prefs.email_enabled);
        this.inAppEnabled.set(prefs.in_app_enabled);

        // Quiet hours
        if (prefs.quiet_hours_start && prefs.quiet_hours_end) {
          this.quietHoursEnabled.set(true);
          this.quietHoursStart.set(prefs.quiet_hours_start);
          this.quietHoursEnd.set(prefs.quiet_hours_end);
        } else {
          this.quietHoursEnabled.set(false);
        }

        // Digest mode
        this.digestMode.set(prefs.digest_mode);

        // Categories
        if (prefs.categories) {
          this.categoryPreferences.update((cats) =>
            cats.map((cat) => ({
              ...cat,
              enabled: prefs.categories[cat.category] ?? cat.enabled,
            })),
          );
        }
      }

      // Load sound state
      const soundState = this.notificationSound.isSoundEnabledSignal()();
      this.soundEnabled.set(soundState);
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      this.loading.set(false);
    }
  }

  checkBrowserNotifications() {
    if (this.isBrowser && 'Notification' in window) {
      this.browserNotificationsPermission.set(Notification.permission);
      if (Notification.permission === 'granted') {
        this.pushEnabled.set(true);
      }
    }
  }

  async toggleChannel(channel: 'push' | 'email' | 'in_app') {
    if (channel === 'push') {
      // Check browser permission first
      if (this.isBrowser && 'Notification' in window) {
        if (Notification.permission === 'denied') {
          this.notifications.warning(
            'Notificaciones bloqueadas',
            'Habilitalas en la configuración del navegador',
          );
          return;
        }

        if (Notification.permission === 'default') {
          const permission = await Notification.requestPermission();
          this.browserNotificationsPermission.set(permission);
          if (permission !== 'granted') {
            return;
          }
        }
      }
      this.pushEnabled.update((v) => !v);
    } else if (channel === 'email') {
      this.emailEnabled.update((v) => !v);
    } else if (channel === 'in_app') {
      this.inAppEnabled.update((v) => !v);
    }
  }

  toggleSound() {
    const newState = this.notificationSound.toggleSound();
    this.soundEnabled.set(newState);
    if (newState) {
      this.notificationSound.playNotificationSound().catch(() => {});
    }
  }

  toggleQuietHours() {
    this.quietHoursEnabled.update((v) => !v);
  }

  setQuietHoursStart(time: string) {
    this.quietHoursStart.set(time);
  }

  setQuietHoursEnd(time: string) {
    this.quietHoursEnd.set(time);
  }

  setDigestMode(mode: 'instant' | 'hourly' | 'daily') {
    this.digestMode.set(mode);
  }

  toggleCategory(cat: CategoryPreference) {
    this.categoryPreferences.update((cats) =>
      cats.map((c) => (c.category === cat.category ? { ...c, enabled: !c.enabled } : c)),
    );
  }

  async sendTestNotification() {
    this.sendingTest.set(true);
    try {
      const success = await this.smartNotifications.sendTestNotification();
      if (success) {
        this.notifications.success('Notificación enviada', 'Revisa tus notificaciones');
      } else {
        this.notifications.error('Error', 'No se pudo enviar la notificación de prueba');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      this.notifications.error('Error', 'No se pudo enviar la notificación de prueba');
    } finally {
      this.sendingTest.set(false);
    }
  }

  async savePreferences() {
    this.saving.set(true);
    try {
      // Build categories object
      const categories = this.categoryPreferences().reduce(
        (acc, cat) => {
          acc[cat.category] = cat.enabled;
          return acc;
        },
        {} as Record<NotificationCategory, boolean>,
      );

      // Update via SmartNotificationService
      const success = await this.smartNotifications.updatePreferences({
        push_enabled: this.pushEnabled(),
        email_enabled: this.emailEnabled(),
        in_app_enabled: this.inAppEnabled(),
        quiet_hours_start: this.quietHoursEnabled() ? this.quietHoursStart() : null,
        quiet_hours_end: this.quietHoursEnabled() ? this.quietHoursEnd() : null,
        digest_mode: this.digestMode(),
        categories,
      });

      if (success) {
        this.notifications.success('Preferencias guardadas', 'Tus cambios han sido guardados');
        this.goBack();
      } else {
        this.notifications.error('Error', 'No se pudieron guardar las preferencias');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      this.notifications.error('Error', 'No se pudieron guardar las preferencias');
    } finally {
      this.saving.set(false);
    }
  }

  goBack() {
    void this.router.navigate(['/notifications']);
  }
}
