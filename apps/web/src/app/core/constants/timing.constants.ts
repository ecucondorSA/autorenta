/**
 * Timing constants for the application
 * Centralized to avoid magic numbers
 */

// Debounce delays
export const DEBOUNCE_MS = 300;
export const SEARCH_DEBOUNCE_MS = 300;

// Timeout durations
export const SHORT_TIMEOUT_MS = 1000;
export const MEDIUM_TIMEOUT_MS = 2000;
export const LONG_TIMEOUT_MS = 3000;
export const VERY_LONG_TIMEOUT_MS = 5000;

// Auto-close delays for notifications/toasts
export const TOAST_AUTO_CLOSE_MS = 3000;
export const SUCCESS_MESSAGE_DURATION_MS = 5000;
export const NOTIFICATION_AUTO_CLOSE_MS = 5000;

// Retry delays
export const RETRY_BASE_DELAY_MS = 1000;
export const RETRY_BACKOFF_MULTIPLIER = 2;

// Animation delays
export const ANIMATION_DELAY_MS = 300;

// Time units (for conversions)
export const SECONDS_TO_MS = 1000;
export const MINUTES_TO_MS = 60 * 1000;
export const HOURS_TO_MS = 60 * 60 * 1000;
export const DAYS_TO_MS = 24 * 60 * 60 * 1000;
