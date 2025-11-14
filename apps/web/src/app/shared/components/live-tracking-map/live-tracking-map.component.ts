import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ViewChild,
  ElementRef,
  signal,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { TrackingSession } from '@core/services/location-tracking.service';
import mapboxgl from 'mapbox-gl';
import { environment } from '../../../../environments/environment';

interface MarkerData {
  marker: mapboxgl.Marker;
  session: TrackingSession;
}

@Component({
  selector: 'app-live-tracking-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="live-tracking-map-container">
      <div #mapContainer class="map-canvas"></div>

      <!-- Loading overlay -->
      <div *ngIf="loading()" class="map-overlay loading-overlay">
        <div class="spinner"></div>
        <p>Cargando mapa de tracking...</p>
      </div>

      <!-- Error overlay -->
      <div *ngIf="error() && !loading()" class="map-overlay error-overlay">
        <div class="error-content">
          <svg class="error-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p class="error-message">{{ error() }}</p>
        </div>
      </div>

      <!-- Stats overlay -->
      <div *ngIf="!loading() && !error() && trackingSessions.length > 0" class="stats-overlay">
        <div *ngFor="let session of trackingSessions" class="tracking-user">
          <img
            [src]="session.user_photo || 'assets/default-avatar.png'"
            [alt]="session.user_name"
            class="user-avatar"
          />
          <div class="user-info">
            <p class="user-name">{{ session.user_name }}</p>
            <p class="user-role">
              {{ session.user_role === 'locador' ? 'Propietario' : 'Arrendatario' }}
            </p>
            <p class="last-update">📍 Actualizado hace {{ getTimeSince(session.last_updated) }}</p>
            <p *ngIf="session.distance_remaining" class="distance">
              🚗 A {{ formatDistance(session.distance_remaining) }}
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .live-tracking-map-container {
        position: relative;
        width: 100%;
        height: 100%;
        min-height: 400px;
        border-radius: 12px;
        overflow: hidden;
      }

      .map-canvas {
        width: 100%;
        height: 100%;
        min-height: 400px;
      }

      .map-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.95);
        z-index: 1000;
      }

      .loading-overlay {
        flex-direction: column;
        gap: 16px;
      }

      .spinner {
        width: 48px;
        height: 48px;
        border: 4px solid #e2e8f0;
        border-top-color: var(--cta-default, #805ad5);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .error-overlay {
        background: rgba(254, 242, 242, 0.95);
      }

      .error-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 24px;
        text-align: center;
      }

      .error-icon {
        width: 48px;
        height: 48px;
        color: #dc2626;
      }

      .error-message {
        color: #dc2626;
        font-weight: 600;
        max-width: 300px;
      }

      .stats-overlay {
        position: absolute;
        top: 16px;
        left: 16px;
        background: white;
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        z-index: 100;
        max-width: 280px;
      }

      .tracking-user {
        display: flex;
        gap: 12px;
        padding: 12px 0;
        border-bottom: 1px solid #e2e8f0;
      }

      .tracking-user:last-child {
        border-bottom: none;
        padding-bottom: 0;
      }

      .tracking-user:first-child {
        padding-top: 0;
      }

      .user-avatar {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid var(--cta-default, #805ad5);
      }

      .user-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .user-name {
        font-weight: 600;
        font-size: 14px;
        color: #0f172a;
        margin: 0;
      }

      .user-role {
        font-size: 12px;
        color: #64748b;
        margin: 0;
      }

      .last-update,
      .distance {
        font-size: 11px;
        color: #475569;
        margin: 0;
      }

      @media (max-width: 768px) {
        .stats-overlay {
          max-width: 240px;
          padding: 12px;
        }

        .user-avatar {
          width: 40px;
          height: 40px;
        }
      }
    `,
  ],
})
export class LiveTrackingMapComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;

  @Input() trackingSessions: TrackingSession[] = [];
  @Input() destinationLat?: number;
  @Input() destinationLng?: number;
  @Input() destinationLabel?: string = 'Punto de encuentro';

  private platformId = inject(PLATFORM_ID);
  private map: mapboxgl.Map | null = null;
  private markers: Map<string, MarkerData> = new Map();
  private destinationMarker: mapboxgl.Marker | null = null;

  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeMap();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['trackingSessions'] && !changes['trackingSessions'].firstChange) {
      this.updateMarkers();
    }

    if (
      (changes['destinationLat'] || changes['destinationLng']) &&
      this.destinationLat !== undefined &&
      this.destinationLng !== undefined
    ) {
      this.updateDestinationMarker();
    }
  }

  ngOnDestroy(): void {
    this.cleanupMarkers();
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private async initializeMap(): Promise<void> {
    try {
      if (!environment.mapboxAccessToken) {
        throw new Error('Mapbox access token is missing');
      }

      mapboxgl.accessToken = environment.mapboxAccessToken;

      // Default center (will be updated when markers are added)
      const center: [number, number] = [-58.3816, -34.6037]; // Buenos Aires default

      this.map = new mapboxgl.Map({
        container: this.mapContainer.nativeElement,
        style: 'mapbox://styles/mapbox/streets-v12',
        center,
        zoom: 12,
        attributionControl: true,
      });

      this.map.on('load', () => {
        this.loading.set(false);
        this.updateMarkers();
        this.updateDestinationMarker();
        this.fitMapBounds();
      });

      this.map.on('error', (e) => {
        console.error('[LiveTrackingMap] Map error:', e);
        this.error.set('Error al cargar el mapa. Por favor, intenta de nuevo.');
        this.loading.set(false);
      });
    } catch (err) {
      console.error('[LiveTrackingMap] Initialization error:', err);
      this.error.set('No se pudo inicializar el mapa');
      this.loading.set(false);
    }
  }

  private updateMarkers(): void {
    if (!this.map) return;

    // Remove markers for sessions that no longer exist
    const currentSessionIds = new Set(this.trackingSessions.map((s) => s.tracking_id));
    for (const [trackingId, markerData] of this.markers.entries()) {
      if (!currentSessionIds.has(trackingId)) {
        markerData.marker.remove();
        this.markers.delete(trackingId);
      }
    }

    // Update or create markers for each tracking session
    for (const session of this.trackingSessions) {
      const existingMarker = this.markers.get(session.tracking_id);

      if (existingMarker) {
        // Update existing marker position
        existingMarker.marker.setLngLat([Number(session.longitude), Number(session.latitude)]);
        existingMarker.session = session;
      } else {
        // Create new marker
        const markerElement = this.createMarkerElement(session);
        const marker = new mapboxgl.Marker({ element: markerElement })
          .setLngLat([Number(session.longitude), Number(session.latitude)])
          .addTo(this.map);

        this.markers.set(session.tracking_id, { marker, session });
      }
    }

    // Fit map bounds to show all markers
    this.fitMapBounds();
  }

  private createMarkerElement(session: TrackingSession): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'live-tracking-marker';
    el.style.cssText = `
      width: 56px;
      height: 56px;
      position: relative;
      cursor: pointer;
    `;

    // Avatar
    const avatar = document.createElement('img');
    avatar.src = session.user_photo || 'assets/default-avatar.png';
    avatar.alt = session.user_name;
    avatar.style.cssText = `
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: 3px solid ${session.user_role === 'locador' ? '#805ad5' : '#10b981'};
      object-fit: cover;
      position: absolute;
      top: 4px;
      left: 4px;
      background: white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    `;
    el.appendChild(avatar);

    // Pulse ring animation
    const pulseRing = document.createElement('div');
    pulseRing.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 56px;
      height: 56px;
      border: 2px solid ${session.user_role === 'locador' ? '#805ad5' : '#10b981'};
      border-radius: 50%;
      animation: pulse 2s ease-out infinite;
      opacity: 0.6;
    `;
    el.appendChild(pulseRing);

    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% {
          transform: scale(0.8);
          opacity: 0.8;
        }
        100% {
          transform: scale(1.4);
          opacity: 0;
        }
      }
    `;
    el.appendChild(style);

    return el;
  }

  private updateDestinationMarker(): void {
    if (!this.map || this.destinationLat === undefined || this.destinationLng === undefined) return;

    // Remove existing destination marker
    if (this.destinationMarker) {
      this.destinationMarker.remove();
    }

    // Create destination marker
    const el = document.createElement('div');
    el.className = 'destination-marker';
    el.style.cssText = `
      width: 40px;
      height: 40px;
      background: #dc2626;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      cursor: pointer;
      position: relative;
    `;

    // Inner circle
    const inner = document.createElement('div');
    inner.style.cssText = `
      width: 16px;
      height: 16px;
      background: white;
      border-radius: 50%;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    `;
    el.appendChild(inner);

    this.destinationMarker = new mapboxgl.Marker({ element: el })
      .setLngLat([this.destinationLng, this.destinationLat])
      .setPopup(
        new mapboxgl.Popup({ offset: 25 }).setHTML(
          `<div style="padding: 8px;">
            <strong>${this.destinationLabel}</strong>
          </div>`,
        ),
      )
      .addTo(this.map);

    this.fitMapBounds();
  }

  private fitMapBounds(): void {
    if (!this.map) return;

    const bounds = new mapboxgl.LngLatBounds();
    let hasPoints = false;

    // Add tracking session coordinates
    for (const session of this.trackingSessions) {
      bounds.extend([Number(session.longitude), Number(session.latitude)]);
      hasPoints = true;
    }

    // Add destination coordinates
    if (this.destinationLat !== undefined && this.destinationLng !== undefined) {
      bounds.extend([this.destinationLng, this.destinationLat]);
      hasPoints = true;
    }

    // Fit bounds if we have at least one point
    if (hasPoints) {
      this.map.fitBounds(bounds, {
        padding: { top: 80, bottom: 80, left: 80, right: 80 },
        maxZoom: 15,
        duration: 1000,
      });
    }
  }

  private cleanupMarkers(): void {
    // Remove all tracking markers
    for (const markerData of this.markers.values()) {
      markerData.marker.remove();
    }
    this.markers.clear();

    // Remove destination marker
    if (this.destinationMarker) {
      this.destinationMarker.remove();
      this.destinationMarker = null;
    }
  }

  // ============================================================================
  // PUBLIC HELPER METHODS
  // ============================================================================

  /**
   * Format time since last update
   */
  getTimeSince(timestamp: string): string {
    const now = new Date();
    const lastUpdate = new Date(timestamp);
    const diffMs = now.getTime() - lastUpdate.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);

    if (diffSeconds < 10) return 'hace un momento';
    if (diffSeconds < 60) return `${diffSeconds} seg`;

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes} min`;

    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours} h`;
  }

  /**
   * Format distance in human-readable format
   */
  formatDistance(meters: number): string {
    const distance = Number(meters);
    if (distance < 1000) {
      return `${Math.round(distance)} m`;
    }
    return `${(distance / 1000).toFixed(1)} km`;
  }
}
