/**
 * Design System - Spacing Tokens
 * Atomic spacing scale (4px base), responsive breakpoints, typography tokens
 */

export const SpacingTokens = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
  // Semantic aliases
  xs: '0.5rem',   // 8px
  sm: '1rem',     // 16px
  md: '1.5rem',   // 24px
  lg: '2rem',     // 32px
  xl: '3rem',     // 48px
  '2xl': '4rem'   // 64px
} as const

export const TypographyTokens = {
  fontSize: {
    h1: { size: '2rem', lineHeight: '2.5rem', weight: 700, mobileSize: '1.75rem' },
    h2: { size: '1.5rem', lineHeight: '2rem', weight: 600, mobileSize: '1.375rem' },
    h3: { size: '1.25rem', lineHeight: '1.75rem', weight: 600, mobileSize: '1.125rem' },
    h4: { size: '1.125rem', lineHeight: '1.5rem', weight: 600, mobileSize: '1rem' },
    body: { size: '1rem', lineHeight: '1.5rem', weight: 400, mobileSize: '1rem' },
    small: { size: '0.875rem', lineHeight: '1.25rem', weight: 400, mobileSize: '0.875rem' },
    caption: { size: '0.75rem', lineHeight: '1rem', weight: 400, mobileSize: '0.75rem' }
  },
  fontFamily: {
    sans: 'Inter, system-ui, -apple-system, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace'
  }
} as const

export const ResponsiveBreakpoints = {
  xs: '0px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
} as const

// Fluid typography using clamp()
export const clampedFontSizes = {
  h1: 'clamp(1.75rem, 4vw, 2.5rem)',
  h2: 'clamp(1.375rem, 3vw, 1.875rem)',
  h3: 'clamp(1.125rem, 2.5vw, 1.5rem)',
  body: 'clamp(0.875rem, 2vw, 1rem)'
}
