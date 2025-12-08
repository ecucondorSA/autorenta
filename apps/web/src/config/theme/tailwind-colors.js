/**
 * 🎨 Tokens de Color para Tailwind CSS
 *
 * Exporta los tokens centralizados en formato compatible con Tailwind.
 * Este archivo actúa como puente entre el sistema TypeScript y Tailwind.
 */

// Importar tokens desde el archivo TypeScript
// Nota: Tailwind requiere valores estáticos, por lo que importamos directamente
const palette = {
  neutral: {
    black: '#050505',
    ivory: '#F8F4EC',
    beige: '#DFD2BF',
  },
  gray: {
    G100: '#111111',
    G80: '#2B2B2B',
    G60: '#4E4E4E',
    G40: '#7B7B7B',
    G20: '#BCBCBC',
    G10: '#E3E3E3',
    G05: '#F5F5F5',
  },
  accent: {
    blue: {
      primary: '#A7D8F4', // Azul pastel - Synced with colors.ts
      hover: '#8EC9EC',   // Estado hover - Synced with colors.ts
    },
    neon: {
      primary: '#00D95F', // Verde neón radioactivo - CTA principal
      hover: '#00C553',   // Estado hover
      pressed: '#00B048', // Estado pressed/active
    },
  },

  feedback: {
    error: {
      rust: '#B25E5E',
    },
    success: {
      olive: '#9DB38B',
    },
  },
};

/**
 * Light Theme - Synced with colors.ts
 * Source of truth: src/config/theme/colors.ts
 */
const lightTheme = {
  // Surfaces
  surfaceBase: palette.neutral.ivory,        // #F8F4EC
  surfaceRaised: '#FFFFFF',
  surfaceSecondary: palette.neutral.beige,   // #DFD2BF - Synced with colors.ts
  surfaceElevated: palette.gray.G05,         // #F5F5F5

  // Text - Synced with colors.ts
  textPrimary: palette.neutral.black,        // #050505
  textSecondary: palette.gray.G60,           // #4E4E4E
  textMuted: palette.gray.G40,               // #7B7B7B
  textInverse: palette.neutral.ivory,        // #F8F4EC

  // Borders - Synced with colors.ts
  borderDefault: palette.gray.G20,           // #BCBCBC
  borderMuted: palette.gray.G10,             // #E3E3E3
  borderFocus: '#3B6E8F',                    // Azul más saturado para contraste

  // CTA - Azul pastel (synced with colors.ts)
  ctaDefault: palette.accent.blue.primary,   // #A7D8F4
  ctaHover: palette.accent.blue.hover,       // #8EC9EC
  ctaText: palette.neutral.black,            // #050505 - Negro sobre azul pastel

  // Feedback states
  infoLight: palette.accent.blue.primary,    // #A7D8F4
  infoDark: '#6BA8D4',
  successLight: palette.feedback.success.olive, // #9DB38B
  warningLight: '#C4A882',                   // Beige cálido
  errorLight: palette.feedback.error.rust,   // #B25E5E

  // Overlays
  overlayDark: 'rgba(5, 5, 5, 0.7)',
  overlayLight: 'rgba(248, 244, 236, 0.9)',
};

/**
 * Colores para Tailwind CSS
 * Estructura compatible con theme.extend.colors
 */
module.exports = {
  // Colores base
  black: palette.neutral.black,
  white: '#FFFFFF',
  transparent: 'transparent',
  current: 'currentColor',

  // Fondos principales
  ivory: palette.neutral.ivory,
  beige: palette.neutral.beige,

  // Escala de grises (nueva paleta unificada)
  gray: {
    100: palette.gray.G100,
    80: palette.gray.G80,
    60: palette.gray.G60,
    40: palette.gray.G40,
    20: palette.gray.G20,
    10: palette.gray.G10,
    5: palette.gray.G05,
  },

  // Acentos azules pastel
  accent: {
    blue: {
      DEFAULT: palette.accent.blue.primary,
      hover: palette.accent.blue.hover,
    },
    neon: {
      DEFAULT: palette.accent.neon.primary,
      hover: palette.accent.neon.hover,
      pressed: palette.accent.neon.pressed,
    },
  },


  // Tokens semánticos (para uso directo en Tailwind)
  surface: {
    base: lightTheme.surfaceBase,
    raised: lightTheme.surfaceRaised,
    secondary: lightTheme.surfaceSecondary,
    elevated: lightTheme.surfaceElevated,
  },

  text: {
    primary: lightTheme.textPrimary,
    secondary: lightTheme.textSecondary,
    muted: lightTheme.textMuted,
    inverse: lightTheme.textInverse,
  },

  border: {
    DEFAULT: lightTheme.borderDefault,
    muted: lightTheme.borderMuted,
    focus: lightTheme.borderFocus,
    default: lightTheme.borderDefault, // Alias para bg-border-default
  },

  cta: {
    DEFAULT: lightTheme.ctaDefault,
    default: lightTheme.ctaDefault, // Alias para bg-cta-default
    hover: lightTheme.ctaHover,
    text: lightTheme.ctaText,
  },

  info: {
    light: lightTheme.infoLight,
    dark: lightTheme.infoDark,
  },

  success: {
    light: lightTheme.successLight,
  },

  warning: {
    light: lightTheme.warningLight,
  },

  error: {
    light: lightTheme.errorLight,
  },

  // ─── CTA Neon (Verde Neón - Alto Impacto) ───
  'cta-neon': {
    DEFAULT: palette.accent.neon.primary,  // #00D95F
    hover: palette.accent.neon.hover,      // #00C553
    pressed: palette.accent.neon.pressed,  // #00B048
    text: '#000000',                        // Negro para contraste
  },

  // ─── Clases planas para uso con @apply ───
  // Estas clases permiten usar bg-cta-default, border-border-default, etc. en @apply
  'cta-default': lightTheme.ctaDefault,
  'cta-hover': lightTheme.ctaHover,
  'cta-text': lightTheme.ctaText,
  'cta-neon-default': palette.accent.neon.primary,
  'cta-neon-hover': palette.accent.neon.hover,
  'cta-neon-pressed': palette.accent.neon.pressed,
  'border-default': lightTheme.borderDefault,
  'border-muted': lightTheme.borderMuted,
  'border-focus': lightTheme.borderFocus,
  'surface-base': lightTheme.surfaceBase,
  'surface-raised': lightTheme.surfaceRaised,
  'surface-secondary': lightTheme.surfaceSecondary,
  'surface-elevated': lightTheme.surfaceElevated,
  'text-primary': lightTheme.textPrimary,
  'text-secondary': lightTheme.textSecondary,
  'text-muted': lightTheme.textMuted,
  'text-inverse': lightTheme.textInverse,
  'success-light': lightTheme.successLight,
  'warning-light': lightTheme.warningLight,
  'error-light': lightTheme.errorLight,
  'info-light': lightTheme.infoLight,
  'info-dark': lightTheme.infoDark,

  // ─── Compatibilidad con código existente ───
  // Mantener colores legacy durante migración gradual
  'ivory-soft': palette.neutral.ivory,
  'sand-light': '#EDEAE3', // Mantener para compatibilidad
  'white-pure': '#FFFFFF',
  'pearl-gray': palette.gray.G20,
  'smoke-black': palette.neutral.black,
  'charcoal-medium': palette.gray.G60,
  'ash-gray': palette.gray.G40,
  'graphite-dark': '#121212',
  'anthracite': '#1E1E1E',
  'slate-deep': '#2A2A2A',
  'ivory-luminous': '#FAF9F6',
  'pearl-light': '#E5E3DD',
  'accent-petrol': '#2C4A52', // Mantener para compatibilidad
  'accent-warm': '#705D44', // Mantener para compatibilidad (Darkened)

  // Sistema de grises legacy (para migración gradual)
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

