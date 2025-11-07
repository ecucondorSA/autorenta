import {
  Component,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  signal,
  effect,
  inject,
  PLATFORM_ID,
  ElementRef,
  ViewChild,
  AfterViewInit,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { toSignal } from '@angular/core/rxjs-interop';
import type mapboxgl from 'mapbox-gl';
import { CarLocationsService, CarMapLocation } from '../../../core/services/car-locations.service';
import { DynamicPricingService } from '../../../core/services/dynamic-pricing.service';
import { injectSupabase } from '../../../core/services/supabase-client.service';
import { environment } from '../../../../environments/environment';

// Type imports (these don't increase bundle size)

type LngLatLike = [number, number] | { lng: number; lat: number };

/**
 * CarsMapComponent - Displays cars on an interactive map using Mapbox GL
 * 
 * IMPORTANT: Mapbox Token Configuration
 * =====================================
 * This component requires a Mapbox access token to function properly.
 * 
 * Development:
 * - Add to .env.local: NG_APP_MAPBOX_ACCESS_TOKEN=pk.ey...
 * 
 * Production:
 * - Set environment variable: NG_APP_MAPBOX_ACCESS_TOKEN=pk.ey...
 * - Or configure in your deployment platform (Cloudflare Pages, Vercel, etc.)
 * 
 * Without a valid token, the map will display an error message instructing
 * the administrator to configure it.
 */

@Component({
  standalone: true,
  selector: 'app-cars-map',
  imports: [CommonModule, TranslateModule],
  templateUrl: './cars-map.component.html',
  styleUrls: ['./cars-map.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarsMapComponent implements OnChanges, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;

  @Input() cars: CarMapLocation[] = [];
  @Input() selectedCarId: string | null = null;
  @Output() carSelected = new EventEmitter<string>();
  @Output() userLocationChange = new EventEmitter<{ lat: number; lng: number }>();

  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private readonly carLocationsService = inject(CarLocationsService);
  private readonly pricingService = inject(DynamicPricingService);
  private readonly supabase = injectSupabase();

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly carCount = signal(0);
  readonly userLocation = signal<{ lat: number; lng: number } | null>(null);

  private map: mapboxgl.Map | null = null;
  private userMarker: mapboxgl.Marker | null = null;
  private selectedPopup: mapboxgl.Popup | null = null;
  private carMarkersMap: Map<string, mapboxgl.Marker> = new Map();
  private mapboxgl: typeof mapboxgl | null = null;
  private lastCarsJson: string = ''; // Para evitar updates redundantes
  private markerPhotoTimers = new Map<string, number>();

  // Clustering & pricing cache
  private clusteringEnabled = false;
  private readonly CLUSTER_THRESHOLD = 30; // activar clustering a partir de 30 autos
  private pricingCache: Map<string, { price: number; timestamp: number; currency: string }> = new Map();
  private readonly PRICING_CACHE_TTL = 5 * 60 * 1000; // 5 minutos
  private loadingPrices = false; // Flag to prevent concurrent batch loads

  // Distance calculation
  private readonly EARTH_RADIUS_KM = 6371;
  private userLocationForDistance: { lat: number; lng: number } | null = null;

  constructor() {
    effect(() => {
      if (this.selectedCarId) {
        this.flyToCarLocation(this.selectedCarId);
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cars'] && this.map) {
      // Solo actualizar si realmente cambió el contenido
      const currentJson = JSON.stringify(this.cars);
      if (currentJson !== this.lastCarsJson) {
        console.log('🔄 Cars changed, updating markers');
        this.lastCarsJson = currentJson;
        this.updateMarkers(this.cars);
      } else {
        console.log('⏭️ Cars unchanged, skipping update');
      }
    }
  }

  async ngAfterViewInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      await this.initializeMap();
    }
  }

  ngOnDestroy(): void {
    // Clean up all car markers
    this.carMarkersMap.forEach(marker => marker.remove());
    this.carMarkersMap.clear();
    this.clearAllPhotoRotations();
    
    // Clean up user marker
    this.userMarker?.remove();
    this.userMarker = null;
    
    // Clean up popup
    this.selectedPopup?.remove();
    this.selectedPopup = null;
    
    // Clean up map
    this.map?.remove();
    this.map = null;
  }

  private async initializeMap(): Promise<void> {
    if (!this.mapContainer) {
      console.error('❌ Map container no disponible');
      return;
    }

    if (!environment.mapboxAccessToken) {
      console.error('❌ Token de Mapbox no encontrado en environment');
      this.error.set('Token de Mapbox no configurado');
      this.loading.set(false);
      return;
    }

    try {
      console.log('🗺️ Inicializando mapa con lazy loading...');

      // Lazy load Mapbox GL (only imported at runtime, not in initial bundle)
      const mapboxModule = await import('mapbox-gl');
      const mapboxgl = mapboxModule.default;
      this.mapboxgl = mapboxgl;

      mapboxgl.accessToken = environment.mapboxAccessToken;

      // Argentina bounds to prevent showing too much ocean
      const argentinaBounds: mapboxgl.LngLatBoundsLike = [
        [-73.5, -55.0], // Southwest (Tierra del Fuego west)
        [-53.5, -21.8], // Northeast (Misiones northeast)
      ];

      this.map = new mapboxgl.Map({
        container: this.mapContainer.nativeElement,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [-56.1645, -34.9011],
        zoom: 12,
        pitch: 45,
        bearing: -17.6,
        maxBounds: argentinaBounds,
        minZoom: 5,
        maxZoom: 18,
      });

      this.map.on('load', () => {
        console.log('✅ Mapa cargado exitosamente');
        this.loading.set(false);
        this.updateMarkers(this.cars);
        this.requestUserLocation();
        this.addGeolocateButton();

        // Load dynamic prices for initial viewport
        this.loadDynamicPricesForViewport();
      });

      // Load dynamic prices when user moves/zooms the map
      this.map.on('moveend', () => {
        this.loadDynamicPricesForViewport();
      });

      this.map.on('error', (e: unknown) => {
        console.error('❌ Error en el mapa:', e);
        this.error.set('Error al cargar el mapa: ' + ((e as any).error?.message || 'Error desconocido'));
        this.loading.set(false);
      });
    } catch (err: unknown) {
      console.error('❌ Error inicializando mapa:', err);
      this.error.set('Error al inicializar el mapa: ' + (err as Error).message);
      this.loading.set(false);
    }
  }

  private updateMarkers(locations: CarMapLocation[]): void {
    if (!this.map) {
      console.warn('⚠️ Mapa no disponible para actualizar markers');
      return;
    }

    console.log('📍 Actualizando markers:', locations.length, 'autos');
    console.log('📍 Locations data:', locations);
    this.carCount.set(locations.length);

    // Crear Set de IDs actuales para comparar
    const currentCarIds = new Set(locations.map(loc => loc.carId));
    
    // Eliminar markers que ya no existen
    this.carMarkersMap.forEach((marker, carId) => {
      if (!currentCarIds.has(carId)) {
        console.log('🗑️ Eliminando marker:', carId);
        marker.remove();
        this.clearPhotoRotation(carId);
        this.carMarkersMap.delete(carId);
      }
    });

    // Si hay muchos autos, usar clustering con layers (mejor performance)
    if (locations.length >= this.CLUSTER_THRESHOLD) {
      this.clusteringEnabled = true;
      // Limpiar markers HTML existentes
      this.carMarkersMap.forEach((m) => m.remove());
      this.carMarkersMap.clear();
      this.clearAllPhotoRotations();
      this.addOrUpdateClusterLayers(locations);
      console.log('🧩 Clustering activado:', locations.length, 'autos');
      return;
    }

    // Si no, usar markers HTML (estilo con foto + precio)
    this.removeClusterLayers();
    this.clusteringEnabled = false;

    // Agregar o actualizar markers HTML
    locations.forEach((location, index) => {
      console.log(`🚗 Procesando auto ${index + 1}:`, {
        carId: location.carId,
        lat: location.lat,
        lng: location.lng,
        photoUrl: location.photoUrl,
        price: location.pricePerDay
      });

      if (!location.lat || !location.lng) {
        console.warn('⚠️ Auto sin coordenadas:', location);
        return;
      }

      // Si el marker ya existe, no recrearlo
      if (this.carMarkersMap.has(location.carId)) {
        console.log('✓ Marker ya existe:', location.carId);
        return;
      }

      // Create custom photo marker
      const el = this.createPhotoMarker(location);
      
      console.log('✅ Marker creado para:', location.carId);
      
      // Add click handler
      el.addEventListener('click', () => {
        this.carSelected.emit(location.carId);
        this.animateMarkerBounce(el);
      });

      const map = this.map;
      if (!map || !this.mapboxgl) return;
      const popup = this.buildPopup(location);
      const marker = new this.mapboxgl.Marker(el)
        .setLngLat([location.lng, location.lat] as LngLatLike)
        .setPopup(popup)
        .addTo(map);
      
      // Make popup image clickable to navigate to car detail
      popup.on('open', () => {
        const popupElement = popup.getElement();
        if (popupElement) {
          const popupImage = popupElement.querySelector('.car-popup-image') as HTMLElement;
          if (popupImage) {
            popupImage.style.cursor = 'pointer';
            const handleImageClick = () => {
              if (this.map) {
                this.map.flyTo({
                  center: [location.lng, location.lat],
                  zoom: 16,
                  duration: 1000,
                  essential: true,
                });
              }
              setTimeout(() => {
                this.router.navigate(['/cars', location.carId]);
              }, 2000);
            };
            popupImage.addEventListener('click', handleImageClick);
          }
        }
      });
      
      console.log('✅ Marker agregado al mapa:', location.carId);
      
      // Keep reference for cleanup using carId as key
      this.carMarkersMap.set(location.carId, marker);
    });
    
    console.log('📍 Total markers en mapa:', this.carMarkersMap.size);
  }

  private addOrUpdateClusterLayers(locations: CarMapLocation[]): void {
    if (!this.map) return;

    const geojsonData: GeoJSON.FeatureCollection<GeoJSON.Point> = {
      type: 'FeatureCollection',
      features: locations.map((loc) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [loc.lng, loc.lat],
        },
        properties: {
          carId: loc.carId,
          title: loc.title,
          price: Math.round(loc.pricePerDay),
          photoUrl: loc.photoUrl || '',
          currency: loc.currency || 'ARS',
        },
      })) as any,
    };

    const source = this.map.getSource('cars') as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData(geojsonData as any);
    } else {
      this.map.addSource('cars', {
        type: 'geojson',
        data: geojsonData as any,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      } as any);

      this.map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'cars',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': ['step', ['get', 'point_count'], '#2c4a52', 10, '#8b7355', 50, '#ffb400'],
          'circle-radius': ['step', ['get', 'point_count'], 18, 10, 24, 50, 30],
        },
      } as any);

      this.map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'cars',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-size': 12,
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
        },
        paint: {
          'text-color': '#ffffff',
        },
      } as any);

      this.map.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'cars',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#2c4a52',
          'circle-radius': 7,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      } as any);

      // Click en cluster para expandir
      this.map.on('click', 'clusters', (e: mapboxgl.MapMouseEvent) => {
        const map = this.map;
        if (!map) return;
        const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        if (!features || features.length === 0) return;
        const clickedFeature = features[0];
        const properties = clickedFeature.properties;
        if (!properties || !properties.cluster_id) return;
        const clusterId = properties.cluster_id;
        const source = map.getSource('cars') as any;
        if (!source) return;
        source.getClusterExpansionZoom(
          clusterId,
          (err: unknown, zoom: number) => {
            if (err) return;
            const coords = (clickedFeature.geometry as GeoJSON.Point).coordinates;
            if (coords && coords.length >= 2) {
              map.easeTo({ center: coords as [number, number], zoom });
            }
          },
        );
      });

      // Popup para puntos individuales
      this.map.on('click', 'unclustered-point', (e: mapboxgl.MapMouseEvent) => {
        const map = this.map;
        if (!map || !e.features || !e.features[0]) return;
        const f = e.features[0];
        const coords = (f.geometry as GeoJSON.Point).coordinates.slice();
        const props = f.properties;
        if (!props) return;
        const carLocation: CarMapLocation = {
          carId: props.carId,
          title: props.title,
          pricePerDay: Number(props.price),
          currency: props.currency,
          lat: coords[1],
          lng: coords[0],
          updatedAt: new Date().toISOString(),
          locationLabel: '',
          photoUrl: props.photoUrl,
          description: '',
        } as any;
        const popup = this.buildPopup(carLocation);
        popup.setLngLat(coords as [number, number]).addTo(map);
        
        // Make popup image clickable to navigate to car detail
        popup.on('open', () => {
          const popupElement = popup.getElement();
          if (popupElement) {
            const popupImage = popupElement.querySelector('.car-popup-image') as HTMLElement;
            if (popupImage) {
              popupImage.style.cursor = 'pointer';
              const handleImageClick = () => {
                if (this.map) {
                  this.map.flyTo({
                    center: [carLocation.lng, carLocation.lat],
                    zoom: 16,
                    duration: 1000,
                    essential: true,
                  });
                }
                setTimeout(() => {
                  this.router.navigate(['/cars', carLocation.carId]);
                }, 2000);
              };
              popupImage.addEventListener('click', handleImageClick);
            }
          }
        });
      });
    }
  }

  private removeClusterLayers(): void {
    const map = this.map;
    if (!map) return;
    const layers = ['unclustered-point', 'cluster-count', 'clusters'];
    layers.forEach((id) => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    if (map.getSource('cars')) map.removeSource('cars');
  }

  /**
   * Get cars visible in current map viewport
   */
  private getVisibleCars(): CarMapLocation[] {
    if (!this.map) return [];

    const bounds = this.map.getBounds();
    if (!bounds) return [];

    return this.cars.filter((car) => {
      return (
        car.lng >= bounds.getWest() &&
        car.lng <= bounds.getEast() &&
        car.lat >= bounds.getSouth() &&
        car.lat <= bounds.getNorth()
      );
    });
  }

  /**
   * Load dynamic prices for cars in current viewport (batch optimization)
   */
  private async loadDynamicPricesForViewport(): Promise<void> {
    if (this.loadingPrices) return; // Prevent concurrent loads

    try {
      this.loadingPrices = true;

      const visibleCars = this.getVisibleCars();
      console.log('💰 [Pricing] Visible cars in viewport:', visibleCars.length);
      if (visibleCars.length === 0) return;

      // Group by region and filter out cars that need price updates
      const regionMap = new Map<string, CarMapLocation[]>();
      const carsNeedingPrices: CarMapLocation[] = [];

      for (const car of visibleCars) {
        // ✅ FIX: Solo considerar precios en caché si realmente existen (no usar estáticos)
        const cached = this.pricingCache.get(car.carId);
        const isCacheValid = cached && Date.now() - cached.timestamp < this.PRICING_CACHE_TTL;
        
        // Si no hay precio dinámico en caché, agregarlo a la lista de carros que necesitan precios
        if (!isCacheValid && car.regionId) {
          carsNeedingPrices.push(car);

          if (!regionMap.has(car.regionId)) {
            regionMap.set(car.regionId, []);
          }
          regionMap.get(car.regionId)!.push(car);
        }
      }

      console.log('💰 [Pricing] Cars needing prices:', carsNeedingPrices.length);
      console.log('💰 [Pricing] Sample car regionIds:', carsNeedingPrices.slice(0, 3).map(c => ({ carId: c.carId, regionId: c.regionId })));

      if (carsNeedingPrices.length === 0) {
        console.log('💰 [Pricing] All prices are cached with dynamic prices');
        return; // All prices are cached and are dynamic
      }

      // Get unique region IDs
      const regionIds = Array.from(regionMap.keys());
      console.log('💰 [Pricing] Fetching prices for regions:', regionIds);

      // Get user ID for pricing calculation
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      const userId = user?.id || '00000000-0000-0000-0000-000000000000';

      // Call batch pricing RPC
      console.log('💰 [Pricing] Calling batch RPC...');
      const pricesMap = await this.pricingService.calculateBatchPricesRPC(
        regionIds,
        userId,
        new Date().toISOString(),
        24 // 24 hours for daily price
      );
      console.log('💰 [Pricing] Received prices for regions:', pricesMap.size);

      // Update cache and markers
      let updatedCount = 0;
      for (const car of carsNeedingPrices) {
        if (car.regionId) {
          const pricingResult = pricesMap.get(car.regionId);

          if (pricingResult) {
            console.log(`💰 [Pricing] Updating car ${car.carId} with dynamic price: ${pricingResult.total_price} ${pricingResult.currency}`);

            // Update cache
            this.pricingCache.set(car.carId, {
              price: pricingResult.total_price,
              timestamp: Date.now(),
              currency: pricingResult.currency,
            });

            // Update marker if it exists
            this.updateMarkerPrice(car.carId, pricingResult.total_price, pricingResult.currency);
            updatedCount++;
          } else {
            console.warn(`💰 [Pricing] No price found for region ${car.regionId}`);
          }
        }
      }
      console.log(`💰 [Pricing] Updated ${updatedCount} markers with dynamic prices`);
    } catch (_error) {
      // Silent fallback - markers will show static prices
      console.error('❌ [Pricing] Failed to load dynamic prices:', _error);
    } finally {
      this.loadingPrices = false;
    }
  }

  /**
   * Update a specific marker's displayed price
   */
  private updateMarkerPrice(carId: string, price: number, currency: string): void {
    const marker = this.carMarkersMap.get(carId);
    if (!marker) {
      console.warn(`💰 [Pricing] Marker not found for car ${carId}`);
      return;
    }

    const markerElement = marker.getElement();
    const priceSpan = markerElement?.querySelector('.car-marker-price');

    if (priceSpan) {
      const formattedPrice = new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: currency || 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(price);

      console.log(`💰 [Pricing] Updating marker ${carId}: ${priceSpan.textContent} → ${formattedPrice}`);
      priceSpan.textContent = formattedPrice;
    } else {
      console.warn(`💰 [Pricing] Price span not found for car ${carId} (may be showing distance instead)`);
    }

    // ✅ FIX: Also update the popup price if it's open
    const popup = marker.getPopup();
    if (popup && popup.isOpen()) {
      const popupElement = popup.getElement();
      if (popupElement) {
        const popupPriceElement = popupElement.querySelector('.car-popup-price');
        if (popupPriceElement) {
          const formattedPrice = new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: currency || 'ARS',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(price);
          
          popupPriceElement.textContent = `${formattedPrice}/día`;
          console.log(`💰 [Pricing] Updated popup price for car ${carId}`);
        }
      }
    }

    // ✅ FIX: Update popup content for next time it opens
    // Find the location data to rebuild popup
    const location = this.cars.find(loc => loc.carId === carId);
    if (location) {
      // Create updated location with dynamic price
      const updatedLocation = { ...location, pricePerDay: price };
      const newPopup = this.buildPopup(updatedLocation);
      marker.setPopup(newPopup);
    }
  }

  /**
   * Get cached dynamic price only (no static fallback)
   * Returns null if no dynamic price is available
   */
  private getCachedDynamicPrice(carId: string): {
    price: number;
    currency: string;
  } | null {
    const cached = this.pricingCache.get(carId);

    if (cached && Date.now() - cached.timestamp < this.PRICING_CACHE_TTL) {
      return { price: cached.price, currency: cached.currency };
    }

    return null; // ✅ NO mostrar precio estático, solo esperar precio dinámico
  }

  private buildPopup(location: CarMapLocation): mapboxgl.Popup {
    // ✅ FIX: Solo mostrar precio dinámico, no precio estático
    const cachedPrice = this.getCachedDynamicPrice(location.carId);
    const fallbackPrice = location.pricePerDay ?? null;
    const fallbackCurrency = location.currency ?? 'ARS';
    
    let formattedPrice: string;
    if (cachedPrice) {
      formattedPrice = new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: cachedPrice.currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(cachedPrice.price);
    } else if (fallbackPrice) {
      formattedPrice = new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: fallbackCurrency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(fallbackPrice);
    } else {
      formattedPrice = '—';
    }

    const html = `
      <div class="car-popup-content">
        <div class="car-popup-image-wrapper">
          <img class="car-popup-image" src="${location.photoUrl || ''}" alt="${
      location.title
    }" onerror="this.style.display='none'; this.parentElement.style.background='#e5e7eb';" />
        </div>
        <div class="car-popup-info">
          <h4 class="car-popup-title">${location.title}</h4>
          <p class="car-popup-price">${formattedPrice}/día</p>
          ${location.locationLabel ? `<p>${location.locationLabel}</p>` : ''}
        </div>
      </div>
    `;

    if (!this.mapboxgl) {
      throw new Error('Mapbox not loaded');
    }
    const popup = new this.mapboxgl.Popup({ 
      closeButton: false, 
      className: 'car-popup',
      maxWidth: '75px' // Reducido 4x (antes 300px)
    }).setHTML(html);
    
    // Asegurar que el popup respete los límites del viewport SOLO en móvil
    if (typeof window !== 'undefined' && window.innerWidth <= 640) {
      popup.on('open', () => {
        setTimeout(() => {
          const popupElement = popup.getElement();
          if (popupElement) {
            const content = popupElement.querySelector('.mapboxgl-popup-content') as HTMLElement;
            if (content) {
              // Reducción 8x: máximo 37.5px (1/8 de 300px) o viewport - 12px
              const maxWidth = Math.min(window.innerWidth - 12, 37.5);
              content.style.maxWidth = `${maxWidth}px`;
              content.style.width = 'auto';
            }
          }
        }, 0);
      });
    }
    
    return popup;
  }

  private addGeolocateButton(): void {
    if (!this.map || !this.mapContainer) return;
    const button = document.createElement('button');
    button.className = 'mapbox-ctrl-geolocate';
    button.setAttribute('aria-label', 'Centrar en mi ubicación');
    button.style.position = 'absolute';
    button.style.right = '10px';
    button.style.top = '10px'; // Movido hacia arriba
    button.style.zIndex = '10';
    button.style.width = '36px';
    button.style.height = '36px';
    button.style.borderRadius = '6px';
    button.style.border = '1px solid rgba(0,0,0,0.1)';
    button.style.background = '#fff';
    button.style.color = '#222';
    button.style.cursor = 'pointer';
    button.style.transition = 'all 0.2s ease';
    button.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
    
    // Detectar dark mode y aplicar estilos
    const isDarkMode = document.documentElement.classList.contains('dark');
    if (isDarkMode) {
      button.style.background = '#1e1e1e';
      button.style.borderColor = 'rgba(255, 255, 255, 0.2)';
      button.style.color = '#ffffff';
      button.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.4)';
    }
    
    // Observar cambios en dark mode
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark');
      if (isDark) {
        button.style.background = '#1e1e1e';
        button.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        button.style.color = '#ffffff';
        button.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.4)';
      } else {
        button.style.background = '#fff';
        button.style.borderColor = 'rgba(0, 0, 0, 0.1)';
        button.style.color = '#222';
        button.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
      }
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    button.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style="margin:8px"><circle cx="10" cy="10" r="2"/><path d="M10 2v6m0 4v6M2 10h6m4 0h6" stroke="currentColor" stroke-width="2"/></svg>';
    
    // Hover effects
    button.addEventListener('mouseenter', () => {
      const isDark = document.documentElement.classList.contains('dark');
      button.style.transform = 'scale(1.05)';
      if (isDark) {
        button.style.background = '#2a2a2a';
      } else {
        button.style.background = '#f8f9fa';
      }
    });
    
    button.addEventListener('mouseleave', () => {
      const isDark = document.documentElement.classList.contains('dark');
      button.style.transform = 'scale(1)';
      if (isDark) {
        button.style.background = '#1e1e1e';
      } else {
        button.style.background = '#fff';
      }
    });
    
    button.addEventListener('click', () => {
      const map = this.map;
      if (!map) return;
      const loc = this.userLocation();
      if (loc) {
        map.flyTo({ center: [loc.lng, loc.lat], zoom: 14, duration: 1000 });
      } else {
        this.requestUserLocation();
      }
    });
    if (this.mapContainer?.nativeElement) {
      this.mapContainer.nativeElement.appendChild(button);
    }
  }

  private createPhotoMarker(location: CarMapLocation): HTMLElement {
    const el = document.createElement('div');
    el.className = 'car-marker';
    this.clearPhotoRotation(location.carId);
    el.setAttribute('data-title', location.title || 'Ver detalle');
    el.setAttribute('data-car-id', location.carId);

    // Determinar si mostrar distancia o precio
    const distanceText = this.getDistanceText(location.lat, location.lng);
    const showDistanceIfNearby =
      distanceText && parseFloat(distanceText.replace(/[^\d.]/g, '')) <= 10; // Mostrar distancia si <= 10km

    const gallery = this.getPhotoGallery(location);
    const hasPhoto = gallery.length > 0;
    const initialPhoto = hasPhoto ? this.sanitizeUrl(gallery[0]) : '';

    const themeClass = this.isDarkMap() ? 'car-marker--dark' : 'car-marker--light';
    el.classList.add(themeClass);

    // ✅ Prioridad renovada: 1) Precio dinámico, 2) Precio estático del auto, 3) Distancia
    const cachedPrice = this.getCachedDynamicPrice(location.carId);
    const fallbackPrice = location.pricePerDay ?? null;
    const fallbackCurrency = location.currency ?? 'ARS';

    let displayText: string | null = null;
    let displayClass: string | null = null;

    if (cachedPrice) {
      const formattedPrice = new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: cachedPrice.currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(cachedPrice.price);
      displayText = formattedPrice;
      displayClass = 'car-marker-price car-marker-price--dynamic';
    } else if (fallbackPrice) {
      const formattedPrice = new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: fallbackCurrency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(fallbackPrice);
      displayText = formattedPrice;
      displayClass = 'car-marker-price car-marker-price--fallback';
    } else if (distanceText) {
      displayText = distanceText;
      displayClass = 'car-marker-distance';
      if (showDistanceIfNearby) {
        el.classList.add('nearby');
      }
    }
    // Si no hay precio ni distancia, no mostrar nada (displayText y displayClass quedan null)

    const pillHtml =
      displayText && displayClass
        ? `<div class="car-marker-pill ${displayClass}">
            ${displayText}${
            displayClass.includes('price') ? '<span class="car-marker-pill-sub">/día</span>' : ''
          }
          </div>`
        : '';

    const title = this.sanitizeText(location.title || 'Auto disponible');
    const meta = this.sanitizeText(location.locationLabel || distanceText || '');
    const avatarContent = hasPhoto
      ? `<div class="car-marker-avatar" style="background-image:url('${initialPhoto}')"></div>`
      : `<div class="car-marker-avatar car-marker-avatar--empty">${this.getInitials(title)}</div>`;
    const metaHtml = meta ? `<p class="car-marker-meta">${meta}</p>` : '';

    el.innerHTML = `
      <div class="car-marker-card ${showDistanceIfNearby ? 'car-marker-card--nearby' : ''}">
        <div class="car-marker-body">
          ${avatarContent}
          <div class="car-marker-text">
            <p class="car-marker-title">${title}</p>
            ${metaHtml}
          </div>
        </div>
        ${pillHtml}
      </div>
    `;

    const avatarEl = el.querySelector('.car-marker-avatar') as HTMLElement | null;
    this.startPhotoRotation(location.carId, avatarEl, gallery);

    return el;
  }

  private getPhotoGallery(location: CarMapLocation): string[] {
    const gallery = (location as CarMapLocation & { photoGallery?: unknown }).photoGallery;
    if (Array.isArray(gallery) && gallery.length > 0) {
      return gallery
        .map((url) => (typeof url === 'string' ? url : null))
        .filter((url): url is string => !!url);
    }
    return location.photoUrl ? [location.photoUrl] : [];
  }

  private startPhotoRotation(
    carId: string,
    avatarEl: HTMLElement | null,
    gallery: string[],
  ): void {
    if (!avatarEl) {
      return;
    }
    this.clearPhotoRotation(carId);
    if (gallery.length === 0) {
      avatarEl.style.backgroundImage = '';
      return;
    }
    avatarEl.style.backgroundImage = `url('${this.sanitizeUrl(gallery[0])}')`;
    if (gallery.length < 2 || typeof window === 'undefined') {
      return;
    }
    let index = 0;
    const rotate = () => {
      index = (index + 1) % gallery.length;
      avatarEl.style.backgroundImage = `url('${this.sanitizeUrl(gallery[index])}')`;
    };
    const timer = window.setInterval(rotate, 4000);
    this.markerPhotoTimers.set(carId, timer);
  }

  private clearPhotoRotation(carId: string): void {
    if (typeof window === 'undefined') {
      this.markerPhotoTimers.delete(carId);
      return;
    }
    const timer = this.markerPhotoTimers.get(carId);
    if (timer) {
      window.clearInterval(timer);
      this.markerPhotoTimers.delete(carId);
    }
  }

  private clearAllPhotoRotations(): void {
    if (typeof window !== 'undefined') {
      this.markerPhotoTimers.forEach((timer) => window.clearInterval(timer));
    }
    this.markerPhotoTimers.clear();
  }

  private animateMarkerBounce(element: HTMLElement): void {
    element.classList.remove('bounce');
    // Force reflow
    void element.offsetWidth;
    element.classList.add('bounce');
    setTimeout(() => element.classList.remove('bounce'), 600);
  }

  private requestUserLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          this.userLocation.set({ lat: latitude, lng: longitude });
          this.userLocationForDistance = { lat: latitude, lng: longitude };
          this.userLocationChange.emit({ lat: latitude, lng: longitude });
          this.addUserMarker(latitude, longitude);
          // Actualizar markers con distancias después de obtener ubicación
          this.updateMarkers(this.cars);
          // NO hacer zoom automático - dejar que el usuario explore libremente
          // this.zoomToUserLocation(latitude, longitude);
        },
        (error) => {
          // Geolocation error - NO bloquear el mapa, solo loguear
          console.warn('⚠️ No se pudo obtener ubicación del usuario:', error.message);
          // No seteamos this.error para que el mapa siga funcionando
        },
      );
    } else {
      console.warn('⚠️ Geolocalización no disponible en este navegador');
    }
  }

  private addUserMarker(lat: number, lng: number): void {
    if (!this.map || !this.mapboxgl) {
      return;
    }

    if (this.userMarker) {
      this.userMarker.remove();
    }

    const el = document.createElement('div');
    el.className = 'user-location-marker';

    const map = this.map;
    if (!map) return;
    this.userMarker = new this.mapboxgl.Marker(el)
      .setLngLat([lng, lat] as LngLatLike)
      .addTo(map);
  }

  private zoomToUserLocation(lat: number, lng: number): void {
    if (!this.map) {
      return;
    }

    this.map.flyTo({
      center: [lng, lat],
      zoom: 14,
    });
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return this.EARTH_RADIUS_KM * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Format distance for display
   */
  private formatDistance(km: number): string {
    if (km < 1) {
      return `${Math.round(km * 1000)}m`;
    } else if (km < 10) {
      return `${km.toFixed(1)}km`;
    } else {
      return `${Math.round(km)}km`;
    }
  }

  /**
   * Get distance text for a car location
   */
  private getDistanceText(carLat: number, carLng: number): string | null {
    if (!this.userLocationForDistance) return null;

    const distance = this.calculateDistance(
      this.userLocationForDistance.lat,
      this.userLocationForDistance.lng,
      carLat,
      carLng
    );

    return this.formatDistance(distance);
  }

  private isDarkMap(): boolean {
    if (typeof document !== 'undefined' && document.body.classList.contains('dark')) {
      return true;
    }
    if (this.map) {
      const styleName = this.map.getStyle()?.name?.toLowerCase() ?? '';
      return styleName.includes('dark') || styleName.includes('night');
    }
    return false;
  }

  flyToCarLocation(carId: string): void {
    if (!this.map) {
      return;
    }

    const location = this.cars.find((loc) => loc.carId === carId);
    if (location) {
      this.map.flyTo({
        center: [location.lng, location.lat],
        zoom: 15,
      });
    }
  }

  /**
   * Public method to fly to a specific location
   * Used by parent components to center the map
   */
  flyToLocation(lat: number, lng: number, zoom: number = 14): void {
    if (!this.map) {
      console.warn('⚠️ Map not initialized');
      return;
    }

    this.map.flyTo({
      center: [lng, lat],
      zoom,
      essential: true,
    });
  }

  private sanitizeText(value: string): string {
    return value.replace(/[&<>"']/g, (char) => {
      const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };
      return map[char] || char;
    });
  }

  private sanitizeUrl(url: string): string {
    if (typeof window === 'undefined') {
      return url;
    }
    try {
      const parsed = new URL(url, window.location.origin);
      return parsed.href;
    } catch {
      return 'https://cdn.autorenta.com/markers/marker-fallback.png';
    }
  }

  private getInitials(text: string): string {
    const words = text.trim().split(/\s+/);
    if (words.length === 0) return 'AR';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  }
}
