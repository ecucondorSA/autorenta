import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, signal } from '@angular/core';
import type { Testimonial } from '../../../../core/models/marketplace.model';
import { IconComponent } from '../../../../shared/components/icon/icon.component';

/**
 * TestimonialsSectionComponent - User reviews carousel
 *
 * Features:
 * - Horizontal scroll on mobile
 * - Grid layout on desktop
 * - Verified badge
 * - Role-based filtering (renter/owner)
 */
@Component({
  selector: 'app-testimonials-section',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <section class="testimonials-section" aria-labelledby="testimonials-title">
      <header class="section-header">
        <h2 id="testimonials-title" class="section-title">Lo que dicen nuestros usuarios</h2>
        <p class="section-subtitle">Miles de conductores y dueños confían en Autorentar</p>
      </header>

      <!-- Role Tabs -->
      <nav class="role-tabs" aria-label="Filtrar por tipo de usuario">
        <button
          type="button"
          class="role-tab"
          [class.active]="activeRole() === 'all'"
          (click)="setRole('all')"
        >
          Todos
        </button>
        <button
          type="button"
          class="role-tab"
          [class.active]="activeRole() === 'renter'"
          (click)="setRole('renter')"
        >
          Conductores
        </button>
        <button
          type="button"
          class="role-tab"
          [class.active]="activeRole() === 'owner'"
          (click)="setRole('owner')"
        >
          Dueños
        </button>
      </nav>

      <!-- Testimonials Grid -->
      <div class="testimonials-grid">
        @for (testimonial of filteredTestimonials(); track testimonial.id) {
          <article class="testimonial-card">
            <header class="card-header">
              <div class="avatar-container">
                @if (testimonial.avatar) {
                  <img
                    [src]="testimonial.avatar"
                    [alt]="testimonial.name"
                    class="avatar"
                    loading="lazy"
                  />
                } @else {
                  <div class="avatar-placeholder">
                    {{ getInitials(testimonial.name) }}
                  </div>
                }
                @if (testimonial.verified) {
                  <span class="verified-badge" title="Usuario verificado">
                    <app-icon name="check" [size]="10" />
                  </span>
                }
              </div>
              <div class="user-info">
                <h3 class="user-name">{{ testimonial.name }}</h3>
                <span class="user-role">
                  {{ testimonial.role === 'renter' ? 'Conductor' : 'Dueño' }}
                  @if (testimonial.location) {
                    · {{ testimonial.location }}
                  }
                </span>
              </div>
            </header>

            <!-- Rating -->
            <div class="rating" [attr.aria-label]="testimonial.rating + ' de 5 estrellas'">
              @for (star of [1, 2, 3, 4, 5]; track star) {
                <span class="star" [class.filled]="star <= testimonial.rating">
                  <app-icon
                    [name]="star <= testimonial.rating ? 'star-filled' : 'star'"
                    [size]="18"
                  />
                </span>
              }
            </div>

            <!-- Quote -->
            <blockquote class="testimonial-text">
              <p>"{{ testimonial.text }}"</p>
            </blockquote>

            <!-- Date -->
            <footer class="card-footer">
              <time [dateTime]="testimonial.date" class="testimonial-date">
                {{ formatDate(testimonial.date) }}
              </time>
            </footer>
          </article>
        }
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        --card-bg: #ffffff;
        --card-border: rgba(0, 0, 0, 0.05);
        --text-primary: var(--text-primary-global); /* Reemplazado hex con token semántico */
        --text-secondary: var(--text-secondary-global); /* Reemplazado hex con token semántico */
        --text-tertiary: var(--text-muted-global); /* Reemplazado hex con token semántico */
        --primary-color: var(--cta-default-global); /* Reemplazado hex con token semántico */
        --bg-section: var(--surface-elevated-global); /* Reemplazado hex con token semántico */
      }

      :host-context(.dark) {
        --card-bg: var(--surface-dark-global); /* Reemplazado hex con token semántico */
        --card-border: rgba(255, 255, 255, 0.1);
        --text-primary: var(--text-inverse-global); /* Reemplazado hex con token semántico */
        --text-secondary: var(--text-muted-global); /* Reemplazado hex con token semántico */
        --text-tertiary: var(--text-secondary-global); /* Reemplazado hex con token semántico */
        --bg-section: var(--surface-dark-global); /* Reemplazado hex con token semántico */
      }

      .testimonials-section {
        padding: 5rem 1.5rem;
        background: var(--bg-section);
        position: relative;
        overflow: hidden;
      }

      /* Background Pattern */
      .testimonials-section::before {
        content: '';
        position: absolute;
        inset: 0;
        background-image: none; /* Reemplazado gradiente con color sólido */
        background-size: 40px 40px;
        opacity: 0.5;
        pointer-events: none;
      }

      :host-context(.dark) .testimonials-section::before {
        background-image: none; /* Reemplazado gradiente con color sólido */
      }

      .section-header {
        text-align: center;
        margin-bottom: 3rem;
        position: relative;
        z-index: 10;
      }

      .section-title {
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 2.25rem;
        font-weight: 800;
        color: var(--text-primary);
        margin-bottom: 1rem;
        letter-spacing: -0.02em;
      }

      .section-subtitle {
        font-size: 1.125rem;
        color: var(--text-secondary);
        max-width: 600px;
        margin: 0 auto;
        line-height: 1.6;
      }

      /* Role Tabs */
      .role-tabs {
        display: flex;
        gap: 0.75rem;
        justify-content: center;
        margin-bottom: 3rem;
        position: relative;
        z-index: 10;
      }

      .role-tab {
        padding: 0.625rem 1.5rem;
        border-radius: 9999px;
        border: 1px solid var(--card-border);
        background: var(--card-bg);
        color: var(--text-secondary);
        font-size: 0.9375rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      }

      .role-tab:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        color: var(--primary-color);
      }

      .role-tab.active {
        background: var(--primary-color);
        border-color: var(--primary-color);
        color: white;
        box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);
      }

      /* Grid */
      .testimonials-grid {
        display: grid;
        gap: 2rem;
        max-width: 1280px;
        margin: 0 auto;
        position: relative;
        z-index: 10;
      }

      @media (min-width: 640px) {
        .testimonials-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }

      @media (min-width: 1024px) {
        .testimonials-grid {
          grid-template-columns: repeat(3, 1fr);
        }
      }

      /* Card */
      .testimonial-card {
        background: var(--card-bg);
        border: 1px solid var(--card-border);
        border-radius: 1.5rem;
        padding: 2rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        flex-direction: column;
        height: 100%;
      }

      .testimonial-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        border-color: rgba(6, 182, 212, 0.3);
      }

      .card-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1.5rem;
      }

      .avatar-container {
        position: relative;
        flex-shrink: 0;
      }

      .avatar,
      .avatar-placeholder {
        width: 56px;
        height: 56px;
        border-radius: 1rem;
        object-fit: cover;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .avatar-placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--surface-info-light, #eff6ff); /* Reemplazado hex con token semántico */

        color: var(--system-blue-dark); /* Reemplazado hex con token semántico */
        font-weight: 700;
        font-size: 1.25rem;
      }

      :host-context(.dark) .avatar-placeholder {
        background: var(
          --surface-info-dark,
          var(--system-blue-dark)
        ); /* Reemplazado hex con token semántico */
        color: var(--system-blue-light); /* Reemplazado hex con token semántico */
      }

      .verified-badge {
        position: absolute;
        bottom: -4px;
        right: -4px;
        width: 20px;
        height: 20px;
        background: var(--success-default, #9db38b);
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid var(--card-bg);
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      }

      .verified-badge app-icon {
        stroke-width: 3;
      }

      .user-info {
        overflow: hidden;
      }

      .user-name {
        font-size: 1.0625rem;
        font-weight: 700;
        color: var(--text-primary);
        margin: 0 0 0.25rem 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .user-role {
        font-size: 0.875rem;
        color: var(--text-secondary);
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 0.375rem;
      }

      /* Rating */
      .rating {
        display: flex;
        gap: 2px;
        margin-bottom: 1rem;
      }

      .star {
        color: var(--text-muted, #e5e7eb);
        display: inline-flex;
      }

      .star.filled {
        color: var(--warning-default, #f59e0b);
      }

      .star app-icon {
        display: block;
      }

      /* Quote */
      .testimonial-text {
        margin: 0;
        padding: 0;
        border: none;
        flex-grow: 1;
        position: relative;
      }

      .testimonial-text p {
        color: var(--text-secondary);
        line-height: 1.6;
        font-size: 0.9375rem;
        margin: 0;
        font-style: italic;
      }

      /* Footer */
      .card-footer {
        margin-top: 1.5rem;
        padding-top: 1rem;
        border-top: 1px solid var(--card-border);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .testimonial-date {
        font-size: 0.75rem;
        color: var(--text-tertiary);
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestimonialsSectionComponent {
  @Input() testimonials: Testimonial[] = DEFAULT_TESTIMONIALS;

  readonly activeRole = signal<'all' | 'renter' | 'owner'>('all');

  readonly filteredTestimonials = signal<Testimonial[]>([]);

  constructor() {
    this.updateFiltered();
  }

  setRole(role: 'all' | 'renter' | 'owner'): void {
    this.activeRole.set(role);
    this.updateFiltered();
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-AR', {
      month: 'short',
      year: 'numeric',
    });
  }

  private updateFiltered(): void {
    const role = this.activeRole();
    if (role === 'all') {
      this.filteredTestimonials.set(this.testimonials);
    } else {
      this.filteredTestimonials.set(this.testimonials.filter((t) => t.role === role));
    }
  }
}

// Default testimonials
const DEFAULT_TESTIMONIALS: Testimonial[] = [
  {
    id: '1',
    name: 'María García',
    role: 'renter',
    rating: 5,
    text: 'Excelente experiencia! El auto estaba impecable y el dueño muy amable. El proceso de reserva fue súper fácil y todo salió perfecto.',
    date: '2024-11-15',
    location: 'Buenos Aires',
    verified: true,
  },
  {
    id: '2',
    name: 'Carlos Rodríguez',
    role: 'owner',
    rating: 5,
    text: 'Genero ingresos extras alquilando mi auto cuando no lo uso. Los pagos son puntuales y el seguro me da tranquilidad total.',
    date: '2024-11-10',
    location: 'Córdoba',
    verified: true,
  },
  {
    id: '3',
    name: 'Laura Martínez',
    role: 'renter',
    rating: 5,
    text: 'Mucho mejor que las rentadoras tradicionales. Precios más accesibles y trato personalizado. 100% recomendado!',
    date: '2024-11-08',
    location: 'Rosario',
    verified: true,
  },
  {
    id: '4',
    name: 'Juan Pérez',
    role: 'owner',
    rating: 4,
    text: 'Mi auto genera dinero mientras está estacionado. La plataforma es muy intuitiva y el soporte responde rápido.',
    date: '2024-11-05',
    location: 'Mendoza',
    verified: true,
  },
  {
    id: '5',
    name: 'Ana López',
    role: 'renter',
    rating: 5,
    text: 'Necesitaba un auto urgente para un viaje de trabajo y lo conseguí en menos de una hora. Increíble servicio!',
    date: '2024-10-28',
    location: 'Buenos Aires',
    verified: false,
  },
  {
    id: '6',
    name: 'Diego Fernández',
    role: 'owner',
    rating: 5,
    text: 'Ya llevo 6 meses publicando mi auto y los ingresos son muy buenos. Los conductores siempre han sido responsables.',
    date: '2024-10-20',
    location: 'La Plata',
    verified: true,
  },
];
