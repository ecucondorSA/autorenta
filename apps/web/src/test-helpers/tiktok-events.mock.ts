/**
 * TikTok Events Service Mock
 *
 * Mock del servicio de tracking TikTok para tests.
 * Todos los métodos son spies que no hacen nada pero permiten verificar llamadas.
 *
 * @example
 * ```typescript
 * TestBed.configureTestingModule({
 *   providers: [
 *     { provide: TikTokEventsService, useValue: createMockTikTokEventsService() }
 *   ]
 * });
 * ```
 */

/**
 * Interfaz del mock para type safety en tests
 */
export interface MockTikTokEventsService {
  trackViewContent: jasmine.Spy<(params: unknown) => Promise<void>>;
  trackAddToWishlist: jasmine.Spy<(params: unknown) => Promise<void>>;
  trackSearch: jasmine.Spy<(params: unknown) => Promise<void>>;
  trackAddPaymentInfo: jasmine.Spy<(params: unknown) => Promise<void>>;
  trackAddToCart: jasmine.Spy<(params: unknown) => Promise<void>>;
  trackInitiateCheckout: jasmine.Spy<(params: unknown) => Promise<void>>;
  trackPlaceAnOrder: jasmine.Spy<(params: unknown) => Promise<void>>;
  trackCompleteRegistration: jasmine.Spy<(params?: unknown) => Promise<void>>;
  trackPurchase: jasmine.Spy<(params: unknown) => Promise<void>>;
}

/**
 * Crea un mock completo del TikTokEventsService
 *
 * @returns Mock del servicio con todos los métodos como spies
 */
export function createMockTikTokEventsService(): MockTikTokEventsService {
  return {
    trackViewContent: jasmine.createSpy('trackViewContent').and.resolveTo(),
    trackAddToWishlist: jasmine.createSpy('trackAddToWishlist').and.resolveTo(),
    trackSearch: jasmine.createSpy('trackSearch').and.resolveTo(),
    trackAddPaymentInfo: jasmine.createSpy('trackAddPaymentInfo').and.resolveTo(),
    trackAddToCart: jasmine.createSpy('trackAddToCart').and.resolveTo(),
    trackInitiateCheckout: jasmine.createSpy('trackInitiateCheckout').and.resolveTo(),
    trackPlaceAnOrder: jasmine.createSpy('trackPlaceAnOrder').and.resolveTo(),
    trackCompleteRegistration: jasmine.createSpy('trackCompleteRegistration').and.resolveTo(),
    trackPurchase: jasmine.createSpy('trackPurchase').and.resolveTo(),
  };
}

/**
 * Mock simple para uso directo en providers
 * Útil para configuraciones rápidas de TestBed
 */
export const MOCK_TIKTOK_EVENTS_SERVICE = createMockTikTokEventsService();
