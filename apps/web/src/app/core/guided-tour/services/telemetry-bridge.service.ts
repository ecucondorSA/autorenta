import { Injectable } from '@angular/core';
import { TourEvent, TourId } from '../interfaces/tour-definition.interface';

@Injectable({
  providedIn: 'root',
})
export class TelemetryBridgeService {
  private events: TourEvent[] = [];

  trackTourEvent(event: TourEvent): void {
    this.events.push(event);
    
    // Integrate with actual analytics
    this.sendToAnalytics(event);
    
    // Console logging for debugging
    if (this.isDebugMode()) {
      console.log(`[TourTelemetry] ${event.type}:`, event);
    }
  }

  trackTourStarted(tourId: TourId, metadata?: any): void {
    this.trackTourEvent({
      type: 'started',
      tourId,
      timestamp: Date.now(),
      metadata,
    });
  }

  trackStepShown(tourId: TourId, stepId: string, metadata?: any): void {
    this.trackTourEvent({
      type: 'step_shown',
      tourId,
      stepId,
      timestamp: Date.now(),
      metadata,
    });
  }

  trackStepCompleted(tourId: TourId, stepId: string, metadata?: any): void {
    this.trackTourEvent({
      type: 'step_completed',
      tourId,
      stepId,
      timestamp: Date.now(),
      metadata,
    });
  }

  trackTourCompleted(tourId: TourId, metadata?: any): void {
    this.trackTourEvent({
      type: 'completed',
      tourId,
      timestamp: Date.now(),
      metadata,
    });
  }

  trackTourCancelled(tourId: TourId, stepId?: string, metadata?: any): void {
    this.trackTourEvent({
      type: 'cancelled',
      tourId,
      stepId,
      timestamp: Date.now(),
      metadata,
    });
  }

  trackTourError(tourId: TourId, error: any, stepId?: string): void {
    this.trackTourEvent({
      type: 'error',
      tourId,
      stepId,
      timestamp: Date.now(),
      metadata: { error: error.message || error },
    });
  }

  getEventHistory(): TourEvent[] {
    return [...this.events];
  }

  clearHistory(): void {
    this.events = [];
  }

  private sendToAnalytics(event: TourEvent): void {
    // TODO: Integrate with actual analytics service
    // Example: window.gtag, Mixpanel, Segment, etc.
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', `tour_${event.type}`, {
        tour_id: event.tourId,
        step_id: event.stepId,
        ...event.metadata,
      });
    }
  }

  private isDebugMode(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('autorenta:tour:debug') === 'true';
  }

  enableDebug(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('autorenta:tour:debug', 'true');
    }
  }

  disableDebug(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('autorenta:tour:debug');
    }
  }
}
