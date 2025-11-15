/**
 * RENTER-SPECIFIC GUIDED TOURS
 *
 * Comprehensive tours for users who want to become Renters (car owners)
 * and monetize their vehicles through the platform.
 */

import { TourDefinition, TourId, TourPriority } from '../interfaces/tour-definition.interface';

/**
 * Become a Renter - Complete Onboarding Tour
 */
export const BECOME_RENTER_TOUR: TourDefinition = {
  id: TourId.BecomeRenter,
  name: 'Convertite en Renter',
  description: 'Aprende cómo ganar dinero alquilando tu auto en 7 pasos',
  priority: TourPriority.High,
  autoStart: true,
  throttleHours: 168,
  version: '1.0.0',
  guards: [
    {
      name: 'isOnBecomeRenterPage',
      check: () => {
        return typeof window !== 'undefined' && window.location.pathname === '/become-renter';
      },
    },
  ],
  triggers: [
    {
      type: 'route',
      routePattern: /^\/become-renter$/,
    },
  ],
  steps: [
    {
      id: 'renter-welcome',
      content: {
        title: '🏠 ¡Bienvenido a AutoRenta para Renters!',
        text: 'Te mostraremos cómo ganar hasta $120,000/mes alquilando tu auto de forma segura y rentable. Solo toma 2 minutos.',
      },
      position: 'center',
      buttons: [
        {
          text: 'Ver después',
          action: 'skip',
          classes: 'shepherd-button-secondary',
        },
        {
          text: '¡Empecemos! 🚀',
          action: 'next',
          classes: 'shepherd-button-primary',
        },
      ],
    },
    {
      id: 'renter-calculator',
      content: {
        title: '💰 Calculadora de Ingresos',
        text: 'Usa esta calculadora para estimar cuánto puedes ganar con tu auto. Ajusta el valor del auto, días por mes y precio por día para ver tu potencial de ingresos.',
      },
      position: 'bottom',
      target: {
        selector: '[data-tour-step="income-calculator"]',
        required: false,
      },
      buttons: [
        { text: '← Atrás', action: 'back' },
        { text: 'Siguiente →', action: 'next' },
      ],
    },
    {
      id: 'renter-benefits',
      content: {
        title: '✨ Beneficios de ser Renter',
        text: 'Explora los 6 beneficios principales: seguro completo, pagos protegidos, comunidad verificada, flexibilidad total, soporte 24/7 y sin costos de publicación.',
      },
      position: 'top',
      target: {
        selector: '[data-tour-step="benefits-grid"]',
        required: false,
      },
      buttons: [
        { text: '← Atrás', action: 'back' },
        { text: 'Siguiente →', action: 'next' },
      ],
    },
    {
      id: 'renter-process',
      content: {
        title: '📝 Proceso en 4 Pasos',
        text: 'Ver tu auto → Crear tu anuncio → Recibir reservas → Ganar dinero. Es así de simple. Te guiamos en cada paso del camino.',
      },
      position: 'top',
      target: {
        selector: '[data-tour-step="process-steps"]',
        required: false,
      },
      buttons: [
        { text: '← Atrás', action: 'back' },
        { text: 'Siguiente →', action: 'next' },
      ],
    },
    {
      id: 'renter-testimonials',
      content: {
        title: '⭐ Testimonios Reales',
        text: 'Lee las experiencias de otros Renters que ya están ganando dinero. María gana $120,000/mes, Carlos $80,000/mes, Laura $150,000/mes y Diego $95,000/mes.',
      },
      position: 'bottom',
      target: {
        selector: '[data-tour-step="testimonials"]',
        required: false,
      },
      buttons: [
        { text: '← Atrás', action: 'back' },
        { text: 'Siguiente →', action: 'next' },
      ],
    },
    {
      id: 'renter-referrals',
      content: {
        title: '🎁 Programa de Referidos',
        text: 'Gana hasta $2,500 ARS extra por cada amigo que invites a ser Renter. Ellos también reciben $1,500 ARS. ¡Es ganar-ganar!',
      },
      position: 'top',
      target: {
        selector: '[data-tour-step="referral-program"]',
        required: false,
      },
      buttons: [
        { text: '← Atrás', action: 'back' },
        { text: 'Siguiente →', action: 'next' },
      ],
    },
    {
      id: 'renter-cta',
      content: {
        title: '🚀 ¡Listo para Empezar!',
        text: 'Ahora que conoces todo, es momento de publicar tu auto. Haz clic en "Publicar mi auto" para comenzar. ¡Tus primeros ingresos están a solo minutos!',
      },
      position: 'bottom',
      target: {
        selector: '[data-tour-step="start-publishing"]',
        required: false,
      },
      buttons: [
        { text: '← Atrás', action: 'back' },
        {
          text: '¡Entendido! 🎉',
          action: 'complete',
          classes: 'shepherd-button-primary',
        },
      ],
    },
  ],
};

/**
 * Referral System Tour
 */
export const REFERRAL_SYSTEM_TOUR: TourDefinition = {
  id: TourId.ReferralSystem,
  name: 'Sistema de Referidos',
  description: 'Aprende a ganar dinero invitando amigos Renters',
  priority: TourPriority.Normal,
  throttleHours: 72,
  version: '1.0.0',
  guards: [
    {
      name: 'isOnReferralsPage',
      check: () => {
        return typeof window !== 'undefined' && window.location.pathname === '/referrals';
      },
    },
  ],
  steps: [
    {
      id: 'referral-code',
      content: {
        title: '🔗 Tu Código Único',
        text: 'Este es tu código de referido personal. Cada usuario tiene un código único que puede compartir con amigos.',
      },
      position: 'bottom',
      target: {
        selector: '[data-tour-step="referral-code"]',
        required: false,
      },
      buttons: [
        { text: 'Ver después', action: 'skip', classes: 'shepherd-button-secondary' },
        { text: 'Siguiente →', action: 'next', classes: 'shepherd-button-primary' },
      ],
    },
    {
      id: 'referral-share',
      content: {
        title: '📤 Compartir tu Link',
        text: 'Puedes copiar tu código o el link completo para compartirlo por WhatsApp, email o redes sociales.',
      },
      position: 'bottom',
      target: {
        selector: '[data-tour-step="share-buttons"]',
        required: false,
      },
      buttons: [
        { text: '← Atrás', action: 'back' },
        { text: 'Siguiente →', action: 'next' },
      ],
    },
    {
      id: 'referral-stats',
      content: {
        title: '📊 Estadísticas de Referidos',
        text: 'Aquí ves tus métricas: total de invitados, cuánto ganaste, cuánto tienes pendiente y el estado de cada referido.',
      },
      position: 'top',
      target: {
        selector: '[data-tour-step="referral-stats"]',
        required: false,
      },
      buttons: [
        { text: '← Atrás', action: 'back' },
        { text: 'Siguiente →', action: 'next' },
      ],
    },
    {
      id: 'referral-rewards',
      content: {
        title: '💰 Cómo Funcionan las Recompensas',
        text: 'Tu amigo recibe $500 al registrarse + $1,000 al publicar su primer auto. Tú recibes $1,500 cuando tu amigo publique. Los pagos son automáticos a tu wallet.',
      },
      position: 'center',
      buttons: [
        { text: '← Atrás', action: 'back' },
        { text: '¡Entendido!', action: 'complete', classes: 'shepherd-button-primary' },
      ],
    },
  ],
};

/**
 * Publish Car Tour
 */
export const PUBLISH_CAR_TOUR: TourDefinition = {
  id: TourId.PublishCar,
  name: 'Publicar mi Auto',
  description: 'Guía paso a paso para publicar tu auto',
  priority: TourPriority.High,
  throttleHours: 168,
  version: '1.0.0',
  guards: [
    {
      name: 'isOnPublishPage',
      check: () => {
        return (
          typeof window !== 'undefined' &&
          (window.location.pathname.includes('/publish') ||
            window.location.pathname.includes('/cars/new'))
        );
      },
    },
  ],
  steps: [
    {
      id: 'publish-welcome',
      content: {
        title: '🚗 Publicar tu Auto',
        text: 'Te guiaremos paso a paso para crear tu anuncio perfecto. Toma solo 10 minutos.',
      },
      position: 'center',
      buttons: [
        { text: 'Ver después', action: 'skip', classes: 'shepherd-button-secondary' },
        { text: '¡Empecemos!', action: 'next', classes: 'shepherd-button-primary' },
      ],
    },
    {
      id: 'publish-basic-info',
      content: {
        title: '📝 Información Básica',
        text: 'Comienza ingresando la marca, modelo, año y patente de tu auto.',
      },
      position: 'right',
      target: {
        selector: '[data-tour-step="basic-info"]',
        required: false,
      },
      buttons: [
        { text: '← Atrás', action: 'back' },
        { text: 'Siguiente →', action: 'next' },
      ],
    },
    {
      id: 'publish-photos',
      content: {
        title: '📸 Fotos del Auto',
        text: 'Sube hasta 10 fotos de tu auto. Las fotos de calidad atraen más reservas.',
      },
      position: 'bottom',
      target: {
        selector: '[data-tour-step="photo-upload"]',
        required: false,
      },
      buttons: [
        { text: '← Atrás', action: 'back' },
        { text: '¡Entendido!', action: 'complete', classes: 'shepherd-button-primary' },
      ],
    },
  ],
};

/**
 * Wallet & Earnings Tour
 */
export const WALLET_EARNINGS_TOUR: TourDefinition = {
  id: TourId.WalletEarnings,
  name: 'Wallet y Ganancias',
  description: 'Aprende a gestionar tus ingresos y retiros',
  priority: TourPriority.Normal,
  throttleHours: 72,
  version: '1.0.0',
  guards: [
    {
      name: 'isOnWalletPage',
      check: () => {
        return typeof window !== 'undefined' && window.location.pathname === '/wallet';
      },
    },
  ],
  steps: [
    {
      id: 'wallet-balance',
      content: {
        title: '💰 Tu Saldo',
        text: 'Aquí ves tu saldo disponible para retirar. El dinero de las reservas se acredita automáticamente.',
      },
      position: 'bottom',
      target: {
        selector: '[data-tour-step="wallet-balance"]',
        required: false,
      },
      buttons: [
        { text: 'Ver después', action: 'skip', classes: 'shepherd-button-secondary' },
        { text: 'Siguiente →', action: 'next', classes: 'shepherd-button-primary' },
      ],
    },
    {
      id: 'wallet-withdraw',
      content: {
        title: '💸 Retirar Dinero',
        text: 'Retira tu saldo a tu cuenta bancaria o MercadoPago. Los retiros se procesan en 24-48 horas.',
      },
      position: 'left',
      target: {
        selector: '[data-tour-step="withdraw-button"]',
        required: false,
      },
      buttons: [
        { text: '← Atrás', action: 'back' },
        { text: '¡Entendido!', action: 'complete', classes: 'shepherd-button-primary' },
      ],
    },
  ],
};

/**
 * First Booking Received Tour
 */
export const FIRST_BOOKING_TOUR: TourDefinition = {
  id: TourId.FirstBooking,
  name: 'Primera Reserva Recibida',
  description: '¡Felicitaciones! Aprende a gestionar tu primera reserva',
  priority: TourPriority.Critical,
  version: '1.0.0',
  steps: [
    {
      id: 'first-booking-celebration',
      content: {
        title: '🎉 ¡Felicitaciones por tu Primera Reserva!',
        text: 'Has recibido tu primera solicitud de reserva. Te guiaremos para que todo salga perfecto.',
      },
      position: 'center',
      buttons: [
        {
          text: '¡Ver mi reserva! 🚀',
          action: 'next',
          classes: 'shepherd-button-primary',
        },
      ],
    },
    {
      id: 'booking-details',
      content: {
        title: '📋 Detalles de la Reserva',
        text: 'Aquí ves toda la información: fechas, precio, datos del usuario. Puedes aprobar o rechazar la solicitud.',
      },
      position: 'right',
      target: {
        selector: '[data-tour-step="booking-details"]',
        required: false,
      },
      buttons: [{ text: '¡Entendido!', action: 'complete', classes: 'shepherd-button-primary' }],
    },
  ],
};

/**
 * All Renter Tours Registry
 */
export const RENTER_TOURS = [
  BECOME_RENTER_TOUR,
  REFERRAL_SYSTEM_TOUR,
  PUBLISH_CAR_TOUR,
  WALLET_EARNINGS_TOUR,
  FIRST_BOOKING_TOUR,
];
