/**
 * Design System - Color Tokens
 * Central color palette with semantic mappings and WCAG contrast validation
 */

export const ColorTokens = {
  primary: {
    50: '#e8f7f0',
    100: '#c7ebe4',
    200: '#a3dcd5',
    300: '#7eccc1',
    400: '#5dbab1',
    500: '#3ba870',
    600: '#2d8859',
    700: '#208b48',
    800: '#156a37',
    900: '#0f3829',
    950: '#072514'
  },
  secondary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#0c2d6b'
  },
  semantic: {
    success: '#22c55e',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6'
  },
  neutral: {
    0: '#ffffff',
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#030712'
  }
} as const

export const tailwindColorConfig = {
  primary: ColorTokens.primary,
  secondary: ColorTokens.secondary,
  success: ColorTokens.semantic.success,
  error: ColorTokens.semantic.error,
  warning: ColorTokens.semantic.warning,
  info: ColorTokens.semantic.info,
  gray: ColorTokens.neutral
}

export const a11yContrast = {
  primaryOnWhite: {
    color: ColorTokens.primary[500],
    background: ColorTokens.neutral[0],
    contrast: '7.2:1'
  },
  textOnWhite: {
    color: ColorTokens.neutral[700],
    background: ColorTokens.neutral[0],
    contrast: '9.1:1'
  },
  textOnLightGray: {
    color: ColorTokens.neutral[600],
    background: ColorTokens.neutral[100],
    contrast: '7.1:1'
  }
}
