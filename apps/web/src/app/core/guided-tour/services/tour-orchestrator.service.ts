import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import {
  TourId,
  TourDefinition,
  TourRequestOptions,
  TourState,
  TourPriority,
  StepDefinition,
} from '../interfaces/tour-definition.interface';
import { TourRegistryService } from '../registry/tour-registry.service';
import { ShepherdAdapterService } from '../adapters/shepherd-adapter.service';
import { StepResolverService } from '../resolvers/step-resolver.service';
import { TelemetryBridgeService } from './telemetry-bridge.service';

interface QueuedTour {
  tourId: TourId;
  options: TourRequestOptions;
  priority: TourPriority;
  timestamp: number;
}

@Injectable({
  providedIn: 'root',
})
export class TourOrchestratorService implements OnDestroy {
  private readonly STORAGE_PREFIX = 'autorenta:tour:';
  private readonly router = inject(Router);
  private readonly registry = inject(TourRegistryService);
  private readonly adapter = inject(ShepherdAdapterService);
  private readonly resolver = inject(StepResolverService);
  private readonly telemetry = inject(TelemetryBridgeService);

  // Reactive state using Angular Signals
  private stateSignal = signal<TourState>({
    activeTourId: null,
    currentStepIndex: 0,
    isRunning: false,
    isPaused: false,
    completedTours: new Set<string>(),
  });

  readonly state = this.stateSignal.asReadonly();

  private queue: QueuedTour[] = [];
  private routeSubscription?: Subscription;
  private currentDefinition?: TourDefinition;
  private stepIndexMap = new Map<string, number>();
  private isCancelling = false; // Prevent infinite loop

  constructor() {
    this.loadCompletedTours();
    this.setupRouteListener();
  }

  /**
   * Request a tour to be started
   */
  async requestTour(options: TourRequestOptions): Promise<boolean> {
    const { id, force = false } = options;

    // Get definition
    const definition = this.registry.getDefinition(id);
    if (!definition) {
      return false;
    }

    // Check if should skip
    if (!force && this.shouldSkipTour(definition)) {
      return false;
    }

    // Evaluate guards
    const guardsPass = await this.evaluateGuards(definition.guards || []);
    if (!guardsPass && !force) {
      return false;
    }

    // Check if a tour is already running
    if (this.state().isRunning && !force) {
      this.enqueueTour({
        tourId: id,
        options,
        priority: definition.priority || TourPriority.Normal,
        timestamp: Date.now(),
      });
      return false;
    }

    // Start tour
    await this.startTour(definition, options);
    return true;
  }

  /**
   * Cancel the current tour
   */
  cancelTour(): void {
    // Prevent infinite recursion (onCancel callback calls cancelTour again)
    if (this.isCancelling) return;
    if (!this.state().isRunning) return;

    this.isCancelling = true;

    try {
      const tourId = this.state().activeTourId;
      if (tourId) {
        this.telemetry.trackTourCancelled(tourId, this.adapter.getCurrentStepId());
      }

      this.adapter.cancel();
      this.cleanupTour();
      this.processQueue();
    } finally {
      this.isCancelling = false;
    }
  }

  /**
   * Complete the current tour
   */
  completeTour(): void {
    const tourId = this.state().activeTourId;
    if (!tourId) return;

    this.markTourCompleted(tourId);
    this.telemetry.trackTourCompleted(tourId);
    this.adapter.complete();
    this.cleanupTour();
    this.processQueue();
  }

  /**
   * Dismiss tour temporarily (will show again after throttle period)
   */
  dismissTour(tourId: TourId): void {
    const definition = this.currentDefinition || this.registry.getDefinition(tourId);
    if (!definition) return;

    const throttleMs = (definition.throttleHours || 24) * 60 * 60 * 1000;
    const resumeAt = Date.now() + throttleMs;

    this.saveToStorage(`${tourId}:dismissed-until`, resumeAt.toString());
    this.telemetry.trackTourCancelled(tourId, this.adapter.getCurrentStepId(), {
      dismissed: true,
    });

    this.adapter.cancel();
    this.cleanupTour();
  }

  /**
   * Reset tour state (for testing or manual restart)
   */
  resetTour(tourId: TourId): void {
    this.clearTourStorage(tourId);
    this.stateSignal.update((state) => {
      const completed = new Set(state.completedTours);
      completed.delete(tourId);
      return { ...state, completedTours: completed };
    });
  }

  /**
   * Get available tours that can be started
   */
  getAvailableTours(): TourDefinition[] {
    return this.registry.getAllDefinitions().filter((def) => !this.shouldSkipTour(def));
  }

  /**
   * Check if a tour has been completed
   */
  hasTourBeenCompleted(tourId: TourId): boolean {
    return this.state().completedTours.has(tourId);
  }

  // Private Methods

  private async startTour(definition: TourDefinition, options: TourRequestOptions): Promise<void> {
    try {
      this.currentDefinition = definition;

      // Update state
      this.stateSignal.update((state) => ({
        ...state,
        activeTourId: definition.id,
        currentStepIndex: 0,
        isRunning: true,
        isPaused: false,
      }));

      // Track start
      this.telemetry.trackTourStarted(definition.id, {
        mode: options.mode,
        reason: options.reason,
      });

      // Create tour with adapter
      this.adapter.createTour(definition.id, {
        useModalOverlay: true,
        canClickTarget: true,
      });

      // Add steps
      for (let i = 0; i < definition.steps.length; i++) {
        const step = definition.steps[i];
        this.stepIndexMap.set(step.id, i);
        await this.addStepToTour(step, i, definition.steps.length);
      }

      // Start the tour
      this.adapter.start();
    } catch (error) {
      this.telemetry.trackTourError(definition.id, error instanceof Error ? error : String(error));
      this.cleanupTour();
    }
  }

  private async addStepToTour(
    step: StepDefinition,
    index: number,
    totalSteps: number,
  ): Promise<void> {
    // Resolve responsive configuration
    const resolvedStep = this.resolveResponsiveStep(step);

    this.adapter.addStep(resolvedStep, {
      onShow: async () => {
        // Execute onBefore hook
        if (step.onBefore) {
          await step.onBefore();
        }

        // Resolve target
        if (step.target) {
          const element = await this.resolver.resolveStepTarget(step.target, {
            timeout: 10000,
            onTimeout: step.target.required ? 'abort' : 'skip',
          });

          if (!element && step.target.required) {
            this.adapter.next();
            return;
          }

          // Scroll to element if needed
          if (element && !this.resolver.isElementInViewport(element)) {
            await this.resolver.scrollToElement(element);
          }
        }

        // Track step shown
        const tourId = this.state().activeTourId;
        if (tourId) {
          this.telemetry.trackStepShown(tourId, step.id, {
            index,
            total: totalSteps,
          });
        }

        // Update state
        this.stateSignal.update((state) => ({
          ...state,
          currentStepIndex: index,
        }));
      },
      onHide: async () => {
        // Execute onAfter hook
        if (step.onAfter) {
          await step.onAfter();
        }

        // Track step completed
        const tourId = this.state().activeTourId;
        if (tourId) {
          this.telemetry.trackStepCompleted(tourId, step.id);
        }
      },
      onComplete: () => {
        this.completeTour();
      },
      onCancel: () => {
        this.cancelTour();
      },
    });
  }

  private resolveResponsiveStep(step: StepDefinition): StepDefinition {
    if (!step.responsive) return step;

    const breakpoint = this.getCurrentBreakpoint();
    const responsiveConfig = step.responsive[breakpoint];

    if (!responsiveConfig) return step;

    return {
      ...step,
      ...responsiveConfig,
      target: responsiveConfig.target || step.target,
      position: responsiveConfig.position || step.position,
    };
  }

  private getCurrentBreakpoint(): 'desktop' | 'tablet' | 'mobile' {
    if (typeof window === 'undefined') return 'desktop';

    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  private shouldSkipTour(definition: TourDefinition): boolean {
    // Check if completed
    if (this.hasTourBeenCompleted(definition.id)) {
      return true;
    }

    // Check throttle
    if (this.isThrottled(definition.id)) {
      return true;
    }

    return false;
  }

  private isThrottled(tourId: TourId): boolean {
    const dismissedUntil = this.loadFromStorage(`${tourId}:dismissed-until`);
    if (dismissedUntil) {
      const resumeAt = Number(dismissedUntil);
      if (Date.now() < resumeAt) {
        return true;
      }
      // Clear expired throttle
      this.removeFromStorage(`${tourId}:dismissed-until`);
    }
    return false;
  }

  private async evaluateGuards(
    guards: Array<{ check: () => Promise<boolean> | boolean }>,
  ): Promise<boolean> {
    for (const guard of guards) {
      try {
        const result = await guard.check();
        if (!result) return false;
      } catch {
        return false;
      }
    }
    return true;
  }

  private enqueueTour(queuedTour: QueuedTour): void {
    // Remove duplicates
    this.queue = this.queue.filter((t) => t.tourId !== queuedTour.tourId);

    // Add to queue
    this.queue.push(queuedTour);

    // Sort by priority (highest first)
    this.queue.sort((a, b) => b.priority - a.priority);
  }

  private processQueue(): void {
    if (this.queue.length === 0) return;

    const next = this.queue.shift();
    if (next) {
      setTimeout(() => {
        this.requestTour(next.options);
      }, 500); // Small delay before starting next tour
    }
  }

  private cleanupTour(): void {
    this.adapter.destroy();
    this.currentDefinition = undefined;
    this.stepIndexMap.clear();

    this.stateSignal.update((state) => ({
      ...state,
      activeTourId: null,
      currentStepIndex: 0,
      isRunning: false,
      isPaused: false,
    }));
  }

  private markTourCompleted(tourId: TourId): void {
    this.saveToStorage(tourId, 'completed');
    this.removeFromStorage(`${tourId}:dismissed-until`);

    this.stateSignal.update((state) => {
      const completed = new Set(state.completedTours);
      completed.add(tourId);
      return { ...state, completedTours: completed };
    });
  }

  private loadCompletedTours(): void {
    const completed = new Set<string>();

    Object.keys(localStorage)
      .filter((key) => key.startsWith(this.STORAGE_PREFIX))
      .filter((key) => !key.includes(':dismissed'))
      .forEach((key) => {
        const value = localStorage.getItem(key);
        if (value === 'completed') {
          const tourId = key.replace(this.STORAGE_PREFIX, '');
          completed.add(tourId);
        }
      });

    this.stateSignal.update((state) => ({ ...state, completedTours: completed }));
  }

  private setupRouteListener(): void {
    this.routeSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.handleRouteChange(event);
      });
  }

  private handleRouteChange(event: NavigationEnd): void {
    // Check if current tour should pause/cancel on route change
    if (this.currentDefinition) {
      // You can add logic here for route-sensitive tours
      // For now, we'll keep the tour running
    }

    // Check for auto-start tours based on route
    this.checkAutoStartTours(event.urlAfterRedirects || event.url);
  }

  private checkAutoStartTours(url: string): void {
    const definitions = this.registry.getAllDefinitions();

    for (const definition of definitions) {
      if (!definition.autoStart) continue;
      if (this.shouldSkipTour(definition)) continue;

      // Check route-based triggers
      if (definition.triggers) {
        for (const trigger of definition.triggers) {
          if (trigger.type === 'route' && trigger.routePattern) {
            if (trigger.routePattern.test(url)) {
              this.requestTour({ id: definition.id, mode: 'auto' });
              break;
            }
          }
        }
      }
    }
  }

  private clearTourStorage(tourId: TourId): void {
    this.removeFromStorage(tourId);
    this.removeFromStorage(`${tourId}:dismissed`);
    this.removeFromStorage(`${tourId}:dismissed-until`);
  }

  private saveToStorage(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`${this.STORAGE_PREFIX}${key}`, value);
  }

  private loadFromStorage(key: string): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(`${this.STORAGE_PREFIX}${key}`);
  }

  private removeFromStorage(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(`${this.STORAGE_PREFIX}${key}`);
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
    this.resolver.cleanup();
    this.adapter.destroy();
  }
}
