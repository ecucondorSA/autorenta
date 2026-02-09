/**
 * Design System - Shadow Tokens
 * Semantic shadow definitions for elevation and depth
 */

export const ShadowTokens = {
  none: 'none',
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  base: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  // Semantic aliases
  card: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  cardHover: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  modal: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  button: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  buttonHover: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
} as const;

// Colored shadows (brand colors with opacity)
export const coloredShadows = {
  green: '0 4px 14px 0 rgba(59, 168, 112, 0.25)',
  blue: '0 4px 14px 0 rgba(59, 130, 246, 0.25)',
  red: '0 4px 14px 0 rgba(239, 68, 68, 0.25)',
};

// Inset shadows for inputs
export const insetShadows = {
  input: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  inputFocus: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05), 0 0 0 3px rgba(59, 168, 112, 0.2)',
};
