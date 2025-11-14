import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { TopBarV2Component } from './top-bar.component';
import { BottomNavV2Component } from './bottom-nav.component';

type ExperienceMood = 'sunrise' | 'day' | 'sunset' | 'night';

interface HeroMetric {
  label: string;
  value: string;
  delta: string;
  trend: 'up' | 'down';
}

interface QuickAction {
  label: string;
  description: string;
  accent: string;
}

interface TripSummary {
  guest: string;
  eta: string;
  car: string;
  progress: number;
}

/**
 * Mobile Shell V3
 * Futuristic mobile dashboard with AI concierge blocks, glass panels and live stats.
 *
 * Goals:
 * - Showcase how V2 components can evolve into a premium host hub
 * - Highlight dynamic gradients (time-based) and optimistic UI patterns
 * - Keep compatibility with RouterOutlet so it can wrap any flow
 */
@Component({
  selector: 'app-mobile-shell-v3',
  standalone: true,
  imports: [CommonModule, RouterOutlet, TopBarV2Component, BottomNavV2Component],
  template: `
    <div class="mobile-shell-v3" [class.dark]="darkMode()">
      <!-- Fixed Navigation -->
      <app-top-bar-v2
        [title]="pageTitle()"
        [transparent]="true"
        [elevated]="false"
        [showMenu]="true"
        [showSearch]="true"
        [showMore]="true"
        (searchClick)="syncNow()"
        (moreClick)="cycleExperience()"
      />

      <!-- Hero Gradient -->
      <section class="hero" [style.background]="currentGradient()">
        <div class="hero-content">
          <p class="eyebrow">{{ greeting() }} · {{ currentCity() }}</p>
          <h1 class="headline">{{ heroHeadline() }}</h1>
          <p class="subtitle">
            Concierge AI monitorea {{ heroMetrics().length }} KPIs y te avisa si algo se sale de rango.
          </p>

          <div class="hero-actions">
            <button type="button" class="hero-btn primary" (click)="syncNow()">
              Sincronizar ahora
            </button>
            <button type="button" class="hero-btn ghost" (click)="cycleExperience()">
              Cambiar mood
            </button>
          </div>
        </div>

        <div class="hero-widget">
          <span class="hero-tag">Modo {{ experienceMood() }}</span>
          <strong>{{ aiStatus() }}</strong>
          <small>Próxima actualización en {{ nextSync() }}</small>
        </div>
      </section>

      <!-- Metric Pills -->
      <section class="metrics">
        @for (metric of heroMetrics(); track metric.label) {
          <article class="metric-card">
            <header>
              <span>{{ metric.label }}</span>
              <button type="button" class="ghost-icon" (click)="highlightMetric(metric.label)">
                <span aria-hidden="true">•••</span>
                <span class="sr-only">Opciones de {{ metric.label }}</span>
              </button>
            </header>
            <div class="metric-value">{{ metric.value }}</div>
            <div class="metric-delta" [class.positive]="metric.trend === 'up'" [class.negative]="metric.trend === 'down'">
              {{ metric.delta }}
            </div>
          </article>
        }
      </section>

      <!-- Quick Actions -->
      <section class="quick-actions">
        <h2>Atajos predictivos</h2>
        <div class="quick-grid">
          @for (action of quickActions(); track action.label) {
            <button type="button" class="quick-card" [style.border-color]="action.accent" (click)="triggerAction(action.label)">
              <span class="quick-label">{{ action.label }}</span>
              <span class="quick-desc">{{ action.description }}</span>
              <span class="quick-pulse" [style.background]="action.accent"></span>
            </button>
          }
        </div>
      </section>

      <!-- Trips Timeline -->
      <section class="trip-card">
        <div class="trip-header">
          <div>
            <p class="trip-label">Próximo check-in</p>
            <strong>{{ featuredTrip().guest }}</strong>
          </div>
          <span class="trip-eta">{{ featuredTrip().eta }}</span>
        </div>

        <p class="trip-meta">{{ featuredTrip().car }}</p>
        <div class="progress-track">
          <div class="progress-fill" [style.width.%]="featuredTrip().progress"></div>
        </div>
        <p class="trip-footnote">
          Concierge bloqueó horarios, verificó documentos y sincronizó calendario automáticamente.
        </p>
      </section>

      <!-- Content Slot -->
      <main class="content">
        <router-outlet />
        <ng-content />
      </main>

      @if (showBottomNav()) {
        <app-bottom-nav-v2 />
      }
    </div>
  `,
  styles: [`
    .mobile-shell-v3 {
      min-height: 100vh;
      background: radial-gradient(circle at top, #f9fafb 0%, #e5e7eb 100%);
      color: #0f172a;
      padding-bottom: calc(60px + env(safe-area-inset-bottom));
    }

    .mobile-shell-v3.dark {
      background: radial-gradient(circle at top, #020617 0%, #0f172a 100%);
      color: #f8fafc;
    }

    .hero {
      position: relative;
      padding: 5.5rem 1.5rem 2.5rem;
      margin: 0 1rem;
      border-radius: 2rem;
      box-shadow: 0 20px 60px rgba(15, 23, 42, 0.2);
      overflow: hidden;
    }

    .hero::after {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.35), transparent 60%);
      pointer-events: none;
    }

    .hero-content {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .eyebrow {
      text-transform: uppercase;
      letter-spacing: 0.2em;
      font-size: 0.75rem;
      margin: 0;
      opacity: 0.8;
    }

    .headline {
      font-size: 1.9rem;
      margin: 0;
      line-height: 1.2;
    }

    .subtitle {
      margin: 0;
      opacity: 0.9;
    }

    .hero-actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .hero-btn {
      border-radius: 999px;
      padding: 0.65rem 1.5rem;
      border: none;
      font-weight: 600;
      -webkit-tap-highlight-color: transparent;
    }

    .hero-btn.primary {
      background: rgba(15, 23, 42, 0.85);
      color: white;
    }

    .hero-btn.ghost {
      background: rgba(255, 255, 255, 0.2);
      color: inherit;
      border: 1px solid rgba(255, 255, 255, 0.4);
    }

    .hero-widget {
      position: absolute;
      right: 1.5rem;
      bottom: 1.5rem;
      padding: 1rem 1.25rem;
      border-radius: 1rem;
      background: rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(20px);
      color: #0f172a;
      text-align: right;
      z-index: 1;
    }

    .mobile-shell-v3.dark .hero-widget {
      color: white;
      background: rgba(15, 23, 42, 0.5);
    }

    .hero-tag {
      display: inline-flex;
      padding: 0.2rem 0.75rem;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.25);
      font-size: 0.75rem;
      margin-bottom: 0.25rem;
    }

    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 1rem;
      margin: 1.5rem 1rem 0;
    }

    .metric-card {
      padding: 1rem;
      border-radius: 1.25rem;
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(16px);
      box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.05);
    }

    .mobile-shell-v3.dark .metric-card {
      background: rgba(15, 23, 42, 0.7);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
    }

    .metric-card header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.85rem;
      opacity: 0.8;
      margin-bottom: 0.35rem;
    }

    .ghost-icon {
      border: none;
      background: transparent;
      font-size: 1.25rem;
      color: inherit;
      opacity: 0.5;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      border: 0;
    }

    .metric-value {
      font-size: 1.5rem;
      font-weight: 700;
    }

    .metric-delta {
      font-size: 0.85rem;
      color: #475569;
    }

    .metric-delta.positive {
      color: #10b981;
    }

    .metric-delta.negative {
      color: #f87171;
    }

    .quick-actions {
      margin: 2rem 1rem 0;
    }

    .quick-actions h2 {
      font-size: 1rem;
      margin-bottom: 0.75rem;
    }

    .quick-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 0.75rem;
    }

    .quick-card {
      border-radius: 1rem;
      padding: 0.9rem;
      border: 1px solid transparent;
      background: rgba(255, 255, 255, 0.65);
      text-align: left;
      position: relative;
      overflow: hidden;
    }

    .mobile-shell-v3.dark .quick-card {
      background: rgba(15, 23, 42, 0.65);
    }

    .quick-label {
      display: block;
      font-weight: 600;
    }

    .quick-desc {
      display: block;
      font-size: 0.85rem;
      opacity: 0.8;
    }

    .quick-pulse {
      position: absolute;
      inset: 0 auto auto 0;
      width: 6px;
      height: 100%;
      opacity: 0.45;
    }

    .trip-card {
      margin: 2rem 1rem 0;
      padding: 1.25rem;
      border-radius: 1.5rem;
      background: rgba(15, 23, 42, 0.9);
      color: white;
      box-shadow: 0 20px 40px rgba(15, 23, 42, 0.3);
    }

    .mobile-shell-v3.dark .trip-card {
      background: rgba(248, 250, 252, 0.1);
    }

    .trip-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .trip-label {
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      font-size: 0.7rem;
      opacity: 0.75;
    }

    .trip-eta {
      font-weight: 600;
    }

    .trip-meta {
      margin: 0.5rem 0;
      opacity: 0.85;
    }

    .progress-track {
      width: 100%;
      height: 8px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.2);
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #34d399, #06b6d4);
    }

    .trip-footnote {
      font-size: 0.85rem;
      margin-top: 0.75rem;
      opacity: 0.8;
    }

    .content {
      padding: 2rem 1rem 4rem;
    }

    @media (min-width: 768px) {
      .mobile-shell-v3 {
        max-width: 420px;
        margin: 0 auto;
        border-radius: 2.5rem;
        overflow: hidden;
      }
    }
  `]
})
export class MobileShellV3Component {
  pageTitle = signal('Panel Inteligente');
  experienceMood = signal<ExperienceMood>(this.getMoodFromTime());
  aiStatus = signal('Concierge listo');
  nextSync = signal('2 min');
  currentCity = signal('Palermo, BA');
  showBottomNav = signal(true);

  private readonly gradients: Record<ExperienceMood, string> = {
    sunrise: 'linear-gradient(135deg, #FDBB2D 0%, #22C1C3 100%)',
    day: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%)',
    sunset: 'linear-gradient(135deg, #FF512F 0%, #DD2476 100%)',
    night: 'linear-gradient(135deg, #0f172a 0%, #312e81 50%, #581c87 100%)',
  };

  heroMetrics = signal<HeroMetric[]>([
    { label: 'Autos live', value: '124', delta: '+12 vs ayer', trend: 'up' },
    { label: 'Respuestas 5min', value: '92%', delta: '+6%', trend: 'up' },
    { label: 'Wallet hoy', value: '$184k', delta: '-$12k', trend: 'down' },
    { label: 'Check-ins en curso', value: '3', delta: '+1 ahora', trend: 'up' },
  ]);

  quickActions = signal<QuickAction[]>([
    { label: 'Auto nuevo', description: 'Publicar en 45s', accent: '#34d399' },
    { label: 'Revisión IA', description: 'Fotos y pricing', accent: '#f472b6' },
    { label: 'Bloquear calendario', description: 'Vacaciones', accent: '#38bdf8' },
  ]);

  featuredTrip = signal<TripSummary>({
    guest: 'Claudia · Viaje Ejecutivo',
    eta: 'Check-in 12:45',
    car: 'Tesla Model 3 · 92% batería',
    progress: 68,
  });

  darkMode = computed(() => this.experienceMood() === 'night');
  currentGradient = computed(() => this.gradients[this.experienceMood()]);
  greeting = computed(() => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Buenos días';
    if (hours < 19) return 'Buenas tardes';
    return 'Buenas noches';
  });

  heroHeadline = computed(() => {
    switch (this.experienceMood()) {
      case 'sunrise':
        return 'Prepárate para la mañana más ocupada';
      case 'day':
        return 'Altísima demanda en este momento';
      case 'sunset':
        return 'Cierra el día sin pendientes';
      case 'night':
      default:
        return 'Modo noche: Concierge mantiene todo en órden';
    }
  });

  private getMoodFromTime(): ExperienceMood {
    const hour = new Date().getHours();
    if (hour < 10) return 'sunrise';
    if (hour < 17) return 'day';
    if (hour < 21) return 'sunset';
    return 'night';
  }

  cycleExperience(): void {
    const rotation: ExperienceMood[] = ['sunrise', 'day', 'sunset', 'night'];
    const currentIndex = rotation.indexOf(this.experienceMood());
    const nextMood = rotation[(currentIndex + 1) % rotation.length];
    this.experienceMood.set(nextMood);
    this.nextSync.set('1 min');

    // Animate metrics to simulate predictive updates
    this.heroMetrics.update(metrics =>
      metrics.map(metric => {
        const randomDrift = Math.round(Math.random() * 8) - 4;
        const trend = randomDrift >= 0 ? 'up' : 'down';
        const sign = trend === 'up' ? '+' : '-';
        const suffix = metric.value.includes('%') ? '%' : '';
        return {
          ...metric,
          delta: `${sign}${Math.abs(randomDrift)}${suffix}`,
          trend,
        };
      })
    );
  }

  syncNow(): void {
    this.aiStatus.set('Sincronizando...');
    this.nextSync.set('En vivo');

    setTimeout(() => {
      this.aiStatus.set('Concierge actualizado');
      this.nextSync.set('3 min');
      this.featuredTrip.update(trip => ({
        ...trip,
        progress: Math.min(100, trip.progress + 8),
      }));
    }, 750);
  }

  highlightMetric(metricLabel: string): void {
    this.aiStatus.set(`AI monitoreando ${metricLabel}`);
    setTimeout(() => this.aiStatus.set('Concierge listo'), 1200);
  }

  triggerAction(actionLabel: string): void {
    this.aiStatus.set(`Ejecutando "${actionLabel}"`);
    setTimeout(() => {
      this.aiStatus.set('Concierge listo');
      this.nextSync.set('30s');
    }, 900);
  }
}
