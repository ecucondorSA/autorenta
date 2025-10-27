import { Injectable, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import Shepherd from 'shepherd.js';
import type { Tour } from 'shepherd.js';
import { Subscription, filter } from 'rxjs';

// #region Enums and Interfaces
export enum TourId {
  Welcome = 'welcome',
  GuidedBooking = 'guided-booking',
  Renter = 'renter',
  Owner = 'owner',
  CarDetail = 'car-detail',
}

export interface AvailableTour {
  id: TourId;
  name: string;
  description: string;
}

export enum WelcomeStep {
  Hero = 'welcome-hero',
  Nav = 'welcome-nav',
  Help = 'welcome-help',
}

export enum GuidedBookingStep {
  Search = 'guided-search',
  SelectCar = 'guided-select-car',
  CarDetail = 'guided-car-detail',
  Dates = 'guided-dates',
  Price = 'guided-price',
  BookButton = 'guided-book-button',
  BookingDetail = 'guided-booking-detail',
  Chat = 'guided-chat',
  Payment = 'guided-payment',
  Complete = 'guided-complete',
}

export enum RenterStep {
  Search = 'renter-search',
  Filters = 'renter-filters',
  Map = 'renter-map',
  Card = 'renter-card',
}

export enum OwnerStep {
  Publish = 'owner-publish',
  Photos = 'owner-photos',
  Pricing = 'owner-pricing',
  Insurance = 'owner-insurance',
  Calendar = 'owner-calendar',
  PublishBtn = 'owner-publish-btn',
}

export enum CarDetailStep {
  Gallery = 'detail-gallery',
  Reviews = 'detail-reviews',
  Insurance = 'detail-insurance',
  Book = 'detail-book',
}

export type TourStepId = WelcomeStep | GuidedBookingStep | RenterStep | OwnerStep | CarDetailStep;

export interface TourStepConfig {
  id: TourStepId;
  text: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  selector?: string;
  navigateTo?: string;
}
// #endregion

@Injectable({
  providedIn: 'root',
})
export class TourService {
  private tour?: Tour;
  private readonly STORAGE_PREFIX = 'autorenta:tour:';
  private readonly DISMISSAL_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h
  private readonly WAIT_TIMEOUT_MS = 12 * 1000; // 12s
  private readonly WAIT_INTERVAL_MS = 150;
  private readonly MOBILE_BREAKPOINT_PX = 768;

  private readonly router = inject(Router);
  private activeTourId: TourId | null = null;
  private routeSubscription?: Subscription;
  private guidedRouteStepsShown = new Set<string>();

  constructor() {}

  // #region Public API
  getAvailableTours(): AvailableTour[] {
    return [
      {
        id: TourId.Welcome,
        name: 'Bienvenida',
        description: 'Un recorrido rápido por las funciones principales.',
      },
      {
        id: TourId.GuidedBooking,
        name: 'Cómo Reservar',
        description: 'Una guía paso a paso para alquilar tu primer auto.',
      },
      {
        id: TourId.Owner,
        name: 'Cómo Publicar tu Auto',
        description: 'Aprendé a ganar dinero con tu vehículo.',
      },
    ];
  }

  startWelcomeTour(): void {
    // DEPRECATED: This service is being replaced by GuidedTourService
    // Uncomment the line below to temporarily disable old system
    console.warn(
      '[OLD TourService] startWelcomeTour() called - This will be removed soon. Use GuidedTourService instead.',
    );
    return; // Disabled - use new GuidedTourService

    // if (this.shouldSkipTour(TourId.Welcome)) return;
    // const steps = this.getWelcomeTourSteps();
    // this.buildTour(TourId.Welcome, steps);
  }

  startGuidedBookingTour(): void {
    // DEPRECATED: This service is being replaced by GuidedTourService
    console.warn(
      '[OLD TourService] startGuidedBookingTour() called - This will be removed soon. Use GuidedTourService instead.',
    );
    return; // Disabled - use new GuidedTourService

    // if (this.shouldSkipTour(TourId.GuidedBooking)) return;
    // if (this.activeTourId && this.activeTourId !== TourId.GuidedBooking) {
    //   this.tour?.cancel();
    // }

    // this.tour = this.createTour(TourId.GuidedBooking, !this.isMobile());
    // this.guidedRouteStepsShown.clear();
    // this.ensureRouterListener();

    // this._addGuidedBookingSearchSteps();
    // this._addGuidedBookingDetailSteps();
    // this._addGuidedBookingBookingSteps();
    // this._addGuidedBookingCompletionStep();

    // this.tour?.start();
    // this.showGuidedBookingStepForUrl(this.router.url);
  }

  startRenterTour(): void {
    if (this.shouldSkipTour(TourId.Renter)) return;
    const steps = this.getRenterTourSteps();
    this.buildTour(TourId.Renter, steps);
  }

  startOwnerTour(): void {
    if (this.shouldSkipTour(TourId.Owner)) return;
    const steps = this.getOwnerTourSteps();
    this.buildTour(TourId.Owner, steps);
  }

  startCarDetailTour(): void {
    if (this.shouldSkipTour(TourId.CarDetail)) return;
    const steps = this.getCarDetailTourSteps();
    this.buildTour(TourId.CarDetail, steps);
  }

  showQuickTip(
    stepId: TourStepId,
    message: string,
    position: 'top' | 'bottom' | 'left' | 'right' = 'bottom',
  ): void {
    const selector = this.getSelectorForStep(stepId);
    const tip = new Shepherd.Tour({
      useModalOverlay: false,
      defaultStepOptions: { scrollTo: false, classes: 'shepherd-theme-custom shepherd-quick-tip' },
    });
    tip.addStep({
      id: 'quick-tip',
      text: `<div class="tour-content">${message}</div>`,
      attachTo: { element: selector, on: position },
      buttons: [{ text: 'Entendido', action: () => tip.complete() }],
    });
    tip.start();
    setTimeout(() => {
      if (tip.isActive()) tip.complete();
    }, 8000);
  }

  restartTour(tourId: TourId): void {
    this.clearTourState(tourId);
    switch (tourId) {
      case TourId.Welcome:
        this.startWelcomeTour();
        break;
      case TourId.Renter:
        this.startRenterTour();
        break;
      case TourId.Owner:
        this.startOwnerTour();
        break;
      case TourId.CarDetail:
        this.startCarDetailTour();
        break;
      case TourId.GuidedBooking:
        this.startGuidedBookingTour();
        break;
    }
  }
  // #endregion

  // #region Tour Step Definitions
  private getWelcomeTourSteps(): TourStepConfig[] {
    return [
      { id: WelcomeStep.Hero, text: `...`, position: 'bottom' },
      { id: WelcomeStep.Nav, text: `...`, position: 'bottom' },
      { id: WelcomeStep.Help, text: `...`, position: 'left' },
    ];
  }

  private getRenterTourSteps(): TourStepConfig[] {
    return [
      { id: RenterStep.Search, text: '...', position: 'bottom' },
      { id: RenterStep.Filters, text: '...', position: 'right' },
      { id: RenterStep.Map, text: '...', position: 'left' },
      { id: RenterStep.Card, text: '...', position: 'top' },
    ];
  }

  private getOwnerTourSteps(): TourStepConfig[] {
    return [
      { id: OwnerStep.Publish, position: 'right', text: '...' },
      { id: OwnerStep.Photos, position: 'bottom', text: '...' },
      { id: OwnerStep.Pricing, position: 'left', text: '...' },
      { id: OwnerStep.Insurance, position: 'right', text: '...' },
      { id: OwnerStep.Calendar, position: 'top', text: '...' },
      { id: OwnerStep.PublishBtn, position: 'left', text: '...' },
    ];
  }

  private getCarDetailTourSteps(): TourStepConfig[] {
    return [
      { id: CarDetailStep.Gallery, position: 'bottom', text: '...' },
      { id: CarDetailStep.Reviews, position: 'top', text: '...' },
      { id: CarDetailStep.Insurance, position: 'right', text: '...' },
      { id: CarDetailStep.Book, position: 'left', text: '...' },
    ];
  }
  // #endregion

  // #region Guided Booking Steps Breakdown
  private _addGuidedBookingSearchSteps() {
    this.tour?.addStep({
      id: GuidedBookingStep.Search,
      text: `...`,
      beforeShowPromise: () =>
        this.waitForElement(this.getSelectorForStep(GuidedBookingStep.Search)),
      attachTo: { element: this.getSelectorForStep(GuidedBookingStep.Search), on: 'right' },
      buttons: [
        {
          text: 'Ver después',
          classes: 'shepherd-button-secondary',
          action: () => this.dismissTour(TourId.GuidedBooking),
        },
        { text: 'Siguiente →', action: () => this.tour?.next() },
      ],
    });

    this.tour?.addStep({
      id: GuidedBookingStep.SelectCar,
      text: `...`,
      beforeShowPromise: () =>
        this.waitForElement(this.getSelectorForStep(GuidedBookingStep.SelectCar)),
      attachTo: { element: this.getSelectorForStep(GuidedBookingStep.SelectCar), on: 'top' },
      buttons: [
        { text: '← Atrás', classes: 'shepherd-button-secondary', action: () => this.tour?.back() },
        {
          text: 'Continuar →',
          classes: 'shepherd-button-primary shepherd-button-loading-indicator',
          action: () =>
            this.goToNextWhenReady(this.getSelectorForStep(GuidedBookingStep.CarDetail)),
        },
      ],
    });
  }

  private _addGuidedBookingDetailSteps() {
    // ... similar implementation for other steps
  }

  private _addGuidedBookingBookingSteps() {
    // ... similar implementation for other steps
  }

  private _addGuidedBookingCompletionStep() {
    // ... similar implementation for other steps
  }
  // #endregion

  // #region Core Tour Logic
  private buildTour(tourId: TourId, steps: TourStepConfig[]): void {
    this.tour = this.createTour(tourId, !this.isMobile());

    steps.forEach((step, index) => {
      const selector = step.selector ?? this.getSelectorForStep(step.id);
      this.tour!.addStep({
        id: step.id,
        text: step.text,
        beforeShowPromise: () => this.waitForElement(selector),
        attachTo: { element: selector, on: step.position },
        buttons: [
          ...(index > 0 ? [{ text: 'Atrás', action: () => this.tour?.back() }] : []),
          {
            text: index === steps.length - 1 ? '¡Entendido!' : 'Siguiente',
            classes:
              index === steps.length - 1
                ? 'shepherd-button-primary'
                : 'shepherd-button-primary shepherd-button-loading-indicator',
            action:
              index === steps.length - 1
                ? () => this.completeTour(tourId, false)
                : () => this.tour?.next(),
          },
        ],
      });
    });

    this.tour.start();
  }

  private createTour(tourId: TourId, useModalOverlay = true): Tour {
    this.activeTourId = tourId;
    const tour = new Shepherd.Tour({
      useModalOverlay,
      defaultStepOptions: {
        cancelIcon: { enabled: true },
        canClickTarget: true,
        scrollTo: { behavior: 'smooth', block: 'center' },
        classes: 'shepherd-theme-custom',
        when: {
          show: () => {
            this.trackEvent('tour_step_viewed', {
              tour_id: tourId,
              step_id: tour.getCurrentStep()?.id,
            });
          },
        },
      },
    });
    tour.on('cancel', () => {
      this.trackEvent('tour_cancelled', { tour_id: tourId, step_id: tour.getCurrentStep()?.id });
      this.handleTourFinished(tourId);
    });
    tour.on('complete', () => {
      this.trackEvent('tour_completed', { tour_id: tourId });
      this.handleTourFinished(tourId);
    });
    return tour;
  }

  private handleTourFinished(tourId: TourId): void {
    if (this.activeTourId !== tourId) return;
    if (tourId === TourId.GuidedBooking) {
      this.guidedRouteStepsShown.clear();
      this.teardownRouterListener();
    }
    this.activeTourId = null;
  }
  // #endregion

  // #region State and Navigation
  private shouldSkipTour(tourId: TourId): boolean {
    if (this.hasSeenTour(tourId)) return true;
    if (this.activeTourId && this.activeTourId !== tourId) return true;
    if (this.activeTourId === tourId && this.tour?.isActive()) return true;
    return false;
  }

  private hasSeenTour(tourId: TourId): boolean {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const key = `${this.STORAGE_PREFIX}${tourId}`;
    if (localStorage.getItem(key) === 'completed') return true;
    const dismissedUntil = localStorage.getItem(`${key}:dismissed-until`);
    if (dismissedUntil) {
      const resumeAt = Number(dismissedUntil);
      if (Date.now() < resumeAt) return true;
      localStorage.removeItem(`${key}:dismissed-until`);
      localStorage.removeItem(`${key}:dismissed`);
    }
    return false;
  }

  private completeTour(tourId: TourId, dismissed: boolean): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(`${this.STORAGE_PREFIX}${tourId}`, 'completed');
      localStorage.removeItem(`${this.STORAGE_PREFIX}${tourId}:dismissed-until`);
      if (dismissed) {
        localStorage.setItem(`${this.STORAGE_PREFIX}${tourId}:dismissed`, 'true');
      } else {
        localStorage.removeItem(`${this.STORAGE_PREFIX}${tourId}:dismissed`);
      }
    }
    this.tour?.complete();
  }

  private dismissTour(tourId: TourId): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      const resumeAt = Date.now() + this.DISMISSAL_COOLDOWN_MS;
      localStorage.setItem(`${this.STORAGE_PREFIX}${tourId}:dismissed-until`, String(resumeAt));
      localStorage.setItem(`${this.STORAGE_PREFIX}${tourId}:dismissed`, 'true');
    }
    this.trackEvent('tour_dismissed_temporarily', { tour_id: tourId });
    this.tour?.cancel();
  }

  private clearTourState(tourId: TourId): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(`${this.STORAGE_PREFIX}${tourId}`);
      localStorage.removeItem(`${this.STORAGE_PREFIX}${tourId}:dismissed`);
      localStorage.removeItem(`${this.STORAGE_PREFIX}${tourId}:dismissed-until`);
    }
  }

  private ensureRouterListener(): void {
    if (typeof window === 'undefined' || this.routeSubscription) return;
    this.routeSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.handleNavigation(event));
  }

  private handleNavigation(event: NavigationEnd): void {
    this.showGuidedBookingStepForUrl(event.urlAfterRedirects ?? event.url);
  }

  private showGuidedBookingStepForUrl(url: string): void {
    if (!this.tour || this.activeTourId !== TourId.GuidedBooking) return;
    const carDetailPattern = /^\/cars\/[^/]+/;
    const bookingDetailPattern = /^\/bookings\/[^/]+/;
    if (
      carDetailPattern.test(url) &&
      !this.guidedRouteStepsShown.has(GuidedBookingStep.CarDetail)
    ) {
      this.guidedRouteStepsShown.add(GuidedBookingStep.CarDetail);
      this.tour.show(GuidedBookingStep.CarDetail);
    } else if (
      bookingDetailPattern.test(url) &&
      !this.guidedRouteStepsShown.has(GuidedBookingStep.BookingDetail)
    ) {
      this.guidedRouteStepsShown.add(GuidedBookingStep.BookingDetail);
      this.tour.show(GuidedBookingStep.BookingDetail);
    }
  }

  private teardownRouterListener(): void {
    this.routeSubscription?.unsubscribe();
    this.routeSubscription = undefined;
  }
  // #endregion

  // #region DOM and Element Handling
  private isMobile(): boolean {
    return typeof window !== 'undefined' && window.innerWidth < this.MOBILE_BREAKPOINT_PX;
  }

  private getSelectorForStep(stepId: TourStepId): string {
    return `[data-tour-step="${stepId}"]`;
  }

  private waitForElement(selector: string): Promise<void> {
    if (typeof document === 'undefined') return Promise.resolve();
    return new Promise((resolve, _reject) => {
      const startedAt = Date.now();
      const tryFind = () => {
        const element = document.querySelector(selector);
        if (element) return resolve();
        if (Date.now() - startedAt >= this.WAIT_TIMEOUT_MS) {
          this.trackEvent('tour_element_timeout', { selector });
          console.warn(`Tour: Timeout waiting for selector: ${selector}. Continuing anyway...`);
          return resolve(); // Changed from reject to resolve to continue tour
        }
        setTimeout(tryFind, this.WAIT_INTERVAL_MS);
      };
      tryFind();
    });
  }

  private goToNextWhenReady(selector: string): void {
    if (!this.tour) return;
    const currentStep = this.tour.getCurrentStep();
    const currentStepId = currentStep?.id;
    const nextButton = currentStep
      ?.getElement()
      ?.querySelector('.shepherd-button-loading-indicator');
    nextButton?.classList.add('is-loading');

    this.waitForElement(selector)
      .then(() => {
        if (this.tour && currentStepId === this.tour.getCurrentStep()?.id) {
          this.tour.next();
        }
      })
      .catch((err) => {
        console.warn(`[Tour] Could not find next element: "${selector}"`, err);
        this.tour?.cancel(); // Cancel tour on error
      })
      .finally(() => {
        nextButton?.classList.remove('is-loading');
      });
  }
  // #endregion

  // #region Analytics
  private trackEvent(eventName: string, properties: Record<string, unknown>): void {
    // TODO: Integrate with your actual analytics service.
    console.log(`[Analytics] Event: ${eventName}`, properties);
  }
  // #endregion
}
