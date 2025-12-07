/**
 * 🎨 Sistema de Tokens de Color - AutoRenta
 *
 * Paleta maestra unificada con tipado estricto TypeScript.
 * Todos los colores deben referenciarse desde este archivo central.
 *
 * @see docs/brand-colors.md para documentación completa
 */

// ═══════════════════════════════════════════════════════════════
// PALETA MAESTRA
// ═══════════════════════════════════════════════════════════════

/**
 * Paleta de colores base - Valores HEX exactos
 */
export const palette = {
  // ─── Colores Neutros Principales ───
  neutral: {
    black: '#050505', // Texto principal, overlays, iconografía crítica
    ivory: '#F8F4EC', // Fondo dominante de vistas claras, contenedores grandes
    beige: '#DFD2BF', // Paneles secundarios, tarjetas, listados neutros
  },

  // ─── Escala de Grises ───
  gray: {
    G100: '#111111', // Más oscuro
    G80: '#2B2B2B',
    G60: '#4E4E4E',
    G40: '#7B7B7B',
    G20: '#BCBCBC',
    G10: '#E3E3E3',
    G05: '#F5F5F5', // Más claro
  },

  // ─── Acentos Azules Pastel ───
  accent: {
    blue: {
      primary: '#A7D8F4', // CTAs, enlaces activos, badges informativos
      hover: '#8EC9EC', // Estado hover de acentos azules
    },
    // ─── Verde Neón / Radioactivo ───
    neon: {
      primary: '#00D95F', // CTA principal, botones de acción destacados
      hover: '#00C553', // Estado hover
      pressed: '#00B048', // Estado pressed/active
    },
  },


  // ─── Colores de Feedback (Opcionales, baja saturación) ───
  feedback: {
    error: {
      rust: '#B25E5E', // Rojo óxido suave para errores
    },
    success: {
      olive: '#9DB38B', // Verde oliva suave para éxito
    },
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// TIPOS TYPESCRIPT ESTRICTOS
// ═══════════════════════════════════════════════════════════════

/**
 * Familias de color disponibles
 */
export type ColorFamily = 'neutral' | 'accent' | 'feedback';

/**
 * Tonos de gris disponibles
 */
export type GrayShade = 'G100' | 'G80' | 'G60' | 'G40' | 'G20' | 'G10' | 'G05';

/**
 * Tokens semánticos de color - Light Mode
 */
export const lightTheme = {
  // ─── Superficies (Surfaces) ───
  surfaceBase: palette.neutral.ivory, // Fondo principal
  surfaceRaised: '#FFFFFF', // Tarjetas, modales, elementos elevados
  surfaceSecondary: palette.neutral.beige, // Paneles secundarios
  surfaceElevated: palette.gray.G05, // Superficies con elevación

  // ─── Textos ───
  textPrimary: palette.neutral.black, // Texto principal
  textSecondary: palette.gray.G60, // Texto secundario
  textMuted: palette.gray.G40, // Texto deshabilitado, placeholders
  textInverse: palette.neutral.ivory, // Texto sobre fondos oscuros

  // ─── Bordes ───
  borderDefault: palette.gray.G20, // Bordes por defecto
  borderMuted: palette.gray.G10, // Bordes sutiles
  borderFocus: '#3B6E8F', // Borde de focus (azul más saturado para contraste)

  // ─── CTAs y Acciones ───
  ctaDefault: palette.accent.blue.primary, // Botones primarios
  ctaHover: palette.accent.blue.hover, // Hover de botones
  ctaText: palette.neutral.black, // Texto sobre CTAs azules

  // ─── Estados y Feedback ───
  infoLight: palette.accent.blue.primary, // Badges informativos
  infoDark: '#6BA8D4', // Info en modo oscuro
  successLight: palette.feedback.success.olive, // Éxito suave
  warningLight: '#C4A882', // Advertencia suave (beige cálido)
  errorLight: palette.feedback.error.rust, // Error suave

  // ─── Overlays ───
  overlayDark: 'rgba(5, 5, 5, 0.7)', // Overlay oscuro (70% negro)
  overlayLight: 'rgba(248, 244, 236, 0.9)', // Overlay claro
} as const;

/**
 * Tokens semánticos de color - Dark Mode
 */
export const darkTheme = {
  // ─── Superficies (Surfaces) ───
  surfaceBase: '#0F0F0F', // Fondo principal oscuro
  surfaceRaised: palette.gray.G100, // Tarjetas, modales
  surfaceSecondary: palette.gray.G80, // Paneles secundarios
  surfaceElevated: palette.gray.G80, // Superficies con elevación

  // ─── Textos ───
  textPrimary: palette.neutral.ivory, // Texto principal (marfil)
  textSecondary: palette.gray.G20, // Texto secundario
  textMuted: palette.gray.G40, // Texto deshabilitado
  textInverse: palette.neutral.black, // Texto sobre fondos claros

  // ─── Bordes ───
  borderDefault: palette.gray.G60, // Bordes por defecto
  borderMuted: palette.gray.G40, // Bordes sutiles
  borderFocus: '#6BA8D4', // Borde de focus (ajustado para dark)

  // ─── CTAs y Acciones ───
  ctaDefault: palette.accent.blue.primary, // Mantener azul pastel
  ctaHover: palette.accent.blue.hover, // Hover
  ctaText: palette.neutral.black, // Texto sobre CTAs (negro para contraste)

  // ─── Estados y Feedback ───
  infoLight: palette.accent.blue.primary, // Badges informativos
  infoDark: '#6BA8D4', // Info en modo oscuro
  successLight: palette.feedback.success.olive, // Éxito suave
  warningLight: '#C4A882', // Advertencia suave
  errorLight: palette.feedback.error.rust, // Error suave

  // ─── Overlays ───
  overlayDark: 'rgba(5, 5, 5, 0.85)', // Overlay más oscuro
  overlayLight: 'rgba(15, 15, 15, 0.9)', // Overlay claro en dark mode
} as const;

/**
 * Tipo para claves de tokens semánticos
 */
export type ThemeColorKey = keyof typeof lightTheme;

/**
 * Tipo para valores de color (hex o rgba)
 */
export type ColorValue = string;

/**
 * Mapa completo de tokens por tema
 */
export const themeColors = {
  light: lightTheme,
  dark: darkTheme,
} as const;

/**
 * Tipo para el tema actual
 */
export type ThemeMode = 'light' | 'dark';

/**
 * Obtiene un token de color según el tema
 */
export function getThemeColor(key: ThemeColorKey, mode: ThemeMode = 'light'): ColorValue {
  return themeColors[mode][key];
}

/**
 * Valida que todas las claves críticas existan en ambos temas
 */
export function validateThemeColors(): boolean {
  const lightKeys = Object.keys(lightTheme) as ThemeColorKey[];
  const darkKeys = Object.keys(darkTheme) as ThemeColorKey[];

  const missingInDark = lightKeys.filter((key) => !darkKeys.includes(key));
  const missingInLight = darkKeys.filter((key) => !lightKeys.includes(key));

  if (missingInDark.length > 0) {
    console.error('❌ Faltan claves en darkTheme:', missingInDark);
    return false;
  }

  if (missingInLight.length > 0) {
    console.error('❌ Faltan claves en lightTheme:', missingInLight);
    return false;
  }

  return true;
}

// ═══════════════════════════════════════════════════════════════
// EXPORTACIÓN PARA TAILWIND
// ═══════════════════════════════════════════════════════════════

/**
 * Formato compatible con Tailwind CSS
 * Mapea tokens semánticos a estructura de Tailwind
 */
export const tailwindColors = {
  // Colores base
  black: palette.neutral.black,
  white: '#FFFFFF',
  transparent: 'transparent',
  current: 'currentColor',

  // Fondos
  ivory: palette.neutral.ivory,
  beige: palette.neutral.beige,

  // Escala de grises
  gray: {
    100: palette.gray.G100,
    80: palette.gray.G80,
    60: palette.gray.G60,
    40: palette.gray.G40,
    20: palette.gray.G20,
    10: palette.gray.G10,
    5: palette.gray.G05,
  },

  // Acentos azules
  accent: {
    blue: {
      DEFAULT: palette.accent.blue.primary,
      hover: palette.accent.blue.hover,
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
  },

  cta: {
    DEFAULT: lightTheme.ctaDefault,
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
} as const;

// ═══════════════════════════════════════════════════════════════
// VALIDACIÓN
// ═══════════════════════════════════════════════════════════════

/**
 * Nota: La validación automática se ejecuta mediante el script
 * `npm run validate:colors` que usa tools/validate-colors.mjs
 *
 * Para validar manualmente en desarrollo:
 * import { validateThemeColors } from '@/config/theme/colors';
 * validateThemeColors(); // Debe retornar true
 */
