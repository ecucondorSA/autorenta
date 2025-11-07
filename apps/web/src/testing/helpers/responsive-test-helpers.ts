/**
 * Responsive UI Testing Helpers
 *
 * Utilities for testing responsive behavior in Angular/Ionic components
 * Mocks matchMedia and ResizeObserver for viewport-based tests
 */

// Type-safe interface for window with ResizeObserver
interface WindowWithResizeObserver extends Window {
  ResizeObserver: typeof ResizeObserver;
  innerWidth: number;
  innerHeight: number;
}

/**
 * Mock for window.matchMedia
 * Usage: mockMatchMedia('(max-width: 768px)', true)
 */
export function mockMatchMedia(query: string, matches: boolean): MediaQueryList {
  return {
    matches,
    media: query,
    onchange: null,
    addListener: jasmine.createSpy('addListener'),
    removeListener: jasmine.createSpy('removeListener'),
    addEventListener: jasmine.createSpy('addEventListener'),
    removeEventListener: jasmine.createSpy('removeEventListener'),
    dispatchEvent: jasmine.createSpy('dispatchEvent').and.returnValue(true),
  } as unknown as MediaQueryList;
}

/**
 * Mock for ResizeObserver
 * Usage: const resizeObserver = mockResizeObserver()
 */
export function mockResizeObserver() {
  const callbacks: ResizeObserverCallback[] = [];

  const mockObserver = {
    observe: jasmine.createSpy('observe'),
    unobserve: jasmine.createSpy('unobserve'),
    disconnect: jasmine.createSpy('disconnect'),

    // Helper to trigger resize
    triggerResize: (entries: Partial<ResizeObserverEntry>[]) => {
      callbacks.forEach((cb) =>
        cb(entries as ResizeObserverEntry[], mockObserver as ResizeObserver),
      );
    },
  };

  // Store callback when ResizeObserver is instantiated
  const ResizeObserverMock = function (callback: ResizeObserverCallback) {
    callbacks.push(callback);
    return mockObserver;
  };

  return { ResizeObserverMock, mockObserver };
}

/**
 * Setup responsive test environment
 * Configures window.matchMedia and ResizeObserver mocks
 *
 * IMPORTANT: Uses iframe isolation to prevent Karma browser disconnect
 * caused by window.dispatchEvent(new Event('resize'))
 *
 * @param viewport - Viewport configuration
 * @returns Test environment with cleanup function
 */
export interface ViewportConfig {
  width: number;
  height: number;
  devicePixelRatio?: number;
}

export interface ResponsiveTestEnvironment {
  /** Cleanup function to restore original state */
  cleanup: () => void;
  /** Mocked ResizeObserver instance */
  resizeObserver: unknown;
  /** Trigger resize without affecting Karma */
  triggerResize: (newWidth: number, newHeight: number) => void;
  /** Get current viewport dimensions */
  getViewport: () => { width: number; height: number };
}

export function setupResponsiveEnvironment(viewport: ViewportConfig): ResponsiveTestEnvironment {
  const { width, height, devicePixelRatio = 1 } = viewport;

  // Store original functions
  const originalMatchMedia = window.matchMedia;
  const windowWithRO = window as unknown as WindowWithResizeObserver;
  const originalResizeObserver = windowWithRO.ResizeObserver;
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;
  const originalDevicePixelRatio = window.devicePixelRatio;

  // Track current dimensions (mutable state for triggerResize)
  let currentWidth = width;
  let currentHeight = height;

  // Helper to create matchMedia mock for a specific width
  const createMatchMediaMock = (viewportWidth: number) => {
    return jasmine.createSpy('matchMedia').and.callFake((query: string) => {
      // Parse common media queries
      const maxWidthMatch = query.match(/max-width:\s*(\d+)px/);
      const minWidthMatch = query.match(/min-width:\s*(\d+)px/);

      let matches = false;

      if (maxWidthMatch) {
        const maxWidth = parseInt(maxWidthMatch[1], 10);
        matches = viewportWidth <= maxWidth;
      } else if (minWidthMatch) {
        const minWidth = parseInt(minWidthMatch[1], 10);
        matches = viewportWidth >= minWidth;
      }

      return mockMatchMedia(query, matches);
    });
  };

  // Mock matchMedia based on viewport
  window.matchMedia = createMatchMediaMock(width);

  // Mock ResizeObserver
  const { ResizeObserverMock, mockObserver } = mockResizeObserver();
  windowWithRO.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

  // Mock window dimensions
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });

  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });

  Object.defineProperty(window, 'devicePixelRatio', {
    writable: true,
    configurable: true,
    value: devicePixelRatio,
  });

  // Return cleanup function
  return {
    cleanup: () => {
      window.matchMedia = originalMatchMedia;
      windowWithRO.ResizeObserver = originalResizeObserver;
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: originalInnerWidth,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: originalInnerHeight,
      });
      Object.defineProperty(window, 'devicePixelRatio', {
        writable: true,
        configurable: true,
        value: originalDevicePixelRatio,
      });
    },
    resizeObserver: mockObserver,
    /**
     * Trigger resize WITHOUT dispatching window event (Karma-safe)
     *
     * Instead of window.dispatchEvent(new Event('resize')), this:
     * 1. Updates window.innerWidth/innerHeight
     * 2. Updates matchMedia mock
     * 3. Triggers ResizeObserver callbacks manually
     *
     * This prevents Karma from detecting "full page reload"
     */
    triggerResize: (newWidth: number, newHeight: number) => {
      // Update tracked dimensions
      currentWidth = newWidth;
      currentHeight = newHeight;

      // Update window dimensions
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: newWidth,
      });

      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: newHeight,
      });

      // Update matchMedia mock
      window.matchMedia = createMatchMediaMock(newWidth);

      // Trigger ResizeObserver callbacks manually (without window event)
      if (mockObserver.triggerResize) {
        const mockRect: Partial<DOMRectReadOnly> = {
          width: newWidth,
          height: newHeight,
          top: 0,
          left: 0,
          right: newWidth,
          bottom: newHeight,
          x: 0,
          y: 0,
          toJSON: () => ({
            width: newWidth,
            height: newHeight,
            top: 0,
            left: 0,
            right: newWidth,
            bottom: newHeight,
            x: 0,
            y: 0,
          }),
        };

        mockObserver.triggerResize([
          {
            target: document.body,
            contentRect: mockRect as DOMRectReadOnly,
          } as Partial<ResizeObserverEntry>,
        ]);
      }

      // ✅ NO window.dispatchEvent() - this prevents Karma disconnect
    },
    getViewport: () => ({ width: currentWidth, height: currentHeight }),
  };
}

/**
 * Common viewport presets
 */
export const VIEWPORTS = {
  // Mobile
  IPHONE_SE: { width: 375, height: 667, devicePixelRatio: 2 },
  IPHONE_12: { width: 390, height: 844, devicePixelRatio: 3 },
  SAMSUNG_S20: { width: 360, height: 800, devicePixelRatio: 3 },

  // Tablet
  IPAD: { width: 768, height: 1024, devicePixelRatio: 2 },
  IPAD_PRO: { width: 1024, height: 1366, devicePixelRatio: 2 },

  // Desktop
  DESKTOP_SM: { width: 1024, height: 768, devicePixelRatio: 1 },
  DESKTOP_MD: { width: 1440, height: 900, devicePixelRatio: 1 },
  DESKTOP_LG: { width: 1920, height: 1080, devicePixelRatio: 1 },
};

/**
 * Helper to test element dimensions
 */
export function getElementDimensions(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  return {
    width: rect.width,
    height: rect.height,
    top: rect.top,
    left: rect.left,
    right: rect.right,
    bottom: rect.bottom,
  };
}

/**
 * Helper to check if element is visible in viewport
 */
export function isElementInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * Helper to check for horizontal overflow
 */
export function hasHorizontalOverflow(element: HTMLElement): boolean {
  return element.scrollWidth > element.clientWidth;
}

/**
 * Helper to check minimum touch target size (44x44px per WCAG)
 */
export function meetsMinimumTouchTarget(element: HTMLElement, minSize = 44): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width >= minSize && rect.height >= minSize;
}
