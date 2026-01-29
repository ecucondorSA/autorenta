/**
 * Application-wide constants
 * Centralizes magic numbers and configuration values
 */

// Retry Configuration
export const MAX_RETRY_ATTEMPTS = 5;
export const BASE_RETRY_DELAY_MS = 200;
export const MAX_RETRY_DELAY_MS = 30_000;

// Cache Configuration
export const WALLET_STALE_TIME_MS = 2_000;
export const FX_CACHE_TTL_MS = 60_000;
export const DEFAULT_CACHE_TTL_MS = 5_000;

// Rate Limiting
export const MAX_WALLET_LOCKS_PER_MINUTE = 5;
export const RATE_LIMIT_WINDOW_MS = 60_000;

// Timeouts
export const LOCK_TIMEOUT_MS = 30_000;
export const PAYMENT_TIMEOUT_MS = 60_000;
export const RPC_TIMEOUT_MS = 10_000;

// Payment Configuration
export const PRICE_LOCK_DURATION_MINUTES = 15;
export const MIN_BOOKING_AMOUNT_USD = 1;
export const PLATFORM_FEE_PERCENT = 15;
export const DEPOSIT_AMOUNT_USD = 250;

// Circuit Breaker
export const CIRCUIT_FAILURE_THRESHOLD = 3;
export const CIRCUIT_RESET_TIMEOUT_MS = 30_000;
export const CIRCUIT_SUCCESS_THRESHOLD = 2;

// Metrics
export const METRICS_WINDOW_SIZE = 100;
export const ALERT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
export const MIN_SUCCESS_RATE_PERCENT = 80;
export const MAX_AVG_DURATION_MS = 10_000;

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// File Size Limits
export const MAX_IMAGE_SIZE_MB = 10;
export const MAX_PDF_SIZE_MB = 50;

// Date/Time
export const MIN_BOOKING_HOURS_ADVANCE = 2;
export const CANCELLATION_WINDOW_HOURS = 24;

// Map Configuration
export const DEFAULT_MAP_CENTER_LAT = -0.1807;
export const DEFAULT_MAP_CENTER_LNG = -78.4678;
export const DEFAULT_MAP_ZOOM = 12;
export const DEFAULT_SEARCH_RADIUS_KM = 50;

// Validation
export const MIN_CAR_PRICE_USD = 10;
export const MAX_CAR_PRICE_USD = 500;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_DESCRIPTION_LENGTH = 1000;
