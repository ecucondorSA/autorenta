/**
 * Guided Tour System - Public API
 * 
 * A modular, event-driven system for creating interactive product tours
 * 
 * @example
 * ```typescript
 * import { GuidedTourService, TourId } from '@core/guided-tour';
 * 
 * export class MyComponent {
 *   private guidedTour = inject(GuidedTourService);
 * 
 *   startTour() {
 *     this.guidedTour.request({ id: TourId.Welcome });
 *   }
 * }
 * ```
 */

// Main Service
export { GuidedTourService } from './guided-tour.service';

// Interfaces & Types
export * from './interfaces/tour-definition.interface';

// Services (for advanced usage)
export { TourOrchestratorService } from './services/tour-orchestrator.service';
export { TelemetryBridgeService } from './services/telemetry-bridge.service';

// Registry (for custom tour registration)
export { TourRegistryService } from './registry/tour-registry.service';

// Adapters (for custom renderers)
export { ShepherdAdapterService } from './adapters/shepherd-adapter.service';
export type { TourRendererAdapter } from './adapters/shepherd-adapter.service';

// Resolvers (for custom element waiting logic)
export { StepResolverService } from './resolvers/step-resolver.service';
