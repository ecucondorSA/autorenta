import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, Input, OnInit, signal } from '@angular/core';
import type { FAQItem } from '../../../../core/models/marketplace.model';
import { SeoSchemaService } from '../../../../core/services/seo-schema.service';

/**
 * FAQSectionComponent - Accordion FAQ with JSON-LD schema
 *
 * Features:
 * - Accessible accordion (ARIA)
 * - Smooth animations
 * - Auto-generates JSON-LD FAQPage schema
 * - Category filtering
 */
@Component({
  selector: 'app-faq-section',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="faq-section" aria-labelledby="faq-title">
      <header class="faq-header">
        <h2 id="faq-title" class="faq-title">Preguntas Frecuentes</h2>
        <p class="faq-subtitle">Todo lo que necesitas saber sobre alquilar o publicar tu auto</p>
      </header>

      <!-- Category Tabs -->
      @if (showCategories) {
        <nav class="faq-categories" aria-label="Categorías de preguntas">
          <button
            type="button"
            class="category-btn"
            [class.active]="activeCategory() === 'all'"
            (click)="setCategory('all')"
          >
            Todas
          </button>
          @for (cat of categories; track cat.id) {
            <button
              type="button"
              class="category-btn"
              [class.active]="activeCategory() === cat.id"
              (click)="setCategory(cat.id)"
            >
              {{ cat.label }}
            </button>
          }
        </nav>
      }

      <!-- FAQ Accordion -->
      <div class="faq-list" role="list">
        @for (faq of filteredFaqs(); track faq.id; let i = $index) {
          <div class="faq-item" role="listitem">
            <button
              type="button"
              class="faq-question"
              [attr.aria-expanded]="openItems().has(faq.id)"
              [attr.aria-controls]="'faq-answer-' + faq.id"
              (click)="toggleItem(faq.id)"
            >
              <span class="question-text">{{ faq.question }}</span>
              <span class="question-icon" [class.open]="openItems().has(faq.id)">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </button>
            <div
              [id]="'faq-answer-' + faq.id"
              class="faq-answer"
              [class.open]="openItems().has(faq.id)"
              role="region"
              [attr.aria-labelledby]="'faq-question-' + faq.id"
            >
              <div class="answer-content">
                <p>{{ faq.answer }}</p>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- CTA -->
      <footer class="faq-footer">
        <p>¿No encontraste lo que buscabas?</p>
        <a href="mailto:soporte@autorentar.com.ar" class="faq-cta"> Contáctanos </a>
      </footer>
    </section>
  `,
  styles: [
    `
      .faq-section {
        padding: var(--section-py) var(--space-4);
        max-width: 800px;
        margin: 0 auto;
      }

      .faq-header {
        text-align: center;
        margin-bottom: var(--space-8);
      }

      .faq-title {
        font-size: var(--text-3xl);
        font-weight: 700;
        color: var(--text-primary);
        margin-bottom: var(--space-2);

        @media (min-width: 768px) {
          font-size: var(--text-4xl);
        }
      }

      .faq-subtitle {
        font-size: var(--text-lg);
        color: var(--text-secondary);
      }

      /* Categories */
      .faq-categories {
        display: flex;
        gap: var(--space-3);
        flex-wrap: wrap;
        justify-content: center;
        margin-bottom: var(--space-6);
      }

      .category-btn {
        padding: var(--space-2) var(--space-4);
        border-radius: var(--radius-full);
        border: 1px solid var(--border-muted);
        background: var(--surface-raised);
        color: var(--text-secondary);
        font-size: var(--text-sm);
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          background: var(--bg-secondary);
        }

        &.active {
          background: var(--primary-500);
          border-color: var(--primary-500);
          color: white;
        }
      }

      /* FAQ List */
      .faq-list {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
      }

      .faq-item {
        border: 1px solid var(--border-secondary);
        border-radius: var(--radius-lg);
        overflow: hidden;
        background: var(--bg-primary);
        transition: box-shadow 0.2s ease;

        &:has(.faq-question:focus-visible) {
          box-shadow: 0 0 0 2px var(--primary-500);
        }

        :host-context(.dark) & {
          background: var(--bg-secondary);
        }
      }

      .faq-question {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-4);
        padding: var(--space-4) var(--space-5);
        background: transparent;
        border: none;
        cursor: pointer;
        text-align: left;
        font-size: var(--text-base);
        font-weight: 600;
        color: var(--text-primary);
        transition: background 0.2s ease;

        &:hover {
          background: var(--bg-secondary);
        }

        &:focus-visible {
          outline: none;
        }
      }

      .question-text {
        flex: 1;
      }

      .question-icon {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        color: var(--text-tertiary);
        transition: transform 0.3s ease;

        &.open {
          transform: rotate(180deg);
        }
      }

      /* Answer */
      .faq-answer {
        display: grid;
        grid-template-rows: 0fr;
        transition: grid-template-rows 0.3s ease;

        &.open {
          grid-template-rows: 1fr;
        }
      }

      .answer-content {
        overflow: hidden;
        padding: 0 var(--space-5);

        .faq-answer.open & {
          padding-bottom: var(--space-4);
        }

        p {
          color: var(--text-secondary);
          line-height: 1.6;
          margin: 0;
        }
      }

      /* Footer */
      .faq-footer {
        text-align: center;
        margin-top: var(--space-8);
        padding-top: var(--space-6);
        border-top: 1px solid var(--border-secondary);
      }

      .faq-footer p {
        color: var(--text-secondary);
        margin-bottom: var(--space-3);
      }

      .faq-cta {
        display: inline-flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-3) var(--space-6);
        background: var(--primary-500);
        color: white;
        border-radius: var(--radius-lg);
        font-weight: 600;
        text-decoration: none;
        transition: background 0.2s ease;

        &:hover {
          background: var(--primary-600);
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FAQSectionComponent implements OnInit {
  private readonly seoSchema = inject(SeoSchemaService);

  @Input() faqs: FAQItem[] = DEFAULT_FAQS;
  @Input() showCategories = true;

  readonly categories = [
    { id: 'booking', label: 'Reservas' },
    { id: 'payment', label: 'Pagos' },
    { id: 'insurance', label: 'Seguro' },
    { id: 'cancellation', label: 'Cancelaciones' },
  ];

  readonly activeCategory = signal<string>('all');
  readonly openItems = signal<Set<string>>(new Set());

  readonly filteredFaqs = signal<FAQItem[]>([]);

  ngOnInit(): void {
    this.updateFilteredFaqs();
    this.seoSchema.setFAQSchema(this.faqs);
  }

  setCategory(category: string): void {
    this.activeCategory.set(category);
    this.updateFilteredFaqs();
  }

  toggleItem(id: string): void {
    this.openItems.update((current) => {
      const newSet = new Set(current);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }

  private updateFilteredFaqs(): void {
    const category = this.activeCategory();
    if (category === 'all') {
      this.filteredFaqs.set(this.faqs);
    } else {
      this.filteredFaqs.set(this.faqs.filter((faq) => faq.category === category));
    }
  }
}

// Default FAQs
const DEFAULT_FAQS: FAQItem[] = [
  {
    id: 'how-it-works',
    question: '¿Cómo funciona Autorentar?',
    answer:
      'Autorentar es una plataforma P2P que conecta propietarios de vehículos con conductores verificados. Los dueños publican sus autos con precio y disponibilidad, y los conductores pueden buscar, comparar y reservar directamente. Todos los pagos son seguros a través de MercadoPago y cada alquiler incluye seguro.',
    category: 'general',
  },
  {
    id: 'requirements',
    question: '¿Qué necesito para alquilar un auto?',
    answer:
      'Para alquilar necesitas: 1) Licencia de conducir vigente, 2) Documento de identidad (DNI o pasaporte), 3) Ser mayor de 21 años, 4) Tarjeta de débito/crédito o saldo en wallet. Algunos dueños pueden tener requisitos adicionales que se muestran en cada publicación.',
    category: 'booking',
  },
  {
    id: 'insurance',
    question: '¿Qué cubre el seguro incluido?',
    answer:
      'Todas las rentas incluyen un seguro que cubre: responsabilidad civil hacia terceros, daños por accidente (con franquicia), asistencia en viaje 24/7, y grúa. Puedes ver los detalles de cobertura en cada auto antes de reservar. También ofrecemos cobertura premium con franquicia reducida.',
    category: 'insurance',
  },
  {
    id: 'payment-methods',
    question: '¿Qué métodos de pago aceptan?',
    answer:
      'Aceptamos: tarjetas de crédito y débito (Visa, Mastercard, American Express), transferencias bancarias, Mercado Pago, y saldo en tu wallet de Autorentar. Los fondos se retienen al momento de la reserva y se liberan al dueño al finalizar el alquiler exitosamente.',
    category: 'payment',
  },
  {
    id: 'cancellation-policy',
    question: '¿Cuál es la política de cancelación?',
    answer:
      'La política varía por auto: Flexible (reembolso total hasta 24hs antes), Moderada (50% hasta 48hs antes), o Estricta (sin reembolso en 7 días previos). Cada publicación muestra su política. En caso de cancelación por el dueño, recibes reembolso completo más un bono del 10%.',
    category: 'cancellation',
  },
  {
    id: 'deposit',
    question: '¿Hay depósito de garantía?',
    answer:
      'Sí, cada auto tiene un depósito de garantía que se retiene al inicio del alquiler. El monto varía según el valor del vehículo y la cobertura de seguro elegida. El depósito se libera completamente dentro de 48hs después de devolver el auto en perfectas condiciones.',
    category: 'payment',
  },
  {
    id: 'publish-car',
    question: '¿Cómo publico mi auto para alquilar?',
    answer:
      'Para publicar: 1) Crea tu cuenta y verifica tu identidad, 2) Conecta tu cuenta de MercadoPago para recibir pagos, 3) Agrega tu auto con fotos, descripción y precio, 4) Define tu calendario de disponibilidad. Cobramos una comisión del 15% solo cuando se completa un alquiler.',
    category: 'general',
  },
  {
    id: 'owner-earnings',
    question: '¿Cuánto puedo ganar como dueño?',
    answer:
      'Las ganancias dependen del tipo de auto, ubicación y frecuencia de alquiler. En promedio, los dueños activos ganan entre $150,000 y $400,000 ARS mensuales. Puedes usar nuestra calculadora de ganancias para estimar según tu vehículo específico.',
    category: 'general',
  },
];
