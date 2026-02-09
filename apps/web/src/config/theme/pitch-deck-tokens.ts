/**
 * AutoRentar Pitch Deck Visual Tokens
 *
 * Tokens de diseño extraídos del pitch deck V14 para mantener
 * consistencia visual entre producto y materiales de inversores.
 *
 * Generated: 2026-01-13 21:34
 * Source: AutoRentar-PitchDeck-STRATEGIC-V14-ENGINEERING.pdf
 */

export const pitchDeckColors = {
  // Colores Primarios
  primary: {
    DEFAULT: '#22C55E',
    light: '#4ADE80',
    dark: '#16A34A',
    hover: '#16A34A',
    pressed: '#15803D',
  },

  // Acentos
  accent: {
    lime: '#D4ED31',
    limeAlt: '#CDFF00',
    cyan: '#2DD4BF',
    cyanDark: '#14B8A6',
  },

  // Fondos (Dark Mode)
  background: {
    dark: '#0F172A',
    card: '#1E293B',
    elevated: '#334155',
    hover: '#475569',
  },

  // Texto
  text: {
    primary: '#FFFFFF',
    secondary: '#94A3B8',
    muted: '#64748B',
    inverse: '#0F172A',
  },

  // Semánticos
  semantic: {
    success: '#22C55E',
    error: '#EF4444',
    errorLight: '#F87171',
    warning: '#F59E0B',
    info: '#3B82F6',
  },
} as const;

export type PitchDeckColor = keyof typeof pitchDeckColors;

/**
 * Helper para obtener un color del pitch deck
 */
export function getPitchDeckColor(
  category: keyof typeof pitchDeckColors,
  shade: string = 'DEFAULT',
): string {
  const categoryColors = pitchDeckColors[category] as Record<string, string>;
  return categoryColors[shade] || categoryColors['DEFAULT'] || '#000000';
}
