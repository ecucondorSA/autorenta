import { Injectable } from '@angular/core';
import {
  TourDefinition,
  TourId,
  TourPriority,
  StepDefinition,
  StepContent,
  TourGuard,
  TourTrigger,
} from '../interfaces/tour-definition.interface';

@Injectable({
  providedIn: 'root',
})
export class TourRegistryService {
  private definitions = new Map<TourId, TourDefinition>();

  constructor() {
    this.loadDefaultTours();
  }

  register(definition: TourDefinition): void {
    this.definitions.set(definition.id, definition);
  }

  getDefinition(tourId: TourId): TourDefinition | undefined {
    return this.definitions.get(tourId);
  }

  getAllDefinitions(): TourDefinition[] {
    return Array.from(this.definitions.values());
  }

  hasDefinition(tourId: TourId): boolean {
    return this.definitions.has(tourId);
  }

  unregister(tourId: TourId): void {
    this.definitions.delete(tourId);
  }

  private loadDefaultTours(): void {
    // Welcome Tour
    this.register({
      id: TourId.Welcome,
      name: 'Tour de Bienvenida',
      description: 'Un recorrido rápido por las funciones principales',
      priority: TourPriority.High,
      autoStart: true,
      throttleHours: 168, // 1 week
      version: '1.0.0',
      guards: [
        {
          name: 'isHomePage',
          check: () => {
            if (typeof window === 'undefined') return false;
            const path = window.location.pathname;
            // Accept both / and /cars as valid pages for welcome tour
            return path === '/' || path === '/cars' || path.startsWith('/cars');
          },
        },
      ],
      steps: [
        {
          id: 'welcome-hero',
          content: {
            title: '¡Bienvenido a AutoRenta! 🚗',
            text: 'Te mostraremos las funciones principales en solo 30 segundos.',
          },
          position: 'bottom',
          target: {
            selector: '[data-tour-step="welcome-hero"]',
            required: false,
          },
          buttons: [
            {
              text: 'Ver después',
              action: 'skip',
              classes: 'shepherd-button-secondary',
            },
            {
              text: 'Comenzar',
              action: 'next',
              classes: 'shepherd-button-primary',
            },
          ],
        },
        {
          id: 'welcome-nav',
          content: {
            title: 'Navegación Principal',
            text: 'Desde aquí puedes acceder a buscar autos, tus reservas, y tu perfil.',
          },
          position: 'bottom',
          target: {
            selector: '[data-tour-step="welcome-nav"]',
            altSelectors: ['nav', 'header'],
          },
          buttons: [
            { text: 'Atrás', action: 'back' },
            { text: 'Siguiente', action: 'next' },
          ],
        },
        {
          id: 'welcome-help',
          content: {
            title: 'Botón de Ayuda',
            text: 'Si necesitas ayuda en cualquier momento, presiona este botón para acceder a tours guiados.',
          },
          position: 'left',
          target: {
            selector: '[data-tour-step="welcome-help"]',
            required: false,
          },
          buttons: [
            { text: 'Atrás', action: 'back' },
            { text: '¡Entendido!', action: 'complete' },
          ],
        },
      ],
    });

    // Guided Booking Tour - EXTENDED VERSION
    this.register({
      id: TourId.GuidedBooking,
      name: 'Cómo Reservar un Auto',
      description: 'Guía paso a paso para tu primera reserva (10 pasos)',
      priority: TourPriority.Normal,
      throttleHours: 72,
      version: '2.0.0', // Extended version
      guards: [
        {
          name: 'hasInventory',
          check: async () => {
            // Check if there are cars available
            await new Promise((r) => setTimeout(r, 100));
            const cars = document.querySelectorAll('[data-tour-step="guided-select-car"]');
            return cars.length > 0;
          },
        },
        {
          name: 'isOnCarsPage',
          check: () => {
            return (
              typeof window !== 'undefined' &&
              (window.location.pathname === '/cars' || window.location.pathname.startsWith('/cars'))
            );
          },
        },
      ],
      triggers: [
        {
          type: 'route',
          routePattern: /^\/cars$/,
        },
      ],
      steps: [
        // Step 1: Search & Filters
        {
          id: 'guided-search',
          content: {
            title: '🔍 Paso 1: Buscar Autos',
            text: 'Usa los filtros para buscar autos por ubicación, fechas, precio y características. Los resultados se actualizan automáticamente en el mapa.',
          },
          position: 'right',
          target: {
            selector: '[data-tour-step="guided-search"]',
            required: true,
            altSelectors: ['#filters', '.map-controls__filters'],
          },
          responsive: {
            mobile: {
              position: 'bottom',
              content: {
                title: '🔍 Buscar',
                text: 'Usa los filtros para encontrar el auto perfecto.',
              },
            },
          },
          buttons: [
            { text: 'Ver después', action: 'skip', classes: 'shepherd-button-secondary' },
            { text: 'Siguiente →', action: 'next', classes: 'shepherd-button-primary' },
          ],
          analytics: {
            step_name: 'search_filters',
            step_order: 1,
          },
        },

        // Step 2: Select Car from Carousel
        {
          id: 'guided-select-car',
          content: {
            title: '🚗 Paso 2: Elegir un Auto',
            text: 'Explora los autos cercanos y económicos. Haz clic en una tarjeta para ver detalles completos del vehículo.',
          },
          position: 'top',
          target: {
            selector: '[data-tour-step="guided-select-car"]',
            required: false, // Not required in case no cars are available
            altSelectors: ['.map-carousel', '.map-carousel-mobile'],
          },
          onBefore: async () => {
            // Ensure carousel is visible
            const carousel = document.querySelector('[data-tour-step="guided-select-car"]');
            if (carousel && !carousel.classList.contains('visible')) {
              // Scroll into view if needed
              carousel.scrollIntoView({ behavior: 'smooth', block: 'center' });
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          },
          responsive: {
            mobile: {
              position: 'bottom',
              target: {
                selector: '.map-carousel-mobile',
                altSelectors: ['[data-tour-step="guided-select-car"]'],
              },
            },
          },
          buttons: [
            { text: '← Atrás', action: 'back', classes: 'shepherd-button-secondary' },
            { text: 'Continuar →', action: 'next', classes: 'shepherd-button-primary' },
          ],
          analytics: {
            step_name: 'car_selection',
            step_order: 2,
          },
        },

        // Step 3: Map Interaction
        {
          id: 'guided-map',
          content: {
            title: '🗺️ Paso 3: Mapa Interactivo',
            text: 'El mapa muestra todos los autos disponibles. Haz clic en un marcador para ver detalles o usa el zoom para explorar diferentes áreas.',
          },
          position: 'center',
          target: {
            selector: '#map-container',
            required: false,
          },
          buttons: [
            { text: '← Atrás', action: 'back' },
            { text: 'Siguiente →', action: 'next' },
          ],
          analytics: {
            step_name: 'map_interaction',
            step_order: 3,
          },
        },

        // Step 4: Car Details (requires navigation)
        {
          id: 'guided-car-detail',
          content: {
            title: '📋 Paso 4: Detalles del Auto',
            text: 'Revisa las fotos, características, precio por día, ubicación y reseñas de otros usuarios. Aquí también verás el seguro incluido.',
          },
          position: 'top',
          target: {
            selector: '[data-tour-step="car-detail-gallery"]',
            required: false,
            altSelectors: ['.car-detail-container', 'app-car-detail'],
          },
          buttons: [
            { text: '← Atrás', action: 'back' },
            { text: 'Siguiente →', action: 'next' },
          ],
          analytics: {
            step_name: 'car_details',
            step_order: 4,
          },
        },

        // Step 5: Date Selection
        {
          id: 'guided-dates',
          content: {
            title: '📅 Paso 5: Fechas y Horarios',
            text: 'Selecciona las fechas de inicio y fin de tu reserva. El precio total se calculará automáticamente según los días seleccionados.',
          },
          position: 'left',
          target: {
            selector: '[data-tour-step="booking-dates"]',
            required: false,
            altSelectors: ['.date-picker', '#booking-form'],
          },
          buttons: [
            { text: '← Atrás', action: 'back' },
            { text: 'Siguiente →', action: 'next' },
          ],
          analytics: {
            step_name: 'date_selection',
            step_order: 5,
          },
        },

        // Step 6: Price Breakdown
        {
          id: 'guided-price',
          content: {
            title: '💰 Paso 6: Desglose de Precio',
            text: 'Revisa el precio detallado: costo por día, seguro, comisión de plataforma y total. Todo transparente, sin sorpresas.',
          },
          position: 'left',
          target: {
            selector: '[data-tour-step="price-breakdown"]',
            required: false,
            altSelectors: ['.pricing-details', '.price-summary'],
          },
          buttons: [
            { text: '← Atrás', action: 'back' },
            { text: 'Siguiente →', action: 'next' },
          ],
          analytics: {
            step_name: 'price_review',
            step_order: 6,
          },
        },

        // Step 7: Book Button
        {
          id: 'guided-book-button',
          content: {
            title: '✅ Paso 7: Reservar',
            text: '¿Todo listo? Haz clic en "Reservar" para continuar con el proceso de pago. Tu reserva estará confirmada en minutos.',
          },
          position: 'bottom',
          target: {
            selector: '[data-tour-step="book-button"]',
            required: false,
            altSelectors: ['.book-now-button', 'button[type="submit"]'],
          },
          buttons: [
            { text: '← Atrás', action: 'back' },
            { text: 'Siguiente →', action: 'next' },
          ],
          analytics: {
            step_name: 'booking_confirmation',
            step_order: 7,
          },
        },

        // Step 8: Booking Detail Page
        {
          id: 'guided-booking-detail',
          content: {
            title: '📄 Paso 8: Confirmación de Reserva',
            text: 'Aquí verás todos los detalles de tu reserva: auto, fechas, precio y estado. Guarda esta información para el día de retiro.',
          },
          position: 'top',
          target: {
            selector: '[data-tour-step="booking-summary"]',
            required: false,
            altSelectors: ['.booking-detail-container'],
          },
          buttons: [
            { text: '← Atrás', action: 'back' },
            { text: 'Siguiente →', action: 'next' },
          ],
          analytics: {
            step_name: 'booking_summary',
            step_order: 8,
          },
        },

        // Step 9: Chat with Owner
        {
          id: 'guided-chat',
          content: {
            title: '💬 Paso 9: Chat con el Dueño',
            text: 'Comunícate con el dueño del auto para coordinar el lugar de retiro, aclarar dudas o enviar documentación requerida.',
          },
          position: 'left',
          target: {
            selector: '[data-tour-step="booking-chat"]',
            required: false,
            altSelectors: ['.chat-button', '.messages-section'],
          },
          buttons: [
            { text: '← Atrás', action: 'back' },
            { text: 'Siguiente →', action: 'next' },
          ],
          analytics: {
            step_name: 'owner_communication',
            step_order: 9,
          },
        },

        // Step 10: Payment
        {
          id: 'guided-payment',
          content: {
            title: '💳 Paso 10: Pago Seguro',
            text: 'Realiza el pago con MercadoPago. El monto se retiene hasta que retires el auto. ¡Tu dinero está protegido!',
          },
          position: 'center',
          target: {
            selector: '[data-tour-step="payment-section"]',
            required: false,
          },
          buttons: [
            { text: '← Atrás', action: 'back' },
            { text: '¡Entendido! 🎉', action: 'complete', classes: 'shepherd-button-primary' },
          ],
          onAfter: async () => {
            // Track tour completion
            console.log('✅ GuidedBooking tour completed!');
          },
          analytics: {
            step_name: 'payment_process',
            step_order: 10,
          },
        },
      ],
    });

    // Renter Tour
    this.register({
      id: TourId.Renter,
      name: 'Tour para Rentadores',
      description: 'Aprende a buscar y rentar autos',
      priority: TourPriority.Normal,
      throttleHours: 168,
      version: '1.0.0',
      steps: [
        {
          id: 'renter-search',
          content: {
            title: 'Búsqueda de Autos',
            text: 'Usa los filtros para encontrar el auto perfecto para ti.',
          },
          position: 'bottom',
          target: { selector: '[data-tour-step="renter-search"]' },
        },
        {
          id: 'renter-filters',
          content: {
            title: 'Filtros Avanzados',
            text: 'Filtra por precio, marca, modelo, y características especiales.',
          },
          position: 'right',
          target: { selector: '[data-tour-step="renter-filters"]' },
        },
      ],
    });

    // Owner Tour
    this.register({
      id: TourId.Owner,
      name: 'Cómo Publicar tu Auto',
      description: 'Gana dinero rentando tu vehículo',
      priority: TourPriority.Normal,
      throttleHours: 168,
      version: '1.0.0',
      steps: [
        {
          id: 'owner-publish',
          content: {
            title: 'Publicar tu Auto',
            text: 'Comienza completando la información básica de tu vehículo.',
          },
          position: 'right',
          target: { selector: '[data-tour-step="owner-publish"]' },
        },
        {
          id: 'owner-photos',
          content: {
            title: 'Fotos del Auto',
            text: 'Sube fotos de calidad para atraer más rentadores.',
          },
          position: 'bottom',
          target: { selector: '[data-tour-step="owner-photos"]' },
        },
      ],
    });

    // Car Detail Tour
    this.register({
      id: TourId.CarDetail,
      name: 'Detalles del Auto',
      description: 'Conoce toda la información del vehículo',
      priority: TourPriority.Low,
      throttleHours: 336,
      version: '1.0.0',
      steps: [
        {
          id: 'detail-gallery',
          content: {
            title: 'Galería de Fotos',
            text: 'Explora las fotos del auto para conocerlo mejor.',
          },
          position: 'bottom',
          target: { selector: '[data-tour-step="detail-gallery"]' },
        },
        {
          id: 'detail-reviews',
          content: {
            title: 'Reseñas',
            text: 'Lee las experiencias de otros usuarios.',
          },
          position: 'top',
          target: { selector: '[data-tour-step="detail-reviews"]' },
        },
      ],
    });
  }

  // Helper to create step definitions programmatically
  createStep(
    id: string,
    content: string | StepContent,
    options: Partial<StepDefinition> = {},
  ): StepDefinition {
    return {
      id,
      content: typeof content === 'string' ? { text: content } : content,
      position: options.position || 'bottom',
      target: options.target,
      buttons: options.buttons || [{ text: 'Siguiente', action: 'next' }],
      ...options,
    };
  }
}
