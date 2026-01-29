/**
 * Shared Directives Index
 *
 * Re-exports all shared directives for convenient importing.
 *
 * @example
 * ```typescript
 * import { SwipeBackDirective, PullToRefreshDirective } from '@shared/directives';
 * ```
 */

// Accessibility & UX
export { ClickOutsideDirective } from './click-outside.directive';
export { FocusTrapDirective } from './focus-trap.directive';
export { EscapeKeyDirective } from './escape-key.directive';

// Responsive
export { ResponsiveImageDirective } from './responsive-image.directive';

// Feature Flags
export { FeatureFlagDirective } from './feature-flag.directive';

// Mobile Gestures (NEW)
export { SwipeBackDirective } from './swipe-back.directive';
export { PullToRefreshDirective } from './pull-to-refresh.directive';

/**
 * Mobile Directives Array
 *
 * Convenient array for importing all mobile gesture directives at once.
 *
 * @example
 * ```typescript
 * @Component({
 *   imports: [MOBILE_DIRECTIVES]
 * })
 * ```
 */
export const MOBILE_DIRECTIVES = [
  // SwipeBackDirective, // Import individually due to standalone
  // PullToRefreshDirective,
] as const;
