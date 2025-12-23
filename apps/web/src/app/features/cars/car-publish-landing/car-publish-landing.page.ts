import { CommonModule } from '@angular/common';
import {Component,
  ChangeDetectionStrategy} from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  calculatorOutline,
  shieldCheckmark,
  cash,
  headset,
  trendingUp,
  locationOutline,
  cashOutline,
  carSport,
  lockClosed,
  scan,
  wallet
} from 'ionicons/icons';
import { EarningsCalculatorComponent } from '../../../shared/components/earnings-calculator/earnings-calculator.component';
import { FooterComponent } from '../../../shared/components/footer/footer.component';

@Component({
  selector: 'app-car-publish-landing',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonicModule, EarningsCalculatorComponent, FooterComponent],
  template: `
    <ion-content [fullscreen]="true" class="h-full bg-white">
      <!-- 1. HERO SECTION: "Secure Energy" -->
      <section class="relative bg-[#050505] text-white min-h-[85vh] flex items-center overflow-hidden">
        <!-- Abstract Tech Background -->
        <div class="absolute inset-0 z-0 opacity-40">
          <div class="absolute top-0 right-0 w-[800px] h-[800px] bg-accent-neon/10 rounded-full blur-[120px] -mr-40 -mt-40"></div>
          <div class="absolute bottom-0 left-0 w-[600px] h-[600px] bg-accent-safety/10 rounded-full blur-[100px] -ml-20 -mb-20"></div>
          <!-- Grid Overlay -->
          <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgNDBoNDBWMEgwVjQweiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utb3BhY2l0eT0iMC4wMyIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg==')] opacity-30"></div>
        </div>

        <div class="container mx-auto px-6 relative z-20 pt-20">
          <div class="max-w-4xl">
            <!-- Badge -->
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent-neon/30 bg-accent-neon/10 text-accent-neon text-xs font-bold uppercase tracking-widest mb-8 animate-fade-in-up">
              <span class="w-2 h-2 rounded-full bg-accent-neon animate-pulse"></span>
              Comunidad Verificada v2.1
            </div>

            <!-- Headline -->
            <h1 class="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight leading-[0.9] mb-8 animate-fade-in-up delay-100">
              Transformá tu auto <br />
              en un <span class="text-transparent bg-clip-text bg-gradient-to-r from-accent-neon to-emerald-400">ACTIVO.</span>
            </h1>

            <!-- Subhead -->
            <p class="text-xl sm:text-2xl text-gray-400 font-medium max-w-2xl mb-10 leading-relaxed animate-fade-in-up delay-200">
              Tu auto puede pagarse solo. Unite a la red de movilidad descentralizada más segura de Argentina.
            </p>

            <!-- CTAs -->
            <div class="flex flex-col sm:flex-row gap-5 animate-fade-in-up delay-300">
              <button (click)="goToForm()" 
                class="group relative bg-accent-neon text-black text-lg font-black py-5 px-10 rounded-xl overflow-hidden hover:scale-[1.02] transition-transform duration-200">
                <div class="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <span class="relative flex items-center gap-3">
                  PUBLICAR MI AUTO
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                </span>
              </button>
              
              <button (click)="scrollToCalculator()" 
                class="group bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md text-white text-lg font-bold py-5 px-10 rounded-xl transition-all flex items-center gap-3">
                <ion-icon name="calculator-outline" class="text-2xl text-accent-voltage"></ion-icon>
                Simular Ganancias
              </button>
            </div>

            <!-- Trust Signals (Hero Footer) -->
            <div class="mt-16 pt-8 border-t border-white/10 flex flex-wrap gap-8 md:gap-16 text-sm font-semibold text-gray-400 animate-fade-in-up delay-500">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-accent-safety/20 flex items-center justify-center text-accent-safety">
                  <ion-icon name="shield-checkmark" class="text-xl"></ion-icon>
                </div>
                <span>Seguro Todo Riesgo<br><span class="text-white">Sura / Rivadavia</span></span>
              </div>
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-accent-voltage/20 flex items-center justify-center text-accent-voltage">
                  <ion-icon name="scan" class="text-xl"></ion-icon>
                </div>
                <span>Identidad Validada<br><span class="text-white">Biometría Facial</span></span>
              </div>
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <ion-icon name="wallet" class="text-xl"></ion-icon>
                </div>
                <span>Pagos Garantizados<br><span class="text-white">Mercado Pago</span></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 2. PROFIT CALCULATOR (Clean Section) -->
      <section id="calculator" class="py-24 bg-white relative">
        <div class="container mx-auto px-6">
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
            <div class="lg:col-span-5">
              <span class="text-accent-neon-dark font-black tracking-widest text-sm uppercase mb-4 block">Simulador de Negocio</span>
              <h2 class="text-4xl md:text-6xl font-black text-black mb-6 leading-tight">
                ¿Cuánto rinde<br>tu máquina?
              </h2>
              <p class="text-xl text-gray-500 mb-8 leading-relaxed">
                Dejá de ver tu auto como un gasto. Empezá a verlo como un negocio.
                Los vehículos activos en plataforma cubren el 100% de sus costos fijos.
              </p>
              
              <!-- Stat Card -->
              <div class="bg-surface-secondary p-6 rounded-2xl border border-gray-100">
                <div class="flex items-end gap-2 mb-2">
                  <span class="text-5xl font-black text-black">48</span>
                  <span class="text-lg font-bold text-gray-500 mb-2">meses</span>
                </div>
                <p class="text-sm font-medium text-gray-600">Tiempo promedio para recuperar el valor total del auto alquilándolo full-time.</p>
              </div>
            </div>

            <div class="lg:col-span-7">
              <div class="bg-white rounded-3xl shadow-2xl shadow-gray-200/50 p-2 border border-gray-100 transform hover:-translate-y-2 transition-transform duration-500">
                <app-earnings-calculator></app-earnings-calculator>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 3. HOW IT WORKS (Minimal Process) -->
      <section class="py-24 bg-surface-secondary border-t border-gray-200">
        <div class="container mx-auto px-6">
          <div class="text-center max-w-3xl mx-auto mb-20">
            <h2 class="text-3xl md:text-5xl font-black text-black mb-6">Tu negocio en 3 pasos</h2>
            <p class="text-xl text-gray-500">Sin burocracia. Sin letra chica. Tecnología pura.</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-12">
            <!-- Step 1 -->
            <div class="relative group">
              <div class="absolute -top-10 -left-6 text-[180px] font-black text-gray-200/50 select-none z-0 group-hover:text-accent-neon/20 transition-colors">1</div>
              <div class="relative z-10 pt-10">
                <h3 class="text-2xl font-bold mb-4 text-black group-hover:text-accent-neon-dark transition-colors">Digitalizá tu Activo</h3>
                <p class="text-gray-600 leading-relaxed text-lg">
                  Cargá fotos y definí tus reglas. Nuestra IA sugiere el precio óptimo para maximizar ocupación.
                </p>
              </div>
            </div>

            <!-- Step 2 -->
            <div class="relative group">
              <div class="absolute -top-10 -left-6 text-[180px] font-black text-gray-200/50 select-none z-0 group-hover:text-accent-neon/20 transition-colors">2</div>
              <div class="relative z-10 pt-10">
                <h3 class="text-2xl font-bold mb-4 text-black group-hover:text-accent-neon-dark transition-colors">Aprobá Solicitudes</h3>
                <p class="text-gray-600 leading-relaxed text-lg">
                  Recibí pedidos de conductores verificados. Vos tenés el control total: aceptá solo lo que te cierre.
                </p>
              </div>
            </div>

            <!-- Step 3 -->
            <div class="relative group">
              <div class="absolute -top-10 -left-6 text-[180px] font-black text-gray-200/50 select-none z-0 group-hover:text-accent-neon/20 transition-colors">3</div>
              <div class="relative z-10 pt-10">
                <h3 class="text-2xl font-bold mb-4 text-black group-hover:text-accent-neon-dark transition-colors">Facturá Automático</h3>
                <p class="text-gray-600 leading-relaxed text-lg">
                  El dinero se libera automáticamente al finalizar el viaje. Directo a tu cuenta, sin vueltas.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 4. TRUST & SAFETY (Safety Blue Theme) -->
      <section class="py-24 bg-accent-safety relative overflow-hidden text-white">
        <div class="absolute top-0 right-0 w-full h-full bg-[url('assets/images/pattern-grid.svg')] opacity-10"></div>
        
        <div class="container mx-auto px-6 relative z-10">
          <div class="flex flex-col md:flex-row gap-16 items-center">
            <div class="flex-1">
              <div class="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full backdrop-blur-sm border border-white/20 mb-8">
                <ion-icon name="shield-checkmark" class="text-accent-neon"></ion-icon>
                <span class="font-bold text-sm tracking-wide">ECOSISTEMA SEGURO</span>
              </div>
              <h2 class="text-4xl md:text-6xl font-black mb-8 leading-tight">
                Dormí tranquilo.<br>
                Nosotros nos ocupamos.
              </h2>
              <p class="text-xl text-blue-100/90 leading-relaxed mb-10 max-w-xl">
                Nuestra tecnología de prevención de fraude y alianzas con aseguradoras líderes protegen tu capital 24/7.
              </p>
              
              <ul class="space-y-6">
                <li class="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                  <div class="w-12 h-12 rounded-full bg-accent-neon flex items-center justify-center shrink-0 shadow-lg shadow-accent-neon/20">
                    <ion-icon name="car-sport" class="text-black text-2xl"></ion-icon>
                  </div>
                  <div>
                    <h4 class="font-bold text-lg">Cobertura Total</h4>
                    <p class="text-sm text-blue-100">Daños, robo y responsabilidad civil hasta $50M.</p>
                  </div>
                </li>
                <li class="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                  <div class="w-12 h-12 rounded-full bg-accent-neon flex items-center justify-center shrink-0 shadow-lg shadow-accent-neon/20">
                    <ion-icon name="finger-print" class="text-black text-2xl"></ion-icon>
                  </div>
                  <div>
                    <h4 class="font-bold text-lg">Scoring de Conductores</h4>
                    <p class="text-sm text-blue-100">IA detecta comportamientos de riesgo antes del alquiler.</p>
                  </div>
                </li>
              </ul>
            </div>
            
            <div class="flex-1 w-full relative">
              <!-- Visual element (Shield/App mockup) could go here -->
              <div class="aspect-square rounded-[3rem] bg-gradient-to-tr from-white/10 to-white/5 backdrop-blur-2xl border border-white/20 flex items-center justify-center relative shadow-2xl">
                 <div class="text-center p-10">
                    <ion-icon name="lock-closed" class="text-9xl text-white/20 mb-6"></ion-icon>
                    <h3 class="text-3xl font-bold mb-2">Protección Blindada</h3>
                    <p class="text-blue-100">Tu activo es nuestra prioridad #1</p>
                 </div>
                 <!-- Decorative Badge -->
                 <div class="absolute -bottom-6 -right-6 bg-accent-neon text-black p-6 rounded-2xl shadow-xl transform rotate-6">
                    <span class="block text-xs font-bold uppercase tracking-wider opacity-70">Soporte</span>
                    <span class="block text-4xl font-black">24/7</span>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 5. SOCIAL PROOF (Community) -->
      <section class="py-24 bg-white">
        <div class="container mx-auto px-6">
          <div class="text-center mb-16">
            <h2 class="text-3xl md:text-5xl font-black text-black">Ellos ya están facturando</h2>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            @for (testimonial of testimonials; track testimonial.id) {
              <div class="group bg-surface-secondary rounded-[2rem] p-8 hover:bg-black hover:text-white transition-all duration-300 cursor-default">
                <div class="flex items-center gap-4 mb-6">
                  <img [src]="testimonial.avatar" class="w-14 h-14 rounded-full border-2 border-white object-cover" [alt]="testimonial.name">
                  <div>
                    <h4 class="font-bold text-lg leading-tight">{{ testimonial.name }}</h4>
                    <p class="text-sm text-gray-500 group-hover:text-gray-400">{{ testimonial.location }}</p>
                  </div>
                </div>
                <p class="text-lg font-medium leading-relaxed mb-8 text-gray-600 group-hover:text-gray-300">
                  "{{ testimonial.quote }}"
                </p>
                <div class="pt-6 border-t border-gray-200 group-hover:border-gray-800 flex justify-between items-center">
                  <span class="text-xs font-bold uppercase tracking-widest text-gray-400">Ganancia Mes</span>
                  <span class="text-xl font-black text-accent-neon-dark group-hover:text-accent-neon">$ {{ testimonial.earnings | number }}</span>
                </div>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- 6. FINAL CTA (High Voltage) -->
      <section class="py-32 bg-[#050505] text-center relative overflow-hidden">
        <div class="absolute inset-0 bg-accent-neon/5"></div>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent-neon/20 rounded-full blur-[150px]"></div>
        
        <div class="container mx-auto px-6 relative z-10">
          <h2 class="text-5xl md:text-7xl font-black text-white mb-8 tracking-tight">
            ¿Tu auto está parado?<br>
            <span class="text-accent-neon">Estás perdiendo plata.</span>
          </h2>
          <p class="text-2xl text-gray-400 mb-12 max-w-2xl mx-auto">
            Publicar es gratis. La tecnología es nuestra. La ganancia es tuya.
          </p>
          
          <div class="flex flex-col sm:flex-row justify-center gap-4">
            <button
              type="button"
              (click)="goToForm()"
              class="inline-flex items-center justify-center gap-3 rounded-xl bg-accent-neon px-10 py-4 text-base font-black text-black hover:brightness-95 transition"
            >
              Publicar mi auto
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </button>

            <button
              type="button"
              (click)="scrollToCalculator()"
              class="inline-flex items-center justify-center gap-3 rounded-xl border border-white/15 bg-white/5 px-10 py-4 text-base font-bold text-white hover:bg-white/10 transition"
            >
              <ion-icon name="calculator-outline" class="text-xl text-accent-voltage"></ion-icon>
              Simular ganancias
            </button>
          </div>
          
          <p class="mt-8 text-sm text-gray-500 font-medium">
            <ion-icon name="lock-closed" class="align-middle mr-1"></ion-icon>
            Sin costos ocultos • Cancelá cuando quieras
          </p>
        </div>
      </section>

      <app-footer class="hidden md:block bg-black text-white border-t border-white/10"></app-footer>
    </ion-content>
  `,
  styles: [`
    :host {
      display: block;
    }
    .animate-fade-in-up {
      animation: fadeInUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
      opacity: 0;
      transform: translateY(20px);
    }
    .delay-100 { animation-delay: 0.1s; }
    .delay-200 { animation-delay: 0.2s; }
    .delay-300 { animation-delay: 0.3s; }
    .delay-500 { animation-delay: 0.5s; }
    
    @keyframes fadeInUp {
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class CarPublishLandingPage {
  testimonials = [
    {
      id: 1,
      name: 'Martín Rodríguez',
      location: 'Palermo, CABA',
      photo: 'assets/images/camaro-preview.jpg',
      avatar: 'assets/images/default-avatar.svg',
      quote: 'Era escéptico al principio, pero el sistema de verificación me dio seguridad. Hoy el auto paga sus propios gastos y me deja ganancia.',
      earnings: 420000
    },
    {
      id: 2,
      name: 'Carolina Fernández',
      location: 'Recoleta, CABA',
      photo: 'assets/images/camaro-preview-v2.jpg',
      avatar: 'assets/images/default-avatar.svg',
      quote: 'Viajo mucho por trabajo y el auto quedaba juntando polvo. Ahora cada vez que viajo, el auto trabaja. Es una ecuación perfecta.',
      earnings: 280000
    },
    {
      id: 3,
      name: 'Lucas Gómez',
      location: 'San Isidro, GBA',
      photo: 'assets/images/hero-car.webp',
      avatar: 'assets/images/default-avatar.svg',
      quote: 'Compré un segundo auto como inversión para AutoRenta. El retorno es superior a un alquiler inmobiliario tradicional.',
      earnings: 380000
    }
  ];

  constructor(private router: Router) {
    addIcons({
      calculatorOutline,
      shieldCheckmark,
      cash,
      headset,
      trendingUp,
      locationOutline,
      cashOutline,
      carSport,
      lockClosed,
      scan,
      wallet
    });
  }

  scrollToCalculator() {
    const element = document.getElementById('calculator');
    element?.scrollIntoView({ behavior: 'smooth' });
  }

  goToForm() {
    this.router.navigate(['/cars/publish']);
  }
}
