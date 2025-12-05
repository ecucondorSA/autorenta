/**
 * RENTER-SPECIFIC GUIDED TOURS
 *
 * Minimalist, immersive tours for car owners (Renters)
 * Short texts, clean design, non-intrusive
 */

import { TourDefinition, TourId, TourPriority } from '../interfaces/tour-definition.interface';

/**
 * Become a Renter - Streamlined Onboarding Tour
 */
export const BECOME_RENTER_TOUR: TourDefinition = {
  id: TourId.BecomeRenter,
  name: 'Convertite en Renter',
  description: 'Tour minimalista de onboarding',
  priority: TourPriority.High,
  autoStart: true,
  throttleHours: 168,
  version: '2.0.0',
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
        title: 'Tu auto puede generar ingresos',
        text: 'Hasta $120K/mes. Vos ponés el precio.',
      },
      position: 'center',
      buttons: [
        {
          text: 'Omitir',
          action: 'skip',
          classes: 'shepherd-button-secondary',
        },
        {
          text: 'Ver cómo',
          action: 'next',
          classes: 'shepherd-button-primary',
        },
      ],
    },
    {
      id: 'renter-calculator',
      content: {
        title: 'Calculá tus ganancias',
        text: 'Ajustá los valores y mirá cuánto podés ganar.',
      },
      position: 'bottom',
      target: {
        selector: '[data-tour-step="income-calculator"]',
        required: false,
      },
      buttons: [
        { text: '←', action: 'back', classes: 'shepherd-button-icon' },
        { text: 'Siguiente', action: 'next' },
      ],
    },
    {
      id: 'renter-benefits',
      content: {
        title: 'Seguro total incluido',
        text: 'Cobertura completa. Sin sorpresas.',
      },
      position: 'top',
      target: {
        selector: '[data-tour-step="benefits-grid"]',
        required: false,
      },
      buttons: [
        { text: '←', action: 'back', classes: 'shepherd-button-icon' },
        { text: 'Siguiente', action: 'next' },
      ],
    },
    {
      id: 'renter-process',
      content: {
        title: '4 pasos simples',
        text: 'Publicá hoy, empezá a ganar mañana.',
      },
      position: 'top',
      target: {
        selector: '[data-tour-step="process-steps"]',
        required: false,
      },
      buttons: [
        { text: '←', action: 'back', classes: 'shepherd-button-icon' },
        { text: 'Siguiente', action: 'next' },
      ],
    },
    {
      id: 'renter-cta',
      content: {
        title: 'Listo para empezar',
        text: 'Publicar es gratis. Toma 5 minutos.',
      },
      position: 'bottom',
      target: {
        selector: '[data-tour-step="start-publishing"]',
        required: false,
      },
      buttons: [
        { text: '←', action: 'back', classes: 'shepherd-button-icon' },
        {
          text: 'Entendido',
          action: 'complete',
          classes: 'shepherd-button-primary',
        },
      ],
    },
  ],
};

/**
 * Referral System Tour - Minimal
 */
export const REFERRAL_SYSTEM_TOUR: TourDefinition = {
  id: TourId.ReferralSystem,
  name: 'Referidos',
  description: 'Tour de referidos',
  priority: TourPriority.Normal,
  throttleHours: 72,
  version: '2.0.0',
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
        title: 'Tu código único',
        text: 'Compartilo y ganá $2,500 por cada amigo.',
      },
      position: 'bottom',
      target: {
        selector: '[data-tour-step="referral-code"]',
        required: false,
      },
      buttons: [
        { text: 'Omitir', action: 'skip', classes: 'shepherd-button-secondary' },
        { text: 'Ver más', action: 'next', classes: 'shepherd-button-primary' },
      ],
    },
    {
      id: 'referral-share',
      content: {
        title: 'Compartí fácil',
        text: 'WhatsApp, email o copiá el link.',
      },
      position: 'bottom',
      target: {
        selector: '[data-tour-step="share-buttons"]',
        required: false,
      },
      buttons: [
        { text: '←', action: 'back', classes: 'shepherd-button-icon' },
        { text: 'Entendido', action: 'complete', classes: 'shepherd-button-primary' },
      ],
    },
  ],
};

/**
 * Publish Car Tour - Minimal
 */
export const PUBLISH_CAR_TOUR: TourDefinition = {
  id: TourId.PublishCar,
  name: 'Publicar Auto',
  description: 'Tour de publicación',
  priority: TourPriority.High,
  throttleHours: 168,
  version: '2.0.0',
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
        title: 'Publicá tu auto',
        text: '5 minutos. Todo guiado.',
      },
      position: 'center',
      buttons: [
        { text: 'Ya sé', action: 'skip', classes: 'shepherd-button-secondary' },
        { text: 'Empezar', action: 'next', classes: 'shepherd-button-primary' },
      ],
    },
    {
      id: 'publish-basic-info',
      content: {
        title: 'Datos del auto',
        text: 'Marca, modelo, año y patente.',
      },
      position: 'right',
      target: {
        selector: '[data-tour-step="basic-info"]',
        required: false,
      },
      buttons: [
        { text: '←', action: 'back', classes: 'shepherd-button-icon' },
        { text: 'Entendido', action: 'complete', classes: 'shepherd-button-primary' },
      ],
    },
  ],
};

/**
 * Wallet & Earnings Tour - Minimal
 */
export const WALLET_EARNINGS_TOUR: TourDefinition = {
  id: TourId.WalletEarnings,
  name: 'Wallet',
  description: 'Tour de wallet',
  priority: TourPriority.Normal,
  throttleHours: 72,
  version: '2.0.0',
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
        title: 'Tu saldo',
        text: 'Se acredita automáticamente.',
      },
      position: 'bottom',
      target: {
        selector: '[data-tour-step="wallet-balance"]',
        required: false,
      },
      buttons: [
        { text: 'Omitir', action: 'skip', classes: 'shepherd-button-secondary' },
        { text: 'Ver más', action: 'next', classes: 'shepherd-button-primary' },
      ],
    },
    {
      id: 'wallet-withdraw',
      content: {
        title: 'Retirá cuando quieras',
        text: 'A tu banco o MercadoPago. 24-48hs.',
      },
      position: 'left',
      target: {
        selector: '[data-tour-step="withdraw-button"]',
        required: false,
      },
      buttons: [
        { text: '←', action: 'back', classes: 'shepherd-button-icon' },
        { text: 'Entendido', action: 'complete', classes: 'shepherd-button-primary' },
      ],
    },
  ],
};

/**
 * First Booking Tour - Celebration
 */
export const FIRST_BOOKING_TOUR: TourDefinition = {
  id: TourId.FirstBooking,
  name: 'Primera Reserva',
  description: 'Celebración primera reserva',
  priority: TourPriority.Critical,
  version: '2.0.0',
  steps: [
    {
      id: 'first-booking-celebration',
      content: {
        title: 'Tu primera reserva',
        text: 'Alguien quiere tu auto. Revisá los detalles.',
      },
      position: 'center',
      buttons: [
        {
          text: 'Ver reserva',
          action: 'complete',
          classes: 'shepherd-button-primary',
        },
      ],
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
