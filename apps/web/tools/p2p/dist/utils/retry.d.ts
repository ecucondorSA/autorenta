interface RetryOptions {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffFactor?: number;
    onRetry?: (attempt: number, error: Error) => void;
}
export declare function retry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T>;
export declare function sleep(ms: number): Promise<void>;
export declare function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage?: string): Promise<T>;
export {};
//# sourceMappingURL=retry.d.ts.map