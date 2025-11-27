import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  signal,
} from '@angular/core';
import type { Testimonial } from '../../../../core/models/marketplace.model';

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
  imports: [CommonModule],
  template: `
    <section class="testimonials-section" aria-labelledby="testimonials-title">
      <header class="section-header">
        <h2 id="testimonials-title" class="section-title">
          Lo que dicen nuestros usuarios
        </h2>
        <p class="section-subtitle">
          Miles de conductores y dueños confían en Autorentar
        </p>
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
                  <span class="verified-badge" title="Usuario verificado">✓</span>
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
                <span class="star" [class.filled]="star <= testimonial.rating">★</span>
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
      .testimonials-section {
        padding: var(--section-py) var(--space-4);
        background: var(--bg-secondary);

        :host-context(.dark) & {
          background: var(--bg-tertiary);
        }
      }

      .section-header {
        text-align: center;
        margin-bottom: var(--space-8);
      }

      .section-title {
        font-size: var(--text-3xl);
        font-weight: 700;
        color: var(--text-primary);
        margin-bottom: var(--space-2);

        @media (min-width: 768px) {
          font-size: var(--text-4xl);
        }
      }

      .section-subtitle {
        font-size: var(--text-lg);
        color: var(--text-secondary);
      }

      /* Role Tabs */
      .role-tabs {
        display: flex;
        gap: var(--space-2);
        justify-content: center;
        margin-bottom: var(--space-8);
      }

      .role-tab {
        padding: var(--space-2) var(--space-5);
        border-radius: var(--radius-full);
        border: 1px solid var(--border-secondary);
        background: transparent;
        color: var(--text-secondary);
        font-size: var(--text-sm);
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          background: var(--bg-primary);
        }

        &.active {
          background: var(--primary-500);
          border-color: var(--primary-500);
          color: white;
        }
      }

      /* Grid */
      .testimonials-grid {
        display: grid;
        gap: var(--space-6);
        max-width: 1200px;
        margin: 0 auto;

        @media (min-width: 640px) {
          grid-template-columns: repeat(2, 1fr);
        }

        @media (min-width: 1024px) {
          grid-template-columns: repeat(3, 1fr);
        }
      }

      /* Card */
      .testimonial-card {
        background: var(--surface-raised);
        border-radius: var(--radius-xl);
        padding: var(--space-6);
        box-shadow: var(--shadow-sm);
        transition: transform 0.2s ease, box-shadow 0.2s ease;

        &:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        :host-context(.dark) & {
          background: var(--bg-secondary);
        }
      }

      .card-header {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        margin-bottom: var(--space-4);
      }

      .avatar-container {
        position: relative;
        flex-shrink: 0;
      }

      .avatar,
      .avatar-placeholder {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        object-fit: cover;
      }

      .avatar-placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--primary-100);
        color: var(--primary-600);
        font-weight: 600;
        font-size: var(--text-lg);

        :host-context(.dark) & {
          background: var(--primary-900);
          color: var(--primary-300);
        }
      }

      .verified-badge {
        position: absolute;
        bottom: -2px;
        right: -2px;
        width: 18px;
        height: 18px;
        background: var(--success-500);
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        border: 2px solid var(--bg-primary);

        :host-context(.dark) & {
          border-color: var(--bg-secondary);
        }
      }

      .user-info {
        overflow: hidden;
      }

      .user-name {
        font-size: var(--text-base);
        font-weight: 600;
        color: var(--text-primary);
        margin: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .user-role {
        font-size: var(--text-sm);
        color: var(--text-tertiary);
      }

      /* Rating */
      .rating {
        display: flex;
        gap: 2px;
        margin-bottom: var(--space-3);
      }

      .star {
        color: var(--neutral-300);
        font-size: var(--text-lg);

        &.filled {
          color: var(--warning-400);
        }
      }

      /* Quote */
      .testimonial-text {
        margin: 0;
        padding: 0;
        border: none;

        p {
          color: var(--text-secondary);
          line-height: 1.6;
          font-size: var(--text-sm);
          margin: 0;
        }
      }

      /* Footer */
      .card-footer {
        margin-top: var(--space-4);
        padding-top: var(--space-3);
        border-top: 1px solid var(--border-secondary);
      }

      .testimonial-date {
        font-size: var(--text-xs);
        color: var(--text-tertiary);
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
      this.filteredTestimonials.set(
        this.testimonials.filter((t) => t.role === role),
      );
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
