import { Component, OnDestroy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { BottomNavV2Component } from './bottom-nav.component';
import { ButtonV2Component } from '../ui/button.component';
import { ChipComponent } from '../ui/chip.component';

type AiMode = 'guardian' | 'boost' | 'stealth';

interface Insight {
  title: string;
  detail: string;
  impact: string;
  positive: boolean;
}

interface NeuralMetric {
  label: string;
  value: string;
  badge: string;
}

interface TimelineItem {
  label: string;
  eta: string;
  status: 'done' | 'in-progress' | 'pending';
}

/**
 * Mobile Shell V4
 * Experimental shell that imagines cómo se vería "Movel" en una versión neural + AI first.
 * Incluye:
 * - Modos dinámicos (guardian/boost/stealth) que cambian el tema
 * - Insights rotativos y timeline predictivo
 * - Slots para contenido real vía RouterOutlet o ng-content
 */
@Component({
  selector: 'app-mobile-shell-v4',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    BottomNavV2Component,
    ButtonV2Component,
    ChipComponent,
  ],
  template: `
    <div class="mobile-shell-v4" [class.dark]="darkMode()">
      <!-- Neural Header -->
      <section class="neural-header">
        <div class="mode-pill" (click)="cycleMode()">
          Movel V4 - Modo {{ aiModeLabel() }}
        </div>
        <h1>Concierge hiper-personalizado</h1>
        <p>
          GPT-5.1 resume señales de pricing, demanda y seguridad para anticiparse a cada viaje.
        </p>

        <div class="metric-grid">
          @for (metric of aiMetrics(); track metric.label) {
            <article class="metric-pod">
              <span class="metric-label">{{ metric.label }}</span>
              <strong>{{ metric.value }}</strong>
              <span class="metric-badge">{{ metric.badge }}</span>
            </article>
          }
        </div>

        <div class="header-cta">
          <app-button-v2 size="sm" (clicked)="generatePlan()">
            Generar plan de hoy
          </app-button-v2>
          <app-button-v2 variant="ghost" size="sm" (clicked)="shareSnapshot()">
            Compartir snapshot
          </app-button-v2>
        </div>
      </section>

      <!-- Live Insights -->
      <section class="insights">
        <header>
          <p>Insights generados por GPT-5.1</p>
          <button type="button" (click)="rotateInsight()">Próximo insight -></button>
        </header>

        <article class="insight-card" [class.positive]="activeInsight().positive">
          <span class="insight-impact">{{ activeInsight().impact }}</span>
          <h3>{{ activeInsight().title }}</h3>
          <p>{{ activeInsight().detail }}</p>
        </article>
      </section>

      <!-- Predictive Timeline -->
      <section class="timeline">
        <h2>Timeline predictivo</h2>
        <ol>
          @for (event of timeline(); track event.label) {
            <li [class]="event.status">
              <div class="dot"></div>
              <div>
                <p class="label">{{ event.label }}</p>
                <span class="eta">{{ event.eta }}</span>
              </div>
            </li>
          }
        </ol>
      </section>

      <!-- Filters / Chips -->
      <section class="filters">
        <h3>Filtros rápidos</h3>
        <div class="chip-row">
          @for (preset of presets(); track preset) {
            <app-chip
              [label]="preset"
              variant="filled"
              color="primary"
              [active]="activePreset() === preset"
              (clicked)="setPreset(preset)"
            />
          }
        </div>
      </section>

      <!-- Content -->
      <main class="content">
        <router-outlet />
        <ng-content />
      </main>

      <app-bottom-nav-v2 />
    </div>
  `,
  styles: [`
    .mobile-shell-v4 {
      min-height: 100vh;
      background: radial-gradient(circle at 10% 20%, #fdf2f8 0%, #e0f2fe 50%, #eef2ff 100%);
      padding: 1.25rem 1.25rem 5rem;
      color: #0f172a;
      transition: background 0.6s ease;
    }

    .mobile-shell-v4.dark {
      background: radial-gradient(circle at 10% 20%, #0f172a 0%, #1e293b 50%, #020617 100%);
      color: #f8fafc;
    }

    .neural-header {
      padding: 4.5rem 1.25rem 2rem;
      border-radius: 2rem;
      background: rgba(255, 255, 255, 0.75);
      box-shadow: 0 20px 60px rgba(15, 23, 42, 0.18);
      backdrop-filter: blur(18px);
    }

    .mobile-shell-v4.dark .neural-header {
      background: rgba(2, 6, 23, 0.75);
      box-shadow: 0 20px 60px rgba(2, 6, 23, 0.5);
    }

    .mode-pill {
      display: inline-flex;
      padding: 0.4rem 1rem;
      border-radius: 999px;
      border: 1px solid rgba(15, 23, 42, 0.15);
      font-size: 0.8rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .neural-header h1 {
      margin: 0.75rem 0 0.35rem;
      font-size: 2rem;
    }

    .metric-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 0.75rem;
      margin-top: 1.25rem;
    }

    .metric-pod {
      border-radius: 1.25rem;
      padding: 1rem;
      background: rgba(248, 250, 252, 0.9);
      border: 1px solid rgba(15, 23, 42, 0.05);
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .mobile-shell-v4.dark .metric-pod {
      background: rgba(15, 23, 42, 0.8);
      border-color: rgba(248, 250, 252, 0.05);
    }

    .metric-label {
      font-size: 0.8rem;
      letter-spacing: 0.08em;
      opacity: 0.7;
    }

    .metric-badge {
      font-size: 0.75rem;
      font-weight: 600;
      color: #10b981;
    }

    .header-cta {
      margin-top: 1.25rem;
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .insights {
      margin-top: 2rem;
    }

    .insights header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.9rem;
    }

    .insights header button {
      border: none;
      background: transparent;
      color: inherit;
      font-weight: 600;
    }

    .insight-card {
      margin-top: 0.75rem;
      padding: 1.25rem;
      border-radius: 1.5rem;
      background: rgba(15, 23, 42, 0.9);
      color: white;
      box-shadow: 0 20px 40px rgba(15, 23, 42, 0.25);
    }

    .insight-card.positive {
      background: linear-gradient(135deg, #0ea5e9, #22d3ee);
    }

    .insight-impact {
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.2em;
    }

    .timeline {
      margin-top: 2rem;
      padding: 1.25rem;
      border-radius: 1.5rem;
      background: rgba(255, 255, 255, 0.85);
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
    }

    .mobile-shell-v4.dark .timeline {
      background: rgba(15, 23, 42, 0.8);
    }

    .timeline ol {
      list-style: none;
      margin: 1rem 0 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .timeline li {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.75rem;
      align-items: center;
    }

    .timeline .dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #cbd5f5;
    }

    .timeline li.in-progress .dot {
      animation: pulse 1.4s infinite;
      background: #22d3ee;
    }

    .timeline li.done .dot {
      background: #10b981;
    }

    .filters {
      margin-top: 2rem;
    }

    .chip-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .content {
      margin-top: 2.5rem;
    }

    @media (min-width: 768px) {
      .mobile-shell-v4 {
        max-width: 420px;
        margin: 0 auto;
        border-radius: 3rem;
      }
    }

    @keyframes pulse {
      0% { transform: scale(0.95); opacity: 0.6; }
      50% { transform: scale(1.1); opacity: 1; }
      100% { transform: scale(0.95); opacity: 0.6; }
    }
  `]
})
export class MobileShellV4Component implements OnDestroy {
  aiMode = signal<AiMode>('guardian');
  activePreset = signal('Modo seguro');
  aiMetrics = signal<NeuralMetric[]>([
    { label: 'Autos activos', value: '148', badge: '+6 hoy' },
    { label: 'Salud de flota', value: '97%', badge: 'Perfecto' },
    { label: 'Tiempo de respuesta', value: '58s', badge: '-12s' },
  ]);

  presets = signal(['Modo seguro', 'Alta demanda', 'Weekend boost']);

  aiInsights = signal<Insight[]>([
    {
      title: 'Demanda nocturna creciendo',
      detail: 'El 65% de las consultas llegan después de las 20h. Activa precios dinámicos para capturar demanda.',
      impact: '+3.1% ingresos',
      positive: true,
    },
    {
      title: 'Fotos desactualizadas',
      detail: '2 autos llevan 90 días sin nuevas fotos. El algoritmo bajará su visibilidad si no lo corriges.',
      impact: '-6 puestos ranking',
      positive: false,
    },
    {
      title: 'SLA impecable',
      detail: 'Últimas 48h con respuestas en <1 minuto. Concierge puede activar auto-aprobaciones.',
      impact: '+4 reservas inmediatas',
      positive: true,
    },
  ]);

  timeline = signal<TimelineItem[]>([
    { label: 'Sincronizar calendarios externos', eta: 'Ahora', status: 'done' },
    { label: 'Recordatorio de check-in', eta: '12:15', status: 'in-progress' },
    { label: 'Apertura remota', eta: '12:42', status: 'pending' },
    { label: 'Revisión IA de daños', eta: '13:10', status: 'pending' },
  ]);

  activeInsightIndex = signal(0);
  darkMode = computed(() => this.aiMode() === 'stealth');

  private insightTimer?: ReturnType<typeof setInterval>;

  constructor() {
    this.insightTimer = setInterval(() => this.rotateInsight(), 6000);
  }

  ngOnDestroy(): void {
    if (this.insightTimer) {
      clearInterval(this.insightTimer);
    }
  }

  aiModeLabel(): string {
    switch (this.aiMode()) {
      case 'guardian':
        return 'Guardian';
      case 'boost':
        return 'Boost';
      case 'stealth':
      default:
        return 'Stealth';
    }
  }

  activeInsight(): Insight {
    return this.aiInsights()[this.activeInsightIndex()];
  }

  cycleMode(): void {
    const order: AiMode[] = ['guardian', 'boost', 'stealth'];
    const currentIndex = order.indexOf(this.aiMode());
    const next = order[(currentIndex + 1) % order.length];
    this.aiMode.set(next);

    // Update header metrics to reinforce mood
    this.aiMetrics.update(metrics =>
      metrics.map(metric => ({
        ...metric,
        badge: next === 'boost' ? '+ demanda' : next === 'stealth' ? 'monitor' : metric.badge,
      }))
    );
  }

  rotateInsight(): void {
    this.activeInsightIndex.update(idx => (idx + 1) % this.aiInsights().length);
  }

  setPreset(preset: string): void {
    this.activePreset.set(preset);
    this.timeline.update(items =>
      items.map(item =>
        item.status === 'pending'
          ? { ...item, eta: preset === 'Alta demanda' ? 'Ahora' : item.eta }
          : item
      )
    );
  }

  generatePlan(): void {
    this.aiInsights.update(list => [
      {
        title: 'Plan de campo listo',
        detail: 'Se optimizaron ventanas de retiro y se activó mantenimiento automático.',
        impact: '+2.4% satisfacción',
        positive: true,
      },
      ...list,
    ]);
  }

  shareSnapshot(): void {
    this.aiInsights.update(list =>
      list.map((insight, index) =>
        index === this.activeInsightIndex()
          ? { ...insight, impact: `${insight.impact} (compartido)` }
          : insight
      )
    );
  }
}
