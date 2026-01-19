/**
 * UI Components - Barrel Export
 */

// Individual component exports
export { IconButtonComponent } from './icon-button/icon-button.component';
export { SmartTagsComponent } from './smart-tags/smart-tags.component';

// Type exports
export type { SmartTag } from './smart-tags/smart-tags.component';

// Grouped exports for convenience
export const BUTTON_COMPONENTS = [
  // Dynamic import not needed for standalone components
] as const;

export const CARD_COMPONENTS = [
  // Dynamic import not needed for standalone components
] as const;

export const ALL_UI_COMPONENTS = [
  // Dynamic import not needed for standalone components
] as const;
