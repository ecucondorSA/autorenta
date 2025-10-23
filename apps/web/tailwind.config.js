/** @type {import('tailwindcss').Config} */
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
         Paleta de Colores - Premium Neutra
         ───────────────────────────────────────────────────────────── */
      colors: {
        // Fondos Light Mode
        'ivory-soft': '#F8F6F3',
        'sand-light': '#EDEAE3',
        'white-pure': '#FFFFFF',

        // Bordes y Divisores
        'pearl-gray': '#D9D6D0',

        // Textos Light Mode
        'smoke-black': '#1A1A1A',
        'charcoal-medium': '#4B4B4B',
        'ash-gray': '#8E8E8E',

        // Fondos Dark Mode
        'graphite-dark': '#121212',
        'anthracite': '#1E1E1E',
        'slate-deep': '#2A2A2A',

        // Textos Dark Mode
        'ivory-luminous': '#FAF9F6',
        'pearl-light': '#E5E3DD',

        // Sistema de Grises Completo
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

        // Accents
        'accent-petrol': '#2C4A52',
        'accent-warm': '#8B7355',

        // Semantic Colors (Success, Warning, Error, Info)
        // Estos colores se usan para estados del sistema
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
        warning: {
          50: '#fef3c7',
          100: '#fde68a',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#78350f',
          900: '#92400e',
        },
        error: {
          50: '#fee2e2',
          100: '#fecaca',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          900: '#991b1b',
        },
        info: {
          50: '#dbeafe',
          100: '#bfdbfe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
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
