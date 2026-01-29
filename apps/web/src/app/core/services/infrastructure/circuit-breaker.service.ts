import { Injectable, inject } from '@angular/core';
import {
  CIRCUIT_FAILURE_THRESHOLD,
  CIRCUIT_RESET_TIMEOUT_MS,
  CIRCUIT_SUCCESS_THRESHOLD,
} from '@core/constants';
import { LoggerService } from './logger.service';

/**
 * Circuit Breaker States
 */
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * Circuit Breaker Configuration
 */
export interface CircuitBreakerConfig {
  /** Name identifier for the circuit */
  name: string;
  /** Number of consecutive failures before opening circuit */
  failureThreshold: number;
  /** Time in ms to wait before attempting recovery (half-open) */
  resetTimeout: number;
  /** Number of successful calls in half-open state to close circuit */
  successThreshold: number;
}

/**
 * Circuit Breaker Statistics
 */
export interface CircuitStats {
  name: string;
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure: Date | null;
  lastSuccess: Date | null;
  lastStateChange: Date;
  totalCalls: number;
  totalFailures: number;
  totalSuccesses: number;
}

/**
 * Individual Circuit instance
 */
class Circuit {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private successes = 0;
  private lastFailure: Date | null = null;
  private lastSuccess: Date | null = null;
  private lastStateChange = new Date();
  private nextAttempt: Date | null = null;
  private totalCalls = 0;
  private totalFailures = 0;
  private totalSuccesses = 0;

  constructor(
    private readonly config: CircuitBreakerConfig,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalCalls++;

    // Check if circuit is open
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.transitionTo('HALF_OPEN');
      } else {
        throw new CircuitOpenError(
          `Circuit "${this.config.name}" is OPEN. Try again later.`,
          this.nextAttempt,
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Get current circuit statistics
   */
  getStats(): CircuitStats {
    return {
      name: this.config.name,
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
      lastStateChange: this.lastStateChange,
      totalCalls: this.totalCalls,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
    };
  }

  /**
   * Manually reset the circuit to closed state
   */
  reset(): void {
    this.failures = 0;
    this.successes = 0;
    this.transitionTo('CLOSED');
    this.logger.info(`Circuit "${this.config.name}" manually reset to CLOSED`);
  }

  private onSuccess(): void {
    this.lastSuccess = new Date();
    this.totalSuccesses++;

    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this.transitionTo('CLOSED');
      }
    } else if (this.state === 'CLOSED') {
      // Reset failure count on success in closed state
      this.failures = 0;
    }
  }

  private onFailure(error: unknown): void {
    this.lastFailure = new Date();
    this.totalFailures++;
    this.failures++;

    this.logger.warn(`Circuit "${this.config.name}" failure #${this.failures}`, {
      error: error instanceof Error ? error.message : String(error),
      state: this.state,
    });

    if (this.state === 'HALF_OPEN') {
      // Any failure in half-open state opens the circuit again
      this.transitionTo('OPEN');
    } else if (this.state === 'CLOSED') {
      if (this.failures >= this.config.failureThreshold) {
        this.transitionTo('OPEN');
      }
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.nextAttempt) return true;
    return new Date() >= this.nextAttempt;
  }

  private transitionTo(newState: CircuitState): void {
    const previousState = this.state;
    this.state = newState;
    this.lastStateChange = new Date();

    if (newState === 'OPEN') {
      this.nextAttempt = new Date(Date.now() + this.config.resetTimeout);
      this.successes = 0;
    } else if (newState === 'CLOSED') {
      this.failures = 0;
      this.successes = 0;
      this.nextAttempt = null;
    } else if (newState === 'HALF_OPEN') {
      this.successes = 0;
    }

    this.logger.info(
      `Circuit "${this.config.name}" transitioned: ${previousState} -> ${newState}`,
      {
        failures: this.failures,
        nextAttempt: this.nextAttempt?.toISOString(),
      },
    );
  }
}

/**
 * Error thrown when circuit is open
 */
export class CircuitOpenError extends Error {
  constructor(
    message: string,
    public readonly retryAfter: Date | null,
  ) {
    super(message);
    this.name = 'CircuitOpenError';
  }
}

/**
 * Circuit Breaker Service
 *
 * Implements the Circuit Breaker pattern to prevent cascading failures
 * when external services (like MercadoPago) are experiencing issues.
 *
 * Default configuration:
 * - Opens after 3 consecutive failures
 * - Waits 30 seconds before attempting recovery
 * - Requires 2 successful calls to close
 *
 * @example
 * ```typescript
 * // In your service
 * private readonly circuitBreaker = inject(CircuitBreakerService);
 *
 * async processPayment(data: PaymentData): Promise<PaymentResult> {
 *   return this.circuitBreaker.execute('mercadopago', async () => {
 *     return await this.callMercadoPagoAPI(data);
 *   });
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class CircuitBreakerService {
  private readonly logger = inject(LoggerService);
  private readonly circuits = new Map<string, Circuit>();

  /** Default configuration for circuits (uses centralized constants) */
  private readonly defaultConfigs: Record<string, Partial<CircuitBreakerConfig>> = {
    mercadopago: {
      failureThreshold: CIRCUIT_FAILURE_THRESHOLD,
      resetTimeout: CIRCUIT_RESET_TIMEOUT_MS,
      successThreshold: CIRCUIT_SUCCESS_THRESHOLD,
    },
    'mercadopago-payment': {
      failureThreshold: CIRCUIT_FAILURE_THRESHOLD,
      resetTimeout: CIRCUIT_RESET_TIMEOUT_MS,
      successThreshold: CIRCUIT_SUCCESS_THRESHOLD,
    },
    'mercadopago-oauth': {
      failureThreshold: 5, // More lenient for OAuth
      resetTimeout: 60000, // 1 minute
      successThreshold: 1,
    },
    binance: {
      failureThreshold: 5, // More tolerant for FX service
      resetTimeout: 15000, // 15 seconds (faster recovery)
      successThreshold: CIRCUIT_SUCCESS_THRESHOLD,
    },
  };

  /**
   * Execute a function with circuit breaker protection
   *
   * @param circuitName - Name of the circuit (e.g., 'mercadopago', 'binance')
   * @param fn - The async function to execute
   * @param config - Optional custom configuration
   */
  async execute<T>(
    circuitName: string,
    fn: () => Promise<T>,
    config?: Partial<CircuitBreakerConfig>,
  ): Promise<T> {
    const circuit = this.getOrCreateCircuit(circuitName, config);
    return circuit.execute(fn);
  }

  /**
   * Get statistics for a specific circuit
   */
  getStats(circuitName: string): CircuitStats | null {
    const circuit = this.circuits.get(circuitName);
    return circuit?.getStats() ?? null;
  }

  /**
   * Get statistics for all circuits
   */
  getAllStats(): CircuitStats[] {
    return Array.from(this.circuits.values()).map((c) => c.getStats());
  }

  /**
   * Check if a circuit is currently open (failing)
   */
  isOpen(circuitName: string): boolean {
    const stats = this.getStats(circuitName);
    return stats?.state === 'OPEN';
  }

  /**
   * Manually reset a circuit to closed state
   */
  reset(circuitName: string): void {
    const circuit = this.circuits.get(circuitName);
    if (circuit) {
      circuit.reset();
    }
  }

  /**
   * Reset all circuits
   */
  resetAll(): void {
    this.circuits.forEach((circuit) => circuit.reset());
  }

  private getOrCreateCircuit(name: string, customConfig?: Partial<CircuitBreakerConfig>): Circuit {
    let circuit = this.circuits.get(name);

    if (!circuit) {
      const defaultConfig = this.defaultConfigs[name] || {};
      const config: CircuitBreakerConfig = {
        name,
        failureThreshold:
          customConfig?.failureThreshold ??
          defaultConfig.failureThreshold ??
          CIRCUIT_FAILURE_THRESHOLD,
        resetTimeout:
          customConfig?.resetTimeout ?? defaultConfig.resetTimeout ?? CIRCUIT_RESET_TIMEOUT_MS,
        successThreshold:
          customConfig?.successThreshold ??
          defaultConfig.successThreshold ??
          CIRCUIT_SUCCESS_THRESHOLD,
      };

      circuit = new Circuit(config, this.logger);
      this.circuits.set(name, circuit);

      this.logger.info(`Circuit "${name}" created`, { config });
    }

    return circuit;
  }
}
