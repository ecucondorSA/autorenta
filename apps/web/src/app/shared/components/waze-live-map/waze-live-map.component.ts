import { LoggerService } from '@core/services/infrastructure/logger.service';
import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  inject,
  PLATFORM_ID,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

export interface WazeMapOptions {
  lat: number;
  lng: number;
  zoom?: number; // 1-20, default 12
  showPin?: boolean; // Show pin at location
  navigate?: boolean; // Auto-start navigation
}

/**
 * Waze Live Map Component
 *
 * Embeds Waze Live Map with real-time traffic data
 *
 * Features:
 * - Real-time traffic visualization
 * - Community-reported incidents (accidents, police, hazards)
 * - Road closures and construction
 * - Interactive map (zoom, pan)
 * - 100% FREE (no API key required)
 *
 * Benefits over Mapbox:
 * - Real-time traffic from Waze community
 * - Police/accident/hazard alerts
 * - More accurate traffic for Argentina
 * - Shows construction and road closures
 *
 * Usage:
 * ```html
 * <app-waze-live-map
 *   [lat]="-34.6037"
 *   [lng]="-58.3816"
 *   [zoom]="14"
 *   [showPin]="true">
 * </app-waze-live-map>
 * ```
 */
@Component({
  selector: 'app-waze-live-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="waze-live-map-container relative w-full h-full">
      <!-- Loading State -->
      @if (isLoading()) {
        <div class="absolute inset-0 flex items-center justify-center bg-surface-base z-10">
          <div class="text-center space-y-3">
            <svg
              class="animate-spin h-10 w-10 text-cta-default mx-auto"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <p class="text-text-secondary text-sm">Cargando mapa de Waze...</p>
          </div>
        </div>
      }

      <!-- Waze Live Map Iframe -->
      @if (wazeMapUrl()) {
        <iframe
          [src]="wazeMapUrl()"
          (load)="onMapLoad()"
          class="w-full h-full border-0 rounded-lg"
          [class.hidden]="isLoading()"
          title="Mapa de tráfico en tiempo real - Waze"
          allow="geolocation"
          loading="lazy"
        ></iframe>
      }

      <!-- Error State -->
      @if (hasError()) {
        <div class="absolute inset-0 flex items-center justify-center bg-surface-base">
          <div class="text-center space-y-3 p-6">
            <svg
              class="h-12 w-12 text-error mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p class="text-text-primary font-medium">Error al cargar el mapa de Waze</p>
            <p class="text-text-secondary text-sm">
              Por favor, verifica tu conexión e intenta nuevamente
            </p>
          </div>
        </div>
      }

      <!-- Waze Branding Badge -->
      <div
        class="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg px-3 py-2 flex items-center gap-2 z-20"
      >
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="#33CCFF">
          <path
            d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z"
          />
          <path
            d="M12 6c-3.3 0-6 2.7-6 6s2.7 6 6 6 6-2.7 6-6-2.7-6-6-6zm0 10c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z"
          />
        </svg>
        <span class="text-xs font-semibold text-text-primary">Tráfico en tiempo real - Waze</span>
      </div>

      <!-- Info Badge (optional) -->
      @if (showInfoBadge) {
        <div
          class="absolute top-4 right-4 bg-cta-default text-cta-text rounded-lg shadow-lg px-3 py-2 text-xs font-medium z-20"
        >
          Datos de comunidad Waze
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }

      .waze-live-map-container {
        min-height: 400px;
      }

      iframe {
        display: block;
      }
    `,
  ],
})
export class WazeLiveMapComponent implements OnInit, OnChanges {
  private readonly logger = inject(LoggerService);
  @Input({ required: true }) lat!: number;
  @Input({ required: true }) lng!: number;
  @Input() zoom = 14; // Default zoom level
  @Input() showPin = true; // Show pin at location by default
  @Input() navigate = false; // Don't auto-navigate by default
  @Input() showInfoBadge = false; // Show info badge

  private readonly platformId = inject(PLATFORM_ID);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly isLoading = signal(true);
  readonly hasError = signal(false);

  readonly wazeMapUrl = computed<SafeResourceUrl | null>(() => {
    if (!this.isBrowser || !this.lat || !this.lng) {
      return null;
    }

    try {
      // Build Waze Live Map embed URL
      // Documentation: https://developers.google.com/waze/iframe
      const params = new URLSearchParams({
        zoom: this.zoom.toString(),
        lat: this.lat.toString(),
        lon: this.lng.toString(), // Waze uses 'lon' not 'lng'
      });

      // Add pin if requested
      if (this.showPin) {
        params.append('pin', '1');
      }

      // Add navigate if requested
      if (this.navigate) {
        params.append('navigate', 'yes');
      }

      const url = `https://embed.waze.com/iframe?${params.toString()}`;

      return this.sanitizer.bypassSecurityTrustResourceUrl(url);
    } catch (error) {
      console.error('[WazeLiveMap] Error building Waze URL:', error);
      this.hasError.set(true);
      return null;
    }
  });

  ngOnInit(): void {
    if (!this.isBrowser) {
      this.isLoading.set(false);
      return;
    }

    // Validate inputs
    if (!this.lat || !this.lng) {
      console.warn('[WazeLiveMap] Missing required lat/lng coordinates');
      this.hasError.set(true);
      this.isLoading.set(false);
    }

    // Set timeout for loading state (fallback if iframe doesn't load)
    setTimeout(() => {
      if (this.isLoading()) {
        console.warn('[WazeLiveMap] Map load timeout');
        this.isLoading.set(false);
      }
    }, 10000); // 10 second timeout
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Reset loading state when inputs change
    if (
      (changes['lat'] && !changes['lat'].firstChange) ||
      (changes['lng'] && !changes['lng'].firstChange) ||
      (changes['zoom'] && !changes['zoom'].firstChange)
    ) {
      this.isLoading.set(true);
      this.hasError.set(false);
    }
  }

  onMapLoad(): void {
    this.isLoading.set(false);
    this.hasError.set(false);
    this.logger.debug('[WazeLiveMap] Map loaded successfully');
  }

  /**
   * Update map center coordinates
   * Useful for programmatic map updates
   */
  updateCenter(lat: number, lng: number): void {
    this.lat = lat;
    this.lng = lng;
    this.isLoading.set(true);
    this.hasError.set(false);
  }

  /**
   * Update zoom level
   */
  updateZoom(zoom: number): void {
    this.zoom = Math.max(1, Math.min(20, zoom)); // Clamp between 1-20
    this.isLoading.set(true);
  }
}
