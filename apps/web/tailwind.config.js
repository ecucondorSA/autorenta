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
      },

      /* Escala Tipográfica Modular 1.250 (Major Third) con Line Heights */
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.4' }], // 12px
        sm: ['0.875rem', { lineHeight: '1.5' }], // 14px
        base: ['1rem', { lineHeight: '1.6' }], // 16px
        lg: ['1.125rem', { lineHeight: '1.5' }], // 18px
        xl: ['1.25rem', { lineHeight: '1.4' }], // 20px
        '2xl': ['1.5rem', { lineHeight: '1.3' }], // 24px
        '3xl': ['1.875rem', { lineHeight: '1.25' }], // 30px
        '4xl': ['2.25rem', { lineHeight: '1.2' }], // 36px
        '5xl': ['3rem', { lineHeight: '1.1' }], // 48px
        '6xl': ['3.75rem', { lineHeight: '1' }], // 60px
        '7xl': ['4.5rem', { lineHeight: '1' }], // 72px
      },

      /* Font Weights Consistentes */
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
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

        // Semantic Colors - Success (Custom)
        success: {
          50: '#d1fae5',
          100: '#a7f3d0',
          200: '#6ee7b7',
          300: '#34d399',
          400: '#10b981',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#065f46',
          950: '#022c22',
        },

        // Semantic Colors - Warning (Custom)
        warning: {
          50: '#fef3c7',
          100: '#fde68a',
          200: '#fcd34d',
          300: '#fbbf24',
          400: '#f59e0b',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#78350f',
          900: '#92400e',
          950: '#451a03',
        },

        // Semantic Colors - Error (Custom)
        error: {
          50: '#fee2e2',
          100: '#fecaca',
          200: '#fca5a5',
          300: '#f87171',
          400: '#ef4444',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#991b1b',
          950: '#450a0a',
        },

        // Semantic Colors - Info (Custom)
        info: {
          50: '#dbeafe',
          100: '#bfdbfe',
          200: '#93c5fd',
          300: '#60a5fa',
          400: '#3b82f6',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
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
         Sombras - Premium y Sutiles
         ───────────────────────────────────────────────────────────── */
      boxShadow: {
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
         Border Radius Consistente
         ───────────────────────────────────────────────────────────── */
      borderRadius: {
        sm: '0.5rem', // 8px
        DEFAULT: '0.75rem', // 12px
        md: '0.75rem', // 12px
        lg: '1rem', // 16px
        xl: '1.25rem', // 20px
        '2xl': '1.5rem', // 24px
        '3xl': '2rem', // 32px
      },

      /* ─────────────────────────────────────────────────────────────
         Sistema de Transiciones
         ───────────────────────────────────────────────────────────── */
      transitionDuration: {
        instant: '100ms',
        fast: '200ms',
        normal: '300ms',
        slow: '400ms',
        slower: '600ms',
      },

      transitionTimingFunction: {
        standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
        decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
        accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
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
