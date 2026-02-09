import {
  Component,
  inject,
  input,
  output,
  signal,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  PublishCarLocationService,
  PublishCoordinates,
} from '../../services/publish-car-location.service';

export interface LocationAnswer {
  street: string;
  streetNumber: string;
  city: string;
  state: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Location selection question
 * Features GPS auto-detect and manual address input
 */
@Component({
  selector: 'app-location-question',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <!-- GPS Button -->
      <button
        type="button"
        (click)="useCurrentLocation()"
        [disabled]="isLoading()"
        class="w-full flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-cta-default to-cta-hover text-white font-semibold rounded-xl shadow-lg shadow-cta-default/30 hover:shadow-cta-default/50 transition-all hover:scale-[1.02] disabled:opacity-70 disabled:cursor-wait"
      >
        @if (isLoading()) {
          <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
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
          <span>{{
            locationState() === 'acquiring' ? 'Obteniendo ubicación...' : 'Buscando dirección...'
          }}</span>
        } @else {
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span>Usar mi ubicación actual</span>
        }
      </button>

      <!-- Divider -->
      <div class="flex items-center gap-4">
        <div class="flex-1 h-px bg-border-default"></div>
        <span class="text-sm text-text-muted">o ingresá manualmente</span>
        <div class="flex-1 h-px bg-border-default"></div>
      </div>

      <!-- Manual address form -->
      <div class="space-y-4">
        <!-- Street -->
        <div class="grid grid-cols-3 gap-3">
          <div class="col-span-2">
            <label class="block text-sm font-medium text-text-secondary mb-1">Calle</label>
            <input
              type="text"
              [(ngModel)]="street"
              (ngModelChange)="onAddressChange()"
              placeholder="Av. Corrientes"
              class="w-full px-4 py-3 bg-surface-raised border border-border-default rounded-xl focus:ring-2 focus:ring-cta-default focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-text-secondary mb-1">Número</label>
            <input
              type="text"
              [(ngModel)]="streetNumber"
              (ngModelChange)="onAddressChange()"
              placeholder="1234"
              class="w-full px-4 py-3 bg-surface-raised border border-border-default rounded-xl focus:ring-2 focus:ring-cta-default focus:border-transparent transition-all"
            />
          </div>
        </div>

        <!-- City and State -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-text-secondary mb-1">Ciudad</label>
            <input
              type="text"
              [(ngModel)]="city"
              (ngModelChange)="onCityChange($event)"
              placeholder="Buenos Aires"
              class="w-full px-4 py-3 bg-surface-raised border border-border-default rounded-xl focus:ring-2 focus:ring-cta-default focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-text-secondary mb-1">Provincia</label>
            <input
              type="text"
              [(ngModel)]="state"
              (ngModelChange)="onAddressChange()"
              placeholder="CABA"
              [class.bg-emerald-50]="stateAutoFilled()"
              [class.dark:bg-emerald-900/20]="stateAutoFilled()"
              class="w-full px-4 py-3 bg-surface-raised border border-border-default rounded-xl focus:ring-2 focus:ring-cta-default focus:border-transparent transition-all"
            />
          </div>
        </div>
      </div>

      <!-- Location confirmed indicator -->
      @if (hasValidLocation()) {
        <div
          class="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl"
        >
          <div
            class="w-10 h-10 bg-emerald-100 dark:bg-emerald-800 rounded-full flex items-center justify-center"
          >
            <svg
              class="w-5 h-5 text-emerald-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div class="flex-1">
            <p class="text-sm text-emerald-700 dark:text-emerald-400">Ubicación confirmada</p>
            <p class="font-semibold text-emerald-900 dark:text-emerald-200">
              {{ street }} {{ streetNumber }}, {{ city }}
            </p>
          </div>
        </div>
      }

      <!-- Privacy note -->
      <div class="flex items-start gap-3 p-4 bg-surface-secondary rounded-xl">
        <svg
          class="w-5 h-5 text-text-muted flex-shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <div>
          <p class="text-sm font-medium text-text-primary">Tu privacidad está protegida</p>
          <p class="text-xs text-text-muted mt-1">
            La dirección exacta solo se comparte con el arrendatario después de confirmar la
            reserva. En el listado solo mostramos la zona aproximada.
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class LocationQuestionComponent implements OnInit {
  private readonly locationService = inject(PublishCarLocationService);

  readonly initialValue = input<LocationAnswer | null>(null);
  readonly locationChanged = output<LocationAnswer>();

  // Form fields
  street = '';
  streetNumber = '';
  city = '';
  state = '';
  country = 'AR';

  // State
  readonly isLoading = signal(false);
  readonly locationState = signal<'idle' | 'acquiring' | 'geocoding'>('idle');
  readonly coordinates = signal<PublishCoordinates | null>(null);
  readonly stateAutoFilled = signal(false);

  ngOnInit(): void {
    const initial = this.initialValue();
    if (initial) {
      this.street = initial.street;
      this.streetNumber = initial.streetNumber;
      this.city = initial.city;
      this.state = initial.state;
      this.country = initial.country;
      if (initial.latitude && initial.longitude) {
        this.coordinates.set({ latitude: initial.latitude, longitude: initial.longitude });
      }
    }
  }

  async useCurrentLocation(): Promise<void> {
    this.isLoading.set(true);
    this.locationState.set('acquiring');
    this.stateAutoFilled.set(false);

    try {
      const coords = await this.locationService.useCurrentLocation();

      if (coords) {
        this.coordinates.set(coords);
        this.locationState.set('geocoding');

        // Reverse geocode to get address
        const address = await this.locationService.reverseGeocode(
          coords.latitude,
          coords.longitude,
        );

        if (address) {
          this.street = address.street;
          this.streetNumber = address.streetNumber;
          this.city = address.city;
          this.state = address.state;
          this.country = address.country || 'AR';

          if (!this.state && this.city) {
            const province = this.getProvinceForCity(this.city);
            if (province) {
              this.state = province;
              this.stateAutoFilled.set(true);
            }
          } else if (this.state) {
            this.stateAutoFilled.set(true);
          }
          // Coordinates already set from GPS, just emit
          this.emitLocationImmediate();
        }
      }
    } catch (error) {
      console.error('Location error:', error);
    } finally {
      this.isLoading.set(false);
      this.locationState.set('idle');
    }
  }

  private geocodeTimeout: ReturnType<typeof setTimeout> | null = null;

  onAddressChange(): void {
    // Clear coordinates when manually editing
    this.coordinates.set(null);
    this.stateAutoFilled.set(false);
    this.debouncedGeocode();
  }

  onCityChange(city: string): void {
    this.coordinates.set(null);

    // Auto-fill province based on city name
    const province = this.getProvinceForCity(city);
    if (province && !this.state) {
      this.state = province;
      this.stateAutoFilled.set(true);
    } else if (!province) {
      this.stateAutoFilled.set(false);
    }

    this.debouncedGeocode();
  }

  /**
   * Debounce geocoding to avoid too many API calls while typing
   * Waits 800ms after last keystroke before geocoding
   */
  private debouncedGeocode(): void {
    if (this.geocodeTimeout) {
      clearTimeout(this.geocodeTimeout);
    }

    // Emit immediately without coordinates (for UI feedback)
    this.emitLocationImmediate();

    // Schedule geocoding after debounce
    if (this.hasValidLocation()) {
      this.geocodeTimeout = setTimeout(() => {
        this.geocodeAndEmit();
      }, 800);
    }
  }

  /**
   * Emit location immediately without waiting for geocoding
   */
  private emitLocationImmediate(): void {
    if (!this.hasValidLocation()) return;

    const coords = this.coordinates();
    const location: LocationAnswer = {
      street: this.street,
      streetNumber: this.streetNumber,
      city: this.city,
      state: this.state,
      country: this.country,
      ...(coords && { latitude: coords.latitude, longitude: coords.longitude }),
    };

    this.locationChanged.emit(location);
  }

  /**
   * Geocode address and emit with coordinates
   * Also auto-fills province from geocoding result for accuracy
   */
  private async geocodeAndEmit(): Promise<void> {
    const coords = await this.geocodeCurrentAddress();

    // If we got coordinates, reverse geocode to get accurate province
    if (coords) {
      const fullAddress = await this.locationService.reverseGeocode(
        coords.latitude,
        coords.longitude,
      );
      if (fullAddress?.state && fullAddress.state !== this.state) {
        this.state = fullAddress.state;
        this.stateAutoFilled.set(true);
      } else if (!this.state && this.city) {
        const province = this.getProvinceForCity(this.city);
        if (province) {
          this.state = province;
          this.stateAutoFilled.set(true);
        }
      }
    }

    // Emit with coordinates and potentially updated state
    const location: LocationAnswer = {
      street: this.street,
      streetNumber: this.streetNumber,
      city: this.city,
      state: this.state,
      country: this.country,
      ...(coords && { latitude: coords.latitude, longitude: coords.longitude }),
    };

    this.locationChanged.emit(location);
  }

  /**
   * Maps common Argentine cities to their provinces
   * Returns null if city is not recognized
   */
  private getProvinceForCity(city: string): string | null {
    if (!city || city.length < 3) return null;

    const normalizedCity = city
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    // City to Province mapping for Argentina
    const cityProvinceMap: Record<string, string> = {
      // CABA
      'buenos aires': 'Buenos Aires',
      caba: 'CABA',
      'capital federal': 'CABA',
      palermo: 'CABA',
      recoleta: 'CABA',
      belgrano: 'CABA',
      caballito: 'CABA',
      'san telmo': 'CABA',
      'la boca': 'CABA',
      'puerto madero': 'CABA',
      'villa crespo': 'CABA',
      almagro: 'CABA',
      'villa urquiza': 'CABA',
      nuñez: 'CABA',
      nunez: 'CABA',
      colegiales: 'CABA',
      'villa devoto': 'CABA',
      flores: 'CABA',
      floresta: 'CABA',
      liniers: 'CABA',
      mataderos: 'CABA',
      pompeya: 'CABA',
      barracas: 'CABA',
      constitucion: 'CABA',
      monserrat: 'CABA',
      'san nicolas caba': 'CABA',
      retiro: 'CABA',
      chacarita: 'CABA',
      paternal: 'CABA',
      agronomia: 'CABA',
      'villa del parque': 'CABA',
      'villa pueyrredon': 'CABA',
      saavedra: 'CABA',
      coghlan: 'CABA',
      'villa ortuzar': 'CABA',
      'parque chas': 'CABA',

      // Buenos Aires (GBA y otras)
      'la plata': 'Buenos Aires',
      'mar del plata': 'Buenos Aires',
      'bahia blanca': 'Buenos Aires',
      quilmes: 'Buenos Aires',
      lanus: 'Buenos Aires',
      avellaneda: 'Buenos Aires',
      'lomas de zamora': 'Buenos Aires',
      moron: 'Buenos Aires',
      'san isidro': 'Buenos Aires',
      'vicente lopez': 'Buenos Aires',
      tigre: 'Buenos Aires',
      pilar: 'Buenos Aires',
      'san miguel': 'Buenos Aires',
      'jose c paz': 'Buenos Aires',
      'malvinas argentinas': 'Buenos Aires',
      'san fernando': 'Buenos Aires',
      escobar: 'Buenos Aires',
      campana: 'Buenos Aires',
      zarate: 'Buenos Aires',
      pergamino: 'Buenos Aires',
      junin: 'Buenos Aires',
      olavarria: 'Buenos Aires',
      tandil: 'Buenos Aires',
      necochea: 'Buenos Aires',
      'san nicolas de los arroyos': 'Buenos Aires',
      mercedes: 'Buenos Aires',
      lujan: 'Buenos Aires',
      'san antonio de areco': 'Buenos Aires',
      chascomus: 'Buenos Aires',
      dolores: 'Buenos Aires',
      'tres arroyos': 'Buenos Aires',
      azul: 'Buenos Aires',
      chivilcoy: 'Buenos Aires',
      bragado: 'Buenos Aires',
      '9 de julio': 'Buenos Aires',
      pehuajo: 'Buenos Aires',
      'trenque lauquen': 'Buenos Aires',
      'general pico': 'Buenos Aires',
      ituzaingo: 'Buenos Aires',
      merlo: 'Buenos Aires',
      moreno: 'Buenos Aires',
      hurlingham: 'Buenos Aires',
      'tres de febrero': 'Buenos Aires',
      'san martin': 'Buenos Aires',
      'general san martin': 'Buenos Aires',
      berazategui: 'Buenos Aires',
      'florencio varela': 'Buenos Aires',
      'almirante brown': 'Buenos Aires',
      'esteban echeverria': 'Buenos Aires',
      ezeiza: 'Buenos Aires',
      cañuelas: 'Buenos Aires',
      'presidente peron': 'Buenos Aires',
      'san vicente': 'Buenos Aires',

      // Córdoba
      cordoba: 'Córdoba',
      'villa carlos paz': 'Córdoba',
      'rio cuarto': 'Córdoba',
      'villa maria': 'Córdoba',
      'san francisco': 'Córdoba',
      'alta gracia': 'Córdoba',
      'jesus maria': 'Córdoba',
      cosquin: 'Córdoba',
      'la falda': 'Córdoba',
      'bell ville': 'Córdoba',
      'rio tercero': 'Córdoba',
      'villa allende': 'Córdoba',
      mendiolaza: 'Córdoba',
      unquillo: 'Córdoba',
      'rio ceballos': 'Córdoba',
      'carlos paz': 'Córdoba',

      // Santa Fe
      rosario: 'Santa Fe',
      'santa fe': 'Santa Fe',
      rafaela: 'Santa Fe',
      reconquista: 'Santa Fe',
      'venado tuerto': 'Santa Fe',
      casilda: 'Santa Fe',
      esperanza: 'Santa Fe',
      'san lorenzo': 'Santa Fe',
      'santo tome': 'Santa Fe',
      sunchales: 'Santa Fe',
      funes: 'Santa Fe',
      roldan: 'Santa Fe',
      'cañada de gomez': 'Santa Fe',

      // Mendoza
      mendoza: 'Mendoza',
      'san rafael': 'Mendoza',
      'godoy cruz': 'Mendoza',
      guaymallen: 'Mendoza',
      'las heras mendoza': 'Mendoza',
      maipu: 'Mendoza',
      'lujan de cuyo': 'Mendoza',
      tunuyan: 'Mendoza',
      tupungato: 'Mendoza',
      'san martin mendoza': 'Mendoza',
      'rivadavia mendoza': 'Mendoza',
      'junin mendoza': 'Mendoza',
      malargue: 'Mendoza',

      // Tucumán
      tucuman: 'Tucumán',
      'san miguel de tucuman': 'Tucumán',
      'yerba buena': 'Tucumán',
      'tafi viejo': 'Tucumán',
      'banda del rio sali': 'Tucumán',
      concepcion: 'Tucumán',

      // Salta
      salta: 'Salta',
      'san salvador de jujuy': 'Jujuy',
      oran: 'Salta',
      tartagal: 'Salta',
      cafayate: 'Salta',

      // Jujuy
      jujuy: 'Jujuy',
      'san salvador': 'Jujuy',
      palpala: 'Jujuy',
      'san pedro de jujuy': 'Jujuy',
      'libertador general san martin': 'Jujuy',
      humahuaca: 'Jujuy',
      tilcara: 'Jujuy',
      purmamarca: 'Jujuy',

      // Neuquén
      neuquen: 'Neuquén',
      'san martin de los andes': 'Neuquén',
      'villa la angostura': 'Neuquén',
      'junin de los andes': 'Neuquén',
      centenario: 'Neuquén',
      plottier: 'Neuquén',
      'cutral co': 'Neuquén',
      zapala: 'Neuquén',

      // Río Negro
      bariloche: 'Río Negro',
      'san carlos de bariloche': 'Río Negro',
      'general roca': 'Río Negro',
      cipolletti: 'Río Negro',
      viedma: 'Río Negro',
      'el bolson': 'Río Negro',
      allen: 'Río Negro',

      // Chubut
      rawson: 'Chubut',
      trelew: 'Chubut',
      'comodoro rivadavia': 'Chubut',
      'puerto madryn': 'Chubut',
      esquel: 'Chubut',

      // Santa Cruz
      'rio gallegos': 'Santa Cruz',
      'el calafate': 'Santa Cruz',
      'el chalten': 'Santa Cruz',
      'caleta olivia': 'Santa Cruz',
      'pico truncado': 'Santa Cruz',

      // Tierra del Fuego
      ushuaia: 'Tierra del Fuego',
      'rio grande': 'Tierra del Fuego',
      tolhuin: 'Tierra del Fuego',

      // Entre Ríos
      parana: 'Entre Ríos',
      concordia: 'Entre Ríos',
      gualeguaychu: 'Entre Ríos',
      colon: 'Entre Ríos',
      'concepcion del uruguay': 'Entre Ríos',
      gualeguay: 'Entre Ríos',
      villaguay: 'Entre Ríos',
      federacion: 'Entre Ríos',
      victoria: 'Entre Ríos',

      // Corrientes
      corrientes: 'Corrientes',
      goya: 'Corrientes',
      'paso de los libres': 'Corrientes',
      'mercedes corrientes': 'Corrientes',
      'curuzu cuatia': 'Corrientes',

      // Misiones
      posadas: 'Misiones',
      'puerto iguazu': 'Misiones',
      eldorado: 'Misiones',
      obera: 'Misiones',
      apostoles: 'Misiones',
      'jardin america': 'Misiones',

      // Chaco
      resistencia: 'Chaco',
      'presidencia roque saenz peña': 'Chaco',
      'saenz peña': 'Chaco',
      'villa angela': 'Chaco',
      charata: 'Chaco',

      // Formosa
      formosa: 'Formosa',
      clorinda: 'Formosa',

      // Santiago del Estero
      'santiago del estero': 'Santiago del Estero',
      'la banda': 'Santiago del Estero',
      'termas de rio hondo': 'Santiago del Estero',

      // Catamarca
      catamarca: 'Catamarca',
      'san fernando del valle de catamarca': 'Catamarca',

      // La Rioja
      'la rioja': 'La Rioja',
      chilecito: 'La Rioja',

      // San Juan
      'san juan': 'San Juan',
      'rawson san juan': 'San Juan',
      'rivadavia san juan': 'San Juan',
      chimbas: 'San Juan',
      pocito: 'San Juan',
      'santa lucia san juan': 'San Juan',

      // San Luis
      'san luis': 'San Luis',
      'villa mercedes san luis': 'San Luis',
      'merlo san luis': 'San Luis',

      // La Pampa
      'santa rosa': 'La Pampa',
      'general pico la pampa': 'La Pampa',
      toay: 'La Pampa',
    };

    // Try exact match first
    if (cityProvinceMap[normalizedCity]) {
      return cityProvinceMap[normalizedCity];
    }

    // Try partial match (city starts with input)
    for (const [cityName, province] of Object.entries(cityProvinceMap)) {
      if (cityName.startsWith(normalizedCity) || normalizedCity.startsWith(cityName)) {
        return province;
      }
    }

    return null;
  }

  hasValidLocation(): boolean {
    return !!(this.street && this.city && this.state);
  }

  /**
   * Geocode the current address to get coordinates
   * Called automatically when user enters address manually
   */
  private async geocodeCurrentAddress(): Promise<PublishCoordinates | null> {
    if (!this.street || !this.city) return null;

    try {
      this.isLoading.set(true);
      this.locationState.set('geocoding');

      const coords = await this.locationService.geocodeAddress({
        street: this.street,
        streetNumber: this.streetNumber,
        city: this.city,
        state: this.state,
        country: this.country || 'AR',
      });

      if (coords) {
        this.coordinates.set(coords);
        return coords;
      }

      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    } finally {
      this.isLoading.set(false);
      this.locationState.set('idle');
    }
  }
}
