import { Injectable, inject } from '@angular/core';
import { StepTarget } from '../interfaces/tour-definition.interface';
import { TelemetryBridgeService } from '../services/telemetry-bridge.service';

export interface ElementWaitOptions {
  timeout?: number;
  interval?: number;
  onTimeout?: 'skip' | 'retry' | 'abort';
}

@Injectable({
  providedIn: 'root',
})
export class StepResolverService {
  private readonly DEFAULT_TIMEOUT = 10000; // 10s
  private readonly DEFAULT_INTERVAL = 150; // 150ms
  private readonly telemetry = inject(TelemetryBridgeService);

  private observers = new Map<string, MutationObserver>();

  async resolveStepTarget(
    target: StepTarget,
    options: ElementWaitOptions = {},
  ): Promise<Element | null> {
    const timeout = options.timeout ?? this.DEFAULT_TIMEOUT;
    const interval = options.interval ?? this.DEFAULT_INTERVAL;
    const onTimeout = options.onTimeout ?? 'skip';

    // Try main selector
    let element = await this.waitForElement(target.selector, timeout, interval);

    // Try alternative selectors if main fails
    if (!element && target.altSelectors) {
      for (const altSelector of target.altSelectors) {
        element = await this.waitForElement(altSelector, timeout, interval);
        if (element) break;
      }
    }

    // Check additional condition if provided
    if (element && target.waitForCondition) {
      const conditionMet = await this.waitForCondition(target.waitForCondition, timeout);
      if (!conditionMet && target.required) {
        element = null;
      }
    }

    // Handle timeout based on strategy
    if (!element && target.required) {
      const errorMsg = `Required element not found: ${target.selector}`;

      if (onTimeout === 'abort') {
        throw new Error(errorMsg);
      }
    }

    return element;
  }

  async waitForElement(
    selector: string,
    timeout: number = this.DEFAULT_TIMEOUT,
    interval: number = this.DEFAULT_INTERVAL,
  ): Promise<Element | null> {
    if (typeof document === 'undefined') return null;

    const existingElement = document.querySelector(selector);
    if (existingElement) return existingElement;

    return new Promise<Element | null>((resolve) => {
      const startTime = Date.now();

      // Use MutationObserver for better performance
      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        } else if (Date.now() - startTime >= timeout) {
          observer.disconnect();
          resolve(null);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
      });

      // Fallback polling
      const pollInterval = setInterval(() => {
        const element = document.querySelector(selector);
        if (element) {
          clearInterval(pollInterval);
          observer.disconnect();
          resolve(element);
        } else if (Date.now() - startTime >= timeout) {
          clearInterval(pollInterval);
          observer.disconnect();
          resolve(null);
        }
      }, interval);
    });
  }

  async waitForCondition(
    condition: () => boolean | Promise<boolean>,
    timeout: number = this.DEFAULT_TIMEOUT,
  ): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const result = await condition();
        if (result) return true;
      } catch {
        // Ignore errors while waiting for condition
      }

      await this.sleep(150);
    }

    return false;
  }

  async waitForRoute(pattern: RegExp, timeout: number = 5000): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (pattern.test(window.location.pathname)) {
        return true;
      }
      await this.sleep(100);
    }

    return false;
  }

  isElementInViewport(element: Element): boolean {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  async scrollToElement(element: Element): Promise<void> {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await this.sleep(300); // Wait for scroll animation
  }

  cleanup(): void {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers.clear();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
