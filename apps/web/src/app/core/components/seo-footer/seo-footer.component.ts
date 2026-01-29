import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

type TabKey = 'cities' | 'brands' | 'categories' | 'airports' | 'popular';

interface SeoLink {
  name: string;
  slug: string;
  description?: string;
}

interface SeoTab {
  key: TabKey;
  label: string;
  routePrefix: string;
  linkPrefix: string;
}

/**
 * SEO Footer Component - Inspired by Zapier, Turo & Airbnb
 *
 * Features:
 * - Tabbed navigation with 5 categories (150+ total links)
 * - Alphabetical index for quick navigation
 * - "Búsquedas populares" section for long-tail keywords
 * - Expandable grid with "Show more" functionality
 * - Responsive design optimized for all devices
 * - Internal linking structure for maximum SEO impact
 */
@Component({
  standalone: true,
  selector: 'app-seo-footer',
  imports: [CommonModule, RouterLink],
  template: `
    <section class="border-t border-gray-200 bg-gradient-to-b from-gray-50 to-white py-12">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <!-- Section Title -->
        <h2 class="mb-2 text-xl font-bold text-gray-900">Explora opciones de alquiler de autos</h2>
        <p class="mb-6 text-sm text-gray-600">
          Encuentra el auto perfecto en más de 50 destinos de Argentina y Latinoamérica
        </p>

        <!-- Tabs Navigation -->
        <div class="mb-6 flex flex-wrap gap-1 border-b border-gray-200">
          @for (tab of tabs; track tab.key) {
            <button type="button" (click)="selectTab(tab.key)" [class]="getTabClass(tab.key)">
              {{ tab.label }}
              <span class="ml-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                {{ getTabCount(tab.key) }}
              </span>
            </button>
          }
        </div>

        <!-- Alphabetical Index (only for cities) -->
        @if (activeTab() === 'cities') {
          <div class="mb-4 flex flex-wrap gap-1">
            <button type="button" (click)="setLetterFilter(null)" [class]="getLetterClass(null)">
              Todas
            </button>
            @for (letter of alphabet; track letter) {
              <button
                type="button"
                (click)="setLetterFilter(letter)"
                [class]="getLetterClass(letter)"
                [disabled]="!hasLetterLinks(letter)"
              >
                {{ letter }}
              </button>
            }
          </div>
        }

        <!-- Links Grid -->
        <div
          class="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
        >
          @for (link of visibleLinks(); track link.slug) {
            <a
              [routerLink]="[currentTab().routePrefix, link.slug]"
              class="group block rounded-lg p-2 transition-all hover:bg-white hover:shadow-sm"
            >
              <span class="block text-sm font-medium text-gray-800 group-hover:text-green-600">
                @if (currentTab().linkPrefix) {
                  {{ currentTab().linkPrefix }} {{ link.name }}
                } @else {
                  {{ link.name }}
                }
              </span>
              @if (link.description) {
                <span class="mt-0.5 block text-xs text-gray-500">
                  {{ link.description }}
                </span>
              }
            </a>
          }
        </div>

        <!-- Show More Button -->
        @if (hasMoreLinks()) {
          <button
            type="button"
            (click)="toggleShowAll()"
            class="mt-6 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow"
          >
            @if (showAll()) {
              <span>Mostrar menos</span>
              <svg class="h-4 w-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            } @else {
              <span>Mostrar {{ remainingCount() }} más</span>
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            }
          </button>
        }

        <!-- Stats Bar -->
        <div
          class="mt-8 flex flex-wrap items-center justify-center gap-6 border-t border-gray-100 pt-6 text-center text-sm text-gray-500"
        >
          <div>
            <span class="font-semibold text-gray-900">{{ totalLinks }}</span> destinos disponibles
          </div>
          <div>
            <span class="font-semibold text-gray-900">{{ brands.length }}</span> marcas de autos
          </div>
          <div>
            <span class="font-semibold text-gray-900">{{ airports.length }}</span> aeropuertos
          </div>
        </div>
      </div>
    </section>
  `,
})
export class SeoFooterComponent {
  readonly INITIAL_VISIBLE = 18;
  readonly alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  // Tab definitions
  readonly tabs: SeoTab[] = [
    { key: 'cities', label: 'Ciudades', routePrefix: '/alquiler-autos', linkPrefix: 'Alquiler en' },
    { key: 'airports', label: 'Aeropuertos', routePrefix: '/aeropuerto', linkPrefix: '' },
    { key: 'brands', label: 'Marcas', routePrefix: '/rentar', linkPrefix: 'Rentar' },
    { key: 'categories', label: 'Categorías', routePrefix: '/categoria', linkPrefix: '' },
    { key: 'popular', label: 'Búsquedas Populares', routePrefix: '/buscar', linkPrefix: '' },
  ];

  // ==========================================
  // CIUDADES - 52 destinos en Argentina y LATAM
  // ==========================================
  readonly cities: SeoLink[] = [
    // Argentina - Capitales de Provincia
    { name: 'Buenos Aires', slug: 'buenos-aires', description: 'Capital Federal' },
    { name: 'Córdoba', slug: 'cordoba', description: 'Córdoba' },
    { name: 'Mendoza', slug: 'mendoza', description: 'Mendoza' },
    { name: 'Rosario', slug: 'rosario', description: 'Santa Fe' },
    { name: 'San Miguel de Tucumán', slug: 'tucuman', description: 'Tucumán' },
    { name: 'La Plata', slug: 'la-plata', description: 'Buenos Aires' },
    { name: 'Mar del Plata', slug: 'mar-del-plata', description: 'Buenos Aires' },
    { name: 'Salta', slug: 'salta', description: 'Salta' },
    { name: 'Santa Fe', slug: 'santa-fe', description: 'Santa Fe' },
    { name: 'San Juan', slug: 'san-juan', description: 'San Juan' },
    { name: 'Resistencia', slug: 'resistencia', description: 'Chaco' },
    { name: 'Corrientes', slug: 'corrientes', description: 'Corrientes' },
    { name: 'Posadas', slug: 'posadas', description: 'Misiones' },
    { name: 'San Salvador de Jujuy', slug: 'jujuy', description: 'Jujuy' },
    { name: 'Paraná', slug: 'parana', description: 'Entre Ríos' },
    { name: 'Neuquén', slug: 'neuquen', description: 'Neuquén' },
    { name: 'Formosa', slug: 'formosa', description: 'Formosa' },
    { name: 'San Luis', slug: 'san-luis', description: 'San Luis' },
    {
      name: 'Santiago del Estero',
      slug: 'santiago-del-estero',
      description: 'Santiago del Estero',
    },
    { name: 'La Rioja', slug: 'la-rioja', description: 'La Rioja' },
    { name: 'Catamarca', slug: 'catamarca', description: 'Catamarca' },
    { name: 'Rawson', slug: 'rawson', description: 'Chubut' },
    { name: 'Río Gallegos', slug: 'rio-gallegos', description: 'Santa Cruz' },
    { name: 'Ushuaia', slug: 'ushuaia', description: 'Tierra del Fuego' },
    { name: 'Viedma', slug: 'viedma', description: 'Río Negro' },
    { name: 'Santa Rosa', slug: 'santa-rosa', description: 'La Pampa' },
    // Argentina - Ciudades Turísticas
    { name: 'Bariloche', slug: 'bariloche', description: 'Patagonia' },
    { name: 'Puerto Madryn', slug: 'puerto-madryn', description: 'Chubut' },
    { name: 'El Calafate', slug: 'el-calafate', description: 'Santa Cruz' },
    { name: 'Puerto Iguazú', slug: 'puerto-iguazu', description: 'Misiones' },
    { name: 'Villa Carlos Paz', slug: 'carlos-paz', description: 'Córdoba' },
    { name: 'San Martín de los Andes', slug: 'san-martin-de-los-andes', description: 'Neuquén' },
    { name: 'Villa La Angostura', slug: 'villa-la-angostura', description: 'Neuquén' },
    { name: 'El Chaltén', slug: 'el-chalten', description: 'Santa Cruz' },
    { name: 'Cafayate', slug: 'cafayate', description: 'Salta' },
    { name: 'Tilcara', slug: 'tilcara', description: 'Jujuy' },
    { name: 'Pinamar', slug: 'pinamar', description: 'Buenos Aires' },
    { name: 'Villa Gesell', slug: 'villa-gesell', description: 'Buenos Aires' },
    { name: 'Tandil', slug: 'tandil', description: 'Buenos Aires' },
    { name: 'Bahía Blanca', slug: 'bahia-blanca', description: 'Buenos Aires' },
    // Uruguay
    { name: 'Montevideo', slug: 'montevideo', description: 'Uruguay' },
    { name: 'Punta del Este', slug: 'punta-del-este', description: 'Uruguay' },
    { name: 'Colonia del Sacramento', slug: 'colonia', description: 'Uruguay' },
    // Chile
    { name: 'Santiago', slug: 'santiago', description: 'Chile' },
    { name: 'Viña del Mar', slug: 'vina-del-mar', description: 'Chile' },
    // Brasil
    { name: 'São Paulo', slug: 'sao-paulo', description: 'Brasil' },
    { name: 'Río de Janeiro', slug: 'rio-de-janeiro', description: 'Brasil' },
    { name: 'Florianópolis', slug: 'florianopolis', description: 'Brasil' },
    // México
    { name: 'Cancún', slug: 'cancun', description: 'México' },
    { name: 'Ciudad de México', slug: 'ciudad-de-mexico', description: 'México' },
    { name: 'Guadalajara', slug: 'guadalajara', description: 'México' },
    { name: 'Tulum', slug: 'tulum', description: 'México' },
  ];

  // ==========================================
  // AEROPUERTOS - 28 aeropuertos principales
  // ==========================================
  readonly airports: SeoLink[] = [
    // Argentina
    { name: 'Aeropuerto Ezeiza (EZE)', slug: 'ezeiza', description: 'Buenos Aires Internacional' },
    {
      name: 'Aeroparque Jorge Newbery (AEP)',
      slug: 'aeroparque',
      description: 'Buenos Aires Doméstico',
    },
    {
      name: 'Aeropuerto Córdoba (COR)',
      slug: 'cordoba-aeropuerto',
      description: 'Ingeniero Taravella',
    },
    { name: 'Aeropuerto Mendoza (MDZ)', slug: 'mendoza-aeropuerto', description: 'El Plumerillo' },
    {
      name: 'Aeropuerto Bariloche (BRC)',
      slug: 'bariloche-aeropuerto',
      description: 'Teniente Candelaria',
    },
    {
      name: 'Aeropuerto Salta (SLA)',
      slug: 'salta-aeropuerto',
      description: 'Martín Miguel de Güemes',
    },
    {
      name: 'Aeropuerto Iguazú (IGR)',
      slug: 'iguazu-aeropuerto',
      description: 'Cataratas del Iguazú',
    },
    {
      name: 'Aeropuerto Ushuaia (USH)',
      slug: 'ushuaia-aeropuerto',
      description: 'Malvinas Argentinas',
    },
    {
      name: 'Aeropuerto Tucumán (TUC)',
      slug: 'tucuman-aeropuerto',
      description: 'Teniente Benjamín Matienzo',
    },
    { name: 'Aeropuerto Rosario (ROS)', slug: 'rosario-aeropuerto', description: 'Islas Malvinas' },
    {
      name: 'Aeropuerto Neuquén (NQN)',
      slug: 'neuquen-aeropuerto',
      description: 'Presidente Perón',
    },
    {
      name: 'Aeropuerto El Calafate (FTE)',
      slug: 'calafate-aeropuerto',
      description: 'Comandante Armando Tola',
    },
    {
      name: 'Aeropuerto Jujuy (JUJ)',
      slug: 'jujuy-aeropuerto',
      description: 'Gobernador Horacio Guzmán',
    },
    {
      name: 'Aeropuerto Mar del Plata (MDQ)',
      slug: 'mardelplata-aeropuerto',
      description: 'Astor Piazzolla',
    },
    {
      name: 'Aeropuerto Puerto Madryn (PMY)',
      slug: 'madryn-aeropuerto',
      description: 'El Tehuelche',
    },
    { name: 'Aeropuerto Trelew (REL)', slug: 'trelew-aeropuerto', description: 'Almirante Zar' },
    {
      name: 'Aeropuerto Comodoro Rivadavia (CRD)',
      slug: 'comodoro-aeropuerto',
      description: 'General Mosconi',
    },
    {
      name: 'Aeropuerto Río Gallegos (RGL)',
      slug: 'riogallegos-aeropuerto',
      description: 'Piloto Civil Norberto Fernández',
    },
    {
      name: 'Aeropuerto San Juan (UAQ)',
      slug: 'sanjuan-aeropuerto',
      description: 'Domingo Faustino Sarmiento',
    },
    {
      name: 'Aeropuerto Posadas (PSS)',
      slug: 'posadas-aeropuerto',
      description: 'Libertador General José de San Martín',
    },
    // Internacional
    {
      name: 'Aeropuerto Carrasco (MVD)',
      slug: 'montevideo-aeropuerto',
      description: 'Montevideo, Uruguay',
    },
    {
      name: 'Aeropuerto Santiago (SCL)',
      slug: 'santiago-aeropuerto',
      description: 'Arturo Merino Benítez, Chile',
    },
    {
      name: 'Aeropuerto Cancún (CUN)',
      slug: 'cancun-aeropuerto',
      description: 'Internacional de Cancún, México',
    },
    {
      name: 'Aeropuerto CDMX (MEX)',
      slug: 'cdmx-aeropuerto',
      description: 'Benito Juárez, México',
    },
    {
      name: 'Aeropuerto Guarulhos (GRU)',
      slug: 'saopaulo-aeropuerto',
      description: 'São Paulo, Brasil',
    },
    {
      name: 'Aeropuerto Galeão (GIG)',
      slug: 'rio-aeropuerto',
      description: 'Río de Janeiro, Brasil',
    },
    { name: 'Aeropuerto Lima (LIM)', slug: 'lima-aeropuerto', description: 'Jorge Chávez, Perú' },
    {
      name: 'Aeropuerto Bogotá (BOG)',
      slug: 'bogota-aeropuerto',
      description: 'El Dorado, Colombia',
    },
  ];

  // ==========================================
  // MARCAS - 24 marcas de autos
  // ==========================================
  readonly brands: SeoLink[] = [
    { name: 'Toyota', slug: 'toyota', description: 'Confiabilidad japonesa' },
    { name: 'Volkswagen', slug: 'volkswagen', description: 'Ingeniería alemana' },
    { name: 'Chevrolet', slug: 'chevrolet', description: 'Potencia americana' },
    { name: 'Ford', slug: 'ford', description: 'Tradición y fuerza' },
    { name: 'Fiat', slug: 'fiat', description: 'Estilo italiano' },
    { name: 'Renault', slug: 'renault', description: 'Diseño francés' },
    { name: 'Peugeot', slug: 'peugeot', description: 'Elegancia francesa' },
    { name: 'Citroën', slug: 'citroen', description: 'Innovación francesa' },
    { name: 'Nissan', slug: 'nissan', description: 'Tecnología japonesa' },
    { name: 'Honda', slug: 'honda', description: 'Eficiencia garantizada' },
    { name: 'Hyundai', slug: 'hyundai', description: 'Tecnología coreana' },
    { name: 'Kia', slug: 'kia', description: 'Diseño moderno' },
    { name: 'Jeep', slug: 'jeep', description: 'Aventura todoterreno' },
    { name: 'BMW', slug: 'bmw', description: 'Lujo deportivo' },
    { name: 'Mercedes-Benz', slug: 'mercedes-benz', description: 'Elegancia premium' },
    { name: 'Audi', slug: 'audi', description: 'Tecnología de vanguardia' },
    { name: 'Mazda', slug: 'mazda', description: 'Diseño japonés' },
    { name: 'Mitsubishi', slug: 'mitsubishi', description: 'Robustez japonesa' },
    { name: 'Suzuki', slug: 'suzuki', description: 'Compactos eficientes' },
    { name: 'Subaru', slug: 'subaru', description: 'Tracción integral' },
    { name: 'Volvo', slug: 'volvo', description: 'Seguridad escandinava' },
    { name: 'RAM', slug: 'ram', description: 'Pickups poderosas' },
    { name: 'Porsche', slug: 'porsche', description: 'Deportivos de lujo' },
    { name: 'Tesla', slug: 'tesla', description: 'Eléctricos premium' },
  ];

  // ==========================================
  // CATEGORÍAS - 15 tipos de vehículos
  // ==========================================
  readonly categories: SeoLink[] = [
    { name: 'SUVs y Camionetas', slug: 'suv', description: 'Espacio y versatilidad' },
    { name: 'Autos Económicos', slug: 'economico', description: 'Mejor precio por km' },
    { name: 'Autos de Lujo', slug: 'lujo', description: 'Experiencia premium' },
    { name: 'Pickups', slug: 'pickup', description: 'Potencia y capacidad' },
    { name: 'Sedán', slug: 'sedan', description: 'Confort y elegancia' },
    { name: 'Hatchback', slug: 'hatchback', description: 'Compactos y ágiles' },
    { name: 'Deportivos', slug: 'deportivo', description: 'Adrenalina pura' },
    { name: 'Vans y Minivans', slug: 'van', description: 'Para grupos y familias' },
    { name: 'Convertibles', slug: 'convertible', description: 'Cielo abierto' },
    { name: 'Eléctricos', slug: 'electrico', description: 'Movilidad sustentable' },
    { name: 'Híbridos', slug: 'hibrido', description: 'Eficiencia y potencia' },
    { name: 'Clásicos y Vintage', slug: 'clasico', description: 'Nostalgia sobre ruedas' },
    { name: 'Autos 4x4', slug: '4x4', description: 'Todo terreno' },
    { name: 'Autos para Viajes Largos', slug: 'viaje-largo', description: 'Confort en ruta' },
    { name: 'Autos para Bodas', slug: 'bodas', description: 'Tu día especial' },
  ];

  // ==========================================
  // BÚSQUEDAS POPULARES - Keywords long-tail
  // ==========================================
  readonly popularSearches: SeoLink[] = [
    { name: 'Alquiler de autos baratos', slug: 'autos-baratos', description: 'Mejores precios' },
    {
      name: 'Alquiler de autos sin tarjeta de crédito',
      slug: 'sin-tarjeta',
      description: 'Pago en efectivo',
    },
    { name: 'Alquiler de autos por día', slug: 'por-dia', description: 'Flexibilidad total' },
    { name: 'Alquiler de autos mensual', slug: 'mensual', description: 'Descuentos por mes' },
    { name: 'Alquiler de autos con chofer', slug: 'con-chofer', description: 'Servicio premium' },
    {
      name: 'Alquiler de autos para empresas',
      slug: 'empresas',
      description: 'Flotas corporativas',
    },
    {
      name: 'Alquiler de camionetas 4x4',
      slug: 'camionetas-4x4',
      description: 'Aventura off-road',
    },
    { name: 'Alquiler de autos para turismo', slug: 'turismo', description: 'Explora Argentina' },
    {
      name: 'Alquiler de autos fin de semana',
      slug: 'fin-de-semana',
      description: 'Escapadas cortas',
    },
    {
      name: 'Alquiler de autos último minuto',
      slug: 'ultimo-minuto',
      description: 'Ofertas inmediatas',
    },
    {
      name: 'Alquiler de autos con seguro incluido',
      slug: 'con-seguro',
      description: 'Cobertura total',
    },
    {
      name: 'Alquiler de autos de lujo para eventos',
      slug: 'eventos-lujo',
      description: 'Ocasiones especiales',
    },
    {
      name: 'Alquiler de autos para viajes en familia',
      slug: 'familia',
      description: 'Espacio para todos',
    },
    {
      name: 'Alquiler de autos cerca de mí',
      slug: 'cerca-de-mi',
      description: 'Ubicaciones cercanas',
    },
    {
      name: 'Alquiler de autos ida y vuelta',
      slug: 'ida-vuelta',
      description: 'Devolución flexible',
    },
    {
      name: 'Comparar precios de alquiler de autos',
      slug: 'comparar-precios',
      description: 'Encuentra el mejor',
    },
    {
      name: 'Alquiler de autos con kilometraje libre',
      slug: 'kilometraje-libre',
      description: 'Sin límites',
    },
    {
      name: 'Alquiler de autos para viajes de negocios',
      slug: 'negocios',
      description: 'Profesional',
    },
  ];

  // Total links counter
  readonly totalLinks =
    this.cities.length +
    this.airports.length +
    this.brands.length +
    this.categories.length +
    this.popularSearches.length;

  // State
  readonly activeTab = signal<TabKey>('cities');
  readonly showAll = signal(false);
  readonly letterFilter = signal<string | null>(null);

  // Computed
  readonly currentTab = computed(
    () => this.tabs.find((t) => t.key === this.activeTab()) || this.tabs[0],
  );

  readonly currentLinks = computed(() => {
    let links: SeoLink[];
    switch (this.activeTab()) {
      case 'cities':
        links = this.cities;
        break;
      case 'brands':
        links = this.brands;
        break;
      case 'categories':
        links = this.categories;
        break;
      case 'airports':
        links = this.airports;
        break;
      case 'popular':
        links = this.popularSearches;
        break;
      default:
        links = this.cities;
    }

    // Apply letter filter for cities
    const letter = this.letterFilter();
    if (this.activeTab() === 'cities' && letter) {
      return links.filter((l) => l.name.toUpperCase().startsWith(letter));
    }

    return links;
  });

  readonly visibleLinks = computed(() => {
    const links = this.currentLinks();
    return this.showAll() ? links : links.slice(0, this.INITIAL_VISIBLE);
  });

  readonly hasMoreLinks = computed(() => this.currentLinks().length > this.INITIAL_VISIBLE);

  readonly remainingCount = computed(() => this.currentLinks().length - this.INITIAL_VISIBLE);

  getTabCount(key: TabKey): number {
    switch (key) {
      case 'cities':
        return this.cities.length;
      case 'brands':
        return this.brands.length;
      case 'categories':
        return this.categories.length;
      case 'airports':
        return this.airports.length;
      case 'popular':
        return this.popularSearches.length;
      default:
        return 0;
    }
  }

  hasLetterLinks(letter: string): boolean {
    return this.cities.some((c) => c.name.toUpperCase().startsWith(letter));
  }

  selectTab(key: TabKey): void {
    this.activeTab.set(key);
    this.showAll.set(false);
    this.letterFilter.set(null);
  }

  setLetterFilter(letter: string | null): void {
    this.letterFilter.set(letter);
    this.showAll.set(false);
  }

  toggleShowAll(): void {
    this.showAll.update((v) => !v);
  }

  getTabClass(key: TabKey): string {
    const base =
      'px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap rounded-t-lg flex items-center';
    const active = 'bg-white border-t border-l border-r border-gray-200 text-green-600 -mb-px';
    const inactive = 'text-gray-600 hover:text-gray-900 hover:bg-gray-100';
    return `${base} ${this.activeTab() === key ? active : inactive}`;
  }

  getLetterClass(letter: string | null): string {
    const base = 'min-w-[32px] h-8 text-xs font-medium rounded transition-colors';
    const active = 'bg-green-600 text-white';
    const inactive =
      'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed';
    return `${base} ${this.letterFilter() === letter ? active : inactive}`;
  }
}
