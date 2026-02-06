import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
  OnDestroy,
  signal,
  computed,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { IconComponent } from '@shared/components/icon/icon.component';
import { HoverLiftDirective } from '@shared/directives/hover-lift.directive';
import { PressScaleDirective } from '@shared/directives/press-scale.directive';
import type { Booking } from '@core/models';

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  icon: string;
}

interface WeatherData {
  temperature: number;
  description: string;
  icon: string;
}

/**
 * PreTripView - Countdown & Preparation Mode
 *
 * Shown when pickup is within 48 hours. Features:
 * - Animated countdown timer (hero)
 * - Pickup location map (Google Static Maps)
 * - Pre-trip checklist (persisted to localStorage)
 * - Weather forecast for pickup day
 */
@Component({
  standalone: true,
  selector: 'app-pre-trip-view',
  imports: [CommonModule, RouterLink, IconComponent, HoverLiftDirective, PressScaleDirective],
  template: `
    <div class="min-h-screen bg-surface-primary pb-24">
      <!-- Countdown Hero -->
      <section
        class="countdown-hero bg-gradient-to-br from-emerald-500 to-emerald-600 px-4 pt-safe pb-8"
      >
        <div class="max-w-2xl mx-auto">
          <!-- Back link -->
          <a
            routerLink="/bookings"
            class="inline-flex items-center gap-1 text-white/80 text-sm mb-4"
          >
            <app-icon name="chevron-left" class="w-4 h-4" />
            <span>Mis Viajes</span>
          </a>

          <!-- Timer display -->
          <div class="text-center">
            <p class="text-white/80 text-sm mb-2">Tu auto te espera en</p>

            <div class="flex justify-center items-center gap-2 sm:gap-3">
              @for (unit of timerUnits(); track unit.label) {
                <div class="timer-unit">
                  <div
                    class="timer-digit glass-lite backdrop-blur-md bg-white/20 rounded-xl px-3 py-2 sm:px-4 sm:py-3"
                  >
                    <span class="text-3xl sm:text-4xl font-bold text-white font-mono tabular-nums">
                      {{ unit.value | number: '2.0-0' }}
                    </span>
                  </div>
                  <span class="text-white/70 text-xs mt-1 block">{{ unit.label }}</span>
                </div>
                @if (!$last) {
                  <span class="text-white/50 text-2xl font-light self-start mt-2">:</span>
                }
              }
            </div>

            <!-- Human readable -->
            <p class="text-white font-medium mt-4">
              {{ timeDescription() }}
            </p>
          </div>
        </div>
      </section>

      <main class="px-4 max-w-2xl mx-auto -mt-4 space-y-4">
        <!-- Car info card -->
        <section class="glass-card-elevated p-4 rounded-2xl" appHoverLift>
          <div class="flex items-center gap-4">
            @if (carImageUrl()) {
              <img
                [src]="carImageUrl()"
                [alt]="carName()"
                class="w-20 h-14 object-cover rounded-lg"
              />
            }
            <div class="flex-1">
              <h2 class="font-semibold text-text-primary">{{ carName() }}</h2>
              <p class="text-sm text-text-secondary">{{ dateRange() }}</p>
            </div>
            <a
              [routerLink]="['/bookings', booking.id]"
              class="p-2 rounded-full bg-surface-secondary hover:bg-surface-tertiary transition-colors"
              appPressScale
            >
              <app-icon name="chevron-right" class="w-5 h-5 text-text-secondary" />
            </a>
          </div>
        </section>

        <!-- Two column grid: Map + Checklist -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Pickup Map -->
          <section class="glass-card p-4 rounded-xl" appHoverLift>
            <h3 class="font-medium text-text-primary flex items-center gap-2 mb-3">
              <app-icon name="map-pin" class="w-5 h-5 text-primary-500" />
              Ubicación de Retiro
            </h3>

            <div class="relative">
              @if (mapUrl()) {
                <img
                  [src]="mapUrl()"
                  alt="Mapa de ubicación"
                  class="w-full h-32 object-cover rounded-lg"
                  loading="lazy"
                />
              } @else {
                <div
                  class="w-full h-32 bg-surface-secondary rounded-lg flex items-center justify-center"
                >
                  <app-icon name="map" class="w-8 h-8 text-text-tertiary" />
                </div>
              }

              <button
                type="button"
                (click)="openMaps()"
                class="absolute bottom-2 right-2 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium shadow-lg"
                appPressScale
              >
                Abrir en Maps
              </button>
            </div>

            <p class="text-sm text-text-secondary mt-2">
              {{ pickupLocation() }}
            </p>
          </section>

          <!-- Checklist -->
          <section class="glass-card p-4 rounded-xl" appHoverLift>
            <h3 class="font-medium text-text-primary flex items-center gap-2 mb-3">
              <app-icon name="check-circle" class="w-5 h-5 text-primary-500" />
              Checklist Pre-Viaje
            </h3>

            <ul class="space-y-2">
              @for (item of checklist(); track item.id) {
                <li>
                  <button
                    type="button"
                    (click)="toggleChecklistItem(item.id)"
                    class="w-full flex items-center gap-3 p-2 rounded-lg transition-colors"
                    [class.bg-success-bg]="item.checked"
                    [class.hover:bg-surface-secondary]="!item.checked"
                    appPressScale
                  >
                    <div
                      class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all"
                      [class.border-success-500]="item.checked"
                      [class.bg-success-500]="item.checked"
                      [class.border-border-default]="!item.checked"
                    >
                      @if (item.checked) {
                        <app-icon name="check" class="w-4 h-4 text-white" />
                      }
                    </div>
                    <span
                      class="flex-1 text-left text-sm"
                      [class.text-text-primary]="!item.checked"
                      [class.text-success-text]="item.checked"
                      [class.line-through]="item.checked"
                    >
                      {{ item.icon }} {{ item.label }}
                    </span>
                  </button>
                </li>
              }
            </ul>

            <div class="mt-3 pt-3 border-t border-border-default">
              <p class="text-xs text-text-tertiary">
                {{ checklistProgress() }}/{{ checklist().length }} completados
              </p>
            </div>
          </section>
        </div>

        <!-- Bottom row: Instructions + Weather -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Pickup Instructions -->
          <section class="glass-card p-4 rounded-xl" appHoverLift>
            <h3 class="font-medium text-text-primary flex items-center gap-2 mb-3">
              <app-icon name="info" class="w-5 h-5 text-info-500" />
              Instrucciones
            </h3>

            @if (booking['pickup_instructions']) {
              <p class="text-sm text-text-secondary">
                {{ booking['pickup_instructions'] }}
              </p>
            } @else {
              <p class="text-sm text-text-tertiary italic">
                El propietario enviará las instrucciones de retiro.
              </p>
            }

            <a
              [routerLink]="['/messages/chat']"
              [queryParams]="{ bookingId: booking.id, userId: booking.owner_id }"
              class="mt-3 inline-flex items-center gap-2 text-sm text-primary-500 font-medium"
              appPressScale
            >
              <app-icon name="message-circle" class="w-4 h-4" />
              Contactar propietario
            </a>
          </section>

          <!-- Weather Widget -->
          <section class="glass-card p-4 rounded-xl" appHoverLift>
            <h3 class="font-medium text-text-primary flex items-center gap-2 mb-3">
              <span class="text-lg">{{ weather()?.icon ?? '🌤️' }}</span>
              Clima en {{ cityName() }}
            </h3>

            @if (weather()) {
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-3xl font-bold text-text-primary">{{ weather()!.temperature }}°C</p>
                  <p class="text-sm text-text-secondary capitalize">
                    {{ weather()!.description }}
                  </p>
                </div>
                <span class="text-5xl">{{ weather()!.icon }}</span>
              </div>
            } @else if (loadingWeather()) {
              <div class="flex items-center gap-2">
                <div
                  class="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"
                ></div>
                <span class="text-sm text-text-secondary">Cargando clima...</span>
              </div>
            } @else {
              <p class="text-sm text-text-tertiary">Clima no disponible</p>
            }
          </section>
        </div>

        <!-- View Details CTA -->
        <section class="pt-4">
          <a
            [routerLink]="['/bookings', booking.id]"
            class="w-full btn-primary flex items-center justify-center gap-2 py-3 rounded-xl font-medium"
            appPressScale
          >
            <app-icon name="file-text" class="w-5 h-5" />
            Ver Detalle Completo
          </a>
        </section>
      </main>
    </div>
  `,
  styles: [
    `
      .countdown-hero {
        padding-top: max(env(safe-area-inset-top), 1rem);
      }

      .pt-safe {
        padding-top: env(safe-area-inset-top);
      }

      .timer-unit {
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .timer-digit {
        min-width: 56px;
        text-align: center;
      }

      @media (min-width: 640px) {
        .timer-digit {
          min-width: 72px;
        }
      }

      .btn-primary {
        background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
        color: white;
        transition: all 0.2s ease;
      }

      .btn-primary:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(var(--primary-500-rgb), 0.3);
      }

      .glass-lite {
        background: rgba(255, 255, 255, 0.15);
        backdrop-filter: blur(8px);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreTripViewComponent implements OnInit, OnDestroy {
  @Input({ required: true }) booking!: Booking;
  @Input() hoursToPickup = 48;

  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  // Timer state
  readonly remainingMs = signal(0);

  // Weather state
  readonly weather = signal<WeatherData | null>(null);
  readonly loadingWeather = signal(false);

  // Checklist state (persisted to localStorage)
  readonly checklist = signal<ChecklistItem[]>([
    { id: 'dni', label: 'DNI o Pasaporte', checked: false, icon: '🪪' },
    { id: 'license', label: 'Licencia de Conducir', checked: false, icon: '🚗' },
    { id: 'contact', label: 'Contactar propietario', checked: false, icon: '💬' },
    { id: 'route', label: 'Planificar ruta', checked: false, icon: '🗺️' },
  ]);

  // Computed values
  readonly timerUnits = computed(() => {
    const ms = this.remainingMs();
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);

    // Show days only if > 0
    if (days > 0) {
      return [
        { value: days, label: days === 1 ? 'día' : 'días' },
        { value: hours, label: 'hrs' },
        { value: minutes, label: 'min' },
        { value: seconds, label: 'seg' },
      ];
    }

    return [
      { value: hours, label: 'hrs' },
      { value: minutes, label: 'min' },
      { value: seconds, label: 'seg' },
    ];
  });

  readonly timeDescription = computed(() => {
    const ms = this.remainingMs();
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    if (days > 0) {
      return `${days}d ${remainingHours}h para el retiro`;
    }
    if (hours > 1) {
      return `${hours} horas para el retiro`;
    }
    if (hours === 1) {
      return '1 hora para el retiro';
    }
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${minutes} minutos para el retiro`;
  });

  readonly carName = computed(() => {
    const { car_brand, car_model, car_year } = this.booking;
    if (car_brand && car_model) {
      return `${car_brand} ${car_model}${car_year ? ` ${car_year}` : ''}`;
    }
    return 'Tu vehículo';
  });

  readonly carImageUrl = computed(() => {
    return this.booking.main_photo_url || this.booking.car_image || null;
  });

  readonly dateRange = computed(() => {
    const start = this.booking.start_at ? new Date(this.booking.start_at) : null;
    const end = this.booking.end_at ? new Date(this.booking.end_at) : null;

    if (!start) return '';

    const formatDate = (d: Date) =>
      d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });

    return end ? `${formatDate(start)} - ${formatDate(end)}` : formatDate(start);
  });

  readonly pickupLocation = computed(() => {
    const { car_city, car_province } = this.booking;
    if (car_city && car_province) {
      return `${car_city}, ${car_province}`;
    }
    return 'Ubicación por confirmar';
  });

  readonly cityName = computed(() => {
    return this.booking.car_city ?? 'la zona';
  });

  readonly mapUrl = computed(() => {
    const { car_city, car_province } = this.booking;
    if (!car_city && !car_province) return null;

    const location = encodeURIComponent(`${car_city ?? ''}, ${car_province ?? ''}, Argentina`);

    // SSR Safe: Window check
    let apiKey = '';
    if (this.isBrowser) {
      apiKey = (window as Window & { __GOOGLE_MAPS_API_KEY__?: string }).__GOOGLE_MAPS_API_KEY__ ?? '';
    }

    // Google Static Maps API
    return `https://maps.googleapis.com/maps/api/staticmap?center=${location}&zoom=14&size=400x200&scale=2&maptype=roadmap&markers=color:red%7C${location}&key=${apiKey}`;
  });

  readonly checklistProgress = computed(
    () => this.checklist().filter((item) => item.checked).length,
  );

  private readonly boundVisibilityHandler = this.handleVisibilityChange.bind(this);

  ngOnInit(): void {
    this.loadChecklistState();
    this.startTimer();
    this.fetchWeather();

    if (this.isBrowser) {
      document.addEventListener('visibilitychange', this.boundVisibilityHandler);
    }
  }

  ngOnDestroy(): void {
    this.stopTimer();
    if (this.isBrowser) {
      document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
    }
  }

  private handleVisibilityChange(): void {
    if (document.hidden) {
      this.stopTimer();
    } else {
      this.startTimer();
    }
  }

  private startTimer(): void {
    // Avoid multiple intervals
    if (this.intervalId) return;

    this.updateRemaining();
    this.intervalId = setInterval(() => this.updateRemaining(), 1000);
  }

  private stopTimer(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private updateRemaining(): void {
    if (!this.booking.start_at) {
      this.remainingMs.set(0);
      return;
    }

    const startDate = new Date(this.booking.start_at);
    const now = new Date();
    const remaining = Math.max(0, startDate.getTime() - now.getTime());
    this.remainingMs.set(remaining);

    // Stop timer if reached zero
    if (remaining <= 0) {
      this.stopTimer();
    }
  }

  toggleChecklistItem(itemId: string): void {
    this.checklist.update((items) =>
      items.map((item) => (item.id === itemId ? { ...item, checked: !item.checked } : item)),
    );
    this.saveChecklistState();
  }

  private loadChecklistState(): void {
    if (!this.isBrowser) return; // SSR Safe
    try {
      const key = `pretrip-checklist-${this.booking.id}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const checkedIds = JSON.parse(saved) as string[];
        this.checklist.update((items) =>
          items.map((item) => ({
            ...item,
            checked: checkedIds.includes(item.id),
          })),
        );
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  private saveChecklistState(): void {
    if (!this.isBrowser) return; // SSR Safe
    try {
      const key = `pretrip-checklist-${this.booking.id}`;
      const checkedIds = this.checklist()
        .filter((item) => item.checked)
        .map((item) => item.id);
      localStorage.setItem(key, JSON.stringify(checkedIds));
    } catch {
      // Ignore localStorage errors
    }
  }

  openMaps(): void {
    const { car_city, car_province } = this.booking;
    if (car_city && car_province) {
      const location = encodeURIComponent(`${car_city}, ${car_province}, Argentina`);
      window.open(`https://www.google.com/maps/search/?api=1&query=${location}`, '_blank');
    }
  }

  private async fetchWeather(): Promise<void> {
    const { car_city } = this.booking;
    if (!car_city) {
      return;
    }

    this.loadingWeather.set(true);

    try {
      // Use Open-Meteo API (free, no API key required)
      // First geocode the city
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(car_city)}&count=1&language=es&format=json`;
      const geoRes = await fetch(geoUrl);
      const geoData = await geoRes.json();

      if (!geoData.results?.[0]) {
        return;
      }

      const { latitude, longitude } = geoData.results[0];

      // Get weather forecast
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=America/Argentina/Buenos_Aires`;
      const weatherRes = await fetch(weatherUrl);
      const weatherData = await weatherRes.json();

      if (weatherData.current) {
        const temp = Math.round(weatherData.current.temperature_2m);
        const code = weatherData.current.weather_code;

        this.weather.set({
          temperature: temp,
          description: this.getWeatherDescription(code),
          icon: this.getWeatherIcon(code),
        });
      }
    } catch (error) {
      console.error('Failed to fetch weather:', error);
    } finally {
      this.loadingWeather.set(false);
    }
  }

  private getWeatherDescription(code: number): string {
    // WMO Weather interpretation codes
    const descriptions: Record<number, string> = {
      0: 'Despejado',
      1: 'Mayormente despejado',
      2: 'Parcialmente nublado',
      3: 'Nublado',
      45: 'Niebla',
      48: 'Niebla helada',
      51: 'Llovizna ligera',
      53: 'Llovizna moderada',
      55: 'Llovizna densa',
      61: 'Lluvia ligera',
      63: 'Lluvia moderada',
      65: 'Lluvia fuerte',
      71: 'Nieve ligera',
      73: 'Nieve moderada',
      75: 'Nieve fuerte',
      80: 'Chubascos ligeros',
      81: 'Chubascos moderados',
      82: 'Chubascos violentos',
      95: 'Tormenta',
      96: 'Tormenta con granizo ligero',
      99: 'Tormenta con granizo fuerte',
    };
    return descriptions[code] ?? 'Variable';
  }

  private getWeatherIcon(code: number): string {
    // Map WMO codes to emoji
    if (code === 0) return '☀️';
    if (code <= 3) return '⛅';
    if (code <= 48) return '🌫️';
    if (code <= 55) return '🌧️';
    if (code <= 65) return '🌧️';
    if (code <= 75) return '❄️';
    if (code <= 82) return '🌦️';
    if (code >= 95) return '⛈️';
    return '🌤️';
  }
}
