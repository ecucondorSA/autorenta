/** @type {import('tailwindcss').Config} */

// Importar tokens centralizados de color
const themeColors = require('./src/config/theme/tailwind-colors');

module.exports = {
  darkMode: 'class', // Enable class-based dark mode
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      /* ═══════════════════════════════════════════════════════════════
         🎨 SISTEMA DE DISEÑO - TAILWIND CONFIG
         ═══════════════════════════════════════════════════════════════ */

      /* ─────────────────────────────────────────────────────────────
         Tipografía - Sistema Inter
         ───────────────────────────────────────────────────────────── */
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
        mono: 'var(--font-mono)',
      },

      /* Escala Tipográfica Fluida - Responsive con clamp()
         Adapta suavemente desde mobile (320px) hasta desktop (1920px) */
      fontSize: {
        // Small text - scaling conservador
        xs: ['clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem)', { lineHeight: '1.4' }], // 12px → 14px
        sm: ['clamp(0.8125rem, 0.75rem + 0.3vw, 0.9375rem)', { lineHeight: '1.5' }], // 13px → 15px

        // Body text - scaling moderado
        base: ['clamp(0.9375rem, 0.875rem + 0.3vw, 1.0625rem)', { lineHeight: '1.6' }], // 15px → 17px
        lg: ['clamp(1.0625rem, 0.95rem + 0.5vw, 1.25rem)', { lineHeight: '1.5' }], // 17px → 20px

        // Subheadings - scaling significativo
        xl: ['clamp(1.125rem, 0.95rem + 0.875vw, 1.5rem)', { lineHeight: '1.4' }], // 18px → 24px
        '2xl': ['clamp(1.375rem, 1.1rem + 1.375vw, 1.875rem)', { lineHeight: '1.3' }], // 22px → 30px

        // Headings - scaling agresivo
        '3xl': ['clamp(1.75rem, 1.2rem + 2.75vw, 2.5rem)', { lineHeight: '1.25' }], // 28px → 40px
        '4xl': ['clamp(2rem, 1.2rem + 4vw, 3.25rem)', { lineHeight: '1.2' }], // 32px → 52px

        // Display headings - scaling muy agresivo
        '5xl': ['clamp(2.5rem, 1.5rem + 5vw, 4rem)', { lineHeight: '1.1' }], // 40px → 64px
        '6xl': ['clamp(3rem, 1.75rem + 6.25vw, 5rem)', { lineHeight: '1' }], // 48px → 80px
        '7xl': ['clamp(3.5rem, 2rem + 7.5vw, 6rem)', { lineHeight: '1' }], // 56px → 96px
      },

      /* Font Weights - Inter Variable permite cualquier valor 100-900
         Pesos custom para control fino y transiciones suaves */
      fontWeight: {
        thin: '100',
        extralight: '200',
        light: '300',
        normal: '400',
        'medium-light': '450', /* Custom: Entre normal y medium */
        medium: '500',
        'medium-bold': '550', /* Custom: Para emphasis sutil */
        semibold: '600',
        'semi-heavy': '650', /* Custom: Para headings secundarios */
        bold: '700',
        'extra-bold': '750', /* Custom: Para hero headings */
        extrabold: '800',
        black: '900',
      },

      /* ─────────────────────────────────────────────────────────────
         Paleta de Colores - Sistema Unificado con Tokens Centralizados
         ═══════════════════════════════════════════════════════════
         Los colores ahora provienen de src/config/theme/colors.ts
         Ver docs/brand-colors.md para documentación completa
         ───────────────────────────────────────────────────────────── */
      colors: {
        // ═══════════════════════════════════════════════════════════════
        // Tokens Centralizados - Sistema Unificado
        // Ver: src/config/theme/colors.ts y docs/brand-colors.md
        // ═══════════════════════════════════════════════════════════════
        ...themeColors,

        // ═══════════════════════════════════════════════════════════════
        // Sistema de Tokens Refinado v2 - Mapped from CSS Variables
        // Según docs/design-proposals.md - 100% WCAG AA Compliant
        // ═══════════════════════════════════════════════════════════════

        // Surface colors (backgrounds)
        surface: {
          base: 'var(--surface-base)',
          raised: 'var(--surface-raised)',
          secondary: 'var(--surface-secondary)',
          elevated: 'var(--surface-elevated)',
          hover: 'var(--surface-hover)',
          pressed: 'var(--surface-pressed)',
        },

        // Text colors
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          inverse: 'var(--text-inverse)',
          link: 'var(--text-link)',
          'link-hover': 'var(--text-link-hover)',
          placeholder: 'var(--text-placeholder)',
        },

        // Border colors
        border: {
          default: 'var(--border-default)',
          muted: 'var(--border-muted)',
          focus: 'var(--border-focus)',
          hover: 'var(--border-hover)',
          error: 'var(--border-error)',
          success: 'var(--border-success)',
          warning: 'var(--border-warning)',
        },

        // CTA colors
        cta: {
          default: 'var(--cta-default)',
          hover: 'var(--cta-hover)',
          pressed: 'var(--cta-pressed)',
          text: 'var(--cta-text)',
          secondary: 'var(--cta-secondary)',
          'secondary-hover': 'var(--cta-secondary-hover)',
          'secondary-text': 'var(--cta-secondary-text)',
        },

        // ═══════════════════════════════════════════════════════════════
        // Colores Legacy - Mantener para compatibilidad durante migración
        // TODO: Migrar gradualmente a tokens semánticos
        // ═══════════════════════════════════════════════════════════════

        // Grises Estándar de Tailwind (Para compatibilidad con código existente)
        // TODO: Migrar gradualmente a tokens 'gray' del sistema unificado
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        },

        // WhatsApp Brand Colors (Para componentes específicos)
        whatsapp: {
          teal: '#075E54',
          'teal-light': '#128C7E',
          'teal-darker': '#005C4B',
          green: '#25D366',
          'green-modern': '#00A884',
          'green-modern-dark': '#008069',
          'green-light': '#DCF8C6',
          'green-sent': '#D9FDD3',
          bg: '#ECE5DD',
          'bg-light': '#F0F2F5',
          'bg-dark': '#0B141A',
          'bg-header-dark': '#1F2C33',
          'bg-message-dark': '#202C33',
          'bg-input-dark': '#2A3942',
        },

        // Semantic Colors - Success (Verde Oliva) - WCAG AA Validated
        success: {
          50: 'var(--success-50)',
          100: 'var(--success-100)',
          200: 'var(--success-200)',
          300: 'var(--success-300)',
          400: 'var(--success-400)',
          500: 'var(--success-500)',
          600: 'var(--success-600)',
          700: 'var(--success-700)',
          800: 'var(--success-800)',
          900: 'var(--success-900)',
        },

        // Semantic Colors - Warning (Beige Cálido) - WCAG AA Validated
        warning: {
          50: 'var(--warning-50)',
          100: 'var(--warning-100)',
          200: 'var(--warning-200)',
          300: 'var(--warning-300)',
          400: 'var(--warning-400)',
          500: 'var(--warning-500)',
          600: 'var(--warning-600)',
          700: 'var(--warning-700)',
          800: 'var(--warning-800)',
          900: 'var(--warning-900)',
        },

        // Semantic Colors - Error (Rojo Óxido) - WCAG AA Validated
        error: {
          50: 'var(--error-50)',
          100: 'var(--error-100)',
          200: 'var(--error-200)',
          300: 'var(--error-300)',
          400: 'var(--error-400)',
          500: 'var(--error-500)',
          600: 'var(--error-600)',
          700: 'var(--error-700)',
          800: 'var(--error-800)',
          900: 'var(--error-900)',
        },

        // Semantic Colors - Info (Azul Pastel) - WCAG AA Validated
        info: {
          50: 'var(--info-50)',
          100: 'var(--info-100)',
          200: 'var(--info-200)',
          300: 'var(--info-300)',
          400: 'var(--info-400)',
          500: 'var(--info-500)',
          600: 'var(--info-600)',
          700: 'var(--info-700)',
          800: 'var(--info-800)',
          900: 'var(--info-900)',
        },

        // Colores Estándar de Tailwind (Para compatibilidad)
        // TODO: Evaluar si migrar a semantic colors o mantener
        blue: {
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
          950: '#172554',
        },

        green: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },

        red: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },

        yellow: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
          950: '#422006',
        },

        indigo: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },

        purple: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
          950: '#3b0764',
        },

        pink: {
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f9a8d4',
          400: '#f472b6',
          500: '#ec4899',
          600: '#db2777',
          700: '#be185d',
          800: '#9d174d',
          900: '#831843',
          950: '#500724',
        },
      },

      /* ─────────────────────────────────────────────────────────────
         Sombras - Elevation System + Legacy
         ───────────────────────────────────────────────────────────── */
      boxShadow: {
        // Elevation System (Design Proposals v2)
        'elevation-1': 'var(--elevation-1)',
        'elevation-2': 'var(--elevation-2)',
        'elevation-3': 'var(--elevation-3)',
        'elevation-4': 'var(--elevation-4)',
        'elevation-5': 'var(--elevation-5)',

        // Focus Rings (Accessibility)
        'ring-focus': 'var(--ring-focus)',
        'ring-error': 'var(--ring-error)',

        // Legacy shadows (mantener para compatibilidad)
        soft: '0 2px 8px rgba(0, 0, 0, 0.04)',
        medium: '0 4px 16px rgba(0, 0, 0, 0.08)',
        elevated: '0 8px 24px rgba(0, 0, 0, 0.12)',
        card: '0 1px 3px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.1)',
        glow: '0 0 0 3px rgba(44, 74, 82, 0.1)',
      },

      /* ─────────────────────────────────────────────────────────────
         Espaciados Extendidos
         ───────────────────────────────────────────────────────────── */
      spacing: {
        18: '4.5rem', // 72px
        88: '22rem', // 352px
        128: '32rem', // 512px
      },

      /* ─────────────────────────────────────────────────────────────
         Border Radius - Token System
         ───────────────────────────────────────────────────────────── */
      borderRadius: {
        none: '0',
        sm: 'var(--radius-sm)', // 4px - Pills, badges
        DEFAULT: 'var(--radius-md)', // 8px - Botones, inputs
        md: 'var(--radius-md)', // 8px
        lg: 'var(--radius-lg)', // 12px - Cards
        xl: 'var(--radius-xl)', // 16px - Modales
        '2xl': 'var(--radius-2xl)', // 24px - Hero sections
        '3xl': '2rem', // 32px - Legacy
        full: 'var(--radius-full)', // Circular
      },

      /* ─────────────────────────────────────────────────────────────
         Sistema de Transiciones - Refinado v2
         ───────────────────────────────────────────────────────────── */
      transitionDuration: {
        instant: '75ms',
        fast: '150ms',
        normal: '250ms',
        slow: '350ms',
        slower: '500ms',
      },

      transitionTimingFunction: {
        default: 'var(--ease-default)', // cubic-bezier(0.4, 0, 0.2, 1)
        in: 'var(--ease-in)',
        out: 'var(--ease-out)',
        bounce: 'var(--ease-bounce)',
        // Legacy aliases
        standard: 'var(--ease-default)',
        decelerate: 'var(--ease-out)',
        accelerate: 'var(--ease-in)',
        sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
      },

      /* ─────────────────────────────────────────────────────────────
         Animaciones y Keyframes
         ───────────────────────────────────────────────────────────── */
      animation: {
        // Fades
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-in-up': 'fadeInUp 0.4s ease-out',
        'fade-in-down': 'fadeInDown 0.4s ease-out',

        // Slides
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',

        // Scale
        'scale-in': 'scaleIn 0.2s ease-out',
        'scale-in-slow': 'scaleIn 0.4s ease-out',

        // Loading
        'skeleton-loading': 'skeletonLoading 1.5s ease-in-out infinite',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',

        // Spin
        spin: 'spin 1s linear infinite',
        'spin-slow': 'spin 2s linear infinite',

        // Bounce (sutil)
        'bounce-subtle': 'bounceSubtle 1s ease-in-out infinite',

        // Shake (error feedback)
        'shake': 'shake 0.5s ease-in-out',
      },

      keyframes: {
        // Fade animations
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },

        // Slide animations
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },

        // Scale animations
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },

        // Skeleton loading
        skeletonLoading: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },

        // Pulse
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },

        // Spin
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },

        // Bounce sutil
        bounceSubtle: {
          '0%, 100%': {
            transform: 'translateY(0)',
            animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
          },
          '50%': {
            transform: 'translateY(-5%)',
            animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)',
          },
        },

        // Shake (error feedback)
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-10px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(10px)' },
        },
      },

        'pattern': 'radial-gradient(circle, #8B7355 1px, transparent 1px)',
      zIndex: {
        dropdown: '1000',
        sticky: '1020',
        fixed: '1030',
        'modal-backdrop': '1040',
        modal: '1050',
        popover: '1060',
      },
      backgroundImage: {
        'pattern': 'radial-gradient(circle, #8B7355 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
};
