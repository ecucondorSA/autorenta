import { Injectable } from '@angular/core';
import Shepherd from 'shepherd.js';
import type { Tour } from 'shepherd.js';

/**
 * TourService - Gestión de tours interactivos con Shepherd.js
 *
 * Características:
 * - Tours contextuales por flujo (visitor, renter, owner)
 * - Persistencia de estado en localStorage
 * - Opt-in/Opt-out suave
 * - Analytics integrado
 * - Accesibilidad completa
 */

export interface TourStep {
  id: string;
  element: string;
  text: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

@Injectable({
  providedIn: 'root'
})
export class TourService {
  private tour?: Tour;
  private readonly STORAGE_PREFIX = 'autorenta:tour:';

  constructor() {}

  /**
   * Tour inicial - Primera visita al sitio
   * Muestra: valor propositivo + navegación básica
   */
  startWelcomeTour(): void {
    if (this.hasSeenTour('welcome')) {
      return;
    }

    this.tour = this.createTour('welcome');

    // Paso 1: Hero section
    this.tour.addStep({
      id: 'welcome-hero',
      text: `
        <div class="tour-content">
          <h3>🎯 Bienvenido a AutoRenta</h3>
          <p>Ganá dinero alquilando tu auto o encontrá el mejor precio para tu viaje.</p>
        </div>
      `,
      attachTo: {
        element: '.hero-section, #hero',
        on: 'bottom'
      },
      buttons: [
        {
          text: 'Ver después',
          action: () => this.dismissTour('welcome')
        },
        {
          text: 'Siguiente',
          action: () => this.tour?.next()
        }
      ]
    });

    // Paso 2: Navegación principal
    this.tour.addStep({
      id: 'welcome-nav',
      text: `
        <div class="tour-content">
          <h3>🚗 Dos formas de usar AutoRenta</h3>
          <p><strong>Alquilar:</strong> Encontrá autos verificados cerca tuyo</p>
          <p><strong>Publicar:</strong> Convertí tu auto en ingreso pasivo</p>
        </div>
      `,
      attachTo: {
        element: 'header nav, .main-nav',
        on: 'bottom'
      },
      buttons: [
        {
          text: 'Atrás',
          action: () => this.tour?.back()
        },
        {
          text: 'Siguiente',
          action: () => this.tour?.next()
        }
      ]
    });

    // Paso 3: Soporte
    this.tour.addStep({
      id: 'welcome-help',
      text: `
        <div class="tour-content">
          <h3>🛟 Soporte siempre disponible</h3>
          <p>Verificación de perfiles, seguro incluido y asistencia humana 24/7.</p>
          <p>Tocá el ícono <strong>?</strong> cuando necesites ayuda.</p>
        </div>
      `,
      attachTo: {
        element: '.help-button, #help-center, [aria-label*="Ayuda"]',
        on: 'left'
      },
      buttons: [
        {
          text: 'No volver a mostrar',
          action: () => this.completeTour('welcome', true)
        },
        {
          text: '¡Entendido!',
          action: () => this.completeTour('welcome', false)
        }
      ]
    });

    this.tour.start();
  }

  /**
   * Tour para renters - Flujo de alquiler
   * Contexto: Usuario busca alquilar un auto
   */
  startRenterTour(): void {
    if (this.hasSeenTour('renter')) {
      return;
    }

    const steps: TourStep[] = [
      {
        id: 'renter-search',
        element: '#search-input, .search-bar, [placeholder*="Buscar"]',
        text: `
          <div class="tour-content">
            <h3>🔍 Búsqueda inteligente</h3>
            <p>Buscá por ubicación, fechas o tipo de auto.</p>
            <p>Todos los vehículos están <strong>verificados</strong>.</p>
          </div>
        `,
        position: 'bottom'
      },
      {
        id: 'renter-filters',
        element: '.filter-section, #filters, [class*="filter"]',
        text: `
          <div class="tour-content">
            <h3>⚡ Filtros rápidos</h3>
            <p>Filtrá por precio, tipo de auto o calificación en segundos.</p>
          </div>
        `,
        position: 'right'
      },
      {
        id: 'renter-map',
        element: '#map-container, .map-view, [class*="map"]',
        text: `
          <div class="tour-content">
            <h3>🗺️ Vista de mapa</h3>
            <p>Visualizá autos disponibles cerca tuyo en tiempo real.</p>
          </div>
        `,
        position: 'left'
      },
      {
        id: 'renter-card',
        element: '.car-card:first-of-type, [class*="car-card"]:first-of-type',
        text: `
          <div class="tour-content">
            <h3>🛡️ Transparencia total</h3>
            <p>Mirá fotos reales, reseñas verificadas y condiciones claras antes de reservar.</p>
          </div>
        `,
        position: 'top'
      }
    ];

    this.buildTour('renter', steps);
  }

  /**
   * Tour para owners - Flujo de publicación
   * Contexto: Usuario quiere publicar su auto
   */
  startOwnerTour(): void {
    if (this.hasSeenTour('owner')) {
      return;
    }

    const steps: TourStep[] = [
      {
        id: 'owner-publish',
        element: '#publish-car, .publish-button, [routerLink*="publish"]',
        text: `
          <div class="tour-content">
            <h3>💸 Convertí tu auto en ingreso</h3>
            <p>Publicás en <strong>3 minutos</strong> y empezás a recibir reservas hoy.</p>
          </div>
        `,
        position: 'right'
      },
      {
        id: 'owner-photos',
        element: '#photo-uploader, .upload-section, [type="file"]',
        text: `
          <div class="tour-content">
            <h3>📸 Las fotos son clave</h3>
            <p>Buenas fotos = <strong>+40% más reservas</strong>.</p>
            <p>Te guiamos con ejemplos de cómo sacarlas.</p>
          </div>
        `,
        position: 'bottom'
      },
      {
        id: 'owner-pricing',
        element: '#pricing-section, .price-input, [formControlName="price"]',
        text: `
          <div class="tour-content">
            <h3>🤖 Precio inteligente</h3>
            <p>Sugerimos el precio óptimo según zona y demanda.</p>
            <p>Podés ajustarlo cuando quieras.</p>
          </div>
        `,
        position: 'left'
      },
      {
        id: 'owner-insurance',
        element: '#insurance-selector, .insurance-section',
        text: `
          <div class="tour-content">
            <h3>🛡️ Seguro incluido</h3>
            <p>Cobertura contra robo, daños y asistencia 24/7.</p>
            <p>Vos elegís el plan que mejor te convenga.</p>
          </div>
        `,
        position: 'right'
      },
      {
        id: 'owner-calendar',
        element: '#availability-calendar, .calendar-section',
        text: `
          <div class="tour-content">
            <h3>📅 Control de disponibilidad</h3>
            <p>Bloqueá las fechas que necesitás tu auto.</p>
            <p>Sincronizá con tu agenda personal.</p>
          </div>
        `,
        position: 'top'
      },
      {
        id: 'owner-publish-btn',
        element: '#publish-button, [type="submit"]',
        text: `
          <div class="tour-content">
            <h3>🚀 ¡Listo para publicar!</h3>
            <p>Una vez publicado, aparecerás en búsquedas.</p>
            <p>Podés pausar o editar sin costo en cualquier momento.</p>
          </div>
        `,
        position: 'left'
      }
    ];

    this.buildTour('owner', steps);
  }

  /**
   * Tour para detalle de auto
   * Contexto: Usuario viendo un auto específico
   */
  startCarDetailTour(): void {
    if (this.hasSeenTour('car-detail')) {
      return;
    }

    const steps: TourStep[] = [
      {
        id: 'detail-gallery',
        element: '.car-gallery, .image-carousel',
        text: `
          <div class="tour-content">
            <h3>📸 Galería de fotos</h3>
            <p>Hacé click para ver todas las fotos en detalle.</p>
          </div>
        `,
        position: 'bottom'
      },
      {
        id: 'detail-reviews',
        element: '.reviews-section, #reviews',
        text: `
          <div class="tour-content">
            <h3>⭐ Reseñas verificadas</h3>
            <p>Solo usuarios que alquilaron pueden dejar reseñas.</p>
          </div>
        `,
        position: 'top'
      },
      {
        id: 'detail-insurance',
        element: '.insurance-info, #insurance',
        text: `
          <div class="tour-content">
            <h3>✅ Seguro y condiciones</h3>
            <p>Todo claro antes de reservar: seguro, depósito y política de cancelación.</p>
          </div>
        `,
        position: 'right'
      },
      {
        id: 'detail-book',
        element: '#book-now, .book-button',
        text: `
          <div class="tour-content">
            <h3>🔒 Reserva segura</h3>
            <p>Pago protegido y confirmación instantánea.</p>
            <p>Si cambia tu plan, cancelaciones simples.</p>
          </div>
        `,
        position: 'left'
      }
    ];

    this.buildTour('car-detail', steps);
  }

  /**
   * Micro-tour: Tip rápido contextual
   * Uso: Mostrar un solo tip sin overlay completo
   */
  showQuickTip(elementSelector: string, message: string, position: 'top' | 'bottom' | 'left' | 'right' = 'bottom'): void {
    const tip = new Shepherd.Tour({
      useModalOverlay: false,
      defaultStepOptions: {
        scrollTo: false,
        classes: 'shepherd-theme-custom shepherd-quick-tip'
      }
    });

    tip.addStep({
      id: 'quick-tip',
      text: `<div class="tour-content">${message}</div>`,
      attachTo: {
        element: elementSelector,
        on: position
      },
      buttons: [
        {
          text: 'Entendido',
          action: () => tip.complete()
        }
      ]
    });

    tip.start();

    // Auto-dismiss después de 8 segundos
    setTimeout(() => {
      if (tip.isActive()) {
        tip.complete();
      }
    }, 8000);
  }

  /**
   * Reiniciar tour manualmente (botón de ayuda "?")
   */
  restartTour(tourId: string): void {
    this.clearTourState(tourId);

    switch (tourId) {
      case 'welcome':
        this.startWelcomeTour();
        break;
      case 'renter':
        this.startRenterTour();
        break;
      case 'owner':
        this.startOwnerTour();
        break;
      case 'car-detail':
        this.startCarDetailTour();
        break;
    }
  }

  /**
   * Crear tour base con configuración común
   */
  private createTour(tourId: string): Tour {
    const tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        cancelIcon: {
          enabled: true
        },
        scrollTo: {
          behavior: 'smooth',
          block: 'center'
        },
        classes: 'shepherd-theme-custom',
        when: {
          show: () => {
            // Analytics: paso mostrado
            this.trackEvent('tour_step_viewed', {
              tour: tourId,
              step: tour.getCurrentStep()?.id
            });
          }
        }
      }
    });

    // Event listeners
    tour.on('cancel', () => {
      this.trackEvent('tour_cancelled', {
        tour: tourId,
        step: tour.getCurrentStep()?.id
      });
    });

    tour.on('complete', () => {
      this.trackEvent('tour_completed', { tour: tourId });
    });

    return tour;
  }

  /**
   * Construir tour a partir de array de pasos
   */
  private buildTour(tourId: string, steps: TourStep[]): void {
    this.tour = this.createTour(tourId);

    steps.forEach((step, index) => {
      this.tour!.addStep({
        id: step.id,
        text: step.text,
        attachTo: {
          element: step.element,
          on: step.position
        },
        buttons: [
          ...(index > 0 ? [{
            text: 'Atrás',
            action: () => this.tour?.back()
          }] : []),
          {
            text: index === steps.length - 1 ? '¡Entendido!' : 'Siguiente',
            action: index === steps.length - 1
              ? () => this.completeTour(tourId, false)
              : () => this.tour?.next()
          }
        ]
      });
    });

    this.tour.start();
  }

  /**
   * Verificar si el usuario ya vio un tour
   */
  private hasSeenTour(tourId: string): boolean {
    return localStorage.getItem(`${this.STORAGE_PREFIX}${tourId}`) === 'completed';
  }

  /**
   * Marcar tour como completado
   */
  private completeTour(tourId: string, dismissed: boolean): void {
    localStorage.setItem(`${this.STORAGE_PREFIX}${tourId}`, 'completed');

    if (dismissed) {
      localStorage.setItem(`${this.STORAGE_PREFIX}${tourId}:dismissed`, 'true');
    }

    this.tour?.complete();
  }

  /**
   * Descartar tour (opt-out)
   */
  private dismissTour(tourId: string): void {
    this.completeTour(tourId, true);
  }

  /**
   * Limpiar estado de un tour (para reiniciar)
   */
  private clearTourState(tourId: string): void {
    localStorage.removeItem(`${this.STORAGE_PREFIX}${tourId}`);
    localStorage.removeItem(`${this.STORAGE_PREFIX}${tourId}:dismissed`);
  }

  /**
   * Analytics tracking (placeholder - integrar con Google Analytics o Mixpanel)
   */
  private trackEvent(eventName: string, properties: Record<string, any>): void {
    // TODO: Integrar con tu servicio de analytics
    console.log(`[Analytics] ${eventName}`, properties);

    // Ejemplo con Google Analytics 4
    // if (typeof gtag !== 'undefined') {
    //   gtag('event', eventName, properties);
    // }
  }
}
