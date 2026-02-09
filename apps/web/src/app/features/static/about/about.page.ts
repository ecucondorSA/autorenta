import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '@environment';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { of } from 'rxjs';

interface PlatformStats {
  active_cars: number;
  total_users: number;
  completed_trips: number;
  cities: number;
}

interface MediaMention {
  outlet: string;
  logo: string;
  title: string;
  date: string;
  url?: string;
}

interface Milestone {
  date: string;
  title: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-about',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  template: `
    <!-- ═══════════════════════════════════════════════════════════════════════
         HERO SECTION - Cinematográfico con video/imagen de fondo
         ═══════════════════════════════════════════════════════════════════════ -->
    <header class="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
      <!-- Background -->
      <div class="absolute inset-0 z-0">
        <img
          src="/assets/images/hero-about-v1.webp"
          alt="AutoRenta - Alquiler P2P de autos en Argentina"
          class="w-full h-full object-cover"
        />
        <div class="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black"></div>
      </div>

      <!-- Content -->
      <div class="relative z-10 container mx-auto px-4 text-center text-white">
        <div
          class="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-sm mb-6 border border-white/20"
        >
          <span class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          <span>Operando en Argentina</span>
        </div>

        <h1 class="text-5xl md:text-7xl font-black mb-6 tracking-tight leading-tight">
          Democratizamos<br />
          <span class="text-[#00d95f]"> la movilidad </span>
        </h1>

        <p class="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-10 leading-relaxed">
          Conectamos a personas que necesitan un auto con propietarios que quieren generar ingresos.
          Sin intermediarios, sin burocracia.
        </p>

        <!-- Stats Row -->
        @if (stats$ | async; as stats) {
          <div class="flex flex-wrap justify-center gap-8 md:gap-16">
            <div class="text-center">
              <div class="text-4xl md:text-5xl font-black text-white">{{ stats.active_cars }}+</div>
              <div class="text-gray-400 text-sm mt-1">Autos activos</div>
            </div>
            <div class="text-center">
              <div class="text-4xl md:text-5xl font-black text-white">{{ stats.total_users }}+</div>
              <div class="text-gray-400 text-sm mt-1">Usuarios</div>
            </div>
            <div class="text-center">
              <div class="text-4xl md:text-5xl font-black text-white">
                {{ stats.completed_trips }}+
              </div>
              <div class="text-gray-400 text-sm mt-1">Viajes</div>
            </div>
            <div class="text-center">
              <div class="text-4xl md:text-5xl font-black text-white">{{ stats.cities }}+</div>
              <div class="text-gray-400 text-sm mt-1">Ciudades</div>
            </div>
          </div>
        }
      </div>

      <!-- Scroll indicator -->
      <div class="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
        <svg class="w-6 h-6 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </div>
    </header>

    <!-- ═══════════════════════════════════════════════════════════════════════
         MISIÓN Y VISIÓN - Cards elegantes
         ═══════════════════════════════════════════════════════════════════════ -->
    <section class="py-20 bg-white">
      <div class="container mx-auto px-4">
        <div class="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <!-- Misión -->
          <div
            class="p-8 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100 shadow-sm"
          >
            <div
              class="w-12 h-12 bg-[#00d95f] rounded-xl flex items-center justify-center text-2xl mb-6"
            >
              🎯
            </div>
            <h2 class="text-2xl font-bold text-gray-900 mb-4">Nuestra Misión</h2>
            <p class="text-gray-600 leading-relaxed">
              Hacer que la movilidad sea accesible para todos. Creemos que el acceso a un vehículo
              no debería requerir trámites interminables ni tarjetas de crédito internacionales.
              Simplificamos el proceso para que cualquiera pueda alquilar un auto en minutos.
            </p>
          </div>

          <!-- Visión -->
          <div class="p-8 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl text-white">
            <div
              class="w-12 h-12 bg-[#00d95f] rounded-xl flex items-center justify-center text-2xl mb-6"
            >
              🚀
            </div>
            <h2 class="text-2xl font-bold mb-4">Nuestra Visión</h2>
            <p class="text-gray-300 leading-relaxed">
              Ser la plataforma líder de car-sharing P2P en Latinoamérica. Un futuro donde compartir
              un auto sea tan natural como compartir un departamento, reduciendo la cantidad de
              vehículos estacionados y el impacto ambiental.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════════════════
         NUESTRA HISTORIA - Timeline visual
         ═══════════════════════════════════════════════════════════════════════ -->
    <section class="py-20 bg-gray-50">
      <div class="container mx-auto px-4">
        <div class="text-center mb-16">
          <h2 class="text-4xl font-black text-gray-900 mb-4">Nuestra Historia</h2>
          <p class="text-xl text-gray-600 max-w-2xl mx-auto">
            De una idea en Buenos Aires a una plataforma que conecta toda Argentina
          </p>
        </div>

        <!-- Timeline -->
        <div class="max-w-4xl mx-auto">
          @for (milestone of milestones; track milestone.date; let i = $index) {
            <div class="relative flex gap-6 pb-12 last:pb-0">
              <!-- Line -->
              @if (i < milestones.length - 1) {
                <div class="absolute left-6 top-12 w-0.5 h-full bg-gray-200"></div>
              }

              <!-- Icon -->
              <div
                class="w-12 h-12 bg-white rounded-full border-4 border-[#00d95f] flex items-center justify-center text-xl shrink-0 z-10 shadow-lg"
              >
                {{ milestone.icon }}
              </div>

              <!-- Content -->
              <div class="flex-1 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div class="text-sm text-[#00d95f] font-semibold mb-2">{{ milestone.date }}</div>
                <h3 class="text-xl font-bold text-gray-900 mb-2">{{ milestone.title }}</h3>
                <p class="text-gray-600">{{ milestone.description }}</p>
              </div>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════════════════
         FUNDADOR - Sección personal y humana
         ═══════════════════════════════════════════════════════════════════════ -->
    <section class="py-20 bg-white">
      <div class="container mx-auto px-4">
        <div class="max-w-5xl mx-auto">
          <div class="grid md:grid-cols-2 gap-12 items-center">
            <!-- Image -->
            <div class="relative">
              <div class="aspect-square rounded-2xl overflow-hidden bg-gray-100">
                <img
                  src="/assets/images/founder-eduardo.jpg"
                  alt="Eduardo Marques - Fundador de AutoRenta"
                  class="w-full h-full object-cover"
                />
              </div>
              <!-- Floating card -->
              <div
                class="absolute -bottom-6 -right-6 bg-white rounded-xl shadow-xl p-4 border border-gray-100"
              >
                <div class="flex items-center gap-3">
                  <span class="text-3xl">🇧🇷</span>
                  <div>
                    <div class="font-bold text-gray-900">Brasileño</div>
                    <div class="text-sm text-gray-500">viviendo en Argentina</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Content -->
            <div>
              <div
                class="inline-flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full text-green-800 text-sm font-medium mb-6"
              >
                👋 Conocé al fundador
              </div>

              <h2 class="text-4xl font-black text-gray-900 mb-6">Eduardo Marques</h2>

              <p class="text-lg text-gray-500 mb-4">
                Medicina UBA | Fundador de
                <a
                  href="https://autamedica.com"
                  target="_blank"
                  rel="noopener"
                  class="text-blue-600 hover:underline"
                  >AutaMedica</a
                >
                &
                <a
                  href="https://ecucondor.com"
                  target="_blank"
                  rel="noopener"
                  class="text-blue-600 hover:underline"
                  >EcuCóndor</a
                >
              </p>

              <div class="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  "Soy brasileño viviendo en Argentina. Mi formación en medicina en la UBA me enseñó
                  a identificar problemas y buscar soluciones. Fundé
                  <strong>AutaMedica</strong> para eliminar la fricción en las consultas médicas
                  usando tecnología e IA."
                </p>
                <p>
                  "Con mi novia ecuatoriana, creamos <strong>EcuCóndor</strong> para resolver el
                  problema del cambio de divisas para migrantes latinos. Hoy operamos en Ecuador,
                  Argentina y Brasil con miles de usuarios."
                </p>
                <p>
                  "Cuando quise alquilar un auto en Argentina, descubrí que sin tarjeta de crédito
                  internacional era imposible. Ese dolor personal se convirtió en
                  <strong>AutoRenta</strong>: alquiler P2P sin barreras."
                </p>
                <p class="font-semibold text-gray-900">
                  "Transformo sectores complejos mediante tecnología. Salud, finanzas, movilidad -
                  el patrón es el mismo: eliminar fricciones."
                </p>
              </div>

              <!-- Social Links -->
              <div class="flex items-center gap-4 mt-8">
                <a
                  href="https://www.linkedin.com/in/eduardomarqueso/"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-2 px-4 py-2 bg-[#0077B5] text-white rounded-lg hover:bg-[#006699] transition-colors"
                >
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
                    />
                  </svg>
                  <span>LinkedIn</span>
                </a>
                <a
                  href="https://twitter.com/eduardomarqueso"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                    />
                  </svg>
                  <span>Twitter/X</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════════════════
         EN LOS MEDIOS - Press coverage (OCULTO hasta tener cobertura real)
         ═══════════════════════════════════════════════════════════════════════ -->
    <!-- TODO: Descomentar cuando haya menciones reales en medios
    <section class="py-20 bg-gray-900 text-white">
      ...
    </section>
    -->

    <!-- ═══════════════════════════════════════════════════════════════════════
         VALORES - Grid visual
         ═══════════════════════════════════════════════════════════════════════ -->
    <section class="py-20 bg-white">
      <div class="container mx-auto px-4">
        <div class="text-center mb-16">
          <h2 class="text-4xl font-black text-gray-900 mb-4">Nuestros Valores</h2>
          <p class="text-xl text-gray-600 max-w-2xl mx-auto">
            Los principios que guían cada decisión que tomamos
          </p>
        </div>

        <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          @for (value of values; track value.title) {
            <div
              class="group p-6 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100 hover:border-[#00d95f] hover:shadow-lg transition-all"
            >
              <div class="text-4xl mb-4">{{ value.icon }}</div>
              <h3 class="text-xl font-bold text-gray-900 mb-2">{{ value.title }}</h3>
              <p class="text-gray-600 text-sm leading-relaxed">{{ value.description }}</p>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════════════════
         DIFERENCIADORES - Por qué elegirnos
         ═══════════════════════════════════════════════════════════════════════ -->
    <section class="py-20 bg-gray-50">
      <div class="container mx-auto px-4">
        <div class="text-center mb-16">
          <h2 class="text-4xl font-black text-gray-900 mb-4">¿Por qué AutoRenta?</h2>
          <p class="text-xl text-gray-600 max-w-2xl mx-auto">
            Lo que nos diferencia de las rentadoras tradicionales
          </p>
        </div>

        <div class="max-w-5xl mx-auto">
          <div class="grid md:grid-cols-2 gap-8">
            <!-- AutoRenta -->
            <div
              class="bg-gradient-to-br from-[#00d95f] to-[#00bf54] rounded-2xl p-8 text-gray-900"
            >
              <div class="flex items-center gap-3 mb-6">
                <div class="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                  <img
                    src="/assets/images/logo-autorentar-v5.png"
                    alt="AutoRenta"
                    class="w-8 h-8 object-contain"
                  />
                </div>
                <span class="text-2xl font-black">AutoRenta</span>
              </div>
              <ul class="space-y-4">
                <li class="flex items-start gap-3">
                  <svg
                    class="w-6 h-6 text-green-700 shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  <span
                    ><strong>Sin tarjeta internacional</strong> - Aceptamos PIX, MercadoPago,
                    efectivo</span
                  >
                </li>
                <li class="flex items-start gap-3">
                  <svg
                    class="w-6 h-6 text-green-700 shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  <span><strong>Precios justos</strong> - Hasta 40% menos que rentadoras</span>
                </li>
                <li class="flex items-start gap-3">
                  <svg
                    class="w-6 h-6 text-green-700 shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  <span><strong>Seguro total</strong> - Cobertura AirCover incluida</span>
                </li>
                <li class="flex items-start gap-3">
                  <svg
                    class="w-6 h-6 text-green-700 shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  <span><strong>100% digital</strong> - Todo desde tu celular</span>
                </li>
              </ul>
            </div>

            <!-- Tradicional -->
            <div class="bg-white rounded-2xl p-8 border border-gray-200">
              <div class="flex items-center gap-3 mb-6 opacity-60">
                <div
                  class="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl"
                >
                  🏢
                </div>
                <span class="text-2xl font-black text-gray-400">Rentadoras Tradicionales</span>
              </div>
              <ul class="space-y-4 text-gray-500">
                <li class="flex items-start gap-3">
                  <svg
                    class="w-6 h-6 text-red-400 shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  <span>Requieren tarjeta de crédito internacional</span>
                </li>
                <li class="flex items-start gap-3">
                  <svg
                    class="w-6 h-6 text-red-400 shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  <span>Bloqueo de USD 500-1000 en tu tarjeta</span>
                </li>
                <li class="flex items-start gap-3">
                  <svg
                    class="w-6 h-6 text-red-400 shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  <span>Seguro extra con letras chicas</span>
                </li>
                <li class="flex items-start gap-3">
                  <svg
                    class="w-6 h-6 text-red-400 shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  <span>Largas filas y papelería</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════════════════
         CTA FINAL
         ═══════════════════════════════════════════════════════════════════════ -->
    <section class="py-20 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div class="container mx-auto px-4 text-center">
        <h2 class="text-4xl md:text-5xl font-black mb-6">
          ¿Listo para moverte<br />
          <span class="text-[#00d95f]"> a tu manera? </span>
        </h2>
        <p class="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
          Unite a miles de personas que ya disfrutan de la libertad de alquilar sin complicaciones.
        </p>

        <div class="flex flex-col sm:flex-row justify-center gap-4">
          <a
            routerLink="/cars/list"
            class="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#00d95f] text-gray-900 rounded-full font-bold text-lg hover:bg-[#00bf54] transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            Buscar autos
          </a>
          <a
            routerLink="/owner/rent-your-car"
            class="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 text-white border border-white/20 rounded-full font-bold text-lg hover:bg-white/20 transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Publicar tu auto
          </a>
        </div>

        <!-- Trust badges -->
        <div class="flex flex-wrap justify-center gap-8 mt-16 opacity-50">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd"
              />
            </svg>
            <span class="text-sm">Seguro incluido</span>
          </div>
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd"
              />
            </svg>
            <span class="text-sm">Usuarios verificados</span>
          </div>
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
              />
            </svg>
            <span class="text-sm">4.8/5 rating</span>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      /* Smooth scroll */
      :host ::ng-deep html {
        scroll-behavior: smooth;
      }
    `,
  ],
})
export class AboutPage {
  private http = inject(HttpClient);

  // Métricas en tiempo real desde el backend
  stats$ = this.http
    .get<PlatformStats>(`${environment.supabaseUrl}/functions/v1/public-investor-stats`)
    .pipe(
      map((data) => ({
        active_cars: data.active_cars || 28,
        total_users: data.total_users || 350,
        completed_trips: data.completed_trips || 120,
        cities: data.cities || 5,
      })),
      catchError(() =>
        of({
          active_cars: 28,
          total_users: 350,
          completed_trips: 120,
          cities: 5,
        }),
      ),
      shareReplay(1),
    );

  // Timeline de la empresa
  milestones: Milestone[] = [
    {
      date: '2020',
      title: 'AutaMedica nace',
      description:
        'Desde la UBA, Eduardo funda AutaMedica: plataforma de telemedicina con IA para eliminar la fricción en consultas médicas.',
      icon: '🏥',
    },
    {
      date: '2022',
      title: 'EcuCóndor - FinTech',
      description:
        'Junto a su novia ecuatoriana, crea la plataforma de cambio de divisas para migrantes latinos. +USD 200K transaccionados entre 2024-2025.',
      icon: '💱',
    },
    {
      date: '2026',
      title: 'AutoRenta lanza',
      description:
        'La experiencia personal de no poder alquilar autos sin tarjeta internacional se convierte en solución: alquiler P2P sin barreras.',
      icon: '🚗',
    },
    {
      date: 'Hoy',
      title: 'Ecosistema completo',
      description:
        'Tres empresas, un mismo ADN: eliminar fricciones con tecnología. Salud, finanzas y movilidad conectados.',
      icon: '🔗',
    },
  ];

  // Valores de la empresa
  values = [
    {
      icon: '🤝',
      title: 'Confianza',
      description:
        'Verificamos cada usuario, cada vehículo, cada transacción. Tu seguridad es nuestra prioridad.',
    },
    {
      icon: '🌱',
      title: 'Sustentabilidad',
      description:
        'Cada auto compartido es un auto menos estacionado. Optimizamos recursos existentes.',
    },
    {
      icon: '💡',
      title: 'Innovación',
      description:
        'Usamos IA para inspecciones, pagos instantáneos y la mejor experiencia de usuario.',
    },
    {
      icon: '❤️',
      title: 'Comunidad',
      description: 'No somos solo una app. Somos una red de personas ayudándose mutuamente.',
    },
  ];

  // Menciones en medios (preparado para cuando haya cobertura)
  // TODO: Actualizar cuando tengamos cobertura real
  mediaMentions: MediaMention[] = [
    // Descomentar cuando haya menciones reales:
    // {
    //   outlet: 'Forbes Argentina',
    //   logo: '/assets/images/press/forbes.svg',
    //   title: 'AutoRenta: La startup que democratiza el alquiler de autos',
    //   date: 'Febrero 2026',
    //   url: 'https://forbes.com.ar/...'
    // }
  ];
}
