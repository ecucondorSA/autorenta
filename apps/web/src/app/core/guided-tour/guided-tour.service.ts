import { Injectable, inject } from '@angular/core';
import { TourOrchestratorService } from './services/tour-orchestrator.service';
import { TourRegistryService } from './registry/tour-registry.service';
import { TelemetryBridgeService } from './services/telemetry-bridge.service';
import {
  TourId,
  TourRequestOptions,
  TourDefinition,
  TourState,
} from './interfaces/tour-definition.interface';

/**
 * Main public API for the Guided Tour system
 *
 * Usage:
 * ```typescript
 * // In component
 * private guidedTour = inject(GuidedTourService);
 *
 * // Request a tour
 * this.guidedTour.request({ id: TourId.Welcome });
 *
 * // Check state
 * const isRunning = this.guidedTour.isRunning();
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class GuidedTourService {
  private readonly orchestrator = inject(TourOrchestratorService);
  private readonly registry = inject(TourRegistryService);
  private readonly telemetry = inject(TelemetryBridgeService);

  /**
   * Request a tour to be started
   */
  async request(options: TourRequestOptions): Promise<boolean> {
    return this.orchestrator.requestTour(options);
  }

  /**
   * Cancel the currently active tour
   */
  cancel(): void {
    this.orchestrator.cancelTour();
  }

  /**
   * Dismiss the current tour temporarily (respects throttle)
   */
  dismiss(tourId: TourId): void {
    this.orchestrator.dismissTour(tourId);
  }

  /**
   * Reset a tour's state (allows it to be shown again)
   */
  reset(tourId: TourId): void {
    this.orchestrator.resetTour(tourId);
  }

  /**
   * Get all available tours
   */
  getAvailableTours(): TourDefinition[] {
    return this.orchestrator.getAvailableTours();
  }

  /**
   * Check if a tour is currently running
   */
  isRunning(): boolean {
    return this.orchestrator.state().isRunning;
  }

  /**
   * Get the current tour state (reactive signal)
   */
  getState(): TourState {
    return this.orchestrator.state();
  }

  /**
   * Check if a specific tour has been completed
   */
  hasCompleted(tourId: TourId): boolean {
    return this.orchestrator.hasTourBeenCompleted(tourId);
  }

  /**
   * Register a custom tour definition
   */
  registerTour(definition: TourDefinition): void {
    this.registry.register(definition);
  }

  /**
   * Enable debug mode (logs all tour events to console)
   */
  enableDebug(): void {
    this.telemetry.enableDebug();
    console.log('[GuidedTour] Debug mode enabled');
  }

  /**
   * Disable debug mode
   */
  disableDebug(): void {
    this.telemetry.disableDebug();
  }

  /**
   * Get tour event history (for debugging/analytics)
   */
  getEventHistory() {
    return this.telemetry.getEventHistory();
  }

  // Convenience methods for common tours

  startWelcomeTour(): Promise<boolean> {
    return this.request({ id: TourId.Welcome, mode: 'user-triggered' });
  }

  startGuidedBookingTour(): Promise<boolean> {
    return this.request({ id: TourId.GuidedBooking, mode: 'user-triggered' });
  }

  startRenterTour(): Promise<boolean> {
    return this.request({ id: TourId.Renter, mode: 'user-triggered' });
  }

  startOwnerTour(): Promise<boolean> {
    return this.request({ id: TourId.Owner, mode: 'user-triggered' });
  }

  startCarDetailTour(): Promise<boolean> {
    return this.request({ id: TourId.CarDetail, mode: 'user-triggered' });
  }
}
