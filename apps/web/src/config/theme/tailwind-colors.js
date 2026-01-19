/**
 * 🎨 Tokens de Color para Tailwind CSS - Refactored
 *
 * Based on industry leaders analysis (Airbnb, Turo, Zapier, Booking):
 * - Strong primary color (verde neón #00D95F)
 * - Clean white backgrounds
 * - High contrast text
 */

// Core Palette
const palette = {
  // Brand Colors
  brand: {
    primary: '#00D95F',      // Verde neón - CTA principal
    primaryHover: '#00BF54', // Verde neón hover
    primaryActive: '#00A648', // Verde neón active
    secondary: '#1A1A1A',    // Negro suave - textos
  },

  // Neutral Colors
  neutral: {
    white: '#FFFFFF',
    gray50: '#F7F7F7',
    gray100: '#F3F4F6',
    gray200: '#E5E7EB',
    gray300: '#D1D5DB',
    gray400: '#9CA3AF',
    gray500: '#6B7280',
    gray600: '#4B5563',
    gray700: '#374151',
    gray800: '#1F2937',
    gray900: '#111827',
    black: '#1A1A1A',
  },

  // Semantic Colors
  semantic: {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },
};

/**
 * Theme Tokens
 */
const theme = {
  // Surfaces (backgrounds)
  surfaceBase: palette.neutral.white,       // White background
  surfaceSecondary: palette.neutral.gray50, // Light gray for cards
  surfaceElevated: palette.neutral.white,   // Elevated cards
  surfaceRaised: palette.neutral.white,     // Raised elements

  // Text
  textPrimary: palette.neutral.black,       // #1A1A1A
  textSecondary: palette.neutral.gray500,   // #6B7280
  textMuted: palette.neutral.gray400,       // #9CA3AF
  textInverse: palette.neutral.white,       // White on dark

  // Borders
  borderDefault: palette.neutral.gray200,   // #E5E7EB
  borderMuted: palette.neutral.gray100,     // #F3F4F6
  borderFocus: palette.brand.primary,       // Verde neón for focus

  // CTA (Call to Action) - Verde Neón as primary
  ctaDefault: palette.brand.primary,        // #00D95F
  ctaHover: palette.brand.primaryHover,     // #00BF54
  ctaPressed: palette.brand.primaryActive,  // #00A648
  ctaText: '#000000',                       // Black text on green
};

/**
 * Tailwind Colors Export
 */
module.exports = {
  // Base Colors
  black: palette.neutral.black,
  white: palette.neutral.white,
  transparent: 'transparent',
  current: 'currentColor',

  // Brand Colors
  brand: {
    primary: palette.brand.primary,
    'primary-hover': palette.brand.primaryHover,
    'primary-active': palette.brand.primaryActive,
    secondary: palette.brand.secondary,
  },

  // Gray Scale (Tailwind standard)
  gray: {
    50: palette.neutral.gray50,
    100: palette.neutral.gray100,
    200: palette.neutral.gray200,
    300: palette.neutral.gray300,
    400: palette.neutral.gray400,
    500: palette.neutral.gray500,
    600: palette.neutral.gray600,
    700: palette.neutral.gray700,
    800: palette.neutral.gray800,
    900: palette.neutral.gray900,
  },

  // Semantic Surface Tokens
  surface: {
    base: theme.surfaceBase,
    secondary: theme.surfaceSecondary,
    elevated: theme.surfaceElevated,
    raised: theme.surfaceRaised,
  },

  // Semantic Text Tokens
  text: {
    primary: theme.textPrimary,
    secondary: theme.textSecondary,
    muted: theme.textMuted,
    inverse: theme.textInverse,
  },

  // Semantic Border Tokens
  border: {
    DEFAULT: theme.borderDefault,
    default: theme.borderDefault,
    muted: theme.borderMuted,
    focus: theme.borderFocus,
  },

  // CTA Tokens (Verde Neón)
  cta: {
    DEFAULT: theme.ctaDefault,
    default: theme.ctaDefault,
    hover: theme.ctaHover,
    pressed: theme.ctaPressed,
    text: theme.ctaText,
  },

  // Accent Colors
  accent: {
    neon: {
      DEFAULT: palette.brand.primary,
      hover: palette.brand.primaryHover,
      pressed: palette.brand.primaryActive,
    },
  },

  // Semantic Feedback Colors
  success: {
    DEFAULT: palette.semantic.success,
    light: '#D1FAE5',
    dark: '#065F46',
  },

  warning: {
    DEFAULT: palette.semantic.warning,
    light: '#FEF3C7',
    dark: '#92400E',
  },

  error: {
    DEFAULT: palette.semantic.error,
    light: '#FEE2E2',
    dark: '#991B1B',
  },

  info: {
    DEFAULT: palette.semantic.info,
    light: '#DBEAFE',
    dark: '#1E40AF',
  },

  // ─── Flat classes for @apply ───
  'cta-default': theme.ctaDefault,
  'cta-hover': theme.ctaHover,
  'cta-text': theme.ctaText,
  'border-default': theme.borderDefault,
  'border-muted': theme.borderMuted,
  'border-focus': theme.borderFocus,
  'surface-base': theme.surfaceBase,
  'surface-secondary': theme.surfaceSecondary,
  'surface-elevated': theme.surfaceElevated,
  'text-primary': theme.textPrimary,
  'text-secondary': theme.textSecondary,
  'text-muted': theme.textMuted,
  'text-inverse': theme.textInverse,

  // ─── Legacy compatibility (gradual migration) ───
  ivory: palette.neutral.white,           // Was #F8F4EC, now white
  beige: palette.neutral.gray100,         // Was #DFD2BF
  'ivory-soft': palette.neutral.white,
  'white-pure': palette.neutral.white,
  'pearl-gray': palette.neutral.gray200,
  'smoke-black': palette.neutral.black,
  'charcoal-medium': palette.neutral.gray600,
  'ash-gray': palette.neutral.gray400,

  // Neutral scale for legacy code
  neutral: {
    50: '#FAFAF9',
    100: '#F5F5F4',
    200: '#E7E5E4',
    300: '#D6D3D1',
    400: '#A8A29E',
    500: '#78716C',
    600: '#57534E',
    700: '#44403C',
    800: '#292524',
    900: '#1C1917',
    950: '#0C0A09',
  },
};
