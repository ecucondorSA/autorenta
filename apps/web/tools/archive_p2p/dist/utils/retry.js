import { logger } from './logger.js';
const DEFAULT_OPTIONS = {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffFactor: 2,
    onRetry: () => { },
};
export async function retry(fn, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let lastError;
    let delay = opts.initialDelayMs;
    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (attempt === opts.maxAttempts) {
                break;
            }
            logger.warn(`Attempt ${attempt}/${opts.maxAttempts} failed: ${lastError.message}`);
            opts.onRetry(attempt, lastError);
            await sleep(delay);
            delay = Math.min(delay * opts.backoffFactor, opts.maxDelayMs);
        }
    }
    throw lastError;
}
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
export async function withTimeout(promise, timeoutMs, errorMessage = 'Operation timed out') {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
    });
    try {
        return await Promise.race([promise, timeoutPromise]);
    }
    finally {
        clearTimeout(timeoutId);
    }
}
//# sourceMappingURL=retry.js.map